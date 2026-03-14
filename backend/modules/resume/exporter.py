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
