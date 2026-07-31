import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],

  // GitHub Pages 는 https://<계정>.github.io/<저장소>/ 처럼 하위 경로로 서빙된다.
  // 상대경로로 두면 저장소 이름이 무엇이든 그대로 동작한다.
  base: './',

  build: {
    // public/assets 가 dist/assets 로 복사되므로, 번들은 다른 폴더로 빼서 섞이지 않게 한다.
    assetsDir: 'bundle',
  },

  server: {
    port: 5173,
    open: true,
  },
});
