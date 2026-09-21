"""Correct a reviewed creation rejection, or resubmit a saved request. Python 3.11+."""

import argparse
import json
import os
from pathlib import Path
import sys
import uuid

from calle import CalleClient
from calle.errors import CalleAPIError, CalleConnectionError, CalleTimeoutError

from calls import run, save


def correct(directory, task_file, confirmed):
    if not confirmed:
        raise ValueError("Review error.json and confirm that creation was rejected for missing information.")
    if (directory / "call-id.json").exists():
        raise ValueError("A Call ID is already saved. Retrieve that call instead.")
    error = json.loads((directory / "error.json").read_text())
    if error.get("status_code") != 422 or error.get("code") != "call_not_ready":
        raise ValueError("This correction requires a saved HTTP 422 call_not_ready creation rejection.")
    operation = json.loads((directory / "request.json").read_text())
    task = task_file.read_text(encoding="utf-8").strip()
    if not task or task == operation["task"]:
        raise ValueError("Provide a nonempty corrected task that answers the missing-information request.")
    operation["task"] = task
    operation["idempotency_key"] = str(uuid.uuid4())
    corrected = directory / "corrected"
    # One correction per saved rejection; rerunning must not allocate another key.
    corrected.mkdir(mode=0o700)
    save(corrected / "request.json", operation)
    print(f"Saved {corrected / 'request.json'}. Review it before submitting. No request sent.")
    return corrected


def submit(client, directory):
    if not (directory / "call-id.json").exists():
        operation = json.loads((directory / "request.json").read_text())
        if not operation.get("idempotency_key"):
            raise ValueError("The saved request must include its original idempotency_key.")
        call = client.calls.create(**operation)
        save(directory / "call-id.json", call["id"])
    return run(client, directory)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("action", choices=["correct", "submit"])
    parser.add_argument("directory", type=Path, help="Existing private run directory containing request.json.")
    parser.add_argument("--task-file", type=Path, help="UTF-8 file containing the corrected task; correct only.")
    parser.add_argument("--confirm-missing-information", action="store_true",
                        help="Confirm you reviewed a definite missing-information creation rejection.")
    args = parser.parse_args()
    if args.action == "correct" and not args.task_file:
        parser.error("correct requires --task-file.")
    if args.action == "submit" and (args.task_file or args.confirm_missing_information):
        parser.error("submit uses the saved request unchanged; omit correction options.")
    try:
        if args.action == "correct":
            correct(args.directory, args.task_file, args.confirm_missing_information)
            return 0
        if not os.environ.get("CALLE_API_KEY"):
            parser.error("Set CALLE_API_KEY before submitting.")
        options = {"api_key": os.environ["CALLE_API_KEY"]}
        if base_url := os.environ.get("CALLE_BASE_URL"):
            options["base_url"] = base_url
        with CalleClient(**options) as client:
            return submit(client, args.directory)
    except CalleAPIError as exc:
        save(args.directory / "error.json", {
            "status_code": exc.status_code, "code": exc.code,
            "message": str(exc), "details": exc.details,
        })
        print(f"HTTP {exc.status_code}: {exc.code}. Review error.json privately.", file=sys.stderr)
    except (CalleConnectionError, CalleTimeoutError, json.JSONDecodeError) as exc:
        print(f"{type(exc).__name__}: outcome unavailable. Keep the saved request and key.", file=sys.stderr)
    except (OSError, ValueError) as exc:
        print(str(exc), file=sys.stderr)
    print("Stopped. No automatic retry was made.", file=sys.stderr)
    return 1


if __name__ == "__main__":
    sys.exit(main())
