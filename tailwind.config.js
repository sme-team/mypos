// tailwind.config.js
module.exports = {
  content: ["./App.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: '#006241',
        secondary: '#f1f1f1',
      },
    },
  },
  plugins: [require("nativewind/tailwind/native")],
};

