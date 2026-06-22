import clsx from "clsx";

interface ProgressBarProps {
  value: number;
  tone?: "mint" | "coral" | "slate";
  label?: string;
  showValue?: boolean;
  size?: "sm" | "md";
}

const toneStyles = {
  mint: {
    fill: "from-teal-400 via-teal-500 to-cyan-500",
    glow: "shadow-[0_0_12px_rgba(20,184,166,0.45)]",
    text: "text-teal-700 dark:text-teal-300"
  },
  coral: {
    fill: "from-orange-400 via-orange-500 to-amber-500",
    glow: "shadow-[0_0_12px_rgba(249,115,22,0.4)]",
    text: "text-orange-700 dark:text-orange-300"
  },
  slate: {
    fill: "from-slate-400 via-slate-500 to-slate-600",
    glow: "shadow-[0_0_10px_rgba(100,116,139,0.35)]",
    text: "text-slate-600 dark:text-slate-300"
  }
} as const;

export function ProgressBar({ value, tone = "mint", label, showValue = false, size = "md" }: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, value));
  const styles = toneStyles[tone];

  return (
    <div aria-label={label} className="space-y-2">
      {showValue || label ? (
        <div className="flex items-center justify-between gap-3 text-xs font-medium">
          {label ? <span className="text-slate-500">{label}</span> : <span />}
          {showValue ? <span className={clsx("tabular-nums", styles.text)}>{clamped}%</span> : null}
        </div>
      ) : null}
      <div
        className={clsx(
          "progress-track overflow-hidden rounded-full",
          size === "sm" ? "h-2" : "h-3"
        )}
      >
        <div
          className={clsx(
            "h-full rounded-full bg-gradient-to-r transition-[width] duration-500 ease-out",
            styles.fill,
            clamped > 0 ? styles.glow : ""
          )}
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}