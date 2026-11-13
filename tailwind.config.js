/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          bg: '#F7F8FA',
          surface: '#FFFFFF',
          ink: '#172333',
          muted: '#687586',
          blue: {
            DEFAULT: '#2457A7',
            hover: '#1B4588',
            light: '#EAF1FA',
          },
          border: '#E2E7ED',
          borderSubtle: '#EEF2F6',
          success: {
            DEFAULT: '#237A57',
            light: '#EBF5F0',
            border: '#BFE3D3',
          },
          warning: {
            DEFAULT: '#A56B18',
            light: '#FEF7EC',
            border: '#F9DFB8',
          },
          error: {
            DEFAULT: '#B43B3B',
            light: '#FDF2F2',
            border: '#F6CACA',
          },
        },
      },
      fontFamily: {
        display: ['"Plus Jakarta Sans"', 'sans-serif'],
        sans: ['"DM Sans"', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

