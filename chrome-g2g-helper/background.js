const STORAGE_KEY = 'g2gChatHelperState';
const USER_URL_PREFIX = 'https://www.g2g.com/chat/#/user/';

const getState = async () => {
  const result = await chrome.storage.local.get(STORAGE_KEY);
  return (
    result[STORAGE_KEY] || {
      sellers: [],
      currentIndex: 0,
      message: '',
      autoFillEnabled: true,
      autoSendEnabled: false
    }
  );
};

const setState = async (nextState) => {
  await chrome.storage.local.set({ [STORAGE_KEY]: nextState });
  return nextState;
};

const normalizeSellerEntry = (value) => {
  const trimmed = String(value || '').trim();
  if (!trimmed) {
    return null;
  }

  if (/^https:\/\/www\.g2g\.com\/chat\/#\/user\/\d+/i.test(trimmed)) {
    const sellerId = trimmed.match(/\/user\/(\d+)/i)?.[1];
    return sellerId ? { sellerId, url: `${USER_URL_PREFIX}${sellerId}` } : null;
  }

  if (/^\d+$/.test(trimmed)) {
    return { sellerId: trimmed, url: `${USER_URL_PREFIX}${trimmed}` };
  }

  return null;
};

const updateActiveTab = async (url) => {
  const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });

  if (tab?.id) {
    await chrome.tabs.update(tab.id, { url });
    return tab.id;
  }

  const createdTab = await chrome.tabs.create({ url, active: true });
  return createdTab.id;
};

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get(STORAGE_KEY, (result) => {
    if (!result[STORAGE_KEY]) {
      chrome.storage.local.set({
        [STORAGE_KEY]: {
          sellers: [],
          currentIndex: 0,
          message: '',
          autoFillEnabled: true,
          autoSendEnabled: false
        }
      });
    }
  });
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  (async () => {
    if (message.type === 'g2g-helper:get-state') {
      sendResponse({ ok: true, state: await getState() });
      return;
    }

    if (message.type === 'g2g-helper:save-state') {
      const sellers = String(message.payload?.sellersText || '')
        .split(/\r?\n/)
        .map(normalizeSellerEntry)
        .filter(Boolean);

      const currentIndex = Math.min(
        Math.max(Number(message.payload?.currentIndex) || 0, 0),
        Math.max(sellers.length - 1, 0)
      );

      const nextState = await setState({
        sellers,
        currentIndex,
        message: String(message.payload?.message || ''),
        autoFillEnabled: message.payload?.autoFillEnabled !== false,
        autoSendEnabled: message.payload?.autoSendEnabled === true
      });

      sendResponse({ ok: true, state: nextState });
      return;
    }

    if (message.type === 'g2g-helper:open-current') {
      const state = await getState();
      const current = state.sellers[state.currentIndex];

      if (!current) {
        sendResponse({ ok: false, error: 'No seller selected.' });
        return;
      }

      const tabId = await updateActiveTab(current.url);
      sendResponse({ ok: true, tabId, state });
      return;
    }

    if (message.type === 'g2g-helper:next-seller') {
      const state = await getState();
      const nextIndex = Math.min(state.currentIndex + 1, Math.max(state.sellers.length - 1, 0));
      const nextState = await setState({ ...state, currentIndex: nextIndex });
      const current = nextState.sellers[nextState.currentIndex];

      if (!current) {
        sendResponse({ ok: false, error: 'No next seller found.', state: nextState });
        return;
      }

      const tabId = await updateActiveTab(current.url);
      sendResponse({ ok: true, tabId, state: nextState });
      return;
    }

    if (message.type === 'g2g-helper:prev-seller') {
      const state = await getState();
      const nextIndex = Math.max(state.currentIndex - 1, 0);
      const nextState = await setState({ ...state, currentIndex: nextIndex });
      const current = nextState.sellers[nextState.currentIndex];

      if (!current) {
        sendResponse({ ok: false, error: 'No previous seller found.', state: nextState });
        return;
      }

      const tabId = await updateActiveTab(current.url);
      sendResponse({ ok: true, tabId, state: nextState });
      return;
    }

    if (message.type === 'g2g-helper:set-index') {
      const state = await getState();
      const requestedIndex = Math.min(
        Math.max(Number(message.payload?.currentIndex) || 0, 0),
        Math.max(state.sellers.length - 1, 0)
      );
      const nextState = await setState({ ...state, currentIndex: requestedIndex });
      sendResponse({ ok: true, state: nextState });
      return;
    }

    sendResponse({ ok: false, error: 'Unsupported action.' });
  })();

  return true;
});
