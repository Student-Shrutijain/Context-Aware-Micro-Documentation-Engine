const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');

const generateToken = (id, username) => {
  const JWT_SECRET = process.env.JWT_SECRET || 'supersecret_fallback';
  return jwt.sign({ id, username }, JWT_SECRET, {
    expiresIn: '30d',
  });
};

// Hardcoded In-Memory DB Admin
const HARDCODED_ADMIN = {
  _id: 'admin_123',
  username: 'admin',
  password: 'password123'
};

// Login Route
router.post('/login', (req, res) => {
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ message: 'Please provide username and password' });
  }

  // Validate Hardcoded Memory Admin
  if (username === HARDCODED_ADMIN.username && password === HARDCODED_ADMIN.password) {
    res.json({
      _id: HARDCODED_ADMIN._id,
      username: HARDCODED_ADMIN.username,
      token: generateToken(HARDCODED_ADMIN._id, HARDCODED_ADMIN.username),
    });
  } else {
    res.status(401).json({ message: 'Invalid username or password' });
  }
});

module.exports = router;
