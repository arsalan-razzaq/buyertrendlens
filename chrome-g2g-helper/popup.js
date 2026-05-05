const sellerList = document.getElementById('sellerList');
const messageInput = document.getElementById('message');
const autoFillEnabled = document.getElementById('autoFillEnabled');
const autoSendEnabled = document.getElementById('autoSendEnabled');
const statusNode = document.getElementById('status');

const setStatus = (text) => {
  statusNode.textContent = text;
};

const readState = async () =>
  new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: 'g2g-helper:get-state' }, (response) => {
      resolve(response?.state || { sellers: [], currentIndex: 0, message: '', autoFillEnabled: true, autoSendEnabled: false });
    });
  });

const saveState = async () =>
  new Promise((resolve) => {
    chrome.runtime.sendMessage(
      {
        type: 'g2g-helper:save-state',
        payload: {
          sellersText: sellerList.value,
          message: messageInput.value,
          autoFillEnabled: autoFillEnabled.checked,
          autoSendEnabled: autoSendEnabled.checked
        }
      },
      (response) => resolve(response)
    );
  });

const renderState = async () => {
  const state = await readState();
  sellerList.value = state.sellers.map((item) => item.url).join('\n');
  messageInput.value = state.message || '';
  autoFillEnabled.checked = state.autoFillEnabled !== false;
  autoSendEnabled.checked = state.autoSendEnabled === true;

  if (!state.sellers.length) {
    setStatus('Queue is empty.');
    return;
  }

  const current = state.sellers[state.currentIndex];
  setStatus(`Current ${state.currentIndex + 1}/${state.sellers.length}: ${current?.sellerId || 'N/A'}`);
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

document.getElementById('saveButton').addEventListener('click', async () => {
  const response = await saveState();
  setStatus(response?.ok ? 'Queue saved.' : response?.error || 'Unable to save queue.');
  await renderState();
});

document.getElementById('openButton').addEventListener('click', async () => {
  await withSavedState(async () => {
    const response = await chrome.runtime.sendMessage({ type: 'g2g-helper:open-current' });
    setStatus(response?.ok ? 'Opened current seller chat.' : response?.error || 'Unable to open current seller.');
  });
});

document.getElementById('prevButton').addEventListener('click', async () => {
  await withSavedState(async () => {
    const response = await chrome.runtime.sendMessage({ type: 'g2g-helper:prev-seller' });
    setStatus(response?.ok ? 'Opened previous seller.' : response?.error || 'No previous seller available.');
  });
});

document.getElementById('nextButton').addEventListener('click', async () => {
  await withSavedState(async () => {
    const response = await chrome.runtime.sendMessage({ type: 'g2g-helper:next-seller' });
    setStatus(response?.ok ? 'Opened next seller.' : response?.error || 'No next seller available.');
  });
});

document.getElementById('fillButton').addEventListener('click', async () => {
  await withSavedState(async (state) => {
    const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    if (!tab?.id) {
      setStatus('No active tab found.');
      return;
    }

    chrome.tabs.sendMessage(
      tab.id,
      {
        type: 'g2g-helper:fill-message',
        payload: {
          message: state.message,
          autoSend: state.autoSendEnabled === true
        }
      },
      (response) => {
        if (chrome.runtime.lastError) {
          setStatus('Open a G2G chat tab first.');
          return;
        }

        if (response?.ok && response?.sent) {
          setStatus('Message filled and sent in current chat.');
          return;
        }

        setStatus(response?.ok ? 'Message filled in current chat.' : response?.error || 'Unable to fill message.');
      }
    );
  });
});

renderState().catch(() => {
  setStatus('Unable to load extension state.');
});
