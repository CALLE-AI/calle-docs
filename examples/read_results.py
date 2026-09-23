"""Read a saved Python SDK / HTTP call response without making API requests."""

import argparse
import json
from pathlib import Path

from read_transcript import transcript_lines


def result_report(call):
    if not isinstance(call, dict) or call.get("object") != "call_task":
        raise ValueError("Expected a Calls API call_task object.")
    report = {key: call[key] for key in (
        "id", "status", "task_completed", "completion_confidence",
        "structured_result", "summary", "evidence", "failure_code", "failure_message",
    )}
    report["recipients"] = []
    for recipient in call["recipients"]:
        item = {key: recipient[key] for key in (
            "id", "status", "structured_result", "summary",
        )}
        item["attempts"] = [
            {
                "id": attempt["id"],
                "status": attempt["status"],
                "failure_code": attempt["failure_code"],
                "failure_message": attempt["failure_message"],
                "transcript_turn_count": len(attempt["transcript_turns"]),
            }
            for attempt in recipient["attempts"]
        ]
        report["recipients"].append(item)
    report["transcript_lines"] = list(transcript_lines(call))
    return report


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("result", type=Path, help="Private result.json saved by a Calls example.")
    args = parser.parse_args()
    try:
        call = json.loads(args.result.read_text(encoding="utf-8"))
        report = result_report(call)
    except OSError:
        parser.error("Could not read the saved response file.")
    except (ValueError, KeyError, TypeError, AttributeError):
        parser.error("Expected a complete Python SDK / HTTP call_task JSON response.")
    print(json.dumps(report, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
