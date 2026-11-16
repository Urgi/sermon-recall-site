import type { Config } from 'tailwindcss';

const config: Config = {
  // The portal themes via <html data-theme>, so `dark:` must follow that, not the OS setting.
  darkMode: ['selector', '[data-theme="dark"]'],
  content: ['./app/**/*.{js,ts,jsx,tsx,mdx}', './components/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      screens: {
        wide: '840px',
      },
      colors: {
        admin: {
          page: 'var(--admin-page-bg)',
          shell: 'var(--admin-shell-bg)',
          sidebar: 'var(--admin-sidebar-bg)',
          card: 'var(--admin-card-bg)',
          surface: 'var(--admin-surface-bg)',
          fg: 'var(--admin-fg)',
          'fg-strong': 'var(--admin-fg-strong)',
          'fg-secondary': 'var(--admin-fg-secondary)',
          muted: 'var(--admin-muted)',
          dim: 'var(--admin-dim)',
          border: 'var(--admin-border)',
          'border-strong': 'var(--admin-border-strong)',
          accent: 'var(--admin-accent)',
          link: 'var(--admin-link)',
          'nav-hover': 'var(--admin-nav-hover-bg)',
        },
      },
      transitionTimingFunction: {
        'out-strong': 'var(--ease-out)',
      },
      transitionDuration: {
        fast: 'var(--motion-fast)',
        base: 'var(--motion-base)',
        slow: 'var(--motion-slow)',
      },
      keyframes: {
        hintFade: {
          from: { opacity: '0', transform: 'translateY(2px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        hintFade: 'hintFade var(--motion-slow) var(--ease-out) both',
      },
      borderColor: {
        admin: 'var(--admin-border)',
        'admin-strong': 'var(--admin-border-strong)',
      },
    },
  },
  plugins: [],
};

export default config;
