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
      <section className="rounded-lg border border-slate-300 bg-white p-5 shadow-sm">
        <div className="text-xs font-semibold uppercase tracking-[0.16em] text-teal-700">Trends</div>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">Player stat trends</h2>
        <p className="mt-2 text-sm leading-6 text-slate-700">Visualize recent seasons for points, rebounds, assists, and scoring efficiency.</p>
      </section>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-slate-300 bg-white p-5 shadow-sm">
          <PlayerDropdown label="Search player" placeholder="Search name" onSelect={loadTrends} selectedPlayer={player} />

          <div className="mt-4 rounded-lg border border-slate-300 bg-amber-50 p-5">
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-teal-700">Selected</div>
            {player ? (
              <div className="mt-4 space-y-2">
                <div className="text-xl font-semibold text-slate-950">{player.full_name}</div>
                <div className="text-slate-500">{player.team_name || 'Free agent'}</div>
              </div>
            ) : (
              <div className="mt-4 text-slate-500">Choose a player to see season trend charts.</div>
            )}
          </div>
        </div>
      </div>

      {error && <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}

      <div className="rounded-lg border border-slate-300 bg-white p-5 shadow-sm">
        <div className="text-xs font-semibold uppercase tracking-[0.16em] text-teal-700">Trend chart</div>
        {loading ? (
          <div className="mt-6 text-slate-500">Loading season chart...</div>
        ) : trendData.length > 0 ? (
          <div className="mt-6 h-[420px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData} margin={{ top: 20, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" />
                <XAxis dataKey="season" tick={{ fill: '#64748b' }} />
                <YAxis tick={{ fill: '#64748b' }} />
                <Tooltip wrapperStyle={{ backgroundColor: '#0f172a', borderRadius: 12 }} contentStyle={{ border: 'none', boxShadow: '0 1px 8px rgba(0,0,0,0.3)' }} />
                <Legend />
                <Line type="monotone" dataKey="PPG" stroke="#0f172a" strokeWidth={3} activeDot={{ r: 6 }} />
                <Line type="monotone" dataKey="RPG" stroke="#0f766e" strokeWidth={3} />
                <Line type="monotone" dataKey="APG" stroke="#4338ca" strokeWidth={3} />
                <Line type="monotone" dataKey="EFF" stroke="#d97706" strokeWidth={3} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="mt-6 rounded-lg border border-dashed border-slate-400 bg-slate-100 p-8 text-center font-medium text-slate-600">
            Search and select a player to render a season trend line chart.
          </div>
        )}
      </div>
    </div>
  )
}
