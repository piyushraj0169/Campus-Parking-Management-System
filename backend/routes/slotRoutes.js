const express = require('express');
const { getSlots, createSlot, updateSlot, deleteSlot } = require('../controllers/slotController');
const { protect, admin } = require('../middleware/authMiddleware');

const router = express.Router();

// Slot management
router.route('/').get(getSlots).post(protect, admin, createSlot);
router.route('/:id').put(protect, admin, updateSlot).delete(protect, admin, deleteSlot);

// Locking mechanism (User accessible)
const { lockSlot, releaseSlot, forceRelease } = require('../controllers/slotController');
const { staff } = require('../middleware/authMiddleware');

router.route('/:id/lock').post(protect, lockSlot);
router.route('/:id/release').post(protect, releaseSlot);
router.route('/:id/force-release').post(protect, staff, forceRelease);

module.exports = router;
