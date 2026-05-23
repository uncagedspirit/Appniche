/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['DM Sans', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
        display: ['Syne', 'sans-serif'],
      },
      colors: {
        ink: {
          DEFAULT: '#0f172a',
          50:  '#0f172a',   // darkest — headings
          100: '#1e293b',   // dark body text
          200: '#334155',   // secondary text
          300: '#475569',   // tertiary text
          400: '#64748b',   // muted text
          500: '#94a3b8',   // placeholder / very muted
          600: '#cbd5e1',   // light borders
          700: '#e2e8f0',   // borders
          800: '#f1f5f9',   // card / input backgrounds
          900: '#ffffff',   // page background
        },
        acid: {
          DEFAULT: '#1d6ef6',   // blue accent
          dark:    '#1558d0',
          light:   '#5b9bfa',
        }
      },
      animation: {
        'fade-up': 'fadeUp 0.4s ease forwards',
        'fade-in': 'fadeIn 0.3s ease forwards',
        'slide-in': 'slideIn 0.3s ease forwards',
        'pulse-slow': 'pulse 3s ease-in-out infinite',
      },
      keyframes: {
        fadeUp: {
          '0%': { opacity: 0, transform: 'translateY(12px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' }
        },
        fadeIn: {
          '0%': { opacity: 0 },
          '100%': { opacity: 1 }
        },
        slideIn: {
          '0%': { opacity: 0, transform: 'translateX(-8px)' },
          '100%': { opacity: 1, transform: 'translateX(0)' }
        }
      }
    }
  },
  plugins: []
}
