const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000'

async function fetchJson(path) {
  const response = await fetch(`${API_BASE}${path}`)
  if (!response.ok) {
    const data = await response.json().catch(() => ({}))
    throw new Error(data.detail || response.statusText)
  }
  return response.json()
}

export async function searchPlayers(name) {
  return fetchJson(`/players/search?name=${encodeURIComponent(name)}`)
}

export async function getPlayerStats(playerId) {
  return fetchJson(`/players/${playerId}/stats`)
}

export async function comparePlayers(player1, player2) {
  return fetchJson(`/players/compare?player1=${player1}&player2=${player2}`)
}

export async function similarPlayers(playerId) {
  return fetchJson(`/players/${playerId}/similar`)
}
