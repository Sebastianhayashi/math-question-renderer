/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        "primary": "#2E67F8",
        "background": "#F0F4F8",
        "surface": "#FFFFFF",
        "text-main": "#1A1D24",
        "muted": "#8A93A6",
        "success": "#14D86D",
        "error": "#FF4B4B",
        "holographic": "#00F0FF",
        "gold": "#FFD700"
      },
      fontFamily: {
        "display": ["Varela Round", "sans-serif"],
        "body": ["Nunito", "sans-serif"]
      },
      boxShadow: {
        "float": "0 12px 32px rgba(46, 103, 248, 0.1)",
        "3d-node": "0 6px 0 #CBD5E1",
        "3d-node-primary": "0 6px 0 #1d4ed8",
        "3d-node-success": "0 6px 0 #059669",
        "3d-button": "0 6px 0 #CBD5E1",
      },
      borderRadius: {
        "sm": "12px",
        "md": "24px",
        "lg": "32px",
        "full": "9999px"
      }
    },
  },
  plugins: [],
};
