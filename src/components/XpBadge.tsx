interface XpBadgeProps {
  xp: number;
  level: number;
  compact?: boolean;
}

export function XpBadge({ xp, level, compact = false }: XpBadgeProps) {
  if (compact) {
    return (
      <div className="inline-flex items-center gap-2 rounded-full border border-slate-200/80 bg-white/90 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-900/90 dark:text-slate-200">
        <span className="text-teal-600 dark:text-teal-300">L{level}</span>
        <span className="text-slate-400">·</span>
        <span>{xp} XP</span>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white/90 px-4 py-2.5 dark:border-slate-800 dark:bg-slate-900/90">
      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">XP</p>
      <div className="mt-1 flex items-center gap-2">
        <strong className="font-display text-xl text-slate-900 dark:text-white">{xp}</strong>
        <span className="rounded-full bg-teal-500/10 px-2 py-0.5 text-xs font-semibold text-teal-700 dark:text-teal-300">
          Level {level}
        </span>
      </div>
    </div>
  );
}