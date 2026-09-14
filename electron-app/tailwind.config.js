/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        discord: {
          blurple: '#5865F2',
          green: '#57F287',
          yellow: '#FEE75C',
          fuchsia: '#EB459E',
          red: '#ED4245',
          bgDark: '#202225',
          bgSidebar: '#2f3136',
          bgChat: '#36393f',
          bgInput: '#40444b'
        }
      }
    },
  },
  plugins: [],
}
