import pytest
from pydantic import ValidationError

from backend.app.core.config import Settings


@pytest.mark.parametrize("retry_count", [0, 1, 3])
def test_openrouter_retry_count_accepts_supported_values(retry_count):
    settings = Settings(_env_file=None, openrouter_retries_per_model=retry_count)

    assert settings.openrouter_retries_per_model == retry_count


@pytest.mark.parametrize("retry_count", [-1, 4])
def test_openrouter_retry_count_rejects_values_outside_supported_range(retry_count):
    with pytest.raises(ValidationError):
        Settings(_env_file=None, openrouter_retries_per_model=retry_count)


def test_openrouter_retry_count_defaults_to_one():
    settings = Settings(_env_file=None)

    assert settings.openrouter_retries_per_model == 1
