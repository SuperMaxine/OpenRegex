import { useState, useEffect } from 'react';

export function useTheme() {
  const [isDark] = useState<boolean>(() => {
    // Apply dark mode synchronously during initial render to prevent light mode flashes
    if (typeof window !== 'undefined') {
      window.document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    }
    return true;
  });

  useEffect(() => {
    // Double check on mount
    const root = window.document.documentElement;
    root.classList.add('dark');
    localStorage.setItem('theme', 'dark');
  }, []);

  const toggleTheme = () => {};

  return { isDark, toggleTheme };
}