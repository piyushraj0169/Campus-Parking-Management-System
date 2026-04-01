const Booking = require('../models/Booking');
const ParkingSlot = require('../models/ParkingSlot');
const crypto = require('crypto');
const { sendInvoiceEmail } = require('../utils/emailService');

// @desc    Create new booking
// @route   POST /api/bookings
// @access  Private
const createBooking = async (req, res) => {
    const { slotId, startTime, endTime, totalAmount, paymentId, orderId } = req.body;

    try {
        console.log("Create Booking Request:", req.body);
        console.log("User:", req.user?._id);

        const slot = await ParkingSlot.findById(slotId);

        if (!slot) {
            return res.status(404).json({ message: 'Slot not found' });
        }

        if (req.user.status === 'Blocked') {
            return res.status(403).json({ message: 'Your account is blocked. You cannot make bookings.' });
        }

        // Check availability (simplistic check for now, ideally check overlaps)
        // For this MVP, we might assume real-time status reflects availability
        // But for booking, we should ideally check if *that time* is free.
        // Let's stick to a simple check: isOccupied is current status,
        // but bookings are future.
        // We will query if any booking overlaps.

        // --- LOCK CHECK ---
        // If slot is locked by SOMEONE ELSE, reject.
        // If locked by CURRENT USER, allow (and we will clear it after booking).
        if (slot.lockedBy && slot.lockedBy.toString() !== req.user._id.toString() && slot.lockExpiresAt > new Date()) {
            return res.status(400).json({ message: 'Slot is reserved by another user' });
        }

        const start = new Date(startTime);
        const end = new Date(endTime);
        const now = new Date();

        // Allow booking to start up to 5 minutes in the past (to account for clock diffs and form filling)
        const fiveMinutesAgo = new Date(now.getTime() - 5 * 60000);

        if (start < fiveMinutesAgo) {
            return res.status(400).json({ message: 'Cannot book in the past' });
        }

        if (end <= start) {
            return res.status(400).json({ message: 'End time must be after start time' });
        }

        const overlappingBooking = await Booking.findOne({
            slot: slotId,
            status: { $in: ['Active', 'Booked'] }, // Check Booked status too
            $or: [
                { startTime: { $lt: end }, endTime: { $gt: start } }
            ]
        });

        if (overlappingBooking) {
            return res.status(400).json({ message: 'Slot is already booked for this time' });
        }

        // --- PHYSICAL OCCUPANCY CHECK ---
        // If the new booking starts 'now' (or within 30 mins) and slot is physically occupied, reject.
        const bufferTime = new Date(now.getTime() + 30 * 60000);
        if (slot.isOccupied && start < bufferTime) {
            return res.status(400).json({ message: 'Slot is still occupied by a previous user' });
        }

        const qrCode = crypto.randomBytes(16).toString('hex');

        // Determine status based on start time
        // If booking is for future, status is 'Booked'
        // If booking is effectively now, still 'Booked' until they Enter/Verify? 
        // Let's stick to 'Booked' as initial state for all.
        // Entry validation will switch it to 'Active'.

        const booking = await Booking.create({
            user: req.user._id,
            slot: slotId,
            startTime,
            endTime,
            totalAmount,
            qrCode,
            paymentId,
            orderId,
            paymentStatus: paymentId ? 'Paid' : 'Pending',
            status: 'Booked'
        });

        // Clear lock if it was locked by this user
        if (slot.lockedBy && slot.lockedBy.toString() === req.user._id.toString()) {
            slot.lockedBy = null;
            slot.lockExpiresAt = null;
            await slot.save();
            // Emit update to show it's no longer locked (but now Booked/Occupied depending on logic)
            req.io.emit('slotUpdate', { type: 'release', slot });
        }

        // Send Invoice Email (Async - don't block response)
        const bookingForEmail = { ...booking.toObject(), slot: slot };
        sendInvoiceEmail(bookingForEmail, req.user, { paymentId: booking.paymentId }).catch(err => console.error("Email failed:", err));

        res.status(201).json(booking);
    } catch (error) {
        console.error("Create Booking Error:", error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get user bookings
// @route   GET /api/bookings/mybookings
// @access  Private
const getMyBookings = async (req, res) => {
    try {
        const bookings = await Booking.find({ user: req.user._id }).sort({ createdAt: -1 }).populate('slot');
        res.json(bookings);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get booking by ID
// @route   GET /api/bookings/:id
// @access  Private
const getBookingById = async (req, res) => {
    try {
        const booking = await Booking.findById(req.params.id).populate('user', 'name email').populate('slot');

        if (booking) {
            res.json(booking);
        } else {
            res.status(404).json({ message: 'Booking not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Pay for booking
// @route   PUT /api/bookings/:id/pay
// @access  Private
const payBooking = async (req, res) => {
    try {
        const booking = await Booking.findById(req.params.id);

        if (booking) {
            booking.paymentStatus = 'Paid';
            const updatedBooking = await booking.save();
            res.json(updatedBooking);
        } else {
            res.status(404).json({ message: 'Booking not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Verify QR Code / Entry / Exit
// @route   POST /api/bookings/verify
// @access  Private/Admin
const verifyBooking = async (req, res) => {
    const { qrCode, action } = req.body; // action: 'entry' or 'exit'

    try {
        const booking = await Booking.findOne({ qrCode })
            .populate('slot')
            .populate('user', 'name email phoneNumber vehicles');

        if (!booking) {
            return res.status(404).json({ message: 'Invalid QR Code' });
        }

        const io = req.io;

        // --- OVERSTAY CALCULATION ---
        const now = new Date();
        const bookedEndTime = new Date(booking.endTime);
        let extraAmount = 0;
        let extraTimeHours = 0;
        let isOverstayed = false;

        // Calculate overstay correctly
        if ((booking.status === 'Active' || booking.status === 'Pending Extra Payment' || booking.status === 'Booked') && now > bookedEndTime) {
            const diffMs = now - bookedEndTime;
            extraTimeHours = Math.ceil(diffMs / (1000 * 60 * 60)); // round up to whole hours
            extraAmount = extraTimeHours * booking.slot.pricePerHour;
            isOverstayed = extraAmount > 0;
        }

        if (action === 'entry') {
            if (booking.status !== 'Active' && booking.status !== 'Booked') {
                return res.status(400).json({ message: `Booking is ${booking.status}` });
            }

            if (!booking.entryTime) {
                booking.status = 'Active';
                booking.entryTime = now;
                booking.verifiedBy = req.user._id;
                booking.verificationTime = now;
                await booking.save();
            }

            if (!booking.slot.isOccupied) {
                booking.slot.isOccupied = true;
                await booking.slot.save();
                io.emit('slotUpdate', { type: 'update', slot: booking.slot });
            }

            res.json({ message: 'Entry Verified', booking });

        } else if (action === 'exit') {
            if (booking.status !== 'Active' && booking.status !== 'Pending Extra Payment' && booking.status !== 'Booked') {
                return res.status(400).json({ message: `Booking is already ${booking.status}` });
            }

            const baseAmountDue = booking.paymentStatus === 'Pending' ? booking.totalAmount : 0;
            const totalDue = baseAmountDue + extraAmount;

            if (totalDue > 0 && (!booking.overstayPaid || booking.paymentStatus === 'Pending')) {
                // Save the calculated extra amounts to the booking for reference
                booking.extraAmount = extraAmount;
                booking.extraTime = extraTimeHours;
                // Do not set status to 'Pending Extra Payment' yet. Let process-exit do that if 'Online' is chosen.
                await booking.save();

                return res.json({
                    message: isOverstayed ? `Overstay detected. Total amount due: ₹${totalDue}` : `Payment required. Base amount due: ₹${totalDue}`,
                    requiresExtraPayment: true,
                    totalDue,
                    baseAmountDue,
                    extraAmount,
                    extraTimeHours,
                    bookedEndTime: booking.endTime,
                    actualExitTime: now,
                    pricePerHour: booking.slot.pricePerHour,
                    booking
                });
            }

            // Normal Completion (no overstay or already paid)
            booking.status = 'Completed';
            booking.paymentStatus = 'Paid';
            booking.exitTime = now;
            booking.verifiedBy = req.user._id;
            booking.verificationTime = now;
            await booking.save();

            // Direct update to slot for maximum reliability
            let exitSlotInfo = null;
            if (booking.slot) {
                console.log(`RELEASING SLOT: ${booking.slot.slotNumber || booking.slot._id}`);
                const updatedSlot = await ParkingSlot.findByIdAndUpdate(
                    booking.slot._id, 
                    { isOccupied: false }, 
                    { new: true }
                );
                console.log(`SLOT RELEASED: ${updatedSlot?.slotNumber} isOccupied=${updatedSlot?.isOccupied}`);
                exitSlotInfo = updatedSlot;
                io.emit('slotUpdate', { type: 'update', slot: updatedSlot });
            }

            // Notify staff dashboard
            io.emit('exitPaymentSuccess', { 
                bookingId: booking._id.toString(), 
                message: 'Exit verified. Slot released.' 
            });

            res.json({ 
                message: 'Exit Verified & Slot Released', 
                booking,
                exitSummary: {
                    slotNumber: booking.slot?.slotNumber,
                    slotType: booking.slot?.type,
                    userName: booking.user?.name,
                    userPhone: booking.user?.phoneNumber,
                    startTime: booking.startTime,
                    bookedEndTime: booking.endTime,
                    actualExitTime: now,
                    totalAmount: booking.totalAmount,
                    extraAmount: booking.extraAmount || 0,
                    wasOverstay: booking.overstayPaid
                }
            });
        } else {
            // Standard check action - still return overstay info if exists
            res.json({ 
                message: isOverstayed ? 'Overstay detected' : 'Booking Details found', 
                booking,
                requiresExtraPayment: isOverstayed && !booking.overstayPaid,
                extraAmount: isOverstayed ? extraAmount : 0,
                extraTimeHours: isOverstayed ? extraTimeHours : 0
            });
        }

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Extend Booking
// @route   POST /api/bookings/extend
// @access  Private
const extendBooking = async (req, res) => {
    const { bookingId, extraHours } = req.body;

    try {
        const booking = await Booking.findById(bookingId).populate('slot');
        if (!booking) return res.status(404).json({ message: 'Booking not found' });

        if (booking.status === 'Completed' || booking.status === 'Cancelled') {
            return res.status(400).json({ message: 'Cannot extend completed booking' });
        }

        const currentEndTime = new Date(booking.endTime);
        const newEndTime = new Date(currentEndTime.getTime() + extraHours * 60 * 60 * 1000);

        // Check for overlaps with NEW end time
        const overlap = await Booking.findOne({
            slot: booking.slot._id,
            _id: { $ne: booking._id },
            status: { $ne: 'Cancelled' },
            startTime: { $lt: newEndTime },
            endTime: { $gt: currentEndTime }
        });

        if (overlap) {
            return res.status(400).json({ message: 'Slot unavailable for extension period' });
        }

        booking.endTime = newEndTime;
        booking.totalAmount += extraHours * booking.slot.pricePerHour;
        await booking.save();

        res.json(booking);

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get Analytics
// @route   GET /api/bookings/analytics
// @access  Private/Admin
const getAnalytics = async (req, res) => {
    try {
        const { range } = req.query;
        const now = new Date();
        let startDate = new Date();

        // Calculate Start Date based on range
        if (range === 'today') {
            startDate.setHours(0, 0, 0, 0); // Start of today
        } else if (range === 'week') {
            startDate.setDate(now.getDate() - 7);
        } else if (range === 'month') {
            startDate.setDate(now.getDate() - 30);
        } else if (range === 'quarter') {
            startDate.setDate(now.getDate() - 90);
        } else if (range === 'half') {
            startDate.setDate(now.getDate() - 180);
        } else if (range === 'year') {
            startDate.setDate(now.getDate() - 365);
        } else {
            startDate.setDate(now.getDate() - 7); // Default to week
        }

        // --- 1. Key Metrics ---
        // Active Bookings: 'Active' (checked-in) OR 'Booked' but within current time window
        const activeBookings = await Booking.countDocuments({
            $or: [
                { status: 'Active' },
                {
                    status: 'Booked',
                    startTime: { $lte: new Date() },
                    endTime: { $gt: new Date() }
                }
            ]
        });

        // Total Bookings in Range
        const totalBookings = await Booking.countDocuments({
            createdAt: { $gte: startDate }
        });

        // Completed Bookings in Range
        const completedBookings = await Booking.countDocuments({
            status: 'Completed',
            createdAt: { $gte: startDate }
        });

        // Total Revenue in Range (exclude Cancelled)
        const revenueAgg = await Booking.aggregate([
            {
                $match: {
                    createdAt: { $gte: startDate },
                    status: { $ne: 'Cancelled' }
                }
            },
            {
                $group: {
                    _id: null,
                    total: { $sum: "$totalAmount" }
                }
            }
        ]);
        const totalRevenue = revenueAgg[0]?.total || 0;

        // Occupancy Rate
        const totalSlots = await ParkingSlot.countDocuments({ isDisabled: false });
        const occupancyRate = totalSlots > 0 ? ((activeBookings / totalSlots) * 100).toFixed(1) : 0;


        // --- 2. Charts Data ---

        // Daily Revenue Trend
        // We need to group by Day/Month depending on range, but for specific "Today" range it might be by Hour?
        // Let's stick to Daily for Week/Month, and maybe Hourly for Today?
        // For simplicity in MVP, let's just do Daily for all, or if 'today', show hourly? 
        // The dashboard chart is a Line chart.
        let dateFormat = "%Y-%m-%d";
        if (range === 'today') {
            dateFormat = "%H:00"; // Group by hour for today
        } else if (range === 'half' || range === 'year') {
            dateFormat = "%Y-%m"; // Group by month for longer trends
        }

        const dailyRevenue = await Booking.aggregate([
            {
                $match: {
                    createdAt: { $gte: startDate },
                    status: { $ne: 'Cancelled' }
                }
            },
            {
                $group: {
                    _id: { $dateToString: { format: dateFormat, date: "$createdAt", timezone: "+05:30" } },
                    dailyTotal: { $sum: "$totalAmount" }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        // Vehicle Type Distribution
        const vehicleTypeStats = await Booking.aggregate([
            {
                $match: { createdAt: { $gte: startDate } }
            },
            {
                $lookup: {
                    from: "parkingslots",
                    localField: "slot",
                    foreignField: "_id",
                    as: "slotDetails"
                }
            },
            { $unwind: "$slotDetails" },
            {
                $group: {
                    _id: "$slotDetails.type",
                    count: { $sum: 1 }
                }
            }
        ]);

        // Peak Hours (Heatmap) - Based on Start Time Hour
        const peakHours = await Booking.aggregate([
            {
                $match: { createdAt: { $gte: startDate } }
            },
            {
                $project: {
                    hour: { $hour: { date: "$startTime", timezone: "+05:30" } }
                }
            },
            {
                $group: {
                    _id: "$hour",
                    count: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        // Most Used Slots
        const slotUsage = await Booking.aggregate([
            {
                $match: { createdAt: { $gte: startDate } }
            },
            {
                $group: {
                    _id: "$slot",
                    count: { $sum: 1 }
                }
            },
            { $sort: { count: -1 } },
            { $limit: 5 },
            {
                $lookup: {
                    from: "parkingslots",
                    localField: "_id",
                    foreignField: "_id",
                    as: "slotDetails"
                }
            },
            { $unwind: "$slotDetails" },
            {
                $project: {
                    slotNumber: "$slotDetails.slotNumber",
                    count: 1
                }
            }
        ]);

        // Recent Transactions
        const recentTransactions = await Booking.find({ createdAt: { $gte: startDate } })
            .sort({ createdAt: -1 })
            .limit(5)
            .populate('user', 'name')
            .populate('slot', 'slotNumber type');

        res.json({
            totalBookings,
            activeBookings,
            completedBookings,
            totalRevenue,
            occupancyRate,
            dailyRevenue,
            vehicleTypeStats,
            peakHours,
            slotUsage,
            recentTransactions
        });

    } catch (error) {
        console.error("Analytics Error:", error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Export Bookings as CSV
// @route   GET /api/bookings/export
// @access  Private/Admin
const exportBookings = async (req, res) => {
    try {
        const bookings = await Booking.find().populate('user', 'name email').populate('slot', 'slotNumber type');

        // Simple CSV construction
        let csv = 'Booking ID,User,Slot,Type,Start Time,End Time,Total Amount,Status\n';
        bookings.forEach(b => {
            csv += `${b._id},${b.user?.name || 'N/A'},${b.slot?.slotNumber || 'N/A'},${b.slot?.type || 'N/A'},${new Date(b.startTime).toISOString()},${new Date(b.endTime).toISOString()},${b.totalAmount},${b.status}\n`;
        });

        res.header('Content-Type', 'text/csv');
        res.attachment('bookings_report.csv');
        res.send(csv);

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Cancel Booking
// @route   POST /api/bookings/cancel
// @access  Private
const cancelBooking = async (req, res) => {
    const { bookingId } = req.body;

    try {
        const booking = await Booking.findById(bookingId).populate('slot');
        if (!booking) return res.status(404).json({ message: 'Booking not found' });

        if (booking.status === 'Completed' || booking.status === 'Cancelled') {
            return res.status(400).json({ message: 'Booking is already processed' });
        }

        const now = new Date();
        const start = new Date(booking.startTime);

        // Refund Logic: Full refund if cancelled before start time
        // If cancelled after start, no refund (or partial - simplistic rule for now: only allow before start)
        if (now > start) {
            return res.status(400).json({ message: 'Cannot cancel ongoing/past booking' });
        }

        booking.status = 'Cancelled';
        booking.paymentStatus = 'Refunded'; // Simulating refund
        await booking.save();

        // Free the slot if it was somehow marked occupied (though usually occupied only on entry)
        if (booking.slot.isOccupied) {
            // Only release if WE were the ones occupying it? 
            // Ideally, slot is only occupied when user ENTERS. 
            // If they cancel beforehand, slot shouldn't be occupied yet.
            // But valid check nonetheless.
        }

        res.json({ message: 'Booking cancelled successfully', booking });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Check if slot is available
// @route   POST /api/bookings/check-availability
// @access  Private
const checkAvailability = async (req, res) => {
    const { slotId, startTime, endTime } = req.body;

    try {
        const start = new Date(startTime);
        const end = new Date(endTime);
        const now = new Date();

        if (end <= start) {
            return res.status(400).json({ message: 'End time must be after start time' });
        }

        const overlappingBooking = await Booking.findOne({
            slot: slotId,
            status: { $in: ['Active', 'Booked'] },
            $or: [
                { startTime: { $lt: end }, endTime: { $gt: start } }
            ]
        });

        if (overlappingBooking) {
            return res.json({ available: false, message: 'Slot is already booked for this time' });
        }

        // PHYSICAL OCCUPANCY CHECK
        const slot = await ParkingSlot.findById(slotId);
        const bufferTime = new Date(now.getTime() + 30 * 60000);
        if (slot && slot.isOccupied && start < bufferTime) {
            return res.json({ available: false, message: 'Slot is currently occupied' });
        }

        res.json({ available: true, message: 'Slot is available' });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get staff verification history
// @route   GET /api/bookings/staff/history
// @access  Private/Staff
const getStaffHistory = async (req, res) => {
    try {
        const history = await Booking.find({ verifiedBy: req.user._id })
            .populate('user', 'name phoneNumber')
            .populate('slot', 'slotNumber type')
            .select('user slot startTime endTime exitTime extraAmount extraTime status verificationTime overstayPaid')
            .sort({ verificationTime: -1 })
            .limit(20);
        res.json(history);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Process Overstay Exit Payment
// @route   POST /api/bookings/process-exit
// @access  Private/Staff
const processExitPayment = async (req, res) => {
    const { bookingId, paymentMethod } = req.body;

    try {
        const booking = await Booking.findById(bookingId).populate('slot');
        if (!booking) return res.status(404).json({ message: 'Booking not found' });

        if (booking.status !== 'Active' && booking.status !== 'Pending Extra Payment' && booking.status !== 'Booked') {
            return res.status(400).json({ message: 'Booking is not eligible for exit payment' });
        }

        // --- SERVER-SIDE overstay recalculation (prevents client tampering) ---
        const now = new Date();
        const bookedEndTime = new Date(booking.endTime);
        let calculatedExtraHours = 0;
        let calculatedExtraAmount = 0;

        if (now > bookedEndTime) {
            const diffMs = now - bookedEndTime;
            calculatedExtraHours = Math.ceil(diffMs / (1000 * 60 * 60)); // round up
            calculatedExtraAmount = calculatedExtraHours * (booking.slot?.pricePerHour || 50);
        }

        // Persist the server-calculated values
        booking.extraAmount = calculatedExtraAmount;
        booking.extraTime = calculatedExtraHours;

        const baseAmountDue = booking.paymentStatus === 'Pending' ? booking.totalAmount : 0;
        const totalDue = baseAmountDue + calculatedExtraAmount;

        const io = req.io;

        if (paymentMethod === 'Cash') {
            booking.status = 'Completed';
            booking.overstayPaid = true;
            booking.paymentStatus = 'Paid';
            booking.exitTime = now;
            booking.verifiedBy = req.user._id;
            booking.verificationTime = now;
            await booking.save();

            // Release the slot
            let updatedSlot = null;
            if (booking.slot) {
                console.log(`RELEASING SLOT (CASH): ${booking.slot.slotNumber || booking.slot._id}`);
                updatedSlot = await ParkingSlot.findByIdAndUpdate(
                    booking.slot._id, 
                    { isOccupied: false }, 
                    { new: true }
                );
                console.log(`SLOT RELEASED (CASH): ${updatedSlot?.slotNumber} isOccupied=${updatedSlot?.isOccupied}`);
                io.emit('slotUpdate', { type: 'update', slot: updatedSlot });
            }

            // Notify dashboard that exit is complete
            io.emit('exitPaymentSuccess', {
                bookingId: booking._id.toString(),
                message: `Cash collected (₹${totalDue}). Slot released.`
            });

            return res.json({ 
                message: 'Cash payment collected & Slot Released', 
                booking,
                exitSummary: {
                    slotNumber: booking.slot?.slotNumber,
                    slotType: booking.slot?.type,
                    startTime: booking.startTime,
                    bookedEndTime: booking.endTime,
                    actualExitTime: now,
                    extraTimeHours: calculatedExtraHours,
                    extraAmount: calculatedExtraAmount,
                    totalAmount: booking.totalAmount,
                    pricePerHour: booking.slot?.pricePerHour
                }
            });

        } else if (paymentMethod === 'Online') {
            booking.status = 'Pending Extra Payment';
            await booking.save();

            // Send payment notification to the user
            io.emit('paymentRequest', {
                userId: booking.user.toString(),
                bookingId: booking._id,
                extraAmount: totalDue, // Use totalDue for Razorpay
                message: `Please pay ₹${totalDue} to complete your parking session.`
            });

            return res.json({ 
                message: 'Online payment request sent to user', 
                booking,
                totalDue,
                baseAmountDue,
                extraAmount: calculatedExtraAmount,
                extraTimeHours: calculatedExtraHours
            });
        } else {
            return res.status(400).json({ message: 'Invalid payment method' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Confirm Online Exit Payment
// @route   POST /api/bookings/confirm-exit-payment
// @access  Private
const confirmExitPayment = async (req, res) => {
    const { bookingId, razorpay_payment_id, razorpay_order_id, razorpay_signature } = req.body;

    try {
        const crypto = require('crypto');
        const expectedSignature = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
            .update(razorpay_order_id + "|" + razorpay_payment_id)
            .digest('hex');

        if (expectedSignature !== razorpay_signature) {
             return res.status(400).json({ message: 'Payment verification failed' });
        }

        const booking = await Booking.findById(bookingId).populate('slot');
        if (!booking || booking.status !== 'Pending Extra Payment') {
             return res.status(400).json({ message: 'Invalid booking state' });
        }

        booking.status = 'Completed';
        booking.overstayPaid = true;
        booking.paymentStatus = 'Paid';
        booking.exitTime = new Date();
        booking.verificationTime = new Date();
        await booking.save();

        // Direct update to slot
        if (booking.slot) {
            console.log(`RELEASING SLOT (ONLINE): ${booking.slot.slotNumber || booking.slot._id}`);
            const updatedSlot = await ParkingSlot.findByIdAndUpdate(
                booking.slot._id, 
                { isOccupied: false }, 
                { new: true }
            );
            console.log(`SLOT RELEASED (ONLINE): ${updatedSlot?.slotNumber} isOccupied=${updatedSlot?.isOccupied}`);
            req.io.emit('slotUpdate', { type: 'update', slot: updatedSlot });
        }
        
        const io = req.io;
        io.emit('exitPaymentSuccess', { bookingId: booking._id.toString(), message: 'User paid extra amount.' });

        res.json({ message: 'Exit payment successful', booking });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Verify Extension Payment
// @route   POST /api/bookings/verify-extension
// @access  Private
const verifyExtension = async (req, res) => {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, bookingId, extraHours } = req.body;

    try {
        const body = razorpay_order_id + "|" + razorpay_payment_id;
        const expectedSignature = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
            .update(body.toString())
            .digest('hex');

        if (expectedSignature !== razorpay_signature) {
            return res.status(400).json({ message: 'Payment verification failed' });
        }

        const booking = await Booking.findById(bookingId).populate('slot');
        if (!booking) return res.status(404).json({ message: 'Booking not found' });

        const currentEndTime = new Date(booking.endTime);
        const newEndTime = new Date(currentEndTime.getTime() + extraHours * 60 * 60 * 1000);

        booking.endTime = newEndTime;
        booking.totalAmount += extraHours * booking.slot.pricePerHour;
        booking.status = 'Active'; 
        await booking.save();

        res.json({ message: 'Extension successful', booking });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = { 
    createBooking, 
    getMyBookings, 
    getBookingById, 
    payBooking, 
    verifyBooking, 
    extendBooking, 
    verifyExtension,
    getAnalytics, 
    exportBookings, 
    cancelBooking, 
    checkAvailability, 
    getStaffHistory, 
    processExitPayment, 
    confirmExitPayment 
};
