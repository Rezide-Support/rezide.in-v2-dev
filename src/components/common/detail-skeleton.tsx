export function DetailSkeleton() {
  return (
    <div className="animate-pulse px-4 pt-5 pb-20 md:px-8" aria-busy="true" aria-label="Loading">
      <div className="mx-auto flex max-w-[1280px] flex-col gap-6">
        <div className="h-4 w-64 rounded bg-rez-cloud" />
        <div className="h-[300px] rounded-xl bg-rez-cloud md:h-[460px]" />
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_400px]">
          <div className="flex flex-col gap-4">
            <div className="h-9 w-2/3 rounded bg-rez-cloud" />
            <div className="h-5 w-1/3 rounded bg-rez-cloud" />
            <div className="h-40 rounded-lg bg-rez-cloud" />
          </div>
          <div className="h-[420px] rounded-xl bg-rez-cloud" />
        </div>
      </div>
    </div>
  );
}
