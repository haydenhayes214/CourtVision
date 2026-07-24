export default function StatCard({ label, value, highlight }) {
  return (
    <div className={`rounded-lg border p-4 shadow-xl shadow-slate-950/20 ${highlight ? 'border-amber-300/60 bg-amber-300/10 ring-2 ring-amber-300/20' : 'border-white/10 bg-[#111827]/90'}`}>
      <div className="text-xs font-semibold uppercase tracking-[0.16em] text-teal-300">{label}</div>
      <div className="mt-2 text-2xl font-semibold tracking-tight text-white">{value}</div>
    </div>
  )
}
