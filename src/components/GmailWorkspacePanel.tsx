import React, { useEffect, useState } from 'react';
import { User } from 'firebase/auth';
import { Mail, RefreshCw, Send, LogOut, Search, CheckCircle2, AlertCircle } from 'lucide-react';
import {
  initAuth,
  googleSignIn,
  logout,
  getAccessToken,
} from '../services/auth';
import {
  listGmailMessages,
  sendGmailMessage,
  GmailMessageSummary,
} from '../services/gmail';
import { GoogleSignInButton } from './GoogleSignInButton';
import { RepositoryProfile } from '../data/gitlensRepoData';
import { DnsResolutionSnapshot } from '../data/dnsSnapshotData';

interface GmailWorkspacePanelProps {
  repo: RepositoryProfile;
  dnsSnapshot: DnsResolutionSnapshot;
  manifestJson: string;
  auditScorePct: number;
  defaultRecipientEmail?: string;
}

export const GmailWorkspacePanel: React.FC<GmailWorkspacePanelProps> = ({
  repo,
  dnsSnapshot,
  manifestJson,
  auditScorePct,
  defaultRecipientEmail = 'rasadsk750@gmail.com',
}) => {
  const [needsAuth, setNeedsAuth] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Inbox state
  const [messages, setMessages] = useState<GmailMessageSummary[]>([]);
  const [selectedMessage, setSelectedMessage] =
    useState<GmailMessageSummary | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [inboxError, setInboxError] = useState<string | null>(null);

  // Compose & Send state
  const [recipient, setRecipient] = useState(defaultRecipientEmail);
  const [subject, setSubject] = useState(
    `[PWABuildr] PWA Readiness & Manifest Bundle for ${repo.owner}/${repo.name} (${repo.latestCommitSha})`
  );
  const [body, setBody] = useState('');
  const [showSendConfirmModal, setShowSendConfirmModal] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [sendFeedback, setSendFeedback] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const generateDefaultReportBody = () => {
    const enabledModules = repo.modules
      .map(
        (m) =>
          `- ${m.title} (${m.category}) · Strategy: ${m.offlineStrategy} · ${m.bundleWeightKb} KB`
      )
      .join('\n');

    const mcpTxt = dnsSnapshot.answers.find((a) =>
      a.data.includes('v=MCPv1')
    )?.data;
    const aList = dnsSnapshot.answers
      .filter((a) => a.typeName === 'A')
      .map((a) => a.data)
      .join(', ');
    const aaaaList = dnsSnapshot.answers
      .filter((a) => a.typeName === 'AAAA')
      .map((a) => a.data)
      .join(', ');
    const mxPrimary = dnsSnapshot.answers
      .filter((a) => a.typeName === 'MX')
      .map((a) => `${a.data} (prio ${a.priority ?? '-'})`)
      .join(', ');

    return [
      `PWABuildr Release, DNS Origin & Manifest Report`,
      `===============================================`,
      `Repository: ${repo.owner}/${repo.name} (forked from ${repo.forkedFrom})`,
      `Branch: ${repo.branch} (${repo.aheadCount} commits ahead, ${repo.behindCount} commits behind upstream)`,
      `HEAD Commit: ${repo.latestCommitSha} — "${repo.latestCommitMessage}" by ${repo.latestCommitAuthor} (${repo.latestCommitTime})`,
      `PWA Readiness Score: ${auditScorePct}% Compliant`,
      ``,
      `Domain & DNS Infrastructure (${dnsSnapshot.domain} via ${dnsSnapshot.resolver} · ${dnsSnapshot.statusName} · ${dnsSnapshot.latencyMs} ms):`,
      `- IPv4 (A): ${aList || 'None'}`,
      `- IPv6 (AAAA): ${aaaaList || 'None'}`,
      `- Mail Exchange (MX): ${mxPrimary || 'None'}`,
      `- MCPv1 Agent Key (TXT): ${mcpTxt || 'None'}`,
      `- Total Records Inspected: ${dnsSnapshot.answers.length} (${dnsSnapshot.timestamp})`,
      ``,
      `Packaged GitLens Webview & PWA Modules:`,
      enabledModules,
      ``,
      `Generated Web App Manifest (manifest.webmanifest):`,
      manifestJson,
    ].join('\n');
  };

  useEffect(() => {
    setSubject(
      `[PWABuildr] PWA & DNS Audit (${dnsSnapshot.domain}) for ${repo.owner}/${repo.name} (${repo.latestCommitSha})`
    );
    setBody(generateDefaultReportBody());
  }, [repo, dnsSnapshot, manifestJson, auditScorePct]);

  const fetchInbox = async (queryText = searchQuery) => {
    const token = await getAccessToken();
    if (!token) {
      setNeedsAuth(true);
      return;
    }
    setIsLoadingMessages(true);
    setInboxError(null);
    try {
      const items = await listGmailMessages(queryText, 10);
      setMessages(items);
      if (items.length > 0 && !selectedMessage) {
        setSelectedMessage(items[0]);
      } else if (items.length === 0) {
        setSelectedMessage(null);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg === 'AUTH_REQUIRED') {
        setNeedsAuth(true);
      } else {
        setInboxError(msg);
      }
    } finally {
      setIsLoadingMessages(false);
    }
  };

  useEffect(() => {
    const unsubscribe = initAuth(
      (authedUser) => {
        setUser(authedUser);
        if (authedUser.email) {
          setRecipient(authedUser.email);
        }
        setNeedsAuth(false);
        fetchInbox('');
      },
      () => {
        setUser(null);
        setNeedsAuth(true);
      }
    );
    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    setIsLoggingIn(true);
    setAuthError(null);
    try {
      const result = await googleSignIn();
      if (result) {
        setUser(result.user);
        if (result.user.email) {
          setRecipient(result.user.email);
        }
        setNeedsAuth(false);
        await fetchInbox('');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Google Sign-In failed.';
      setAuthError(msg);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    setUser(null);
    setMessages([]);
    setSelectedMessage(null);
    setNeedsAuth(true);
  };

  const handleRequestSend = (e: React.FormEvent) => {
    e.preventDefault();
    setSendFeedback(null);
    if (!recipient.trim() || !subject.trim() || !body.trim()) {
      setSendFeedback({
        type: 'error',
        text: 'Please provide a recipient email, subject, and message body.',
      });
      return;
    }
    // Open mandatory explicit user confirmation dialog before mutating/sending email
    setShowSendConfirmModal(true);
  };

  const handleConfirmSendEmail = async () => {
    setShowSendConfirmModal(false);
    const token = await getAccessToken();
    if (!token) {
      setNeedsAuth(true);
      return;
    }
    setIsSending(true);
    setSendFeedback(null);
    try {
      const res = await sendGmailMessage({
        to: recipient,
        subject,
        body,
      });
      setSendFeedback({
        type: 'success',
        text: `Email dispatched via Gmail API (Message ID: ${res.id}).`,
      });
      await fetchInbox(searchQuery);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg === 'AUTH_REQUIRED') {
        setNeedsAuth(true);
      } else {
        setSendFeedback({
          type: 'error',
          text: msg,
        });
      }
    } finally {
      setIsSending(false);
    }
  };

  const useMessageInComposer = (msg: GmailMessageSummary) => {
    setSubject(
      msg.subject.startsWith('Re:') ? msg.subject : `Re: ${msg.subject}`
    );
    const quoted = msg.bodyText
      .split('\n')
      .slice(0, 12)
      .map((line) => `> ${line}`)
      .join('\n');
    setBody(`${generateDefaultReportBody()}\n\n--- In reply to ${msg.from} ---\n${quoted}`);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-200">
      <div className="p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            05. Gmail Workspace Dispatch & Build Notification Inbox
          </h2>
          <p className="text-sm text-slate-600 mt-1">
            Read repository release threads and dispatch PWA manifest bundles, Workbox configs, and GitLens changelogs via Gmail.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {needsAuth ? (
            <GoogleSignInButton
              onClick={handleLogin}
              disabled={isLoggingIn}
              label={isLoggingIn ? 'Connecting...' : 'Sign in with Google'}
            />
          ) : (
            <div className="flex items-center gap-3 text-xs text-slate-600">
              <span>{user?.email || 'Connected to Gmail'}</span>
              <span aria-hidden="true">·</span>
              <button
                type="button"
                onClick={handleLogout}
                className="inline-flex items-center gap-1 font-semibold text-slate-700 hover:text-slate-900 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>

      {authError && (
        <div className="px-6 py-3 bg-red-50 text-xs text-red-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{authError}</span>
        </div>
      )}

      {needsAuth ? (
        <div className="p-10 text-center max-w-xl mx-auto space-y-4">
          <div className="w-10 h-10 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center mx-auto">
            <Mail className="w-5 h-5" />
          </div>
          <h3 className="text-base font-semibold text-slate-900">
            Connect Your Google Workspace Gmail Account
          </h3>
          <p className="text-sm text-slate-600 leading-relaxed">
            Sign in with Google to inspect incoming GitHub and build emails in your inbox and send PWA manifest &amp; service worker build reports for <span className="font-mono text-xs text-slate-800">{repo.owner}/{repo.name}</span>.
          </p>
          <div className="pt-2 flex justify-center">
            <GoogleSignInButton
              onClick={handleLogin}
              disabled={isLoggingIn}
              label={isLoggingIn ? 'Signing in...' : 'Sign in with Google'}
            />
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-slate-200">
          {/* Left 6 cols: Live Gmail Inbox Reader */}
          <div className="lg:col-span-6 p-6 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-slate-900">
                Gmail Inbox Messages
              </h3>
              <button
                type="button"
                onClick={() => fetchInbox(searchQuery)}
                disabled={isLoadingMessages}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 ${isLoadingMessages ? 'animate-spin' : ''}`}
                />
                Refresh
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                fetchInbox(searchQuery);
              }}
              className="flex items-center gap-2"
            >
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search Gmail (e.g. gitlens, github, release)..."
                  className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600"
                />
              </div>
              <button
                type="submit"
                className="px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
              >
                Filter
              </button>
            </form>

            {inboxError && (
              <div className="p-3 rounded-lg bg-red-50 text-xs text-red-700">
                {inboxError}
              </div>
            )}

            {isLoadingMessages ? (
              <div className="space-y-2 py-4">
                {[1, 2, 3, 4].map((n) => (
                  <div
                    key={n}
                    className="h-14 bg-slate-100 animate-pulse rounded-lg"
                  />
                ))}
              </div>
            ) : messages.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500 border border-dashed border-slate-200 rounded-lg">
                No Gmail messages matched your current filter.
              </div>
            ) : (
              <div className="divide-y divide-slate-200 border border-slate-200 rounded-lg max-h-72 overflow-y-auto">
                {messages.map((msg) => {
                  const isSelected = selectedMessage?.id === msg.id;
                  return (
                    <button
                      key={msg.id}
                      type="button"
                      onClick={() => setSelectedMessage(msg)}
                      className={`w-full text-left p-3 transition-colors block cursor-pointer ${
                        isSelected ? 'bg-blue-50/70' : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="text-xs font-semibold text-slate-900 truncate">
                          {msg.subject}
                        </span>
                        <span className="text-[11px] font-mono text-slate-500 shrink-0 tabular-nums">
                          {msg.date ? msg.date.slice(0, 16) : ''}
                        </span>
                      </div>
                      <div className="text-xs text-slate-600 truncate mt-0.5">
                        {msg.from}
                      </div>
                      <div className="text-xs text-slate-500 truncate mt-1">
                        {msg.snippet}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {selectedMessage && (
              <div className="pt-3 border-t border-slate-200 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-xs font-semibold text-slate-900">
                      {selectedMessage.subject}
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      From: {selectedMessage.from} · {selectedMessage.date}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => useMessageInComposer(selectedMessage)}
                    className="px-2.5 py-1 text-xs font-semibold text-blue-600 hover:bg-blue-50 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    Reply with PWA Bundle
                  </button>
                </div>
                <pre className="text-xs font-mono text-slate-700 bg-slate-50 p-3 rounded-lg max-h-40 overflow-y-auto whitespace-pre-wrap leading-relaxed">
                  {selectedMessage.bodyText || selectedMessage.snippet}
                </pre>
              </div>
            )}
          </div>

          {/* Right 6 cols: Send PWA Report via Gmail */}
          <div className="lg:col-span-6 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900">
                Dispatch PWA Build &amp; Manifest Report
              </h3>
              <button
                type="button"
                onClick={() => setBody(generateDefaultReportBody())}
                className="text-xs font-medium text-blue-600 hover:underline cursor-pointer"
              >
                Reset to Latest Build Snapshot
              </button>
            </div>

            <form onSubmit={handleRequestSend} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Recipient Email (To)
                </label>
                <input
                  type="email"
                  required
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                  placeholder="team@example.com"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Subject Line
                </label>
                <input
                  type="text"
                  required
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Report Payload (Manifest JSON + Module Caching Matrix)
                </label>
                <textarea
                  rows={10}
                  required
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600 leading-relaxed"
                />
              </div>

              {sendFeedback && (
                <div
                  className={`p-3 rounded-lg text-xs flex items-center gap-2 ${
                    sendFeedback.type === 'success'
                      ? 'bg-emerald-50 text-emerald-800'
                      : 'bg-red-50 text-red-700'
                  }`}
                >
                  {sendFeedback.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 shrink-0" />
                  )}
                  <span>{sendFeedback.text}</span>
                </div>
              )}

              <div className="pt-1 flex justify-end">
                <button
                  type="submit"
                  disabled={isSending}
                  className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg transition-colors cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  {isSending ? 'Sending via Gmail...' : 'Review & Send via Gmail'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Mandatory User Confirmation Dialog before sending email */}
      {showSendConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 border border-slate-200 space-y-4">
            <h3 className="text-base font-semibold text-slate-900">
              Confirm Sending Email via Gmail
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              This action will send an email from your connected Google Workspace Gmail account ({user?.email || 'authenticated user'}). Please verify the details below before confirming:
            </p>
            <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200 space-y-1.5 text-xs">
              <div>
                <span className="font-semibold text-slate-700">To:</span>{' '}
                <span className="font-mono text-slate-900">{recipient}</span>
              </div>
              <div>
                <span className="font-semibold text-slate-700">Subject:</span>{' '}
                <span className="text-slate-900">{subject}</span>
              </div>
              <div className="pt-1">
                <span className="font-semibold text-slate-700 block mb-1">
                  Message Preview:
                </span>
                <pre className="font-mono text-[11px] text-slate-600 max-h-32 overflow-y-auto whitespace-pre-wrap bg-white p-2 rounded border border-slate-200">
                  {body}
                </pre>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowSendConfirmModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmSendEmail}
                className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors cursor-pointer"
              >
                Confirm &amp; Send Email
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
