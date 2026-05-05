const StatCard = ({ title, value, helper, accent = 'bg-brand-600', icon = null, loading = false }) => (
  <div className="panel p-4 sm:p-5">
    <div className="flex items-start gap-3 sm:items-center sm:gap-4">
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-white sm:h-11 sm:w-11 ${accent} ${loading ? 'animate-pulse opacity-80' : ''}`}>
        {icon}
      </div>
      <div>
        <p className="text-sm text-slate-500">{title}</p>
        {loading ? (
          <div className="mt-2 h-8 w-28 animate-pulse rounded-full bg-slate-200/80" />
        ) : (
          <h3 className="text-xl font-semibold text-ink sm:text-2xl">{value}</h3>
        )}
      </div>
    </div>
    {helper ? (
      loading ? (
        <div className="mt-4 space-y-2">
          <div className="h-3 w-full animate-pulse rounded-full bg-slate-200/70" />
          <div className="h-3 w-4/5 animate-pulse rounded-full bg-slate-100" />
        </div>
      ) : (
        <p className="mt-4 text-sm text-slate-500">{helper}</p>
      )
    ) : null}
  </div>
);

export default StatCard;
