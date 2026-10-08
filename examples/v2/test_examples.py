"""Supplemental Calls V2 checks using the published SDK; no real calls."""

from copy import deepcopy
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

import httpx
from calle import CalleClient
from calle.errors import CalleTimeoutError

from calls import run
from read_call_result import result_report


def response(**changes):
    return {
        "object": "call", "id": "call_test", "call_id": None,
        "status": "completed", "call_outcome": "busy", "result_status": "unavailable",
        "result": None, "error": None, "transcript": [], **changes,
    }


class ExamplesTest(unittest.TestCase):
    def test_lost_create_replays_saved_input_then_resume_only_reads(self):
        with tempfile.TemporaryDirectory() as root:
            directory = Path(root) / "run"
            requests = []

            def respond(request):
                requests.append(request.method)
                if request.method == "POST":
                    self.assertEqual(request.url.path, "/v2/calls")
                    saved = json.loads((directory / "request.json").read_text())
                    self.assertEqual(request.headers["Idempotency-Key"], saved.pop("idempotency_key"))
                    self.assertEqual(json.loads(request.content), saved)
                    self.assertNotIn("region", saved)
                    self.assertNotIn("locale", saved)
                    if len(requests) == 1:
                        raise httpx.ReadTimeout("lost after acceptance", request=request)
                    return httpx.Response(202, json=response(status="queued", result_status="pending"))
                self.assertEqual(request.url.path, "/v2/calls/call_test")
                return httpx.Response(200, json=response())

            with httpx.Client(base_url="https://example.invalid", transport=httpx.MockTransport(respond)) as http:
                with CalleClient(api_key="synthetic", http_client=http) as client:
                    with self.assertRaises(CalleTimeoutError):
                        run(client, directory, "+12025550123")
                    original = (directory / "request.json").read_bytes()
                    with self.assertRaises(FileExistsError):
                        run(client, directory, "+12025550123")
                    self.assertEqual(run(client, directory), 0)
                    self.assertEqual(run(client, directory), 0)
                    self.assertEqual((directory / "request.json").read_bytes(), original)
            self.assertEqual(requests, ["POST", "POST", "GET", "GET"])
            self.assertIsNone(json.loads((directory / "result.json").read_text())["result"])

    def test_completed_execution_keeps_waiting_for_result(self):
        with tempfile.TemporaryDirectory() as root:
            directory = Path(root)
            (directory / "call-id.json").write_text('"call_test"')
            states = [response(result_status="pending"), response(result_status="available", result={})]
            def respond(request):
                self.assertEqual(request.method, "GET")
                return httpx.Response(200, json=states.pop(0))
            with httpx.Client(base_url="https://example.invalid", transport=httpx.MockTransport(respond)) as http:
                with CalleClient(api_key="synthetic", http_client=http) as client, patch("calle.calls.time.sleep"):
                    self.assertEqual(run(client, directory), 0)
            self.assertEqual(states, [])
            self.assertEqual(json.loads((directory / "result.json").read_text())["result"], {})

    def test_reader_keeps_unavailable_and_scalar_values_without_changing_input(self):
        call = response(transcript=[{"offset_seconds": None, "speaker": "unknown", "text": "Hello."}])
        original = deepcopy(call)
        report = result_report(call)
        self.assertIsNone(report["result"])
        self.assertIsNone(report["error"])
        self.assertEqual(report["transcript_lines"], ["[time unavailable] unknown: Hello."])
        self.assertEqual(call, original)
        for result in ({}, {"confirmed": False, "quantity": 0, "answer": "unknown"}):
            self.assertEqual(result_report(response(result_status="available", result=result))["result"], result)
        with self.assertRaises(ValueError):
            result_report({"object": "call_task"})


if __name__ == "__main__":
    unittest.main()
