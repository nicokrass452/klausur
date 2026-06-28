interface XpBadgeProps {
  xp: number;
  level: number;
  compact?: boolean;
}

export function XpBadge({ xp, level, compact = false }: XpBadgeProps) {
  if (compact) {
    return (
      <div
        className="inline-flex items-center gap-2 rounded-full border border-slate-200/80 bg-white/90 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-900/90 dark:text-slate-200"
        role="status"
        aria-label={`Level ${level}, ${xp} XP`}
      >
        <span className="text-teal-600 dark:text-teal-300" aria-hidden="true">L{level}</span>
        <span className="text-slate-400" aria-hidden="true">·</span>
        <span aria-hidden="true">{xp} XP</span>
      </div>
    );
  }

  return (
    <div
      className="rounded-2xl border border-slate-200/80 bg-white/90 px-4 py-2.5 dark:border-slate-800 dark:bg-slate-900/90"
      role="status"
      aria-label={`Level ${level}, ${xp} XP`}
    >
      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400" aria-hidden="true">XP</p>
      <div className="mt-1 flex items-center gap-2">
        <strong className="font-display text-xl text-slate-900 dark:text-white" aria-hidden="true">{xp}</strong>
        <span className="rounded-full bg-teal-500/10 px-2 py-0.5 text-xs font-semibold text-teal-700 dark:text-teal-300" aria-hidden="true">
          Level {level}
        </span>
      </div>
    </div>
  );
}
