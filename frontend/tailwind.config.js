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
          DEFAULT: '#0a0a0a',
          50: '#f5f5f4',
          100: '#e8e8e6',
          200: '#d1d1cd',
          300: '#a8a8a2',
          400: '#7a7a74',
          500: '#5a5a55',
          600: '#3d3d39',
          700: '#2a2a27',
          800: '#1a1a18',
          900: '#0a0a0a',
        },
        acid: {
          DEFAULT: '#c8f135',
          dark: '#a8cf1a',
          light: '#dffb6a',
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
