import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { dataHttp, getErrorMessage } from '../api/http';

const OPTION_FETCH_DEBOUNCE_MS = 120;
const INITIAL_REMOTE_OPTION_LIMIT = 20;
const SEARCH_REMOTE_OPTION_LIMIT = 100;
const OPTION_VISIBLE_LIMIT = 120;

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

const EyeIcon = () => (
  <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" aria-hidden="true">
    <path
      d="M2.2 10C3.84 6.88 6.7 5.25 10 5.25C13.3 5.25 16.16 6.88 17.8 10C16.16 13.12 13.3 14.75 10 14.75C6.7 14.75 3.84 13.12 2.2 10Z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinejoin="round"
    />
    <circle cx="10" cy="10" r="2.25" stroke="currentColor" strokeWidth="1.5" />
  </svg>
);

const normalizeOptionText = (value) => String(value || '').trim().toLowerCase();

const matchesSearchQuery = (option, query, matchFromStart = false) => {
  const normalizedOption = normalizeOptionText(option);
  const normalizedQuery = normalizeOptionText(query);

  if (!normalizedQuery) {
    return true;
  }

  return matchFromStart
    ? normalizedOption.startsWith(normalizedQuery)
    : normalizedOption.includes(normalizedQuery);
};

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
  initialOptions = [],
  clientSearch = true,
  fetchOnOpen = true,
  remoteSearchMinLength = 0,
  remoteSearchHint = '',
  matchFromStart = false,
  disabled = false,
  tourId = ''
}) {
  const containerRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [options, setOptions] = useState(() => Array.from(new Set([value, ...initialOptions].filter(Boolean))));
  const [optionsLoading, setOptionsLoading] = useState(false);
  const [optionsError, setOptionsError] = useState('');
  const [optionsReady, setOptionsReady] = useState(Boolean(initialOptions.length || value));

  useEffect(() => {
    if (!open) {
      setSearchQuery('');
      setOptionsError('');
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
    setOptions(Array.from(new Set([value, ...initialOptions].filter(Boolean))));
    setOptionsError('');
    setOptionsReady(Boolean(initialOptions.length || value));
  }, [initialOptions, queryKey, value]);

  const trimmedSearchQuery = searchQuery.trim();
  const remoteSearchQuery = clientSearch ? '' : trimmedSearchQuery;
  const shouldFetchRemotely = !clientSearch || !optionsReady || !options.length;
  const canRunRemoteSearch =
    clientSearch ||
    fetchOnOpen ||
    remoteSearchQuery.length >= remoteSearchMinLength ||
    (!trimmedSearchQuery && options.length > 0);

  useEffect(() => {
    if (!open || disabled) {
      return undefined;
    }

    if (!shouldFetchRemotely) {
      setOptionsLoading(false);
      setOptionsError('');
      return undefined;
    }

    if (!canRunRemoteSearch) {
      setOptionsLoading(false);
      setOptionsError('');
      return undefined;
    }

    let active = true;
    const timer = window.setTimeout(async () => {
      setOptionsLoading(true);
      setOptionsError('');

      try {
        const nextOptions = await loadOptions(remoteSearchQuery);

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
  }, [canRunRemoteSearch, disabled, loadOptions, open, queryKey, remoteSearchQuery, shouldFetchRemotely, value]);

  const visibleOptions = options
    .filter((option) => matchesSearchQuery(option, trimmedSearchQuery, matchFromStart))
    .slice(0, OPTION_VISIBLE_LIMIT);
  const shouldShowRemoteHint = !clientSearch && !canRunRemoteSearch && !visibleOptions.length && remoteSearchHint;

  return (
    <label className={open ? 'relative z-40' : 'relative'} data-tour-id={tourId || undefined}>
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

              {optionsLoading && !visibleOptions.length ? (
                <div className="px-3 py-3 text-sm text-slate-400">{loadingLabel}</div>
              ) : shouldShowRemoteHint ? (
                <div className="px-3 py-3 text-sm text-slate-400">{remoteSearchHint}</div>
              ) : visibleOptions.length ? (
                visibleOptions.map((option) => (
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

const FilterPanel = ({ dataset = 'g2g', filters, onChange, onReset, onOpenTour, loading }) => {
  const optionsCacheRef = useRef(new Map());
  const pendingOptionsRef = useRef(new Map());
  const tourMenuRef = useRef(null);
  const isEldorado = dataset === 'eldorado';
  const [tourMenuOpen, setTourMenuOpen] = useState(false);

  useEffect(() => {
    optionsCacheRef.current.clear();
    pendingOptionsRef.current.clear();
  }, [dataset, isEldorado]);

  useEffect(() => {
    setTourMenuOpen(false);
  }, [dataset]);

  useEffect(() => {
    if (!tourMenuOpen) {
      return undefined;
    }

    const handlePointerDown = (event) => {
      if (!tourMenuRef.current?.contains(event.target)) {
        setTourMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
    };
  }, [tourMenuOpen]);

  const buildOptionParams = useCallback((field, searchQuery = '') => {
    const normalizedSearchQuery = String(searchQuery || '').trim();
    const params = {
      dataset,
      field,
      limit: normalizedSearchQuery ? SEARCH_REMOTE_OPTION_LIMIT : INITIAL_REMOTE_OPTION_LIMIT,
      category: filters.category || '',
      gameName: filters.gameName || '',
      sellerName: filters.sellerName || '',
      minSellerRank: filters.minSellerRank || ''
    };

    if (field === 'category') {
      params.categorySearch = normalizedSearchQuery;
      params.gameName = '';
      params.sellerName = '';
    } else if (field === 'game') {
      params.gameSearch = normalizedSearchQuery;
      params.sellerName = '';
    } else if (field === 'seller') {
      params.sellerSearch = normalizedSearchQuery;
    }

    return params;
  }, [dataset, filters.category, filters.gameName, filters.minSellerRank, filters.sellerName]);

  const getOptionCacheKey = useCallback((field, searchQuery = '') => JSON.stringify({ field, ...buildOptionParams(field, searchQuery) }), [buildOptionParams]);

  const fetchOptionList = useCallback(async (field, searchQuery = '') => {
    const params = buildOptionParams(field, searchQuery);
    const cacheKey = getOptionCacheKey(field, searchQuery);
    const cached = optionsCacheRef.current.get(cacheKey);
    if (cached) {
      return cached;
    }

    const pending = pendingOptionsRef.current.get(cacheKey);
    if (pending) {
      return pending;
    }

    const request = dataHttp
      .get('/filter-options', { params })
      .then(({ data }) => {
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

        const dedupedOptions = Array.from(new Set(resolvedOptions));
        optionsCacheRef.current.set(cacheKey, dedupedOptions);
        return dedupedOptions;
      })
      .finally(() => {
        pendingOptionsRef.current.delete(cacheKey);
      });

    pendingOptionsRef.current.set(cacheKey, request);
    return request;
  }, [buildOptionParams, getOptionCacheKey]);

  const getCachedOptions = useCallback((field, searchQuery = '') => {
    const cacheKey = getOptionCacheKey(field, searchQuery);
    const cached = optionsCacheRef.current.get(cacheKey);
    return Array.isArray(cached) ? cached : [];
  }, [getOptionCacheKey]);

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

  useEffect(() => {
    if (!filters.category) {
      return;
    }

    fetchOptionList('game', '').catch(() => {});
  }, [fetchOptionList, filters.category]);

  useEffect(() => {
    if (!filters.category && !filters.gameName && !filters.minSellerRank) {
      return;
    }

    fetchOptionList('seller', '').catch(() => {});
  }, [fetchOptionList, filters.category, filters.gameName, filters.minSellerRank]);

  return (
    <div className="panel relative z-20 p-4 sm:p-5">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="panel-title">Dataset Filters</h2>
          {/* <p className="mt-1 text-sm text-slate-500">
            {isEldorado
              ? 'Eldorado filters are now mapped to the dedicated Eldorado backend on the VPS.'
              : 'Slice the dataset before exporting rows. Changes apply automatically as you type or select.'}
          </p> */}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative" ref={tourMenuRef}>
            <button
              type="button"
              className="flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition hover:border-slate-300 hover:text-slate-700"
              onClick={() => setTourMenuOpen((current) => !current)}
              aria-label="Open tour options"
              aria-haspopup="menu"
              aria-expanded={tourMenuOpen}
            >
              <EyeIcon />
            </button>

            {tourMenuOpen ? (
              <div className="absolute right-0 top-[calc(100%+0.5rem)] z-30 min-w-[180px] rounded-2xl border border-slate-200 bg-white p-2 shadow-xl">
                <button
                  type="button"
                  className="flex w-full items-center rounded-xl px-3 py-2.5 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                  onClick={() => {
                    setTourMenuOpen(false);
                    onOpenTour();
                  }}
                >
                  Start guide tour
                </button>
              </div>
            ) : null}
          </div>
          <button type="button" className="button-secondary" onClick={onReset} disabled={loading}>
            Reset filters
          </button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <label data-tour-id="search-filter">
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
          initialOptions={getCachedOptions('category')}
          clientSearch
          disabled={false}
          tourId="category-filter"
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
          initialOptions={getCachedOptions('game')}
          clientSearch={false}
          fetchOnOpen={Boolean(filters.category)}
          remoteSearchMinLength={0}
          matchFromStart
          disabled={false}
          tourId="game-filter"
        />

        {!isEldorado ? (
          <label data-tour-id="seller-rank-filter">
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
          <label className="flex items-end" data-tour-id="verified-filter">
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
          initialOptions={getCachedOptions('seller')}
          clientSearch={false}
          fetchOnOpen={Boolean(filters.category || filters.gameName || filters.minSellerRank)}
          remoteSearchMinLength={1}
          remoteSearchHint="Type at least 1 character to search sellers."
          matchFromStart
          disabled={false}
          tourId="seller-filter"
        />

        {(isEldorado ? eldoradoTextFields : g2gTextFields).map((field) => (
          <label key={field.key} data-tour-id={field.key === 'priceMin' ? 'numeric-filters' : undefined}>
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
