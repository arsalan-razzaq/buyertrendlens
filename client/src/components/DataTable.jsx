import { formatCoins } from '../utils/format';

const formatCellValue = (value) => {
  if (value === undefined || value === null || value === '') {
    return '-';
  }

  if (typeof value === 'number') {
    return Number.isInteger(value) ? value.toLocaleString() : value.toLocaleString(undefined, { maximumFractionDigits: 2 });
  }

  return String(value);
};

const DataTable = ({ total, estimatedCost, currentBalance, loading, canExport, onExport }) => (
  <div className="panel overflow-hidden print-hidden">
    <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
      <div>
        <h2 className="panel-title">Export Summary</h2>
        <p className="mt-1 text-sm text-slate-500">
          Filtered row details are hidden here. Full matching product columns will be included only in the exported file.
        </p>
      </div>
      <button type="button" className="button-primary w-full sm:w-auto" onClick={onExport} disabled={loading || !total || !canExport}>
        {total ? `Export Data (${formatCoins(estimatedCost)})` : 'Export Data'}
      </button>
    </div>

    <div className="grid gap-4 px-4 py-5 sm:px-5 md:grid-cols-3">
      <div className="rounded-2xl bg-slate-50 p-4">
        <p className="text-xs uppercase tracking-wide text-slate-400">Filtered Rows</p>
        <p className="mt-1 text-2xl font-semibold text-ink">{loading ? '...' : total}</p>
      </div>
      <div className="rounded-2xl bg-slate-50 p-4">
        <p className="text-xs uppercase tracking-wide text-slate-400">Estimated Export Cost</p>
        <p className="mt-1 text-2xl font-semibold text-ink">{formatCoins(estimatedCost)}</p>
      </div>
      <div className="rounded-2xl bg-slate-50 p-4">
        <p className="text-xs uppercase tracking-wide text-slate-400">Current Balance</p>
        <p className="mt-1 text-2xl font-semibold text-ink">{formatCoins(currentBalance)}</p>
      </div>
    </div>

    {!loading && total && !canExport ? (
      <div className="border-t border-rose-100 bg-rose-50 px-4 py-4 text-sm text-rose-700 sm:px-5">
        Your wallet does not have enough coins. Please recharge your balance before exporting.
      </div>
    ) : null}

    {!loading && !total ? (
      <div className="border-t border-slate-100 px-4 py-4 text-sm text-slate-500 sm:px-5">
        No records found for the selected filters.
      </div>
    ) : null}

    {loading ? (
      <div className="border-t border-slate-100 px-4 py-8 text-sm text-slate-500 sm:px-5">
        Calculating filtered export summary...
      </div>
    ) : null}
  </div>
);

export default DataTable;
