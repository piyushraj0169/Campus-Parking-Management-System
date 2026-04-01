const express = require('express');
const {
    registerUser,
    authUser,
    getUserProfile,
    updateUserProfile,
    sendRegisterOTP,
    loginWithOTP,
    verifyLoginOTP,
    forgotPassword,
    resetPassword,
    getAllUsers,
    updateUserStatus,
    updateUser,
    deleteUser
} = require('../controllers/authController');
const { protect, admin } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/register', registerUser);
router.post('/register-otp', sendRegisterOTP);
router.post('/login', authUser);
router.post('/login-otp', loginWithOTP);
router.post('/login-verify', verifyLoginOTP);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

router.route('/profile').get(protect, getUserProfile).put(protect, updateUserProfile);

// Admin User Management Routes
router.route('/').get(protect, admin, getAllUsers);
router.route('/:id/status').put(protect, admin, updateUserStatus);
router.route('/:id').put(protect, admin, updateUser).delete(protect, admin, deleteUser);

module.exports = router;
