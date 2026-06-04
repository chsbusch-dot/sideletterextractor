import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{js,ts,jsx,tsx,mdx}', './components/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: '#0b1320',
          soft: '#1c2536',
          muted: '#475569',
        },
        paper: '#f8fafc',
        accent: {
          DEFAULT: '#0f766e',
          soft: '#ccfbf1',
        },
        warn: {
          DEFAULT: '#b45309',
          soft: '#fef3c7',
        },
        danger: {
          DEFAULT: '#b91c1c',
          soft: '#fee2e2',
        },
      },
      fontFamily: {
        sans: [
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'Inter',
          'sans-serif',
        ],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
    },
  },
  plugins: [],
};

export default config;
