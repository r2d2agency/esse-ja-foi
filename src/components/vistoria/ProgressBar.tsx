export function ProgressBar({ label, total, preenchidos }: { label: string; total: number; preenchidos: number }) {
  const percent = total > 0 ? Math.round((preenchidos / total) * 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider text-slate-500">
        <span>{label}</span>
        <span>{percent}%</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full transition-all duration-500 ${percent === 100 ? "bg-emerald-500" : "bg-teal-700"}`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
