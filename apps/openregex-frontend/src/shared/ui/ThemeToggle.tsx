import React from 'react';

interface ThemeToggleProps {
  isDark: boolean;
  toggleTheme: () => void;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = () => {
  // The light theme has been disabled per user requirements.
  // Component is hollowed out.
  return null;
};