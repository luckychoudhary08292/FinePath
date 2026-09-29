import express from 'express';
import cors from 'cors';
import path from 'path';
import dotenv from 'dotenv';
import { connectDB } from './server/db/connection.js';
import { authRouter } from './server/routes/auth.js';
import { platformsRouter } from './server/routes/platforms.js';
import { transactionsRouter } from './server/routes/transactions.js';
import { summaryRouter } from './server/routes/summary.js';

dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);
const isProd = process.env.NODE_ENV === 'production';

// Express middleware
app.use(cors());
app.use(express.json());

// API health endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    app: 'RiderWallet',
    timestamp: new Date().toISOString(),
  });
});

// Mount API routes
app.use('/api/auth', authRouter);
app.use('/api/platforms', platformsRouter);
app.use('/api/transactions', transactionsRouter);
app.use('/api/summary', summaryRouter);

async function startServer() {
  // Connect to DB (Mongoose with fallback store)
  await connectDB();

  if (!isProd) {
    // Clear any tsx/esbuild injected global __dirname so vite-plugin-pwa loads properly in pure ESM mode
    delete (global as any).__dirname;
    delete (globalThis as any).__dirname;

    // Vite Dev Server Middleware Mode
    const isHmrDisabled = process.env.DISABLE_HMR === 'true';
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        host: '0.0.0.0',
        port: PORT,
        hmr: isHmrDisabled ? false : { port: PORT },
        watch: isHmrDisabled ? null : {},
      },
      appType: 'spa',
    });

    app.use(vite.middlewares);
  } else {
    // Production: serve built static files from dist
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath, { maxAge: '1h' }));

    // Unmatched API routes return 404 JSON instead of HTML
    app.all('/api/*', (req, res) => {
      res.status(404).json({ error: 'API endpoint not found', path: req.originalUrl });
    });

    // SPA fallback: return index.html for all client-side navigation
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`[RiderWallet] Server listening on http://0.0.0.0:${PORT} in ${isProd ? 'production' : 'development'} mode`);
  });

  // Graceful shutdown handling for Render deployments
  const shutdown = (signal: string) => {
    console.log(`[RiderWallet] Received ${signal}. Gracefully shutting down server...`);
    server.close(() => {
      console.log('[RiderWallet] HTTP server closed.');
      process.exit(0);
    });
    setTimeout(() => {
      console.error('[RiderWallet] Forcefully shutting down after timeout.');
      process.exit(1);
    }, 5000).unref();
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

startServer().catch((err) => {
  console.error('[RiderWallet] Fatal startup error:', err);
  process.exit(1);
});
