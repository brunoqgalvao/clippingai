import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { prisma } from '@clippingai/database';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from monorepo root
const envPath = path.resolve(__dirname, '../../../.env');
const result = dotenv.config({ path: envPath });
if (result.error) {
  console.error('❌ Error loading .env file:', result.error);
} else {
  console.log(`✅ Loaded .env from: ${envPath}`);
  console.log('📋 Environment variables loaded:', {
    hasAnthropicKey: !!process.env.ANTHROPIC_API_KEY,
    hasTavilyKey: !!process.env.TAVILY_API_KEY,
    hasGoogleKey: !!process.env.GOOGLE_AI_API_KEY,
    hasResendKey: !!process.env.RESEND_API_KEY,
  });
}

const app = express();
const PORT = process.env.API_PORT || 3001;

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Import routes
import onboardingRoutes from './routes/onboarding.js';
import reportsRoutes from './routes/reports.js';
import authRoutes from './routes/auth.js';
import jobsRoutes from './routes/jobs.js';

// API routes
app.get('/api', (req, res) => {
  res.json({ message: 'Clipping.AI API' });
});

// Mount routes
app.use('/api/auth', authRoutes);
app.use('/api/onboarding', onboardingRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/jobs', jobsRoutes);

// Error handling
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
    },
  });
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`🚀 API server running on http://localhost:${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
  });

  // Cleanup job queue
  try {
    const { cleanup } = await import('./services/jobQueue.js');
    await cleanup();
  } catch (error) {
    console.error('Error cleaning up job queue:', error);
  }

  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('\nSIGINT signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
  });

  // Cleanup job queue
  try {
    const { cleanup } = await import('./services/jobQueue.js');
    await cleanup();
  } catch (error) {
    console.error('Error cleaning up job queue:', error);
  }

  await prisma.$disconnect();
  process.exit(0);
});

export default app;
