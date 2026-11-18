import unittest
from io import BytesIO
from urllib.parse import urlsplit

from fastapi.testclient import TestClient
from pypdf import PdfReader

from api.scholarship import app
from backend.app.eligibility import ScholarshipAnswers


PATH = "/api/scholarship"
MATCHING = {
    "recent_class_12": True,
    "first_year_regular_degree": True,
    "recognised_institution": True,
    "board_merit": True,
    "income_within_limit": True,
    "other_aid": False,
}


class ScholarshipAPITests(unittest.TestCase):
    def setUp(self):
        self.client = self.enterContext(TestClient(app))

    def test_public_questions_and_official_sources_need_no_account_or_key(self):
        response = self.client.get(PATH)
        self.assertEqual(response.status_code, 200)
        self.assertIn("no-store", response.headers["Cache-Control"])
        metadata = response.json()
        self.assertEqual({question["field"] for question in metadata["questions"]}, set(ScholarshipAnswers.model_fields))
        scheme = metadata["scheme"]
        self.assertEqual(scheme["id"], "pm-usp-csss-fresh")
        self.assertNotIn("rules", scheme)
        for url in [scheme["application_url"], *(source["url"] for source in scheme["sources"].values())]:
            self.assertEqual((urlsplit(url).scheme, urlsplit(url).hostname), ("https", "scholarships.gov.in"))

    def test_all_conditions_matching_is_not_government_approval(self):
        response = self.client.post(PATH, json=MATCHING)
        self.assertEqual(response.status_code, 200)
        self.assertIn("no-store", response.headers["Cache-Control"])
        result = response.json()
        self.assertEqual(result["status"], "Eligible")
        self.assertIn("not government approval", result["notice"])
        self.assertEqual(len(result["checks"]), 6)
        for check in result["checks"]:
            self.assertEqual(check["state"], "met")
            self.assertTrue(check["quote"] and check["source"] and check["section"])

    def test_an_unmet_required_condition_takes_priority_over_unknown_answers(self):
        for payload in ({"income_within_limit": False}, {"other_aid": True}, {"first_year_regular_degree": False}):
            with self.subTest(payload=payload):
                result = self.client.post(PATH, json=payload).json()
                self.assertEqual(result["status"], "Not eligible")
                states = [check["state"] for check in result["checks"]]
                self.assertIn("not_met", states)
                self.assertIn("unknown", states)

    def test_partial_and_unknown_answers_not_guessed(self):
        result = self.client.post(PATH, json={**MATCHING, "board_merit": None}).json()
        self.assertEqual(result["status"], "Potentially eligible")
        self.assertIn("unknown", [check["state"] for check in result["checks"]])
        result = self.client.post(PATH, json={}).json()
        self.assertEqual(result["status"], "Insufficient information")
        self.assertTrue(all(check["state"] == "unknown" for check in result["checks"]))

    def test_rejects_extra_fields_and_non_boolean_values_without_echoing_them(self):
        for payload in ({"name": "private-input-fixture"}, {"board_merit": "private-input-fixture"}, {"board_merit": 1}, []):
            with self.subTest(payload=payload):
                response = self.client.post(PATH, json=payload)
                self.assertEqual(response.status_code, 422)
                self.assertNotIn("private-input-fixture", response.text)
                self.assertIn("no-store", response.headers["Cache-Control"])

    def test_rejects_oversize_requests_and_wrong_content_type(self):
        max_body = self.client.post(PATH, json={"padding": "x" * 2000})
        self.assertEqual(max_body.status_code, 413)
        self.assertEqual(self.client.post(PATH, data={"board_merit": "true"}).status_code, 415)
        self.assertEqual(self.client.post(f"{PATH}?format=invalid", json={}).status_code, 400)

    def test_can_download_pdf_from_same_answers(self):
        response = self.client.post(f"{PATH}?format=pdf", json=MATCHING)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.headers["Content-Type"], "application/pdf")
        self.assertIn('attachment; filename="yojnaagent-scholarship-report.pdf"', response.headers["Content-Disposition"])
        self.assertIn("no-store", response.headers["Cache-Control"])
        self.assertTrue(response.content.startswith(b"%PDF-"))
        pdf = PdfReader(BytesIO(response.content))
        self.assertEqual(len(pdf.pages), 2)
        decision, guide = (page.extract_text() for page in pdf.pages)
        self.assertIn("Eligible — Your answers match", decision)
        self.assertIn("Class 12 board merit list", decision)
        self.assertIn("Family income certificate", guide)
        self.assertIn("Sources reviewed 2026-11-18", guide)
        links = {
            annot.get_object()["/A"].get("/URI")
            for page in pdf.pages for annot in page.get("/Annots", [])
        }
        self.assertIn("https://scholarships.gov.in/Students", links)
        self.assertIn("https://scholarships.gov.in/public/schemeGuidelines/FAQ_DOHE_CSSS.pdf", links)


if __name__ == "__main__":
    unittest.main()
