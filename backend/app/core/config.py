from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    app_name: str = "AI Kitchen & Recipe Intelligence API"
    environment: str = "development"
    database_url: str = ""
    supabase_url: str = ""
    supabase_anon_key: str = ""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

settings = Settings()
