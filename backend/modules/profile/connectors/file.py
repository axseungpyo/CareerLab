"""FileConnector — parse uploaded files: PDF, DOCX, TXT, MD."""

import io
from typing import Any

from .base import DataConnector


class FileConnector(DataConnector):
    """Parse uploaded resume files into structured profile data."""

    SUPPORTED_EXTENSIONS = {"pdf", "docx", "txt", "md"}

    @property
    def source_type(self) -> str:
        return "file"

    async def extract_text(self, source: Any) -> str:
        """source = (file_content_bytes, extension_string)"""
        content, ext = source
        extractors = {
            "pdf": self._extract_pdf,
            "docx": self._extract_docx,
            "txt": self._extract_plain,
            "md": self._extract_plain,
        }
        extractor = extractors.get(ext)
        if not extractor:
            return ""
        return extractor(content)

    def _extract_pdf(self, content: bytes) -> str:
        import pdfplumber
        pages = []
        with pdfplumber.open(io.BytesIO(content)) as pdf:
            for page in pdf.pages:
                text = page.extract_text()
                if text:
                    pages.append(text)
        return "\n\n".join(pages)

    def _extract_docx(self, content: bytes) -> str:
        from docx import Document
        doc = Document(io.BytesIO(content))
        return "\n".join(p.text for p in doc.paragraphs if p.text.strip())

    def _extract_plain(self, content: bytes) -> str:
        """TXT/MD — decode with Korean encoding fallback."""
        for encoding in ("utf-8", "cp949", "euc-kr", "latin-1"):
            try:
                return content.decode(encoding)
            except (UnicodeDecodeError, LookupError):
                continue
        return content.decode("utf-8", errors="replace")
