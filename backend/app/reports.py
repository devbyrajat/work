"""Render an application plan from the same result shown in the browser."""

from io import BytesIO
from xml.sax.saxutils import escape, quoteattr

from reportlab.lib.colors import HexColor
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.platypus import PageBreak, Paragraph, SimpleDocTemplate

from .eligibility import SCHEME


CHECK_STATES = {"met": "Met", "not_met": "Not met", "unknown": "Not sure"}


def text(value: str) -> str:
    return escape(value.replace("₹ ", "INR ").replace("₹", "INR "))


def official_link(label: str, url: str) -> str:
    return f'<link href={quoteattr(url)} color="#3157A4"><u>{text(label)}</u></link>'


def render_report(result: dict) -> bytes:
    buffer = BytesIO()
    styles = getSampleStyleSheet()
    styles.add(ParagraphStyle("ReportTitle", fontName="Helvetica-Bold", fontSize=20, leading=24,
                              textColor=HexColor("#172554"), spaceAfter=10))
    styles.add(ParagraphStyle("Evidence", fontSize=8.5, leading=11, textColor=HexColor("#475569"), spaceAfter=5))
    pdf = SimpleDocTemplate(buffer, pagesize=A4, leftMargin=44, rightMargin=44, topMargin=40, bottomMargin=42,
                            title="YojnaAgent - PM-USP CSSS scholarship check", author="YojnaAgent")
    story = []

    def add(markup: str, style: str = "BodyText") -> None:
        story.append(Paragraph(markup, styles[style]))

    add(f'YOJNAAGENT / FRESH SCHOLARSHIP CHECK / AY {text(SCHEME["academic_year"])}', "Evidence")
    add(text(SCHEME["name"]), "ReportTitle")
    add(f'<b>{text(result["status"])}</b> — {text(result["summary"])}')
    add(text(result["notice"]))
    add("Published benefit", "Heading2")
    add(text(SCHEME["benefit"]))
    add("Eligibility checks", "Heading2")
    for check in result["checks"]:
        source = SCHEME["sources"][check["source"]]
        add(f'<b>{text(check["label"])}</b> · {CHECK_STATES[check["state"]]}. {text(check["reason"])}')
        add(f'“{text(check["quote"])}” · {official_link(check["section"], source["url"])}', "Evidence")

    story.append(PageBreak())
    add("YOJNAAGENT / PM-USP CSSS", "Evidence")
    add("Application guide", "ReportTitle")
    add("Document checklist", "Heading2")
    for item in SCHEME["documents"]:
        add(f'<b>{text(item["name"])}</b> — {text(item["detail"])}')
    add("How to apply", "Heading2")
    add(text(SCHEME["application_window"]))
    for number, step in enumerate(SCHEME["steps"], 1):
        add(f"{number}. {text(step)}")
    add(official_link("Open the National Scholarship Portal", SCHEME["application_url"]))
    add("Official sources", "Heading2")
    add(f'Sources reviewed {text(SCHEME["sources_reviewed_on"])}. This is not live research.', "Evidence")
    for source in SCHEME["sources"].values():
        add(official_link(source["label"], source["url"]))

    pdf.build(story)
    return buffer.getvalue()
