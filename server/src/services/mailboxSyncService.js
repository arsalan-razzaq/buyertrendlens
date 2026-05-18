const { normalizeMailboxCache, syncMailboxInbox } = require('./mailboxService');

const DEFAULT_SYNC_INTERVAL_MS = 15000;

let syncTimer = null;
let syncRunning = false;

const getSyncInterval = () =>
  Math.max(Number(process.env.MAILBOX_SYNC_INTERVAL_MS) || DEFAULT_SYNC_INTERVAL_MS, 10000);

const runMailboxSync = async () => {
  if (syncRunning) {
    return;
  }

  syncRunning = true;

  try {
    const result = await syncMailboxInbox({ emitNotifications: true });

    if (result.created) {
      console.log(`Mailbox sync imported ${result.created} new email(s).`);
    }
  } catch (error) {
    console.error('Mailbox sync failed:', error.message);
  } finally {
    syncRunning = false;
  }
};

const startMailboxSync = async () => {
  if (syncTimer) {
    return;
  }

  await normalizeMailboxCache();
  await runMailboxSync();
  syncTimer = setInterval(runMailboxSync, getSyncInterval());
};

module.exports = {
  startMailboxSync
};
