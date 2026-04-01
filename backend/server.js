const express = require('express');
const dotenv = require('dotenv');
dotenv.config();
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const connectDB = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const slotRoutes = require('./routes/slotRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const chatRoutes = require('./routes/chatRoutes');


connectDB();

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: "*", // Allow all for dev
        methods: ["GET", "POST"]
    }
});

const allowedOrigins = [
    'https://campusparkingcgc.vercel.app',
    'http://localhost:5173',
    'http://localhost:3000',
];

app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (mobile apps, curl, Postman)
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes(origin)) {
            return callback(null, true);
        }
        return callback(new Error('CORS: Origin not allowed'), false);
    },
    credentials: true,
}));
app.use(express.json());

// Make io accessible to our router
app.use((req, res, next) => {
    req.io = io;
    next();
});

app.use('/api/users', authRoutes);
app.use('/api/slots', slotRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/chat', chatRoutes);

app.get('/', (req, res) => {
    res.send('API is running...');
});

const PORT = process.env.PORT || 5000;

// Background Job: Auto Release Slots
const checkExpiredBookings = async (io) => {
    try {
        const now = new Date();
        const Booking = require('./models/Booking');
        const ParkingSlot = require('./models/ParkingSlot');

        // Find Booked (no-show) bookings past their end time.
        // We delay this to 24 hours after endTime to allow staff to 'Verify Exit'
        // even if they forgot to 'Verify Entry' (which leaves the booking in 'Booked' state).
        const gracePeriod = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const expiredBookings = await Booking.find({
            status: 'Booked',
            endTime: { $lt: gracePeriod }
        }).populate('slot');

        for (const booking of expiredBookings) {
            booking.status = 'Completed';
            await booking.save();

            if (booking.slot) {
                // NOTE: We do NOT set isOccupied = false here!
                console.log(`Auto-completed no-show booking ${booking._id} for slot ${booking.slot.slotNumber}`);
                io.emit('slotUpdate', { type: 'update', slot: booking.slot });
            }
        }

        // Find ACTIVE bookings that are past their end time (Overstaying)
        const overstayingBookings = await Booking.find({
            status: 'Active',
            endTime: { $lt: now }
        }).populate('user');

        for (const booking of overstayingBookings) {
            // Emit alert to the specific user via socket (if they are online)
            io.emit('overstayAlert', {
                bookingId: booking._id,
                userId: booking.user?._id,
                message: `Alert: Your parking for slot ${booking.slotNumber || ''} has expired. Extra charges are accruing.`
            });
        }
    } catch (error) {
        console.error('Auto Release Error:', error);
    }
};

// Background Job: Auto Release Locks
const checkExpiredLocks = async (io) => {
    try {
        const ParkingSlot = require('./models/ParkingSlot');
        const now = new Date();

        const expiredLocks = await ParkingSlot.find({
            lockedBy: { $ne: null },
            lockExpiresAt: { $lt: now }
        });

        for (const slot of expiredLocks) {
            slot.lockedBy = null;
            slot.lockExpiresAt = null;
            await slot.save();
            io.emit('slotUpdate', { type: 'release', slot });
            console.log(`Auto-released lock for slot ${slot.slotNumber}`);
        }
    } catch (error) {
        console.error('Auto Lock Release Error:', error);
    }
};

setInterval(() => {
    checkExpiredBookings(io);
    checkExpiredLocks(io);
}, 60000); // Check every minute

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
