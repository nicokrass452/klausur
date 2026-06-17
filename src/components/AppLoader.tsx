export function AppLoader() {
  return (
    <div className="space-y-6">
      <section className="rounded-[32px] border border-white/50 bg-white/80 p-6 shadow-panel dark:border-slate-800 dark:bg-slate-900/80">
        <div className="h-4 w-28 animate-pulse rounded-full bg-slate-200 dark:bg-slate-800" />
        <div className="mt-4 h-10 w-2/3 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800" />
        <div className="mt-3 h-4 w-full animate-pulse rounded-full bg-slate-200 dark:bg-slate-800" />
        <div className="mt-2 h-4 w-5/6 animate-pulse rounded-full bg-slate-200 dark:bg-slate-800" />
      </section>
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div
            key={index}
            className="h-32 animate-pulse rounded-[28px] border border-white/50 bg-white/80 shadow-panel dark:border-slate-800 dark:bg-slate-900/80"
          />
        ))}
      </section>
      <section className="grid gap-6 lg:grid-cols-2">
        {Array.from({ length: 2 }, (_, index) => (
          <div
            key={index}
            className="h-72 animate-pulse rounded-[32px] border border-white/50 bg-white/80 shadow-panel dark:border-slate-800 dark:bg-slate-900/80"
          />
        ))}
      </section>
    </div>
  );
}
