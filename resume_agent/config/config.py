import os 
from typing import Any
from pydantic import Field, BaseModel
from pathlib import Path
from dotenv import load_dotenv

load_dotenv() # Load from .env if present

class ModelConfig(BaseModel):
    name: str = "nvidia/nemotron-3-super-120b-a12b:free"
    temperature: float = Field(default=1.0, ge=0.0, le=2.0)
    context_window: int = 256000


class Config(BaseModel):
    model: ModelConfig = Field(default_factory=ModelConfig)
    cwd: Path = Field(default_factory=Path.cwd)

    @property
    def api_key(self) -> str | None:
        return os.environ.get("API_KEY")
    
    @property
    def base_url(self) -> str | None: 
        return os.environ.get("BASE_URL")

    @property
    def model_name(self) -> str: 
        return self.model.name

    @model_name.setter
    def model_name(self, value: str) -> None: 
        self.model.name = value

    @property
    def temperature(self) -> float:
        return self.model.temperature

    @temperature.setter
    def temperature(self, value: float) -> None:
        self.model.temperature = value

    def validate(self) -> list[str]:
        errors: list[str] = []
        if not self.api_key:
            errors.append("No API key found in the environment variable 'API_KEY'")
        if not self.cwd.exists():
            errors.append(f"Working directory does not exist: {self.cwd}")
        return errors
    
    def to_dict(self) -> dict[str , Any]:
        return self.model_dump(mode="json")