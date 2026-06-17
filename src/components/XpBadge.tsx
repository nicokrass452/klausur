interface XpBadgeProps {
  xp: number;
  level: number;
}

export function XpBadge({ xp, level }: XpBadgeProps) {
  return (
    <div className="rounded-2xl border border-white/40 bg-white/70 px-4 py-3 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/70">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">XP Status</p>
      <div className="mt-2 flex items-end gap-3">
        <strong className="font-display text-2xl text-slate-900 dark:text-white">{xp}</strong>
        <span className="rounded-full bg-teal-500/10 px-2 py-1 text-xs font-semibold text-teal-700 dark:text-teal-300">
          Level {level}
        </span>
      </div>
    </div>
  );
}
