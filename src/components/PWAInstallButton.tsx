import React, { useState } from 'react';
import { Download } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuide, setShowGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  if (isInstallable) {
    return (
      <button
        onClick={install}
        className="flex items-center gap-2 rounded-lg bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-blue-700 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
      >
        <Download className="w-3.5 h-3.5" />
        Install App
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          onClick={() => setShowGuide(true)}
          className="flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          Install on iOS
        </button>

        {showGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
            <div className="w-full max-w-sm rounded-xl bg-white p-6 border border-slate-200">
              <h3 className="text-base font-semibold text-slate-900">Install on iPhone or iPad</h3>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                1. Tap the <strong>Share</strong> button in the Safari toolbar.<br />
                2. Scroll down and select <strong>Add to Home Screen</strong>.
              </p>
              <button
                onClick={() => setShowGuide(false)}
                className="mt-4 w-full rounded-lg bg-slate-900 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <>
      <button
        onClick={() => setShowGuide(true)}
        className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
      >
        <Download className="w-3.5 h-3.5 text-slate-600" />
        Install PWA
      </button>

      {showGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 border border-slate-200">
            <h3 className="text-base font-semibold text-slate-900">Install PWABuildr as Desktop / Mobile App</h3>
            <p className="mt-2 text-sm text-slate-600 leading-relaxed">
              PWABuildr has an active Service Worker and Web App Manifest configured with <code className="font-mono text-xs bg-slate-100 px-1 py-0.5 rounded">display: standalone</code>.
            </p>
            <div className="mt-3 space-y-2 text-xs text-slate-600 border-t border-slate-100 pt-3">
              <p><strong>Chrome / Edge Desktop:</strong> Open the app in a top-level browser tab and click the install icon in the address bar.</p>
              <p><strong>iOS Safari:</strong> Tap Share in the toolbar and choose Add to Home Screen.</p>
            </div>
            <div className="mt-5 flex justify-end">
              <button
                onClick={() => setShowGuide(false)}
                className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
