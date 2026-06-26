import { useState } from 'react'
import PlayerSearch from './components/PlayerSearch'
import ComparePage from './components/ComparePage'
import TrendDashboard from './components/TrendDashboard'
import SimilarFinder from './components/SimilarFinder'

const pages = [
  { id: 'search', label: 'Search' },
  { id: 'compare', label: 'Compare' },
  { id: 'trends', label: 'Trends' },
  { id: 'similar', label: 'Similar' },
]

export default function App() {
  const [activePage, setActivePage] = useState('search')

  return (
    <div className="min-h-screen bg-slate-950 py-8 px-4 text-slate-100 sm:px-6 lg:px-10">
      <div className="mx-auto flex max-w-7xl flex-col gap-8">
        <header className="rounded-[40px] border border-slate-800 bg-gradient-to-br from-[#051928] via-[#081f35] to-[#0f2940] p-8 shadow-2xl shadow-slate-950/40 backdrop-blur-xl">
          <div>
            <p className="text-sm uppercase tracking-[0.4em] text-cyan-300">CourtVision Analytics</p>
            <h1 className="mt-3 text-4xl font-semibold text-white sm:text-5xl">NBA dashboard for player scouting and comparison</h1>
            <p className="mt-4 max-w-2xl text-slate-400">Search players, compare two athletes side-by-side, explore season trends, and discover statistically similar profiles.</p>
          </div>
        </header>

        <nav className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {pages.map((page) => (
            <button
              key={page.id}
              onClick={() => setActivePage(page.id)}
              className={`rounded-3xl px-5 py-4 text-sm font-semibold transition ${
                activePage === page.id
                  ? 'bg-cyan-400 text-slate-950 shadow-lg shadow-cyan-500/20'
                  : 'border border-slate-800 bg-slate-900 text-slate-200 hover:border-cyan-400'
              }`}
            >
              {page.label}
            </button>
          ))}
        </nav>

        <main className="space-y-8">
          {activePage === 'search' && <PlayerSearch />}
          {activePage === 'compare' && <ComparePage />}
          {activePage === 'trends' && <TrendDashboard />}
          {activePage === 'similar' && <SimilarFinder />}
        </main>
      </div>
    </div>
  )
}
