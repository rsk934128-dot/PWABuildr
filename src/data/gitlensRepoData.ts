export interface RepoFileEntry {
  name: string;
  kind: 'dir' | 'file';
  commitMessage: string;
  updatedAgo: string;
  pwaRole: string;
  pwaReady: 'ready' | 'needs-adapter' | 'neutral';
}

export interface RepoModuleEntry {
  id: string;
  title: string;
  category: string;
  description: string;
  status: 'Core Free' | 'Pro / Public Free' | 'Experimental' | 'Preview';
  offlineStrategy: 'CacheFirst' | 'StaleWhileRevalidate' | 'NetworkFirst';
  entryPoint: string;
  bundleWeightKb: number;
}

export interface PWAAuditCheck {
  id: string;
  category: 'Manifest' | 'Service Worker' | 'Icons & iOS' | 'Architecture';
  title: string;
  requirement: string;
  passed: boolean;
  remediation: string;
}

export interface RepositoryProfile {
  owner: string;
  name: string;
  forkedFrom: string;
  branch: string;
  aheadCount: number;
  behindCount: number;
  latestCommitSha: string;
  latestCommitAuthor: string;
  latestCommitMessage: string;
  latestCommitTime: string;
  description: string;
  homepage: string;
  installsCount: string;
  licenseSummary: string;
  languages: Array<{ name: string; pct: number }>;
  files: RepoFileEntry[];
  modules: RepoModuleEntry[];
}

export const GITLENS_REPO_PROFILE: RepositoryProfile = {
  owner: 'epodivilov',
  name: 'vscode-gitlens',
  forkedFrom: 'gitkraken/vscode-gitlens',
  branch: 'main',
  aheadCount: 138,
  behindCount: 624,
  latestCommitSha: '4b3aa3f',
  latestCommitAuthor: 'julianmesa-gitkraken',
  latestCommitMessage: 'Bumps core to v0.5.111',
  latestCommitTime: '2 months ago',
  description:
    'Supercharge Git inside VS Code and unlock untapped knowledge within each repository — Visualize code authorship at a glance via Git blame annotations and CodeLens, seamlessly navigate and explore Git repositories, gain valuable insights via rich visualizations and powerful comparison commands.',
  homepage: 'https://gitkraken.com/gitlens',
  installsCount: '51,000,000+',
  licenseSummary: 'MIT License + LICENSE.plus (for files under plus/)',
  languages: [
    { name: 'TypeScript', pct: 96.9 },
    { name: 'JavaScript', pct: 1.6 },
    { name: 'SCSS', pct: 1.5 },
  ],
  files: [
    {
      name: '.augment',
      kind: 'dir',
      commitMessage: 'Adds symlink to share skills with Augment',
      updatedAgo: '5 months ago',
      pwaRole: 'Agent skill definitions',
      pwaReady: 'neutral',
    },
    {
      name: '.claude',
      kind: 'dir',
      commitMessage: 'Consolidates skill working docs under a single .work root',
      updatedAgo: '2 months ago',
      pwaRole: 'Claude Code session workspace metadata',
      pwaReady: 'neutral',
    },
    {
      name: '.devcontainer',
      kind: 'dir',
      commitMessage: 'Updates devcontainer image to Node.js & TypeScript 1-22-bullseye',
      updatedAgo: '7 months ago',
      pwaRole: 'Containerized Node 22 build environment',
      pwaReady: 'ready',
    },
    {
      name: '.github',
      kind: 'dir',
      commitMessage: 'Fixes provider integrations for external consumers',
      updatedAgo: '2 months ago',
      pwaRole: 'CI/CD workflows & release automation',
      pwaReady: 'ready',
    },
    {
      name: 'docs',
      kind: 'dir',
      commitMessage: 'fix(integrations): harden provider facade contracts',
      updatedAgo: '2 months ago',
      pwaRole: 'Offline documentation precache candidate',
      pwaReady: 'ready',
    },
    {
      name: 'images',
      kind: 'dir',
      commitMessage: 'Expose remaining provider backend surface for Kepler (gitkraken#5474)',
      updatedAgo: '2 months ago',
      pwaRole: 'Static visual assets & WebP walkthrough icons',
      pwaReady: 'ready',
    },
    {
      name: 'packages',
      kind: 'dir',
      commitMessage: 'Bumps core to v0.5.111',
      updatedAgo: '2 months ago',
      pwaRole: 'Standalone @gitlens/integrations & core workspace packages',
      pwaReady: 'ready',
    },
    {
      name: 'patches',
      kind: 'dir',
      commitMessage: "Fixes leaked comment markers in lit-html's removePart",
      updatedAgo: '3 months ago',
      pwaRole: 'lit-html webview DOM patch for clean custom elements',
      pwaReady: 'ready',
    },
    {
      name: 'resources',
      kind: 'dir',
      commitMessage: 'Switches to esbuild for tests',
      updatedAgo: '2 years ago',
      pwaRole: 'Extension icons, themes & static webview resources',
      pwaReady: 'ready',
    },
    {
      name: 'scripts',
      kind: 'dir',
      commitMessage: 'Enforces zero-warning builds and improves codegen',
      updatedAgo: '2 months ago',
      pwaRole: 'Build codegen & asset pipeline scripts',
      pwaReady: 'ready',
    },
    {
      name: 'src',
      kind: 'dir',
      commitMessage: 'fix(integrations): stop inventing a display name for a nameless member',
      updatedAgo: '2 months ago',
      pwaRole: 'Primary extension & webview UI source tree',
      pwaReady: 'needs-adapter',
    },
    {
      name: 'tests',
      kind: 'dir',
      commitMessage: 'test(integrations): pin the integer page position at the package boundary',
      updatedAgo: '2 months ago',
      pwaRole: 'E2E & unit test verification suites',
      pwaReady: 'neutral',
    },
    {
      name: 'walkthroughs/welcome',
      kind: 'dir',
      commitMessage: 'Updates walkthrough images to WebP format',
      updatedAgo: '7 months ago',
      pwaRole: 'Onboarding shell & WebP visual assets',
      pwaReady: 'ready',
    },
    {
      name: 'contributions.json',
      kind: 'file',
      commitMessage: 'Adds worktree actions to terminal and Claude tabs',
      updatedAgo: '2 months ago',
      pwaRole: 'Command & view manifest declarations',
      pwaReady: 'ready',
    },
    {
      name: 'custom-elements-manifest.config.mjs',
      kind: 'file',
      commitMessage: 'Improves static analysis of custom elements',
      updatedAgo: '4 months ago',
      pwaRole: 'Web Components custom elements schema for standalone PWA mount',
      pwaReady: 'ready',
    },
    {
      name: 'package.json',
      kind: 'file',
      commitMessage: 'Expose remaining provider backend surface for Kepler (gitkraken#5474)',
      updatedAgo: '2 months ago',
      pwaRole: 'Workspace dependencies & build targets',
      pwaReady: 'ready',
    },
    {
      name: 'tsconfig.browser.json',
      kind: 'file',
      commitMessage: 'Extracts integrations into the @gitlens/integrations workspace package',
      updatedAgo: '4 months ago',
      pwaRole: 'Browser-targeted TypeScript compilation profile',
      pwaReady: 'ready',
    },
    {
      name: 'webpack.config.mjs',
      kind: 'file',
      commitMessage: 'Enforces zero-warning builds and improves codegen',
      updatedAgo: '2 months ago',
      pwaRole: 'Webview bundle compiler (inject Manifest & Workbox plugin)',
      pwaReady: 'needs-adapter',
    },
  ],
  modules: [
    {
      id: 'commit-graph',
      title: 'Commit Graph & Uncommitted Lanes',
      category: 'Interactive Graph',
      description:
        'Interactive history, ahead/behind state, uncommitted worktree rows, stacked sheets, and Git-aware search (message:, author:, file:, change:).',
      status: 'Pro / Public Free',
      offlineStrategy: 'StaleWhileRevalidate',
      entryPoint: 'src/webviews/apps/graph/index.ts',
      bundleWeightKb: 412,
    },
    {
      id: 'visual-history',
      title: 'Visual History & Treemaps',
      category: 'Visualizations',
      description:
        'Repository evolution timeline plus Files Treemap, Commits Churn Treemap, and live Agent Activity Treemap.',
      status: 'Experimental',
      offlineStrategy: 'CacheFirst',
      entryPoint: 'src/webviews/apps/visualHistory/index.ts',
      bundleWeightKb: 285,
    },
    {
      id: 'worktrees-agents',
      title: 'Worktrees & Agent Kanban',
      category: 'Parallel Workflows',
      description:
        'Manage multiple branch checkouts without stashing and monitor live Claude Code / MCP coding agent sessions on a Kanban board.',
      status: 'Experimental',
      offlineStrategy: 'NetworkFirst',
      entryPoint: 'src/views/worktreesView.ts',
      bundleWeightKb: 198,
    },
    {
      id: 'launchpad',
      title: 'Launchpad & Stacked PRs',
      category: 'Pull Requests',
      description:
        'Triage pull requests ordered by blocking state, review diffs in place, and merge GitHub stacked PR layers.',
      status: 'Pro / Public Free',
      offlineStrategy: 'NetworkFirst',
      entryPoint: 'src/webviews/apps/launchpad/index.ts',
      bundleWeightKb: 234,
    },
    {
      id: 'interactive-rebase',
      title: 'Interactive Rebase Editor',
      category: 'History Shaping',
      description:
        'Drag-and-drop commit reordering, squash/reword/drop controls, conflict prediction, and single-undo Automatic Rebase.',
      status: 'Core Free',
      offlineStrategy: 'CacheFirst',
      entryPoint: 'src/webviews/apps/rebase/index.ts',
      bundleWeightKb: 164,
    },
    {
      id: 'cloud-patches',
      title: 'Cloud Patches & Workspaces',
      category: 'Collaboration',
      description:
        'Share work-in-progress diffs, commits, or stashes as private links and synchronize multi-repo workspaces.',
      status: 'Preview',
      offlineStrategy: 'NetworkFirst',
      entryPoint: 'src/views/cloudPatchesView.ts',
      bundleWeightKb: 142,
    },
  ],
};
