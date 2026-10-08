"""Read a saved Calls V2 result without making API requests."""

import argparse
import json
from pathlib import Path


def result_report(call):
    if not isinstance(call, dict) or call.get("object") != "call":
        raise ValueError("Expected a Calls V2 call object; use the legacy reader for call_task objects.")
    report = {key: call[key] for key in (
        "id", "call_id", "status", "call_outcome", "result_status", "result", "error", "transcript",
    )}
    if not isinstance(call["transcript"], list):
        raise ValueError("Expected a transcript array.")
    report["transcript_lines"] = []
    for turn in call["transcript"]:
        offset = turn["offset_seconds"]
        timestamp = "time unavailable" if offset is None else f"{offset}s"
        report["transcript_lines"].append(f"[{timestamp}] {turn['speaker']}: {turn['text']}")
    return report


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("result", type=Path, help="Private result.json saved by a Calls V2 example.")
    args = parser.parse_args()
    try:
        report = result_report(json.loads(args.result.read_text(encoding="utf-8")))
    except OSError:
        parser.error("Could not read the saved response file.")
    except (ValueError, KeyError, TypeError):
        parser.error("Expected a complete Calls V2 call JSON response.")
    print(json.dumps(report, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
