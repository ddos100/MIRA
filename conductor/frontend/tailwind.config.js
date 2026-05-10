/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: { DEFAULT: '#1a365d', light: '#2c5282', muted: '#63b3ed' },
        danger: { DEFAULT: '#c53030', light: '#fc8181' },
        success: { DEFAULT: '#276749', light: '#68d391' },
        warning: { DEFAULT: '#b7791f', light: '#f6e05e' },
      },
    },
  },
  plugins: [],
}
