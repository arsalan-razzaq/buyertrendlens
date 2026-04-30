const StatCard = ({ title, value, helper, accent = 'bg-brand-600', icon = null }) => (
  <div className="panel p-4 sm:p-5">
    <div className="flex items-start gap-3 sm:items-center sm:gap-4">
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-white sm:h-11 sm:w-11 ${accent}`}>
        {icon}
      </div>
      <div>
        <p className="text-sm text-slate-500">{title}</p>
        <h3 className="text-xl font-semibold text-ink sm:text-2xl">{value}</h3>
      </div>
    </div>
    {helper ? <p className="mt-4 text-sm text-slate-500">{helper}</p> : null}
  </div>
);

export default StatCard;
