"""Supplemental failure/recovery checks; these do not replace a real call."""

import json
from pathlib import Path
import tempfile
import unittest

import httpx
from calle import CalleClient
from calle.errors import CalleAPIError, CalleTimeoutError

from calls import run


class RecoveryTest(unittest.TestCase):
    def test_resume_after_poll_timeout_never_posts_and_keeps_null_result(self):
        with tempfile.TemporaryDirectory() as root:
            directory = Path(root) / "run"
            methods = []

            def respond(request):
                methods.append(request.method)
                if request.method == "POST":
                    saved = json.loads((directory / "request.json").read_text())
                    self.assertEqual(request.headers["Idempotency-Key"], saved.pop("idempotency_key"))
                    self.assertEqual(json.loads(request.content), saved)
                    return httpx.Response(201, json={"id": "call_test"})
                self.assertEqual(json.loads((directory / "call-id.json").read_text()), "call_test")
                if methods == ["POST", "GET"]:
                    raise httpx.ReadTimeout("interrupted", request=request)
                return httpx.Response(200, json={"id": "call_test", "status": "failed", "structured_result": None})

            with httpx.Client(base_url="https://example.invalid", transport=httpx.MockTransport(respond)) as http:
                client = CalleClient(api_key="test", http_client=http)
                with self.assertRaises(CalleTimeoutError):
                    run(client, directory, "+12025550123")
                with self.assertRaises(FileExistsError):
                    run(client, directory, "+12025550123")
                self.assertEqual(run(client, directory), 0)
                self.assertEqual(methods, ["POST", "GET", "GET"])
                self.assertIsNone(json.loads((directory / "result.json").read_text())["structured_result"])

    def test_rejected_or_unreadable_create_keeps_request_and_resume_refuses(self):
        for status, body, error in [
            (422, '{"error":{"code":"invalid_request","message":"Rejected"}}', CalleAPIError),
            (502, 'Bad Gateway', json.JSONDecodeError),
        ]:
            with self.subTest(status=status), tempfile.TemporaryDirectory() as root:
                directory = Path(root) / "run"
                methods = []

                def respond(request):
                    methods.append(request.method)
                    return httpx.Response(status, text=body)

                with httpx.Client(base_url="https://example.invalid", transport=httpx.MockTransport(respond)) as http:
                    client = CalleClient(api_key="test", http_client=http)
                    with self.assertRaises(error):
                        run(client, directory, "+12025550123")
                    self.assertTrue((directory / "request.json").is_file())
                    with self.assertRaisesRegex(ValueError, "No saved Call ID"):
                        run(client, directory)
                    self.assertEqual(methods, ["POST"])


if __name__ == "__main__":
    unittest.main()
