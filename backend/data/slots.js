const slots = [];

// Zone A: Cars (20 slots)
for (let i = 1; i <= 20; i++) {
    slots.push({
        slotNumber: `A${i}`,
        type: 'Car',
        pricePerHour: 50,
        isOccupied: false
    });
}

// Zone B: Bikes (20 slots)
for (let i = 1; i <= 20; i++) {
    slots.push({
        slotNumber: `B${i}`,
        type: 'Bike',
        pricePerHour: 20,
        isOccupied: false
    });
}

module.exports = slots;
