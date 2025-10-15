from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "Sistema Cactario Casa Molle"
    SUPABASE_URL: str
    SUPABASE_SERVICE_KEY: str
    class Config:
        env_file = ".env"

settings = Settings()
