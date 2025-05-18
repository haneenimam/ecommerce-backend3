require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

// Verify no conflicting router package is loaded
try {
    const router = require('router');
    console.error('CONFLICT: Separate router package installed');
    process.exit(1);
} catch (err) {
    // Good - no conflicting router package
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
    process.exit(1);
};

// Middleware with security enhancements
app.use(cors({
    origin: process.env.CORS_ORIGIN || '*'
}));
app.use(express.json({ limit: '10kb' }));

// Route imports with verification
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

// Enhanced error handling (this stays after all routes)
app.use((err, req, res, next) => {
    console.error(`[${new Date().toISOString()}] Error:`, err.stack);
    res.status(500).json({
        status: 'error',
        message: 'Internal server error'
    });
});


// Start server after DB connection
connectDB().then(() => {
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
        console.log('Routes:');
        console.log('- POST /api/auth/register');
        console.log('- POST /api/auth/login');
        console.log('- GET /api/products');
        console.log('- POST /api/cart');
        console.log('- POST /api/orders');
        console.log('- GET /api/admin/users');
        console.log('- GET/POST /api/reviews');
        console.log('- POST /api/payment/create-payment-intent');
        console.log('- POST /api/payment/webhook');
    });
});