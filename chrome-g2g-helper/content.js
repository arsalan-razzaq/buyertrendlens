const STORAGE_KEY = 'g2gChatHelperState';
const EDITOR_SELECTOR = '.toastui-editor-ww-container .ProseMirror[contenteditable="true"]';
const SEND_BUTTON_SELECTORS = [
  'button[type="submit"]',
  'button.ant-btn-primary',
  'button[class*="send"]',
  '.chat-send button',
  '.message-send button'
];

const sleep = (ms) => new Promise((resolve) => window.setTimeout(resolve, ms));

const getCurrentSellerId = () => window.location.hash.match(/\/user\/(\d+)/i)?.[1] || '';
let lastAutoSentKey = '';

const getState = async () => {
  const result = await chrome.storage.local.get(STORAGE_KEY);
  return result[STORAGE_KEY] || null;
};

const findEditor = () => document.querySelector(EDITOR_SELECTOR);
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
      return !text || text.includes('send');
    });

    if (matched) {
      return matched;
    }
  }

  return Array.from(document.querySelectorAll('button')).find((button) => {
    if (!isVisible(button) || isDisabled(button)) {
      return false;
    }

    return String(button.textContent || '').trim().toLowerCase() === 'send';
  }) || null;
};

const setEditorText = (editor, message) => {
  editor.focus();

  const selection = window.getSelection();
  const range = document.createRange();
  range.selectNodeContents(editor);
  selection.removeAllRanges();
  selection.addRange(range);

  document.execCommand('selectAll', false, null);
  document.execCommand('insertText', false, message);

  if (editor.innerText.trim() === message.trim()) {
    return true;
  }

  editor.innerHTML = '';
  const paragraph = document.createElement('p');
  paragraph.textContent = message;
  editor.appendChild(paragraph);
  editor.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: message }));
  editor.dispatchEvent(new Event('change', { bubbles: true }));
  editor.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true, key: ' ' }));

  return editor.innerText.trim() === message.trim();
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
  if (!sendButton) {
    return false;
  }

  sendButton.focus();
  sendButton.click();
  return true;
};

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

  const editor = await waitForEditor();
  if (!editor) {
    return;
  }

  const currentMessage = editor.innerText.trim();
  const targetMessage = state.message.trim();
  const autoSendKey = `${sellerId}:${targetMessage}`;

  if (currentMessage !== targetMessage) {
    setEditorText(editor, state.message);
  }

  if (!state.autoSendEnabled || lastAutoSentKey === autoSendKey) {
    return;
  }

  await sleep(250);
  const sent = await sendCurrentChat();
  if (sent) {
    lastAutoSentKey = autoSendKey;
  }
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
    sendResponse({ ok: sent, sent, error: sent ? '' : 'Send button not found.' });
  })();

  return true;
});

window.addEventListener('load', () => {
  window.setTimeout(() => {
    autoFillCurrentChat().catch(() => {});
  }, 1200);
});

window.addEventListener('hashchange', () => {
  window.setTimeout(() => {
    autoFillCurrentChat().catch(() => {});
  }, 1200);
});
