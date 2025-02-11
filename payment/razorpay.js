const Razorpay = require("razorpay");

// Setup Razorpay instance
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID, // Add your Razorpay Key ID in .env
  key_secret: process.env.RAZORPAY_KEY_SECRET, // Add your Razorpay Key Secret in .env
});

module.exports = razorpay;
