import json
import os
import unicodedata
from functools import lru_cache
from typing import Any, Dict, List, Optional

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from nba_api.stats.endpoints import playercareerstats, commonplayerinfo
from nba_api.stats.static import players as nba_players
from pydantic import BaseModel

CACHE_DIR = os.path.join(os.path.dirname(__file__), "cache")
PLAYERS_CACHE = os.path.join(CACHE_DIR, "players.json")

os.makedirs(CACHE_DIR, exist_ok=True)

app = FastAPI(title="CourtVision Analytics API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["GET", "OPTIONS"],
    allow_headers=["*"],
)


class PlayerInfo(BaseModel):
    id: int
    full_name: str
    team_id: Optional[int]
    team_name: Optional[str]
    position: Optional[str]
    height: Optional[str]
    weight: Optional[str]
    birthdate: Optional[str]
    country: Optional[str]
    draft_year: Optional[str]


def load_players_cache() -> List[Dict[str, Any]]:
    if os.path.exists(PLAYERS_CACHE):
        with open(PLAYERS_CACHE, "r", encoding="utf-8") as f:
            return json.load(f)

    players = nba_players.get_players()
    with open(PLAYERS_CACHE, "w", encoding="utf-8") as f:
        json.dump(players, f, indent=2)
    return players


def write_json(path: str, data: Any) -> None:
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)


def read_json(path: str) -> Any:
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def cache_response(path: str, fetcher):
    if os.path.exists(path):
        return read_json(path)

    result = fetcher()
    write_json(path, result)
    return result


@lru_cache(maxsize=1)
def get_player_list() -> List[Dict[str, Any]]:
    return load_players_cache()


def find_player(player_id: int) -> Dict[str, Any]:
    for player in get_player_list():
        if player.get("id") == player_id:
            return player
    raise HTTPException(status_code=404, detail="Player not found")


def normalize_text(value: Optional[str]) -> str:
    if not value:
        return ""
    normalized = unicodedata.normalize("NFKD", value)
    return "".join(ch for ch in normalized if not unicodedata.combining(ch)).lower()


def search_rank(player_name: str, query: str) -> int:
    name = normalize_text(player_name)
    words = name.split()
    if name == query:
        return 0
    if name.startswith(query):
        return 1
    if any(word.startswith(query) for word in words):
        return 2
    if query in name:
        return 3
    return 4


def resolve_team_name(player: Dict[str, Any]) -> Optional[str]:
    return player.get("team_name") or player.get("team_abbreviation")


def parse_player_info(player_id: int) -> PlayerInfo:
    cache_path = os.path.join(CACHE_DIR, f"player_info_{player_id}.json")

    def fetch():
        details = commonplayerinfo.CommonPlayerInfo(player_id=player_id).get_normalized_dict()
        info = details["CommonPlayerInfo"][0]
        return {
            "id": player_id,
            "full_name": info.get("DISPLAY_FIRST_LAST"),
            "team_id": info.get("TEAM_ID"),
            "team_name": info.get("TEAM_NAME"),
            "position": info.get("POSITION"),
            "height": info.get("HEIGHT"),
            "weight": info.get("WEIGHT"),
            "birthdate": info.get("BIRTHDATE"),
            "country": info.get("COUNTRY"),
            "draft_year": info.get("DRAFT_YEAR"),
        }

    info_data = cache_response(cache_path, fetch)
    return PlayerInfo(**info_data)


def normalize_stat(value: Any) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return 0.0


def build_season_stats(player_id: int) -> Dict[str, Any]:
    cache_path = os.path.join(CACHE_DIR, f"stats_{player_id}.json")

    def fetch():
        career = playercareerstats.PlayerCareerStats(player_id=player_id)
        data = career.get_data_frames()[0]
        seasons = []
        for _, row in data.iterrows():
            seasons.append(
                {
                    "season": row["SEASON_ID"],
                    "team": row["TEAM_ABBREVIATION"],
                    "games_played": int(row["GP"] or 0),
                    "ppg": normalize_stat(row["PTS"] / row["GP"] if row["GP"] else 0),
                    "rpg": normalize_stat(row["REB"] / row["GP"] if row["GP"] else 0),
                    "apg": normalize_stat(row["AST"] / row["GP"] if row["GP"] else 0),
                    "fg_pct": normalize_stat(row["FG_PCT"] * 100),
                    "fg3_pct": normalize_stat(row["FG3_PCT"] * 100),
                    "ft_pct": normalize_stat(row["FT_PCT"] * 100),
                    "stl": normalize_stat(row["STL"] / row["GP"] if row["GP"] else 0),
                    "blk": normalize_stat(row["BLK"] / row["GP"] if row["GP"] else 0),
                    "tov": normalize_stat(row["TOV"] / row["GP"] if row["GP"] else 0),
                    "minutes": normalize_stat(row["MIN"] / row["GP"] if row["GP"] else 0),
                    "fgm": normalize_stat(row["FGM"] / row["GP"] if row["GP"] else 0),
                    "fga": normalize_stat(row["FGA"] / row["GP"] if row["GP"] else 0),
                    "fg3m": normalize_stat(row["FG3M"] / row["GP"] if row["GP"] else 0),
                    "fg3a": normalize_stat(row["FG3A"] / row["GP"] if row["GP"] else 0),
                }
            )
        return {
            "player_id": player_id,
            "seasons": seasons,
            "latest_season": seasons[-1] if seasons else {},
        }

    return cache_response(cache_path, fetch)


@app.get("/players/search")
def search_players(name: str = Query(..., min_length=1, description="Search by player name")):
    query_norm = normalize_text(name.strip())
    results = []
    for player in get_player_list():
        rank = search_rank(player["full_name"], query_norm)
        if rank == 4:
            continue

        results.append(
            {
                "id": player["id"],
                "full_name": player["full_name"],
                "team_id": player.get("team_id"),
                "team_name": resolve_team_name(player),
                "position": player.get("position"),
                "is_active": player.get("is_active", False),
                "rank": rank,
            }
        )
    if not results:
        raise HTTPException(status_code=404, detail="No players found")
    results.sort(key=lambda player: (player["rank"], not player["is_active"], player["full_name"]))
    return {"results": [{key: value for key, value in player.items() if key != "rank"} for player in results[:25]]}


@app.get("/players/{player_id}/stats")
def player_stats(player_id: int):
    find_player(player_id)
    try:
        info = parse_player_info(player_id)
        stats = build_season_stats(player_id)
        return {"player": info.dict(), "stats": stats}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@app.get("/players/compare")
def compare_players(player1: int = Query(...), player2: int = Query(...)):
    if player1 == player2:
        raise HTTPException(status_code=400, detail="Choose two different players")
    stats1 = player_stats(player1)
    stats2 = player_stats(player2)
    categories = ["ppg", "rpg", "apg", "fg_pct", "fg3_pct", "ft_pct", "stl", "blk", "tov"]
    comparison = []
    for category in categories:
        comparison.append(
            {
                "category": category,
                "player1": stats1["stats"]["latest_season"].get(category, 0),
                "player2": stats2["stats"]["latest_season"].get(category, 0),
                "leader": "player1" if stats1["stats"]["latest_season"].get(category, 0) >= stats2["stats"]["latest_season"].get(category, 0) else "player2",
            }
        )
    return {
        "player1": stats1["player"],
        "player2": stats2["player"],
        "comparison": comparison,
    }


def similarity_score(stats_a: Dict[str, Any], stats_b: Dict[str, Any]) -> float:
    keys = ["ppg", "rpg", "apg", "stl", "blk", "fg_pct", "fg3_pct", "ft_pct"]
    total = 0.0
    for key in keys:
        diff = abs(stats_a.get(key, 0) - stats_b.get(key, 0))
        total += diff
    return round(100 - total, 2)


@app.get("/players/{player_id}/similar")
def similar_players(player_id: int):
    find_player(player_id)
    base_stats = build_season_stats(player_id)["latest_season"]
    if not base_stats:
        raise HTTPException(status_code=404, detail="Player has no season stats")

    candidates = []
    active_players = [player for player in get_player_list() if player.get("is_active")]
    for player in active_players:
        pid = player["id"]
        if pid == player_id:
            continue
        try:
            other_stats = build_season_stats(pid)["latest_season"]
            if not other_stats:
                continue
            score = similarity_score(base_stats, other_stats)
            team_name = resolve_team_name(player)
            try:
                player_info = parse_player_info(pid)
                team_name = player_info.team_name or team_name
            except Exception:
                pass

            candidates.append(
                {
                    "id": pid,
                    "full_name": player["full_name"],
                    "team_name": team_name,
                    "score": score,
                }
            )
        except Exception:
            continue

    candidates.sort(key=lambda item: item["score"], reverse=True)
    return {"player_id": player_id, "similar": candidates[:5]}


@app.get("/")
def root():
    return {"message": "CourtVision Analytics backend is running"}
