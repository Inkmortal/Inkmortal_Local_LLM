"""
Configuration settings for the application.
"""

import os
from dotenv import load_dotenv
from enum import Enum, auto
from typing import Optional

# Load environment variables
load_dotenv()

class EnvironmentType(Enum):
    """Application environment types"""
    DEVELOPMENT = auto()
    TESTING = auto()
    PRODUCTION = auto()

class Settings:
    """Application settings"""
    
    def __init__(self):
        # Determine environment type
        env_name = os.getenv("APP_ENV", "development").lower()
        
        # Set environment type
        if env_name == "production":
            self.environment = EnvironmentType.PRODUCTION
        elif env_name == "testing" or "pytest" in os.getenv("PYTHONPATH", "") or os.getenv("PYTEST_CURRENT_TEST"):
            self.environment = EnvironmentType.TESTING
        else:
            self.environment = EnvironmentType.DEVELOPMENT
            
        # Database settings
        self.db_url = os.getenv("DATABASE_URL", "sqlite:///./test.db")
        
        # Queue settings
        self.rabbitmq_url = os.getenv("RABBITMQ_URL", "amqp://guest:guest@localhost/")
        self.aging_threshold_seconds = int(os.getenv("AGING_THRESHOLD_SECONDS", "30"))
        
        # Ollama settings
        self.ollama_api_url = os.getenv("OLLAMA_API_URL", "http://localhost:11434")
        self.default_model = os.getenv("DEFAULT_MODEL", "llama3.3:70b")
        
        # Auth settings
        self.secret_key = os.getenv("SECRET_KEY", "dev_secret_key")
        self.token_expire_minutes = int(os.getenv("TOKEN_EXPIRE_MINUTES", "60"))
        self.whitelisted_ips = os.getenv("WHITELISTED_IPS", "127.0.0.1").split(",")
        
        # Base domain and CORS settings
        self.base_domain = os.getenv("BASE_DOMAIN", "seadragoninkmortal.com")
        
        # CORS settings based on environment
        if self.is_production:
            self.allowed_origins = [
                f"https://chat.{self.base_domain}",
                f"https://admin.{self.base_domain}",
            ]
        elif self.is_development:
            self.allowed_origins = [
                f"https://chat.{self.base_domain}",
                f"https://admin.{self.base_domain}",
                "http://localhost:3000",
                "http://localhost:8000",
            ]
        else:  # Testing
            self.allowed_origins = ["*"]  # Allow all origins in test mode
            
    @property
    def is_testing(self) -> bool:
        """Check if we're running in test mode"""
        return self.environment == EnvironmentType.TESTING
        
    @property
    def is_development(self) -> bool:
        """Check if we're running in development mode"""
        return self.environment == EnvironmentType.DEVELOPMENT
        
    @property
    def is_production(self) -> bool:
        """Check if we're running in production mode"""
        return self.environment == EnvironmentType.PRODUCTION
    
    # This approach allows flexibility to change URLs without changing code
    @property
    def queue_manager_class(self) -> str:
        """Get the queue manager class to use"""
        if self.is_testing:
            return "app.queue.mock.manager.MockQueueManager"
        else:
            return "app.queue.rabbitmq.manager.RabbitMQManager"

# Create a global settings instance
settings = Settings()