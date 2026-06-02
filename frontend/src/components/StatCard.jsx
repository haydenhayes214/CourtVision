export default function StatCard({ label, value, highlight }) {
  return (
    <div className={`rounded-3xl border border-slate-800 bg-slate-900/90 p-4 shadow-lg ${highlight ? 'ring-2 ring-cyan-400/50' : ''}`}>
      <div className="text-sm uppercase tracking-[0.2em] text-slate-400">{label}</div>
      <div className="mt-2 text-3xl font-semibold text-white">{value}</div>
    </div>
  )
}
