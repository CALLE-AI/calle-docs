"""Create one real call, or resume reading its saved Call ID. Python 3.11+."""

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
        json.dump(value, stream, indent=2)
        stream.write("\n")
        stream.flush()
        os.fsync(stream.fileno())


def run(client, directory, phone=None):
    if phone is not None:
        if not re.fullmatch(r"\+[1-9][0-9]{7,14}", phone):
            raise ValueError("Use an authorized E.164 phone number.")
        # Exclusive creation prevents a repeated start from placing a second call.
        directory.mkdir(mode=0o700)
        operation = {
            "idempotency_key": str(uuid.uuid4()),
            "task": (
                "Make one authorized developer integration test call. Listen to "
                "the first complete greeting, then thank the other side and end "
                "the call. Do not press menu keys or wait on hold. The purpose "
                "is to verify that our application can read a real call result."
            ),
            "recipients": [{"phones": [phone], "locale": "en-US", "region": "US"}],
            "result_schema": {
                "type": "object",
                "properties": {
                    "heard_greeting": {"type": "string", "enum": ["yes", "no", "unknown"]},
                    "greeting_summary": {
                        "type": "string",
                        "description": "Summarize only the greeting actually heard; use unknown if none is available.",
                    },
                },
                "required": ["heard_greeting", "greeting_summary"],
                "additionalProperties": False,
            },
        }
        save(directory / "request.json", operation)
        call = client.calls.create(**operation)
        save(directory / "call-id.json", call["id"])
    else:
        if not (directory / "call-id.json").is_file():
            raise ValueError(
                "No saved Call ID. Keep request.json and reconcile the original "
                "request using the Calls recovery guide before starting another call."
            )
    call_id = json.loads((directory / "call-id.json").read_text())
    print(f"Call ID: {call_id}", flush=True)
    call = client.calls.wait_for_result(call_id, timeout_seconds=300)
    save(directory / "result.json", call)
    print(json.dumps({key: call.get(key) for key in (
        "status", "task_completed", "structured_result", "failure_code"
    )}, indent=2))
    print("Read result.json and its transcript before interpreting task or business success.")
    return 0


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("action", choices=["start", "resume"])
    parser.add_argument("directory", type=Path, help="Private local run directory; start requires a new path.")
    parser.add_argument("--phone", help="Authorized US English test destination; start only.")
    args = parser.parse_args()
    if (args.action == "start") != bool(args.phone):
        parser.error("start requires --phone; resume must omit it.")
    api_key = os.environ.get("CALLE_API_KEY")
    if not api_key:
        parser.error("Set CALLE_API_KEY before running.")
    client_options = {"api_key": api_key}
    if base_url := os.environ.get("CALLE_BASE_URL"):
        client_options["base_url"] = base_url
    try:
        with CalleClient(**client_options) as client:
            return run(client, args.directory, args.phone)
    except CalleAPIError as exc:
        save(args.directory / "error.json", {
            "status_code": exc.status_code, "code": exc.code,
            "message": str(exc), "details": exc.details,
        })
        print(f"HTTP {exc.status_code}: {exc.code}. Details saved privately in error.json.", file=sys.stderr)
    except (CalleConnectionError, CalleTimeoutError, json.JSONDecodeError) as exc:
        print(f"{type(exc).__name__}: response or outcome unavailable. Keep the run directory.", file=sys.stderr)
    except (OSError, ValueError) as exc:
        print(str(exc), file=sys.stderr)
        return 1
    print("Use resume if call-id.json exists; otherwise follow the Calls recovery guide. No automatic retry was made.", file=sys.stderr)
    return 1


if __name__ == "__main__":
    sys.exit(main())
