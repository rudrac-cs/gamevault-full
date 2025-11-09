import logging
import os
from pathlib import Path
from typing import Any, Iterable, List, Optional

import requests
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

# load backend/.env regardless of working dir
BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / ".env")

logger = logging.getLogger(__name__)

ALLOW_ORIGINS = os.getenv(
    "ALLOW_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173"
)


def _normalize_origins(values: Iterable[str]) -> List[str]:
    """
    Ensure localhost-based origins accept both hostname and loopback IP to
    avoid CORS failures when dev servers switch between the two.
    """
    cleaned = [v.strip() for v in values if v and v.strip()]
    if not cleaned:
        return []
    if "*" in cleaned:
        return ["*"]

    expanded = set(cleaned)
    for origin in list(expanded):
        if "localhost" in origin:
            expanded.add(origin.replace("localhost", "127.0.0.1", 1))
        if "127.0.0.1" in origin:
            expanded.add(origin.replace("127.0.0.1", "localhost", 1))
    return list(expanded)


origins = _normalize_origins(ALLOW_ORIGINS.split(","))

app = FastAPI(title="GameVault API", version="0.1.0")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# health check
@app.get("/health")
def health():
    return {"ok": True}

# --- Featured games endpoint ---
def _cover_url(image_id: Optional[str]) -> Optional[str]:
    if not image_id:
        return None
    return f"https://images.igdb.com/igdb/image/upload/t_cover_big/{image_id}.jpg"


def _fetch_featured_from_igdb() -> List[dict]:
    client_id = os.getenv("TWITCH_CLIENT_ID") or os.getenv("IGDB_CLIENT_ID")
    token = os.getenv("TWITCH_APP_ACCESS_TOKEN") or os.getenv("IGDB_ACCESS_TOKEN")
    if not client_id or not token:
        raise RuntimeError(
            "Missing IGDB/Twitch credentials (set TWITCH_CLIENT_ID and TWITCH_APP_ACCESS_TOKEN)."
        )

    body = """
fields id,name,summary,first_release_date,cover.image_id,rating,genres.name,
       platforms.abbreviation,aggregated_rating;
sort popularity desc;
where rating != null & first_release_date != null;
limit 20;
"""
    resp = requests.post(
        "https://api.igdb.com/v4/games",
        headers={"Client-ID": client_id, "Authorization": f"Bearer {token}"},
        data=body,
        timeout=20,
    )
    if resp.status_code in (401, 403):
        raise HTTPException(
            status_code=502,
            detail="Unauthorized from IGDB (token may be expired).",
        )
    if not resp.ok:
        raise HTTPException(
            status_code=502,
            detail=f"IGDB error {resp.status_code}: {resp.text[:200]}",
        )
    data = resp.json()
    out: List[dict] = []
    for item in data:
        genres = [
            g["name"]
            for g in (item.get("genres") or [])
            if isinstance(g, dict) and "name" in g
        ]
        platforms = [
            p.get("abbreviation") or p.get("name")
            for p in (item.get("platforms") or [])
            if isinstance(p, dict)
        ]
        out.append(
            {
                "id": item.get("id"),
                "name": item.get("name"),
                "summary": item.get("summary"),
                "releaseDate": item.get("first_release_date"),
                "rating": item.get("rating"),
                "aggRating": item.get("aggregated_rating"),
                "genres": genres,
                "platforms": platforms,
                "cover": _cover_url((item.get("cover") or {}).get("image_id")),
            }
        )
    return out


def _featured_fallback() -> List[dict]:
    try:
        from providers import igdb as igdb_provider  # noqa: WPS433
    except Exception:
        return []
    data = getattr(igdb_provider, "MOCK_GAMES", [])
    fallback = []
    for item in data:
        fallback.append(
            {
                "id": item.get("id"),
                "name": item.get("title"),
                "summary": item.get("description"),
                "releaseDate": item.get("year"),
                "rating": item.get("rating"),
                "aggRating": item.get("rating"),
                "genres": item.get("genres", []),
                "platforms": item.get("platforms", []),
                "cover": item.get("image"),
            }
        )
    return fallback


@app.get("/api/games/featured")
def get_featured_games() -> List[Any]:
    try:
        return _fetch_featured_from_igdb()
    except HTTPException:
        # bubble explicit HTTP errors (auth/remote)
        raise
    except Exception as exc:  # pragma: no cover - network failure path
        logger.warning("IGDB featured fetch failed: %s", exc)
        fallback = _featured_fallback()
        if fallback:
            return fallback
        raise HTTPException(status_code=502, detail="Unable to fetch featured games.")


# routes
from routers.games import router as games_router  # noqa: E402
app.include_router(games_router, prefix="/api")
