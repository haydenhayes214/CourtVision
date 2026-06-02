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
      <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-6 shadow-xl">
        <div className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-300">Similar finder</div>
        <h1 className="mt-3 text-3xl font-semibold text-white">Find players with similar profiles</h1>
        <p className="mt-2 text-slate-400">Discover the top 5 players who match by scoring, shooting, and defense.</p>
      </div>

      <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-5">
        <PlayerDropdown placeholder="Search player" onSelect={handleSelect} selectedPlayer={player} />
      </div>

      {error && <div className="rounded-2xl bg-rose-500/10 px-4 py-3 text-sm text-rose-300">{error}</div>}

      {player && (
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-5">
            <div className="text-sm uppercase tracking-[0.3em] text-slate-400">Selected player</div>
            <div className="mt-4 text-2xl font-semibold text-white">{player.full_name}</div>
            <div className="text-slate-400">{player.team_name || 'Free agent'}</div>
          </div>
          <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-5">
            <div className="text-sm uppercase tracking-[0.3em] text-slate-400">Similarity</div>
            <div className="mt-4 text-4xl font-semibold text-white">Top 5</div>
            <div className="text-slate-500">Normalized stat similarity across scoring and shooting metrics.</div>
          </div>
        </div>
      )}

      <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-5">
        {loading ? (
          <div className="text-slate-300">Loading similar players...</div>
        ) : similar.length > 0 ? (
          <div className="space-y-3">
            {similar.map((item) => (
              <div key={item.id} className="rounded-3xl border border-slate-800 bg-slate-950/80 px-4 py-4 text-white">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="font-semibold">{item.full_name}</div>
                    <div className="text-sm text-slate-500">{item.team_name || 'Unknown team'}</div>
                  </div>
                  <div className="rounded-2xl bg-cyan-400 px-4 py-2 font-semibold text-slate-950">{item.score}</div>
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
