"""Supplemental recovery checks; live-service verification is recorded in the PR."""

import json
from pathlib import Path
import tempfile
import unittest

import httpx
from calle import CalleClient
from calle.errors import CalleTimeoutError

from calls import save
from recover_create import correct, submit


class CreateRecoveryTest(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.directory = Path(self.temp.name)
        self.original = {
            "task": "Introduce yourself using the sender name, which is missing.",
            "recipients": [{"phones": ["<AUTHORIZED_E164_PHONE>"]}],
            "metadata": {"workflow": "test"},
            "idempotency_key": "original-key",
        }
        save(self.directory / "request.json", self.original)
        save(self.directory / "error.json", {"status_code": 422, "code": "call_not_ready"})
        self.task_file = self.directory / "task.txt"
        self.task_file.write_text("Introduce yourself as Example Company's assistant.")

    def test_correction_preserves_other_fields_and_cannot_allocate_twice(self):
        corrected = correct(self.directory, self.task_file, True)
        operation = json.loads((corrected / "request.json").read_text())
        self.assertNotEqual(operation.pop("idempotency_key"), self.original["idempotency_key"])
        self.assertEqual(operation.pop("task"), self.task_file.read_text())
        self.assertEqual(operation, {k: v for k, v in self.original.items() if k not in ("task", "idempotency_key")})
        self.assertEqual(json.loads((self.directory / "request.json").read_text()), self.original)
        saved = (corrected / "request.json").read_bytes()
        with self.assertRaises(FileExistsError):
            correct(self.directory, self.task_file, True)
        self.assertEqual((corrected / "request.json").read_bytes(), saved)

    def test_refuses_unconfirmed_unknown_or_already_accepted_outcomes(self):
        with self.assertRaises(ValueError):
            correct(self.directory, self.task_file, False)
        for error in ({"status_code": 503, "code": "provider_unavailable"},
                      {"status_code": 422, "code": "invalid_request"}):
            save(self.directory / "error.json", error)
            with self.assertRaises(ValueError):
                correct(self.directory, self.task_file, True)
        save(self.directory / "error.json", {"status_code": 422, "code": "call_not_ready"})
        save(self.directory / "call-id.json", "call_saved")
        with self.assertRaises(ValueError):
            correct(self.directory, self.task_file, True)
        self.assertFalse((self.directory / "corrected").exists())

    def test_lost_create_response_reuses_saved_key_then_only_reads_known_call(self):
        corrected = correct(self.directory, self.task_file, True)
        saved = json.loads((corrected / "request.json").read_text())
        key = saved.pop("idempotency_key")
        requests = []

        def respond(request):
            requests.append(request.method)
            if request.method == "POST":
                self.assertEqual(request.headers["Idempotency-Key"], key)
                self.assertEqual(json.loads(request.content), saved)
                if len(requests) == 1:
                    raise httpx.ReadTimeout("response lost after acceptance", request=request)
                return httpx.Response(201, json={"id": "call_same"})
            self.assertEqual(request.url.path, "/v1/calls/call_same")
            return httpx.Response(200, json={"id": "call_same", "status": "completed", "structured_result": None})

        with httpx.Client(base_url="https://example.invalid", transport=httpx.MockTransport(respond)) as http:
            client = CalleClient(api_key="synthetic-test-key", http_client=http)
            with self.assertRaises(CalleTimeoutError):
                submit(client, corrected)
            self.assertFalse((corrected / "call-id.json").exists())
            self.assertEqual(submit(client, corrected), 0)
            self.assertEqual(submit(client, corrected), 0)
        self.assertEqual(requests, ["POST", "POST", "GET", "GET"])
        self.assertEqual(json.loads((corrected / "call-id.json").read_text()), "call_same")
        self.assertIsNone(json.loads((corrected / "result.json").read_text())["structured_result"])


if __name__ == "__main__":
    unittest.main()
