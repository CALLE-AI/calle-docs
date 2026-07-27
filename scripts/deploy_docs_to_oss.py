#!/usr/bin/env python3
"""Deploy the CALL-E Developer Docs static build to Aliyun OSS."""

import argparse
import base64
import datetime as dt
import hashlib
import hmac
import mimetypes
import os
import re
import sys
import urllib.error
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from pathlib import Path


REQUIRED_ENV_VARS = (
    "OSS_KEY_ID",
    "OSS_KEY_SECRET",
    "OSS_BUCKET_URI",
    "OSS_ENDPOINT",
)


def parse_bucket(bucket_uri: str) -> str:
    match = re.fullmatch(r"oss://([^/]+)/?", bucket_uri)
    if not match:
        raise ValueError("OSS_BUCKET_URI must look like oss://bucket-name/")
    return match.group(1)


def content_type_for(path: Path) -> str:
    guessed, _ = mimetypes.guess_type(path.name)
    if path.suffix == ".yaml":
        return "application/yaml"
    if path.suffix == ".js":
        return "text/javascript"
    return guessed or "application/octet-stream"


def cache_control_for(key: str) -> str:
    if key.startswith("assets/") or "/assets/" in key:
        return "public, max-age=31536000, immutable"
    return "no-cache"


def normalize_prefix(prefix: str) -> str:
    normalized = prefix.strip("/")
    if not normalized:
        raise ValueError("deploy prefix must not be empty")

    segment_pattern = re.compile(r"[a-z0-9][a-z0-9_-]*")
    if any(
        not segment_pattern.fullmatch(segment)
        for segment in normalized.split("/")
    ):
        raise ValueError(
            "deploy prefix must contain lowercase path segments"
        )
    return f"{normalized}/"


def collect_files(dist_dir: Path) -> list[Path]:
    if not dist_dir.exists():
        raise FileNotFoundError(f"dist dir does not exist: {dist_dir}")
    if not (dist_dir / "index.html").is_file():
        raise FileNotFoundError(f"dist dir is missing index.html: {dist_dir}")

    files = [path for path in dist_dir.rglob("*") if path.is_file()]
    if not files:
        raise FileNotFoundError(f"dist dir has no files: {dist_dir}")

    return sorted(
        files,
        key=lambda path: (
            path == dist_dir / "index.html",
            path.relative_to(dist_dir).as_posix(),
        ),
    )


class OssClient:
    def __init__(
        self,
        access_key_id: str,
        access_key_secret: str,
        bucket: str,
        endpoint: str,
    ) -> None:
        self.access_key_id = access_key_id
        self.access_key_secret = access_key_secret
        self.bucket = bucket
        self.endpoint = endpoint
        self.host = f"{bucket}.{endpoint}"

    def sign(self, method: str, key: str, content_type: str = "") -> tuple[str, str]:
        date = dt.datetime.now(dt.timezone.utc).strftime(
            "%a, %d %b %Y %H:%M:%S GMT"
        )
        resource = f"/{self.bucket}/{key}" if key else f"/{self.bucket}/"
        string_to_sign = f"{method}\n\n{content_type}\n{date}\n{resource}"
        signature = base64.b64encode(
            hmac.new(
                self.access_key_secret.encode(),
                string_to_sign.encode(),
                hashlib.sha1,
            ).digest()
        ).decode()
        return date, f"OSS {self.access_key_id}:{signature}"

    def request(
        self,
        method: str,
        key: str,
        data: bytes | None = None,
        content_type: str = "",
        extra_headers: dict[str, str] | None = None,
        query: str = "",
    ) -> bytes:
        date, authorization = self.sign(method, key, content_type)
        url = f"https://{self.host}/{urllib.parse.quote(key, safe='/')}"
        if query:
            url = f"{url}?{query}"
        headers = {"Date": date, "Authorization": authorization}
        if content_type:
            headers["Content-Type"] = content_type
        if extra_headers:
            headers.update(extra_headers)
        request = urllib.request.Request(
            url,
            data=data,
            headers=headers,
            method=method,
        )
        with urllib.request.urlopen(request, timeout=60) as response:
            return response.read()

    def put_file(self, local_path: Path, key: str) -> None:
        content_type = content_type_for(local_path)
        self.request(
            "PUT",
            key,
            data=local_path.read_bytes(),
            content_type=content_type,
            extra_headers={"Cache-Control": cache_control_for(key)},
        )

    def signed_get_sample(self, key: str) -> int:
        return len(self.request("GET", key)[:256])

    def list_prefix(self, prefix: str) -> list[str]:
        query = urllib.parse.urlencode({"prefix": prefix, "max-keys": "1000"})
        date, authorization = self.sign("GET", "")
        request = urllib.request.Request(
            f"https://{self.host}/?{query}",
            headers={"Date": date, "Authorization": authorization},
            method="GET",
        )
        with urllib.request.urlopen(request, timeout=30) as response:
            root = ET.fromstring(response.read())
        return [
            node.text
            for node in root.iter()
            if node.tag.endswith("Key") and node.text
        ]

    def public_head_status(self, key: str) -> int:
        request = urllib.request.Request(
            f"https://{self.host}/{key}",
            method="HEAD",
        )
        try:
            with urllib.request.urlopen(request, timeout=20) as response:
                return response.status
        except urllib.error.HTTPError as exc:
            return exc.code


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Deploy the CALL-E docs dist directory to Aliyun OSS."
    )
    parser.add_argument(
        "--dist-dir",
        default="dist",
        help="Built docs-site dist directory.",
    )
    parser.add_argument(
        "--deploy-prefix",
        required=True,
        help="OSS object prefix, such as calle-docs-site/prod.",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Print the deployment plan without uploading.",
    )
    parser.add_argument(
        "--skip-upload",
        action="store_true",
        help="Verify an existing deployment without uploading.",
    )
    parser.add_argument(
        "--no-public-check",
        action="store_true",
        help="Skip the unauthenticated direct OSS check.",
    )
    return parser


def main() -> int:
    args = build_parser().parse_args()
    missing = [key for key in REQUIRED_ENV_VARS if not os.environ.get(key)]
    if missing:
        print(
            f"Missing required environment variables: {', '.join(missing)}",
            file=sys.stderr,
        )
        return 2

    try:
        deploy_prefix = normalize_prefix(args.deploy_prefix)
    except ValueError as exc:
        print(str(exc), file=sys.stderr)
        return 2

    dist_dir = Path(args.dist_dir)
    try:
        bucket = parse_bucket(os.environ["OSS_BUCKET_URI"])
    except ValueError as exc:
        print(str(exc), file=sys.stderr)
        return 2

    client = OssClient(
        access_key_id=os.environ["OSS_KEY_ID"],
        access_key_secret=os.environ["OSS_KEY_SECRET"],
        bucket=bucket,
        endpoint=os.environ["OSS_ENDPOINT"],
    )

    files: list[Path] = []
    if not args.skip_upload:
        try:
            files = collect_files(dist_dir)
        except FileNotFoundError as exc:
            print(str(exc), file=sys.stderr)
            return 2

    print(f"bucket={bucket}")
    print(f"endpoint={os.environ['OSS_ENDPOINT']}")
    print(f"prefix={deploy_prefix}")

    if args.dry_run:
        print(f"dry_run=true files={len(files)}")
        for path in files[:10]:
            print(
                "plan "
                f"{deploy_prefix}{path.relative_to(dist_dir).as_posix()}"
            )
        if len(files) > 10:
            print("...")
        return 0

    if not args.skip_upload:
        for index, local_path in enumerate(files, start=1):
            key = deploy_prefix + local_path.relative_to(dist_dir).as_posix()
            try:
                client.put_file(local_path, key)
            except urllib.error.HTTPError as exc:
                detail = exc.read(300).decode("utf-8", errors="replace")
                print(
                    f"Upload failed: key={key} status={exc.code} detail={detail}",
                    file=sys.stderr,
                )
                return 1
            if index % 20 == 0 or index == len(files):
                print(f"uploaded={index}/{len(files)}")

    for key in (
        f"{deploy_prefix}index.html",
        f"{deploy_prefix}openapi/calle.openapi.yaml",
    ):
        try:
            sample_len = client.signed_get_sample(key)
        except urllib.error.HTTPError as exc:
            print(
                f"Signed GET failed: key={key} status={exc.code}",
                file=sys.stderr,
            )
            return 1
        print(f"signed_get_ok key={key} sample_bytes={sample_len}")

    keys = client.list_prefix(deploy_prefix)
    print(f"listed_objects={len(keys)}")
    if files:
        expected = {
            deploy_prefix + path.relative_to(dist_dir).as_posix()
            for path in files
        }
        missing_objects = expected.difference(keys)
        if missing_objects:
            print(
                f"Deployment is missing {len(missing_objects)} objects.",
                file=sys.stderr,
            )
            return 1

    if not args.no_public_check:
        status = client.public_head_status(f"{deploy_prefix}index.html")
        print(f"public_head_status={status}")
        if status == 403:
            print("public_access=blocked_by_bucket_acl")
        elif status == 200:
            print("public_access=ok")
        else:
            print("public_access=unexpected_status")

    print(f"oss_uri=oss://{bucket}/{deploy_prefix}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
