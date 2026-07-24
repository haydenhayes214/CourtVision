import { useState } from 'react'
import PlayerSearch from './components/PlayerSearch'
import ComparePage from './components/ComparePage'
import TrendDashboard from './components/TrendDashboard'
import SimilarFinder from './components/SimilarFinder'

const pages = [
  { id: 'search', label: 'Search', kicker: 'Player lookup' },
  { id: 'compare', label: 'Compare', kicker: 'Head to head' },
  { id: 'trends', label: 'Trends', kicker: 'Season charts' },
  { id: 'similar', label: 'Similar', kicker: 'Profile match' },
]

export default function App() {
  const [activePage, setActivePage] = useState('search')
  const active = pages.find((page) => page.id === activePage)

  return (
    <div className="min-h-screen bg-[#050914] text-slate-100">
      <div className="mx-auto grid min-h-screen max-w-7xl gap-6 px-4 py-4 sm:px-6 lg:grid-cols-[260px_1fr] lg:px-8">
        <aside className="flex flex-col gap-5 border-white/10 bg-[#080f1d] p-4 shadow-2xl shadow-black/30 sm:rounded-lg sm:border lg:sticky lg:top-4 lg:h-[calc(100vh-2rem)]">
          <div className="border-b border-white/10 pb-5">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-amber-400 text-sm font-bold text-slate-950">CV</div>
            <div className="mt-4 text-lg font-semibold text-white">CourtVision</div>
            <div className="mt-1 text-sm text-slate-300">NBA analytics workspace</div>
          </div>

          <nav className="grid grid-cols-2 gap-2 lg:grid-cols-1">
            {pages.map((page) => (
              <button
                key={page.id}
                onClick={() => setActivePage(page.id)}
                className={`group rounded-lg border px-3 py-3 text-left transition ${
                  activePage === page.id
                    ? 'border-amber-300 bg-amber-400 text-slate-950 shadow-sm shadow-amber-400/25'
                    : 'border-transparent bg-transparent text-slate-300 hover:border-teal-300/30 hover:bg-teal-300/10 hover:text-white'
                }`}
              >
                <span className="block text-sm font-semibold">{page.label}</span>
                <span className={`mt-0.5 block text-xs ${activePage === page.id ? 'text-slate-800' : 'text-slate-400'}`}>{page.kicker}</span>
              </button>
            ))}
          </nav>

          <div className="mt-auto hidden rounded-lg border border-white/10 bg-white/5 p-4 lg:block">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Status</div>
            <div className="mt-3 flex items-center gap-2 text-sm font-medium text-white">
              <span className="h-2.5 w-2.5 rounded-full bg-teal-300" />
              Local dashboard
            </div>
          </div>
        </aside>

        <div className="flex min-w-0 flex-col gap-5">
          <header className="border-b border-white/10 bg-[#050914]/95 py-4 backdrop-blur lg:sticky lg:top-0 lg:z-20">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-teal-300">{active?.kicker}</p>
                <h1 className="mt-1 text-3xl font-semibold tracking-tight text-white sm:text-4xl">{active?.label}</h1>
              </div>
              <div className="rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-slate-300 shadow-sm">
                Search, compare, trend, and match player profiles.
              </div>
            </div>
          </header>

          <main className="pb-8">
            {activePage === 'search' && <PlayerSearch />}
            {activePage === 'compare' && <ComparePage />}
            {activePage === 'trends' && <TrendDashboard />}
            {activePage === 'similar' && <SimilarFinder />}
          </main>
        </div>
      </div>
    </div>
  )
}
