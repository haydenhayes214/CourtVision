import { useEffect, useState } from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid } from 'recharts'
import { searchPlayers, getPlayerStats } from '../api'

export default function TrendDashboard() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [player, setPlayer] = useState(null)
  const [trendData, setTrendData] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSearch = async () => {
    if (!query.trim()) return
    try {
      const data = await searchPlayers(query)
      setResults(data.results)
    } catch (err) {
      setResults([])
      setError(err.message)
    }
  }

  const loadTrends = async (playerId) => {
    setLoading(true)
    setError('')
    try {
      const data = await getPlayerStats(playerId)
      setPlayer(data.player)
      setTrendData(data.stats.seasons.slice(-6).map((season) => ({
        season: season.season,
        PPG: Number(season.ppg.toFixed(1)),
        RPG: Number(season.rpg.toFixed(1)),
        APG: Number(season.apg.toFixed(1)),
        EFF: parseFloat(((season.fg_pct + season.fg3_pct + season.ft_pct) / 3).toFixed(1)),
      })))
    } catch (err) {
      setError(err.message)
      setTrendData([])
      setPlayer(null)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-6 shadow-xl">
        <div className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-300">Trends</div>
        <h1 className="mt-3 text-3xl font-semibold text-white">Player stat trends</h1>
        <p className="mt-2 text-slate-400">Visualize recent seasons for points, rebounds, assists, and scoring efficiency.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-5">
          <label className="text-sm uppercase tracking-[0.3em] text-slate-400">Search player</label>
          <div className="mt-4 flex gap-3">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search name"
              className="flex-1 rounded-2xl border border-slate-700 bg-slate-950/80 px-4 py-3 text-white"
            />
            <button onClick={handleSearch} className="rounded-2xl bg-cyan-400 px-4 py-3 font-semibold text-slate-950">
              Search
            </button>
          </div>
          {results.length > 0 && (
            <div className="mt-4 space-y-2">
              {results.slice(0, 6).map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    loadTrends(item.id)
                    setResults([])
                    setQuery(item.full_name)
                  }}
                  className="w-full rounded-2xl border border-slate-700 bg-slate-950/80 px-4 py-3 text-left text-slate-100 hover:border-cyan-400"
                >
                  {item.full_name}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-5">
          <div className="text-sm uppercase tracking-[0.3em] text-slate-400">Selected</div>
          {player ? (
            <div className="mt-4 space-y-2">
              <div className="text-xl font-semibold text-white">{player.full_name}</div>
              <div className="text-slate-400">{player.team_name || 'Free agent'}</div>
            </div>
          ) : (
            <div className="mt-4 text-slate-500">Choose a player to see season trend charts.</div>
          )}
        </div>
      </div>

      {error && <div className="rounded-2xl bg-rose-500/10 px-4 py-3 text-sm text-rose-300">{error}</div>}

      <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-5">
        <div className="text-sm uppercase tracking-[0.3em] text-slate-400">Trend chart</div>
        {loading ? (
          <div className="mt-6 text-slate-300">Loading season chart…</div>
        ) : trendData.length > 0 ? (
          <div className="mt-6 h-[420px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData} margin={{ top: 20, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="#334155" strokeDasharray="3 3" />
                <XAxis dataKey="season" tick={{ fill: '#94a3b8' }} />
                <YAxis tick={{ fill: '#94a3b8' }} />
                <Tooltip wrapperStyle={{ backgroundColor: '#0f172a', borderRadius: 12 }} contentStyle={{ border: 'none', boxShadow: '0 1px 8px rgba(0,0,0,0.3)' }} />
                <Legend />
                <Line type="monotone" dataKey="PPG" stroke="#facc15" strokeWidth={3} activeDot={{ r: 6 }} />
                <Line type="monotone" dataKey="RPG" stroke="#38bdf8" strokeWidth={3} />
                <Line type="monotone" dataKey="APG" stroke="#a78bfa" strokeWidth={3} />
                <Line type="monotone" dataKey="EFF" stroke="#34d399" strokeWidth={3} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="mt-6 rounded-3xl border border-dashed border-slate-700 bg-slate-950/80 p-8 text-center text-slate-500">
            Search and select a player to render a season trend line chart.
          </div>
        )}
      </div>
    </div>
  )
}
