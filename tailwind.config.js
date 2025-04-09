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
        primary: '#FC4E5B',
        secondary: '#9C2831',
        alternative: '#ece8e1',
        text: {
          DEFAULT: '#FFFFFF',
          alt: '#EFEEE9',
        },
        background: '#0A141D',
        dark: '#2D2D2D',
      },
      fontFamily: {
        sans: ["var(--font-sans)"],
        mono: ["var(--font-mono)"],
      },
      textShadow: {
        sm: '0 1px 2px #FFFFFF',
        DEFAULT: '0 2px 4px #FFFFFF',
        lg: '0px 0px 18px rgba(252, 78, 90, 0.63)',
      },

    },
  },
  darkMode: "class",
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
  ],
}

module.exports = config;