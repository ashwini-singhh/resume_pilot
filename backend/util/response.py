from typing import Any, Optional, Dict
from pydantic import BaseModel

class AppResponse(BaseModel):
    success: bool
    data: Optional[Any] = None
    error: Optional[str] = None
    code: int = 200
    metadata: Optional[Dict[str, Any]] = None

    @classmethod
    def ok(cls, data: Any = None, metadata: Optional[Dict] = None):
        return cls(success=True, data=data, metadata=metadata, code=200)

    @classmethod
    def fail(cls, message: str, code: int = 400, metadata: Optional[Dict] = None):
        return cls(success=False, error=message, code=code, metadata=metadata)

class LLMError(Exception):
    """Custom exception for LLM related failures."""
    def __init__(self, message: str, code: int = 500, details: Optional[Dict] = None):
        self.message = message
        self.code = code
        self.details = details
        super().__init__(self.message)
