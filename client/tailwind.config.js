/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './tron-payment.html', './src/**/*.{js,jsx,vue}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef8f2',
          100: '#d6ecd9',
          200: '#add9b4',
          300: '#7bbe87',
          400: '#4ea361',
          500: '#2f8644',
          600: '#236b36',
          700: '#1d552c',
          800: '#1a4425',
          900: '#163720'
        },
        ink: '#12202b',
        mist: '#f5f8fb'
      },
      boxShadow: {
        soft: '0 12px 40px rgba(18, 32, 43, 0.08)'
      }
    }
  },
  plugins: []
};
