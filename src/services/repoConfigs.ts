import {
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { User } from 'firebase/auth';
import {
  db,
  OperationType,
  handleFirestoreError,
} from './auth';

export interface UserProfileDoc {
  uid: string;
  displayName: string;
  githubUsername: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface SavedRepoConfigDoc {
  id: string;
  ownerId: string;
  githubUsername: string;
  repoFullName: string;
  branch: string;
  manifestName: string;
  manifestShortName: string;
  manifestDisplay: 'standalone' | 'minimal-ui' | 'fullscreen';
  themeColor: string;
  backgroundColor: string;
  dnsDomain: string;
  selectedModuleCount: number;
  status: 'active' | 'archived';
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

const ID_REGEX = /^[a-zA-Z0-9_-]+$/;
const REPO_FULL_NAME_REGEX = /^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/;
const HEX_COLOR_REGEX = /^#[0-9a-fA-F]{3,8}$/;

function sanitizeGithubUsername(input: string): string {
  const cleaned = input.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 60);
  return cleaned.length > 0 ? cleaned : 'epodivilov';
}

function sanitizeRepoFullName(input: string): string {
  const trimmed = input.trim().slice(0, 140);
  if (REPO_FULL_NAME_REGEX.test(trimmed) && trimmed.length >= 3) {
    return trimmed;
  }
  return 'epodivilov/vscode-gitlens';
}

function sanitizeHexColor(input: string, fallback = '#0F172A'): string {
  return HEX_COLOR_REGEX.test(input) ? input : fallback;
}

export async function ensureUserProfile(
  user: User,
  preferredGithubUsername?: string
): Promise<UserProfileDoc> {
  const path = `userProfiles/${user.uid}`;
  const ref = doc(db, 'userProfiles', user.uid);

  let existingSnap;
  try {
    existingSnap = await getDoc(ref);
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }

  const displayName = (
    user.displayName ||
    user.email?.split('@')[0] ||
    'Developer'
  ).slice(0, 100);

  if (existingSnap && existingSnap.exists()) {
    const data = existingSnap.data() as UserProfileDoc;
    if (
      preferredGithubUsername &&
      preferredGithubUsername !== data.githubUsername
    ) {
      const cleanHandle = sanitizeGithubUsername(preferredGithubUsername);
      try {
        await updateDoc(ref, {
          displayName,
          githubUsername: cleanHandle,
          updatedAt: serverTimestamp(),
        });
        return {
          ...data,
          displayName,
          githubUsername: cleanHandle,
        };
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, path);
      }
    }
    return data;
  }

  const githubUsername = sanitizeGithubUsername(
    preferredGithubUsername ||
      user.email?.split('@')[0] ||
      'epodivilov'
  );

  const newProfile = {
    uid: user.uid,
    displayName,
    githubUsername,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  try {
    await setDoc(ref, newProfile);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }

  return {
    uid: user.uid,
    displayName,
    githubUsername,
  };
}

export function subscribeToUserRepoConfigs(
  userId: string,
  onData: (configs: SavedRepoConfigDoc[]) => void,
  onError?: (err: Error) => void
) {
  const path = 'repoConfigs';
  const q = query(
    collection(db, 'repoConfigs'),
    where('ownerId', '==', userId)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const items: SavedRepoConfigDoc[] = snapshot.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<SavedRepoConfigDoc, 'id'>),
      }));
      // Sort client-side by updatedAt desc
      items.sort((a, b) => {
        const tA = a.updatedAt?.toMillis?.() ?? 0;
        const tB = b.updatedAt?.toMillis?.() ?? 0;
        return tB - tA;
      });
      onData(items);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (thrown) {
        if (onError && thrown instanceof Error) {
          onError(thrown);
        }
      }
    }
  );
}

export async function saveRepoConfiguration(
  user: User,
  params: {
    configId?: string;
    githubUsername: string;
    repoFullName: string;
    branch: string;
    manifestName: string;
    manifestShortName: string;
    manifestDisplay: 'standalone' | 'minimal-ui' | 'fullscreen';
    themeColor: string;
    backgroundColor: string;
    dnsDomain: string;
    selectedModuleCount: number;
    existingConfigs?: SavedRepoConfigDoc[];
  }
): Promise<string> {
  // Ensure parent UserProfile exists first (required by Global Consistency Invariant in firestore.rules)
  await ensureUserProfile(user, params.githubUsername);

  const rawId =
    params.configId && ID_REGEX.test(params.configId)
      ? params.configId
      : `cfg_${user.uid.slice(0, 12)}_${params.repoFullName
          .replace(/[^a-zA-Z0-9_-]/g, '_')
          .slice(0, 40)}`;
  const configId = rawId.slice(0, 120);
  const path = `repoConfigs/${configId}`;
  const ref = doc(db, 'repoConfigs', configId);

  const matchedExisting = params.existingConfigs?.find(
    (c) => c.id === configId
  );

  const sanitizedPayload = {
    githubUsername: sanitizeGithubUsername(params.githubUsername),
    repoFullName: sanitizeRepoFullName(params.repoFullName),
    branch: (params.branch.trim() || 'main').slice(0, 80),
    manifestName: (params.manifestName.trim() || 'GitLens PWA').slice(0, 120),
    manifestShortName: (
      params.manifestShortName.trim() || 'GitLensPWA'
    ).slice(0, 12),
    manifestDisplay: (['standalone', 'minimal-ui', 'fullscreen'].includes(
      params.manifestDisplay
    )
      ? params.manifestDisplay
      : 'standalone') as 'standalone' | 'minimal-ui' | 'fullscreen',
    themeColor: sanitizeHexColor(params.themeColor, '#0F172A'),
    backgroundColor: sanitizeHexColor(params.backgroundColor, '#0F172A'),
    dnsDomain: (params.dnsDomain.trim() || 'gitkraken.com').slice(0, 120),
    selectedModuleCount: Math.max(
      1,
      Math.min(20, Math.round(params.selectedModuleCount || 1))
    ),
  };

  if (matchedExisting) {
    if (matchedExisting.status === 'archived') {
      try {
        await deleteDoc(ref);
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, path);
      }
    } else {
      try {
        await updateDoc(ref, {
          ...sanitizedPayload,
          updatedAt: serverTimestamp(),
        });
        return configId;
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, path);
      }
    }
  }

  try {
    await setDoc(ref, {
      ownerId: user.uid,
      ...sanitizedPayload,
      status: 'active',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }

  return configId;
}

export async function archiveRepoConfiguration(configId: string): Promise<void> {
  const path = `repoConfigs/${configId}`;
  const ref = doc(db, 'repoConfigs', configId);
  try {
    await updateDoc(ref, {
      status: 'archived',
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteRepoConfiguration(configId: string): Promise<void> {
  const path = `repoConfigs/${configId}`;
  const ref = doc(db, 'repoConfigs', configId);
  try {
    await deleteDoc(ref);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}
