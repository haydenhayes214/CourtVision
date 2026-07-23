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
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Search</div>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">Find NBA players fast</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">Search by name to compare stats, view trends, and find similar players.</p>
        <PlayerDropdown
          className="mt-6"
          placeholder="LeBron James, Stephen Curry, Luka"
          detail="position"
          onSelect={handleSelect}
        />
        {loading && <div className="mt-4 text-sm text-slate-500">Loading player stats...</div>}
        {error && <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}
      </section>

      {selected && (
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">{selected.player.team_name || 'Free agent'}</div>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">{selected.player.full_name}</h2>
              <p className="mt-2 text-sm text-slate-500">Latest season summary with key shooting and per-game stats.</p>
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
