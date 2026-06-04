"""Generate a one-page client-facing README PDF: URL, login, quick how-to."""
from reportlab.lib.pagesizes import LETTER
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib.enums import TA_LEFT
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    HRFlowable,
    ListFlowable,
    ListItem,
)
from reportlab.lib import colors

OUTPUT = "client-readme.pdf"
URL = "https://sideletterextractor.vercel.app/"
USERNAME = "catalant"

INK = colors.HexColor("#0b1320")
MUTED = colors.HexColor("#475569")
ACCENT = colors.HexColor("#0f766e")
BORDER = colors.HexColor("#e2e8f0")

styles = getSampleStyleSheet()

H1 = ParagraphStyle(
    "h1",
    parent=styles["Title"],
    fontName="Helvetica-Bold",
    fontSize=18,
    textColor=INK,
    spaceAfter=2,
    leading=22,
    alignment=TA_LEFT,
)
SUB = ParagraphStyle(
    "sub",
    parent=styles["Normal"],
    fontName="Helvetica",
    fontSize=10,
    textColor=MUTED,
    leading=13,
    spaceAfter=10,
)
H2 = ParagraphStyle(
    "h2",
    parent=styles["Heading2"],
    fontName="Helvetica-Bold",
    fontSize=11,
    textColor=INK,
    spaceBefore=10,
    spaceAfter=4,
    leading=14,
)
BODY = ParagraphStyle(
    "body",
    parent=styles["Normal"],
    fontName="Helvetica",
    fontSize=10,
    textColor=INK,
    leading=14,
    spaceAfter=4,
)
MONO = ParagraphStyle(
    "mono",
    parent=styles["Normal"],
    fontName="Courier",
    fontSize=10,
    textColor=INK,
    leading=14,
)
DISCLAIMER = ParagraphStyle(
    "disclaimer",
    parent=styles["Normal"],
    fontName="Helvetica-Oblique",
    fontSize=8,
    textColor=MUTED,
    leading=11,
    spaceBefore=10,
)


def access_table() -> Table:
    data = [
        [Paragraph("<b>URL</b>", BODY), Paragraph(f'<a href="{URL}"><font color="#0f766e">{URL}</font></a>', BODY)],
        [Paragraph("<b>Username</b>", BODY), Paragraph(f'<font face="Courier">{USERNAME}</font>', BODY)],
        [Paragraph("<b>Password</b>", BODY), Paragraph("Provided separately.", BODY)],
    ]
    t = Table(data, colWidths=[1.1 * inch, 5.4 * inch])
    t.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (0, -1), colors.HexColor("#f8fafc")),
                ("BOX", (0, 0), (-1, -1), 0.5, BORDER),
                ("INNERGRID", (0, 0), (-1, -1), 0.5, BORDER),
                ("LEFTPADDING", (0, 0), (-1, -1), 8),
                ("RIGHTPADDING", (0, 0), (-1, -1), 8),
                ("TOPPADDING", (0, 0), (-1, -1), 6),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ]
        )
    )
    return t


def numbered(items: list[str]) -> ListFlowable:
    return ListFlowable(
        [ListItem(Paragraph(t, BODY), leftIndent=10) for t in items],
        bulletType="1",
        bulletFontName="Helvetica-Bold",
        bulletFontSize=10,
        leftIndent=14,
        spaceBefore=0,
        spaceAfter=0,
    )


def bullets(items: list[str]) -> ListFlowable:
    return ListFlowable(
        [ListItem(Paragraph(t, BODY), leftIndent=10) for t in items],
        bulletType="bullet",
        start="•",
        leftIndent=14,
        spaceBefore=0,
        spaceAfter=0,
    )


def main() -> None:
    doc = SimpleDocTemplate(
        OUTPUT,
        pagesize=LETTER,
        leftMargin=0.7 * inch,
        rightMargin=0.7 * inch,
        topMargin=0.7 * inch,
        bottomMargin=0.6 * inch,
        title="Side Letter Obligation Extractor — Test Access",
        author="Christian Busch",
    )

    story = [
        Paragraph("Side Letter Obligation Extractor", H1),
        Paragraph("Test access &amp; quick-start guide", SUB),
        HRFlowable(width="100%", thickness=0.5, color=BORDER, spaceAfter=10),

        Paragraph("Access", H2),
        access_table(),

        Paragraph("What it does", H2),
        Paragraph(
            "Upload a fund side letter (PDF). The tool extracts every LP-specific obligation "
            "&mdash; MFN rights, reporting deadlines, fee offsets, co-investment rights, excuse "
            "rights, LPAC representation, consent thresholds, key-person notices &mdash; into a "
            "standardized register. New uploads merge into a single master register keyed on "
            "<font face=\"Courier\">LP name + clause reference</font>, so you can compare terms "
            "across LPs and surface every MFN-eligible or consent-gated item in one place.",
            BODY,
        ),

        Paragraph("How to test (5 minutes)", H2),
        numbered(
            [
                "Open the URL above. Sign in with the credentials in the box.",
                "On the <b>Upload</b> page, drop a side-letter PDF (or paste the text) "
                "and wait for extraction. A preview table appears below.",
                "Click <b>Save to master register</b>. The rows merge into your register.",
                "Open <b>Master register</b> &mdash; filter by LP, obligation type, "
                "or flag (MFN / consent / review). Export to CSV or JSON.",
                "Open <b>Calendar</b> to see reporting deadlines expanded into concrete dates, "
                "<b>MFN reconciliation</b> for side-by-side comparison across LPs, "
                "and <b>Review queue</b> for rows the extractor flagged as ambiguous.",
                "Repeat with a second side letter to populate the cross-LP views.",
            ]
        ),

        Paragraph("What I'd value feedback on", H2),
        bullets(
            [
                "<b>Extraction accuracy.</b> Did the extractor capture every obligation? "
                "Anything missed, misclassified, or hallucinated?",
                "<b>Nested carve-outs.</b> Where a clause contains exceptions (e.g., excuse "
                "right with revenue-threshold exclusions), did the carve-out survive?",
                "<b>Review flags.</b> Were the rows flagged for review the right ones?",
                "<b>What's missing</b> for an institutional rollout: source-text highlighting, "
                "LPA + side-letter cross-reference, workflow integration, etc.",
            ]
        ),

        Paragraph(
            "Single-user demo. State is stored locally in your browser; clearing your "
            "browser data resets the register. Documents are sent to Anthropic's API for "
            "extraction; do not upload confidential or client-restricted material.",
            DISCLAIMER,
        ),
    ]

    doc.build(story)
    print(f"Wrote {OUTPUT}")


if __name__ == "__main__":
    main()
