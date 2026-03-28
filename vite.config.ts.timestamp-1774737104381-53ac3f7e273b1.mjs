// vite.config.ts
import { defineConfig } from "file:///C:/Users/mesqu/Documents/vektorFinancas/node_modules/vite/dist/node/index.js";
import react from "file:///C:/Users/mesqu/Documents/vektorFinancas/node_modules/@vitejs/plugin-react-swc/index.js";
import path from "path";
import { componentTagger } from "file:///C:/Users/mesqu/Documents/vektorFinancas/node_modules/lovable-tagger/dist/index.js";
import { VitePWA } from "file:///C:/Users/mesqu/Documents/vektorFinancas/node_modules/vite-plugin-pwa/dist/index.js";
var __vite_injected_original_dirname = "C:\\Users\\mesqu\\Documents\\vektorFinancas";
var vite_config_default = defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false
    }
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    VitePWA({
      registerType: "prompt",
      includeAssets: ["favicon.ico", "favicon.png", "pwa-192x192.svg", "pwa-512x512.svg"],
      manifest: {
        name: "Vektor - Clareza Financeira",
        short_name: "Vektor",
        description: "Sistema financeiro inteligente para aut\xF4nomos e MEI",
        theme_color: "#1E3A8A",
        background_color: "#f0f2f8",
        display: "standalone",
        orientation: "portrait-primary",
        start_url: "/landing",
        scope: "/",
        shortcuts: [
          {
            name: "Vektor Gest\xE3o",
            short_name: "Gest\xE3o",
            description: "Acesse o painel financeiro completo",
            url: "/dashboard",
            icons: [{ src: "/pwa-192x192.svg", sizes: "192x192" }]
          }
        ],
        icons: [
          { src: "/pwa-192x192.svg", sizes: "192x192", type: "image/svg+xml", purpose: "any maskable" },
          { src: "/pwa-512x512.svg", sizes: "512x512", type: "image/svg+xml", purpose: "any maskable" }
        ]
      },
      workbox: {
        navigateFallbackDenylist: [/^\/~oauth/],
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"]
      }
    })
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__vite_injected_original_dirname, "./src")
    }
  }
}));
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxtZXNxdVxcXFxEb2N1bWVudHNcXFxcdmVrdG9yRmluYW5jYXNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIkM6XFxcXFVzZXJzXFxcXG1lc3F1XFxcXERvY3VtZW50c1xcXFx2ZWt0b3JGaW5hbmNhc1xcXFx2aXRlLmNvbmZpZy50c1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vQzovVXNlcnMvbWVzcXUvRG9jdW1lbnRzL3Zla3RvckZpbmFuY2FzL3ZpdGUuY29uZmlnLnRzXCI7aW1wb3J0IHsgZGVmaW5lQ29uZmlnIH0gZnJvbSBcInZpdGVcIjtcclxuaW1wb3J0IHJlYWN0IGZyb20gXCJAdml0ZWpzL3BsdWdpbi1yZWFjdC1zd2NcIjtcclxuaW1wb3J0IHBhdGggZnJvbSBcInBhdGhcIjtcclxuaW1wb3J0IHsgY29tcG9uZW50VGFnZ2VyIH0gZnJvbSBcImxvdmFibGUtdGFnZ2VyXCI7XHJcbmltcG9ydCB7IFZpdGVQV0EgfSBmcm9tIFwidml0ZS1wbHVnaW4tcHdhXCI7XHJcblxyXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVDb25maWcoKHsgbW9kZSB9KSA9PiAoe1xyXG4gIHNlcnZlcjoge1xyXG4gICAgaG9zdDogXCI6OlwiLFxyXG4gICAgcG9ydDogODA4MCxcclxuICAgIGhtcjoge1xyXG4gICAgICBvdmVybGF5OiBmYWxzZSxcclxuICAgIH0sXHJcbiAgfSxcclxuICBwbHVnaW5zOiBbXHJcbiAgICByZWFjdCgpLFxyXG4gICAgbW9kZSA9PT0gXCJkZXZlbG9wbWVudFwiICYmIGNvbXBvbmVudFRhZ2dlcigpLFxyXG4gICAgVml0ZVBXQSh7XHJcbiAgICAgIHJlZ2lzdGVyVHlwZTogXCJwcm9tcHRcIixcclxuICAgICAgaW5jbHVkZUFzc2V0czogW1wiZmF2aWNvbi5pY29cIiwgXCJmYXZpY29uLnBuZ1wiLCBcInB3YS0xOTJ4MTkyLnN2Z1wiLCBcInB3YS01MTJ4NTEyLnN2Z1wiXSxcclxuICAgICAgbWFuaWZlc3Q6IHtcclxuICAgICAgICBuYW1lOiBcIlZla3RvciAtIENsYXJlemEgRmluYW5jZWlyYVwiLFxyXG4gICAgICAgIHNob3J0X25hbWU6IFwiVmVrdG9yXCIsXHJcbiAgICAgICAgZGVzY3JpcHRpb246IFwiU2lzdGVtYSBmaW5hbmNlaXJvIGludGVsaWdlbnRlIHBhcmEgYXV0XHUwMEY0bm9tb3MgZSBNRUlcIixcclxuICAgICAgICB0aGVtZV9jb2xvcjogXCIjMUUzQThBXCIsXHJcbiAgICAgICAgYmFja2dyb3VuZF9jb2xvcjogXCIjZjBmMmY4XCIsXHJcbiAgICAgICAgZGlzcGxheTogXCJzdGFuZGFsb25lXCIsXHJcbiAgICAgICAgb3JpZW50YXRpb246IFwicG9ydHJhaXQtcHJpbWFyeVwiLFxyXG4gICAgICAgIHN0YXJ0X3VybDogXCIvbGFuZGluZ1wiLFxyXG4gICAgICAgIHNjb3BlOiBcIi9cIixcclxuICAgICAgICBzaG9ydGN1dHM6IFtcclxuICAgICAgICAgIHtcclxuICAgICAgICAgICAgbmFtZTogXCJWZWt0b3IgR2VzdFx1MDBFM29cIixcclxuICAgICAgICAgICAgc2hvcnRfbmFtZTogXCJHZXN0XHUwMEUzb1wiLFxyXG4gICAgICAgICAgICBkZXNjcmlwdGlvbjogXCJBY2Vzc2UgbyBwYWluZWwgZmluYW5jZWlybyBjb21wbGV0b1wiLFxyXG4gICAgICAgICAgICB1cmw6IFwiL2Rhc2hib2FyZFwiLFxyXG4gICAgICAgICAgICBpY29uczogW3sgc3JjOiBcIi9wd2EtMTkyeDE5Mi5zdmdcIiwgc2l6ZXM6IFwiMTkyeDE5MlwiIH1dXHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgXSxcclxuICAgICAgICBpY29uczogW1xyXG4gICAgICAgICAgeyBzcmM6IFwiL3B3YS0xOTJ4MTkyLnN2Z1wiLCBzaXplczogXCIxOTJ4MTkyXCIsIHR5cGU6IFwiaW1hZ2Uvc3ZnK3htbFwiLCBwdXJwb3NlOiBcImFueSBtYXNrYWJsZVwiIH0sXHJcbiAgICAgICAgICB7IHNyYzogXCIvcHdhLTUxMng1MTIuc3ZnXCIsIHNpemVzOiBcIjUxMng1MTJcIiwgdHlwZTogXCJpbWFnZS9zdmcreG1sXCIsIHB1cnBvc2U6IFwiYW55IG1hc2thYmxlXCIgfSxcclxuICAgICAgICBdLFxyXG4gICAgICB9LFxyXG4gICAgICB3b3JrYm94OiB7XHJcbiAgICAgICAgbmF2aWdhdGVGYWxsYmFja0RlbnlsaXN0OiBbL15cXC9+b2F1dGgvXSxcclxuICAgICAgICBnbG9iUGF0dGVybnM6IFtcIioqLyoue2pzLGNzcyxodG1sLGljbyxwbmcsc3ZnLHdvZmYyfVwiXSxcclxuICAgICAgfSxcclxuICAgIH0pLFxyXG4gIF0uZmlsdGVyKEJvb2xlYW4pLFxyXG4gIHJlc29sdmU6IHtcclxuICAgIGFsaWFzOiB7XHJcbiAgICAgIFwiQFwiOiBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCBcIi4vc3JjXCIpLFxyXG4gICAgfSxcclxuICB9LFxyXG59KSk7XHJcbiJdLAogICJtYXBwaW5ncyI6ICI7QUFBaVQsU0FBUyxvQkFBb0I7QUFDOVUsT0FBTyxXQUFXO0FBQ2xCLE9BQU8sVUFBVTtBQUNqQixTQUFTLHVCQUF1QjtBQUNoQyxTQUFTLGVBQWU7QUFKeEIsSUFBTSxtQ0FBbUM7QUFNekMsSUFBTyxzQkFBUSxhQUFhLENBQUMsRUFBRSxLQUFLLE9BQU87QUFBQSxFQUN6QyxRQUFRO0FBQUEsSUFDTixNQUFNO0FBQUEsSUFDTixNQUFNO0FBQUEsSUFDTixLQUFLO0FBQUEsTUFDSCxTQUFTO0FBQUEsSUFDWDtBQUFBLEVBQ0Y7QUFBQSxFQUNBLFNBQVM7QUFBQSxJQUNQLE1BQU07QUFBQSxJQUNOLFNBQVMsaUJBQWlCLGdCQUFnQjtBQUFBLElBQzFDLFFBQVE7QUFBQSxNQUNOLGNBQWM7QUFBQSxNQUNkLGVBQWUsQ0FBQyxlQUFlLGVBQWUsbUJBQW1CLGlCQUFpQjtBQUFBLE1BQ2xGLFVBQVU7QUFBQSxRQUNSLE1BQU07QUFBQSxRQUNOLFlBQVk7QUFBQSxRQUNaLGFBQWE7QUFBQSxRQUNiLGFBQWE7QUFBQSxRQUNiLGtCQUFrQjtBQUFBLFFBQ2xCLFNBQVM7QUFBQSxRQUNULGFBQWE7QUFBQSxRQUNiLFdBQVc7QUFBQSxRQUNYLE9BQU87QUFBQSxRQUNQLFdBQVc7QUFBQSxVQUNUO0FBQUEsWUFDRSxNQUFNO0FBQUEsWUFDTixZQUFZO0FBQUEsWUFDWixhQUFhO0FBQUEsWUFDYixLQUFLO0FBQUEsWUFDTCxPQUFPLENBQUMsRUFBRSxLQUFLLG9CQUFvQixPQUFPLFVBQVUsQ0FBQztBQUFBLFVBQ3ZEO0FBQUEsUUFDRjtBQUFBLFFBQ0EsT0FBTztBQUFBLFVBQ0wsRUFBRSxLQUFLLG9CQUFvQixPQUFPLFdBQVcsTUFBTSxpQkFBaUIsU0FBUyxlQUFlO0FBQUEsVUFDNUYsRUFBRSxLQUFLLG9CQUFvQixPQUFPLFdBQVcsTUFBTSxpQkFBaUIsU0FBUyxlQUFlO0FBQUEsUUFDOUY7QUFBQSxNQUNGO0FBQUEsTUFDQSxTQUFTO0FBQUEsUUFDUCwwQkFBMEIsQ0FBQyxXQUFXO0FBQUEsUUFDdEMsY0FBYyxDQUFDLHNDQUFzQztBQUFBLE1BQ3ZEO0FBQUEsSUFDRixDQUFDO0FBQUEsRUFDSCxFQUFFLE9BQU8sT0FBTztBQUFBLEVBQ2hCLFNBQVM7QUFBQSxJQUNQLE9BQU87QUFBQSxNQUNMLEtBQUssS0FBSyxRQUFRLGtDQUFXLE9BQU87QUFBQSxJQUN0QztBQUFBLEVBQ0Y7QUFDRixFQUFFOyIsCiAgIm5hbWVzIjogW10KfQo=
