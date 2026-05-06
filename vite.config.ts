@@ -1,9 +0,0 @@
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// IMPORTANTE: cambia 'reposteria-app' por el nombre real de tu repositorio en GitHub
// Si usas un dominio propio, cambia base a '/'
export default defineConfig({
  plugins: [react()],
  base: '/reposteria-app/',
})
