import React, { useState } from 'react';
import { FaUser, FaEnvelope, FaLock, FaEye, FaEyeSlash } from 'react-icons/fa';
import { toast, ToastContainer } from "react-toastify";
import 'react-toastify/dist/ReactToastify.css';
import { registerUserApi } from '../../apis/Api';
import { useNavigate } from 'react-router-dom';

const RegisterPage = () => {
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const navigate = useNavigate();

    // Validate password strength
    const validatePasswordStrength = (password) => {
        if (password.length < 6) {
            return 'Password must be at least 6 characters long.';
        }
        if (!/[A-Za-z]/.test(password)) {
            return 'Password must include at least one letter.';
        }
        if (!/\d/.test(password)) {
            return 'Password must include at least one number.';
        }
        if (!/[@$!%*?&]/.test(password)) {
            return 'Password must include at least one special character.';
        }
        return '';
    };

    const handleSubmit = async (event) => {
        event.preventDefault();

        const passwordError = validatePasswordStrength(password);
        if (passwordError) {
            toast.error(passwordError);
            return;
        }

        if (password !== confirmPassword) {
            toast.error("Passwords do not match");
            return;
        }

        try {
            const response = await registerUserApi({ fullName, email, password });
            toast.success('Registered successfully!');
            setTimeout(() => {
                navigate('/login');
            }, 1000);
        } catch (error) {
            toast.error(error.response?.data?.message || 'Registration failed. Please try again.');
        }
    };

    const togglePasswordVisibility = () => {
        setShowPassword(!showPassword);
    };

    const toggleConfirmPasswordVisibility = () => {
        setShowConfirmPassword(!showConfirmPassword);
    };

    return (
        <div className="d-flex justify-content-center align-items-center vh-100"
            style={{
                backgroundImage: 'url("/assets/images/background_logo.jpg")',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
            }}
        >
            <div className="card p-4 shadow register-card">
                <div className="text-center mb-4">
                    <img src="/assets/images/website_logo.png" alt="Logo" className="logo mb-3" />
                    <h2>Gift Bazar</h2>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="mb-3 input-group">
                        <span className="input-group-text"><FaUser /></span>
                        <input
                            type="text"
                            className="form-control"
                            placeholder="Full Name"
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            required
                        />
                    </div>
                    <div className="mb-3 input-group">
                        <span className="input-group-text"><FaEnvelope /></span>
                        <input
                            type="email"
                            className="form-control"
                            placeholder="Email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>
                    <div className="mb-3 input-group">
                        <span className="input-group-text"><FaLock /></span>
                        <input
                            type={showPassword ? "text" : "password"}
                            className="form-control"
                            placeholder="Password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                        <span className="input-group-text" onClick={togglePasswordVisibility}>
                            {showPassword ? <FaEyeSlash /> : <FaEye />}
                        </span>
                    </div>
                    <div className="mb-3 input-group">
                        <span className="input-group-text"><FaLock /></span>
                        <input
                            type={showConfirmPassword ? "text" : "password"}
                            className="form-control"
                            placeholder="Confirm Password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                        />
                        <span className="input-group-text" onClick={toggleConfirmPasswordVisibility}>
                            {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
                        </span>
                    </div>
                    <button type="submit" className="btn btn-primary w-100">Register</button>
                </form>
                <div className="text-center mt-3">
                    <span>OR</span>
                </div>
                <div className="text-center mt-2">
                    <span>Already have an account? </span>
                    <a href="/login" className="text-decoration-none">Login</a>
                </div>
            </div>
            <ToastContainer />
        </div>
    );
}

export default RegisterPage;
