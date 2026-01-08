/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './pages/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: '#282828', // dark grey
        secondary: '#009A44', // light green
        default: '#2c5234', // dark green
        Info: '#2c5234', // dark green 
        main: '#171817', // black
        grey: '#97999B' // grey
      },
      fontFamily: {
        'open-sans': ['Open Sans', 'sans-serif'],
        'open-sans-medium': ['Open Sans', 'sans-serif'],
        'open-sans-semibold': ['Open Sans', 'sans-serif'],
        'open-sans-extrabold': ['Open Sans', 'sans-serif'],
      },
    },
  },
  variants: {
    extend: {
      visibility: ['group-hover'],
    },
  },
  plugins: [require('@tailwindcss/typography'),
            require('tailwind-scrollbar')({nocompatible: true})],
};

// BRANDING COLORS:
// White (R 255 G 255 B 255): #FFFFFF
// Black (R 0 G 0 B 0): #000000
// Deloitte Green (R 134 G 188 B 37): #86BC25
// Green 4 (R 67 G 176 B 42): #43B02A
// Accessible Green (R 38 G 137 B 13): #26890D
// Green 6 (R 4 G 106 B 56): #046A38
// Accessible Teal (R 13 G 131 B 144): #0D8390
// Accessible Blue (R 0 G 124 B 176): #007CB0
// Green 1 (R 227 G 228 B 141): #E3E48D
// Green 2 (R 196 G 214 B 0): #C4D600
// Green 5 (R 0 G 154 B 68): #009A44
// Green 7 (R 44 G 82 B 52): #2C5234
// Blue 1 (R 160 G 220 B 255): #A0DCFF
// Blue 2 (R 98 G 181 B 229): #62B5E5
// Blue 3 (R 0 G 163 B 224): #00A3E0
// Blue 4 (R 0 G 118 B 168): #0076A8
// Blue 5 (R 0 G 85 B 135): #005587
// Blue 6 (R 1 G 33 B 105): #012169
// Blue 7 (R 4 G 30 B 66): #041E42
// Teal 1 (R 221 G 239 B 232): #DDEFE8
// Teal 2 (R 157 G 212 B 207): #9DD4CF
// Teal 3 (R 111 G 194 B 180): #6FC2B4
// Teal 4 (R 0 G 171 B 171): #00ABAB
// Teal 5 (R 0 G 151 B 169): #0097A9
// Teal 6 (R 0 G 118 B 128): #007680
// Teal 7 (R 0 G 79 B 89): #004F59
// Cool Gray 2 (R 208 G 208 B 206): #D0D0CE
// Cool Gray 4 (R 187 G 188 B 188): #BBBBBC
// Cool Gray 6 (R 167 G 168 B 170): #A7A8AA
// Cool Gray 7 (R 151 G 153 B 155): #97999B
// Cool Gray 9 (R 117 G 120 B 123): #75787B
// Cool Gray 10 (R 99 G 102 B 106): #63666A
// Cool Gray 11 (R 83 G 86 B 90): #53565A
// Bright Green (Limited Use) (R 13 G 242 B 0): #0DF200
// Bright Teal (Limited Use) (R 62 G 250 B 197): #3EFAF5
// Bright Blue (Limited Use) (R 51 G 240 B 255): #33F0FF
// Red (Functional Use) (R 218 G 41 B 28): #DA291C
// Orange (Functional Use) (R 237 G 139 B 0): #ED8B00
// Yellow (Functional Use) (R 255 G 205 B 0): #FFCD00
