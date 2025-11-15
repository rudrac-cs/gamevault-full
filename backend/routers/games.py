from typing import List
from fastapi import APIRouter, HTTPException, Query

from providers.igdb import search_games, get_game_details
from schemas import GameSummary, GameDetails

router = APIRouter(prefix="/games", tags=["games"])


@router.get("", response_model=List[GameSummary])
def list_games(
    query: str = Query("", description="Search text for game names"),
    page: int = Query(1, ge=1, description="1-based page number"),
    page_size: int = Query(24, ge=1, le=50, description="Results per page (max 50)"),
):
    """
    Search games by name via IGDB and return normalized summaries.
    """
    offset = (page - 1) * page_size
    rows = search_games(query.strip(), limit=page_size, offset=offset)
    return rows


@router.get("/{game_id}", response_model=GameDetails)
def game_details(game_id: int):
    """
    Get full details for a single game id.
    """
    data = get_game_details(game_id)
    if not data:
        raise HTTPException(status_code=404, detail="Game not found")
    return data
