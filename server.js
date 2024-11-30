// Install dependencies: npm install express bcrypt jsonwebtoken cors mongoose nodemailer speakeasy
require('dotenv').config();

const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const mongoose = require('mongoose');
const nodemailer = require('nodemailer');
const speakeasy = require('speakeasy');
const crypto = require('crypto'); // For generating secure random tokens

const app = express();
app.use(cors());
app.use(express.json());

// MongoDB connection
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/aayanSpencerDB', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => console.log('✅ MongoDB connected'))
  .catch((error) => console.error('❌ MongoDB connection error:', error));

// User Schema and Model
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, unique: true, required: true },
  password: { type: String, required: true },
  resetPasswordToken: String,
  resetPasswordExpires: Date,
  verifyToken: String,
  verified: { type: Boolean, default: false },
});

const User = mongoose.model('User', userSchema);

// Email transporter setup (using Nodemailer)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER, // Set your email in .env file
    pass: process.env.EMAIL_PASS, // Set your email password in .env file
  },
});

// Registration Route
app.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Check if the user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).send('Email already in use');
    }

    // Hash the user's password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Generate email verification token
    const verifyToken = crypto.randomBytes(20).toString('hex');

    // Save the new user to the database
    const user = new User({
      name,
      email,
      password: hashedPassword,
      verifyToken,
    });

    await user.save();

    // Send email verification link
    const verifyUrl = `${process.env.BASE_URL || 'http://localhost:3000'}/verify-email?token=${verifyToken}`;
    const mailOptions = {
      from: 'no-reply@yourdomain.com',
      to: email,
      subject: 'Email Verification',
      text: `Please click the following link to verify your email: ${verifyUrl}`,
    };

    await transporter.sendMail(mailOptions);
    res.status(201).send('User registered successfully. Please check your email to verify your account.');
  } catch (error) {
    console.error('Error during registration:', error);
    res.status(500).send('Error registering user');
  }
});

// Email Verification Route
app.get('/verify-email', async (req, res) => {
  try {
    const { token } = req.query;

    // Find the user by the verification token
    const user = await User.findOne({ verifyToken: token });
    if (!user) {
      return res.status(400).send('Invalid or expired verification token');
    }

    // Mark the user as verified
    user.verified = true;
    user.verifyToken = undefined;
    await user.save();

    res.send('Email verified successfully!');
  } catch (error) {
    console.error('Error during email verification:', error);
    res.status(500).send('Error verifying email');
  }
});

// Sign-in Route
app.post('/signin', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find the user by email
    const user = await User.findOne({ email });
    if (!user || !user.verified) {
      return res.status(401).send('Invalid email or account not verified');
    }

    // Validate the password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).send('Invalid email or password');
    }

    // Generate a JWT token
    const token = jwt.sign({ email: user.email }, process.env.JWT_SECRET || 'secret-key', { expiresIn: '1h' });
    res.status(200).json({ token });
  } catch (error) {
    console.error('Error during sign-in:', error);
    res.status(500).send('Error signing in');
  }
});

// Root Route (for testing)
app.get('/', (req, res) => {
  res.send('Welcome to Aayan Spencer\'s API');
});

// Start the Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});
