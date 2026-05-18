import { useEffect, useMemo, useState } from 'react';
import http, { getErrorMessage } from '../api/http';
import { useNotifications } from '../hooks/useNotifications';
import { downloadBlob, formatLocalDateTime } from '../utils/format';

const mailboxFolders = [
  { key: 'inbox', label: 'Inbox' },
  { key: 'sent', label: 'Sent' },
  { key: 'drafts', label: 'Drafts' }
];

const filterTabs = [
  { key: 'all', label: 'All mail' },
  { key: 'unread', label: 'Unread' },
  { key: 'read', label: 'Read' },
  { key: 'files', label: 'Files' }
];

const MailIcon = ({ className = 'h-4 w-4' }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M4 7.5A2.5 2.5 0 0 1 6.5 5h11A2.5 2.5 0 0 1 20 7.5v9A2.5 2.5 0 0 1 17.5 19h-11A2.5 2.5 0 0 1 4 16.5z" />
    <path d="m5 7 7 6 7-6" />
  </svg>
);

const SendIcon = ({ className = 'h-4 w-4' }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M3 11.5 20.5 4l-4.5 16-5.3-5.4L3 11.5Z" />
    <path d="m20.5 4-9.8 10.6" />
  </svg>
);

const DraftIcon = ({ className = 'h-4 w-4' }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M5 5.5A2.5 2.5 0 0 1 7.5 3h7L19 7.5v11a2.5 2.5 0 0 1-2.5 2.5h-9A2.5 2.5 0 0 1 5 18.5z" />
    <path d="M14 3v5h5" />
    <path d="M8.5 13h7" />
    <path d="M8.5 17h5" />
  </svg>
);

const SearchIcon = ({ className = 'h-4 w-4' }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="11" cy="11" r="6.5" />
    <path d="m16 16 4.5 4.5" />
  </svg>
);

const DownloadIcon = ({ className = 'h-4 w-4' }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 4v10" />
    <path d="m8.5 10.5 3.5 3.5 3.5-3.5" />
    <path d="M5 19h14" />
  </svg>
);

const ReplyIcon = ({ className = 'h-4 w-4' }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="m9 8-5 4 5 4" />
    <path d="M20 18c0-4.4-3.6-8-8-8H4" />
  </svg>
);

const ClockIcon = ({ className = 'h-4 w-4' }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="8" />
    <path d="M12 8v4l2.5 2.5" />
  </svg>
);

const UserIcon = ({ className = 'h-4 w-4' }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="8" r="3.5" />
    <path d="M5.5 19a6.5 6.5 0 0 1 13 0" />
  </svg>
);

const AttachmentIcon = ({ className = 'h-4 w-4' }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M15.5 7.5 9 14a3 3 0 1 0 4.2 4.2l7-7a5 5 0 1 0-7.1-7.1l-7.4 7.4a7 7 0 0 0 9.9 9.9l6.4-6.4" />
  </svg>
);

const ComposeIcon = ({ className = 'h-4 w-4' }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="m13.5 5.5 5 5" />
    <path d="M4 20l4.5-1 9-9a1.8 1.8 0 0 0 0-2.6l-1.9-1.9a1.8 1.8 0 0 0-2.6 0l-9 9z" />
  </svg>
);

const FilterIcon = ({ className = 'h-4 w-4' }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M4 6h16" />
    <path d="M7 12h10" />
    <path d="M10 18h4" />
  </svg>
);

const BackIcon = ({ className = 'h-4 w-4' }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="m14.5 6.5-5 5 5 5" />
    <path d="M10 11.5h9" />
  </svg>
);

const folderIcons = {
  inbox: MailIcon,
  sent: SendIcon,
  drafts: DraftIcon
};

const formatSenderLabel = (sender) => sender?.name || sender?.address || 'Unknown sender';

const formatFileSize = (value = 0) => {
  const size = Number(value) || 0;

  if (size >= 1024 * 1024) {
    return `${(size / (1024 * 1024)).toFixed(2)} MB`;
  }

  if (size >= 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }

  return `${size} B`;
};

const decodeBase64ToBlob = (contentBase64, contentType) => {
  const binary = window.atob(contentBase64);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return new Blob([bytes], { type: contentType || 'application/octet-stream' });
};

const folderEmptyStates = {
  inbox: 'No inbox emails found.',
  sent: 'No sent emails found.',
  drafts: 'No draft emails found.'
};

const MailboxPage = () => {
  const { socket, connected } = useNotifications();
  const [activeFolder, setActiveFolder] = useState('inbox');
  const [activeFilter, setActiveFilter] = useState('all');
  const [emails, setEmails] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 1
  });
  const [searchInput, setSearchInput] = useState('');
  const [activeQuery, setActiveQuery] = useState('');
  const [selectedEmailId, setSelectedEmailId] = useState('');
  const [selectedEmail, setSelectedEmail] = useState(null);
  const [replyBody, setReplyBody] = useState('');
  const [listLoading, setListLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [replySending, setReplySending] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const fetchEmails = async ({ page = 1, query = activeQuery, folder = activeFolder } = {}) => {
    setListLoading(true);
    setError('');

    try {
      const response = await http.get('/admin/mailbox/emails', {
        params: {
          folder,
          page,
          limit: 20,
          q: query || undefined
        }
      });

      setEmails(response.data.emails || []);
      setPagination(response.data.pagination || { page: 1, limit: 20, total: 0, totalPages: 1 });
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setListLoading(false);
    }
  };

  const fetchEmailDetail = async (emailId, folder = activeFolder) => {
    if (!emailId) {
      setSelectedEmailId('');
      setSelectedEmail(null);
      setReplyBody('');
      return;
    }

    setDetailLoading(true);
    setError('');

    try {
      const response = await http.get(`/admin/mailbox/emails/${emailId}`, {
        params: {
          folder
        }
      });
      setSelectedEmailId(String(emailId));
      setSelectedEmail(response.data.email);
      setReplyBody('');
      setEmails((current) =>
        current.map((email) =>
          String(email.id) === String(emailId)
            ? {
                ...email,
                isRead: true
              }
            : email
        )
      );
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setDetailLoading(false);
    }
  };

  useEffect(() => {
    fetchEmails({ page: 1, query: '', folder: 'inbox' });
  }, []);

  useEffect(() => {
    if (!socket) {
      return undefined;
    }

    const reloadMailbox = () => {
      fetchEmails({ page: pagination.page, query: activeQuery, folder: activeFolder });
    };

    const handleMailboxCreated = ({ email }) => {
      if (!email) {
        reloadMailbox();
        return;
      }

      if (email.folder !== activeFolder) {
        return;
      }

      if (activeQuery || pagination.page !== 1) {
        reloadMailbox();
        return;
      }

      setEmails((current) => {
        const next = [email, ...current.filter((item) => String(item.id) !== String(email.id))];
        return next.slice(0, pagination.limit);
      });
      setPagination((current) => ({
        ...current,
        total: current.total + 1,
        totalPages: Math.max(1, Math.ceil((current.total + 1) / current.limit))
      }));
    };

    const handleMailboxUpdated = ({ email }) => {
      if (!email) {
        reloadMailbox();
        return;
      }

      setEmails((current) =>
        current.map((item) => (String(item.id) === String(email.id) ? { ...item, ...email } : item))
      );

      setSelectedEmail((current) =>
        current && String(current.id) === String(email.id)
          ? {
              ...current,
              isRead: email.isRead ?? current.isRead,
              sender: email.sender || current.sender,
              replyTo: email.replyTo || current.replyTo,
              subject: email.subject || current.subject,
              date: email.date || current.date
            }
          : current
      );
    };

    socket.on('mailbox:email-created', handleMailboxCreated);
    socket.on('mailbox:email-updated', handleMailboxUpdated);

    return () => {
      socket.off('mailbox:email-created', handleMailboxCreated);
      socket.off('mailbox:email-updated', handleMailboxUpdated);
    };
  }, [socket, pagination.page, pagination.limit, activeQuery, activeFolder]);

  useEffect(() => {
    if (connected) {
      return undefined;
    }

    const fallbackTimer = window.setInterval(() => {
      fetchEmails({ page: pagination.page, query: activeQuery, folder: activeFolder });
    }, 15000);

    return () => window.clearInterval(fallbackTimer);
  }, [connected, pagination.page, activeQuery, activeFolder]);

  const visibleEmails = useMemo(() => {
    if (activeFilter === 'unread') {
      return emails.filter((email) => !email.isRead);
    }

    if (activeFilter === 'read') {
      return emails.filter((email) => email.isRead);
    }

    if (activeFilter === 'files') {
      return emails.filter((email) => email.hasAttachments);
    }

    return emails;
  }, [emails, activeFilter]);

  useEffect(() => {
    if (!visibleEmails.length) {
      setSelectedEmail(null);
      setSelectedEmailId('');
      setReplyBody('');
      return;
    }

    const selectedStillVisible = visibleEmails.some((email) => String(email.id) === String(selectedEmailId));

    if (!selectedStillVisible) {
      setSelectedEmail(null);
      setSelectedEmailId('');
      setReplyBody('');
    }
  }, [visibleEmails, selectedEmailId, activeFolder]);

  const selectedSummary = useMemo(
    () => visibleEmails.find((email) => String(email.id) === String(selectedEmailId)) || null,
    [visibleEmails, selectedEmailId]
  );

  const unreadCount = useMemo(() => emails.filter((email) => !email.isRead).length, [emails]);
  const isDetailView = Boolean(selectedEmail);

  const handleSearchSubmit = async (event) => {
    event.preventDefault();
    setActiveQuery(searchInput.trim());
    await fetchEmails({ page: 1, query: searchInput.trim(), folder: activeFolder });
  };

  const handleClearSearch = async () => {
    setSearchInput('');
    setActiveQuery('');
    await fetchEmails({ page: 1, query: '', folder: activeFolder });
  };

  const handlePageChange = async (nextPage) => {
    await fetchEmails({ page: nextPage, query: activeQuery, folder: activeFolder });
  };

  const handleFolderChange = async (folderKey) => {
    setActiveFolder(folderKey);
    setActiveFilter('all');
    setSelectedEmail(null);
    setSelectedEmailId('');
    setReplyBody('');
    await fetchEmails({ page: 1, query: activeQuery, folder: folderKey });
  };

  const handleReplySubmit = async (event) => {
    event.preventDefault();

    if (!selectedEmail?.id) {
      return;
    }

    setReplySending(true);
    setMessage('');
    setError('');

    try {
      const response = await http.post('/admin/mailbox/reply', {
        emailId: selectedEmail.id,
        replyBody
      });

      setMessage(response.data.message || 'Reply sent successfully.');
      setReplyBody('');
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setReplySending(false);
    }
  };

  const handleDownloadAttachment = (attachment) => {
    if (!attachment?.contentBase64) {
      return;
    }

    const blob = decodeBase64ToBlob(attachment.contentBase64, attachment.contentType);
    downloadBlob(attachment.filename, blob);
  };

  return (
    <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
      {message ? (
        <div className="border-b border-emerald-200 bg-emerald-50 px-5 py-3 text-sm text-emerald-700">{message}</div>
      ) : null}
      {error ? (
        <div className="border-b border-rose-200 bg-rose-50 px-5 py-3 text-sm text-rose-700">{error}</div>
      ) : null}

      <div className="grid min-h-[760px] lg:grid-cols-[248px_minmax(0,1fr)]">
        <aside className="border-b border-slate-200 bg-slate-50/80 px-4 py-5 lg:border-b-0 lg:border-r">
          <div className="flex items-center gap-3 px-2">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 text-white">
              <MailIcon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Admin</p>
              <h2 className="text-lg font-semibold tracking-[-0.03em] text-slate-950">Mailbox</h2>
            </div>
          </div>

          <button
            type="button"
            className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3.5 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            <ComposeIcon className="h-4 w-4" />
            New message
          </button>

          <div className="mt-6 space-y-1">
            {mailboxFolders.map((folder) => {
              const FolderIcon = folderIcons[folder.key] || MailIcon;
              const isActive = activeFolder === folder.key;
              const count = folder.key === 'inbox' ? unreadCount : null;

              return (
                <button
                  key={folder.key}
                  type="button"
                  className={`flex w-full items-center justify-between rounded-2xl px-3 py-3 text-left text-sm transition ${
                    isActive ? 'bg-white text-slate-950 shadow-sm ring-1 ring-slate-200' : 'text-slate-600 hover:bg-white hover:text-slate-950'
                  }`}
                  onClick={() => handleFolderChange(folder.key)}
                >
                  <span className="flex items-center gap-3">
                    <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${isActive ? 'bg-slate-950 text-white' : 'bg-white text-slate-500 ring-1 ring-slate-200'}`}>
                      <FolderIcon className="h-4 w-4" />
                    </span>
                    <span className="font-medium">{folder.label}</span>
                  </span>
                  {count ? (
                    <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[11px] font-semibold text-violet-700">{count}</span>
                  ) : null}
                </button>
              );
            })}
          </div>

          <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Realtime</p>
            <p className="mt-2 text-sm font-medium text-slate-700">Mailbox sync is live and new emails appear here automatically.</p>
          </div>
        </aside>

        <section className="min-w-0">
          <header className="border-b border-slate-200 px-4 py-4 sm:px-6">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <form className="flex min-w-0 flex-1 items-center gap-3" onSubmit={handleSearchSubmit}>
                <div className="relative min-w-0 flex-1 xl:max-w-xl">
                  <SearchIcon className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-11 pr-4 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-slate-300 focus:bg-white"
                    placeholder="Search mail"
                    value={searchInput}
                    onChange={(event) => setSearchInput(event.target.value)}
                  />
                </div>
                <button
                  type="submit"
                  className="hidden rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 sm:inline-flex"
                >
                  Search
                </button>
                {(searchInput || activeQuery) ? (
                  <button
                    type="button"
                    className="hidden rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 sm:inline-flex"
                    onClick={handleClearSearch}
                  >
                    Clear
                  </button>
                ) : null}
              </form>

              <div className="flex items-center gap-2 text-sm">
                <button
                  type="button"
                  className="inline-flex h-11 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 font-medium text-slate-600 transition hover:bg-slate-50"
                >
                  <FilterIcon className="h-4 w-4" />
                  Filters
                </button>
                {listLoading ? <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Syncing</span> : null}
              </div>
            </div>
          </header>

          <div className="min-h-[680px]">
            {isDetailView ? (
              <div className="flex h-full flex-col bg-slate-50/50">
                <div className="border-b border-slate-200 bg-white px-5 py-5">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0">
                      <button
                        type="button"
                        className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                        onClick={() => {
                          setSelectedEmail(null);
                          setSelectedEmailId('');
                          setReplyBody('');
                        }}
                      >
                        <BackIcon className="h-4 w-4" />
                        Back to inbox
                      </button>
                      <p className="mt-4 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Email</p>
                      <h3 className="mt-2 text-3xl font-semibold tracking-[-0.03em] text-slate-950">{selectedEmail.subject}</h3>

                      <div className="mt-4 space-y-2 text-sm text-slate-600">
                        <p className="flex items-start gap-2">
                          <UserIcon className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                          <span>
                            <span className="font-semibold text-slate-950">From:</span> {formatSenderLabel(selectedEmail.sender)}
                            {selectedEmail.sender?.address ? ` <${selectedEmail.sender.address}>` : ''}
                          </span>
                        </p>
                        <p className="flex items-start gap-2">
                          <ReplyIcon className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                          <span>
                            <span className="font-semibold text-slate-950">Reply-To:</span>{' '}
                            {selectedEmail.replyTo?.address || selectedEmail.sender?.address || 'Not available'}
                          </span>
                        </p>
                        <p className="flex items-start gap-2">
                          <ClockIcon className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                          <span>
                            <span className="font-semibold text-slate-950">Received:</span> {formatLocalDateTime(selectedEmail.date)}
                          </span>
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid flex-1 gap-5 px-5 py-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(360px,0.8fr)]">
                  <div className="space-y-5">
                    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white">
                      <div
                        className="mailbox-html p-5 text-sm text-slate-700"
                        dangerouslySetInnerHTML={{ __html: selectedEmail.htmlBody }}
                      />
                    </div>
                  </div>

                  <div className="space-y-5">
                    <div className="rounded-3xl border border-slate-200 bg-white p-5">
                      <div className="flex items-center gap-2">
                        <AttachmentIcon className="h-4 w-4 text-slate-400" />
                        <h4 className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-500">Attachments</h4>
                      </div>
                      {selectedEmail.attachments?.length ? (
                        <div className="mt-4 space-y-3">
                          {selectedEmail.attachments.map((attachment) => (
                            <div
                              key={attachment.id}
                              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                            >
                              <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-slate-950">{attachment.filename}</p>
                                <p className="text-xs text-slate-500">
                                  {attachment.contentType} . {formatFileSize(attachment.size)}
                                </p>
                              </div>
                              <button
                                type="button"
                                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                                onClick={() => handleDownloadAttachment(attachment)}
                              >
                                <DownloadIcon className="h-4 w-4" />
                                Download
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="mt-4 text-sm text-slate-500">No attachments for this email.</p>
                      )}
                    </div>

                    <div className="rounded-3xl border border-slate-200 bg-white p-5">
                      <div className="flex items-center gap-2">
                        <ReplyIcon className="h-4 w-4 text-slate-400" />
                        <h4 className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-500">Reply</h4>
                      </div>
                      <form className="mt-4 space-y-3" onSubmit={handleReplySubmit}>
                        <textarea
                          className="min-h-[170px] w-full resize-y rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-slate-300 focus:bg-white"
                          placeholder="Write your reply to the customer..."
                          value={replyBody}
                          onChange={(event) => setReplyBody(event.target.value)}
                        />
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <p className="text-sm text-slate-500">
                            Reply will be sent through {selectedEmail.replyTo?.address || selectedEmail.sender?.address || 'the sender address'}.
                          </p>
                          <button
                            type="submit"
                            className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                            disabled={replySending || !replyBody.trim()}
                          >
                            <ReplyIcon className="h-4 w-4" />
                            {replySending ? 'Sending...' : 'Send Reply'}
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="min-w-0">
              <div className="border-b border-slate-200 px-4 py-4 sm:px-6">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <h3 className="text-[30px] font-semibold tracking-[-0.04em] text-slate-950">
                      {mailboxFolders.find((folder) => folder.key === activeFolder)?.label || 'Mailbox'}
                    </h3>
                    <p className="mt-1 text-sm text-slate-500">
                      {pagination.total} email{pagination.total === 1 ? '' : 's'}
                      {activeQuery ? ` matching "${activeQuery}"` : ''}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {filterTabs.map((tab) => (
                      <button
                        key={tab.key}
                        type="button"
                        className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                          activeFilter === tab.key
                            ? 'bg-slate-950 text-white'
                            : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                        }`}
                        onClick={() => setActiveFilter(tab.key)}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <div className="min-w-[680px]">
                  <div className="grid grid-cols-[44px_200px_minmax(0,1fr)_120px] items-center border-b border-slate-200 px-4 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400 sm:px-6">
                    <span />
                    <span>Sender</span>
                    <span>Subject</span>
                    <span className="text-right">Date</span>
                  </div>

                  {visibleEmails.length ? (
                    <div>
                      {visibleEmails.map((email) => {
                        const isActive = String(email.id) === String(selectedEmailId);

                        return (
                          <button
                            key={email.id}
                            type="button"
                            className={`grid w-full grid-cols-[44px_200px_minmax(0,1fr)_120px] items-center border-b border-slate-200 px-4 py-4 text-left transition sm:px-6 ${
                              isActive ? 'bg-slate-100/80' : 'hover:bg-slate-50'
                            }`}
                            onClick={() => fetchEmailDetail(email.id, email.folder || activeFolder)}
                          >
                            <span className="flex items-center justify-center">
                              <span
                                className={`h-5 w-5 rounded-md border ${
                                  email.isRead ? 'border-slate-200 bg-white' : 'border-violet-200 bg-violet-50'
                                }`}
                              />
                            </span>

                            <div className="min-w-0 pr-4">
                              <p className={`truncate text-sm ${email.isRead ? 'font-medium text-slate-700' : 'font-semibold text-slate-950'}`}>
                                {formatSenderLabel(email.sender)}
                              </p>
                              <p className="truncate text-xs text-slate-400">{email.sender?.address || 'No email address'}</p>
                            </div>

                            <div className="min-w-0 pr-4">
                              <div className="flex items-center gap-2">
                                {!email.isRead ? <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-violet-500" /> : null}
                                <p className={`truncate text-sm ${email.isRead ? 'text-slate-600' : 'font-semibold text-slate-950'}`}>
                                  {email.subject || 'No subject'}
                                </p>
                                {email.hasAttachments ? <AttachmentIcon className="h-4 w-4 shrink-0 text-slate-400" /> : null}
                              </div>
                              <p className="mt-1 truncate text-sm text-slate-400">{email.preview || 'No preview available.'}</p>
                            </div>

                            <div className="pl-2 text-right">
                              <p className={`text-sm ${email.isRead ? 'text-slate-500' : 'font-semibold text-slate-800'}`}>
                                {formatLocalDateTime(email.date)}
                              </p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="px-6 py-12 text-center text-sm text-slate-500">
                      {listLoading ? 'Loading emails...' : folderEmptyStates[activeFolder] || 'No emails found for the current filter.'}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-3 border-t border-slate-200 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                <p className="text-sm text-slate-500">
                  Page {pagination.page} of {pagination.totalPages}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                    onClick={() => handlePageChange(Math.max(1, pagination.page - 1))}
                    disabled={pagination.page <= 1 || listLoading}
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                    onClick={() => handlePageChange(Math.min(pagination.totalPages, pagination.page + 1))}
                    disabled={pagination.page >= pagination.totalPages || listLoading}
                  >
                    Next
                  </button>
                </div>
              </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

export default MailboxPage;
