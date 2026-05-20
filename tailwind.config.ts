import type { Config } from 'tailwindcss';

const config: Config = {
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
      borderColor: {
        admin: 'var(--admin-border)',
        'admin-strong': 'var(--admin-border-strong)',
      },
    },
  },
  plugins: [],
};

export default config;
