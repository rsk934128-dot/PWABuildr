/**
 * Firestore Security Rules Test Suite verifying the "Dirty Dozen" payloads
 * return PERMISSION_DENIED.
 */

export interface DirtyDozenTestCase {
  id: number;
  name: string;
  collectionPath: string;
  operation: 'create' | 'update' | 'get' | 'list' | 'delete';
  auth: { uid: string; email_verified: boolean } | null;
  payload?: Record<string, unknown>;
  expectedResult: 'PERMISSION_DENIED';
}

export const DIRTY_DOZEN_TESTS: DirtyDozenTestCase[] = [
  {
    id: 1,
    name: 'Shadow Field Injection on RepoConfig create',
    collectionPath: '/repoConfigs/cfg_01',
    operation: 'create',
    auth: { uid: 'user_1', email_verified: true },
    payload: {
      ownerId: 'user_1',
      githubUsername: 'epodivilov',
      repoFullName: 'epodivilov/vscode-gitlens',
      branch: 'main',
      manifestName: 'GitLens PWA',
      manifestShortName: 'GitLensPWA',
      manifestDisplay: 'standalone',
      themeColor: '#0F172A',
      backgroundColor: '#0F172A',
      dnsDomain: 'gitkraken.com',
      selectedModuleCount: 6,
      status: 'active',
      isVerified: true, // Ghost field
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 2,
    name: 'Unverified Email Spoofing',
    collectionPath: '/userProfiles/user_1',
    operation: 'create',
    auth: { uid: 'user_1', email_verified: false },
    payload: {
      uid: 'user_1',
      displayName: 'Spoof User',
      githubUsername: 'epodivilov',
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 3,
    name: 'Cross-Tenant Ownership Spoofing',
    collectionPath: '/repoConfigs/cfg_02',
    operation: 'create',
    auth: { uid: 'attacker_uid', email_verified: true },
    payload: {
      ownerId: 'victim_uid',
      githubUsername: 'epodivilov',
      repoFullName: 'epodivilov/vscode-gitlens',
      branch: 'main',
      manifestName: 'GitLens PWA',
      manifestShortName: 'GitLensPWA',
      manifestDisplay: 'standalone',
      themeColor: '#0F172A',
      backgroundColor: '#0F172A',
      dnsDomain: 'gitkraken.com',
      selectedModuleCount: 6,
      status: 'active',
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 4,
    name: 'Orphaned RepoConfig Creation without UserProfile',
    collectionPath: '/repoConfigs/cfg_03',
    operation: 'create',
    auth: { uid: 'user_without_profile', email_verified: true },
    payload: {
      ownerId: 'user_without_profile',
      githubUsername: 'epodivilov',
      repoFullName: 'epodivilov/vscode-gitlens',
      branch: 'main',
      manifestName: 'GitLens PWA',
      manifestShortName: 'GitLensPWA',
      manifestDisplay: 'standalone',
      themeColor: '#0F172A',
      backgroundColor: '#0F172A',
      dnsDomain: 'gitkraken.com',
      selectedModuleCount: 6,
      status: 'active',
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 5,
    name: 'ID Poisoning Attack with invalid characters',
    collectionPath: '/repoConfigs/invalid$id!@#',
    operation: 'create',
    auth: { uid: 'user_1', email_verified: true },
    payload: {},
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 6,
    name: 'Short Name Boundary Violation (> 12 chars)',
    collectionPath: '/repoConfigs/cfg_06',
    operation: 'create',
    auth: { uid: 'user_1', email_verified: true },
    payload: {
      manifestShortName: 'ThisShortNameIsWayTooLongForLauncher',
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 7,
    name: 'Invalid Regex Repo Format (missing slash)',
    collectionPath: '/repoConfigs/cfg_07',
    operation: 'create',
    auth: { uid: 'user_1', email_verified: true },
    payload: {
      repoFullName: 'invalid_repo_format',
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 8,
    name: 'Client Timestamp Forgery (createdAt != request.time)',
    collectionPath: '/repoConfigs/cfg_08',
    operation: 'create',
    auth: { uid: 'user_1', email_verified: true },
    payload: {
      createdAt: '1999-01-01T00:00:00Z',
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 9,
    name: 'Immutable Field Mutation (changing ownerId on update)',
    collectionPath: '/repoConfigs/cfg_01',
    operation: 'update',
    auth: { uid: 'user_1', email_verified: true },
    payload: {
      ownerId: 'user_2',
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 10,
    name: 'Terminal State Bypass (updating an archived RepoConfig)',
    collectionPath: '/repoConfigs/cfg_archived',
    operation: 'update',
    auth: { uid: 'user_1', email_verified: true },
    payload: {
      manifestName: 'Mutated After Archive',
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 11,
    name: 'Unauthorized Profile Read across tenants',
    collectionPath: '/userProfiles/victim_uid',
    operation: 'get',
    auth: { uid: 'attacker_uid', email_verified: true },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 12,
    name: 'Unfiltered RepoConfig List Scraping',
    collectionPath: '/repoConfigs',
    operation: 'list',
    auth: { uid: 'attacker_uid', email_verified: true },
    expectedResult: 'PERMISSION_DENIED',
  },
];
