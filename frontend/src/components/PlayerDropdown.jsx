import { useEffect, useId, useState } from 'react'
import { searchPlayers } from '../api'

export default function PlayerDropdown({ label, placeholder = 'Search player', onSelect, selectedPlayer, detail = 'team', className = '' }) {
  const inputId = useId()
  const [query, setQuery] = useState(selectedPlayer?.full_name || '')
  const [results, setResults] = useState([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    setQuery(selectedPlayer?.full_name || '')
  }, [selectedPlayer])

  useEffect(() => {
    const trimmed = query.trim()
    if (trimmed.length < 2) {
      setResults([])
      setOpen(false)
      setError('')
      setLoading(false)
      return undefined
    }

    setLoading(true)
    const timeoutId = window.setTimeout(() => {
      search(trimmed)
    }, 250)

    return () => window.clearTimeout(timeoutId)
  }, [query])

  const search = async (value) => {
    const trimmed = value.trim()
    if (trimmed.length < 2) {
      setResults([])
      setOpen(false)
      setError('')
      return
    }

    setLoading(true)
    try {
      const data = await searchPlayers(trimmed)
      setResults(data.results)
      setOpen(true)
      setError('')
    } catch (err) {
      setResults([])
      setOpen(true)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (event) => {
    setQuery(event.target.value)
  }

  const handleSelect = async (player) => {
    setQuery(player.full_name)
    setResults([])
    setOpen(false)
    setError('')
    await onSelect(player)
  }

  const helperText = query.trim().length > 0 && query.trim().length < 2
    ? 'Type at least 2 letters'
    : loading
      ? 'Searching...'
      : error
        ? error
        : ''

  return (
    <div className={`relative ${className}`}>
      {label && (
        <label htmlFor={inputId} className="app-eyebrow">
          {label}
        </label>
      )}
      <div className="relative mt-2">
        <input
          id={inputId}
          value={query}
          onChange={handleChange}
          onFocus={() => {
            if (results.length > 0 || error) setOpen(true)
          }}
          placeholder={placeholder}
          role="combobox"
          aria-expanded={open}
          aria-controls={`${inputId}-menu`}
          className="w-full rounded-lg border border-white/10 bg-[#070d19] px-4 py-3 pr-12 text-white outline-none transition placeholder:text-slate-500 focus:border-teal-300 focus:ring-4 focus:ring-teal-400/10"
        />
        <button
          type="button"
          aria-label="Open player menu"
          onClick={() => {
            if (query.trim().length >= 2) {
              search(query)
            } else {
              setOpen((current) => !current)
            }
          }}
          className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-md border border-teal-300/30 bg-teal-400 text-slate-950 transition hover:bg-amber-300"
        >
          +
        </button>
      </div>

      {helperText && (
        <div className={`mt-2 text-sm ${error ? 'text-rose-300' : 'text-slate-400'}`}>
          {helperText}
        </div>
      )}

      {open && results.length > 0 && (
        <div
          id={`${inputId}-menu`}
          role="listbox"
          className="absolute left-0 right-0 z-30 mt-2 max-h-72 overflow-auto rounded-lg border border-white/10 bg-[#0b1220] shadow-2xl shadow-black/40"
        >
          {results.map((player) => (
            <button
              key={player.id}
              type="button"
              role="option"
              onClick={() => handleSelect(player)}
              className="w-full px-4 py-3 text-left text-slate-300 transition hover:bg-teal-300/10"
            >
              <div className="font-semibold text-white">{player.full_name}</div>
              <div className="text-sm text-slate-400">
                {player.team_name || 'Free agent'}
                {detail === 'position' && ` - ${player.position || 'Position N/A'}`}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
