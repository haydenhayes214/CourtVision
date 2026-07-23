export default function StatCard({ label, value, highlight }) {
  return (
    <div className={`rounded-lg border bg-white p-4 shadow-sm ${highlight ? 'border-emerald-300 ring-2 ring-emerald-100' : 'border-slate-200'}`}>
      <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">{label}</div>
      <div className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">{value}</div>
    </div>
  )
}
