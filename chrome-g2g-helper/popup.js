const sellerList = document.getElementById('sellerList');
const csvFileInput = document.getElementById('csvFile');
const importButton = document.getElementById('importButton');
const messageInput = document.getElementById('message');
const queueMetaNode = document.getElementById('queueMeta');
const statusNode = document.getElementById('status');
const STORAGE_KEY = 'g2gChatHelperState';
const USER_URL_PREFIX = 'https://www.g2g.com/chat/#/user/';
const CSV_PREVIEW_LIMIT = 20;

let activeSellerEntries = [];
let queueSource = {
  mode: 'manual',
  fileName: ''
};

const setStatus = (text) => {
  statusNode.textContent = text;
};

const setQueueMeta = (text) => {
  queueMetaNode.textContent = text;
};

const normalizeSellerEntry = (value, sellerName = '') => {
  const trimmed = String(value || '').trim();
  const normalizedName = String(sellerName || '').trim();
  if (!trimmed) {
    return null;
  }

  if (/^https:\/\/www\.g2g\.com\/chat\/#\/user\/\d+/i.test(trimmed)) {
    const sellerId = trimmed.match(/\/user\/(\d+)/i)?.[1];
    return sellerId
      ? { sellerId, sellerName: normalizedName, url: `${USER_URL_PREFIX}${sellerId}` }
      : null;
  }

  if (/^\d+$/.test(trimmed)) {
    return { sellerId: trimmed, sellerName: normalizedName, url: `${USER_URL_PREFIX}${trimmed}` };
  }

  return null;
};

const dedupeSellers = (items) => {
  const seen = new Set();

  return items.filter((item) => {
    const sellerId = String(item?.sellerId || '').trim();
    if (!sellerId || seen.has(sellerId)) {
      return false;
    }

    seen.add(sellerId);
    return true;
  });
};

const parseManualSellerList = (value) =>
  dedupeSellers(
    String(value || '')
      .split(/\r?\n/)
      .map((item) => normalizeSellerEntry(item))
      .filter(Boolean)
  );

const parseCsvRows = (value) => {
  const text = String(value || '');
  const rows = [];
  let currentCell = '';
  let currentRow = [];
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const nextChar = text[index + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentCell += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (!inQuotes && (char === ',' || char === ';' || char === '\t')) {
      currentRow.push(currentCell);
      currentCell = '';
      continue;
    }

    if (!inQuotes && (char === '\n' || char === '\r')) {
      currentRow.push(currentCell);
      rows.push(currentRow);
      currentCell = '';
      currentRow = [];

      if (char === '\r' && nextChar === '\n') {
        index += 1;
      }
      continue;
    }

    currentCell += char;
  }

  if (currentCell || currentRow.length || text.endsWith(',') || text.endsWith('\n')) {
    currentRow.push(currentCell);
    rows.push(currentRow);
  }

  return rows
    .map((row) => row.map((cell) => String(cell || '').trim()))
    .filter((row) => row.some(Boolean));
};

const parseCsvSellerList = (value) =>
  dedupeSellers(
    parseCsvRows(value)
      .map((row, index) => {
        const [firstCell = '', secondCell = ''] = row;
        const firstLower = firstCell.toLowerCase();
        const secondLower = secondCell.toLowerCase();

        if (
          index === 0 &&
          (firstLower === 'seller_id' ||
            firstLower === 'id' ||
            secondLower === 'seller_name' ||
            secondLower === 'name')
        ) {
          return null;
        }

        return normalizeSellerEntry(firstCell, secondCell);
      })
      .filter(Boolean)
  );

const buildPreviewText = (sellers) => {
  const preview = sellers
    .slice(0, CSV_PREVIEW_LIMIT)
    .map((item) => (item.sellerName ? `${item.sellerId} | ${item.sellerName}` : item.sellerId))
    .join('\n');

  if (sellers.length <= CSV_PREVIEW_LIMIT) {
    return preview;
  }

  return `${preview}\n... and ${sellers.length - CSV_PREVIEW_LIMIT} more IDs`;
};

const updateSellerListView = () => {
  if (queueSource.mode === 'csv') {
    sellerList.value = buildPreviewText(activeSellerEntries);
    setQueueMeta(
      activeSellerEntries.length
        ? `CSV loaded: ${queueSource.fileName || 'Imported file'} | ${activeSellerEntries.length} seller IDs`
        : 'CSV file is loaded but no valid seller IDs were found.'
    );
    return;
  }

  sellerList.value = activeSellerEntries.map((item) => item.url).join('\n');
  setQueueMeta(
    activeSellerEntries.length
      ? `Manual queue: ${activeSellerEntries.length} seller IDs`
      : 'Manual input is active.'
  );
};

const readState = async () =>
  new Promise((resolve) => {
    chrome.storage.local.get(STORAGE_KEY, (result) => {
      resolve(
        result?.[STORAGE_KEY] || {
          sellers: [],
          currentIndex: 0,
          message: '',
          autoFillEnabled: true,
          autoSendEnabled: true,
          sourceMode: 'manual',
          sourceFileName: ''
        }
      );
    });
  });

const saveState = async () =>
  new Promise((resolve) => {
    const sellers =
      queueSource.mode === 'csv' && activeSellerEntries.length
        ? activeSellerEntries
        : parseManualSellerList(sellerList.value || '');

    activeSellerEntries = sellers;

    const nextState = {
      sellers,
      currentIndex: 0,
      message: String(messageInput.value || ''),
      autoFillEnabled: true,
      autoSendEnabled: true,
      sourceMode: queueSource.mode,
      sourceFileName: queueSource.fileName
    };

    chrome.storage.local.set(
      {
        [STORAGE_KEY]: nextState
      },
      () => {
        if (chrome.runtime.lastError) {
          resolve({ ok: false, error: chrome.runtime.lastError.message });
          return;
        }

        resolve({
          ok: true,
          state: nextState
        });
      }
    );
  });

const openCurrentSeller = async (state) =>
  new Promise((resolve) => {
    const current = state?.sellers?.[state.currentIndex];
    if (!current?.url) {
      resolve({ ok: false, error: 'No seller selected.' });
      return;
    }

    chrome.tabs.query({ active: true, lastFocusedWindow: true }, (tabs) => {
      const tab = tabs?.[0];
      if (chrome.runtime.lastError) {
        resolve({ ok: false, error: chrome.runtime.lastError.message });
        return;
      }

      if (tab?.id) {
        chrome.tabs.update(tab.id, { url: current.url }, () => {
          if (chrome.runtime.lastError) {
            resolve({ ok: false, error: chrome.runtime.lastError.message });
            return;
          }

          resolve({ ok: true });
        });
        return;
      }

      chrome.tabs.create({ url: current.url, active: true }, () => {
        if (chrome.runtime.lastError) {
          resolve({ ok: false, error: chrome.runtime.lastError.message });
          return;
        }

        resolve({ ok: true });
      });
    });
  });

const renderState = async () => {
  const state = await readState();
  activeSellerEntries = Array.isArray(state.sellers) ? state.sellers : [];
  queueSource = {
    mode: state.sourceMode === 'csv' ? 'csv' : 'manual',
    fileName: state.sourceFileName || ''
  };

  updateSellerListView();
  messageInput.value = state.message || '';

  if (!activeSellerEntries.length) {
    setStatus('Queue is empty.');
    return;
  }

  const current = activeSellerEntries[state.currentIndex];
  const currentLabel = current?.sellerName
    ? `${current.sellerId} | ${current.sellerName}`
    : current?.sellerId || 'N/A';
  setStatus(`Current ${state.currentIndex + 1}/${activeSellerEntries.length}: ${currentLabel}`);
};

const withSavedState = async (callback) => {
  const saveResponse = await saveState();
  if (!saveResponse?.ok) {
    setStatus(saveResponse?.error || 'Unable to save state.');
    return;
  }

  await callback(saveResponse.state);
  await renderState();
};

const importCsvFile = async () => {
  const file = csvFileInput.files?.[0];
  if (!file) {
    setStatus('Choose a CSV file first.');
    return;
  }

  const text = await file.text();
  const sellers = parseCsvSellerList(text);

  if (!sellers.length) {
    setStatus('No valid seller IDs or chat URLs found in the file.');
    return;
  }

  activeSellerEntries = sellers;
  queueSource = {
    mode: 'csv',
    fileName: file.name
  };
  updateSellerListView();
  setStatus(`Imported ${sellers.length} seller IDs from ${file.name}. Click Save Queue.`);
};

sellerList.addEventListener('input', () => {
  queueSource = {
    mode: 'manual',
    fileName: ''
  };
  activeSellerEntries = [];
  setQueueMeta('Manual input is active.');
});

importButton.addEventListener('click', () => {
  importCsvFile().catch(() => {
    setStatus('Unable to import the CSV file.');
  });
});

document.getElementById('saveButton').addEventListener('click', async () => {
  const response = await saveState();
  setStatus(response?.ok ? `Queue saved: ${response.state.sellers.length} sellers.` : response?.error || 'Unable to save queue.');
  await renderState();
});

document.getElementById('openButton').addEventListener('click', async () => {
  await withSavedState(async (state) => {
    const response = await openCurrentSeller(state);
    setStatus(response?.ok ? 'Started auto sending from current seller.' : response?.error || 'Unable to start sending.');
  });
});

renderState().catch(() => {
  setStatus('Unable to load extension state.');
});
