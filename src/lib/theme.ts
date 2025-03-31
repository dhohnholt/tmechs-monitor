export type Theme = 'light' | 'dark' | 'system';

// Get system theme preference
export const getSystemTheme = (): 'light' | 'dark' => {
  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark';
  }
  return 'light';
};

// Apply theme to document
export const applyTheme = (theme: Theme) => {
  const root = window.document.documentElement;
  
  if (theme === 'system') {
    const systemTheme = getSystemTheme();
    root.classList.remove('light', 'dark');
    root.classList.add(systemTheme);
  } else {
    root.classList.remove('light', 'dark');
    root.classList.add(theme);
  }

  // Store theme preference
  localStorage.setItem('theme', theme);
};

// Initialize theme
export const initializeTheme = () => {
  const storedTheme = localStorage.getItem('theme') as Theme | null;
  const theme = storedTheme || 'system';
  applyTheme(theme);

  // Listen for system theme changes
  if (theme === 'system') {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      applyTheme('system');
    });
  }

  return theme;
};