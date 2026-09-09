/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#F8FAFC',
        surface: '#FFFFFF',
        navy: {
          900: '#0F172A',
          800: '#1E293B',
          700: '#334155',
        },
        brand: {
          700: '#1D4ED8',
          600: '#2563EB',
        },
        muted: {
          600: '#475569',
          500: '#64748B',
        },
        status: {
          safe: '#059669',
          warning: '#D97706',
          danger: '#DC2626',
          critical: '#991B1B',
          infra: '#475569',
        }
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
