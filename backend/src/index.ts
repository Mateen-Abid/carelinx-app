import dotenv from 'dotenv';
// Load environment variables FIRST
dotenv.config();

import express, { Application } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import authRouter from './routes/auth';
import bookingsRouter from './routes/bookings';
import clinicsRouter from './routes/clinics';
import doctorsRouter from './routes/doctors';
import servicesRouter from './routes/services';
import userRouter from './routes/user';
import statsRouter from './routes/stats';
import adminServicesRouter from './routes/admin-services';
import patientsRouter from './routes/patients';
import adminSettingsRouter from './routes/admin-settings';
import profilesRouter from './routes/profiles';
import invitationsRouter from './routes/invitations';
import clinicAdminRouter from './routes/clinic-admin';

const app: Application = express();
const PORT = process.env.PORT || 3001;

console.log('\n🚀 Starting CareLinx Backend...\n');

// CORS Configuration
// IMPORTANT: credentials: true allows httpOnly cookies
// Use APP_ORIGIN for production, fallback to FRONTEND_URL or localhost
const allowedOrigin = process.env.APP_ORIGIN || process.env.FRONTEND_URL || 'http://localhost:8080';
console.log('🌐 CORS origin configured:', allowedOrigin);

app.use(cors({
  origin: allowedOrigin,
  credentials: true, // CRITICAL: Allows cookies to be sent
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Request logging middleware (to debug route issues)
app.use((req, res, next) => {
  console.log(`📥 ${req.method} ${req.path}`);
  next();
});

// Middleware
app.use(express.json());
app.use(cookieParser()); // Parse cookies from requests

// Root route handler (prevents 404 on GET /)
app.get('/', (req, res) => {
  res.json({ 
    message: 'CareLinx Backend API',
    status: 'running',
    endpoints: {
      health: '/health',
      auth: '/api/auth',
      bookings: '/api/bookings',
      clinics: '/api/clinics',
      doctors: '/api/doctors',
      services: '/api/services',
      user: '/api/user',
      stats: '/api/stats',
      adminServices: '/api/admin-services',
      patients: '/api/patients',
      profiles: '/api/profiles',
      invitations: '/api/invitations',
      clinicAdmin: '/api/clinic-admin'
    },
    note: 'All API keys and tokens are hidden from frontend'
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Backend running - ALL API keys & tokens hidden from frontend',
    timestamp: new Date().toISOString()
  });
});

// Favicon handler (prevents 404 errors)
app.get('/favicon.ico', (req, res) => {
  res.status(204).end(); // No content
});

// API Routes
app.use('/api/auth', authRouter);
app.use('/api/bookings', bookingsRouter);
app.use('/api/clinics', clinicsRouter);
app.use('/api/doctors', doctorsRouter);
app.use('/api/services', servicesRouter);
app.use('/api/user', userRouter);
app.use('/api/stats', statsRouter);
app.use('/api/admin-services', adminServicesRouter);
app.use('/api/patients', patientsRouter);
app.use('/api/admin', adminSettingsRouter);
app.use('/api/profiles', profilesRouter);
app.use('/api/invitations', invitationsRouter);
app.use('/api/clinic-admin', clinicAdminRouter);

// 404 handler
app.use((req, res) => {
  console.error(`❌ Route not found: ${req.method} ${req.path}`);
  res.status(404).json({ error: 'Route not found' });
});

// Error handler
app.use((err: any, req: any, res: any, next: any) => {
  console.error('💥 Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
  console.log(`✅ Backend server running on http://localhost:${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 CORS Origin: ${allowedOrigin}`);
  console.log(`🔗 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:8080'}`);
  console.log(`\n🔒 SECURITY:`);
  console.log(`   ✓ API key hidden (backend .env)`);
  console.log(`   ✓ Bearer token hidden (httpOnly cookie)`);
  console.log(`   ✓ Frontend can't see Supabase credentials\n`);
});

