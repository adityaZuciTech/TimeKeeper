/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        heading: ['Space Grotesk', 'system-ui', 'sans-serif'],
        body:    ['IBM Plex Sans', 'system-ui', 'sans-serif'],
        sans:    ['IBM Plex Sans', 'system-ui', 'sans-serif'],
      },
      colors: {
        background:  'hsl(var(--background))',
        foreground:  'hsl(var(--foreground))',
        card: {
          DEFAULT:    'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        primary: {
          DEFAULT:    'hsl(var(--primary) / <alpha-value>)',
          foreground: 'hsl(var(--primary-foreground))',
          // legacy shades – all map to Blueprint Blue family
          50:  'hsl(229 100% 97%)',
          100: 'hsl(229 100% 94%)',
          200: 'hsl(229 100% 88%)',
          300: 'hsl(229 100% 80%)',
          400: 'hsl(229 100% 72%)',
          500: 'hsl(229 100% 66%)',
          600: 'hsl(229 100% 61%)',
          700: 'hsl(229 100% 52%)',
          800: 'hsl(229 100% 40%)',
          900: 'hsl(229 100% 30%)',
        },
        secondary: {
          DEFAULT:    'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        muted: {
          DEFAULT:    'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT:    'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        destructive: {
          DEFAULT:    'hsl(var(--destructive) / <alpha-value>)',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        warning: {
          DEFAULT:    'hsl(var(--warning) / <alpha-value>)',
          foreground: 'hsl(var(--warning-foreground))',
        },
        success: {
          DEFAULT:    'hsl(var(--success) / <alpha-value>)',
          foreground: 'hsl(var(--success-foreground))',
        },
        border: 'hsl(var(--border))',
        input:  'hsl(var(--border))',
        ring:   'hsl(var(--primary) / <alpha-value>)',
        sidebar: {
          DEFAULT:    'hsl(var(--sidebar-background))',
          foreground: 'hsl(var(--sidebar-foreground))',
          primary:    'hsl(var(--sidebar-primary))',
          accent:     'hsl(var(--sidebar-accent))',
          border:     'hsl(var(--sidebar-border))',
          muted:      'hsl(var(--sidebar-muted))',
        },
      },
      keyframes: {
        'daily-commit': {
          '0%':   { boxShadow: '0 0 0 0 hsl(229 100% 61.4% / 0.4)' },
          '70%':  { boxShadow: '0 0 0 8px hsl(229 100% 61.4% / 0)' },
          '100%': { boxShadow: '0 0 0 0 hsl(229 100% 61.4% / 0)' },
        },
        'submit-glow': {
          '0%, 100%': { boxShadow: '0 0 0 0 hsl(229 100% 61.4% / 0)' },
          '50%':      { boxShadow: '0 0 12px 4px hsl(229 100% 61.4% / 0.4)' },
        },
        'accordion-down': {
          from: { height: '0' },
          to:   { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to:   { height: '0' },
        },
      },
      animation: {
        'daily-commit':   'daily-commit 0.8s ease-out',
        'submit-glow':    'submit-glow 2s ease-in-out infinite',
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up':   'accordion-up 0.2s ease-out',
      },
    },
  },
  plugins: [],
}
