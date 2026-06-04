"""Generate a one-page synthetic side letter PDF for testing the extractor.

All parties, terms, and figures are fictional.
"""
from reportlab.lib.pagesizes import LETTER
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib.enums import TA_JUSTIFY
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    HRFlowable,
)
from reportlab.lib import colors

OUTPUT = "test-side-letter.pdf"

styles = getSampleStyleSheet()

disclaimer_style = ParagraphStyle(
    "disclaimer",
    parent=styles["Normal"],
    fontName="Helvetica-Oblique",
    fontSize=7.5,
    textColor=colors.grey,
    leading=10,
    spaceAfter=8,
)
title_style = ParagraphStyle(
    "title",
    parent=styles["Title"],
    fontName="Helvetica-Bold",
    fontSize=12,
    alignment=1,
    spaceAfter=8,
    leading=14,
)
preamble_style = ParagraphStyle(
    "preamble",
    parent=styles["Normal"],
    fontName="Helvetica",
    fontSize=9,
    leading=12,
    alignment=TA_JUSTIFY,
    spaceAfter=6,
)
clause_style = ParagraphStyle(
    "clause",
    parent=styles["Normal"],
    fontName="Helvetica",
    fontSize=9,
    leading=12,
    alignment=TA_JUSTIFY,
    spaceAfter=4,
)
sig_style = ParagraphStyle(
    "sig",
    parent=styles["Normal"],
    fontName="Helvetica-Oblique",
    fontSize=8,
    textColor=colors.grey,
    leading=10,
    spaceBefore=6,
)


def main() -> None:
    doc = SimpleDocTemplate(
        OUTPUT,
        pagesize=LETTER,
        leftMargin=0.75 * inch,
        rightMargin=0.75 * inch,
        topMargin=0.6 * inch,
        bottomMargin=0.6 * inch,
        title="Synthetic Side Letter — Test Document",
        author="Side Letter Obligation Extractor",
    )

    story = [
        Paragraph(
            "SYNTHETIC SAMPLE — every party, fund, dollar figure, and date below is fictional and was written solely to exercise an extraction tool. Not a real agreement; not legal advice.",
            disclaimer_style,
        ),
        HRFlowable(width="100%", thickness=0.5, color=colors.lightgrey, spaceAfter=8),
        Paragraph("SIDE LETTER AGREEMENT", title_style),
        Paragraph(
            "This Side Letter is entered into as of <b>April 1, 2026</b>, by and among "
            "<b>Arden Crossing Partners V, L.P.</b> (the &ldquo;Fund&rdquo;), "
            "<b>Arden Crossing GP V, LLC</b> (the &ldquo;General Partner&rdquo;), and "
            "<b>Greater Plains Municipal Employees&rsquo; Retirement System</b> "
            "(the &ldquo;Limited Partner&rdquo;), in connection with the Limited Partner&rsquo;s "
            "subscription to the Fund.",
            preamble_style,
        ),
        Paragraph(
            "<b>1. Most Favored Nation.</b> The Limited Partner shall have the right to elect "
            "any more favorable economic or governance term granted by the General Partner to "
            "any other Limited Partner whose capital commitment is equal to or less than that "
            "of the Limited Partner. The General Partner shall deliver a schedule of all "
            "side-letter provisions within <b>sixty (60) days</b> following the final closing of "
            "the Fund, and the Limited Partner shall have <b>thirty (30) days</b> thereafter to "
            "make any MFN election.",
            clause_style,
        ),
        Paragraph(
            "<b>2. Reporting.</b> (a) Unaudited quarterly reports, including a capital account "
            "statement, shall be delivered within <b>forty-five (45) days</b> after the end of "
            "each fiscal quarter. (b) Audited annual financial statements shall be delivered "
            "within <b>ninety (90) days</b> after fiscal year-end. (c) Estimated tax information "
            "(including Schedule K-1) shall be delivered no later than <b>July 15</b> of each year.",
            clause_style,
        ),
        Paragraph(
            "<b>3. Management Fee Offset.</b> One hundred percent (100%) of any transaction, "
            "monitoring, or director fees attributable to the Limited Partner&rsquo;s interest and "
            "received by the General Partner or its affiliates shall reduce the management fee "
            "otherwise payable by the Limited Partner.",
            clause_style,
        ),
        Paragraph(
            "<b>4. Co-Investment.</b> The General Partner shall offer the Limited Partner "
            "priority co-investment, pro rata to its commitment, in any opportunity exceeding "
            "the amount the General Partner determines appropriate for the Fund. The Limited "
            "Partner shall respond within <b>fifteen (15) business days</b> of receiving any "
            "co-investment notice.",
            clause_style,
        ),
        Paragraph(
            "<b>5. Excuse Right.</b> The Limited Partner shall be excused from any investment "
            "that, in its reasonable judgment, would violate applicable law or its written "
            "investment policy, provided written notice is delivered within <b>ten (10) business "
            "days</b> of the relevant drawdown notice. Excused investments include, without "
            "limitation, portfolio companies deriving more than <b>twenty percent (20%)</b> of "
            "revenue from thermal coal extraction, excluding existing portfolio companies as of "
            "the Fund&rsquo;s first closing.",
            clause_style,
        ),
        Paragraph(
            "<b>6. LPAC Representation.</b> For so long as the Limited Partner holds an "
            "unreturned capital commitment of at least <b>fifty million dollars ($50,000,000)</b>, "
            "the Limited Partner shall be entitled to appoint one (1) member to the Fund&rsquo;s "
            "Limited Partner Advisory Committee.",
            clause_style,
        ),
        Paragraph(
            "<b>7. Consent — Concentration.</b> The General Partner shall not, without the "
            "prior written consent of a majority in interest of the Limited Partners, invest "
            "more than <b>fifteen percent (15%)</b> of aggregate capital commitments in any "
            "single portfolio company.",
            clause_style,
        ),
        Paragraph(
            "<b>8. Notice of Key Person Event.</b> The General Partner shall provide written "
            "notice to the Limited Partner within <b>five (5) business days</b> of becoming "
            "aware of any event that would constitute a &ldquo;Key Person Event&rdquo; under the "
            "Partnership Agreement.",
            clause_style,
        ),
        Paragraph(
            "<b>9. Public Records.</b> The Limited Partner is subject to public-records laws "
            "of its state, and the General Partner agrees that disclosure of fund-level "
            "performance data by the Limited Partner pursuant to such laws shall not constitute "
            "a breach of confidentiality.",
            clause_style,
        ),
        Spacer(1, 6),
        HRFlowable(width="100%", thickness=0.5, color=colors.lightgrey, spaceAfter=6),
        Paragraph(
            "[Signature blocks omitted — synthetic sample.]",
            sig_style,
        ),
    ]

    doc.build(story)
    print(f"Wrote {OUTPUT}")


if __name__ == "__main__":
    main()
