const mongoose = require('mongoose');

const parkingSlotSchema = new mongoose.Schema({
    slotNumber: {
        type: String,
        required: true,
        unique: true
    },
    type: {
        type: String,
        required: true,
        enum: ['Car', 'Bike', 'Bus', 'Truck'],
        default: 'Car'
    },
    isOccupied: {
        type: Boolean,
        default: false
    },
    isDisabled: {
        type: Boolean,
        default: false
    },
    pricePerHour: {
        type: Number,
        required: true,
        default: 50
    },
    lockedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    lockExpiresAt: {
        type: Date,
        default: null
    }
}, {
    timestamps: true
});

const ParkingSlot = mongoose.model('ParkingSlot', parkingSlotSchema);

module.exports = ParkingSlot;
