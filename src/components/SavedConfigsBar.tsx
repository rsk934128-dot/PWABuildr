import React, { useEffect, useState } from 'react';
import { User } from 'firebase/auth';
import {
  Save,
  Trash2,
  Archive,
  CheckCircle2,
  AlertCircle,
  LogOut,
  FolderGit2,
} from 'lucide-react';
import {
  subscribeToFirebaseUser,
  googleSignIn,
  logout,
} from '../services/auth';
import {
  SavedRepoConfigDoc,
  ensureUserProfile,
  subscribeToUserRepoConfigs,
  saveRepoConfiguration,
  archiveRepoConfiguration,
  deleteRepoConfiguration,
} from '../services/repoConfigs';
import { GoogleSignInButton } from './GoogleSignInButton';

interface SavedConfigsBarProps {
  currentRepoFullName: string;
  currentBranch: string;
  manifestName: string;
  manifestShortName: string;
  manifestDisplay: 'standalone' | 'minimal-ui' | 'fullscreen';
  themeColor: string;
  backgroundColor: string;
  dnsDomain: string;
  selectedModuleCount: number;
  onLoadConfig: (cfg: SavedRepoConfigDoc) => void;
}

export const SavedConfigsBar: React.FC<SavedConfigsBarProps> = ({
  currentRepoFullName,
  currentBranch,
  manifestName,
  manifestShortName,
  manifestDisplay,
  themeColor,
  backgroundColor,
  dnsDomain,
  selectedModuleCount,
  onLoadConfig,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [githubHandle, setGithubHandle] = useState(
    currentRepoFullName.split('/')[0] || 'epodivilov'
  );
  const [savedConfigs, setSavedConfigs] = useState<SavedRepoConfigDoc[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);
  const [configPendingDelete, setConfigPendingDelete] =
    useState<SavedRepoConfigDoc | null>(null);

  useEffect(() => {
    const unsubscribeAuth = subscribeToFirebaseUser(async (firebaseUser) => {
      setUser(firebaseUser);
      setIsAuthReady(true);
      if (firebaseUser) {
        try {
          const profile = await ensureUserProfile(firebaseUser);
          if (profile.githubUsername) {
            setGithubHandle(profile.githubUsername);
          }
        } catch (err) {
          console.error('Profile init error:', err);
        }
      } else {
        setSavedConfigs([]);
      }
    });
    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (!isAuthReady || !user) {
      setSavedConfigs([]);
      return;
    }

    const unsubscribeSnap = subscribeToUserRepoConfigs(
      user.uid,
      (items) => {
        setSavedConfigs(items);
      },
      (err) => {
        setStatusMessage({
          type: 'error',
          text: `Failed to sync saved configurations: ${err.message}`,
        });
      }
    );

    return () => unsubscribeSnap();
  }, [isAuthReady, user]);

  const handleSignIn = async () => {
    setIsSigningIn(true);
    setStatusMessage(null);
    try {
      const result = await googleSignIn();
      if (result?.user) {
        const profile = await ensureUserProfile(
          result.user,
          currentRepoFullName.split('/')[0] || 'epodivilov'
        );
        setGithubHandle(profile.githubUsername);
      }
    } catch (err: unknown) {
      setStatusMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Google Sign-In failed.',
      });
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleSignOut = async () => {
    await logout();
    setStatusMessage(null);
  };

  const handleSaveCurrent = async () => {
    if (!user) return;
    setIsSaving(true);
    setStatusMessage(null);
    try {
      await saveRepoConfiguration(user, {
        githubUsername: githubHandle,
        repoFullName: currentRepoFullName,
        branch: currentBranch,
        manifestName,
        manifestShortName,
        manifestDisplay,
        themeColor,
        backgroundColor,
        dnsDomain,
        selectedModuleCount,
        existingConfigs: savedConfigs,
      });
      setStatusMessage({
        type: 'success',
        text: `Saved configuration for ${currentRepoFullName} to Firestore.`,
      });
    } catch (err: unknown) {
      setStatusMessage({
        type: 'error',
        text:
          err instanceof Error
            ? err.message
            : 'Failed to save configuration.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleArchive = async (cfg: SavedRepoConfigDoc) => {
    setStatusMessage(null);
    try {
      await archiveRepoConfiguration(cfg.id);
      setStatusMessage({
        type: 'success',
        text: `Archived ${cfg.repoFullName} configuration.`,
      });
    } catch (err: unknown) {
      setStatusMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Archive failed.',
      });
    }
  };

  const handleConfirmDelete = async () => {
    if (!configPendingDelete) return;
    const target = configPendingDelete;
    setConfigPendingDelete(null);
    setStatusMessage(null);
    try {
      await deleteRepoConfiguration(target.id);
      setStatusMessage({
        type: 'success',
        text: `Deleted ${target.repoFullName} configuration from Firestore.`,
      });
    } catch (err: unknown) {
      setStatusMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Delete failed.',
      });
    }
  };

  return (
    <section className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-200">
      <div className="p-5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <FolderGit2 className="w-4 h-4 text-blue-600 shrink-0" />
            <h2 className="text-sm font-semibold text-slate-900">
              GitHub-Linked Google Account &amp; Saved Repository Configurations
            </h2>
          </div>
          <p className="text-xs text-slate-600">
            Sign in with your Google account to link your GitHub handle and persist PWA manifest, module, and DNS configurations in Firestore.
          </p>
        </div>

        {!user ? (
          <div className="shrink-0">
            <GoogleSignInButton
              onClick={handleSignIn}
              disabled={isSigningIn}
              label={
                isSigningIn
                  ? 'Connecting Account...'
                  : 'Sign in with Google'
              }
            />
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 text-xs text-slate-600">
              <span className="font-medium text-slate-900">
                {user.email || user.displayName}
              </span>
              <span aria-hidden="true">·</span>
              <label className="text-slate-500">GitHub:</label>
              <input
                type="text"
                value={githubHandle}
                onChange={(e) => setGithubHandle(e.target.value)}
                placeholder="epodivilov"
                maxLength={60}
                className="px-2 py-1 text-xs font-mono border border-slate-300 rounded-md w-32 focus:outline-none focus:border-blue-600"
              />
            </div>

            <button
              type="button"
              onClick={handleSaveCurrent}
              disabled={isSaving}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              {isSaving
                ? 'Saving...'
                : `Save ${currentRepoFullName} Config`}
            </button>

            <button
              type="button"
              onClick={handleSignOut}
              className="inline-flex items-center gap-1 px-2.5 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign out
            </button>
          </div>
        )}
      </div>

      {statusMessage && (
        <div
          className={`px-5 py-2.5 text-xs flex items-center gap-2 ${
            statusMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-800'
              : 'bg-red-50 text-red-700'
          }`}
        >
          {statusMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0" />
          )}
          <span className="break-all">{statusMessage.text}</span>
        </div>
      )}

      {user && (
        <div className="p-5">
          {savedConfigs.length === 0 ? (
            <div className="text-xs text-slate-500 flex items-center justify-between">
              <span>
                No repository configurations saved yet for {user.email}. Click{' '}
                <strong className="text-slate-700">
                  Save {currentRepoFullName} Config
                </strong>{' '}
                above to store your current setup in Firestore.
              </span>
            </div>
          ) : (
            <div className="space-y-2.5">
              <div className="text-xs font-semibold text-slate-700">
                Saved Repository Configurations ({savedConfigs.length})
              </div>
              <div className="divide-y divide-slate-200 border border-slate-200 rounded-lg">
                {savedConfigs.map((cfg) => (
                  <div
                    key={cfg.id}
                    className="px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 hover:bg-slate-50/80 transition-colors"
                  >
                    <div className="min-w-0 space-y-0.5">
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span className="font-mono font-semibold text-slate-900">
                          {cfg.repoFullName}
                        </span>
                        <span className="text-slate-400" aria-hidden="true">
                          ·
                        </span>
                        <span className="font-mono text-slate-600">
                          @{cfg.githubUsername}
                        </span>
                        <span className="text-slate-400" aria-hidden="true">
                          ·
                        </span>
                        <span className="font-mono text-slate-600">
                          branch: {cfg.branch}
                        </span>
                        <span className="text-slate-400" aria-hidden="true">
                          ·
                        </span>
                        <span className="text-slate-600">
                          {cfg.status === 'archived' ? 'Archived' : 'Active'}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 font-mono tabular-nums">
                        Manifest: {cfg.manifestShortName} ({cfg.manifestDisplay}) · Theme {cfg.themeColor} · DNS {cfg.dnsDomain} · {cfg.selectedModuleCount} modules
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => onLoadConfig(cfg)}
                        className="px-3 py-1.5 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors whitespace-nowrap cursor-pointer"
                      >
                        Load into Studio
                      </button>
                      {cfg.status !== 'archived' && (
                        <button
                          type="button"
                          onClick={() => handleArchive(cfg)}
                          title="Archive configuration"
                          className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
                        >
                          <Archive className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setConfigPendingDelete(cfg)}
                        title="Delete configuration"
                        className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Explicit User Confirmation Modal for Deleting Saved Configuration */}
      {configPendingDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 border border-slate-200 space-y-4">
            <h3 className="text-base font-semibold text-slate-900">
              Delete Saved Repository Configuration?
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to permanently remove the saved configuration for{' '}
              <span className="font-mono font-semibold text-slate-900">
                {configPendingDelete.repoFullName}
              </span>{' '}
              from Firestore? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setConfigPendingDelete(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg cursor-pointer"
              >
                Delete Configuration
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
