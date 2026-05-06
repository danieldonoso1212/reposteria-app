/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Paleta inspirada en el logo Dulzuras JM (vinotinto/marrón + dorado + crema)
        cream: {
          50: '#FBF6EC',
          100: '#F5EAD3',
          200: '#EAD5A9',
          300: '#D9B97D',
          400: '#C49B58',
          500: '#A87E3F',
          600: '#8A6532',
          700: '#6B4D29',
          800: '#4D3720',
          900: '#2F2118',
        },
        wine: {
          50: '#FBF2F2',
          100: '#F5DDDC',
          200: '#E9B6B4',
          300: '#D58481',
          400: '#BC5853',
          500: '#9F3A35',
          600: '#7E2926',
          700: '#5F1E1B',
          800: '#421614',
          900: '#28100E',
        },
        gold: {
          400: '#D4A859',
          500: '#B58A3F',
          600: '#946D2D',
        },
      },
      fontFamily: {
        display: ['Fraunces', 'Georgia', 'serif'],
        sans: ['"DM Sans"', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
