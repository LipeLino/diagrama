import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        diagram: {
          bg: '#f7fbff',
          laneHead: '#cfe6ff',
          headText: '#0f2747',
          cardBG: '#e9f5ff',
          border: '#dde8f3',
          text: '#0e223d',
          accent: '#2a7de1',
          accent2: '#0ea5e9',
        },
      },
      boxShadow: {
        soft: '0 2px 8px rgba(15, 39, 71, 0.08)',
      },
    },
  },
  plugins: [],
};

export default config;

