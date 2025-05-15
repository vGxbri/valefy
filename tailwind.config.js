import {heroui} from "@heroui/react";
import plugin from 'tailwindcss/plugin';

/** @type {import('tailwindcss').Config} */
const config = {
  content: [
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    "./node_modules/@heroui/theme/dist/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
  	extend: {
  		colors: {
  			primary: {
  				DEFAULT: 'hsl(var(--primary))',
  				foreground: 'hsl(var(--primary-foreground))'
  			},
  			secondary: {
  				DEFAULT: 'hsl(var(--secondary))',
  				foreground: 'hsl(var(--secondary-foreground))'
  			},
  			alternative: '#ece8e1',
  			text: {
  				DEFAULT: '#FFFFFF',
  				alt: '#EFEEE9'
  			},
  			background: 'hsl(var(--background))',
				backgroundAlt: '#182636',
  			dark: '#2D2D2D',
  			foreground: 'hsl(var(--foreground))',
  			card: {
  				DEFAULT: 'hsl(var(--card))',
  				foreground: 'hsl(var(--card-foreground))'
  			},
  			popover: {
  				DEFAULT: 'hsl(var(--popover))',
  				foreground: 'hsl(var(--popover-foreground))'
  			},
  			muted: {
  				DEFAULT: 'hsl(var(--muted))',
  				foreground: 'hsl(var(--muted-foreground))'
  			},
  			accent: {
  				DEFAULT: 'hsl(var(--accent))',
  				foreground: 'hsl(var(--accent-foreground))'
  			},
  			destructive: {
  				DEFAULT: 'hsl(var(--destructive))',
  				foreground: 'hsl(var(--destructive-foreground))'
  			},
  			border: 'hsl(var(--border))',
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
  			chart: {
  				'1': 'hsl(var(--chart-1))',
  				'2': 'hsl(var(--chart-2))',
  				'3': 'hsl(var(--chart-3))',
  				'4': 'hsl(var(--chart-4))',
  				'5': 'hsl(var(--chart-5))'
  			},
  			sidebar: {
  				DEFAULT: 'hsl(var(--sidebar-background))',
  				foreground: 'hsl(var(--sidebar-foreground))',
  				primary: 'hsl(var(--sidebar-primary))',
  				'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
  				accent: 'hsl(var(--sidebar-accent))',
  				'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
  				border: 'hsl(var(--sidebar-border))',
  				ring: 'hsl(var(--sidebar-ring))'
  			}
  		},
  		fontFamily: {
  			sans: [
  				'var(--font-sans)'
  			],
  			mono: [
  				'var(--font-mono)'
  			]
  		},
  		textShadow: {
  			sm: '0 1px 2px #FFFFFF',
  			DEFAULT: '0 2px 4px #FFFFFF',
  			lg: '0px 0px 18px rgba(252, 78, 90, 0.63)'
  		},
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)'
  		},
  		animation: {
  			'bounce-slow': 'bounce 3s infinite',
  			'pulse-slow': 'pulse-slow 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
  			'glow': 'glow 2s ease-in-out infinite alternate',
  			'slide': 'slide 15s linear infinite',
  			'ping': 'ping 2s cubic-bezier(0, 0, 0.2, 1) infinite',
  			'pulse': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
  			'confetti': 'confetti 5s ease-in-out forwards',
  			'float': 'float 15s ease-in-out infinite',
        'fadeScaleUp': 'fadeScaleUp 0.18s ease-out forwards',
  		},
  		keyframes: {
  			bounce: {
  				'0%, 100%': { transform: 'translateY(-5%)' },
  				'50%': { transform: 'translateY(0)' },
  			},
  			'pulse-slow': {
  				'0%, 100%': { opacity: '0.6' },
  				'50%': { opacity: '0.3' },
  			},
  			glow: {
  				'0%': { boxShadow: '0 0 5px rgba(255,255,255,0.5), 0 0 10px rgba(255,255,255,0.3)' },
  				'100%': { boxShadow: '0 0 20px rgba(255,255,255,0.8), 0 0 30px rgba(255,255,255,0.5)' },
  			},
  			slide: {
  				'0%': { transform: 'translateX(0)' },
  				'100%': { transform: 'translateX(-100%)' },
  			},
  			ping: {
  				'75%, 100%': { transform: 'scale(2)', opacity: '0' },
  			},
  			pulse: {
  				'0%, 100%': { opacity: '1' },
  				'50%': { opacity: '0.5' },
  			},
  			confetti: {
  				'0%': { transform: 'translateY(-10px) rotate(0deg)', opacity: '1' },
  				'100%': { transform: 'translateY(calc(70vh)) rotate(720deg)', opacity: '0' },
  			},
  			float: {
  				'0%': { transform: 'translateY(0px) translateX(0px) rotate(0deg)' },
  				'25%': { transform: 'translateY(-20px) translateX(10px) rotate(5deg)' },
  				'50%': { transform: 'translateY(0px) translateX(20px) rotate(0deg)' },
  				'75%': { transform: 'translateY(20px) translateX(10px) rotate(-5deg)' },
  				'100%': { transform: 'translateY(0px) translateX(0px) rotate(0deg)' },
  			},
        fadeScaleUp: {
          '0%': { opacity: '0', transform: 'scale(0.4)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
  		},
  	}
  },
  darkMode: ["class", 'class'],
  plugins: [
    heroui(),
    plugin(function ({ matchUtilities, theme }) {
      matchUtilities(
        {
          'text-shadow': (value) => ({
            textShadow: value,
          }),
        },
        { values: theme('textShadow') }
      )
    }),
      require("tailwindcss-animate")
],
}

export default config;
