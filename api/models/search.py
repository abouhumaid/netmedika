from pydantic import BaseModel
from typing import List, Optional

class SearchRequest(BaseModel):
    query: str

class MedicineSuggestion(BaseModel):
    name: str
    generic_name: Optional[str] = None
    description: str
    dosage_forms: List[str]  # ["tablet", "syrup"]
    common_dosages: List[str]  # ["500mg", "650mg"]
    requires_prescription: bool
    typical_use: str
    price_range: Optional[str] = None

class SearchResponse(BaseModel):
    query: str
    corrected_query: Optional[str] = None
    suggestions: List[MedicineSuggestion]
    message: Optional[str] = None