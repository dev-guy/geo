export const ThemeToggle = {
  mounted() {
    // Get saved theme from localStorage or default to system
    const savedTheme = localStorage.getItem('theme') || 'system';
    this.applyTheme(savedTheme);

    // Listen for theme cycle events
    this.handleEvent('cycle_theme', (payload) => {
      this.applyTheme(payload.theme);
    });

    // Listen for system theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addListener(() => {
      const currentTheme = localStorage.getItem('theme') || 'system';
      if (currentTheme === 'system') {
        this.applyTheme('system');
      }
    });
  },

  applyTheme(theme) {
    const html = document.documentElement;

    if (theme === 'dark') {
      html.classList.add('dark');
    } else if (theme === 'light') {
      html.classList.remove('dark');
    } else if (theme === 'system') {
      // Use system preference
      const prefersDark = window.matchMedia(
        '(prefers-color-scheme: dark)',
      ).matches;
      if (prefersDark) {
        html.classList.add('dark');
      } else {
        html.classList.remove('dark');
      }
    }

    // Save to localStorage
    localStorage.setItem('theme', theme);
  },
};
