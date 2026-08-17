export default function DashboardLoading() {
  return (
    <div className="min-h-screen bg-background">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-40 top-0 h-[32rem] w-[32rem] rounded-full bg-violet-600/20 blur-[128px]" />
        <div className="absolute -right-40 top-1/4 h-[32rem] w-[32rem] rounded-full bg-purple-600/20 blur-[128px]" />
        <div className="neo-grid-bg absolute inset-0 opacity-60" />
      </div>

      <div className="relative mx-auto max-w-7xl px-6 py-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 animate-pulse rounded-lg bg-muted/60" />
            <div className="space-y-2">
              <div className="h-5 w-28 animate-pulse rounded bg-muted/60" />
              <div className="h-3 w-36 animate-pulse rounded bg-muted/40" />
            </div>
          </div>
          <div className="flex gap-2">
            <div className="h-9 w-9 animate-pulse rounded-md bg-muted/50" />
            <div className="h-9 w-9 animate-pulse rounded-md bg-muted/50" />
            <div className="h-9 w-9 animate-pulse rounded-md bg-muted/50" />
            <div className="h-9 w-9 animate-pulse rounded-full bg-muted/50" />
          </div>
        </div>
      </div>

      <main className="relative mx-auto max-w-7xl space-y-8 px-6 py-8">
        <div className="grid gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              key={index}
              className="rounded-xl border border-border/60 bg-card/50 p-6 backdrop-blur-sm"
            >
              <div className="flex items-center gap-4">
                <div className="h-11 w-11 animate-pulse rounded-md bg-muted/60" />
                <div className="space-y-2">
                  <div className="h-3 w-24 animate-pulse rounded bg-muted/40" />
                  <div className="h-7 w-12 animate-pulse rounded bg-muted/60" />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <div className="h-5 w-32 animate-pulse rounded bg-muted/60" />
              <div className="h-3 w-72 max-w-full animate-pulse rounded bg-muted/40" />
            </div>
            <div className="h-10 w-32 animate-pulse rounded-md bg-primary/20" />
          </div>
          <div className="rounded-xl border border-border/60 bg-card/40 p-12">
            <div className="mx-auto flex max-w-sm flex-col items-center gap-4">
              <div className="h-16 w-16 animate-pulse rounded-full bg-muted/50" />
              <div className="h-4 w-40 animate-pulse rounded bg-muted/60" />
              <div className="h-3 w-56 animate-pulse rounded bg-muted/40" />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
