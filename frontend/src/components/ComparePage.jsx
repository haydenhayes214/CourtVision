import { useState } from 'react'
import { comparePlayers } from '../api'
import PlayerDropdown from './PlayerDropdown'
import StatCard from './StatCard'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'

function PlayerSelect({ label, player, onSelect }) {
  return (
    <div className="relative rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">{label}</h2>
      <PlayerDropdown className="mt-4" placeholder="Search player" onSelect={onSelect} selectedPlayer={player} />
      {player && (
        <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
          <div className="text-lg font-semibold">{player.full_name}</div>
          <div className="mt-1 text-sm text-slate-500">{player.team_name || 'Free agent'}</div>
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
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Compare</div>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">Side-by-side player analytics</h2>
        <p className="mt-2 text-sm leading-6 text-slate-500">Select two players and see who leads each key category.</p>
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

      <button onClick={handleCompare} className="rounded-lg bg-slate-950 px-5 py-3 font-semibold text-white shadow-sm transition hover:bg-slate-800">
        {loading ? 'Comparing...' : 'Compare players'}
      </button>
      {error && <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}

      {comparison && (
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Player 1</div>
              <div className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">{comparison.player1.full_name}</div>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Player 2</div>
              <div className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">{comparison.player2.full_name}</div>
            </div>
          </div>

          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="grid grid-cols-2 gap-0 bg-slate-50 px-4 py-4 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400 sm:grid-cols-3">
              <div>Category</div>
              <div className="text-right sm:text-center">Player 1</div>
              <div className="text-right sm:text-center">Player 2</div>
            </div>
            {comparison.comparison.map((row) => (
              <div key={row.category} className="grid grid-cols-2 gap-0 border-t border-slate-200 px-4 py-4 text-slate-700 sm:grid-cols-3">
                <div className="font-medium text-slate-950">{row.category.toUpperCase()}</div>
                <div className={`text-right sm:text-center ${row.leader === 'player1' ? 'font-semibold text-emerald-600' : 'text-slate-500'}`}>{row.player1.toFixed(1)}</div>
                <div className={`text-right sm:text-center ${row.leader === 'player2' ? 'font-semibold text-emerald-600' : 'text-slate-500'}`}>{row.player2.toFixed(1)}</div>
              </div>
            ))}
          </div>

          <div className="h-[460px] rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Comparison chart</div>
            <div className="mt-4 h-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={comparison.comparison} margin={{ top: 20, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" />
                  <XAxis dataKey="category" tick={{ fill: '#64748b' }} />
                  <YAxis tick={{ fill: '#64748b' }} />
                  <Tooltip wrapperStyle={{ backgroundColor: '#0f172a', borderRadius: 12 }} contentStyle={{ border: 'none', boxShadow: '0 1px 8px rgba(0,0,0,0.3)' }} />
                  <Legend />
                  <Bar dataKey="player1" name={comparison.player1.full_name} fill="#0f172a" />
                  <Bar dataKey="player2" name={comparison.player2.full_name} fill="#14b8a6" />
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
