import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react()],
    server: {
        port: 5173,
        proxy: {
            '/api': {
                target: 'https://pj.crazyshot.kr',
                changeOrigin: true,
                secure: true,
                configure: function (proxy, _options) {
                    proxy.on('error', function (err, _req, _res) {
                        console.log('로컬 API 프록시 오류, 클라우드 서버로 연결:', err.message);
                    });
                },
            },
        },
    }
});
