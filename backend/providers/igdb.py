import logging
import os
import time
from typing import Dict, List, Optional

import requests
from cachetools import TTLCache

# ---- Env ----
TWITCH_CLIENT_ID = os.getenv("TWITCH_CLIENT_ID")
TWITCH_CLIENT_SECRET = os.getenv("TWITCH_CLIENT_SECRET")
IGDB_CLIENT_ID = os.getenv("IGDB_CLIENT_ID")
IGDB_CLIENT_SECRET = os.getenv("IGDB_CLIENT_SECRET")
STATIC_ACCESS_TOKEN = os.getenv("TWITCH_APP_ACCESS_TOKEN") or os.getenv(
    "IGDB_ACCESS_TOKEN"
)
CLIENT_ID = TWITCH_CLIENT_ID or IGDB_CLIENT_ID
CLIENT_SECRET = TWITCH_CLIENT_SECRET or IGDB_CLIENT_SECRET
logger = logging.getLogger(__name__)

# ---- Caches ----
# token cached until expiry; queries cached briefly to reduce rate/latency
_token_cache: Dict[str, Dict[str, str]] = {}
query_cache = TTLCache(maxsize=256, ttl=120)  # 2 minutes

# ---- Local fallback data (used when IGDB is unavailable) ----
MOCK_GAMES = [
    {
        "id": 1,
        "title": "Elden Ring",
        "year": 2022,
        "genres": ["Action", "RPG"],
        "image": "https://images.igdb.com/igdb/image/upload/t_cover_big/co4jni.jpg",
        "description": "A vast, dark fantasy world created by FromSoftware.",
        "screenshots": [
            "https://images.igdb.com/igdb/image/upload/t_screenshot_huge/sc8ohp.jpg"
        ],
        "rating": 4.9,
        "platforms": ["PC", "PlayStation 5", "Xbox Series X"],
        "purchase_links": [
            {"store": "Steam", "url": "https://store.steampowered.com/app/1245620"},
            {"store": "PlayStation Store", "url": "https://store.playstation.com/en-us/concept/10000333"},
        ],
    },
    {
        "id": 2,
        "title": "Star Odyssey",
        "year": 2023,
        "genres": ["Adventure", "Sci-Fi"],
        "image": "https://images.igdb.com/igdb/image/upload/t_cover_big/co2f3n.jpg",
        "description": "Chart a course across the stars in this narrative-driven space epic.",
        "screenshots": [
            "https://images.igdb.com/igdb/image/upload/t_screenshot_huge/scf1h8.jpg"
        ],
        "rating": 4.3,
        "platforms": ["PC", "Xbox Series X"],
        "purchase_links": [
            {"store": "Xbox Store", "url": "https://www.xbox.com/en-US/games"},
            {"store": "Steam", "url": "https://store.steampowered.com/"},
        ],
    },
    {
        "id": 3,
        "title": "Mystic Valley",
        "year": 2020,
        "genres": ["Puzzle", "Indie"],
        "image": "https://images.igdb.com/igdb/image/upload/t_cover_big/co1xyz.jpg",
        "description": "Unravel ancient riddles and restore magic to the valley.",
        "screenshots": [],
        "rating": 4.0,
        "platforms": ["PC", "Nintendo Switch"],
        "purchase_links": [
            {"store": "Nintendo eShop", "url": "https://www.nintendo.com/store/"},
        ],
    },
]


def _mock_search(query: str, limit: int, offset: int) -> List[dict]:
    data = MOCK_GAMES
    if query:
        q = query.lower()
        data = [g for g in data if q in g["title"].lower()]
    slice_ = data[offset : offset + limit]
    return [
        {
            "id": g["id"],
            "title": g["title"],
            "year": g.get("year"),
            "genres": g.get("genres", []),
            "image": g.get("image"),
        }
        for g in slice_
    ]


def _mock_detail(game_id: int) -> Optional[dict]:
    for game in MOCK_GAMES:
        if int(game["id"]) == int(game_id):
            return {
                "id": game["id"],
                "title": game["title"],
                "year": game.get("year"),
                "genres": game.get("genres", []),
                "image": game.get("image"),
                "description": game.get("description"),
                "screenshots": game.get("screenshots", []),
                "rating": game.get("rating"),
                "platforms": game.get("platforms", []),
                "purchase_links": game.get(
                    "purchase_links",
                    [
                        {"store": "Steam", "url": "https://store.steampowered.com/"},
                        {"store": "PlayStation Store", "url": "https://store.playstation.com/"},
                    ],
                ),
            }
    return None


# ---- Auth: Twitch/IGDB App Access Token ----
def _fetch_twitch_token() -> Dict[str, str]:
    if not (CLIENT_ID and CLIENT_SECRET):
        raise RuntimeError("Missing IGDB/Twitch client credentials")
    resp = requests.post(
        "https://id.twitch.tv/oauth2/token",
        params={
            "client_id": CLIENT_ID,
            "client_secret": CLIENT_SECRET,
            "grant_type": "client_credentials",
        },
        timeout=15,
    )
    resp.raise_for_status()
    data = resp.json()
    # store expiry moment (epoch seconds)
    data["expires_at"] = int(time.time()) + int(data.get("expires_in", 0)) - 30
    return data


def get_twitch_token() -> str:
    if STATIC_ACCESS_TOKEN:
        return STATIC_ACCESS_TOKEN
    tok = _token_cache.get("token")
    if not tok or int(time.time()) >= tok["expires_at"]:
        tok = _fetch_twitch_token()
        _token_cache["token"] = tok
    return tok["access_token"]


# ---- Low-level IGDB request helper (APICALYPSE body) ----
def igdb_request(endpoint: str, apicalypse_body: str) -> List[dict]:
    cache_key = f"{endpoint}:{apicalypse_body.strip()}"
    if cache_key in query_cache:
        return query_cache[cache_key]

    if not CLIENT_ID and not STATIC_ACCESS_TOKEN:
        raise RuntimeError("Missing IGDB/Twitch credentials (client id/token).")

    token = get_twitch_token()
    headers = {
        "Client-ID": CLIENT_ID,
        "Authorization": f"Bearer {token}",
    }
    url = f"https://api.igdb.com/v4/{endpoint}"
    resp = requests.post(url, data=apicalypse_body, headers=headers, timeout=20)
    resp.raise_for_status()
    data = resp.json()
    query_cache[cache_key] = data
    return data


# ---- Mapping helpers (normalize to our schemas) ----
def _extract_year(first_release_date: Optional[int]) -> Optional[int]:
    # IGDB returns UNIX seconds; 0 or None means unknown
    if not first_release_date:
        return None
    try:
        import datetime as _dt

        return _dt.datetime.utcfromtimestamp(first_release_date).year
    except Exception:
        return None


def _cover_url(cover_obj: Optional[dict]) -> Optional[str]:
    # cover.image_id → build URL via IGDB image CDN; size "cover_big"
    # https://api-docs.igdb.com/#images
    if not cover_obj or not cover_obj.get("image_id"):
        return None
    image_id = cover_obj["image_id"]
    return f"https://images.igdb.com/igdb/image/upload/t_cover_big/{image_id}.jpg"


def normalize_summary(item: dict) -> dict:
    return {
        "id": item["id"],
        "title": item.get("name", ""),
        "year": _extract_year(item.get("first_release_date")),
        "genres": [g.get("name", "") for g in (item.get("genres") or [])],
        "image": _cover_url(item.get("cover")),
    }


def normalize_details(item: dict) -> dict:
    base = normalize_summary(item)
    base.update(
        {
            "description": (item.get("summary") or "")[:2000],
            "screenshots": [
                f"https://images.igdb.com/igdb/image/upload/t_screenshot_huge/{sc['image_id']}.jpg"
                for sc in (item.get("screenshots") or [])
                if sc.get("image_id")
            ],
            "rating": item.get("aggregated_rating"),
            "platforms": [p.get("name", "") for p in (item.get("platforms") or [])],
            "purchase_links": _purchase_links(item.get("websites")),
        }
    )
    return base


def normalize_featured(item: dict) -> dict:
    return {
        "id": item.get("id"),
        "name": item.get("name"),
        "summary": item.get("summary"),
        "releaseDate": item.get("first_release_date"),
        "rating": item.get("rating"),
        "aggRating": item.get("aggregated_rating"),
        "genres": [
            g.get("name")
            for g in (item.get("genres") or [])
            if isinstance(g, dict) and g.get("name")
        ],
        "platforms": [
            p.get("abbreviation") or p.get("name")
            for p in (item.get("platforms") or [])
            if isinstance(p, dict)
        ],
        "cover": _cover_url(item.get("cover")),
    }


_STORE_HINTS = {
    "steam": "Steam",
    "store.steampowered.com": "Steam",
    "playstation": "PlayStation Store",
    "xbox": "Xbox Store",
    "microsoft": "Microsoft Store",
    "nintendo": "Nintendo eShop",
    "epicgames": "Epic Games Store",
    "gog.com": "GOG",
}


def _purchase_links(websites: Optional[List[dict]]) -> List[dict]:
    if not websites:
        return []
    seen = set()
    links: List[dict] = []
    for site in websites:
        url = (site or {}).get("url") or ""
        if not url:
            continue
        store_name = None
        lower = url.lower()
        for key, label in _STORE_HINTS.items():
            if key in lower:
                store_name = label
                break
        if not store_name:
            if site.get("category") == 1:
                store_name = "Official Site"
            else:
                continue
        if store_name in seen:
            continue
        seen.add(store_name)
        links.append({"store": store_name, "url": url})
    return links


# ---- Public functions used by routers ----
def search_games(query: str, limit: int = 24, offset: int = 0) -> List[dict]:
    limit = max(1, min(limit, 50))
    offset = max(0, offset)
    try:
        if not (CLIENT_ID and (CLIENT_SECRET or STATIC_ACCESS_TOKEN)):
            raise RuntimeError("Missing credentials")
        # Build APICALYPSE request; we include related fields via "fields"
        q = query.replace('"', '\\"').strip()
        where = f'where name ~ *"{q}"*;' if q else ""
        body = f"""
fields id,name,first_release_date,summary,genres.name,cover.image_id;
{where}
sort popularity desc;
limit {max(1, min(limit, 50))};
offset {max(0, offset)};
"""
        rows = igdb_request("games", body)
        return [normalize_summary(r) for r in rows]
    except Exception as exc:
        logger.warning("IGDB search failed (%s). Falling back to mock data.", exc)
        return _mock_search(query, limit, offset)


def get_game_details(game_id: int) -> Optional[dict]:
    try:
        if not (CLIENT_ID and (CLIENT_SECRET or STATIC_ACCESS_TOKEN)):
            raise RuntimeError("Missing credentials")
        body = f"""
fields id,name,first_release_date,summary,genres.name,cover.image_id,
       screenshots.image_id,aggregated_rating,platforms.name,websites.url,websites.category;
where id = {int(game_id)};
limit 1;
"""
        rows = igdb_request("games", body)
        if not rows:
            return None
        return normalize_details(rows[0])
    except Exception as exc:
        logger.warning(
            "IGDB detail fetch failed for id=%s (%s). Using mock data.", game_id, exc
        )
        return _mock_detail(game_id)


def get_featured_games(limit: int = 20) -> List[dict]:
    limit = max(1, min(limit, 50))
    try:
        if not (CLIENT_ID and (CLIENT_SECRET or STATIC_ACCESS_TOKEN)):
            raise RuntimeError("Missing credentials")
        body = f"""
fields id,name,summary,first_release_date,cover.image_id,rating,genres.name,
       platforms.abbreviation,platforms.name,aggregated_rating;
sort popularity desc;
where rating != null & first_release_date != null;
limit {limit};
"""
        rows = igdb_request("games", body)
        return [normalize_featured(row) for row in rows]
    except Exception as exc:
        logger.warning("IGDB featured fetch failed (%s).", exc)
        raise
