import React, { useMemo, useState } from 'react';
import {
  Copy,
  Check,
  Download,
  Search,
  Folder,
  FileCode,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';
import {
  GITLENS_REPO_PROFILE,
  RepositoryProfile,
  RepoModuleEntry,
  PWAAuditCheck,
} from './data/gitlensRepoData';
import {
  GITKRAKEN_DNS_SNAPSHOT,
  DnsResolutionSnapshot,
} from './data/dnsSnapshotData';
import { PWAInstallButton } from './components/PWAInstallButton';
import { OfflineIndicator } from './components/OfflineIndicator';
import { IconLabPanel } from './components/IconLabPanel';
import { GmailWorkspacePanel } from './components/GmailWorkspacePanel';
import { DnsInspectorPanel } from './components/DnsInspectorPanel';
import { SavedConfigsBar } from './components/SavedConfigsBar';
import { SavedRepoConfigDoc } from './services/repoConfigs';

type NavSection =
  | 'audit'
  | 'dns'
  | 'manifest'
  | 'service-worker'
  | 'icons'
  | 'gmail';

export default function App() {
  const [activeSection, setActiveSection] = useState<NavSection>('audit');

  // Repository profile state (defaults to epodivilov/vscode-gitlens)
  const [repo, setRepo] = useState<RepositoryProfile>(GITLENS_REPO_PROFILE);
  const [dnsSnapshot, setDnsSnapshot] = useState<DnsResolutionSnapshot>(
    GITKRAKEN_DNS_SNAPSHOT
  );
  const [repoInput, setRepoInput] = useState('epodivilov/vscode-gitlens');
  const [isFetchingRepo, setIsFetchingRepo] = useState(false);
  const [repoFetchError, setRepoFetchError] = useState<string | null>(null);

  // File tree filters
  const [fileFilter, setFileFilter] = useState<
    'all' | 'ready' | 'needs-adapter'
  >('all');
  const [fileSearch, setFileSearch] = useState('');

  // Selected GitLens modules for PWA bundle
  const [selectedModuleIds, setSelectedModuleIds] = useState<string[]>(
    GITLENS_REPO_PROFILE.modules.map((m) => m.id)
  );

  // Web App Manifest state
  const [manifestName, setManifestName] = useState(
    'GitLens PWA — Commit Graph & Visual History'
  );
  const [manifestShortName, setManifestShortName] = useState('GitLensPWA');
  const [manifestDescription, setManifestDescription] = useState(
    'Supercharge Git in a standalone Progressive Web App — interactive Commit Graph, Visual History treemaps, Worktrees, Agent Kanban, and Launchpad.'
  );
  const [manifestId, setManifestId] = useState('/');
  const [manifestStartUrl, setManifestStartUrl] = useState('/');
  const [manifestScope, setManifestScope] = useState('/');
  const [manifestDisplay, setManifestDisplay] = useState<
    'standalone' | 'minimal-ui' | 'fullscreen'
  >('standalone');
  const [themeColor, setThemeColor] = useState('#0F172A');
  const [backgroundColor, setBackgroundColor] = useState('#0F172A');
  const [separateMaskable, setSeparateMaskable] = useState(true);
  const [includeIOSMeta, setIncludeIOSMeta] = useState(true);
  const [enableViteDevSw, setEnableViteDevSw] = useState(true);

  // Service worker code tab
  const [swCodeTab, setSwCodeTab] = useState<
    'vite-config' | 'sw-workbox' | 'html-head'
  >('vite-config');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCopy = (key: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1800);
  };

  const handleDownloadFile = (
    filename: string,
    content: string,
    mime = 'application/json'
  ) => {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Live GitHub API repository inspection
  const handleLoadGitHubRepo = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = repoInput
      .trim()
      .replace(/^https?:\/\/github\.com\//i, '')
      .replace(/\/+$/, '');

    if (cleaned.toLowerCase() === 'epodivilov/vscode-gitlens') {
      setRepo(GITLENS_REPO_PROFILE);
      setRepoFetchError(null);
      return;
    }

    const parts = cleaned.split('/');
    if (parts.length < 2) {
      setRepoFetchError('Enter a valid GitHub repository in owner/name format.');
      return;
    }

    const [owner, name] = parts;
    setIsFetchingRepo(true);
    setRepoFetchError(null);

    try {
      const [repoRes, contentsRes, commitsRes] = await Promise.all([
        fetch(`https://api.github.com/repos/${owner}/${name}`),
        fetch(`https://api.github.com/repos/${owner}/${name}/contents`),
        fetch(`https://api.github.com/repos/${owner}/${name}/commits?per_page=1`),
      ]);

      if (!repoRes.ok) {
        throw new Error(`GitHub repository "${owner}/${name}" not found (${repoRes.status}).`);
      }

      const repoData = await repoRes.json();
      const contentsData = contentsRes.ok ? await contentsRes.json() : [];
      const commitsData = commitsRes.ok ? await commitsRes.json() : [];
      const latestCommit = Array.isArray(commitsData) && commitsData[0] ? commitsData[0] : null;

      const mappedFiles = Array.isArray(contentsData)
        ? contentsData.slice(0, 20).map((item: { name: string; type: string }) => {
            const isConfig =
              /package\.json|vite\.config|webpack|tsconfig|manifest/i.test(
                item.name
              );
            const isSrc = /^src$|^app$|^components$/i.test(item.name);
            return {
              name: item.name,
              kind: (item.type === 'dir' ? 'dir' : 'file') as 'dir' | 'file',
              commitMessage: latestCommit?.commit?.message?.split('\n')[0] || 'Repository entry',
              updatedAgo: 'Latest HEAD',
              pwaRole: isConfig
                ? 'Build & PWA manifest configuration target'
                : isSrc
                ? 'Application UI & Service Worker registration tree'
                : 'Repository static / workspace resource',
              pwaReady: (isSrc ? 'needs-adapter' : 'ready') as
                | 'ready'
                | 'needs-adapter'
                | 'neutral',
            };
          })
        : GITLENS_REPO_PROFILE.files;

      setRepo({
        owner: repoData.owner?.login || owner,
        name: repoData.name || name,
        forkedFrom: repoData.parent?.full_name || 'Standalone Repository',
        branch: repoData.default_branch || 'main',
        aheadCount: 0,
        behindCount: 0,
        latestCommitSha: latestCommit?.sha ? latestCommit.sha.slice(0, 7) : 'HEAD',
        latestCommitAuthor:
          latestCommit?.author?.login ||
          latestCommit?.commit?.author?.name ||
          owner,
        latestCommitMessage:
          latestCommit?.commit?.message?.split('\n')[0] ||
          repoData.description ||
          'Latest commit',
        latestCommitTime: 'Recent',
        description:
          repoData.description ||
          `Progressive Web App packaging workspace for ${owner}/${name}.`,
        homepage: repoData.homepage || repoData.html_url || '',
        installsCount: `${repoData.stargazers_count ?? 0} stars`,
        licenseSummary: repoData.license?.spdx_id || 'Open Source',
        languages: [{ name: repoData.language || 'TypeScript', pct: 100 }],
        files: mappedFiles,
        modules: GITLENS_REPO_PROFILE.modules,
      });

      setManifestName(`${repoData.name} PWA`);
      setManifestShortName(
        (repoData.name || 'AppPWA').replace(/[^a-zA-Z0-9]/g, '').slice(0, 12)
      );
      if (repoData.description) {
        setManifestDescription(repoData.description);
      }
    } catch (err: unknown) {
      setRepoFetchError(
        err instanceof Error ? err.message : 'Failed to load GitHub repository.'
      );
    } finally {
      setIsFetchingRepo(false);
    }
  };

  const toggleModuleSelection = (id: string) => {
    setSelectedModuleIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const updateModuleStrategy = (
    id: string,
    strategy: RepoModuleEntry['offlineStrategy']
  ) => {
    setRepo((prev) => ({
      ...prev,
      modules: prev.modules.map((m) =>
        m.id === id ? { ...m, offlineStrategy: strategy } : m
      ),
    }));
  };

  const filteredFiles = useMemo(() => {
    return repo.files.filter((f) => {
      const matchesTab =
        fileFilter === 'all' ? true : f.pwaReady === fileFilter;
      const matchesSearch =
        !fileSearch.trim() ||
        f.name.toLowerCase().includes(fileSearch.toLowerCase()) ||
        f.commitMessage.toLowerCase().includes(fileSearch.toLowerCase()) ||
        f.pwaRole.toLowerCase().includes(fileSearch.toLowerCase());
      return matchesTab && matchesSearch;
    });
  }, [repo.files, fileFilter, fileSearch]);

  const manifestObject = useMemo(() => {
    return {
      id: manifestId || '/',
      name: manifestName,
      short_name: manifestShortName,
      description: manifestDescription,
      start_url: manifestStartUrl || '/',
      scope: manifestScope || '/',
      display: manifestDisplay,
      theme_color: themeColor,
      background_color: backgroundColor,
      icons: [
        {
          src: '/pwa-192x192.png',
          sizes: '192x192',
          type: 'image/png',
          purpose: 'any',
        },
        {
          src: '/pwa-512x512.png',
          sizes: '512x512',
          type: 'image/png',
          purpose: separateMaskable ? 'any' : 'any maskable',
        },
        ...(separateMaskable
          ? [
              {
                src: '/pwa-maskable-512x512.png',
                sizes: '512x512',
                type: 'image/png',
                purpose: 'maskable',
              },
            ]
          : []),
      ],
    };
  }, [
    manifestId,
    manifestName,
    manifestShortName,
    manifestDescription,
    manifestStartUrl,
    manifestScope,
    manifestDisplay,
    themeColor,
    backgroundColor,
    separateMaskable,
  ]);

  const manifestJsonString = useMemo(
    () => JSON.stringify(manifestObject, null, 2),
    [manifestObject]
  );

  const viteConfigString = useMemo(() => {
    return `import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'icon.svg'],
      manifest: ${JSON.stringify(manifestObject, null, 6).replace(/\n/g, '\n      ')},
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,woff2}'],
        runtimeCaching: [
${repo.modules
  .filter((m) => selectedModuleIds.includes(m.id))
  .map(
    (m) => `          {
            // ${m.title} (${m.entryPoint})
            urlPattern: new RegExp('/${m.id}/.*'),
            handler: '${m.offlineStrategy}',
            options: {
              cacheName: 'gitlens-${m.id}-cache',
              expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          }`
  )
  .join(',\n')}
        ],
      },
      devOptions: {
        enabled: ${enableViteDevSw},
        type: 'module',
      },
    }),
  ],
});`;
  }, [manifestObject, repo.modules, selectedModuleIds, enableViteDevSw]);

  const htmlHeadSnippet = useMemo(() => {
    return `<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${manifestName}</title>
  <meta name="description" content="${manifestDescription}" />
  <meta name="theme-color" content="${themeColor}" />
  <meta name="mobile-web-app-capable" content="yes" />${
    includeIOSMeta
      ? `
  <meta name="apple-mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-status-bar-style" content="default" />
  <meta name="apple-mobile-web-app-title" content="${manifestShortName}" />
  <link rel="apple-touch-icon" href="/apple-touch-icon.png" />`
      : ''
  }
  <link rel="icon" type="image/svg+xml" href="/icon.svg" />
  <link rel="manifest" href="/manifest.webmanifest" />
</head>`;
  }, [
    manifestName,
    manifestDescription,
    themeColor,
    includeIOSMeta,
    manifestShortName,
  ]);

  const auditChecks: PWAAuditCheck[] = useMemo(() => {
    return [
      {
        id: 'short-name-length',
        category: 'Manifest',
        title: 'Short Name Length (≤ 12 characters)',
        requirement: `Current: "${manifestShortName}" (${manifestShortName.length} chars)`,
        passed:
          manifestShortName.trim().length > 0 &&
          manifestShortName.trim().length <= 12,
        remediation:
          'Keep short_name to 12 characters or fewer so mobile launchers do not truncate it.',
      },
      {
        id: 'standalone-display',
        category: 'Manifest',
        title: 'Standalone Display Mode',
        requirement: `Current display: "${manifestDisplay}"`,
        passed:
          manifestDisplay === 'standalone' || manifestDisplay === 'fullscreen',
        remediation:
          'Set display to "standalone" so the app launches without browser chrome.',
      },
      {
        id: 'identity-scope',
        category: 'Manifest',
        title: 'Explicit App ID, Start URL & Scope',
        requirement: `id: "${manifestId}" · start_url: "${manifestStartUrl}" · scope: "${manifestScope}"`,
        passed:
          Boolean(manifestId.trim()) &&
          Boolean(manifestStartUrl.trim()) &&
          Boolean(manifestScope.trim()),
        remediation:
          'Provide explicit id, start_url, and scope fields in manifest.webmanifest.',
      },
      {
        id: 'maskable-separation',
        category: 'Icons & iOS',
        title: 'Separate "any" and "maskable" Icon Purposes',
        requirement: separateMaskable
          ? 'Separate 192/512 "any" + 512 "maskable" icons configured'
          : 'Combined "any maskable" detected (risk of Android edge clipping)',
        passed: separateMaskable,
        remediation:
          'Do not combine "any maskable" on unpadded icons; provide a dedicated padded maskable icon.',
      },
      {
        id: 'ios-safari-png',
        category: 'Icons & iOS',
        title: 'iOS Safari PNG Touch Icon & Meta Tags',
        requirement: includeIOSMeta
          ? 'apple-touch-icon.png (180×180 PNG) + apple-mobile-web-app-capable present'
          : 'Missing iOS Safari home screen meta tags',
        passed: includeIOSMeta,
        remediation:
          'Include <link rel="apple-touch-icon" href="/apple-touch-icon.png"> pointing to a PNG file.',
      },
      {
        id: 'vite-dev-sw',
        category: 'Service Worker',
        title: 'Service Worker Active in Dev & Preview Mode',
        requirement: enableViteDevSw
          ? 'devOptions.enabled: true in vite.config.ts'
          : 'Service Worker disabled in development preview',
        passed: enableViteDevSw,
        remediation:
          'Enable devOptions.enabled: true in VitePWA so the Service Worker can be tested in preview.',
      },
      {
        id: 'webview-modules',
        category: 'Architecture',
        title: 'GitLens Webview Custom Elements Bundled',
        requirement: `${selectedModuleIds.length} of ${repo.modules.length} modules selected for precache`,
        passed: selectedModuleIds.length > 0,
        remediation:
          'Select at least one GitLens webview module (e.g. Commit Graph) to bundle.',
      },
    ];
  }, [
    manifestShortName,
    manifestDisplay,
    manifestId,
    manifestStartUrl,
    manifestScope,
    separateMaskable,
    includeIOSMeta,
    enableViteDevSw,
    selectedModuleIds.length,
    repo.modules.length,
  ]);

  const passedCount = auditChecks.filter((c) => c.passed).length;
  const auditScorePct = Math.round((passedCount / auditChecks.length) * 100);

  const handleAutoFixCompliance = () => {
    if (manifestShortName.length > 12 || manifestShortName.length === 0) {
      setManifestShortName('GitLensPWA');
    }
    setManifestDisplay('standalone');
    setManifestId('/');
    setManifestStartUrl('/');
    setManifestScope('/');
    setSeparateMaskable(true);
    setIncludeIOSMeta(true);
    setEnableViteDevSw(true);
    if (selectedModuleIds.length === 0) {
      setSelectedModuleIds(repo.modules.map((m) => m.id));
    }
  };

  const totalBundleKb = useMemo(() => {
    return repo.modules
      .filter((m) => selectedModuleIds.includes(m.id))
      .reduce((acc, item) => acc + item.bundleWeightKb, 0);
  }, [repo.modules, selectedModuleIds]);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      {/* Strict 3-Zone Top Bar Contract */}
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200 px-6 py-3.5 flex items-center justify-between gap-4">
        {/* Zone 1: Single text element wordmark */}
        <a
          href="#top"
          onClick={(e) => {
            e.preventDefault();
            setActiveSection('audit');
          }}
          className="font-display text-2xl tracking-tight text-slate-900 whitespace-nowrap shrink-0"
        >
          PWABuildr
        </a>

        {/* Zone 2: 6 clean text navigation links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
          {(
            [
              { id: 'audit', label: 'Repository Audit' },
              { id: 'dns', label: 'DNS & Origin' },
              { id: 'manifest', label: 'Manifest Studio' },
              { id: 'service-worker', label: 'Service Worker' },
              { id: 'icons', label: 'Icon Lab' },
              { id: 'gmail', label: 'Gmail Dispatch' },
            ] as const
          ).map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveSection(item.id)}
              className={`py-1 transition-colors whitespace-nowrap shrink-0 cursor-pointer border-b-2 ${
                activeSection === item.id
                  ? 'border-blue-600 text-slate-900 font-semibold'
                  : 'border-transparent hover:text-slate-900'
              }`}
            >
              {item.label}
            </button>
          ))}
        </nav>

        {/* Zone 3: 2 primary actions */}
        <div className="flex items-center gap-2.5 shrink-0">
          <PWAInstallButton />
          <button
            type="button"
            onClick={() =>
              handleDownloadFile(
                'manifest.webmanifest',
                manifestJsonString,
                'application/manifest+json'
              )
            }
            className="px-3.5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Export Manifest
          </button>
        </div>
      </header>

      {/* Mobile Navigation Bar (for narrow viewports) */}
      <div className="md:hidden bg-white border-b border-slate-200 px-4 py-2 flex items-center gap-2 overflow-x-auto">
        {(
          [
            { id: 'audit', label: 'Audit' },
            { id: 'dns', label: 'DNS & Origin' },
            { id: 'manifest', label: 'Manifest' },
            { id: 'service-worker', label: 'Service Worker' },
            { id: 'icons', label: 'Icon Lab' },
            { id: 'gmail', label: 'Gmail' },
          ] as const
        ).map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setActiveSection(item.id)}
            className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap shrink-0 cursor-pointer ${
              activeSection === item.id
                ? 'bg-slate-900 text-white'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* Main Content Container (1440px Desktop Presence) */}
      <main className="flex-1 w-full max-w-[1360px] mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* Firebase Auth & Firestore Saved Repository Configurations */}
        <SavedConfigsBar
          currentRepoFullName={`${repo.owner}/${repo.name}`}
          currentBranch={repo.branch}
          manifestName={manifestName}
          manifestShortName={manifestShortName}
          manifestDisplay={manifestDisplay}
          themeColor={themeColor}
          backgroundColor={backgroundColor}
          dnsDomain={dnsSnapshot.domain}
          selectedModuleCount={selectedModuleIds.length}
          onLoadConfig={(cfg: SavedRepoConfigDoc) => {
            const [ownerPart, namePart] = cfg.repoFullName.split('/');
            setRepoInput(cfg.repoFullName);
            setRepo((prev) => ({
              ...prev,
              owner: ownerPart || prev.owner,
              name: namePart || prev.name,
              branch: cfg.branch || prev.branch,
            }));
            setManifestName(cfg.manifestName);
            setManifestShortName(cfg.manifestShortName);
            setManifestDisplay(cfg.manifestDisplay);
            setThemeColor(cfg.themeColor);
            setBackgroundColor(cfg.backgroundColor);
            setDnsSnapshot((prev) => ({
              ...prev,
              domain: cfg.dnsDomain || prev.domain,
            }));
            setSelectedModuleIds(
              repo.modules
                .slice(0, Math.max(1, cfg.selectedModuleCount))
                .map((m) => m.id)
            );
          }}
        />

        {/* Repository Context Header & Live GitHub Switcher */}
        <section className="bg-white border border-slate-200 rounded-xl p-6 divide-y divide-slate-200">
          <div className="pb-6 flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
            <div className="space-y-2 max-w-3xl">
              {/* Unboxed clean metadata kicker (Zero-Pill Discipline) */}
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 font-mono tabular-nums">
                <span className="font-semibold text-slate-800">
                  {repo.owner}/{repo.name}
                </span>
                <span aria-hidden="true">·</span>
                <span>forked from {repo.forkedFrom}</span>
                <span aria-hidden="true">·</span>
                <span>
                  {repo.aheadCount} ahead / {repo.behindCount} behind {repo.branch}
                </span>
                <span aria-hidden="true">·</span>
                <span>
                  HEAD {repo.latestCommitSha} ({repo.latestCommitMessage}) by{' '}
                  {repo.latestCommitAuthor}
                </span>
              </div>

              <h1
                className="text-2xl sm:text-3xl font-semibold text-slate-900 tracking-tight"
                style={{ textWrap: 'balance' }}
              >
                Progressive Web App Packaging &amp; Workspace Studio for{' '}
                {repo.name}
              </h1>

              <p className="text-sm text-slate-600 leading-relaxed">
                {repo.description}
              </p>

              {/* Unboxed language & license breakdown */}
              <div className="pt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500 font-mono tabular-nums">
                {repo.languages.map((lang, idx) => (
                  <React.Fragment key={lang.name}>
                    <span>
                      {lang.name} {lang.pct}%
                    </span>
                    {idx < repo.languages.length - 1 && (
                      <span aria-hidden="true">·</span>
                    )}
                  </React.Fragment>
                ))}
                <span aria-hidden="true">·</span>
                <span>{repo.installsCount} installs</span>
                <span aria-hidden="true">·</span>
                <span>{repo.licenseSummary}</span>
              </div>
            </div>

            {/* Live GitHub Repo Loader */}
            <form
              onSubmit={handleLoadGitHubRepo}
              className="w-full lg:w-80 shrink-0 space-y-2"
            >
              <label className="block text-xs font-semibold text-slate-700">
                Inspect GitHub Repository (owner/repo)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={repoInput}
                  onChange={(e) => setRepoInput(e.target.value)}
                  placeholder="epodivilov/vscode-gitlens"
                  className="flex-1 min-w-0 px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600"
                />
                <button
                  type="submit"
                  disabled={isFetchingRepo}
                  className="px-3 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  {isFetchingRepo ? 'Loading...' : 'Load'}
                </button>
              </div>
              {repoFetchError ? (
                <p className="text-xs text-red-600">{repoFetchError}</p>
              ) : (
                <div className="flex items-center justify-between text-[11px] text-slate-500">
                  <span>Pre-loaded: epodivilov/vscode-gitlens</span>
                  {repo.name !== 'vscode-gitlens' && (
                    <button
                      type="button"
                      onClick={() => {
                        setRepoInput('epodivilov/vscode-gitlens');
                        setRepo(GITLENS_REPO_PROFILE);
                      }}
                      className="text-blue-600 hover:underline font-medium cursor-pointer"
                    >
                      Reset to GitLens
                    </button>
                  )}
                </div>
              )}
            </form>
          </div>

          {/* Summary Bar with Tabular Numerals */}
          <div className="pt-5 grid grid-cols-2 sm:grid-cols-4 gap-6">
            <div>
              <div className="text-xs text-slate-500">PWA Audit Readiness</div>
              <div className="text-xl font-semibold font-mono tabular-nums text-slate-900 mt-0.5">
                {auditScorePct}% ({passedCount}/{auditChecks.length} checks)
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-500">
                Packaged Webview Modules
              </div>
              <div className="text-xl font-semibold font-mono tabular-nums text-slate-900 mt-0.5">
                {selectedModuleIds.length} / {repo.modules.length} active
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-500">
                Estimated Precache Footprint
              </div>
              <div className="text-xl font-semibold font-mono tabular-nums text-slate-900 mt-0.5">
                {totalBundleKb} KB
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-500">
                Origin DNS ({dnsSnapshot.domain})
              </div>
              <button
                type="button"
                onClick={() => setActiveSection('dns')}
                className="text-left text-xl font-semibold font-mono tabular-nums text-blue-600 hover:underline mt-0.5 truncate block cursor-pointer"
              >
                {dnsSnapshot.answers.length} records · {dnsSnapshot.latencyMs} ms
              </button>
            </div>
          </div>
        </section>

        {/* SECTION 01B: DNS & ORIGIN INSPECTOR */}
        {activeSection === 'dns' && (
          <DnsInspectorPanel
            dnsSnapshot={dnsSnapshot}
            onUpdateSnapshot={setDnsSnapshot}
            onDispatchToGmail={() => setActiveSection('gmail')}
          />
        )}

        {/* SECTION 01: REPOSITORY AUDIT & GITLENS WEBVIEW MATRIX */}
        {activeSection === 'audit' && (
          <div className="space-y-8">
            {/* GitLens Webview Modules Packaging Matrix */}
            <section className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-200">
              <div className="p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">
                    01. GitLens Interactive Webview &amp; Agent Modules
                  </h2>
                  <p className="text-sm text-slate-600 mt-1">
                    Select which VS Code GitLens views to expose as standalone PWA routes and configure their Workbox offline caching strategies.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setSelectedModuleIds(repo.modules.map((m) => m.id))
                    }
                    className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
                  >
                    Select All
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveSection('gmail')}
                    className="px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
                  >
                    Email Report via Gmail
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500 bg-slate-50/60">
                      <th className="py-3 px-6">Include</th>
                      <th className="py-3 px-4">Module &amp; Entry Point</th>
                      <th className="py-3 px-4">Capability Summary</th>
                      <th className="py-3 px-4">Tier</th>
                      <th className="py-3 px-4">Workbox Strategy</th>
                      <th className="py-3 px-6 text-right">Size (KB)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-sm">
                    {repo.modules.map((mod) => {
                      const isChecked = selectedModuleIds.includes(mod.id);
                      return (
                        <tr
                          key={mod.id}
                          className="hover:bg-slate-50/80 transition-colors"
                        >
                          <td className="py-3.5 px-6 align-top">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => toggleModuleSelection(mod.id)}
                              className="h-4 w-4 accent-blue-600 rounded cursor-pointer mt-0.5"
                            />
                          </td>
                          <td className="py-3.5 px-4 align-top">
                            <div className="font-semibold text-slate-900">
                              {mod.title}
                            </div>
                            <div className="text-xs font-mono text-slate-500 mt-0.5">
                              {mod.entryPoint}
                            </div>
                          </td>
                          <td className="py-3.5 px-4 align-top text-xs text-slate-600 max-w-md leading-relaxed">
                            {mod.description}
                          </td>
                          <td className="py-3.5 px-4 align-top text-xs text-slate-600 whitespace-nowrap">
                            {mod.status}
                          </td>
                          <td className="py-3.5 px-4 align-top">
                            <select
                              value={mod.offlineStrategy}
                              onChange={(e) =>
                                updateModuleStrategy(
                                  mod.id,
                                  e.target
                                    .value as RepoModuleEntry['offlineStrategy']
                                )
                              }
                              className="px-2.5 py-1 text-xs font-mono border border-slate-300 rounded-md bg-white text-slate-800 focus:outline-none focus:border-blue-600 cursor-pointer"
                            >
                              <option value="CacheFirst">CacheFirst</option>
                              <option value="StaleWhileRevalidate">
                                StaleWhileRevalidate
                              </option>
                              <option value="NetworkFirst">NetworkFirst</option>
                            </select>
                          </td>
                          <td className="py-3.5 px-6 align-top text-right font-mono text-xs text-slate-700 tabular-nums whitespace-nowrap">
                            {mod.bundleWeightKb} KB
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>

            {/* Two-Column Split: Repository File Tree + Live PWA Audit Checklist */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* Left 7 cols: Repository File Explorer */}
              <section className="lg:col-span-7 bg-white border border-slate-200 rounded-xl divide-y divide-slate-200">
                <div className="p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <h3 className="text-base font-semibold text-slate-900">
                      Repository Source Tree ({repo.owner}/{repo.name})
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Inspect directories, custom elements configs, and webpack/TypeScript build targets.
                    </p>
                  </div>

                  {/* Interactive Filter Controls (Segmented Buttons) */}
                  <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg self-start">
                    {(
                      [
                        { id: 'all', label: 'All' },
                        { id: 'ready', label: 'PWA Ready' },
                        { id: 'needs-adapter', label: 'Needs Adapter' },
                      ] as const
                    ).map((tab) => (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setFileFilter(tab.id)}
                        className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                          fileFilter === tab.id
                            ? 'bg-white text-slate-900 shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="px-5 py-3 bg-slate-50/50">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={fileSearch}
                      onChange={(e) => setFileSearch(e.target.value)}
                      placeholder="Filter files or commit messages (e.g. custom-elements, webpack, worktree)..."
                      className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600"
                    />
                  </div>
                </div>

                <div className="divide-y divide-slate-200 max-h-[460px] overflow-y-auto">
                  {filteredFiles.map((file) => (
                    <div
                      key={file.name}
                      className="px-5 py-3 hover:bg-slate-50 transition-colors flex items-start justify-between gap-4"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          {file.kind === 'dir' ? (
                            <Folder className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                          ) : (
                            <FileCode className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                          )}
                          <span className="text-xs font-mono font-semibold text-slate-900 truncate">
                            {file.name}
                          </span>
                          <span className="text-xs text-slate-400" aria-hidden="true">
                            ·
                          </span>
                          <span className="text-xs text-slate-600 truncate">
                            {file.pwaRole}
                          </span>
                        </div>
                        <div className="text-xs text-slate-500 truncate mt-1 pl-5">
                          {file.commitMessage}
                        </div>
                      </div>

                      <div className="text-right shrink-0 text-xs font-mono tabular-nums text-slate-500">
                        <div>{file.updatedAgo}</div>
                        <div
                          className={`mt-0.5 text-[11px] font-sans font-medium ${
                            file.pwaReady === 'needs-adapter'
                              ? 'text-amber-700'
                              : 'text-emerald-700'
                          }`}
                        >
                          {file.pwaReady === 'needs-adapter'
                            ? 'Adapter required'
                            : 'Static ready'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* Right 5 cols: Pre-Flight Verification Checklist */}
              <section className="lg:col-span-5 bg-white border border-slate-200 rounded-xl divide-y divide-slate-200">
                <div className="p-5 flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-base font-semibold text-slate-900">
                      PWA Installability Verification
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Live audit against Chromium, Android maskable, and iOS Safari standards.
                    </p>
                  </div>
                  {auditScorePct < 100 && (
                    <button
                      type="button"
                      onClick={handleAutoFixCompliance}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      Auto-Fix All
                    </button>
                  )}
                </div>

                <div className="divide-y divide-slate-200">
                  {auditChecks.map((check) => (
                    <div key={check.id} className="p-4 flex items-start gap-3">
                      {check.passed ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-semibold text-slate-900">
                            {check.title}
                          </span>
                          <span className="text-[11px] text-slate-500 font-mono">
                            {check.category}
                          </span>
                        </div>
                        <div className="text-xs font-mono text-slate-600 mt-0.5">
                          {check.requirement}
                        </div>
                        {!check.passed && (
                          <div className="text-xs text-amber-800 mt-1">
                            Fix: {check.remediation}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          </div>
        )}

        {/* SECTION 02: MANIFEST STUDIO */}
        {activeSection === 'manifest' && (
          <section className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-200">
            <div className="p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  02. Web App Manifest Studio (manifest.webmanifest)
                </h2>
                <p className="text-sm text-slate-600 mt-1">
                  Configure installability identity, standalone window display, and icon purposes.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleCopy('manifest', manifestJsonString)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                >
                  {copiedKey === 'manifest' ? (
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                  {copiedKey === 'manifest' ? 'Copied JSON' : 'Copy JSON'}
                </button>
                <button
                  type="button"
                  onClick={() =>
                    handleDownloadFile(
                      'manifest.webmanifest',
                      manifestJsonString,
                      'application/manifest+json'
                    )
                  }
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download manifest.webmanifest
                </button>
              </div>
            </div>

            <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-8">
              <div className="lg:col-span-6 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Application Name (name)
                  </label>
                  <input
                    type="text"
                    value={manifestName}
                    onChange={(e) => setManifestName(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-semibold text-slate-700">
                        Short Name (short_name)
                      </label>
                      <span
                        className={`text-[11px] font-mono tabular-nums ${
                          manifestShortName.length > 12
                            ? 'text-amber-700 font-semibold'
                            : 'text-slate-500'
                        }`}
                      >
                        {manifestShortName.length}/12 chars
                      </span>
                    </div>
                    <input
                      type="text"
                      value={manifestShortName}
                      onChange={(e) => setManifestShortName(e.target.value)}
                      className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Display Mode (display)
                    </label>
                    <select
                      value={manifestDisplay}
                      onChange={(e) =>
                        setManifestDisplay(
                          e.target.value as
                            | 'standalone'
                            | 'minimal-ui'
                            | 'fullscreen'
                        )
                      }
                      className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg bg-white focus:outline-none focus:border-blue-600"
                    >
                      <option value="standalone">standalone (recommended)</option>
                      <option value="minimal-ui">minimal-ui</option>
                      <option value="fullscreen">fullscreen</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Description
                  </label>
                  <textarea
                    rows={2}
                    value={manifestDescription}
                    onChange={(e) => setManifestDescription(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600"
                  />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      App ID (id)
                    </label>
                    <input
                      type="text"
                      value={manifestId}
                      onChange={(e) => setManifestId(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs font-mono border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Start URL
                    </label>
                    <input
                      type="text"
                      value={manifestStartUrl}
                      onChange={(e) => setManifestStartUrl(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs font-mono border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Scope
                    </label>
                    <input
                      type="text"
                      value={manifestScope}
                      onChange={(e) => setManifestScope(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs font-mono border border-slate-300 rounded-lg"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Theme Color
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={themeColor}
                        onChange={(e) => setThemeColor(e.target.value)}
                        className="h-8 w-10 rounded border border-slate-300 cursor-pointer"
                      />
                      <span className="text-xs font-mono text-slate-700 tabular-nums">
                        {themeColor}
                      </span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Splash Background Color
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={backgroundColor}
                        onChange={(e) => setBackgroundColor(e.target.value)}
                        className="h-8 w-10 rounded border border-slate-300 cursor-pointer"
                      />
                      <span className="text-xs font-mono text-slate-700 tabular-nums">
                        {backgroundColor}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-200 space-y-2">
                  <label className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={separateMaskable}
                      onChange={(e) => setSeparateMaskable(e.target.checked)}
                      className="h-4 w-4 accent-blue-600 rounded"
                    />
                    <span>
                      Keep <code className="font-mono">purpose: &quot;any&quot;</code> separate from{' '}
                      <code className="font-mono">purpose: &quot;maskable&quot;</code> (prevents Android launcher edge clipping)
                    </span>
                  </label>
                  <label className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={includeIOSMeta}
                      onChange={(e) => setIncludeIOSMeta(e.target.checked)}
                      className="h-4 w-4 accent-blue-600 rounded"
                    />
                    <span>
                      Include iOS Safari <code className="font-mono">apple-touch-icon.png</code> and WebKit standalone meta tags
                    </span>
                  </label>
                </div>
              </div>

              <div className="lg:col-span-6">
                <div className="text-xs font-semibold text-slate-700 mb-2">
                  Live Generated manifest.webmanifest
                </div>
                <pre className="p-4 rounded-xl bg-slate-900 text-slate-100 font-mono text-xs overflow-x-auto leading-relaxed max-h-[420px]">
                  {manifestJsonString}
                </pre>
              </div>
            </div>
          </section>
        )}

        {/* SECTION 03: SERVICE WORKER & WORKBOX STUDIO */}
        {activeSection === 'service-worker' && (
          <section className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-200">
            <div className="p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  03. Service Worker &amp; VitePWA Workbox Configuration
                </h2>
                <p className="text-sm text-slate-600 mt-1">
                  Zero-configuration asset precaching, runtime caching rules for GitLens webviews, and HTML head tags.
                </p>
              </div>

              <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
                {(
                  [
                    { id: 'vite-config', label: 'vite.config.ts' },
                    { id: 'html-head', label: 'index.html <head>' },
                    { id: 'sw-workbox', label: 'TypeScript Env' },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setSwCodeTab(tab.id)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                      swCodeTab === tab.id
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={enableViteDevSw}
                      onChange={(e) => setEnableViteDevSw(e.target.checked)}
                      className="h-4 w-4 accent-blue-600 rounded"
                    />
                    Enable Service Worker in Dev Preview (devOptions.enabled: true)
                  </label>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    handleCopy(
                      swCodeTab,
                      swCodeTab === 'vite-config'
                        ? viteConfigString
                        : swCodeTab === 'html-head'
                        ? htmlHeadSnippet
                        : `/// <reference types="vite/client" />\n/// <reference types="vite-plugin-pwa/client" />`
                    )
                  }
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                >
                  {copiedKey === swCodeTab ? (
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                  {copiedKey === swCodeTab ? 'Copied' : 'Copy Snippet'}
                </button>
              </div>

              <pre className="p-5 rounded-xl bg-slate-900 text-slate-100 font-mono text-xs overflow-x-auto leading-relaxed">
                {swCodeTab === 'vite-config'
                  ? viteConfigString
                  : swCodeTab === 'html-head'
                  ? htmlHeadSnippet
                  : `// tsconfig.json\n{\n  "compilerOptions": {\n    "types": ["vite/client", "vite-plugin-pwa/client"]\n  }\n}\n\n// vite-env.d.ts\n/// <reference types="vite/client" />\n/// <reference types="vite-plugin-pwa/client" />`}
              </pre>
            </div>
          </section>
        )}

        {/* SECTION 04: ICON LAB */}
        {activeSection === 'icons' && (
          <IconLabPanel
            themeColor={themeColor}
            backgroundColor={backgroundColor}
            shortName={manifestShortName}
          />
        )}

        {/* SECTION 05: GMAIL DISPATCH */}
        {activeSection === 'gmail' && (
          <GmailWorkspacePanel
            repo={repo}
            dnsSnapshot={dnsSnapshot}
            manifestJson={manifestJsonString}
            auditScorePct={auditScorePct}
          />
        )}
      </main>

      {/* Clean Quiet Footer */}
      <footer className="bg-white border-t border-slate-200 px-6 py-4 mt-12">
        <div className="max-w-[1360px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
          <div>
            PWABuildr — Progressive Web App Studio &amp; Repository Packager
          </div>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setActiveSection('audit')}
              className="hover:text-slate-900 cursor-pointer"
            >
              Repository Audit
            </button>
            <button
              type="button"
              onClick={() => setActiveSection('manifest')}
              className="hover:text-slate-900 cursor-pointer"
            >
              Manifest Studio
            </button>
            <button
              type="button"
              onClick={() => setActiveSection('gmail')}
              className="hover:text-slate-900 cursor-pointer"
            >
              Gmail Dispatch
            </button>
          </div>
        </div>
      </footer>

      <OfflineIndicator />
    </div>
  );
}
