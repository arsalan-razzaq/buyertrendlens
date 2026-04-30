import { memo, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { dataHttp, getErrorMessage } from '../api/http';

const textFields = [
  { key: 'search', label: 'Search by Title', placeholder: 'Account title or keyword' },
  { key: 'priceMin', label: 'Min Price', placeholder: '0' },
  { key: 'priceMax', label: 'Max Price', placeholder: '100' },
  { key: 'rating', label: 'Minimum Rating', placeholder: '4.5' },
  { key: 'userLevel', label: 'Minimum User Level', placeholder: '50' },
  { key: 'score', label: 'Minimum Score', placeholder: '80' },
  { key: 'ordersSold', label: 'Minimum Orders Sold', placeholder: '250' }
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
  options,
  onChange,
  placeholder,
  searchPlaceholder,
  emptyLabel,
  loadingLabel,
  disabled = false
}) {
  const containerRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const deferredSearchQuery = useDeferredValue(searchQuery);

  useEffect(() => {
    if (!open) {
      setSearchQuery('');
    }
  }, [open, value]);

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

  const filteredOptions = useMemo(() => {
    const normalizedQuery = deferredSearchQuery.trim().toLowerCase();

    if (!normalizedQuery) {
      return options;
    }

    return options.filter((option) => option.toLowerCase().includes(normalizedQuery));
  }, [deferredSearchQuery, options]);

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

              {disabled ? (
                <div className="px-3 py-3 text-sm text-slate-400">{loadingLabel}</div>
              ) : filteredOptions.length ? (
                <>
                  {filteredOptions.map((option) => (
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
                  ))}
                </>
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

const FilterPanel = ({ filters, onChange, loading }) => {
  const [options, setOptions] = useState({ categories: [], games: [], sellers: [] });
  const [optionsLoading, setOptionsLoading] = useState(true);
  const [optionsError, setOptionsError] = useState('');
  const optionsCacheRef = useRef(new Map());

  useEffect(() => {
    let active = true;

    const loadOptions = async () => {
      setOptionsLoading(true);

      const cacheKey = JSON.stringify({
        category: filters.category || '',
        gameName: filters.gameName || '',
        sellerName: filters.sellerName || '',
        minSellerRank: filters.minSellerRank || ''
      });

      const cached = optionsCacheRef.current.get(cacheKey);
      if (cached) {
        setOptions(cached);
        setOptionsError('');
        setOptionsLoading(false);
        return;
      }

      try {
        const { data } = await dataHttp.get('/filter-options', {
          params: {
            category: filters.category,
            gameName: filters.gameName,
            sellerName: filters.sellerName,
            minSellerRank: filters.minSellerRank
          }
        });

        if (!active) {
          return;
        }

        const nextOptions = {
          categories: Array.isArray(data.categories) ? data.categories : [],
          games: Array.isArray(data.games)
            ? data.games
                .map((game) => (typeof game === 'string' ? game : game.name))
                .filter(Boolean)
            : [],
          sellers: Array.isArray(data.sellers) ? data.sellers : []
        };

        optionsCacheRef.current.set(cacheKey, nextOptions);
        setOptions(nextOptions);
        setOptionsError('');
      } catch (error) {
        if (!active) {
          return;
        }

        setOptions({ categories: [], games: [], sellers: [] });
        setOptionsError(getErrorMessage(error));
      } finally {
        if (active) {
          setOptionsLoading(false);
        }
      }
    };

    loadOptions();

    return () => {
      active = false;
    };
  }, [filters.category, filters.gameName, filters.sellerName, filters.minSellerRank]);

  useEffect(() => {
    if (filters.category && !options.categories.includes(filters.category)) {
      onChange('category', '');
    }
  }, [filters.category, onChange, options.categories]);

  useEffect(() => {
    if (filters.gameName && !options.games.includes(filters.gameName)) {
      onChange('gameName', '');
    }
  }, [filters.gameName, onChange, options.games]);

  useEffect(() => {
    if (filters.sellerName && !options.sellers.includes(filters.sellerName)) {
      onChange('sellerName', '');
    }
  }, [filters.sellerName, onChange, options.sellers]);

  return (
    <div className="panel relative z-20 p-4 sm:p-5">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="panel-title">Dataset Filters</h2>
          <p className="mt-1 text-sm text-slate-500">
            Slice the dataset before exporting rows. Changes apply automatically as you type or select.
          </p>
        </div>
      </div>

      {optionsError ? (
        <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          {optionsError}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <label>
          <span className="label">Search by Title</span>
          <input
            className="input"
            placeholder="Account title or keyword"
            value={filters.search}
            onChange={(event) => onChange('search', event.target.value)}
          />
        </label>

        <SearchableSelect
          label="Category"
          value={filters.category}
          options={options.categories}
          onChange={(nextValue) => {
            onChange('category', nextValue);
            onChange('gameName', '');
            onChange('sellerName', '');
          }}
          placeholder="Select Category"
          searchPlaceholder="Search category..."
          emptyLabel="No categories found."
          loadingLabel="Loading categories..."
          disabled={optionsLoading}
        />

        <SearchableSelect
          label="Game Name"
          value={filters.gameName}
          options={options.games}
          onChange={(nextValue) => {
            onChange('gameName', nextValue);
            onChange('sellerName', '');
          }}
          placeholder="Select Game"
          searchPlaceholder="Search game..."
          emptyLabel="No games found."
          loadingLabel="Loading games..."
          disabled={optionsLoading}
        />

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

        <SearchableSelect
          label="Seller Name"
          value={filters.sellerName}
          options={options.sellers}
          onChange={(nextValue) => onChange('sellerName', nextValue)}
          placeholder="Select Seller"
          searchPlaceholder="Search seller..."
          emptyLabel="No sellers found."
          loadingLabel="Loading sellers..."
          disabled={optionsLoading}
        />

        {textFields.filter((field) => !['search', 'ordersSold'].includes(field.key)).map((field) => (
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

        {/* <label>
          <span className="label">Group</span>
          <select
            className="input"
            value={filters.group}
            onChange={(event) => onChange('group', event.target.value)}
          >
            <option value="">Select Group</option>
            <option value="1">Yes</option>
            <option value="0">No</option>
          </select>
        </label> */}

        <label>
          <span className="label">Minimum Orders Sold</span>
          <input
            className="input"
            placeholder="250"
            value={filters.ordersSold}
            onChange={(event) => onChange('ordersSold', event.target.value)}
          />
        </label>
      </div>
    </div>
  );
};

export default FilterPanel;
