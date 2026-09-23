from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "AI Kitchen & Recipe Intelligence API"
    environment: str = "development"
    database_url: str = ""
    supabase_url: str = ""
    supabase_anon_key: str = ""
    openrouter_api_key: str = ""
    openrouter_model: str = "nvidia/nemotron-3.5-lightning:free"
    openrouter_fallback_models: str = (
        "thinking-machines/inkling-small:free,"
        "poolside/laguna-s-2.1:free,"
        "thinking-machines/inkling:free,"
        "poolside/laguna-xs-2.1:free,"
        "cohere/north-mini-code:free,"
        "z-ai/glm-5.2:free,"
        "nvidia/nemotron-3-ultra:free,"
        "nvidia/nemotron-3-nano-omni:free,"
        "google/gemma-4-26b-a4b:free,"
        "google/gemma-4-31b-it:free"
    )
    openrouter_retries_per_model: int = 1
    openrouter_site_url: str = ""
    huggingface_space_url: str = "https://owaies-kitchen-ingredient-detector.hf.space"
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173,https://ai-kitchen-recipe-intelligence-owaies-projects.vercel.app"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()
