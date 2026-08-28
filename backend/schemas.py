from pydantic import BaseModel
from typing import Any, Optional

class EventPayload(BaseModel):
    agent: str # "baseline" or "structured"
    type: str # "token", "error", "complete"
    data: Any
