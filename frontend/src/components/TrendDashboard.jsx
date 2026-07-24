import { useState } from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid } from 'recharts'
import { getPlayerStats } from '../api'
import PlayerDropdown from './PlayerDropdown'

export default function TrendDashboard() {
  const [player, setPlayer] = useState(null)
  const [trendData, setTrendData] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const loadTrends = async (selectedPlayer) => {
    setLoading(true)
    setError('')
    try {
      const data = await getPlayerStats(selectedPlayer.id)
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
      <section className="app-panel">
        <div className="app-eyebrow">Trends</div>
        <h2 className="app-title">Player stat trends</h2>
        <p className="app-copy">Visualize recent seasons for points, rebounds, assists, and scoring efficiency.</p>
      </section>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="app-panel">
          <PlayerDropdown label="Search player" placeholder="Search name" onSelect={loadTrends} selectedPlayer={player} />

          <div className="app-panel-muted mt-4">
            <div className="app-eyebrow">Selected</div>
            {player ? (
              <div className="mt-4 space-y-2">
                <div className="text-xl font-semibold text-white">{player.full_name}</div>
                <div className="text-slate-400">{player.team_name || 'Free agent'}</div>
              </div>
            ) : (
              <div className="mt-4 text-slate-400">Choose a player to see season trend charts.</div>
            )}
          </div>
        </div>
      </div>

      {error && <div className="rounded-lg border border-rose-400/30 bg-rose-950/40 px-4 py-3 text-sm text-rose-200">{error}</div>}

      <div className="app-panel">
        <div className="app-eyebrow">Trend chart</div>
        {loading ? (
          <div className="mt-6 text-slate-400">Loading season chart...</div>
        ) : trendData.length > 0 ? (
          <div className="mt-6 h-[420px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData} margin={{ top: 20, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="#243244" strokeDasharray="3 3" />
                <XAxis dataKey="season" tick={{ fill: '#cbd5e1' }} />
                <YAxis tick={{ fill: '#cbd5e1' }} />
                <Tooltip wrapperStyle={{ backgroundColor: '#0f172a', borderRadius: 12 }} contentStyle={{ border: 'none', boxShadow: '0 1px 8px rgba(0,0,0,0.3)' }} />
                <Legend />
                <Line type="monotone" dataKey="PPG" stroke="#fbbf24" strokeWidth={3} activeDot={{ r: 6 }} />
                <Line type="monotone" dataKey="RPG" stroke="#2dd4bf" strokeWidth={3} />
                <Line type="monotone" dataKey="APG" stroke="#818cf8" strokeWidth={3} />
                <Line type="monotone" dataKey="EFF" stroke="#fb7185" strokeWidth={3} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="mt-6 rounded-lg border border-dashed border-white/20 bg-[#0b1220] p-8 text-center font-medium text-slate-400">
            Search and select a player to render a season trend line chart.
          </div>
        )}
      </div>
    </div>
  )
}
