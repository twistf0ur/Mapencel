import React, { useState } from 'react';
import { Check, Copy, Download, Laptop, MonitorDown, Wifi, WifiOff, X } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface DesktopAppModalProps {
  onClose: () => void;
  onNotify: (msg: string) => void;
}

const WIN_EXE_COMMAND = 'npm install -D electron electron-builder && npm run desktop:win';

export const DesktopAppModal: React.FC<DesktopAppModalProps> = ({ onClose, onNotify }) => {
  const { isInstallable, isInstalled, isIOS, isDesktopShell, install } = usePWAInstall();
  const isOnline = useOnlineStatus();
  const [copiedCmd, setCopiedCmd] = useState(false);

  const handleCopyCommand = async () => {
    try {
      await navigator.clipboard.writeText(WIN_EXE_COMMAND);
      setCopiedCmd(true);
      onNotify('Copied Windows .exe build command');
      window.setTimeout(() => setCopiedCmd(false), 2000);
    } catch {
      onNotify('Copy failed — select the command text manually.');
    }
  };

  const handleInstallClick = async () => {
    const accepted = await install();
    if (accepted) {
      onNotify('CelDraft installed as an offline desktop app!');
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
      <div className="w-full max-w-xl bg-[#181B23] border border-[#2D3444] rounded-xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-[#262B36] flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <MonitorDown className="w-4 h-4 text-[#FF5A36]" />
            <div>
              <h2 className="text-sm font-bold text-[#F4F5F7]">
                Offline Mode & Desktop App (.exe)
              </h2>
              <p className="text-xs text-[#9CA3AF]">
                Run CelDraft without internet on Windows desktop or standalone browser app.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#9CA3AF] hover:text-white hover:bg-[#252A36]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Offline Capability Status */}
          <div className="rounded-xl border border-[#262C3A] bg-[#12151B] p-4 flex items-start gap-3">
            {isOnline ? (
              <Wifi className="w-4 h-4 text-[#10B981] shrink-0 mt-0.5" />
            ) : (
              <WifiOff className="w-4 h-4 text-[#F59E0B] shrink-0 mt-0.5" />
            )}
            <div className="space-y-1">
              <div className="text-xs font-semibold text-[#F4F5F7]">
                {isOnline
                  ? 'Offline Cache Ready (Service Worker + IndexedDB)'
                  : 'Running in Offline Mode'}
              </div>
              <p className="text-xs text-[#9CA3AF] leading-relaxed">
                All drawing layers, onion skinning, audio lip-sync, IndexedDB project autosave, and
                GIF / Sprite Sheet / PNG ZIP exports work completely offline with zero network
                calls.
              </p>
            </div>
          </div>

          {/* 1. Instant Standalone Desktop App Install */}
          <div className="rounded-xl border border-[#282E3C] bg-[#161920] p-4 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-xs font-bold text-[#F4F5F7]">
                  1. Install Instant Desktop App (Zero Build)
                </h3>
                <p className="text-[11px] text-[#9CA3AF] mt-0.5">
                  Creates a native standalone window and desktop shortcut that launches offline.
                </p>
              </div>
              <Laptop className="w-4 h-4 text-[#38BDF8] shrink-0" />
            </div>

            {isInstalled ? (
              <div className="px-3 py-2 rounded-lg bg-[#10B981]/15 border border-[#10B981]/30 text-xs font-medium text-[#34D399] flex items-center gap-2">
                <Check className="w-3.5 h-3.5" />
                <span>
                  {isDesktopShell
                    ? 'Running inside CelDraft Desktop Shell'
                    : 'Installed as a standalone offline app'}
                </span>
              </div>
            ) : isInstallable ? (
              <button
                type="button"
                onClick={handleInstallClick}
                className="w-full py-2.5 px-4 rounded-lg bg-[#FF5A36] hover:bg-[#FF6E4E] text-white text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Install CelDraft Desktop App</span>
              </button>
            ) : isIOS ? (
              <div className="p-3 rounded-lg bg-[#111318] border border-[#262B36] text-xs text-[#D1D5DB] leading-relaxed">
                On iPhone / iPad Safari: tap <strong>Share</strong> and choose{' '}
                <strong>Add to Home Screen</strong> to install CelDraft for offline use.
              </div>
            ) : (
              <div className="p-3 rounded-lg bg-[#111318] border border-[#262B36] text-xs text-[#9CA3AF] leading-relaxed">
                In Chrome or Edge on Windows/macOS, click the{' '}
                <strong className="text-[#F4F5F7]">Install</strong> icon in the address bar (or{' '}
                <strong className="text-[#F4F5F7]">Menu → Apps → Install CelDraft</strong>) to
                create a standalone offline desktop shortcut.
              </div>
            )}
          </div>

          {/* 2. Windows .exe Electron Package */}
          <div className="rounded-xl border border-[#282E3C] bg-[#161920] p-4 space-y-3">
            <div>
              <h3 className="text-xs font-bold text-[#F4F5F7]">
                2. Compile Windows .exe Installer & Portable Binary
              </h3>
              <p className="text-[11px] text-[#9CA3AF] mt-0.5 leading-relaxed">
                CelDraft includes an offline Electron desktop target (<code className="text-[#D1D5DB]">electron/main.cjs</code> &{' '}
                <code className="text-[#D1D5DB]">electron-builder.json</code>) outputting{' '}
                <code className="text-[#D1D5DB]">CelDraft-1.0.0-x64.exe</code> and{' '}
                <code className="text-[#D1D5DB]">CelDraft-Portable-1.0.0.exe</code>.
              </p>
            </div>

            <div className="flex items-center gap-2 bg-[#111318] border border-[#262B36] rounded-lg px-3 py-2">
              <code className="text-[11px] font-mono text-[#E5E7EB] flex-1 overflow-x-auto whitespace-nowrap">
                {WIN_EXE_COMMAND}
              </code>
              <button
                type="button"
                onClick={handleCopyCommand}
                title="Copy build command"
                className="p-1.5 rounded bg-[#20242E] hover:bg-[#2A303E] text-[#D1D5DB] shrink-0"
              >
                {copiedCmd ? (
                  <Check className="w-3.5 h-3.5 text-[#10B981]" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
