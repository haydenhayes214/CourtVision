import json
import os
import unicodedata
from functools import lru_cache
from pathlib import Path
from typing import Any, Callable, Dict, List, Optional

import requests
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from nba_api.stats.endpoints import playercareerstats, commonplayerinfo, leaguedashplayerstats
from nba_api.stats.static import players as nba_players
from pydantic import BaseModel

try:
    from .cache_store import build_cache_store
except ImportError:
    from cache_store import build_cache_store

CACHE_DIR = os.path.join(os.path.dirname(__file__), "cache")
ALLOW_LIVE_NBA_FETCH = os.getenv("COURTVISION_ALLOW_LIVE_NBA_FETCH", "true").lower() == "true"
NBA_API_TIMEOUT = int(os.getenv("COURTVISION_NBA_API_TIMEOUT_SECONDS", "150"))
NBA_SEASON = os.getenv("COURTVISION_NBA_SEASON", "2025-26")
ESPN_STATS_URL = os.getenv(
    "COURTVISION_ESPN_STATS_URL",
    "https://site.web.api.espn.com/apis/common/v3/sports/basketball/nba/statistics/byathlete",
)
ESPN_TEAM_IDS = {
    "ATL": "1",
    "BOS": "2",
    "BKN": "17",
    "CHA": "30",
    "CHI": "4",
    "CLE": "5",
    "DAL": "6",
    "DEN": "7",
    "DET": "8",
    "GSW": "9",
    "HOU": "10",
    "IND": "11",
    "LAC": "12",
    "LAL": "13",
    "MEM": "29",
    "MIA": "14",
    "MIL": "15",
    "MIN": "16",
    "NO": "3",
    "NY": "18",
    "OKC": "25",
    "ORL": "19",
    "PHI": "20",
    "PHX": "21",
    "POR": "22",
    "SA": "24",
    "SAC": "23",
    "TOR": "28",
    "UTA": "26",
    "WSH": "27",
}

os.makedirs(CACHE_DIR, exist_ok=True)
cache_store = build_cache_store(CACHE_DIR)

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


def seed_cache_path(key: str) -> Path:
    return Path(CACHE_DIR) / f"{key}.json"


def read_seed_cache(key: str) -> Optional[Any]:
    path = seed_cache_path(key)
    if not path.exists():
        return None

    with path.open("r", encoding="utf-8") as file:
        return json.load(file)


def get_cached_or_seeded(key: str) -> Optional[Any]:
    cached_value = cache_store.get(key)
    if cached_value is not None:
        return cached_value

    seeded_value = read_seed_cache(key)
    if seeded_value is not None:
        cache_store.set(key, seeded_value)
        return seeded_value

    return None


def seeded_stat_player_ids() -> List[int]:
    return sorted(
        int(path.stem.replace("stats_", ""))
        for path in Path(CACHE_DIR).glob("stats_*.json")
        if path.stem.replace("stats_", "").isdigit()
    )


def load_players_cache() -> List[Dict[str, Any]]:
    cached_players = get_cached_or_seeded("players")
    if cached_players is not None:
        return cached_players

    players = nba_players.get_players()
    cache_store.set("players", players)
    return players


def cache_response(key: str, fetcher: Callable[[], Any]) -> Any:
    cached_value = get_cached_or_seeded(key)
    if cached_value is not None:
        return cached_value

    if not ALLOW_LIVE_NBA_FETCH:
        raise HTTPException(status_code=404, detail="Stats for this player are not cached in the demo dataset yet")

    result = fetcher()
    cache_store.set(key, result)
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


def normalize_player_key(value: Optional[str]) -> str:
    return " ".join(normalize_text(value).replace(".", "").replace("-", " ").split())


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


def cached_player_info(player_id: int) -> Optional[Dict[str, Any]]:
    value = get_cached_or_seeded(f"player_info_{player_id}")
    return value if isinstance(value, dict) else None


def team_from_seeded_stats(player_id: int) -> Optional[str]:
    stats = get_cached_or_seeded(f"stats_{player_id}")
    if not isinstance(stats, dict):
        return None

    latest_season = stats.get("latest_season") or {}
    return latest_season.get("team")


def read_stat_value(stats: Dict[str, Any], aliases: List[str]) -> float:
    for alias in aliases:
        if alias in stats:
            value = normalize_stat(stats[alias])
            if "pct" in alias.lower() and value <= 1:
                return value * 100
            return value
    return 0.0


def flatten_espn_stats(item: Dict[str, Any]) -> Dict[str, Any]:
    flattened = {}
    containers = []
    for key in ("categories", "statistics", "stats"):
        value = item.get(key)
        if isinstance(value, list):
            containers.extend(value)

    for container in containers:
        if not isinstance(container, dict):
            continue
        stats = container.get("stats") or container.get("statistics") or []
        for stat in stats:
            if not isinstance(stat, dict):
                continue
            name = stat.get("name") or stat.get("shortName") or stat.get("abbreviation")
            if not name:
                continue
            flattened[name] = stat.get("value", stat.get("displayValue", 0))
    return flattened


def espn_team_name(athlete: Dict[str, Any], item: Dict[str, Any]) -> Optional[str]:
    team = athlete.get("team") or item.get("team") or {}
    if isinstance(team, dict):
        return (
            team.get("abbreviation")
            or team.get("shortDisplayName")
            or team.get("displayName")
            or team.get("name")
        )
    return item.get("teamShortName") or item.get("teamAbbreviation")


def get_espn_current_stats_index() -> Dict[str, Any]:
    def fetch():
        players_by_name = {}
        players_by_id = {}
        headers = {
            "User-Agent": "CourtVision Analytics/1.0",
            "Accept": "application/json",
        }

        for page in range(1, 12):
            response = requests.get(
                ESPN_STATS_URL,
                params={
                    "region": "us",
                    "lang": "en",
                    "contentorigin": "espn",
                    "isqualified": "false",
                    "limit": 100,
                    "page": page,
                    "sort": "offensive.avgPoints:desc",
                },
                headers=headers,
                timeout=25,
            )
            response.raise_for_status()
            data = response.json()
            athletes = data.get("athletes") or data.get("items") or []
            if not athletes:
                break

            for item in athletes:
                athlete = item.get("athlete") or item
                if not isinstance(athlete, dict):
                    continue

                name = athlete.get("displayName") or athlete.get("fullName") or athlete.get("name")
                if not name:
                    continue

                raw_stats = flatten_espn_stats(item)
                latest_season = {
                    "season": NBA_SEASON,
                    "team": espn_team_name(athlete, item),
                    "games_played": int(read_stat_value(raw_stats, ["gamesPlayed", "GP", "games"])),
                    "ppg": read_stat_value(raw_stats, ["avgPoints", "pointsPerGame", "PTS", "points"]),
                    "rpg": read_stat_value(raw_stats, ["avgRebounds", "reboundsPerGame", "REB", "rebounds"]),
                    "apg": read_stat_value(raw_stats, ["avgAssists", "assistsPerGame", "AST", "assists"]),
                    "fg_pct": read_stat_value(raw_stats, ["fieldGoalPct", "fieldGoalPercentage", "FG_PCT"]),
                    "fg3_pct": read_stat_value(raw_stats, ["threePointFieldGoalPct", "threePointPercentage", "FG3_PCT"]),
                    "ft_pct": read_stat_value(raw_stats, ["freeThrowPct", "freeThrowPercentage", "FT_PCT"]),
                    "stl": read_stat_value(raw_stats, ["avgSteals", "stealsPerGame", "STL", "steals"]),
                    "blk": read_stat_value(raw_stats, ["avgBlocks", "blocksPerGame", "BLK", "blocks"]),
                    "tov": read_stat_value(raw_stats, ["avgTurnovers", "turnoversPerGame", "TOV", "turnovers"]),
                    "minutes": read_stat_value(raw_stats, ["avgMinutes", "minutesPerGame", "MIN", "minutes"]),
                    "fgm": read_stat_value(raw_stats, ["avgFieldGoalsMade", "fieldGoalsMade", "FGM"]),
                    "fga": read_stat_value(raw_stats, ["avgFieldGoalsAttempted", "fieldGoalsAttempted", "FGA"]),
                    "fg3m": read_stat_value(raw_stats, ["avgThreePointFieldGoalsMade", "threePointFieldGoalsMade", "FG3M"]),
                    "fg3a": read_stat_value(raw_stats, ["avgThreePointFieldGoalsAttempted", "threePointFieldGoalsAttempted", "FG3A"]),
                }
                record = {
                    "espn_id": athlete.get("id"),
                    "full_name": name,
                    "team_name": latest_season["team"],
                    "position": (athlete.get("position") or {}).get("displayName")
                    if isinstance(athlete.get("position"), dict)
                    else athlete.get("position"),
                    "stats": {
                        "player_id": athlete.get("id"),
                        "seasons": [latest_season],
                        "latest_season": latest_season,
                    },
                }
                players_by_name[normalize_player_key(name)] = record
                if athlete.get("id") is not None:
                    players_by_id[str(athlete["id"])] = record

            if len(athletes) < 100:
                break

        return {"players_by_name": players_by_name, "players_by_id": players_by_id}

    return cache_response("espn_current_stats_index", fetch)


def collect_espn_roster_athletes(value: Any) -> List[Dict[str, Any]]:
    athletes = []
    if isinstance(value, list):
        for item in value:
            athletes.extend(collect_espn_roster_athletes(item))
    elif isinstance(value, dict):
        if value.get("displayName") and (value.get("id") or value.get("uid")):
            athletes.append(value)
        for key in ("athletes", "items", "roster", "children"):
            if key in value:
                athletes.extend(collect_espn_roster_athletes(value[key]))
    return athletes


def get_espn_roster_index() -> Dict[str, Any]:
    def fetch():
        players_by_name = {}
        headers = {
            "User-Agent": "CourtVision Analytics/1.0",
            "Accept": "application/json",
        }
        for abbreviation, team_id in ESPN_TEAM_IDS.items():
            response = requests.get(
                f"https://site.api.espn.com/apis/site/v2/sports/basketball/nba/teams/{team_id}/roster",
                headers=headers,
                timeout=20,
            )
            response.raise_for_status()
            for athlete in collect_espn_roster_athletes(response.json()):
                name = athlete.get("displayName") or athlete.get("fullName") or athlete.get("name")
                if not name:
                    continue
                position = athlete.get("position")
                if isinstance(position, dict):
                    position = position.get("displayName") or position.get("abbreviation")
                players_by_name[normalize_player_key(name)] = {
                    "espn_id": athlete.get("id"),
                    "full_name": name,
                    "team_name": abbreviation,
                    "position": position,
                }
        return {"players_by_name": players_by_name}

    return cache_response("espn_roster_index", fetch)


def espn_player_for_nba_player(player_id: int) -> Optional[Dict[str, Any]]:
    player = find_player(player_id)
    player_key = normalize_player_key(player.get("full_name"))
    try:
        stats_player = get_espn_current_stats_index().get("players_by_name", {}).get(player_key)
        if stats_player:
            return stats_player

        roster_player = get_espn_roster_index().get("players_by_name", {}).get(player_key)
    except Exception:
        return None
    return roster_player


def parse_player_info(player_id: int) -> PlayerInfo:
    cache_key = f"player_info_{player_id}"

    def fetch():
        details = commonplayerinfo.CommonPlayerInfo(player_id=player_id, timeout=NBA_API_TIMEOUT).get_normalized_dict()
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

    info_data = cache_response(cache_key, fetch)
    return PlayerInfo(**info_data)


def normalize_stat(value: Any) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return 0.0


def get_current_league_stats() -> Dict[int, Dict[str, Any]]:
    def fetch():
        league_stats = leaguedashplayerstats.LeagueDashPlayerStats(
            season=NBA_SEASON,
            per_mode_detailed="PerGame",
            timeout=NBA_API_TIMEOUT,
        )
        data = league_stats.get_data_frames()[0]
        stats_by_player = {}
        for _, row in data.iterrows():
            player_id = int(row["PLAYER_ID"])
            stats_by_player[str(player_id)] = {
                "season": NBA_SEASON,
                "team": row.get("TEAM_ABBREVIATION"),
                "games_played": int(row.get("GP") or 0),
                "ppg": normalize_stat(row.get("PTS")),
                "rpg": normalize_stat(row.get("REB")),
                "apg": normalize_stat(row.get("AST")),
                "fg_pct": normalize_stat(row.get("FG_PCT") * 100),
                "fg3_pct": normalize_stat(row.get("FG3_PCT") * 100),
                "ft_pct": normalize_stat(row.get("FT_PCT") * 100),
                "stl": normalize_stat(row.get("STL")),
                "blk": normalize_stat(row.get("BLK")),
                "tov": normalize_stat(row.get("TOV")),
                "minutes": normalize_stat(row.get("MIN")),
                "fgm": normalize_stat(row.get("FGM")),
                "fga": normalize_stat(row.get("FGA")),
                "fg3m": normalize_stat(row.get("FG3M")),
                "fg3a": normalize_stat(row.get("FG3A")),
            }
        return stats_by_player

    return cache_response("league_current_stats", fetch)


def build_current_season_stats(player_id: int) -> Dict[str, Any]:
    espn_player = espn_player_for_nba_player(player_id)
    if espn_player and "stats" in espn_player:
        stats = espn_player["stats"]
        stats["player_id"] = player_id
        return stats

    if not ALLOW_LIVE_NBA_FETCH:
        league_stats = get_current_league_stats()
        latest_season = league_stats.get(str(player_id))
        if not latest_season:
            raise HTTPException(status_code=404, detail="Current season stats not found for this player")

        return {
            "player_id": player_id,
            "seasons": [latest_season],
            "latest_season": latest_season,
        }

    raise HTTPException(status_code=404, detail="Current season stats not found for this player")


def build_season_stats(player_id: int) -> Dict[str, Any]:
    cache_key = f"stats_{player_id}"
    cached_value = get_cached_or_seeded(cache_key)
    if cached_value is not None:
        return cached_value

    try:
        espn_stats = build_current_season_stats(player_id)
        cache_store.set(cache_key, espn_stats)
        return espn_stats
    except Exception:
        pass

    def fetch():
        career = playercareerstats.PlayerCareerStats(player_id=player_id, timeout=NBA_API_TIMEOUT)
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

    try:
        result = fetch()
    except Exception:
        result = build_current_season_stats(player_id)

    cache_store.set(cache_key, result)
    return result


@app.get("/players/search")
def search_players(name: str = Query(..., min_length=1, description="Search by player name")):
    query_norm = normalize_text(name.strip())
    results = []
    allowed_player_ids = set(seeded_stat_player_ids()) if not ALLOW_LIVE_NBA_FETCH else None
    espn_roster_by_name = {}
    if ALLOW_LIVE_NBA_FETCH:
        try:
            espn_roster_by_name = get_espn_roster_index().get("players_by_name", {})
        except Exception:
            espn_roster_by_name = {}

    for player in get_player_list():
        if ALLOW_LIVE_NBA_FETCH and not player.get("is_active"):
            continue
        if allowed_player_ids is not None and player["id"] not in allowed_player_ids:
            continue

        rank = search_rank(player["full_name"], query_norm)
        if rank == 4:
            continue

        info = cached_player_info(player["id"]) or {}
        roster_player = espn_roster_by_name.get(normalize_player_key(player["full_name"])) or {}
        results.append(
            {
                "id": player["id"],
                "full_name": player["full_name"],
                "team_id": player.get("team_id"),
                "team_name": roster_player.get("team_name")
                or info.get("team_name")
                or resolve_team_name(player)
                or team_from_seeded_stats(player["id"]),
                "position": roster_player.get("position")
                or info.get("position")
                or player.get("position"),
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
    except HTTPException:
        raise
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
        player1_value = stats1["stats"]["latest_season"].get(category, 0)
        player2_value = stats2["stats"]["latest_season"].get(category, 0)
        leader = "player1" if player1_value >= player2_value else "player2"
        if category == "tov":
            leader = "player1" if player1_value <= player2_value else "player2"
        comparison.append(
            {
                "category": category,
                "player1": player1_value,
                "player2": player2_value,
                "leader": leader,
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
    seeded_ids = set(seeded_stat_player_ids())
    active_players = [player for player in get_player_list() if player.get("id") in seeded_ids]
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
            team_name = team_name or team_from_seeded_stats(pid)

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


@app.get("/health")
def health():
    return {"status": "ok"}
