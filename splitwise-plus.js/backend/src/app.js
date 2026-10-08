import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';
import authRoutes from './routes/authRoutes.js';

const app = express();

app.use(
  cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true,
  })
);

app.use(helmet());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use(
  morgan('dev', {
    skip: (req, res) => process.env.NODE_ENV === 'test',
  })
);

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: {
    success: false,
    message: 'Too many requests, please try again later.',
  },
});

app.use('/api', apiLimiter);

app.use('/api/v1/auth', authRoutes);

app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Splitwise++ backend is healthy',
    data: {
      service: 'backend',
      timestamp: new Date().toISOString(),
    },
  });
});

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'The requested endpoint was not found.',
    data: null,
    error: { code: 'NOT_FOUND' },
  });
});

app.use((error, req, res, next) => {
  console.error('Request failed:', error);
  res.status(500).json({
    success: false,
    message: 'An unexpected error occurred.',
    data: null,
    error: { code: 'INTERNAL_SERVER_ERROR' },
  });
});

export default app;
