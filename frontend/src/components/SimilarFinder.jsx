import { useState } from 'react'
import { similarPlayers } from '../api'
import PlayerDropdown from './PlayerDropdown'

export default function SimilarFinder() {
  const [similar, setSimilar] = useState([])
  const [player, setPlayer] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSelect = async (selectedPlayer) => {
    setPlayer(selectedPlayer)
    setLoading(true)
    setError('')
    try {
      const data = await similarPlayers(selectedPlayer.id)
      setSimilar(data.similar)
    } catch (err) {
      setSimilar([])
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-slate-300 bg-white p-5 shadow-sm">
        <div className="text-xs font-semibold uppercase tracking-[0.16em] text-teal-700">Similar finder</div>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">Find players with similar profiles</h2>
        <p className="mt-2 text-sm leading-6 text-slate-700">Discover the top 5 players who match by scoring, shooting, and defense.</p>
      </section>

      <div className="rounded-lg border border-slate-300 bg-white p-5 shadow-sm">
        <PlayerDropdown placeholder="Search player" onSelect={handleSelect} selectedPlayer={player} />
      </div>

      {error && <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}

      {player && (
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-lg border border-slate-300 bg-white p-5 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-teal-700">Selected player</div>
            <div className="mt-4 text-2xl font-semibold tracking-tight text-slate-950">{player.full_name}</div>
            <div className="text-slate-500">{player.team_name || 'Free agent'}</div>
          </div>
          <div className="rounded-lg border border-slate-300 bg-amber-50 p-5 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-teal-700">Similarity</div>
            <div className="mt-4 text-4xl font-semibold tracking-tight text-slate-950">Top 5</div>
            <div className="text-slate-500">Normalized stat similarity across scoring and shooting metrics.</div>
          </div>
        </div>
      )}

      <div className="rounded-lg border border-slate-300 bg-white p-5 shadow-sm">
        {loading ? (
          <div className="text-slate-500">Loading similar players...</div>
        ) : similar.length > 0 ? (
          <div className="space-y-3">
            {similar.map((item) => (
              <div key={item.id} className="rounded-lg border border-slate-300 bg-slate-50 px-4 py-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="font-semibold text-slate-950">{item.full_name}</div>
                    <div className="text-sm text-slate-500">{item.team_name || 'Unknown team'}</div>
                  </div>
                  <div className="rounded-md bg-teal-700 px-4 py-2 font-semibold text-white">{item.score}</div>
                </div>
              </div>
            ))}
          </div>
        ) : player ? (
          <div className="text-slate-500">No similar players found yet.</div>
        ) : (
          <div className="text-slate-500">Search and select a player to calculate similarity.</div>
        )}
      </div>
    </div>
  )
}
