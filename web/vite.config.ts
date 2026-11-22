import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from 'tailwindcss';
import autoprefixer from 'autoprefixer';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  css: {
    postcss: {
      plugins: [
        tailwindcss({
          content: [
            './index.html',
            './src/**/*.{js,ts,jsx,tsx}',
          ],
          darkMode: 'class',
          theme: {
            extend: {
              colors: {
                pharmacy: {
                  50: '#F0FDFA',
                  100: '#CCFBF1',
                  200: '#99F6E4',
                  300: '#5EEAD4',
                  400: '#2DD4BF',
                  500: '#14B8A6',
                  600: '#0F766E',
                  700: '#115E59',
                  800: '#0F4E4A',
                  900: '#134E4A',
                  950: '#042F2E',
                },
                slateink: '#0F172A',
              },
              fontFamily: {
                sans: ['Quicksand', 'system-ui', 'sans-serif'],
                mono: ['ui-monospace', 'SFMono-Regular', 'monospace'],
              },
            },
          },
        }),
        autoprefixer(),
      ],
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
      '/health': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
    },
  },
});
