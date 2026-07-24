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
      <section className="app-panel">
        <div className="app-eyebrow">Similar finder</div>
        <h2 className="app-title">Find players with similar profiles</h2>
        <p className="app-copy">Discover the top 5 players who match by scoring, shooting, and defense.</p>
      </section>

      <div className="app-panel">
        <PlayerDropdown placeholder="Search player" onSelect={handleSelect} selectedPlayer={player} />
      </div>

      {error && <div className="rounded-lg border border-rose-400/30 bg-rose-950/40 px-4 py-3 text-sm text-rose-200">{error}</div>}

      {player && (
        <div className="grid gap-4 md:grid-cols-2">
          <div className="app-panel">
            <div className="app-eyebrow">Selected player</div>
            <div className="mt-4 text-2xl font-semibold tracking-tight text-white">{player.full_name}</div>
            <div className="text-slate-400">{player.team_name || 'Free agent'}</div>
          </div>
          <div className="rounded-lg border border-amber-300/30 bg-amber-300/10 p-5 shadow-xl shadow-slate-950/20">
            <div className="app-eyebrow">Similarity</div>
            <div className="mt-4 text-4xl font-semibold tracking-tight text-amber-200">Top 5</div>
            <div className="text-slate-300">Normalized stat similarity across scoring and shooting metrics.</div>
          </div>
        </div>
      )}

      <div className="app-panel">
        {loading ? (
          <div className="text-slate-400">Loading similar players...</div>
        ) : similar.length > 0 ? (
          <div className="space-y-3">
            {similar.map((item) => (
              <div key={item.id} className="rounded-lg border border-white/10 bg-[#0b1220] px-4 py-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="font-semibold text-white">{item.full_name}</div>
                    <div className="text-sm text-slate-400">{item.team_name || 'Unknown team'}</div>
                  </div>
                  <div className="rounded-md bg-teal-400 px-4 py-2 font-semibold text-slate-950">{item.score}</div>
                </div>
              </div>
            ))}
          </div>
        ) : player ? (
          <div className="text-slate-400">No similar players found yet.</div>
        ) : (
          <div className="text-slate-400">Search and select a player to calculate similarity.</div>
        )}
      </div>
    </div>
  )
}
