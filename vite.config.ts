import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['icon.svg'],
        manifest: {
          name: 'iRobotix Ops',
          short_name: 'iRobotix',
          description: 'Lightweight, offline-first operations tool for drone services.',
          theme_color: '#ffffff',
          background_color: '#ffffff',
          display: 'standalone',
          icons: [
            {
              src: 'icon.svg',
              sizes: '192x192 512x512',
              type: 'image/svg+xml'
            }
          ]
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg}']
        },
        devOptions: {
          enabled: true,
          type: 'module',
        }
      })
    ],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    build: {
      chunkSizeWarningLimit: 1000,
      rollupOptions: {
        output: {
          manualChunks(id) {
            // 1. Isolate open-source Leaflet maps mapping modules
            if (id.includes("node_modules/leaflet") || id.includes("node_modules/react-leaflet")) {
              return "spatial-core-engine";
            }

            // 2. Isolate heavy geographic geometric utility systems (Turf.js)
            if (id.includes("node_modules/@turf")) {
              return "geospatial-geometry-toolchain";
            }

            // 3. Clean Array Checker for compressed vector data parsing utilities
            const vectorLibs = [
              "node_modules/shpjs",
              "node_modules/jszip",
              "node_modules/@tmcw/togeojson"
            ];
            if (vectorLibs.some(lib => id.includes(lib))) {
              return "vector-decompression-handlers";
            }

            // 4. Isolate core Firestore offline-first sync engines
            if (id.includes("node_modules/@firebase") || id.includes("node_modules/firebase")) {
              return "firebase-persistence-layer";
            }
          }
        }
      }
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});