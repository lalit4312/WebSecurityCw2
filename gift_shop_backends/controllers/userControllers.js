const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/userModel.js');
// const { link } = require('../routes/productRoute.js');
const nodemailer = require('nodemailer');
const path = require('path');
const fs = require('fs');
const { promisify } = require('util');
const unlinkAsync = promisify(fs.unlink);
const axios = require('axios');

// Register User
const registerUser = async (req, res) => {
    const { fullName, email, password, captchaToken } = req.body;

    // Password validation regex
    const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(password)) {
        return res.status(400).json({
            success: false,
            message: 'Password must be at least 8 characters long and include uppercase, lowercase, number, and special character.',
        });
    }
    if (!captchaToken) {
        return res.status(400).json({ message: 'Captcha should be included' });
    }

    try {
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'User already exists.',
            });
        }

        const randomSalt = await bcrypt.genSalt(10);
        const hashPassword = await bcrypt.hash(password, randomSalt);

        const newUser = new User({
            fullName,
            email,
            password: hashPassword,
            passwordHistory: [{ password: hashPassword }],
            passwordExpiresAt: Date.now() + 90 * 24 * 60 * 60 * 1000 // 15 days expiry
        });

        await newUser.save();
        res.status(201).json({
            success: true,
            message: 'Registered successfully.',
        });
    } catch (error) {
        console.error('Error occurred during registration:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error.',
        });
    }
};


// Login User
const loginUser = async (req, res) => {
    const { email, password, captchaToken } = req.body;

    if (!email || !password || !captchaToken) {
        return res.status(400).json({ message: 'Please enter all fields.' });
    }

    try {
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: 'User not found.' });
        }

        if (user.lockUntil && user.lockUntil > Date.now()) {
            return res.status(403).json({
                success: false,
                message: `Account locked. Try again after ${new Date(user.lockUntil).toLocaleTimeString()}.`,
            });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            user.failedLoginAttempts += 1;
            if (user.failedLoginAttempts >= 3) {
                user.lockUntil = Date.now() + 5 * 60 * 1000; // Lock for 5 minutes
                user.failedLoginAttempts = 0;
            }
            await user.save();
            return res.status(400).json({ message: 'Invalid password.' });
        }

        user.failedLoginAttempts = 0;
        user.lockUntil = null;
        await user.save();

        const token = jwt.sign({ id: user._id, isAdmin: user.isAdmin }, process.env.JWT_SECRET, {
            expiresIn: '1h'
        });
        // Add token to activeTokens array
        user.activeTokens.push({ token });
        await user.save();

        res.json({
            success: true,
            message: 'Login successfully.',
            token,
            userData: {
                _id: user._id, // Ensure _id is included
                email: user.email,
                fullName: user.fullName,
                isAdmin: user.isAdmin,
                profileImage: user.profileImage, // Include other fields if needed
            },
        });
    } catch (error) {
        res.status(500).json({ message: 'Internal server error.' });
    }
};

const logoutUser = async (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
        return res.status(400).json({ message: 'Token is missing.' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id);

        if (!user) {
            return res.status(400).json({ message: 'User not found.' });
        }

        // Remove the token from activeTokens
        user.activeTokens = user.activeTokens.filter((activeToken) => activeToken.token !== token);
        await user.save();

        res.status(200).json({ message: 'Logout successful.' });
    } catch (error) {
        res.status(500).json({ message: 'Internal server error.' });
    }
};


const getUserDetails = async (req, res) => {
    const userId = req.params.id;
    try {
        const user = await User.findOne({ _id: userId }).exec();

        res.status(201).json({
            success: true,
            message: "User Data Fetched!",
            userDetails: user,
        });

    } catch (e) {
        console.log(e);
        res.json({
            success: false,
            message: "Server Error!",
        });
    }
}



// Update user details
const updateUser = async (req, res) => {
    const userId = req.params.id; // Assuming userId is passed as route parameter
    const updatedData = req.body;
    try {
        // Example: Updating user profile based on userId
        const updatedUser = await User.findByIdAndUpdate(userId, updatedData, { new: true });

        if (!updatedUser) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        res.status(200).json({ success: true, message: 'User updated successfully', user: updatedUser });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Error updating user profile' });
    }
};

// Update profile image
const updateProfileImage = async (req, res) => {
    const userId = req.params.id;

    if (!req.files || !req.files.profileImage) {
        return res.status(400).json({
            success: false,
            message: "Image not found"
        });
    }

    const { profileImage } = req.files;
    const imageName = `${Date.now()}-${profileImage.name}`;
    const imageUploadPath = path.join(__dirname, `../public/profiles/${imageName}`);

    try {
        await profileImage.mv(imageUploadPath);

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        // Delete the old profile image if it exists
        if (user.profileImage) {
            const oldImagePath = path.join(__dirname, `../public/profiles/${user.profileImage}`);
            if (fs.existsSync(oldImagePath)) {
                fs.unlinkSync(oldImagePath);
            }
        }

        user.profileImage = imageName;
        await user.save();

        res.status(200).json({
            success: true,
            message: "Profile image updated successfully",
            profileImage: imageName,
            user: user
        });
    } catch (error) {
        console.log(error);
        res.status(500).json({
            success: false,
            message: "Internal server error",
            error
        });
    }
};

// Forgot Password
const forgotPassword = async (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({ message: 'Email is required' });
    }

    try {
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: 'User not found' });
        }

        // if user entered the forgot password then opt is generated
        const otp = Math.floor(100000 + Math.random() * 900000).toString();

        // sets the limit of the otp expiry
        user.otpReset = otp;
        user.otpResetExpires = Date.now() + 3600000;
        await user.save();

        // Send email
        var transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: 'lakshya69056@gmail.com',
                pass: 'phqa mzxu clox jbzr'
            }
        });

        var mailOptions = {
            from: 'lakshya69056@gmail.com',
            to: email,
            subject: 'Password Reset OTP',
            text: `Your OTP for password reset is: ${otp}`
        };

        transporter.sendMail(mailOptions, function (error, info) {
            if (error) {
                console.log(error);
                return res.status(500).json({ message: 'Error sending email' });
            } else {
                console.log('Email sent: ' + info.response);
                return res.status(200).json({ message: 'Password reset OTP sent' });
            }
        });

    } catch (error) {
        console.error(error); // Log the error for debugging
        res.status(500).json({ message: 'Server error' }); // Handle server errors
    }
};

// Verify OTP and Set New Password
const verifyOtpAndPassword = async (req, res) => {
    const { email, otp, password } = req.body;

    if (!email || !otp || !password) {
        return res.status(400).json({ message: 'All fields are required.' });
    }

    try {
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: 'User not found.' });
        }

        const now = Date.now();
        if (user.otpReset !== otp || user.otpResetExpires < now) {
            return res.status(400).json({ message: 'Invalid or expired OTP.' });
        }

        const isPasswordReused = user.passwordHistory.some(
            (entry) => bcrypt.compareSync(password, entry.password)
        );

        if (isPasswordReused) {
            return res.status(400).json({ message: 'New password cannot be the same as any of the last 3 passwords.' });
        }

        const randomSalt = await bcrypt.genSalt(10);
        const hashPassword = await bcrypt.hash(password, randomSalt);

        user.password = hashPassword;
        user.otpReset = undefined;
        user.otpResetExpires = undefined;
        user.passwordExpiresAt = Date.now() + 90 * 24 * 60 * 60 * 1000; // Reset password expiry to 90 days
        user.passwordHistory.push({ password: hashPassword, changedAt: Date.now() });

        if (user.passwordHistory.length > 3) {
            user.passwordHistory.shift(); // Keep only the last 3 passwords
        }

        await user.save();
        res.status(200).json({ message: 'Password reset successfully.' });
    } catch (error) {
        console.error('Error resetting password:', error);
        res.status(500).json({ message: 'Server error.' });
    }
};


module.exports = {
    registerUser,
    loginUser,
    forgotPassword,
    verifyOtpAndPassword,
    getUserDetails,
    updateUser,
    updateProfileImage,
    logoutUser
};
