import { useState } from 'react'
import { comparePlayers } from '../api'
import PlayerDropdown from './PlayerDropdown'
import StatCard from './StatCard'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'

function PlayerSelect({ label, player, onSelect }) {
  return (
    <div className="app-panel relative">
      <h2 className="app-eyebrow">{label}</h2>
      <PlayerDropdown className="mt-4" placeholder="Search player" onSelect={onSelect} selectedPlayer={player} />
      {player && (
        <div className="mt-4 rounded-lg border border-amber-300/30 bg-amber-300/10 p-4">
          <div className="text-lg font-semibold text-white">{player.full_name}</div>
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
      <section className="app-panel">
        <div className="app-eyebrow">Compare</div>
        <h2 className="app-title">Side-by-side player analytics</h2>
        <p className="app-copy">Select two players and see who leads each key category.</p>
      </section>

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

      <button onClick={handleCompare} className="rounded-lg bg-teal-400 px-5 py-3 font-semibold text-slate-950 shadow-lg shadow-teal-950/30 transition hover:bg-teal-300">
        {loading ? 'Comparing...' : 'Compare players'}
      </button>
      {error && <div className="rounded-lg border border-rose-400/30 bg-rose-950/40 px-4 py-3 text-sm text-rose-200">{error}</div>}

      {comparison && (
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="app-panel">
              <div className="app-eyebrow">Player 1</div>
              <div className="mt-3 text-2xl font-semibold tracking-tight text-white">{comparison.player1.full_name}</div>
            </div>
            <div className="app-panel">
              <div className="app-eyebrow">Player 2</div>
              <div className="mt-3 text-2xl font-semibold tracking-tight text-white">{comparison.player2.full_name}</div>
            </div>
          </div>

          <div className="overflow-hidden rounded-lg border border-white/10 bg-[#111827]/90 shadow-xl shadow-slate-950/20">
            <div className="grid grid-cols-2 gap-0 bg-[#070d19] px-4 py-4 text-xs font-semibold uppercase tracking-[0.16em] text-teal-200 sm:grid-cols-3">
              <div>Category</div>
              <div className="text-right sm:text-center">Player 1</div>
              <div className="text-right sm:text-center">Player 2</div>
            </div>
            {comparison.comparison.map((row) => (
              <div key={row.category} className="grid grid-cols-2 gap-0 border-t border-white/10 px-4 py-4 text-slate-300 sm:grid-cols-3">
                <div className="font-medium text-white">{row.category.toUpperCase()}</div>
                <div className={`text-right sm:text-center ${row.leader === 'player1' ? 'font-semibold text-amber-300' : 'text-slate-400'}`}>{row.player1.toFixed(1)}</div>
                <div className={`text-right sm:text-center ${row.leader === 'player2' ? 'font-semibold text-amber-300' : 'text-slate-400'}`}>{row.player2.toFixed(1)}</div>
              </div>
            ))}
          </div>

          <div className="app-panel h-[460px]">
            <div className="app-eyebrow">Comparison chart</div>
            <div className="mt-4 h-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={comparison.comparison} margin={{ top: 20, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke="#243244" strokeDasharray="3 3" />
                  <XAxis dataKey="category" tick={{ fill: '#cbd5e1' }} />
                  <YAxis tick={{ fill: '#cbd5e1' }} />
                  <Tooltip wrapperStyle={{ backgroundColor: '#0f172a', borderRadius: 12 }} contentStyle={{ border: 'none', boxShadow: '0 1px 8px rgba(0,0,0,0.3)' }} />
                  <Legend />
                  <Bar dataKey="player1" name={comparison.player1.full_name} fill="#0f172a" />
                  <Bar dataKey="player2" name={comparison.player2.full_name} fill="#d97706" />
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
