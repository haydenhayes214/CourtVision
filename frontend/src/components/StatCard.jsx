export default function StatCard({ label, value, highlight }) {
  return (
    <div className={`rounded-lg border bg-white p-4 shadow-sm ${highlight ? 'border-teal-500 bg-teal-50 ring-2 ring-teal-200' : 'border-slate-300'}`}>
      <div className="text-xs font-semibold uppercase tracking-[0.16em] text-teal-700">{label}</div>
      <div className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">{value}</div>
    </div>
  )
}
