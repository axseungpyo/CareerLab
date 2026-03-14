"""Prompt engine — loads YAML templates and renders with Jinja2."""

from pathlib import Path

import yaml
from jinja2 import Template


PROMPTS_DIR = Path(__file__).parent.parent / "config" / "prompts"


class PromptEngine:
    """Load YAML prompt templates, render with Jinja2 variables."""

    def __init__(self, prompts_dir: Path | None = None):
        self._dir = prompts_dir or PROMPTS_DIR
        self._cache: dict[str, dict] = {}

    def _load_template(self, name: str) -> dict:
        if name in self._cache:
            return self._cache[name]
        path = self._dir / f"{name}.yaml"
        if not path.exists():
            raise FileNotFoundError(f"프롬프트 템플릿을 찾을 수 없습니다: {path}")
        data = yaml.safe_load(path.read_text(encoding="utf-8"))
        self._cache[name] = data
        return data

    def render(
        self,
        template_name: str,
        variables: dict | None = None,
        sub_key: str | None = None,
    ) -> list[dict[str, str]]:
        """Render a prompt template into messages list.

        Args:
            template_name: YAML filename without extension (e.g. "resume_gen")
            variables: Jinja2 template variables
            sub_key: Sub-section key for multi-section templates (e.g. "question_gen")

        Returns:
            [{"role": "system", "content": "..."}, {"role": "user", "content": "..."}]
        """
        data = self._load_template(template_name)
        variables = variables or {}

        if sub_key:
            section = data.get(sub_key)
            if not section:
                raise KeyError(
                    f"프롬프트 '{template_name}'에 서브키 '{sub_key}'가 없습니다."
                )
        else:
            section = data

        system_tpl = section.get("system", "")
        user_tpl = section.get("user", "")

        system_content = Template(system_tpl).render(**variables)
        user_content = Template(user_tpl).render(**variables)

        messages = []
        if system_content.strip():
            messages.append({"role": "system", "content": system_content.strip()})
        if user_content.strip():
            messages.append({"role": "user", "content": user_content.strip()})
        return messages

    def get_version(self, template_name: str) -> str:
        data = self._load_template(template_name)
        metadata = data.get("metadata", {})
        return metadata.get("version", "unknown")


# Singleton
_engine: PromptEngine | None = None


def get_prompt_engine() -> PromptEngine:
    global _engine
    if _engine is None:
        _engine = PromptEngine()
    return _engine
