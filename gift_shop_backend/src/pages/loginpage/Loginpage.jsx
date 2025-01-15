import React, { useState } from 'react';
import { FaUser, FaLock, FaEye, FaEyeSlash } from 'react-icons/fa';
import './../loginpage/login.css';
import { toast } from "react-toastify";
import { useNavigate } from 'react-router-dom';
import { loginUserApi } from './../../apis/Api';

const Loginpage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

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
    return isValid;
  };

  const handleLogin = async (event) => {
    event.preventDefault();

    if (!validate()) {
      return;
    }

    const data = {
      email: email,
      password: password,
    };

    console.log("Login Data: ", data);

    try {
      const res = await loginUserApi(data);
      console.log("Response Data: ", res.data);

      if (res.data.success === false) {
        toast.error(res.data.message);
      } else {
        toast.success("Login Successfully");

        localStorage.setItem('token', res.data.token);
        const convertedData = JSON.stringify(res.data.userData);
        localStorage.setItem('user', convertedData);
        navigate('/redirect');
      }
    } catch (error) {
      if (error.response) {
        console.error("Error Response: ", error.response);
        if (error.response.status === 400) {
          toast.error("Invalid credentials or missing fields.");
        } else {
          toast.error(error.response.data.message || "An error occurred. Please try again later.");
        }
      } else {
        console.error("Error: ", error);
        toast.error("An error occurred. Please try again later.");
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
          <h2>Gift Bazar</h2>
        </div>
        <form>
          <div className="mb-3 input-group">
            <span className="input-group-text"><FaUser /></span>
            <input
              onChange={(e) => setEmail(e.target.value)} type="text" className='form-control' placeholder='Enter your Email' />
            {
              emailError && <p className="text-danger">{emailError}</p>
            }
          </div>
          <div className="mb-3 input-group">
            <span className="input-group-text"><FaLock /></span>
            <input onChange={(e) => setPassword(e.target.value)} type={showPassword ? 'text' : 'password'} className='form-control' placeholder='Enter your Password' />
            {
              passwordError && <p className="text-danger">{passwordError}</p>
            }
            <span className="input-group-text password-toggle-icon" onClick={togglePasswordVisibility}>
              {showPassword ? <FaEyeSlash /> : <FaEye />}
            </span>
          </div>
          <div className="d-flex justify-content-end mb-3">
            <a href="/forgot_password" className="text-decoration-none">Forgot password?</a>
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
