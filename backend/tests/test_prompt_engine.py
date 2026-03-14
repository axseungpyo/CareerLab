"""Tests for prompt engine."""

from pathlib import Path

import pytest

from core.prompt_engine import PromptEngine


@pytest.fixture
def engine():
    prompts_dir = Path(__file__).parent.parent / "config" / "prompts"
    return PromptEngine(prompts_dir)


def test_render_resume_gen(engine):
    messages = engine.render("resume_gen", {
        "company_analysis": "삼성전자 분석",
        "matched_entries": "경력1, 경력2",
        "question": "지원동기를 작성하세요",
        "tone": "전문적",
        "char_limit": "500",
    })
    assert len(messages) == 2
    assert messages[0]["role"] == "system"
    assert messages[1]["role"] == "user"
    assert "삼성전자 분석" in messages[1]["content"]


def test_render_with_defaults(engine):
    messages = engine.render("resume_gen", {
        "company_analysis": "테스트",
        "matched_entries": "없음",
        "question": "질문",
    })
    assert "전문적" in messages[1]["content"]  # default tone


def test_render_sub_key(engine):
    messages = engine.render("interview", {
        "resume_content": "자소서 내용",
        "company_analysis": "기업 분석",
        "career_entries": "경력",
    }, sub_key="question_gen")
    assert len(messages) == 2
    assert "카테고리별" in messages[0]["content"]


def test_invalid_sub_key(engine):
    with pytest.raises(KeyError):
        engine.render("interview", {}, sub_key="nonexistent")


def test_get_version(engine):
    version = engine.get_version("resume_gen")
    assert version == "1.0.0"


def test_template_not_found(engine):
    with pytest.raises(FileNotFoundError):
        engine.render("nonexistent_template", {})


def test_template_caching(engine):
    engine.render("resume_gen", {"company_analysis": "", "matched_entries": "", "question": ""})
    assert "resume_gen" in engine._cache
    # Second call uses cache
    engine.render("resume_gen", {"company_analysis": "", "matched_entries": "", "question": ""})
