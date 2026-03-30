require('dotenv').config({ override: true });
const mongoose = require('mongoose');
const NodeObj = require('./models/Node');

const seedDatabase = async () => {
  try {
    const MONGODB_URI = process.env.MONGODB_URI;
    if (!MONGODB_URI) {
      console.error('No MONGODB_URI found in .env');
      return;
    }

    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB Atlas...');

    // Clear existing data
    await NodeObj.deleteMany({});
    console.log('Cleared existing nodes...');

    // Create 3 reference nodes with different dates to show off colors
    
    // 1. Fresh Node (Modified today)
    const loginNode = new NodeObj({
      title: 'Login Module',
      content: 'The Login Module uses JSON Web Tokens (JWT) to authenticate users. It interacts with the Authentication API over HTTPS.',
      lastUpdated: new Date() // Today = Green
    });

    // 2. Getting Old Node (Modified 20 days ago)
    const twentyDaysAgo = new Date();
    twentyDaysAgo.setDate(twentyDaysAgo.getDate() - 20);
    
    const dbNode = new NodeObj({
      title: 'Database Architecture',
      content: 'We use MongoDB Atlas for our primary operational database. Collections include Users, Doctors, and Appointments. Please ensure indexes are properly scaled.',
      lastUpdated: twentyDaysAgo // >15 days = Yellow
    });

    // 3. Needs Update Node (Modified 40 days ago)
    const fortyDaysAgo = new Date();
    fortyDaysAgo.setDate(fortyDaysAgo.getDate() - 40);

    const paymentNode = new NodeObj({
      title: 'Payment Gateway Integration',
      content: 'IMPORTANT: This document outlines the Stripe API integration. Note: Stripe API v2 is deprecated, we must migrate to v3 soon!',
      lastUpdated: fortyDaysAgo // >30 days = Red
    });

    // Save them to generate IDs
    const savedLogin = await loginNode.save();
    const savedDb = await dbNode.save();
    const savedPayment = await paymentNode.save();

    // Link them together (Smart Connections)
    // Connecting Login -> DB
    savedLogin.connections.push(savedDb._id);
    await savedLogin.save();
    // Because of our API logic in routes/nodes.js, usually the server auto-links backwards,
    // but here in the seed script we will link it manually or use the model logic.
    savedDb.connections.push(savedLogin._id);
    
    // Connect DB -> Payment
    savedDb.connections.push(savedPayment._id);
    savedPayment.connections.push(savedDb._id);
    
    await savedDb.save();
    await savedPayment.save();

    console.log('✅ Success! Seed data planted.');
    console.log('You can now interact with the "Login Module", "Database Architecture", and "Payment Gateway" on the map.');
    mongoose.disconnect();

  } catch (err) {
    console.error('Seeding error:', err);
    mongoose.disconnect();
  }
};

seedDatabase();
