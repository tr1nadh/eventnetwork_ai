/** @type {import('tailwindcss').Config} */
const config = {
  content: ['./src/**/*.{html,js,svelte}'],
  theme: {
    extend: {
      boxShadow: {
        glow: '0 0 0 1px rgba(250, 204, 21, 0.18), 0 20px 60px rgba(15, 23, 42, 0.35)'
      },
      colors: {
        ink: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a'
        }
      },
      backgroundImage: {
        'radial-grid':
          'radial-gradient(circle at 1px 1px, rgba(148, 163, 184, 0.28) 1px, transparent 0)'
      }
    }
  },
  plugins: []
};

export default config;
