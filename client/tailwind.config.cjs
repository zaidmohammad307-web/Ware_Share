/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['class'],
  content: [
    './pages/**/*.{js,jsx}',
    './components/ui/**/*.{js,jsx}',
    './app/**/*.{js,jsx}',
    './src/**/*.{js,jsx}',
  ],
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: {
        '2xl': '1400px',
      },
    },
    extend: {
      colors: {
        // keep system tokens on CSS vars
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',

        // 🔵 WARESHARE PRIMARY (buttons, main actions)
        primary: {
          DEFAULT: '#1E88E5', // main blue
          foreground: '#FFFFFF',
        },

        // 🔵 Light blue accent (cards, soft backgrounds)
        secondary: {
          DEFAULT: '#E3F2FD',
          foreground: '#333333',
        },

        // Muted / subtle surfaces & text
        muted: {
          DEFAULT: '#F5F5F5',
          foreground: '#666666',
        },

        // Accent = soft blue
        accent: {
          DEFAULT: '#E3F2FD',
          foreground: '#333333',
        },

        // Cards & popovers
        popover: {
          DEFAULT: '#FFFFFF',
          foreground: '#333333',
        },
        card: {
          DEFAULT: '#FFFFFF',
          foreground: '#333333',
        },

        // ❗ Destructive (delete, errors)
        destructive: {
          DEFAULT: '#E53935',
          foreground: '#FFFFFF',
        },

        // 🟢 Optional success / pop color
        success: '#00BFA5',
        successSoft: '#80CBC4',

        // Neutral grays for typography/background helpers
        neutral: {
          900: '#333333',
          700: '#666666',
          100: '#F5F5F5',
        },
      },

      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },

      keyframes: {
        'accordion-down': {
          from: { height: 0 },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: 0 },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};
