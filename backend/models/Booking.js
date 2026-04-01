const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User'
    },
    slot: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'ParkingSlot'
    },
    startTime: {
        type: Date,
        required: true
    },
    endTime: {
        type: Date,
        required: true
    },
    totalAmount: {
        type: Number,
        required: true
    },
    paymentStatus: {
        type: String,
        required: true,
        default: 'Pending',
        enum: ['Pending', 'Paid', 'Failed']
    },
    status: {
        type: String,
        required: true,
        default: 'Booked',
        enum: ['Booked', 'Active', 'Completed', 'Cancelled', 'Pending Extra Payment']
    },
    extraAmount: {
        type: Number,
        default: 0
    },
    extraTime: {
        type: Number, // in hours
        default: 0
    },
    overstayPaid: {
        type: Boolean,
        default: false
    },
    qrCode: {
        type: String,
        unique: true
    },
    paymentId: {
        type: String
    },
    orderId: {
        type: String
    },
    entryTime: {
        type: Date
    },
    exitTime: {
        type: Date
    },
    extendedFrom: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Booking'
    },
    verifiedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    verificationTime: {
        type: Date
    }
}, {
    timestamps: true
});

const Booking = mongoose.model('Booking', bookingSchema);

module.exports = Booking;
