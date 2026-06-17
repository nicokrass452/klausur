import clsx from "clsx";

interface ProgressBarProps {
  value: number;
  tone?: "mint" | "coral" | "slate";
  label?: string;
}

export function ProgressBar({ value, tone = "mint", label }: ProgressBarProps) {
  const toneClass = tone === "coral" ? "from-orange-400 to-orange-500" : tone === "slate" ? "from-slate-400 to-slate-500" : "from-teal-500 to-cyan-500";

  return (
    <div aria-label={label} className="space-y-2">
      <div className="h-2 overflow-hidden rounded-full bg-slate-200/80 dark:bg-slate-800">
        <div
          className={clsx("h-full rounded-full bg-gradient-to-r transition-[width] duration-300", toneClass)}
          style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
        />
      </div>
    </div>
  );
}
