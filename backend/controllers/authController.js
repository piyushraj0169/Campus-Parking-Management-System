
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const OTP = require('../models/OTP');
const Booking = require('../models/Booking');
const { sendOTPEmail, sendResetPasswordEmail } = require('../utils/emailService');
const crypto = require('crypto');

const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: '30d',
    });
};

const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

const sendRegisterOTP = async (req, res) => {
    const { name, email, phoneNumber } = req.body;
    try {
        if (!name || !email || !phoneNumber) {
            return res.status(400).json({ message: 'Please provide all fields' });
        }
        const userExists = await User.findOne({ email });
        if (userExists) {
            return res.status(400).json({ message: 'User already exists' });
        }
        const otp = generateOTP();
        await OTP.findOneAndUpdate(
            { email },
            { email, otp, createdAt: Date.now() },
            { upsert: true, new: true }
        );
        try {
            await sendOTPEmail(email, otp);
            res.status(200).json({ message: 'OTP sent to email' });
        } catch (emailError) {
            console.error("[AUTH_CONTROLLER_ERROR] Email fail:", emailError.message);
            res.status(500).json({ message: emailError.message });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Register a new user (Verify OTP)
// @route   POST /api/users/register
// @access  Public
const registerUser = async (req, res) => {
    const { name, email, password, phoneNumber, otp, isStaff, staffSecret } = req.body;

    try {
        if (!otp) {
            return res.status(400).json({ message: 'Please provide OTP' });
        }

        const otpRecord = await OTP.findOne({ email, otp });

        if (!otpRecord) {
            return res.status(400).json({ message: 'Invalid or expired OTP' });
        }

        const userExists = await User.findOne({ email });

        if (userExists) {
            return res.status(400).json({ message: 'User already exists' });
        }

        let userIsStaff = false;
        if (isStaff) {
            if (staffSecret === 'S0169') {
                userIsStaff = true;
            } else {
                return res.status(400).json({ message: 'Invalid Staff Secret Code' });
            }
        }

        const user = await User.create({
            name,
            email,
            password,
            phoneNumber,
            vehicles: [],
            isStaff: userIsStaff
        });

        if (user) {
            await OTP.deleteOne({ email });

            res.status(201).json({
                _id: user._id,
                name: user.name,
                email: user.email,
                phoneNumber: user.phoneNumber,
                vehicles: user.vehicles,
                isAdmin: user.isAdmin,
                isStaff: user.isStaff,
                token: generateToken(user._id),
            });
        } else {
            res.status(400).json({ message: 'Invalid user data' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const authUser = async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await User.findOne({ email });
        if (user && (await user.matchPassword(password))) {
            if (user.status === 'Blocked') {
                return res.status(403).json({ message: 'User is blocked by admin' });
            }
            res.json({
                _id: user._id,
                name: user.name,
                email: user.email,
                isAdmin: user.isAdmin,
                isStaff: user.isStaff,
                token: generateToken(user._id),
            });
        } else {
            res.status(401).json({ message: 'Invalid email or password' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getUserProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        if (user) {
            res.json({
                _id: user._id,
                name: user.name,
                email: user.email,
                phoneNumber: user.phoneNumber,
                vehicles: user.vehicles || [],
                isAdmin: user.isAdmin
            });
        } else {
            res.status(404).json({ message: 'User not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const updateUserProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        if (user) {
            if (req.body.phoneNumber !== undefined) {
                user.phoneNumber = req.body.phoneNumber;
            }
            if (req.body.vehicles) {
                user.vehicles = req.body.vehicles;
            }
            const updatedUser = await user.save();
            res.json({
                _id: updatedUser._id,
                name: updatedUser.name,
                email: updatedUser.email,
                phoneNumber: updatedUser.phoneNumber,
                vehicles: updatedUser.vehicles,
                isAdmin: updatedUser.isAdmin,
                isStaff: updatedUser.isStaff,
                token: generateToken(updatedUser._id)
            });
        } else {
            res.status(404).json({ message: 'User not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const loginWithOTP = async (req, res) => {
    const { email } = req.body;
    try {
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        if (user.status === 'Blocked') {
            return res.status(403).json({ message: 'User is blocked by admin' });
        }
        const otp = generateOTP();
        await OTP.findOneAndUpdate(
            { email },
            { email, otp, createdAt: Date.now() },
            { upsert: true, new: true }
        );
        try {
            await sendOTPEmail(email, otp);
            res.status(200).json({ message: 'OTP sent to email' });
        } catch (emailError) {
            console.error("[AUTH_CONTROLLER_ERROR] Login OTP fail:", emailError.message);
            res.status(500).json({ message: emailError.message });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const verifyLoginOTP = async (req, res) => {
    const { email, otp } = req.body;
    try {
        const otpRecord = await OTP.findOne({ email, otp });
        if (!otpRecord) {
            return res.status(400).json({ message: 'Invalid or expired OTP' });
        }
        const user = await User.findOne({ email });
        if (user) {
            await OTP.deleteOne({ email });
            res.json({
                _id: user._id,
                name: user.name,
                email: user.email,
                phoneNumber: user.phoneNumber,
                vehicles: user.vehicles,
                isAdmin: user.isAdmin,
                isStaff: user.isStaff,
                token: generateToken(user._id),
            });
        } else {
            res.status(404).json({ message: 'User not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const forgotPassword = async (req, res) => {
    const { email } = req.body;
    try {
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        const resetToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '15m' });
        const link = `http://localhost:5173/reset-password?token=${resetToken}`;
        try {
            await sendResetPasswordEmail(email, link);
            res.status(200).json({ message: 'Password reset link sent to email' });
        } catch (emailError) {
            console.error("[AUTH_CONTROLLER_ERROR] Reset Link fail:", emailError.message);
            res.status(500).json({ message: emailError.message });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const resetPassword = async (req, res) => {
    const { token, newPassword } = req.body;
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        user.password = newPassword;
        await user.save();
        res.status(200).json({ message: 'Password updated successfully' });
    } catch (error) {
        res.status(400).json({ message: 'Invalid or expired token' });
    }
};

const getAllUsers = async (req, res) => {
    try {
        console.log("getAllUsers backend route hit!");
        const users = await User.find({}).select('-password').lean();
        console.log("Found users in DB:", users.length);

        // Populate total bookings for each user
        const usersWithStats = await Promise.all(users.map(async (user) => {
            const totalBookings = await Booking.countDocuments({ user: user._id });
            return {
                ...user,
                totalBookings
            };
        }));

        res.json(usersWithStats);
    } catch (error) {
        console.error("Error in getAllUsers:", error);
        res.status(500).json({ message: error.message });
    }
};

const updateUserStatus = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        user.status = user.status === 'Active' ? 'Blocked' : 'Active';
        await user.save();

        res.json({ message: `User status updated to ${user.status}`, status: user.status });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const updateUser = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        user.name = req.body.name || user.name;
        user.email = req.body.email || user.email;
        if (req.body.phoneNumber !== undefined) {
            user.phoneNumber = req.body.phoneNumber;
        }

        if (req.body.role === 'Admin') {
            user.isAdmin = true;
            user.isStaff = false;
        } else if (req.body.role === 'Staff') {
            user.isAdmin = false;
            user.isStaff = true;
        } else if (req.body.role === 'User') {
            user.isAdmin = false;
            user.isStaff = false;
        }

        if (req.body.password && req.body.password.trim() !== '') {
            user.password = req.body.password; // Modifying password triggers the pre-save hook to hash it
        }

        const updatedUser = await user.save();

        res.json({
            _id: updatedUser._id,
            name: updatedUser.name,
            email: updatedUser.email,
            phoneNumber: updatedUser.phoneNumber,
            isAdmin: updatedUser.isAdmin,
            isStaff: updatedUser.isStaff,
            message: 'User updated successfully'
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const deleteUser = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        await User.deleteOne({ _id: req.params.id });
        res.json({ message: 'User deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
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
};
