require('dotenv').config();
const connectDatabase = require('../config/db');
const User = require('../models/User');

const seedAdmin = async () => {
  const email = process.env.DEFAULT_ADMIN_EMAIL;
  const password = process.env.DEFAULT_ADMIN_PASSWORD;

  if (!email || !password) {
    throw new Error('DEFAULT_ADMIN_EMAIL and DEFAULT_ADMIN_PASSWORD are required.');
  }

  await connectDatabase();

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    existingUser.role = 'admin';
    if (!existingUser.password) {
      existingUser.password = password;
    }
    await existingUser.save();
    console.log('Existing user updated to admin.');
    process.exit(0);
  }

  await User.create({
    email,
    password,
    name: 'Admin User',
    role: 'admin',
    coins: 1000
  });

  console.log('Admin user created.');
  process.exit(0);
};

seedAdmin().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
