import contextlib
import io
import json
import os
import unittest
import warnings
from unittest.mock import patch
from urllib.error import HTTPError, URLError

from backend import tinyfish_probe as probe


KEY = "test-key-not-a-secret"
RESULT = {
    "status": "success",
    "source_url": "https://quotes.toscrape.com/",
    "first_author": "Albert Einstein",
}
RUN = {"run_id": "run_fixture", "status": "COMPLETED", "result": RESULT, "error": None}


class TinyFishProbeTests(unittest.TestCase):
    def setUp(self):
        patcher = patch.object(probe, "build_opener")
        self.addCleanup(patcher.stop)
        self.build_opener = patcher.start()
        self.open = self.build_opener.return_value.open

    def respond(self, body):
        self.open.return_value = io.BytesIO(json.dumps(body).encode("utf-8"))

    def test_posts_documented_payload_and_returns_only_demo_fields(self):
        self.respond({**RUN, "result": {**RESULT, "extra": "do not print"}})
        self.assertEqual(probe.run_probe(KEY), {"run_id": "run_fixture", "status": "COMPLETED", "result": RESULT})

        self.open.assert_called_once()
        request = self.open.call_args.args[0]
        self.assertEqual(request.full_url, "https://agent.tinyfish.ai/v1/automation/run")
        self.assertEqual(request.get_method(), "POST")
        headers = {name.lower(): value for name, value in request.header_items()}
        self.assertEqual(headers["x-api-key"], KEY)
        self.assertEqual(headers["content-type"], "application/json")
        payload = json.loads(request.data)
        self.assertEqual(payload["url"], "https://quotes.toscrape.com/")
        self.assertTrue(payload["goal"])
        self.assertEqual(payload["output_schema"]["type"], "object")
        self.assertEqual(payload["agent_config"], {"max_duration_seconds": 45})
        self.assertNotIn(KEY, request.data.decode())
        self.assertIsInstance(self.build_opener.call_args.args[0], probe.NoRedirect)

    def test_missing_key_stops_before_network(self):
        error_output = io.StringIO()
        with patch.dict(os.environ, {"TINYFISH_API_KEY": ""}), contextlib.redirect_stderr(error_output):
            self.assertEqual(probe.main([]), 1)
        self.assertIn("Set TINYFISH_API_KEY", error_output.getvalue())
        self.build_opener.assert_not_called()

    def test_environment_key_does_not_prompt(self):
        self.respond(RUN)
        output = io.StringIO()
        with (
            patch.dict(os.environ, {"TINYFISH_API_KEY": KEY}),
            patch.object(probe, "getpass") as prompt,
            contextlib.redirect_stdout(output),
        ):
            self.assertEqual(probe.main([]), 0)
        prompt.assert_not_called()
        self.open.assert_called_once()
        self.assertEqual(self.open.call_args.args[0].get_header("X-api-key"), KEY)
        self.assertNotIn(KEY, output.getvalue())

    def test_prompt_key_is_used_without_saving_or_echoing_it(self):
        self.respond(RUN)
        output = io.StringIO()
        error_output = io.StringIO()
        with (
            patch.dict(os.environ, {"TINYFISH_API_KEY": "unused-env-fixture"}),
            patch.object(probe, "getpass", return_value=KEY) as prompt,
            contextlib.redirect_stdout(output),
            contextlib.redirect_stderr(error_output),
        ):
            self.assertEqual(probe.main(["--prompt-key"]), 0)
            self.assertEqual(os.environ["TINYFISH_API_KEY"], "unused-env-fixture")
        prompt.assert_called_once_with("TinyFish API key (input hidden): ")
        self.open.assert_called_once()
        self.assertEqual(self.open.call_args.args[0].get_header("X-api-key"), KEY)
        self.assertEqual(json.loads(output.getvalue())["status"], "COMPLETED")
        self.assertNotIn(KEY, output.getvalue() + error_output.getvalue())

    def test_prompt_aborts_instead_of_falling_back_to_visible_input(self):
        def visible_fallback(_prompt):
            warnings.warn("Cannot hide input", probe.GetPassWarning)
            self.fail("The prompt must abort before reading visible input")

        error_output = io.StringIO()
        with (
            patch.object(probe, "getpass", side_effect=visible_fallback),
            contextlib.redirect_stderr(error_output),
        ):
            self.assertEqual(probe.main(["--prompt-key"]), 1)
        self.assertIn("Cannot hide key input", error_output.getvalue())
        self.build_opener.assert_not_called()

    def test_empty_or_cancelled_prompt_does_not_send_request(self):
        for prompt_result in ({"return_value": "  "}, {"side_effect": EOFError}, {"side_effect": KeyboardInterrupt}):
            with self.subTest(prompt_result=prompt_result):
                error_output = io.StringIO()
                with patch.object(probe, "getpass", **prompt_result), contextlib.redirect_stderr(error_output):
                    self.assertEqual(probe.main(["--prompt-key"]), 1)
                self.assertIn("No request was sent", error_output.getvalue())
                self.build_opener.assert_not_called()

    def test_completed_run_can_still_be_incomplete(self):
        self.respond({**RUN, "result": {"status": "incomplete", "source_url": None, "first_author": None}})
        with self.assertRaisesRegex(probe.ProbeError, "did not confirm"):
            probe.run_probe(KEY)

    def test_rejects_unexpected_source_and_content(self):
        for fields, message in (
            ({"source_url": "https://quotes.toscrape.com.example.org/"}, "URL"),
            ({"first_author": "Unknown"}, "expected first author"),
        ):
            with self.subTest(fields=fields):
                self.respond({**RUN, "result": {**RESULT, **fields}})
                with self.assertRaisesRegex(probe.ProbeError, message):
                    probe.run_probe(KEY)

    def test_failed_run_is_not_a_result(self):
        self.respond({**RUN, "status": "FAILED", "error": {"message": "upstream error"}})
        with self.assertRaisesRegex(probe.ProbeError, "did not complete"):
            probe.run_probe(KEY)

    def test_http_errors_do_not_echo_raw_body_or_retry(self):
        for code in (302, 401, 402, 403, 429, 500):
            with self.subTest(code=code):
                self.open.reset_mock()
                self.open.side_effect = HTTPError(probe.RUN_URL, code, KEY, {}, io.BytesIO(KEY.encode()))
                with self.assertRaisesRegex(probe.ProbeError, f"HTTP {code}") as error:
                    probe.run_probe(KEY)
                self.assertNotIn(KEY, str(error.exception))
                self.open.assert_called_once()

    def test_unreadable_response(self):
        self.open.return_value = io.BytesIO(b"not JSON")
        with self.assertRaisesRegex(probe.ProbeError, "Invalid TinyFish response"):
            probe.run_probe(KEY)

    def test_network_error_is_actionable(self):
        self.open.side_effect = URLError("network unreachable")
        with self.assertRaisesRegex(probe.ProbeError, "Check network access"):
            probe.run_probe(KEY)


if __name__ == "__main__":
    unittest.main()
