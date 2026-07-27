import tempfile
import unittest
from pathlib import Path

from scripts.deploy_docs_to_oss import (
    cache_control_for,
    collect_files,
    content_type_for,
    normalize_prefix,
    parse_bucket,
)


class DeployDocsToOssTests(unittest.TestCase):
    def test_parse_bucket(self) -> None:
        self.assertEqual(parse_bucket("oss://docs-bucket/"), "docs-bucket")
        self.assertEqual(parse_bucket("oss://docs-bucket"), "docs-bucket")

    def test_parse_bucket_rejects_object_prefix(self) -> None:
        with self.assertRaises(ValueError):
            parse_bucket("oss://docs-bucket/site/")

    def test_cache_control(self) -> None:
        self.assertEqual(
            cache_control_for("assets/index-123.js"),
            "public, max-age=31536000, immutable",
        )
        self.assertEqual(
            cache_control_for("index.html"),
            "no-cache",
        )

    def test_normalize_prefix(self) -> None:
        self.assertEqual(
            normalize_prefix("/calle-docs-site/test/"),
            "calle-docs-site/test/",
        )

    def test_normalize_prefix_rejects_unsafe_segments(self) -> None:
        with self.assertRaises(ValueError):
            normalize_prefix("")
        with self.assertRaises(ValueError):
            normalize_prefix("../docs")

    def test_content_type_for_openapi(self) -> None:
        self.assertEqual(
            content_type_for(Path("calle.openapi.yaml")),
            "application/yaml",
        )

    def test_collect_files_uploads_index_last(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            dist = Path(directory)
            assets = dist / "assets"
            assets.mkdir()
            (dist / "index.html").write_text("<html></html>")
            (assets / "index.js").write_text("console.log('ready')")

            files = collect_files(dist)

        self.assertEqual(files[-1].name, "index.html")


if __name__ == "__main__":
    unittest.main()
