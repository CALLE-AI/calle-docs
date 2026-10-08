"""Create or resume one Calls V2 operation. Python 3.11+, calle-ai==1.0.1."""

import argparse
import json
import os
from pathlib import Path
import re
import sys
import uuid

from calle import CalleClient
from calle.errors import CalleAPIError, CalleConnectionError, CalleTimeoutError


def save(path, value):
    with path.open("w", encoding="utf-8") as stream:
        path.chmod(0o600)
        json.dump(value, stream, indent=2)
        stream.write("\n")
        stream.flush()
        os.fsync(stream.fileno())


def run(client, directory, phone=None):
    if phone is not None:
        if not re.fullmatch(r"\+[1-9][0-9]{7,14}", phone):
            raise ValueError("Use an authorized E.164 phone number.")
        directory.mkdir(mode=0o700)  # Refuse to overwrite an existing operation.
        save(directory / "request.json", {
            "idempotency_key": str(uuid.uuid4()),
            "phone": phone,
            "task": (
                "Make one authorized developer integration test call in English. "
                "Listen to the first complete greeting, then thank the other side "
                "and end the call. Do not press menu keys or wait on hold. "
                "Use unknown for heard_greeting and greeting_summary if no greeting is heard."
            ),
            "result_schema": {
                "type": "object",
                "properties": {
                    "heard_greeting": {"type": "string", "enum": ["yes", "no", "unknown"]},
                    "greeting_summary": {
                        "type": "string",
                        "description": "Summarize only the greeting actually heard, or use unknown.",
                    },
                },
                "required": ["heard_greeting", "greeting_summary"],
                "additionalProperties": False,
            },
        })
    id_path = directory / "call-id.json"
    if not id_path.is_file():
        # Lost create responses replay the exact saved request and key.
        operation = json.loads((directory / "request.json").read_text(encoding="utf-8"))
        created = client.calls.create(**operation)
        save(id_path, created["id"])
    call_id = json.loads(id_path.read_text(encoding="utf-8"))
    if not isinstance(call_id, str) or not re.fullmatch(r"[A-Za-z0-9_-]+", call_id):
        raise ValueError("Invalid saved Call ID; inspect call-id.json privately.")
    print(f"Call ID: {call_id}", flush=True)
    call = client.calls.wait_for_result(call_id, timeout_seconds=300)
    if call["id"] != call_id:
        raise ValueError("Response Call ID differs from the saved ID; stop and inspect the original call.")
    save(directory / "result.json", call)
    print(json.dumps({key: call[key] for key in (
        "status", "call_outcome", "result_status", "result", "error"
    )}, indent=2))
    print("Retrieval finished. Read result.json and its transcript before deciding business success.")
    return 0


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("action", choices=["start", "resume"])
    parser.add_argument("directory", type=Path, help="Private run directory; start requires a new path.")
    parser.add_argument("--phone", help="Authorized E.164 test destination; start only.")
    args = parser.parse_args()
    if (args.action == "start") != bool(args.phone):
        parser.error("start requires --phone; resume must omit it.")
    if not os.environ.get("CALLE_API_KEY"):
        parser.error("Set CALLE_API_KEY before running.")
    options = {"api_key": os.environ["CALLE_API_KEY"]}
    if base_url := os.environ.get("CALLE_BASE_URL"):
        options["base_url"] = base_url
    try:
        with CalleClient(**options) as client:
            return run(client, args.directory, args.phone)
    except CalleAPIError as exc:
        save(args.directory / "error.json", {
            "status_code": exc.status_code, "code": exc.code,
            "message": str(exc), "details": exc.details,
        })
        print(f"HTTP {exc.status_code}: {exc.code}. Inspect error.json privately.", file=sys.stderr)
    except (CalleConnectionError, CalleTimeoutError, json.JSONDecodeError, KeyError, TypeError):
        print("Request or response unavailable. Keep the saved request and key.", file=sys.stderr)
    except (OSError, ValueError) as exc:
        print(str(exc), file=sys.stderr)
        return 1
    print("Run resume with the same key and environment. No automatic retry was made.", file=sys.stderr)
    return 1


if __name__ == "__main__":
    sys.exit(main())
