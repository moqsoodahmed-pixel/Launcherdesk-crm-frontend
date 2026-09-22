// tailwind.config.js
/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",  // ← this line was missing
  ],
  theme: {
    extend: {
      fontFamily: {
        // Poppins is now the default sans family (loaded in index.html), so the
        // whole app renders in it consistently — not just elements that opted in
        // with the font-poppins class.
        sans: ["Poppins", "ui-sans-serif", "system-ui", "sans-serif"],
        poppins: ["Poppins", "sans-serif"],
      },
      // ── TailAdmin design tokens ───────────────────────────────────────────
      // Used by the auth pages (AdminLogin, UserLogin, SuperAdminLogin) which
      // are styled to match the TailAdmin admin-dashboard template.
      colors: {
        primary: "#3C50E0",
        secondary: "#80CAEE",
        stroke: "#E2E8F0",
        strokedark: "#2E3A47",
        "form-input": "#1D2A39",
        "form-strokedark": "#3d4d60",
        body: "#64748B",
        bodydark: "#AEB7C0",
        bodydark1: "#DEE4EE",
        bodydark2: "#8A99AF",
        whiten: "#F1F5F9",
        whiter: "#F5F7FD",
        boxdark: "#24303F",
        "boxdark-2": "#1A222C",
        "meta-4": "#313D4A",
        success: "#219653",
        danger: "#D34053",
        warning: "#FFA70B",
      },
      boxShadow: {
        default: "0px 8px 13px -3px rgba(0, 0, 0, 0.07)",
      },
    },
  },
  plugins: [],
}