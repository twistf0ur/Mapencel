import React from 'react';
import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="fixed bottom-4 left-4 z-50 flex items-center gap-2 rounded-lg bg-[#232836] border border-[#F59E0B]/60 px-3 py-1.5 text-xs font-medium text-[#F4F5F7] shadow-xl pointer-events-none">
      <WifiOff className="w-3.5 h-3.5 text-[#F59E0B]" />
      <span>Offline Mode — Local storage active</span>
    </div>
  );
};
