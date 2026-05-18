const STORAGE_KEY = 'g2gChatHelperState';
const EDITOR_SELECTORS = [
  '.toastui-editor-ww-container .ProseMirror[contenteditable="true"]',
  '.ProseMirror[contenteditable="true"]',
  '[contenteditable="true"][role="textbox"]',
  '[contenteditable="true"]'
];
const SEND_BUTTON_SELECTORS = [
  'button[type="submit"]',
  'button.ant-btn-primary',
  'button[class*="send"]',
  '.chat-send button',
  '.message-send button',
  '[role="button"]'
];

const sleep = (ms) => new Promise((resolve) => window.setTimeout(resolve, ms));

const getCurrentSellerId = () => window.location.hash.match(/\/user\/(\d+)/i)?.[1] || '';
let lastAutoSentKey = '';

const setDebugFlag = (value) => {
  document.documentElement.setAttribute('data-g2g-helper-status', value);
};

const formatOutgoingMessage = (value) =>
  String(value || '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .map((line) => line.trimEnd())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

const personalizeMessage = (template, sellerName) => {
  const normalizedName = String(sellerName || '').trim();
  return String(template || '')
    .replace(/\{name\}/gi, normalizedName)
    .replace(/\{seller_name\}/gi, normalizedName);
};

const buildNextNavigationUrl = (url) => {
  try {
    const parsed = new URL(url);
    parsed.searchParams.set('g2gHelperNav', String(Date.now()));
    return parsed.toString();
  } catch (error) {
    return url;
  }
};

const getState = async () => {
  const result = await chrome.storage.local.get(STORAGE_KEY);
  return result[STORAGE_KEY] || null;
};

const findEditor = () => {
  for (const selector of EDITOR_SELECTORS) {
    const editor = document.querySelector(selector);
    if (editor && isVisible(editor)) {
      return editor;
    }
  }

  return null;
};
const isVisible = (element) => {
  if (!element) {
    return false;
  }

  const style = window.getComputedStyle(element);
  return style.display !== 'none' && style.visibility !== 'hidden' && element.offsetParent !== null;
};

const isDisabled = (element) =>
  !element ||
  element.disabled ||
  element.getAttribute('aria-disabled') === 'true' ||
  element.classList.contains('disabled');

const findSendButton = () => {
  for (const selector of SEND_BUTTON_SELECTORS) {
    const candidates = Array.from(document.querySelectorAll(selector));
    const matched = candidates.find((button) => {
      if (!isVisible(button) || isDisabled(button)) {
        return false;
      }

      const text = String(button.textContent || '').trim().toLowerCase();
      const ariaLabel = String(button.getAttribute('aria-label') || '').trim().toLowerCase();
      return !text || text.includes('send') || ariaLabel.includes('send');
    });

    if (matched) {
      return matched;
    }
  }

  return Array.from(document.querySelectorAll('button')).find((button) => {
    if (!isVisible(button) || isDisabled(button)) {
      return false;
    }

    const text = String(button.textContent || '').trim().toLowerCase();
    const ariaLabel = String(button.getAttribute('aria-label') || '').trim().toLowerCase();
    return text === 'send' || ariaLabel === 'send';
  }) || null;
};

const setEditorText = (editor, message) => {
  const formattedMessage = formatOutgoingMessage(message);
  editor.focus();

  const selection = window.getSelection();
  const range = document.createRange();
  range.selectNodeContents(editor);
  selection.removeAllRanges();
  selection.addRange(range);

  document.execCommand('selectAll', false, null);
  document.execCommand('insertText', false, formattedMessage);

  if (editor.innerText.trim() === formattedMessage) {
    return true;
  }

  editor.innerHTML = '';
  const lines = formattedMessage.split('\n');

  lines.forEach((line, index) => {
    const paragraph = document.createElement('p');
    paragraph.textContent = line || '';
    editor.appendChild(paragraph);

    if (index === lines.length - 1) {
      return;
    }

    if (line === '' && lines[index + 1] === '') {
      return;
    }
  });
  editor.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: formattedMessage }));
  editor.dispatchEvent(new Event('change', { bubbles: true }));
  editor.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true, key: ' ' }));

  return editor.innerText.trim() === formattedMessage;
};

const waitForEditor = async (attempts = 30) => {
  for (let index = 0; index < attempts; index += 1) {
    const editor = findEditor();
    if (editor) {
      return editor;
    }

    await sleep(500);
  }

  return null;
};

const waitForSendButton = async (attempts = 30) => {
  for (let index = 0; index < attempts; index += 1) {
    const button = findSendButton();
    if (button) {
      return button;
    }

    await sleep(500);
  }

  return null;
};

const sendCurrentChat = async () => {
  const sendButton = await waitForSendButton();
  const editor = findEditor();

  if (sendButton) {
    sendButton.focus();
    sendButton.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    sendButton.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
    sendButton.click();
    return true;
  }

  if (!editor) {
    return false;
  }

  editor.focus();
  editor.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Enter', code: 'Enter' }));
  editor.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true, key: 'Enter', code: 'Enter' }));
  return true;
};

const advanceAfterSend = async () =>
  new Promise((resolve) => {
    chrome.storage.local.get(STORAGE_KEY, (result) => {
      const state = result?.[STORAGE_KEY];
      const sellers = Array.isArray(state?.sellers) ? state.sellers : [];
      const currentIndex = Number(state?.currentIndex) || 0;
      const nextIndex = currentIndex + 1;
      const nextSeller = sellers[nextIndex];

      if (!nextSeller?.url) {
        setDebugFlag('done');
        resolve(false);
        return;
      }

      const nextState = {
        ...state,
        currentIndex: nextIndex
      };

      chrome.storage.local.set({ [STORAGE_KEY]: nextState }, () => {
        if (chrome.runtime.lastError) {
          setDebugFlag('save-next-failed');
          resolve(false);
          return;
        }

        setDebugFlag(`next:${nextIndex + 1}`);
        window.top.location.href = buildNextNavigationUrl(nextSeller.url);
        resolve(true);
      });
    });
  });

const autoFillCurrentChat = async () => {
  const state = await getState();
  if (!state?.autoFillEnabled || !state?.message) {
    return;
  }

  const sellerId = getCurrentSellerId();
  const current = state.sellers?.[state.currentIndex];

  if (!sellerId || !current || current.sellerId !== sellerId) {
    return;
  }

  const personalizedMessage = personalizeMessage(state.message, current.sellerName);

  const editor = await waitForEditor();
  if (!editor) {
    return;
  }

  const currentMessage = editor.innerText.trim();
  const targetMessage = formatOutgoingMessage(personalizedMessage);
  const autoSendKey = `${sellerId}:${targetMessage}`;

  if (currentMessage !== targetMessage) {
    setEditorText(editor, personalizedMessage);
  }

  if (!state.autoSendEnabled || lastAutoSentKey === autoSendKey) {
    return;
  }

  await sleep(250);
  const sent = await sendCurrentChat();
  if (sent) {
    setDebugFlag('sent');
    lastAutoSentKey = autoSendKey;
    await sleep(900);
    await advanceAfterSend();
  }
};

const scheduleAutoFill = (delay = 1200) => {
  window.setTimeout(() => {
    autoFillCurrentChat().catch(() => {});
  }, delay);
};

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type !== 'g2g-helper:fill-message') {
    return false;
  }

  (async () => {
    const editor = await waitForEditor();
    if (!editor) {
      sendResponse({ ok: false, error: 'Editor not found.' });
      return;
    }

    const successful = setEditorText(editor, String(message.payload?.message || ''));
    if (!successful) {
      sendResponse({ ok: false, error: 'Unable to fill editor.' });
      return;
    }

    if (message.payload?.autoSend !== true) {
      sendResponse({ ok: true, sent: false });
      return;
    }

    await sleep(250);
    const sent = await sendCurrentChat();
    if (sent) {
      await sleep(900);
      await advanceAfterSend();
    }

    sendResponse({ ok: sent, sent, error: sent ? '' : 'Send action not available.' });
  })();

  return true;
});

window.addEventListener('load', () => {
  scheduleAutoFill(1200);
});

window.addEventListener('hashchange', () => {
  scheduleAutoFill(1200);
});

const observer = new MutationObserver(() => {
  if (!findEditor()) {
    return;
  }

  observer.disconnect();
  scheduleAutoFill(250);
});

observer.observe(document.documentElement, {
  childList: true,
  subtree: true
});
