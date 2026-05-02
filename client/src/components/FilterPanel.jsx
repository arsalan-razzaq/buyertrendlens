import { memo, useCallback, useDeferredValue, useEffect, useRef, useState } from 'react';
import { dataHttp, getErrorMessage } from '../api/http';

const OPTION_FETCH_DEBOUNCE_MS = 180;
const OPTION_RESULT_LIMIT = 80;

const g2gTextFields = [
  { key: 'priceMin', label: 'Min Price', placeholder: '0' },
  { key: 'priceMax', label: 'Max Price', placeholder: '100' },
  { key: 'rating', label: 'Minimum Rating', placeholder: '4.5' },
  { key: 'userLevel', label: 'Minimum User Level', placeholder: '50' },
  { key: 'score', label: 'Minimum Score', placeholder: '80' },
  { key: 'ordersSold', label: 'Minimum Orders Sold', placeholder: '250' }
];

const eldoradoTextFields = [
  { key: 'priceMin', label: 'Min Price', placeholder: '0' },
  { key: 'priceMax', label: 'Max Price', placeholder: '100' }
];

const SELLER_RANK_OPTIONS = [
  { value: '1', label: 'Normal Seller' },
  { value: '2', label: 'Common Seller' },
  { value: '3', label: 'Uncommon Seller' },
  { value: '4', label: 'Rare Seller' },
  { value: '5', label: 'Epic Seller' },
  { value: '6', label: 'Legendary Seller' }
];

const ChevronIcon = () => (
  <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4 text-slate-400" aria-hidden="true">
    <path d="M5 7.5L10 12.5L15 7.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const SearchableSelect = memo(function SearchableSelect({
  label,
  value,
  onChange,
  placeholder,
  searchPlaceholder,
  emptyLabel,
  loadingLabel,
  loadOptions,
  queryKey,
  disabled = false
}) {
  const containerRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const [options, setOptions] = useState(value ? [value] : []);
  const [optionsLoading, setOptionsLoading] = useState(false);
  const [optionsError, setOptionsError] = useState('');
  const [optionsReady, setOptionsReady] = useState(false);

  useEffect(() => {
    if (!open) {
      setSearchQuery('');
      setOptionsError('');
      setOptionsReady(false);
    }
  }, [open]);

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (!containerRef.current?.contains(event.target)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
    };
  }, []);

  useEffect(() => {
    if (!value) {
      return;
    }

    setOptions((current) => (current.includes(value) ? current : [value, ...current]));
  }, [value]);

  useEffect(() => {
    setOptions(value ? [value] : []);
    setOptionsError('');
    setOptionsReady(false);
  }, [queryKey, value]);

  useEffect(() => {
    if (!open || disabled) {
      return undefined;
    }

    let active = true;
    const timer = window.setTimeout(async () => {
      setOptions(value ? [value] : []);
      setOptionsLoading(true);
      setOptionsError('');
      setOptionsReady(false);

      try {
        const nextOptions = await loadOptions(deferredSearchQuery);

        if (!active) {
          return;
        }

        setOptions(value && !nextOptions.includes(value) ? [value, ...nextOptions] : nextOptions);
        setOptionsReady(true);
      } catch (error) {
        if (!active) {
          return;
        }

        setOptionsError(getErrorMessage(error));
      } finally {
        if (active) {
          setOptionsLoading(false);
        }
      }
    }, OPTION_FETCH_DEBOUNCE_MS);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [deferredSearchQuery, disabled, loadOptions, open, queryKey, value]);

  return (
    <label className={open ? 'relative z-40' : 'relative'}>
      <span className="label">{label}</span>
      <div ref={containerRef} className="relative">
        <button
          type="button"
          className="input flex items-center justify-between gap-3 text-left"
          onClick={() => !disabled && setOpen((current) => !current)}
          disabled={disabled}
        >
          <span className={value ? 'text-slate-700' : 'text-slate-400'}>{value || placeholder}</span>
          <ChevronIcon />
        </button>

        {open ? (
          <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-50 rounded-2xl border border-slate-200 bg-white p-3 shadow-xl">
            <input
              className="input py-2.5"
              placeholder={searchPlaceholder}
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              autoFocus
            />

            {optionsError ? (
              <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-700">
                {optionsError}
              </div>
            ) : null}

            <div className="mt-3 max-h-64 overflow-y-auto rounded-xl border border-slate-100">
              <button
                type="button"
                className="flex w-full items-center px-3 py-2.5 text-left text-sm text-slate-500 transition hover:bg-slate-50 hover:text-slate-700"
                onClick={() => {
                  onChange('');
                  setOpen(false);
                }}
              >
                Clear selection
              </button>

              {optionsLoading || !optionsReady ? (
                <div className="px-3 py-3 text-sm text-slate-400">{loadingLabel}</div>
              ) : options.length ? (
                options.map((option) => (
                  <button
                    key={option}
                    type="button"
                    className={`flex w-full items-center px-3 py-2.5 text-left text-sm transition ${
                      option === value ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800'
                    }`}
                    onClick={() => {
                      onChange(option);
                      setOpen(false);
                    }}
                  >
                    {option}
                  </button>
                ))
              ) : (
                <div className="px-3 py-3 text-sm text-slate-400">{emptyLabel}</div>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </label>
  );
});

const FilterPanel = ({ dataset = 'g2g', filters, onChange, loading }) => {
  const optionsCacheRef = useRef(new Map());
  const isEldorado = dataset === 'eldorado';

  useEffect(() => {
    optionsCacheRef.current.clear();
  }, [dataset, filters.category, filters.gameName, filters.minSellerRank]);

  const fetchOptionList = useCallback(async (field, searchQuery = '') => {
    const params = {
      dataset,
      limit: OPTION_RESULT_LIMIT,
      category: filters.category || '',
      gameName: filters.gameName || '',
      sellerName: filters.sellerName || '',
      minSellerRank: filters.minSellerRank || ''
    };

    if (field === 'category') {
      params.categorySearch = searchQuery;
      params.gameName = '';
      params.sellerName = '';
    } else if (field === 'game') {
      params.gameSearch = searchQuery;
      params.sellerName = '';
    } else if (field === 'seller') {
      params.sellerSearch = searchQuery;
    }

    const cacheKey = JSON.stringify({ field, ...params });
    const cached = optionsCacheRef.current.get(cacheKey);
    if (cached) {
      return cached;
    }

    const { data } = await dataHttp.get('/filter-options', { params });
    let resolvedOptions;

    if (field === 'category') {
      resolvedOptions = Array.isArray(data.categories) ? data.categories : [];
    } else if (field === 'game') {
      resolvedOptions = Array.isArray(data.games)
        ? data.games.map((game) => (typeof game === 'string' ? game : game.name)).filter(Boolean)
        : [];
    } else {
      resolvedOptions = Array.isArray(data.sellers) ? data.sellers : [];
    }

    optionsCacheRef.current.set(cacheKey, resolvedOptions);
    return resolvedOptions;
  }, [dataset, filters.category, filters.gameName, filters.minSellerRank, filters.sellerName]);

  const categoryQueryKey = JSON.stringify({
    dataset,
    minSellerRank: filters.minSellerRank || ''
  });

  const gameQueryKey = JSON.stringify({
    dataset,
    category: filters.category || '',
    minSellerRank: filters.minSellerRank || ''
  });

  const sellerQueryKey = JSON.stringify({
    dataset,
    category: filters.category || '',
    gameName: filters.gameName || '',
    minSellerRank: filters.minSellerRank || ''
  });

  return (
    <div className="panel relative z-20 p-4 sm:p-5">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="panel-title">Dataset Filters</h2>
          <p className="mt-1 text-sm text-slate-500">
            {isEldorado
              ? 'Eldorado filters are now mapped to the dedicated Eldorado backend on the VPS.'
              : 'Slice the dataset before exporting rows. Changes apply automatically as you type or select.'}
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <label>
          <span className="label">{isEldorado ? 'Search by Offer Title' : 'Search by Title'}</span>
          <input
            className="input"
            placeholder={isEldorado ? 'Offer title or keyword' : 'Account title or keyword'}
            value={filters.search}
            onChange={(event) => onChange('search', event.target.value)}
          />
        </label>

        <SearchableSelect
          label={isEldorado ? 'Category Type' : 'Category'}
          value={filters.category}
          onChange={(nextValue) => {
            onChange('category', nextValue);
            onChange('gameName', '');
            onChange('sellerName', '');
          }}
          loadOptions={(searchQuery) => fetchOptionList('category', searchQuery)}
          queryKey={categoryQueryKey}
          placeholder={isEldorado ? 'Select Category Type' : 'Select Category'}
          searchPlaceholder={isEldorado ? 'Search category type...' : 'Search category...'}
          emptyLabel="No categories found."
          loadingLabel="Loading categories..."
          disabled={loading}
        />

        <SearchableSelect
          label="Game Name"
          value={filters.gameName}
          onChange={(nextValue) => {
            onChange('gameName', nextValue);
            onChange('sellerName', '');
          }}
          loadOptions={(searchQuery) => fetchOptionList('game', searchQuery)}
          queryKey={gameQueryKey}
          placeholder="Select Game"
          searchPlaceholder="Search game..."
          emptyLabel="No games found."
          loadingLabel="Loading games..."
          disabled={loading}
        />

        {!isEldorado ? (
          <label>
            <span className="label">Seller Rank</span>
            <select
              className="input"
              value={filters.minSellerRank}
              onChange={(event) => {
                onChange('minSellerRank', event.target.value);
                onChange('sellerName', '');
              }}
            >
              <option value="">Select Rank</option>
              {SELLER_RANK_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <label className="flex items-end">
            <span className="flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={Boolean(filters.verifiedOnly)}
                onChange={(event) => onChange('verifiedOnly', event.target.checked)}
                className="h-4 w-4 rounded border-slate-300"
              />
              Verified sellers only
            </span>
          </label>
        )}

        <SearchableSelect
          key={`seller-${sellerQueryKey}`}
          label="Seller Name"
          value={filters.sellerName}
          onChange={(nextValue) => onChange('sellerName', nextValue)}
          loadOptions={(searchQuery) => fetchOptionList('seller', searchQuery)}
          queryKey={sellerQueryKey}
          placeholder="Select Seller"
          searchPlaceholder="Search seller..."
          emptyLabel="No sellers found."
          loadingLabel="Loading sellers..."
          disabled={loading}
        />

        {(isEldorado ? eldoradoTextFields : g2gTextFields).map((field) => (
          <label key={field.key}>
            <span className="label">{field.label}</span>
            <input
              className="input"
              placeholder={field.placeholder}
              value={filters[field.key]}
              onChange={(event) => onChange(field.key, event.target.value)}
            />
          </label>
        ))}
      </div>
    </div>
  );
};

export default FilterPanel;
