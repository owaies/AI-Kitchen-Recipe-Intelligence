from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "AI Kitchen & Recipe Intelligence API"
    environment: str = "development"
    database_url: str = ""
    supabase_url: str = ""
    supabase_anon_key: str = ""
    openrouter_api_key: str = ""
    openrouter_model: str = "nvidia/nemotron-3.5-lightning:free"
    openrouter_site_url: str = ""
    huggingface_space_url: str = "https://owaies-kitchen-ingredient-detector.hf.space"
    cors_origins: str = "http://localhost:5173"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()
