const express = require('express');
const { json } = require('express');
const { config } = require('dotenv');
const connectDB = require('./database/database.js');
const cors = require('cors');
const { registerUser, loginUser } = require('./controllers/userControllers.js');
const fileUpload = require('express-fileupload');
const productRoute = require('./routes/productRoute.js');
const userRoute = require('./routes/userRoute.js');
const path = require('path');
const paymentRoute = require('./routes/paymentRoute.js')
const favoriteRoute = require('./routes/productRoute.js')
const createReview = require('./routes/productRoute.js')
const bookingRoute = require('./routes/bookingRoute.js');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');

// Load environment variables
config();

// creating and express application
const app = express();

// json config
app.use(json());

//file upload config
app.use(fileUpload());

// make a public folder accessible to the outside
app.use(express.static('./public'));


app.use(mongoSanitize());


app.use(xss());

// Set up CORS
const corsOptions = {
    origin: true,
    credentials: true,
    optionSuccessStatus: 200,
};
app.use(cors(corsOptions));

// Connect to the database
try {
    connectDB();
} catch (error) {
    console.error("Error connecting to the database:", error);
    process.exit(1); // Exit process with failure
}


// Routes
app.post('/register', registerUser);
app.post('/login', loginUser);

// configuring routes
app.use('/api/user', userRoute);
// Product route
app.use('/api/products', productRoute);

app.use('/api/createReview', createReview)

// Payment route
app.use('/api/payment', paymentRoute);

// Favorite route
app.use('/api/favorites', favoriteRoute);

// Booking route
app.use('/api/bookings', bookingRoute);

const PORT = process.env.PORT;

app.listen(PORT, () => {
    console.log(`Server is running on PORT ${PORT}`);
});

module.exports = app;
