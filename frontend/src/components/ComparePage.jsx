import { useState } from 'react'
import { comparePlayers } from '../api'
import PlayerDropdown from './PlayerDropdown'
import StatCard from './StatCard'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'

function PlayerSelect({ label, player, onSelect }) {
  return (
    <div className="relative rounded-3xl border border-slate-800 bg-slate-900/90 p-5">
      <h2 className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-300">{label}</h2>
      <PlayerDropdown className="mt-4" placeholder="Search player" onSelect={onSelect} selectedPlayer={player} />
      {player && (
        <div className="mt-4 rounded-3xl bg-slate-950/80 p-4 text-white">
          <div className="text-lg font-semibold">{player.full_name}</div>
          <div className="mt-1 text-sm text-slate-400">{player.team_name || 'Free agent'}</div>
        </div>
      )}
    </div>
  )
}

export default function ComparePage() {
  const [player1, setPlayer1] = useState(null)
  const [player2, setPlayer2] = useState(null)
  const [comparison, setComparison] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleCompare = async () => {
    if (!player1 || !player2) {
      setError('Pick two players to compare')
      return
    }
    setError('')
    setLoading(true)
    try {
      const data = await comparePlayers(player1.id, player2.id)
      setComparison(data)
    } catch (err) {
      setError(err.message)
      setComparison(null)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-6 shadow-xl">
        <div className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-300">Compare</div>
        <h1 className="mt-3 text-3xl font-semibold text-white">Side-by-side player analytics</h1>
        <p className="mt-2 text-slate-400">Select two players and see who leads each key category.</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <PlayerSelect
          label="Player 1"
          player={player1}
          onSelect={(player) => {
            setPlayer1(player)
            setComparison(null)
          }}
        />
        <PlayerSelect
          label="Player 2"
          player={player2}
          onSelect={(player) => {
            setPlayer2(player)
            setComparison(null)
          }}
        />
      </div>

      <button onClick={handleCompare} className="rounded-3xl bg-cyan-400 px-6 py-4 font-semibold text-slate-950 shadow-md transition hover:bg-cyan-300">
        {loading ? 'Comparing...' : 'Compare players'}
      </button>
      {error && <div className="rounded-2xl bg-rose-500/10 px-4 py-3 text-sm text-rose-300">{error}</div>}

      {comparison && (
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-5">
              <div className="text-sm uppercase tracking-[0.2em] text-slate-500">Player 1</div>
              <div className="mt-3 text-2xl font-semibold text-white">{comparison.player1.full_name}</div>
            </div>
            <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-5">
              <div className="text-sm uppercase tracking-[0.2em] text-slate-500">Player 2</div>
              <div className="mt-3 text-2xl font-semibold text-white">{comparison.player2.full_name}</div>
            </div>
          </div>

          <div className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/90">
            <div className="grid grid-cols-2 gap-0 bg-slate-950/80 px-4 py-4 text-sm uppercase tracking-[0.2em] text-slate-400 sm:grid-cols-3">
              <div>Category</div>
              <div className="text-right sm:text-center">Player 1</div>
              <div className="text-right sm:text-center">Player 2</div>
            </div>
            {comparison.comparison.map((row) => (
              <div key={row.category} className="grid grid-cols-2 gap-0 border-t border-slate-800 px-4 py-4 text-white sm:grid-cols-3">
                <div className="text-slate-300">{row.category.toUpperCase()}</div>
                <div className={`text-right sm:text-center ${row.leader === 'player1' ? 'text-emerald-300' : 'text-slate-300'}`}>{row.player1.toFixed(1)}</div>
                <div className={`text-right sm:text-center ${row.leader === 'player2' ? 'text-emerald-300' : 'text-slate-300'}`}>{row.player2.toFixed(1)}</div>
              </div>
            ))}
          </div>

          <div className="h-[460px] rounded-3xl border border-slate-800 bg-slate-950/90 p-5">
            <div className="text-sm uppercase tracking-[0.3em] text-slate-400">Comparison chart</div>
            <div className="mt-4 h-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={comparison.comparison} margin={{ top: 20, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke="#334155" strokeDasharray="3 3" />
                  <XAxis dataKey="category" tick={{ fill: '#94a3b8' }} />
                  <YAxis tick={{ fill: '#94a3b8' }} />
                  <Tooltip wrapperStyle={{ backgroundColor: '#0f172a', borderRadius: 12 }} contentStyle={{ border: 'none', boxShadow: '0 1px 8px rgba(0,0,0,0.3)' }} />
                  <Legend />
                  <Bar dataKey="player1" name={comparison.player1.full_name} fill="#facc15" />
                  <Bar dataKey="player2" name={comparison.player2.full_name} fill="#38bdf8" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {comparison.comparison.map((row) => (
              <StatCard
                key={row.category}
                label={row.category.toUpperCase()}
                value={`${row.player1.toFixed(1)} vs ${row.player2.toFixed(1)}`}
                highlight={row.leader === 'player1' || row.leader === 'player2'}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
