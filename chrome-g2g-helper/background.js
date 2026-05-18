const STORAGE_KEY = 'g2gChatHelperState';

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get(STORAGE_KEY, (result) => {
    if (result?.[STORAGE_KEY]) {
      return;
    }

    chrome.storage.local.set({
      [STORAGE_KEY]: {
        sellers: [],
        currentIndex: 0,
        message: '',
        autoFillEnabled: true,
        autoSendEnabled: true
      }
    });
  });
});
