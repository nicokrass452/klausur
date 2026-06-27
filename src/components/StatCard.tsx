import type { ReactNode } from "react";

interface StatCardProps {
  label: string;
  value: string;
  icon?: ReactNode;
  detail?: string;
}

export function StatCard({ label, value, icon, detail }: StatCardProps) {
  return (
    <article className="surface-card p-5">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-slate-500">{label}</span>
        {icon ? <span aria-hidden="true">{icon}</span> : null}
      </div>
      <p className="mt-4 font-display text-3xl text-slate-900 dark:text-white">{value}</p>
      {detail ? <p className="mt-2 text-sm text-slate-500">{detail}</p> : null}
    </article>
  );
}
