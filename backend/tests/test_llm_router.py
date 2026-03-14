"""Tests for LLM router — task type mapping and routing logic."""

from core.llm_router import (
    TaskType,
    Provider,
    TASK_MODEL_MAP,
    ModelConfig,
)


def test_task_model_map_completeness():
    """Every TaskType should have a mapping."""
    for task_type in TaskType:
        assert task_type in TASK_MODEL_MAP


def test_claude_oauth_tasks():
    """resume_gen, feedback, mock_interview, question_gen → Claude OAuth."""
    claude_tasks = [
        TaskType.resume_gen,
        TaskType.feedback,
        TaskType.mock_interview,
        TaskType.question_gen,
    ]
    for task in claude_tasks:
        config = TASK_MODEL_MAP[task]
        assert config.provider == Provider.claude


def test_openai_tasks():
    """company_analysis, file_parsing, embedding → OpenAI."""
    openai_tasks = [
        TaskType.company_analysis,
        TaskType.file_parsing,
        TaskType.embedding,
    ]
    for task in openai_tasks:
        config = TASK_MODEL_MAP[task]
        assert config.provider == Provider.openai


def test_stream_defaults():
    """resume_gen and mock_interview default to streaming."""
    assert TASK_MODEL_MAP[TaskType.resume_gen].stream_default is True
    assert TASK_MODEL_MAP[TaskType.mock_interview].stream_default is True
    assert TASK_MODEL_MAP[TaskType.feedback].stream_default is False


def test_model_config_immutable():
    """ModelConfig should be frozen dataclass."""
    config = TASK_MODEL_MAP[TaskType.resume_gen]
    assert isinstance(config, ModelConfig)
    try:
        config.max_tokens = 999  # type: ignore
        assert False, "Should not allow mutation"
    except AttributeError:
        pass
