from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "Sistema Cactario Casa Molle"
    SUPABASE_URL: str = "https://your-project.supabase.co"
    SUPABASE_SERVICE_KEY: str = "your-service-key-here"
    class Config:
        env_file = ".env"

settings = Settings()
