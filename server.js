require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

// Verify environment variables
if (!process.env.MONGO_URI) {
  console.error('ERROR: Missing MONGO_URI in environment variables');
  process.exit(1);
}

// Verify no conflicting router package
try {
  const router = require('router');
  console.error('CONFLICT: Separate router package installed');
  process.exit(1);
} catch (err) {
  // Proceed as expected
}

const app = express();
const PORT = process.env.PORT || 5000;

// Enhanced DB connection with retry logic
const connectDB = async (retries = 5) => {
  while (retries > 0) {
    try {
      await mongoose.connect(process.env.MONGO_URI);
      console.log('MongoDB Connected');
      return;
    } catch (err) {
      console.error(`DB Connection failed (${retries} retries left)`);
      retries--;
      await new Promise(res => setTimeout(res, 5000));
    }
  }
  console.error('MongoDB connection failed after retries');
  process.exit(1);
};

// Middleware
app.use(express.json({ limit: '10kb' }));
app.use(cors({
  origin: process.env.CORS_ORIGIN || [
    'http://localhost:3000', // Keep for local development
    'http://localhost:5173', // Vite default port
    'https://charming-sfogliatella-ab1dff.netlify.app' // Your Netlify URL
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'] // Explicit methods
}));



// Timeout handling
app.use((req, res, next) => {
  res.setTimeout(10000, () => {
    res.status(503).json({ error: 'Service timeout' });
  });
  next();
});

// Route imports
const loadRoute = (routePath) => {
  const route = require(routePath);
  if (typeof route !== 'function') {
    console.error(`Invalid route module: ${routePath}`);
    process.exit(1);
  }
  return route;
};

app.use('/api/auth', loadRoute('./routes/auth'));
app.use('/api/products', loadRoute('./routes/products'));
app.use('/api/cart', loadRoute('./routes/cart'));
app.use('/api/orders', loadRoute('./routes/orders'));
app.use('/api/admin', loadRoute('./routes/admin'));
app.use('/api/reviews', loadRoute('./routes/reviews'));
app.use('/api/payment', loadRoute('./routes/payment'));

// Health check endpoints
app.get('/', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'E-commerce API is running',
    timestamp: new Date().toISOString()
  });
});

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy' });
});

// Error handling (must be last)
app.use((err, req, res, next) => {
  console.error(`[${new Date().toISOString()}] Error:`, err.stack);
  res.status(500).json({
    status: 'error',
    message: 'Internal server error'
  });
});

// Start server
connectDB().then(() => {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
    console.log('Available routes:');
    console.log('- GET    /');
    console.log('- GET    /health');
    console.log('- POST   /api/auth/register');
    console.log('- POST   /api/auth/login');
    console.log('- GET    /api/products');
    console.log('- POST   /api/cart');
    console.log('- POST   /api/orders');
    console.log('- GET    /api/admin/users');
    console.log('- GET    /api/reviews/product/:productId');
    console.log('- POST   /api/payment/create-payment-intent');
  });
});