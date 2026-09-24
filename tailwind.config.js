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
        // ── Premium elevation system (additive — old `shadow-default` usages
        //    elsewhere in the app keep working untouched) ──────────────────
        xs: "0 1px 2px 0 rgba(16, 24, 40, 0.04)",
        soft: "0 1px 2px rgba(16,24,40,0.04), 0 2px 8px -2px rgba(16,24,40,0.06)",
        card: "0 1px 2px rgba(16,24,40,0.04), 0 4px 16px -4px rgba(16,24,40,0.08)",
        elevated: "0 4px 12px rgba(16,24,40,0.06), 0 12px 32px -8px rgba(16,24,40,0.12)",
        popover: "0 8px 24px -4px rgba(16,24,40,0.12), 0 2px 8px -2px rgba(16,24,40,0.08)",
        "glow-brand": "0 8px 24px -8px rgba(79,70,229,0.45)",
        "glow-rose": "0 8px 20px -6px rgba(225,29,72,0.5)",
        "inner-soft": "inset 0 1px 2px rgba(16,24,40,0.06)",
      },
      borderRadius: {
        "4xl": "2rem",
        "5xl": "2.5rem",
      },
      backgroundImage: {
        "brand-gradient": "linear-gradient(135deg, #4f46e5 0%, #6366f1 45%, #8b5cf6 100%)",
        "brand-gradient-soft": "linear-gradient(135deg, rgba(79,70,229,0.10) 0%, rgba(139,92,246,0.10) 100%)",
        "mesh-hero": "radial-gradient(at 0% 0%, rgba(99,102,241,0.20) 0px, transparent 50%), radial-gradient(at 100% 0%, rgba(139,92,246,0.18) 0px, transparent 50%), radial-gradient(at 100% 100%, rgba(59,130,246,0.14) 0px, transparent 50%)",
      },
      keyframes: {
        fadeIn: { from: { opacity: 0 }, to: { opacity: 1 } },
        scaleIn: { from: { opacity: 0, transform: "scale(0.95)" }, to: { opacity: 1, transform: "scale(1)" } },
        slideUp: { from: { opacity: 0, transform: "translateY(12px)" }, to: { opacity: 1, transform: "translateY(0)" } },
        slideInLeft: { from: { transform: "translateX(-100%)" }, to: { transform: "translateX(0)" } },
        shimmer: { from: { backgroundPosition: "-200% 0" }, to: { backgroundPosition: "200% 0" } },
        floatSoft: { "0%,100%": { transform: "translateY(0)" }, "50%": { transform: "translateY(-4px)" } },
      },
      animation: {
        "fade-in": "fadeIn 0.2s ease-out both",
        "scale-in": "scaleIn 0.18s cubic-bezier(0.16,1,0.3,1) both",
        "slide-up": "slideUp 0.28s cubic-bezier(0.16,1,0.3,1) both",
        "slide-in-left": "slideInLeft 0.25s cubic-bezier(0.4,0,0.2,1) both",
        shimmer: "shimmer 1.8s ease-in-out infinite",
        "float-soft": "floatSoft 4s ease-in-out infinite",
      },
      transitionTimingFunction: {
        premium: "cubic-bezier(0.16, 1, 0.3, 1)",
      },
    },
  },
  plugins: [],
}