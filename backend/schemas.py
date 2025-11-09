from typing import List, Optional
from pydantic import BaseModel


class GameSummary(BaseModel):
    id: int
    title: str
    year: Optional[int] = None
    genres: List[str] = []
    image: Optional[str] = None  # cover URL


class GameDetails(GameSummary):
    description: Optional[str] = None
    screenshots: List[str] = []
    rating: Optional[float] = None
    platforms: List[str] = []
    purchase_links: List["PurchaseLink"] = []


class PurchaseLink(BaseModel):
    store: str
    url: str
