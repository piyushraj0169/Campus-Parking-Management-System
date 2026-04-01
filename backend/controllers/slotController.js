const ParkingSlot = require('../models/ParkingSlot');
const ActivityLog = require('../models/ActivityLog');

// @desc    Get all slots
// @route   GET /api/slots
// @access  Public
const Booking = require('../models/Booking'); // Ensure Booking is imported

const getSlots = async (req, res) => {
    try {
        const slots = await ParkingSlot.find({});

        // Find bookings that are currently active or pending
        const now = new Date();
        const relevantBookings = await Booking.find({
            status: { $in: ['Booked', 'Active', 'Pending Extra Payment'] }
        }).populate('user', 'name email').populate('slot');

        const slotsWithStatus = slots.map(slot => {
            const slotBookings = relevantBookings.filter(b => b.slot && b.slot._id.toString() === slot._id.toString());
            
            // Current active/occupying booking
            const currentBooking = slotBookings.find(b => 
                b.status === 'Active' || 
                b.status === 'Pending Extra Payment' || 
                (b.status === 'Booked' && now >= new Date(b.startTime))
            );

            // Future upcoming booking
            const upcomingBooking = slotBookings.find(b => 
                b.status === 'Booked' && new Date(b.startTime) > now
            );
            
            return {
                ...slot.toObject(),
                isBooked: !!currentBooking,
                currentBooking: currentBooking ? {
                    _id: currentBooking._id,
                    user: currentBooking.user,
                    vehicleNumber: currentBooking.vehicleNumber,
                    startTime: currentBooking.startTime,
                    endTime: currentBooking.endTime,
                    status: currentBooking.status
                } : null,
                upcomingBooking: upcomingBooking ? {
                    _id: upcomingBooking._id,
                    user: upcomingBooking.user,
                    vehicleNumber: upcomingBooking.vehicleNumber,
                    startTime: upcomingBooking.startTime,
                    endTime: upcomingBooking.endTime,
                    status: upcomingBooking.status
                } : null
            };
        });

        res.json(slotsWithStatus);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Create a slot
// @route   POST /api/slots
// @access  Private/Admin
const createSlot = async (req, res) => {
    const { slotNumber, type, pricePerHour } = req.body;

    try {
        const slotExists = await ParkingSlot.findOne({ slotNumber });
        if (slotExists) {
            return res.status(400).json({ message: 'Slot already exists' });
        }

        const slot = await ParkingSlot.create({
            slotNumber,
            type,
            pricePerHour
        });

        // Log Activity
        await ActivityLog.create({
            admin: req.user._id,
            action: 'CREATE_SLOT',
            target: `Slot ${slot.slotNumber}`,
            details: `Created ${type} slot at ₹${pricePerHour}/hr`
        });

        req.io.emit('slotUpdate', { type: 'create', slot });

        res.status(201).json(slot);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update slot (price, type, status, disable)
// @route   PUT /api/slots/:id
// @access  Private/Admin
const updateSlot = async (req, res) => {
    try {
        const slot = await ParkingSlot.findById(req.params.id);

        if (slot) {
            slot.slotNumber = req.body.slotNumber || slot.slotNumber;
            slot.type = req.body.type || slot.type;
            slot.pricePerHour = req.body.pricePerHour || slot.pricePerHour;
            if (req.body.isDisabled !== undefined) slot.isDisabled = req.body.isDisabled;

            // Should not update isOccupied manually usually, but keeping logic just in case
            if (req.body.isOccupied !== undefined) slot.isOccupied = req.body.isOccupied;

            const updatedSlot = await slot.save();

            // Log Activity
            await ActivityLog.create({
                admin: req.user._id,
                action: 'UPDATE_SLOT',
                target: `Slot ${updatedSlot.slotNumber}`,
                details: `Updated info. Disabled: ${slot.isDisabled}, Price: ${slot.pricePerHour}`
            });

            req.io.emit('slotUpdate', { type: 'update', slot: updatedSlot });
            res.json(updatedSlot);
        } else {
            res.status(404).json({ message: 'Slot not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Delete a slot
// @route   DELETE /api/slots/:id
// @access  Private/Admin
const deleteSlot = async (req, res) => {
    try {
        const slot = await ParkingSlot.findById(req.params.id);

        if (slot) {
            await slot.deleteOne();
            req.io.emit('slotUpdate', { type: 'delete', id: req.params.id });
            res.json({ message: 'Slot removed' });
        } else {
            res.status(404).json({ message: 'Slot not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Lock a slot for booking
// @route   POST /api/slots/:id/lock
// @access  Private
const lockSlot = async (req, res) => {
    try {
        const slot = await ParkingSlot.findById(req.params.id);

        if (!slot) {
            return res.status(404).json({ message: 'Slot not found' });
        }

        if (slot.isOccupied) {
            return res.status(400).json({ message: 'Slot is already occupied' });
        }

        if (slot.isDisabled) {
            return res.status(400).json({ message: 'Slot is disabled' });
        }

        // Check if locked by someone else
        if (slot.lockedBy && slot.lockedBy.toString() !== req.user._id.toString() && slot.lockExpiresAt > new Date()) {
            return res.status(400).json({ message: 'Slot is temporarily locked by another user' });
        }

        // Lock the slot
        slot.lockedBy = req.user._id;
        slot.lockExpiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
        await slot.save();

        req.io.emit('slotUpdate', { type: 'lock', slot });

        res.json({ message: 'Slot locked', expiresAt: slot.lockExpiresAt });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Release a lock
// @route   POST /api/slots/:id/release
// @access  Private
const releaseSlot = async (req, res) => {
    try {
        const slot = await ParkingSlot.findById(req.params.id);

        if (!slot) {
            return res.status(404).json({ message: 'Slot not found' });
        }

        // Only allow user who locked it to release it (or admin)
        if (slot.lockedBy && slot.lockedBy.toString() !== req.user._id.toString() && !req.user.isAdmin) {
            return res.status(403).json({ message: 'Not authorized to release this lock' });
        }

        slot.lockedBy = null;
        slot.lockExpiresAt = null;
        await slot.save();

        req.io.emit('slotUpdate', { type: 'release', slot });

        res.json({ message: 'Slot lock released' });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Force release a slot (Staff/Admin only)
// @route   POST /api/slots/:id/force-release
// @access  Private/Staff
const forceRelease = async (req, res) => {
    try {
        const slot = await ParkingSlot.findById(req.params.id);
        if (!slot) return res.status(404).json({ message: 'Slot not found' });

        slot.isOccupied = false;
        slot.lockedBy = null;
        slot.lockExpiresAt = null;
        await slot.save();

        // Also mark any logically active bookings for this slot as Completed (Forcefully)
        await Booking.updateMany(
            { 
                slot: slot._id, 
                $or: [
                    { status: { $in: ['Active', 'Pending Extra Payment'] } },
                    { status: 'Booked', startTime: { $lte: new Date() } }
                ]
            },
            { status: 'Completed', exitTime: new Date() }
        );

        // Log Activity
        await ActivityLog.create({
            admin: req.user._id,
            action: 'FORCE_RELEASE',
            target: `Slot ${slot.slotNumber}`,
            details: 'Staff manually released the slot'
        });

        req.io.emit('slotUpdate', { type: 'update', slot });
        res.json({ message: 'Slot force-released successfully', slot });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = { getSlots, createSlot, updateSlot, deleteSlot, lockSlot, releaseSlot, forceRelease };
