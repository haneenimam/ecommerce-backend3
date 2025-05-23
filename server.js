require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path'); // Added for static file serving

// Verify environment variables
if (!process.env.MONGO_URI || !process.env.STRIPE_SECRET_KEY) {
    console.error('ERROR: Missing required environment variables');
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
            await mongoose.connect(process.env.MONGO_URI, {
                serverSelectionTimeoutMS: 30000,
                socketTimeoutMS: 45000
            });
            console.log('MongoDB Connected');
            return;
        } catch (err) {
            console.error(`DB Connection failed (${retries} retries left):`, err.message);
            retries--;
            await new Promise(res => setTimeout(res, 5000));
        }
    }
    process.exit(1);
};

// Middleware
app.use(express.json({ limit: '10kb' }));
app.use(express.static(path.join(__dirname, 'public'))); // Serve static files

// CORS Configuration
const corsOptions = {
    origin: process.env.CORS_ORIGIN || [
        'http://localhost:3000',
        'http://localhost:5173',
        'https://charming-sfogliatella-ab1dff.netlify.app',
        'http://localhost:5000' // Added for test-payment.html
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE']
};
app.use(cors(corsOptions));

// Special CORS for Stripe webhook (raw body needed)
app.post('/api/payment/webhook', express.raw({ type: 'application/json' }), (req, res) => {
    const sig = req.headers['stripe-signature'];
    let event;

    try {
        event = stripe.webhooks.constructEvent(
            req.body,
            sig,
            process.env.STRIPE_WEBHOOK_SECRET
        );
    } catch (err) {
        console.error('⚠️ Webhook signature verification failed:', err);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    console.log(`Stripe Event: ${event.type}`);
    res.json({ received: true });
});

// Timeout handling
app.use((req, res, next) => {
    res.setTimeout(30000, () => {
        console.error(`Timeout for ${req.method} ${req.url}`);
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

// Routes
app.use('/api/auth', loadRoute('./routes/auth'));
app.use('/api/products', loadRoute('./routes/products'));
app.use('/api/cart', loadRoute('./routes/cart'));
app.use('/api/orders', loadRoute('./routes/orders'));
app.use('/api/admin', loadRoute('./routes/admin'));
app.use('/api/reviews', loadRoute('./routes/reviews'));
app.use('/api/payment', loadRoute('./routes/payment'));

// Serve test payment page
app.get('/test-payment', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'test-payment.html'));
});

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
        console.log('- GET    /test-payment');
        console.log('- POST   /api/auth/signup');
        console.log('- POST   /api/auth/login');
        console.log('- GET    /api/products');
        console.log('- POST   /api/cart');
        console.log('- POST   /api/orders');
        console.log('- GET    /api/admin/users');
        console.log('- GET    /api/reviews/product/:productId');
        console.log('- POST   /api/payment/create-payment-intent');
        console.log('- POST   /api/payment/webhook');
        console.log('\nTest payment page: http://localhost:5000/test-payment');
    });
});