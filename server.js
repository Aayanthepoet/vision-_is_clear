// Install dependencies: npm install express body-parser bcrypt jsonwebtoken cors mongoose
const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const mongoose = require('mongoose');

const app = express();
app.use(cors());
app.use(express.json());

// MongoDB connection
mongoose.connect('mongodb://localhost:27017/pamper-me-quick', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// User schema and model
const userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  password: String,
});
const User = mongoose.model('User', userSchema);

// Registration route
app.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ name, email, password: hashedPassword });
    await user.save();
    res.status(201).send('User registered successfully');
  } catch (error) {
    res.status(500).send('Error registering user');
  }
});

// Sign-in route
app.post('/signin', async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (user && await bcrypt.compare(password, user.password)) {
    const token = jwt.sign({ email: user.email }, 'secret-key', { expiresIn: '1h' });
    res.status(200).json({ token });
  } else {
    res.status(401).send('Invalid email or password');
  }
});

// Root route (for testing)
app.get('/', (req, res) => {
  res.send('Welcome to the Pamper Me Quick API');
});

// Server listening
app.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
});
