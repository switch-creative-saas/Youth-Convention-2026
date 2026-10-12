/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        portal: {
          from: 'var(--bg-from)',
          to: 'var(--bg-to)',
          surface: 'var(--surface)',
          ink: 'var(--ink)',
          muted: 'var(--muted)',
          label: 'var(--label-ink)',
          accent: 'var(--accent)',
          'accent-ink': 'var(--accent-ink)',
          dark: 'var(--dark-card)',
          line: 'var(--surface-line)',
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive) / <alpha-value>)",
          foreground: "hsl(var(--destructive-foreground) / <alpha-value>)",
        },
        muted: {
          DEFAULT: "hsl(var(--muted-surface))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent-surface))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
        royal: {
          50: '#EEF2F8',
          100: '#D4DFF0',
          200: '#A9BFE1',
          300: '#7E9FD2',
          400: '#537FC3',
          500: '#1A3A6B',
          600: '#152E56',
          700: '#102341',
          800: '#0A172B',
          900: '#050C16',
        },
        purple: {
          accent: '#6C5CE7',
          light: '#A29BFE',
          dark: '#4834D4',
        },
      },
      fontFamily: {
        portal: ['Outfit', 'system-ui', 'sans-serif'],
        display: ['Poppins', 'system-ui', 'sans-serif'],
        body: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      borderRadius: {
        panel: '30px',
        shell: '40px',
        xl: "calc(var(--radius) + 4px)",
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        xs: "calc(var(--radius) - 6px)",
      },
      boxShadow: {
        surface: 'var(--surface-shadow)',
        shell: 'var(--shell-shadow)',
        xs: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
        glass: '0 8px 32px rgba(26, 58, 107, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.25)',
        'glass-dark': '0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.06)',
        'glass-lg': '0 16px 48px rgba(26, 58, 107, 0.2)',
        'glass-xl': '0 24px 80px rgba(26, 58, 107, 0.15)',
        glow: '0 0 40px rgba(26, 58, 107, 0.3)',
        'glow-purple': '0 0 40px rgba(108, 92, 231, 0.3)',
      },
      backdropBlur: {
        glass: '24px',
        'glass-lg': '32px',
        'glass-xl': '40px',
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "caret-blink": {
          "0%,70%,100%": { opacity: "1" },
          "20%,50%": { opacity: "0" },
        },
        "float": {
          "0%, 100%": { transform: "translateY(0px) rotate(0deg)" },
          "50%": { transform: "translateY(-12px) rotate(2deg)" },
        },
        "float-reverse": {
          "0%, 100%": { transform: "translateY(0px) rotate(0deg)" },
          "50%": { transform: "translateY(12px) rotate(-2deg)" },
        },
        "pulse-soft": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.6" },
        },
        "spin-slow": {
          from: { transform: "rotate(0deg)" },
          to: { transform: "rotate(360deg)" },
        },
        "scan": {
          "0%": { strokeDashoffset: "100" },
          "100%": { strokeDashoffset: "0" },
        },
        "draw": {
          from: { strokeDashoffset: "100" },
          to: { strokeDashoffset: "0" },
        },
        "shimmer": {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        "confetti-fall": {
          "0%": { transform: "translateY(0) rotate(0deg)", opacity: "1" },
          "100%": { transform: "translateY(100vh) rotate(720deg)", opacity: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "caret-blink": "caret-blink 1.25s ease-out infinite",
        "float": "float 6s ease-in-out infinite",
        "float-reverse": "float-reverse 8s ease-in-out infinite",
        "float-slow": "float 8s ease-in-out infinite",
        "pulse-soft": "pulse-soft 2s ease-in-out infinite",
        "spin-slow": "spin-slow 4s linear infinite",
        "scan": "scan 2s ease-in-out infinite",
        "draw": "draw 0.6s ease-out forwards",
        "shimmer": "shimmer 2s ease-in-out infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}
