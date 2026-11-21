import { defineConfig } from 'vite';

export default defineConfig({
  base: '/Encaminhado_com_Frequencia/',
  build: { outDir: 'dist', chunkSizeWarningLimit: 2500 },
});
