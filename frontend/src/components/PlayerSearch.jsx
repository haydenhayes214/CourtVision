import { useState } from 'react'
import { getPlayerStats } from '../api'
import PlayerDropdown from './PlayerDropdown'
import StatCard from './StatCard'

export default function PlayerSearch() {
  const [selected, setSelected] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSelect = async (player) => {
    setLoading(true)
    try {
      const data = await getPlayerStats(player.id)
      setSelected(data)
      setError('')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <section className="app-panel">
        <div className="app-eyebrow">Search</div>
        <h2 className="app-title">Find NBA players fast</h2>
        <p className="app-copy max-w-2xl">Search by name to compare stats, view trends, and find similar players.</p>
        <PlayerDropdown
          className="mt-6"
          placeholder="LeBron James, Stephen Curry, Luka"
          detail="position"
          onSelect={handleSelect}
        />
        {loading && <div className="mt-4 text-sm text-slate-400">Loading player stats...</div>}
        {error && <div className="mt-4 rounded-lg border border-rose-400/30 bg-rose-950/40 px-4 py-3 text-sm text-rose-200">{error}</div>}
      </section>

      {selected && (
        <section className="app-panel">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="app-eyebrow">{selected.player.team_name || 'Free agent'}</div>
              <h2 className="app-title">{selected.player.full_name}</h2>
              <p className="mt-2 text-sm text-slate-300">Latest season summary with key shooting and per-game stats.</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard label="PPG" value={selected.stats.latest_season.ppg.toFixed(1)} />
              <StatCard label="RPG" value={selected.stats.latest_season.rpg.toFixed(1)} />
              <StatCard label="APG" value={selected.stats.latest_season.apg.toFixed(1)} />
              <StatCard label="FG%" value={`${selected.stats.latest_season.fg_pct.toFixed(1)}%`} />
            </div>
          </div>
        </section>
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
