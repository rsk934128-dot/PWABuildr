import React, { useMemo, useState } from 'react';
import {
  Search,
  Copy,
  Check,
  Download,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Send,
} from 'lucide-react';
import {
  DnsResolutionSnapshot,
  DnsAnswerRecord,
  GITKRAKEN_DNS_SNAPSHOT,
} from '../data/dnsSnapshotData';

interface DnsInspectorPanelProps {
  dnsSnapshot: DnsResolutionSnapshot;
  onUpdateSnapshot: (snapshot: DnsResolutionSnapshot) => void;
  onDispatchToGmail: () => void;
}

const RECORD_TYPE_MAP: Record<number, string> = {
  1: 'A',
  2: 'NS',
  5: 'CNAME',
  6: 'SOA',
  15: 'MX',
  16: 'TXT',
  28: 'AAAA',
};

const DNS_STATUS_NAMES: Record<number, string> = {
  0: 'NOERROR (Success)',
  1: 'FORMERR (Format Error)',
  2: 'SERVFAIL (Server Failure)',
  3: 'NXDOMAIN (Non-Existent Domain)',
  4: 'NOTIMP (Not Implemented)',
  5: 'REFUSED (Query Refused)',
};

export const DnsInspectorPanel: React.FC<DnsInspectorPanelProps> = ({
  dnsSnapshot,
  onUpdateSnapshot,
  onDispatchToGmail,
}) => {
  const [domainInput, setDomainInput] = useState(dnsSnapshot.domain);
  const [resolverChoice, setResolverChoice] = useState<'google' | 'cloudflare'>(
    dnsSnapshot.resolver === 'cloudflare' ? 'cloudflare' : 'google'
  );
  const [typeFilter, setTypeFilter] = useState<
    'ALL' | 'A' | 'AAAA' | 'MX' | 'TXT' | 'NS'
  >('ALL');
  const [searchFilter, setSearchFilter] = useState('');
  const [isQuerying, setIsQuerying] = useState(false);
  const [queryError, setQueryError] = useState<string | null>(null);
  const [copiedJson, setCopiedJson] = useState(false);
  const [showRawJsonModal, setShowRawJsonModal] = useState(false);
  const [rawJsonInput, setRawJsonInput] = useState('');

  const filteredAnswers = useMemo(() => {
    return dnsSnapshot.answers.filter((ans) => {
      const matchesType =
        typeFilter === 'ALL' ? true : ans.typeName === typeFilter;
      const matchesSearch =
        !searchFilter.trim() ||
        ans.data.toLowerCase().includes(searchFilter.toLowerCase()) ||
        ans.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
        ans.typeName.toLowerCase().includes(searchFilter.toLowerCase());
      return matchesType && matchesSearch;
    });
  }, [dnsSnapshot.answers, typeFilter, searchFilter]);

  const countsByType = useMemo(() => {
    const counts: Record<string, number> = {
      ALL: dnsSnapshot.answers.length,
      A: 0,
      AAAA: 0,
      MX: 0,
      TXT: 0,
      NS: 0,
    };
    dnsSnapshot.answers.forEach((a) => {
      counts[a.typeName] = (counts[a.typeName] || 0) + 1;
    });
    return counts;
  }, [dnsSnapshot.answers]);

  // Derived Infrastructure & Protocol Insights from the DNS payload
  const insights = useMemo(() => {
    const aRecords = dnsSnapshot.answers.filter((a) => a.typeName === 'A');
    const aaaaRecords = dnsSnapshot.answers.filter((a) => a.typeName === 'AAAA');
    const mxRecords = dnsSnapshot.answers.filter((a) => a.typeName === 'MX');
    const txtRecords = dnsSnapshot.answers.filter((a) => a.typeName === 'TXT');
    const nsRecords = dnsSnapshot.answers.filter((a) => a.typeName === 'NS');

    const mcpRecord = txtRecords.find((t) => t.data.includes('v=MCPv1'));
    const spfRecord = txtRecords.find((t) => t.data.startsWith('v=spf1'));
    const gkVerifyRecord = txtRecords.find((t) =>
      t.data.startsWith('gitkraken-domain-verification=')
    );
    const hasGoogleMx = mxRecords.some(
      (m) =>
        m.data.includes('google.com') || m.data.includes('googlemail.com')
    );
    const isCloudflareEdge = nsRecords.some((n) =>
      n.data.includes('cloudflare.com')
    );

    return {
      dualStackReady: aRecords.length > 0 && aaaaRecords.length > 0,
      aCount: aRecords.length,
      aaaaCount: aaaaRecords.length,
      mcpRecord,
      spfRecord,
      gkVerifyRecord,
      hasGoogleMx,
      mxCount: mxRecords.length,
      isCloudflareEdge,
      nsList: nsRecords.map((n) => n.data).join(', '),
    };
  }, [dnsSnapshot.answers]);

  const handleLiveResolve = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanDomain = domainInput
      .trim()
      .replace(/^https?:\/\//i, '')
      .replace(/\/.*$/, '');
    if (!cleanDomain) return;

    setIsQuerying(true);
    setQueryError(null);
    const startTime = performance.now();

    try {
      const recordTypesToFetch = ['A', 'AAAA', 'MX', 'TXT', 'NS'];
      const collectedAnswers: DnsAnswerRecord[] = [];
      let status = 0;
      let isDnssec = false;

      await Promise.all(
        recordTypesToFetch.map(async (rType) => {
          const endpoint =
            resolverChoice === 'google'
              ? `https://dns.google/resolve?name=${encodeURIComponent(cleanDomain)}&type=${rType}`
              : `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(cleanDomain)}&type=${rType}`;

          const res = await fetch(endpoint, {
            headers: { Accept: 'application/dns-json' },
          });
          if (!res.ok) return;
          const data = await res.json();
          if (typeof data.Status === 'number' && data.Status !== 0) {
            status = data.Status;
          }
          if (data.AD === true) {
            isDnssec = true;
          }
          if (Array.isArray(data.Answer)) {
            data.Answer.forEach(
              (raw: {
                name: string;
                type: number;
                TTL: number;
                data: string;
              }) => {
                const typeName = RECORD_TYPE_MAP[raw.type] || rType;
                let cleanedData = String(raw.data).replace(/^"|"$/g, '');
                let priority: number | undefined;

                if (typeName === 'MX') {
                  const parts = cleanedData.trim().split(/\s+/);
                  if (parts.length >= 2 && !Number.isNaN(Number(parts[0]))) {
                    priority = Number(parts[0]);
                    cleanedData = parts.slice(1).join(' ');
                  }
                }

                collectedAnswers.push({
                  name: raw.name,
                  type: raw.type,
                  typeName,
                  TTL: raw.TTL,
                  data: cleanedData,
                  ...(priority !== undefined ? { priority } : {}),
                });
              }
            );
          }
        })
      );

      const latencyMs = Math.round(performance.now() - startTime);
      const nowStr = new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });

      onUpdateSnapshot({
        domain: cleanDomain,
        recordType: 'ALL',
        resolver: resolverChoice,
        status,
        statusName: DNS_STATUS_NAMES[status] || `STATUS_${status}`,
        latencyMs,
        isDnssecValidated: isDnssec,
        answers: collectedAnswers,
        timestamp: nowStr,
      });
    } catch (err: unknown) {
      setQueryError(
        err instanceof Error
          ? err.message
          : 'Failed to resolve DNS records over HTTPS.'
      );
    } finally {
      setIsQuerying(false);
    }
  };

  const handleImportJson = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const parsed = JSON.parse(rawJsonInput);
      if (!parsed.domain || !Array.isArray(parsed.answers)) {
        throw new Error(
          'JSON must include "domain" and an "answers" array.'
        );
      }
      onUpdateSnapshot(parsed as DnsResolutionSnapshot);
      setDomainInput(parsed.domain);
      setShowRawJsonModal(false);
      setQueryError(null);
    } catch (err: unknown) {
      setQueryError(
        err instanceof Error ? err.message : 'Invalid DNS JSON payload.'
      );
    }
  };

  const jsonString = useMemo(
    () => JSON.stringify(dnsSnapshot, null, 2),
    [dnsSnapshot]
  );

  const handleCopyJson = () => {
    navigator.clipboard.writeText(jsonString);
    setCopiedJson(true);
    setTimeout(() => setCopiedJson(false), 1800);
  };

  const handleDownloadJson = () => {
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${dnsSnapshot.domain}-dns-records.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const describeRecordContext = (ans: DnsAnswerRecord): string => {
    if (ans.typeName === 'A') return 'IPv4 Edge Origin (Cloudflare Anycast)';
    if (ans.typeName === 'AAAA') return 'IPv6 Edge Origin (Dual-Stack PWA Host)';
    if (ans.typeName === 'NS') return 'Authoritative Cloudflare Nameserver';
    if (ans.typeName === 'MX') {
      if (ans.data.includes('google'))
        return `Google Workspace Inbound Mail (Priority ${ans.priority ?? '-'})`;
      return `Transactional / Custom Mail Host (Priority ${ans.priority ?? '-'})`;
    }
    if (ans.typeName === 'TXT') {
      if (ans.data.startsWith('v=MCPv1'))
        return 'Model Context Protocol (MCPv1) Ed25519 Public Key';
      if (ans.data.startsWith('v=spf1'))
        return 'Sender Policy Framework (SPF) Authorized Mail Senders';
      if (ans.data.startsWith('gitkraken-domain-verification='))
        return 'GitKraken Enterprise Organization Verification Token';
      if (ans.data.startsWith('google-site-'))
        return 'Google Search Console / Workspace Domain Verification';
      if (ans.data.startsWith('atlassian-domain-verification='))
        return 'Atlassian Jira / Bitbucket Integration Verification';
      if (ans.data.startsWith('apple-domain-verification='))
        return 'Apple Associated Domains / Sign In Verification';
      if (ans.data.startsWith('status-page-domain-verification='))
        return 'Statuspage Incident Telemetry Verification';
      if (ans.data.startsWith('MS='))
        return 'Microsoft 365 / Entra Domain Verification';
      return 'Domain TXT Verification Record';
    }
    return 'DNS Resource Record';
  };

  return (
    <div className="space-y-8">
      <section className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-200">
        {/* Header & Live Resolver Bar */}
        <div className="p-6 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-slate-500 tabular-nums mb-1">
              <span className="font-semibold text-slate-900">
                {dnsSnapshot.domain}
              </span>
              <span aria-hidden="true">·</span>
              <span>Resolver: {dnsSnapshot.resolver}</span>
              <span aria-hidden="true">·</span>
              <span>Status: {dnsSnapshot.statusName}</span>
              <span aria-hidden="true">·</span>
              <span>Latency: {dnsSnapshot.latencyMs} ms</span>
              <span aria-hidden="true">·</span>
              <span>
                DNSSEC: {dnsSnapshot.isDnssecValidated ? 'Validated' : 'Unsigned'}
              </span>
              <span aria-hidden="true">·</span>
              <span>Captured {dnsSnapshot.timestamp}</span>
            </div>
            <h2 className="text-lg font-semibold text-slate-900">
              Domain DNS, MCPv1 Key &amp; Workspace Mail Inspector
            </h2>
            <p className="text-sm text-slate-600 mt-0.5">
              Inspect A/AAAA origin routing, MCPv1 Ed25519 agent keys, Google Workspace MX servers, and TXT verification records.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setRawJsonInput(jsonString);
                setShowRawJsonModal(true);
              }}
              className="px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
            >
              Paste / Edit JSON
            </button>
            <button
              type="button"
              onClick={handleCopyJson}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
            >
              {copiedJson ? (
                <Check className="w-3.5 h-3.5 text-emerald-600" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
              {copiedJson ? 'Copied JSON' : 'Copy JSON'}
            </button>
            <button
              type="button"
              onClick={handleDownloadJson}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              Export DNS JSON
            </button>
            <button
              type="button"
              onClick={onDispatchToGmail}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              Email DNS Audit via Gmail
            </button>
          </div>
        </div>

        {/* Protocol & Infrastructure Summary Strip */}
        <div className="p-6 grid grid-cols-1 md:grid-cols-4 gap-6 bg-slate-50/50">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-900">
              {insights.dualStackReady ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              )}
              Dual-Stack Edge Origin
            </div>
            <div className="text-xs font-mono text-slate-700 tabular-nums mt-1">
              {insights.aCount} IPv4 (A) · {insights.aaaaCount} IPv6 (AAAA)
            </div>
            <div className="text-xs text-slate-500 mt-0.5">
              {insights.isCloudflareEdge
                ? `Cloudflare NS (${insights.nsList})`
                : 'Standard authoritative nameservers'}
            </div>
          </div>

          <div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-900">
              {insights.mcpRecord ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              )}
              GitKraken MCPv1 Discovery
            </div>
            <div className="text-xs font-mono text-slate-700 truncate mt-1">
              {insights.mcpRecord
                ? insights.mcpRecord.data
                : 'No v=MCPv1 TXT record found'}
            </div>
            <div className="text-xs text-slate-500 mt-0.5">
              Ed25519 public key for coding agent verification
            </div>
          </div>

          <div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-900">
              {insights.hasGoogleMx ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              )}
              Google Workspace MX Routing
            </div>
            <div className="text-xs font-mono text-slate-700 tabular-nums mt-1">
              {insights.mxCount} MX servers configured
            </div>
            <div className="text-xs text-slate-500 mt-0.5">
              Primary: aspmx.l.google.com. (Priority 1)
            </div>
          </div>

          <div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-900">
              {insights.spfRecord ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              )}
              Domain &amp; SPF Policy
            </div>
            <div className="text-xs font-mono text-slate-700 truncate mt-1">
              {insights.gkVerifyRecord
                ? insights.gkVerifyRecord.data
                : 'Verified TXT policies'}
            </div>
            <div className="text-xs text-slate-500 mt-0.5">
              Includes _spf.google.com, amazonses.com, outlook.com
            </div>
          </div>
        </div>

        {/* Live DoH Query Bar & Record Type Segmented Filter */}
        <div className="p-5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <form
            onSubmit={handleLiveResolve}
            className="flex flex-wrap items-center gap-2"
          >
            <input
              type="text"
              value={domainInput}
              onChange={(e) => setDomainInput(e.target.value)}
              placeholder="gitkraken.com"
              className="px-3 py-1.5 text-xs font-mono border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600 w-48"
            />
            <select
              value={resolverChoice}
              onChange={(e) =>
                setResolverChoice(e.target.value as 'google' | 'cloudflare')
              }
              className="px-2.5 py-1.5 text-xs font-mono border border-slate-300 rounded-lg bg-white focus:outline-none focus:border-blue-600 cursor-pointer"
            >
              <option value="google">Resolver: Google DoH</option>
              <option value="cloudflare">Resolver: Cloudflare DoH</option>
            </select>
            <button
              type="submit"
              disabled={isQuerying}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-50 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${isQuerying ? 'animate-spin' : ''}`}
              />
              {isQuerying ? 'Resolving...' : 'Live Resolve DoH'}
            </button>
            <button
              type="button"
              onClick={() => {
                setDomainInput('gitkraken.com');
                onUpdateSnapshot(GITKRAKEN_DNS_SNAPSHOT);
                setQueryError(null);
              }}
              className="px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 cursor-pointer"
            >
              Reset Snapshot (4580 ms)
            </button>
          </form>

          <div className="flex flex-wrap items-center gap-3">
            {/* Interactive Filter Controls (Segmented Buttons) */}
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
              {(['ALL', 'A', 'AAAA', 'MX', 'TXT', 'NS'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTypeFilter(t)}
                  className={`px-2.5 py-1 text-xs font-mono font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer tabular-nums ${
                    typeFilter === t
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {t} ({countsByType[t] ?? 0})
                </button>
              ))}
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                placeholder="Search IP, MCPv1, spf1, mx..."
                className="pl-8 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600 w-52"
              />
            </div>
          </div>
        </div>

        {queryError && (
          <div className="px-6 py-3 bg-red-50 text-xs text-red-700">
            {queryError}
          </div>
        )}

        {/* High-Density DNS Answer Records Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500 bg-slate-50/60">
                <th className="py-3 px-6">Domain Name</th>
                <th className="py-3 px-4">Record Type</th>
                <th className="py-3 px-4 text-right">TTL (s)</th>
                <th className="py-3 px-4 text-right">Priority</th>
                <th className="py-3 px-4">Record Value / Data</th>
                <th className="py-3 px-6">Infrastructure Role</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-xs">
              {filteredAnswers.map((ans, index) => (
                <tr
                  key={`${ans.typeName}-${ans.data}-${index}`}
                  className="hover:bg-slate-50/80 transition-colors"
                >
                  <td className="py-3 px-6 font-mono text-slate-800 whitespace-nowrap">
                    {ans.name}
                  </td>
                  <td className="py-3 px-4 font-mono font-semibold text-slate-900 whitespace-nowrap tabular-nums">
                    {ans.typeName}{' '}
                    <span className="text-slate-400 font-normal">
                      ({ans.type})
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-slate-600 tabular-nums whitespace-nowrap">
                    {ans.TTL}s
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-slate-600 tabular-nums whitespace-nowrap">
                    {ans.priority !== undefined ? ans.priority : '—'}
                  </td>
                  <td className="py-3 px-4 font-mono text-slate-900 break-all max-w-md">
                    {ans.data}
                  </td>
                  <td className="py-3 px-6 text-slate-600 whitespace-nowrap">
                    {describeRecordContext(ans)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Paste / Edit Raw DNS JSON Modal */}
      {showRawJsonModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-2xl rounded-xl bg-white p-6 border border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-900">
                Import or Edit DNS Resolution Payload (JSON)
              </h3>
              <button
                type="button"
                onClick={() => setShowRawJsonModal(false)}
                className="text-xs font-medium text-slate-500 hover:text-slate-800 cursor-pointer"
              >
                Close
              </button>
            </div>
            <form onSubmit={handleImportJson} className="space-y-4">
              <textarea
                rows={14}
                value={rawJsonInput}
                onChange={(e) => setRawJsonInput(e.target.value)}
                className="w-full p-3 text-xs font-mono border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600 leading-relaxed"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowRawJsonModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg cursor-pointer"
                >
                  Apply DNS Snapshot
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
