import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: '../public',
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks: {
          // Separate vendor libraries
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-ui': ['framer-motion', 'lucide-react'],
          // Separate games into their own chunk
          'games': [
            './src/components/games/Pong.jsx',
            './src/components/games/Hangman.jsx',
            './src/components/games/Game2048.jsx',
            './src/components/games/Breakout.jsx',
            './src/components/Games.jsx',
            './src/components/LeaderboardModal.jsx',
            './src/utils/audio.js',
            './src/hooks/useGameInput.js'
          ]
        }
      }
    }
  },
  server: {
    proxy: {
      '/api': 'http://localhost:3001'
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})

