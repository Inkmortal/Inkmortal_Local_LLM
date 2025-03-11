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
        # Default model from environment variable, will be updated from DB if available
        self._default_model = os.getenv("DEFAULT_MODEL", "llama3.3:latest")
        
        # Try to load model settings from database if not in testing mode
        if env_name != "testing" and "pytest" not in os.getenv("PYTHONPATH", "") and not os.getenv("PYTEST_CURRENT_TEST"):
            try:
                # Import needed for database access, but avoid circular imports
                import sqlite3
                from pathlib import Path
                
                # Determine database path based on DATABASE_URL
                db_url = os.getenv("DATABASE_URL", "sqlite:///./test.db")
                if db_url.startswith("sqlite:///"):
                    db_path = db_url.replace("sqlite:///", "")
                    
                    # Make sure the DB file exists
                    if Path(db_path).exists():
                        # Connect to the database
                        conn = sqlite3.connect(db_path)
                        cursor = conn.cursor()
                        
                        # Check if config table exists
                        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='config'")
                        if cursor.fetchone():
                            # Get the default model from config
                            cursor.execute("SELECT value FROM config WHERE key = 'default_model'")
                            result = cursor.fetchone()
                            if result:
                                self._default_model = result[0]
                                print(f"Loaded default model from database: {self._default_model}")
                        
                        conn.close()
            except Exception as e:
                print(f"Warning: Failed to load default model from database: {str(e)}")
                print("Using default model from environment variable instead")
        
        # LangChain settings
        self.use_langchain = os.getenv("USE_LANGCHAIN", "true").lower() == "true"
        self.langchain_temperature = float(os.getenv("LANGCHAIN_TEMPERATURE", "0.7"))
        
        # Auth settings
        self.secret_key = os.getenv("SECRET_KEY", "dev_secret_key")
        self.token_expire_minutes = int(os.getenv("TOKEN_EXPIRE_MINUTES", "129600")) # 90 days
        
        # IP Whitelist management
        self.whitelisted_ips_env = os.getenv("WHITELISTED_IPS", "127.0.0.1")
        self.whitelisted_ips = self.whitelisted_ips_env.split(",")
        # Remove empty entries
        self.whitelisted_ips = [ip.strip() for ip in self.whitelisted_ips if ip.strip()]
        
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
                "http://localhost:3000",  # Frontend dev server
                "http://127.0.0.1:3000",  # Alternative frontend address
                "http://localhost:8000",  # Backend dev server
                "http://127.0.0.1:8000",  # Alternative backend address
            ]
        else:  # Testing
            self.allowed_origins = ["*"]  # Allow all origins in test mode
    
    @property
    def default_model(self) -> str:
        """Get the current default model"""
        return self._default_model
        
    @default_model.setter
    def default_model(self, value: str) -> None:
        """Set the default model"""
        self._default_model = value
            
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
    def add_ip_to_whitelist(self, ip: str) -> None:
        """Add an IP address to the whitelist"""
        if ip not in self.whitelisted_ips:
            self.whitelisted_ips.append(ip)
            # Warning: this change is only in memory and won't persist through server restart
            # In a production system, this should update the environment variable or a config file
            if not self.is_testing:
                print(f"Warning: IP {ip} added to whitelist in memory only. Changes won't persist through restart.")
    
    def remove_ip_from_whitelist(self, ip: str) -> None:
        """Remove an IP address from the whitelist"""
        if ip in self.whitelisted_ips:
            self.whitelisted_ips.remove(ip)
            # Warning: this change is only in memory and won't persist through server restart
            # In a production system, this should update the environment variable or a config file
            if not self.is_testing:
                print(f"Warning: IP {ip} removed from whitelist in memory only. Changes won't persist through restart.")
    
    @property
    def queue_manager_class(self) -> str:
        """Get the queue manager class to use"""
        if self.is_testing:
            return "app.queue.mock.manager.MockQueueManager"
        else:
            return "app.queue.rabbitmq.manager.RabbitMQManager"

# Create a global settings instance
settings = Settings()