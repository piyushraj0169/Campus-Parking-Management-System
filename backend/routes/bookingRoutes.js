const express = require('express');
const { protect, admin, staff } = require('../middleware/authMiddleware');
const { createBooking, getMyBookings, getBookingById, payBooking, verifyBooking, extendBooking, verifyExtension, getAnalytics, exportBookings, cancelBooking, checkAvailability, getStaffHistory, processExitPayment, confirmExitPayment } = require('../controllers/bookingController');
const { createOrder, verifyPayment } = require('../controllers/paymentController');

const router = express.Router();

router.route('/analytics').get(protect, admin, getAnalytics);
router.route('/export').get(protect, admin, exportBookings);
router.route('/create-order').post(protect, createOrder);
router.route('/verify-payment').post(protect, verifyPayment);
router.route('/extend').post(protect, extendBooking);
router.route('/verify-extension').post(protect, verifyExtension);
router.route('/cancel').post(protect, cancelBooking);
router.route('/check-availability').post(protect, checkAvailability);

router.route('/').post(protect, createBooking);
router.route('/mybookings').get(protect, getMyBookings);
router.route('/verify').post(protect, staff, verifyBooking);
router.route('/process-exit').post(protect, staff, processExitPayment);
router.route('/confirm-exit-payment').post(protect, confirmExitPayment);
router.route('/staff/history').get(protect, staff, getStaffHistory);
router.route('/:id').get(protect, getBookingById);
router.route('/:id/pay').put(protect, payBooking);


module.exports = router;
