const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/User');
const ParkingSlot = require('./models/ParkingSlot');
const Booking = require('./models/Booking');
const crypto = require('crypto');

const connectDB = require('./config/db');

dotenv.config();

const seedDatabase = async () => {
    try {
        await connectDB();
        console.log("Clearing old dummy users and bookings...");
        await User.deleteMany({ email: { $regex: /dummy\d+@test\.com/ } });
        // Instead of wiping ALL legitimate bookings, let's keep real ones and wipe only the seeded ones.
        // Or actually, let's wipe all 'Completed' bookings from the past 90 days to ensure a clean chart.
        await Booking.deleteMany({ qrCode: { $regex: /^SEED_QR/ } });

        console.log("Fetching/Seeding Parking Slots...");
        let slots = await ParkingSlot.find();
        
        let carSlots = slots.filter(s => s.type === 'Car');
        let bikeSlots = slots.filter(s => s.type === 'Bike');

        for(let i=1; i<=20; i++) {
            if (!carSlots.find(s => s.slotNumber === `A${i}`)) {
                const s = await ParkingSlot.create({ slotNumber: `A${i}`, type: 'Car', pricePerHour: 20 });
                carSlots.push(s);
            }
            if (!bikeSlots.find(s => s.slotNumber === `B${i}`)) {
                const s = await ParkingSlot.create({ slotNumber: `B${i}`, type: 'Bike', pricePerHour: 10 });
                bikeSlots.push(s);
            }
        }

        console.log("Creating 200 Dummy Users...");
        const newUsers = [];
        for (let i = 1; i <= 200; i++) {
            newUsers.push({
                name: `Dummy User ${i}`,
                email: `dummy${i}@test.com`,
                password: 'password123',
                isAdmin: false,
                isStaff: false
            });
        }
        
        const insertedUsers = await User.create(newUsers);

        console.log("Generating ~600 Bookings over 90 days...");
        const newBookings = [];
        const now = new Date();
        const bookingsToCreate = 600;

        for (let i = 0; i < bookingsToCreate; i++) {
            const randomUser = insertedUsers[Math.floor(Math.random() * insertedUsers.length)];
            
            const isCar = Math.random() > 0.5;
            const slotData = isCar ? carSlots[Math.floor(Math.random() * carSlots.length)] : bikeSlots[Math.floor(Math.random() * bikeSlots.length)];

            const daysAgo = Math.floor(Math.random() * 90);
            
            const isPeak = Math.random() < 0.7;
            let hour;
            if (isPeak) {
                // Peak hour 9 AM to 11 AM (hours 9 and 10)
                hour = Math.floor(Math.random() * 2) + 9; 
            } else {
                // Rest of the day 11 AM to 6 PM (hours 11 through 17)
                hour = Math.floor(Math.random() * 7) + 11; 
            }

            const minute = Math.floor(Math.random() * 60);
            
            // Create a fake date by subtracting days, exactly at this hour and minute
            const startTime = new Date(now.getTime() - (daysAgo * 24 * 60 * 60 * 1000));
            startTime.setHours(hour, minute, 0, 0);

            // Cap the duration so it doesn't wildly exceed 6 PM (hour 18)
            const maxDuration = Math.max(1, 18 - hour); // e.g. if started at 17:00, max is 1hr
            const durationCap = Math.min(5, maxDuration);
            const durationHours = Math.floor(Math.random() * durationCap) + 1; // 1 to 5
            const endTime = new Date(startTime.getTime() + (durationHours * 60 * 60 * 1000));
            
            // If the fake booking hasn't occurred in the past, skip it
            if (endTime > now) continue;

            const totalAmount = durationHours * slotData.pricePerHour;

            newBookings.push({
                user: randomUser._id,
                slot: slotData._id,
                startTime: startTime,
                endTime: endTime,
                totalAmount: totalAmount,
                status: 'Completed',
                paymentStatus: 'Paid',
                qrCode: `SEED_QR_${crypto.randomBytes(8).toString('hex')}`,
                createdAt: endTime // Fake the creation date for chart grouping!
            });
        }

        console.log(`Inserting ${newBookings.length} bookings...`);
        // Use insertMany directly.
        await Booking.insertMany(newBookings);

        console.log("Data successfully seeded!");
        process.exit();
    } catch (error) {
        console.error("Seeding error:", error);
        process.exit(1);
    }
}

seedDatabase();
