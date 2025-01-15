const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/userModel.js');
// const { link } = require('../routes/productRoute.js');
const nodemailer = require('nodemailer');
const path = require('path');
const fs = require('fs');
const { promisify } = require('util');
const unlinkAsync = promisify(fs.unlink);

// Register User
const registerUser = async (req, res) => {
    const { fullName, email, password } = req.body;

    try {
        const existingUser = await User.findOne({ email: email });
        if (existingUser) {
            console.error('User already exists');
            return res.status(400).json({
                success: false,
                message: 'User already exists'
            });
        }

        const randomSalt = await bcrypt.genSalt(10);
        const hashPassword = await bcrypt.hash(password, randomSalt);

        console.log(`Original Password: ${password}`);
        console.log(`Hashed Password: ${hashPassword}`);

        const newUser = new User({
            fullName: fullName,
            email: email,
            password: hashPassword,
        });

        await newUser.save();
        console.log('Registered successfully!', email);
        res.status(201).json({
            success: true,
            message: 'Registered successfully'
        });
    } catch (error) {
        console.error('Error occurred!', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

// Login User
const loginUser = async (req, res) => {
    const { email, password, captchaToken } = req.body;

    if (!email || !password || !captchaToken) {
        console.error('Email or password not provided');
        return res.status(400).json({
            success: false,
            message: 'Please enter all fields'
        });
    }

    // Verify CAPTCHA
    const secretKey = process.env.RECAPTCHA_SECRET_KEY; // Add your reCAPTCHA secret key to your environment variables
    try {
        const captchaResponse = await axios.post(
            `https://www.google.com/recaptcha/api/siteverify`,
            null,
            {
                params: {
                    secret: secretKey,
                    response: captchaToken
                }
            }
        );

        if (!captchaResponse.data.success) {
            console.error('CAPTCHA verification failed:', captchaResponse.data['error-codes']);
            return res.status(400).json({
                success: false,
                message: 'CAPTCHA verification failed'
            });
        }

        console.log('CAPTCHA verified successfully');
    } catch (captchaError) {
        console.error('Error verifying CAPTCHA:', captchaError);
        return res.status(500).json({
            success: false,
            message: 'Error verifying CAPTCHA'
        });
    }

    try {
        const user = await User.findOne({ email: email });
        if (!user) {
            console.error('User not found for email:', email);
            return res.status(400).json({
                success: false,
                message: 'User not found'
            });
        }

        console.log(`Login Attempt - Email: ${email}`);
        console.log(`Provided Password: ${password}`);
        console.log(`Stored Hashed Password: ${user.password}`);

        const isMatch = await bcrypt.compare(password, user.password);
        console.log(`Password Match: ${isMatch}`);

        if (!isMatch) {
            console.error('Invalid password for user:', email);
            return res.status(400).json({
                success: false,
                message: 'Invalid password'
            });
        }

        const token = jwt.sign({
            id: user._id,
            isAdmin: user.isAdmin
        }, process.env.JWT_SECRET);

        res.json({
            success: true,
            message: "Login Successfully",
            token: token,
            userData: user
        });
    } catch (error) {
        console.error('Error during user login:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
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

        // Generate OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();

        // Set OTP and expiry
        user.otpReset = otp;
        user.otpResetExpires = Date.now() + 3600000; // 1 hour expiry
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
    console.log(otp)

    if (!email || !otp || !password) {
        return res.status(400).json({ message: 'All fields are required' });
    }

    try {
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: 'User not found' });
        }

        const now = Date.now();
        const otpResetExpires = user.otpResetExpires.getTime();

        console.log(`Current Time (ms): ${now}`);
        console.log(`OTP Expiry Time (ms): ${otpResetExpires}`);
        console.log(`Stored OTP: ${user.otpReset}`);
        console.log(`Provided OTP: ${otp}`);

        if (user.otpReset != otp) {
            console.log('Provided OTP does not match stored OTP');
            return res.status(400).json({ message: 'Invalid OTP' });
        }

        if (otpResetExpires < now) {
            console.log('OTP has expired');
            return res.status(400).json({ message: 'Expired OTP' });
        }

        const randomSalt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(password, randomSalt);
        user.otpReset = undefined;
        user.otpResetExpires = undefined;
        await user.save();

        res.status(200).json({ message: 'Password reset successfully' });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports = {
    registerUser,
    loginUser,
    forgotPassword,
    verifyOtpAndPassword,
    getUserDetails,
    updateUser,
    updateProfileImage
};
