'use client';

import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { AiOutlineSun, AiOutlineMoon } from 'react-icons/ai';

const ThemeSwitch = () => {
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme, resolvedTheme } = useTheme();

  // When mounted on client, now we can show the UI
  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return null;
  }

  return (
    <button
      onClick={() => setTheme(theme === 'dark' || resolvedTheme === 'dark' ? 'light' : 'dark')}
      className="p-2 text-gray-800 dark:text-gray-200 hover:text-primary-500 dark:hover:text-primary-400 bg-transparent rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
      aria-label="Toggle Dark Mode"
    >
      {theme === 'dark' || resolvedTheme === 'dark' ? (
        <AiOutlineSun size={20} />
      ) : (
        <AiOutlineMoon size={20} />
      )}
    </button>
  );
};

export default ThemeSwitch;
