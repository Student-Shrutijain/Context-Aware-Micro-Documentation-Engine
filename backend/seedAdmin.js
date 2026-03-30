require('dotenv').config({ override: true });
const mongoose = require('mongoose');
const User = require('./models/User');

const seedAdmin = async () => {
  try {
    const MONGODB_URI = process.env.MONGODB_URI;
    if (!MONGODB_URI) {
      console.error('No MONGODB_URI found in .env');
      return;
    }

    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB Atlas...');

    // Remove existing users to prevent duplicates
    await User.deleteMany({});
    
    // Create new admin
    const adminUser = new User({
      username: 'admin',
      password: 'password123'
    });

    await adminUser.save();
    
    console.log('✅ Success! Admin user created.');
    console.log('Username: admin');
    console.log('Password: password123');
    
    mongoose.disconnect();
  } catch (err) {
    console.error('Seeding error:', err);
    mongoose.disconnect();
  }
};

seedAdmin();
