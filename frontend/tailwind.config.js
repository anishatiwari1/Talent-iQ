/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // TalentIQ Brand Identity Design System
        primary: {
          dark: '#063C32',   // Primary dark green
          DEFAULT: '#063C32',
          secondary: '#075E4F', // Secondary green
          hover: '#094d40',
        },
        forest: {
          950: '#03231D',
          900: '#063C32',
          800: '#075E4F',
          700: '#0A7865',
          600: '#0E937C',
        },
        accent: {
          lime: '#A8D85A',   // Accent green (Figma CTA & highlight)
          DEFAULT: '#A8D85A',
          hover: '#98c64e',
        },
        mint: {
          50: '#F4FAF7',
          100: '#DFF2EA',   // Soft mint (Figma badges & highlights)
          200: '#C3E7D8',
          300: '#99D5BD',
          soft: '#DFF2EA',
        },
        surface: {
          bg: '#F3F5EF',     // Background
          card: '#FFFFFF',   // Pure White
          cardMuted: '#FAFBF8',
          border: '#DCE5DF', // Border
          borderSubtle: '#E8EFEA',
        },
        text: {
          primary: '#10221E', // Dark pine main text
          muted: '#687A73',   // Muted sage text
          secondary: '#42544E',
        },
        // Legacy compatibility mappings
        brand: {
          50: '#F4FAF7',
          100: '#DFF2EA',
          200: '#C3E7D8',
          300: '#99D5BD',
          400: '#67BA97',
          500: '#075E4F',
          600: '#063C32',
          700: '#053129',
          800: '#042721',
          900: '#031E19',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        'subtle': '0 1px 3px rgba(6, 60, 50, 0.04), 0 1px 2px rgba(6, 60, 50, 0.02)',
        'card': '0 1px 4px 0 rgba(6, 60, 50, 0.04), 0 1px 2px -1px rgba(6, 60, 50, 0.03)',
        'card-hover': '0 8px 20px -4px rgba(6, 60, 50, 0.08), 0 4px 8px -2px rgba(6, 60, 50, 0.03)',
        'float': '0 16px 36px -8px rgba(6, 60, 50, 0.12), 0 6px 12px -2px rgba(6, 60, 50, 0.05)',
        'lime-glow': '0 0 20px -4px rgba(168, 216, 90, 0.45)',
      },
      borderRadius: {
        'card': '12px',
        'card-lg': '16px',
        'badge': '6px',
      }
    },
  },
  plugins: [],
}
