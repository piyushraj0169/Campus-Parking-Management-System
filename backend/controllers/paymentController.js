
const Razorpay = require('razorpay');
const crypto = require('crypto');
const Booking = require('../models/Booking');

// Initialize Razorpay
const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
});

// @desc    Create Razorpay Order
// @route   POST /api/bookings/create-order
// @access  Private
const createOrder = async (req, res) => {
    try {
        const { amount, currency = 'INR', receipt } = req.body;
        console.log("Create Order Request:", { amount, currency, receipt });

        const options = {
            amount: Math.round(amount * 100), // Ensure integer
            currency,
            receipt: receipt || `receipt_${Date.now()}`
        };

        const order = await razorpay.orders.create(options);
        console.log("Order Created Successfully:", order);

        res.json(order);
    } catch (error) {
        console.error("Razorpay Order Creation Error (Full Object):", error);
        res.status(500).json({
            message: 'Something went wrong with payment initiation',
            error: error.message,
            stack: error.stack
        });
    }
};

// @desc    Verify Razorpay Payment
// @route   POST /api/bookings/verify-payment
// @access  Private
const verifyPayment = async (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

        const body = razorpay_order_id + "|" + razorpay_payment_id;

        const expectedSignature = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
            .update(body.toString())
            .digest('hex');

        const isAuthentic = expectedSignature === razorpay_signature;

        if (isAuthentic) {
            res.json({
                message: "Payment success",
                paymentId: razorpay_payment_id,
                orderId: razorpay_order_id
            });
        } else {
            res.status(400).json({ message: 'Payment verification failed' });
        }
    } catch (error) {
        console.error("Payment Verification Error:", error);
        res.status(500).json({ message: 'Internal Server Error', error: error.message });
    }
};

module.exports = { createOrder, verifyPayment };
