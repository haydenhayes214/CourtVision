import { useState } from 'react'
import { searchPlayers, getPlayerStats } from '../api'
import StatCard from './StatCard'

export default function PlayerSearch() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [selected, setSelected] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSearch = async (event) => {
    event.preventDefault()
    if (!query.trim()) return
    setError('')
    setLoading(true)
    try {
      const data = await searchPlayers(query)
      setResults(data.results)
    } catch (err) {
      setError(err.message)
      setResults([])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-6 shadow-xl">
        <div className="text-sm font-semibold uppercase tracking-[0.3em] text-amber-400">Search</div>
        <h1 className="mt-3 text-3xl font-semibold text-white">Find NBA players fast</h1>
        <p className="mt-2 text-slate-400">Search by name to compare stats, view trends, and find similar players.</p>
        <form onSubmit={handleSearch} className="mt-6 flex flex-col gap-3 sm:flex-row">
          <label className="sr-only" htmlFor="player-search">Player name</label>
          <input
            id="player-search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="LeBron James, Stephen Curry, Luka"
            className="flex-1 rounded-2xl border border-slate-700 bg-slate-950/80 px-4 py-3 text-white outline-none transition focus:border-amber-400"
          />
          <button type="submit" className="rounded-2xl bg-amber-400 px-5 py-3 font-semibold text-slate-950 transition hover:bg-amber-300">
            {loading ? 'Searching…' : 'Search players'}
          </button>
        </form>
        {error && <div className="mt-4 rounded-2xl bg-rose-500/10 px-4 py-3 text-sm text-rose-300">{error}</div>}
      </div>

      {results.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {results.map((player) => (
            <button
              key={player.id}
              onClick={async () => {
                setLoading(true)
                try {
                  const data = await getPlayerStats(player.id)
                  setSelected(data)
                  setResults([])
                  setQuery(player.full_name)
                  setError('')
                } catch (err) {
                  setError(err.message)
                } finally {
                  setLoading(false)
                }
              }}
              className="group rounded-3xl border border-slate-800 bg-slate-900/90 p-5 text-left transition hover:border-amber-400"
            >
              <div className="text-sm text-amber-400">{player.team_name || 'Free agent'}</div>
              <div className="mt-2 text-xl font-semibold text-white">{player.full_name}</div>
              <div className="mt-1 text-slate-400">{player.position || 'Position N/A'}</div>
              <div className="mt-4 rounded-2xl bg-slate-950/80 px-4 py-3 text-sm text-slate-300 transition group-hover:bg-slate-900">View profile & stats</div>
            </button>
          ))}
        </div>
      )}

      {selected && (
        <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-6 shadow-xl">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="text-sm uppercase tracking-[0.3em] text-amber-400">{selected.player.team_name || 'Free agent'}</div>
              <h2 className="mt-2 text-3xl font-semibold text-white">{selected.player.full_name}</h2>
              <p className="mt-2 text-slate-400">Latest season summary with key shooting and per-game stats.</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard label="PPG" value={selected.stats.latest_season.ppg.toFixed(1)} />
              <StatCard label="RPG" value={selected.stats.latest_season.rpg.toFixed(1)} />
              <StatCard label="APG" value={selected.stats.latest_season.apg.toFixed(1)} />
              <StatCard label="FG%" value={`${selected.stats.latest_season.fg_pct.toFixed(1)}%`} />
            </div>
          </div>
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Points per game" value="PPG" />
        <StatCard label="Rebounds per game" value="RPG" />
        <StatCard label="Assists per game" value="APG" />
        <StatCard label="Efficiency" value="FG/3P/FT" />
      </div>
    </div>
  )
}
