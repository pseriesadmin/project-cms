import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
// https://vitejs.dev/config/
export default defineConfig({
    plugins: [
        react(),
        {
            name: 'mock-api',
            configureServer: function (server) {
                server.middlewares.use('/api/project', function (req, res, next) {
                    if (req.method === 'GET') {
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({
                            success: true,
                            projectData: {
                                projectPhases: [
                                    {
                                        id: 'phase-service-planning',
                                        title: 'Service Planning (서비스 기획)',
                                        tasks: []
                                    }
                                ],
                                logs: []
                            }
                        }));
                    }
                    else if (req.method === 'POST') {
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ success: true }));
                    }
                    else {
                        next();
                    }
                });
                server.middlewares.use('/api/backup', function (req, res, next) {
                    if (req.method === 'GET') {
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({
                            success: true,
                            data: {
                                equipmentData: [],
                                logData: [],
                                logArchive: [],
                                formFields: [],
                                categoryCodes: [],
                                geminiApiKey: null
                            }
                        }));
                    }
                    else if (req.method === 'POST') {
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ success: true }));
                    }
                    else {
                        next();
                    }
                });
            }
        }
    ],
    server: {
        port: 5173
    }
});
