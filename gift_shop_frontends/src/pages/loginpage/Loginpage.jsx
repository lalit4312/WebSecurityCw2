import React, { useState } from 'react';
import { FaUser, FaLock, FaEye, FaEyeSlash } from 'react-icons/fa';
import './../loginpage/login.css';
import { toast } from "react-toastify";
import { useNavigate } from 'react-router-dom';
import { loginUserApi } from './../../apis/Api';
import ReCAPTCHA from 'react-google-recaptcha';
import logger from '../../utils/logger';

const Loginpage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [captchaToken, setCaptchaToken] = useState(null);
  const navigate = useNavigate();

  const onCaptchaChange = (token) => {
    setCaptchaToken(token);
    logger.info('CAPTCHA verified.');
  };

  const validate = () => {
    let isValid = true;
    if (email.trim() === '' || !email.includes('@')) {
      setEmailError('Please enter a valid email');
      isValid = false;
    }
    if (password.trim() === '') {
      setPasswordError('Please enter the password');
      isValid = false;
    }
    if (!captchaToken) {
      toast.error('Please verify the CAPTCHA');
      return false;
    }
    return isValid;
  };

  const handlePasswordInput = (password) => {
    setPassword(password);
  };

  const handleLogin = async (event) => {
    event.preventDefault();

    if (!validate()) {
      logger.warn('Login attempt with missing fields.');
      return;
    }

    const data = {
      email,
      password,
      captchaToken,
    };

    try {
      logger.info(`Attempting login for email: ${email}`);
      const res = await loginUserApi(data);

      if (res.data.success) {
        toast.success('Login Successfully');

        if (res.data.passwordExpiryMessage) {
          toast.warn(res.data.passwordExpiryMessage, {
            position: "top-right",
            autoClose: 5000,
            hideProgressBar: false,
            closeOnClick: true,
            pauseOnHover: true,
            draggable: true,
          });

        }

        localStorage.setItem('token', res.data.token || '');
        localStorage.setItem('user', JSON.stringify(res.data.userData || {}));
        navigate('/redirect');
      } else {
        toast.error(res.data.message);
        logger.warn(`Login failed for user: ${email}`);
      }
    } catch (error) {
      logger.error(`Login error: ${error.message}`);
      console.error('Login Error:', error.response?.data || error.message);

      if (error.response?.data?.message) {
        toast.error(error.response.data.message);
      } else {
        toast.error('An error occurred. Please try again.');
      }
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <div
      className="d-flex justify-content-center align-items-center vh-100"
      style={{
        backgroundImage: 'url("/assets/images/bg1.jpg")',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <div className="card p-4 shadow login-card">
        <div className="text-center mb-4">
          <img src="/assets/images/website_logo.png" alt="Logo" className="logo mb-3" />
          <h2>Gift Shop</h2>
        </div>
        <form>
          <div className="mb-3 input-group">
            <span className="input-group-text"><FaUser /></span>
            <input
              onChange={(e) => setEmail(e.target.value)}
              type="text"
              className='form-control'
              placeholder='Enter your Email'
            />
            {emailError && <p className="text-danger">{emailError}</p>}
          </div>
          <div className="mb-3 input-group">
            <span className="input-group-text"><FaLock /></span>
            <input
              onChange={(e) => handlePasswordInput(e.target.value)}
              type={showPassword ? 'text' : 'password'}
              className='form-control'
              placeholder='Enter your Password'
            />
            {passwordError && <p className="text-danger">{passwordError}</p>}
            <span className="input-group-text password-toggle-icon" onClick={togglePasswordVisibility}>
              {showPassword ? <FaEyeSlash /> : <FaEye />}
            </span>
          </div>
          <div className="d-flex justify-content-end mb-3">
            <a href="/forgot_password" className="text-decoration-none">Forgot password?</a>
          </div>
          <div className="mb-3">
            <ReCAPTCHA
              sitekey="6LdvAbgqAAAAAJzHc6E2UGeUL9Ms90btkyaGlL4J"
              onChange={onCaptchaChange}
            />
          </div>
          <button onClick={handleLogin} type="submit" className="btn btn-primary w-100">Login</button>
        </form>
        <div className="text-center mt-3">
          <span>OR</span>
        </div>
        <div className="text-center mt-2">
          <span>I don't have an account? </span>
          <a href="/register" className="text-decoration-none">Sign up</a>
        </div>
      </div>
    </div>
  );
};

export default Loginpage;
