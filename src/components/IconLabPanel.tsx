import React, { useEffect, useRef, useState } from 'react';
import { Download } from 'lucide-react';

interface IconLabPanelProps {
  themeColor: string;
  backgroundColor: string;
  shortName: string;
}

export const IconLabPanel: React.FC<IconLabPanelProps> = ({
  themeColor,
  backgroundColor,
  shortName,
}) => {
  const [monogram, setMonogram] = useState(
    shortName.slice(0, 2).toUpperCase() || 'GL'
  );
  const [accentColor, setAccentColor] = useState('#2563EB');
  const [safeZonePaddingPct, setSafeZonePaddingPct] = useState(15);
  const [showSafeZoneOverlay, setShowSafeZoneOverlay] = useState(true);
  const [maskShape, setMaskShape] = useState<'none' | 'circle' | 'squircle'>(
    'none'
  );

  const canvasAnyRef = useRef<HTMLCanvasElement | null>(null);
  const canvasMaskableRef = useRef<HTMLCanvasElement | null>(null);

  const drawIcon = (
    canvas: HTMLCanvasElement | null,
    size: number,
    isMaskable: boolean,
    drawGuides: boolean
  ) => {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, size, size);

    ctx.save();
    if (maskShape === 'circle' && drawGuides) {
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
      ctx.clip();
    } else if (maskShape === 'squircle' && drawGuides) {
      const r = size * 0.22;
      ctx.beginPath();
      ctx.roundRect(0, 0, size, size, r);
      ctx.clip();
    }

    // Full-bleed background for maskable, or rounded rect for standard 'any'
    ctx.fillStyle = backgroundColor || '#0F172A';
    if (isMaskable) {
      ctx.fillRect(0, 0, size, size);
    } else {
      ctx.beginPath();
      ctx.roundRect(0, 0, size, size, size * 0.18);
      ctx.fill();
    }

    // Inner safe container
    const padFraction = isMaskable ? safeZonePaddingPct / 100 : 0.12;
    const pad = Math.round(size * padFraction);
    const innerSize = size - pad * 2;

    ctx.fillStyle = themeColor || '#1E293B';
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = Math.max(2, size * 0.015);
    ctx.beginPath();
    ctx.roundRect(pad, pad, innerSize, innerSize, innerSize * 0.18);
    ctx.fill();
    ctx.stroke();

    // Monogram typography inside safe zone
    ctx.fillStyle = '#F8FAFC';
    ctx.font = `700 ${Math.round(innerSize * 0.42)}px "Plus Jakarta Sans", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(
      (monogram || 'GL').slice(0, 3),
      size / 2 - innerSize * 0.04,
      size / 2
    );

    // Accent node (representing commit graph node)
    const badgeX = pad + innerSize * 0.78;
    const badgeY = pad + innerSize * 0.76;
    const badgeR = innerSize * 0.12;
    ctx.fillStyle = accentColor;
    ctx.beginPath();
    ctx.arc(badgeX, badgeY, badgeR, 0, Math.PI * 2);
    ctx.fill();

    // Plus cross inside accent node
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = Math.max(2, size * 0.02);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(badgeX, badgeY - badgeR * 0.48);
    ctx.lineTo(badgeX, badgeY + badgeR * 0.48);
    ctx.moveTo(badgeX - badgeR * 0.48, badgeY);
    ctx.lineTo(badgeX + badgeR * 0.48, badgeY);
    ctx.stroke();

    // Optional Android Maskable 80% Safe-Zone Circle Overlay
    if (isMaskable && drawGuides && showSafeZoneOverlay) {
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.85)';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, size * 0.4, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    ctx.restore();
  };

  useEffect(() => {
    drawIcon(canvasAnyRef.current, 256, false, true);
    drawIcon(canvasMaskableRef.current, 256, true, true);
  }, [
    monogram,
    accentColor,
    safeZonePaddingPct,
    showSafeZoneOverlay,
    maskShape,
    themeColor,
    backgroundColor,
  ]);

  const downloadPng = (
    filename: string,
    targetSize: number,
    isMaskable: boolean
  ) => {
    const offscreen = document.createElement('canvas');
    offscreen.width = targetSize;
    offscreen.height = targetSize;
    drawIcon(offscreen, targetSize, isMaskable, false);
    const dataUrl = offscreen.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = filename;
    a.click();
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-200">
      <div className="p-6 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            04. PWA Icon Asset Generator & Maskable Safe-Zone Studio
          </h2>
          <p className="text-sm text-slate-600 mt-1">
            Generate compliant PNG icons for Chromium, Android maskable launchers (10–15% safe-zone margin), and iOS Safari home screens.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => downloadPng('pwa-192x192.png', 192, false)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            192×192 PNG
          </button>
          <button
            type="button"
            onClick={() => downloadPng('pwa-512x512.png', 512, false)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            512×512 PNG
          </button>
          <button
            type="button"
            onClick={() => downloadPng('pwa-maskable-512x512.png', 512, true)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            Maskable 512×512 PNG
          </button>
          <button
            type="button"
            onClick={() => downloadPng('apple-touch-icon.png', 180, false)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            iOS 180×180 PNG
          </button>
        </div>
      </div>

      <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Controls Column */}
        <div className="lg:col-span-5 space-y-5">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Icon Monogram (1–3 Characters)
            </label>
            <input
              type="text"
              maxLength={3}
              value={monogram}
              onChange={(e) => setMonogram(e.target.value.toUpperCase())}
              className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Commit Node Accent
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={accentColor}
                  onChange={(e) => setAccentColor(e.target.value)}
                  className="h-9 w-12 rounded border border-slate-300 cursor-pointer"
                />
                <span className="text-xs font-mono text-slate-600 tabular-nums">
                  {accentColor}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Maskable Padding ({safeZonePaddingPct}%)
              </label>
              <input
                type="range"
                min={10}
                max={22}
                value={safeZonePaddingPct}
                onChange={(e) => setSafeZonePaddingPct(Number(e.target.value))}
                className="w-full accent-blue-600 cursor-pointer mt-2"
              />
              <p className="text-xs text-slate-500 mt-1">
                Minimum 10–15% recommended so Android launchers never clip edges.
              </p>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-200">
            <label className="block text-xs font-semibold text-slate-700 mb-2">
              OS Launcher Crop Simulation
            </label>
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg w-fit">
              {(['none', 'circle', 'squircle'] as const).map((shape) => (
                <button
                  key={shape}
                  type="button"
                  onClick={() => setMaskShape(shape)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors capitalize whitespace-nowrap cursor-pointer ${
                    maskShape === shape
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {shape === 'none' ? 'Full Bleed' : shape}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-slate-200">
            <span className="text-xs font-medium text-slate-700">
              Show 80% Safe-Zone Circle Guide
            </span>
            <button
              type="button"
              onClick={() => setShowSafeZoneOverlay((prev) => !prev)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                showSafeZoneOverlay
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {showSafeZoneOverlay ? 'Guide Visible' : 'Guide Hidden'}
            </button>
          </div>
        </div>

        {/* Live Canvases Column */}
        <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-6 items-center">
          <div className="flex flex-col items-center p-4 bg-slate-50 rounded-xl border border-slate-200">
            <div className="text-xs font-semibold text-slate-900 mb-1">
              Standard Icon (purpose: &quot;any&quot;)
            </div>
            <div className="text-xs text-slate-500 font-mono tabular-nums mb-3">
              192×192 · 512×512 · 180×180 iOS
            </div>
            <canvas
              ref={canvasAnyRef}
              width={256}
              height={256}
              className="w-44 h-44 rounded-lg"
            />
          </div>

          <div className="flex flex-col items-center p-4 bg-slate-50 rounded-xl border border-slate-200">
            <div className="text-xs font-semibold text-slate-900 mb-1">
              Maskable Icon (purpose: &quot;maskable&quot;)
            </div>
            <div className="text-xs text-slate-500 font-mono tabular-nums mb-3">
              512×512 · {safeZonePaddingPct}% Safe Margin
            </div>
            <canvas
              ref={canvasMaskableRef}
              width={256}
              height={256}
              className="w-44 h-44 rounded-lg"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
