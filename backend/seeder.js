const mongoose = require('mongoose');
const dotenv = require('dotenv');
// const colors = require('colors');
const users = require('./data/users');
const slots = require('./data/slots');
const User = require('./models/User');
const ParkingSlot = require('./models/ParkingSlot');
const connectDB = require('./config/db');

dotenv.config();

connectDB();

const importData = async () => {
    try {
        await User.deleteMany();
        await ParkingSlot.deleteMany();

        // await User.insertMany(users); // insertMany doesn't trigger pre-save hooks
        const createdUsers = [];
        for (const user of users) {
            const newUser = await User.create(user);
            createdUsers.push(newUser);
        }

        await ParkingSlot.insertMany(slots);

        const adminUser = createdUsers[0]._id;

        console.log('Data Imported!');
        process.exit();
    } catch (error) {
        console.error(`${error}`);
        process.exit(1);
    }
};

const destroyData = async () => {
    try {
        await User.deleteMany();
        await ParkingSlot.deleteMany();

        console.log('Data Destroyed!');
        process.exit();
    } catch (error) {
        console.error(`${error}`);
        process.exit(1);
    }
};

const importSlots = async () => {
    try {
        await ParkingSlot.deleteMany();
        await ParkingSlot.insertMany(slots);
        console.log('Slots Imported!');
        process.exit();
    } catch (error) {
        console.error(`${error}`);
        process.exit(1);
    }
}

if (process.argv[2] === '-d') {
    destroyData();
} else if (process.argv[2] === '-s') {
    importSlots();
} else {
    importData();
}
