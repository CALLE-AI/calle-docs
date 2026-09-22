"""Synthetic result-reading checks; live response validation is separate."""

from copy import deepcopy
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

from read_results import result_report


class ReadResultsTest(unittest.TestCase):
    def test_keeps_task_and_recipient_results_separate_without_changing_input(self):
        call = {
            "object": "call_task", "id": "call_example", "status": "completed",
            "task_completed": False, "completion_confidence": None,
            "structured_result": None, "summary": None, "evidence": [],
            "failure_code": None, "failure_message": None,
            "recipients": [{
                "id": "recipient_1", "status": "completed", "summary": None,
                "structured_result": {"answer": "unknown", "confirmed": False, "quantity": 0},
                "attempts": [{
                    "id": "attempt_1", "status": "completed", "failure_code": None,
                    "failure_message": None, "transcript_turns": [{
                        "offset_seconds": None, "speaker": "unknown", "text": "Hello.",
                    }],
                }],
            }, {
                "id": "recipient_2", "status": "failed", "summary": None,
                "structured_result": None, "attempts": [{
                    "id": "attempt_2", "status": "failed", "failure_code": "example_failure",
                    "failure_message": "Synthetic failure", "transcript_turns": [],
                }],
            }],
        }
        original = deepcopy(call)
        report = result_report(call)
        self.assertIsNone(report["structured_result"])
        self.assertIs(report["task_completed"], False)
        self.assertEqual(report["recipients"][0]["structured_result"], original["recipients"][0]["structured_result"])
        self.assertIsNone(report["recipients"][1]["structured_result"])
        self.assertEqual(report["recipients"][1]["attempts"][0]["transcript_turn_count"], 0)
        self.assertEqual(report["transcript_lines"], ["recipient 1, attempt 1: [time unavailable] unknown: Hello."])
        self.assertEqual(call, original)
        call["structured_result"] = {"answer": "no"}
        self.assertEqual(result_report(call)["structured_result"], {"answer": "no"})

    def test_cli_rejects_incomplete_or_invalid_files_without_printing_private_input(self):
        script = Path(__file__).with_name("read_results.py")
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "result.json"
            for content in ["private-invalid-json", json.dumps({"object": "call_task"}), "null"]:
                path.write_text(content)
                result = subprocess.run([sys.executable, str(script), str(path)], capture_output=True, text=True)
                self.assertNotEqual(result.returncode, 0)
                self.assertEqual(result.stdout, "")
                self.assertNotIn("private-invalid-json", result.stderr)


if __name__ == "__main__":
    unittest.main()
