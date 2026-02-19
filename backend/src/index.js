import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import cron from 'node-cron';

import publicRoutes from './routes/public.js';
import adminRoutes from './routes/admin.js';
import externalRoutes from './routes/external.js';
import rateLimit from './middleware/rateLimit.js';
import cleanupService from './services/cleanup.js';
import telegramService from './services/telegram.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Rate limiting for public API
app.use('/api', rateLimit());

// Routes
app.use('/api', publicRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/ext', externalRoutes);

// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: 'Not found',
    });
});

// Error handler
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({
        success: false,
        error: 'Internal server error',
    });
});

// Cron job - cleanup expired inboxes every hour
cron.schedule('0 * * * *', async () => {
    console.log('🧹 Running scheduled cleanup...');
    try {
        const deletedCount = await cleanupService.cleanupExpiredInboxes();
        console.log(`🧹 Cleanup completed. Deleted ${deletedCount} expired inboxes.`);
    } catch (error) {
        console.error('❌ Cleanup failed:', error);
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`
  ╔═══════════════════════════════════════════════╗
  ║                                               ║
  ║   🚀 Hubify Mail API Server                   ║
  ║   Running on http://localhost:${PORT}           ║
  ║                                               ║
  ╚═══════════════════════════════════════════════╝
  `);

    // Start Telegram bot
    telegramService.startBot();
});

export default app;
