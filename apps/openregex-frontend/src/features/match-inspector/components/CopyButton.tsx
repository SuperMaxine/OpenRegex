import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';

export const CopyButton = ({ text }: { text: string }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className="p-1 text-theme-muted/50 hover:text-theme-text transition-all rounded flex items-center justify-center shrink-0 bg-black/5 dark:bg-white/5 border border-transparent hover:border-black/10 dark:hover:border-white/10"
    >
      {copied ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
    </button>
  );
};