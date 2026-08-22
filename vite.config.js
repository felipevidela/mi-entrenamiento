import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["apple-touch-icon.png"],
      manifest: {
        name: "Mi entrenamiento",
        short_name: "Entrenamiento",
        description: "Registro de sesiones de entrenamiento sobre un calendario mensual.",
        lang: "es",
        start_url: "/",
        display: "standalone",
        orientation: "portrait",
        background_color: "#0E1F2A",
        theme_color: "#0E1F2A",
        icons: [
          { src: "/icono-192.png", sizes: "192x192", type: "image/png" },
          { src: "/icono-512.png", sizes: "512x512", type: "image/png" },
          { src: "/icono-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        // solo el bundle propio; las llamadas a Firebase siempre van a la red
        globPatterns: ["**/*.{js,css,html,png,woff2}"],
        navigateFallback: "/index.html",
      },
    }),
  ],
});
