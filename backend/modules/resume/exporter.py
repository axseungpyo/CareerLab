"""Resume exporter — generate DOCX from resume data."""

import io

from docx import Document
from docx.shared import Pt, Inches
from docx.enum.text import WD_ALIGN_PARAGRAPH
from supabase import create_client

from config.settings import get_settings


class ResumeExporter:
    """Export resume to DOCX format."""

    def __init__(self):
        settings = get_settings()
        self._db = create_client(
            settings.supabase_url, settings.supabase_service_role_key
        )

    def to_docx(self, resume_id: str) -> bytes:
        """Generate a formatted DOCX from resume data."""
        # Load resume with items and company info
        result = (
            self._db.table("resumes")
            .select("*, resume_items(*), company_analyses(company_name)")
            .eq("id", resume_id)
            .execute()
        )
        if not result.data:
            raise ValueError("자소서를 찾을 수 없습니다.")

        resume = result.data[0]
        items = sorted(resume.get("resume_items", []), key=lambda x: x.get("created_at", ""))
        company = resume.get("company_analyses", {}).get("company_name", "")

        doc = Document()

        # Title
        title = doc.add_heading(resume.get("title", "자기소개서"), level=1)
        title.alignment = WD_ALIGN_PARAGRAPH.CENTER

        if company:
            subtitle = doc.add_paragraph(f"지원 기업: {company}")
            subtitle.alignment = WD_ALIGN_PARAGRAPH.CENTER
            subtitle.runs[0].font.size = Pt(11)

        doc.add_paragraph("")

        # Items
        for i, item in enumerate(items, 1):
            q = doc.add_heading(f"{i}. {item.get('question', '')}", level=2)
            q.runs[0].font.size = Pt(12)

            answer = item.get("answer", "")
            p = doc.add_paragraph(answer)
            p.paragraph_format.line_spacing = 1.5
            for run in p.runs:
                run.font.size = Pt(10.5)

            if item.get("char_limit"):
                info = doc.add_paragraph(
                    f"(글자수: {len(answer)}/{item['char_limit']})"
                )
                info.runs[0].font.size = Pt(9)
                info.runs[0].font.color.rgb = None

            doc.add_paragraph("")

        # Save to bytes
        buffer = io.BytesIO()
        doc.save(buffer)
        return buffer.getvalue()

    def to_pdf(self, resume_id: str) -> bytes:
        """Generate PDF by converting DOCX → PDF via docx2pdf or fallback HTML."""
        # Use HTML-based PDF generation for portability
        result = (
            self._db.table("resumes")
            .select("*, resume_items(*), company_analyses(company_name)")
            .eq("id", resume_id)
            .execute()
        )
        if not result.data:
            raise ValueError("자소서를 찾을 수 없습니다.")

        resume = result.data[0]
        items = sorted(resume.get("resume_items", []), key=lambda x: x.get("created_at", ""))
        company = resume.get("company_analyses", {}).get("company_name", "")
        title = resume.get("title", "자기소개서")

        # Build HTML
        html_parts = [
            "<!DOCTYPE html><html><head><meta charset='utf-8'>",
            "<style>",
            "body { font-family: 'Noto Sans KR', sans-serif; max-width: 700px; margin: 40px auto; padding: 0 20px; color: #333; }",
            "h1 { text-align: center; font-size: 22px; margin-bottom: 4px; }",
            ".company { text-align: center; color: #666; font-size: 14px; margin-bottom: 30px; }",
            "h2 { font-size: 14px; color: #1a1a1a; border-bottom: 1px solid #ddd; padding-bottom: 4px; }",
            "p { font-size: 12px; line-height: 1.8; white-space: pre-wrap; }",
            ".meta { font-size: 10px; color: #999; }",
            "</style></head><body>",
            f"<h1>{title}</h1>",
        ]
        if company:
            html_parts.append(f'<div class="company">지원 기업: {company}</div>')

        for i, item in enumerate(items, 1):
            q = item.get("question", "")
            a = item.get("answer", "")
            char_limit = item.get("char_limit")
            html_parts.append(f"<h2>{i}. {q}</h2>")
            html_parts.append(f"<p>{a}</p>")
            if char_limit:
                html_parts.append(f'<div class="meta">글자수: {len(a)}/{char_limit}</div>')

        html_parts.append("</body></html>")
        html_content = "\n".join(html_parts)

        # Try weasyprint, fallback to returning HTML as bytes
        try:
            from weasyprint import HTML
            pdf_bytes = HTML(string=html_content).write_pdf()
            return pdf_bytes
        except ImportError:
            # Fallback: return HTML for browser-based PDF printing
            return html_content.encode("utf-8")
