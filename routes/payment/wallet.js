const express = require("express");
const Razorpay = require("razorpay");
const moment = require("moment");
const { paxDB } = require("./../../config/database");
const auth = require("./../../middleware/auth");
const router = express.Router();

// Import Razorpay configuration
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// Helper to validate amount (optional step)
const isValidAmount = (amount) => {
  return amount > 0 && Number.isInteger(amount); // Only allow positive integers
};

// Wallet Recharge API
router.post("/recharge-wallet", [auth.isAuthorized], async (req, res) => {
    const transaction = await paxDB.transaction();
  
    try {
      // Logged-in user details
      const loggedInCustID = req.logedINUser;
  
      if (!loggedInCustID) {
        return res.status(400).json({
          success: false,
          message: "User not authorized or session expired.",
        });
      }
  
      // Validate recharge amount
      const { amount } = req.body;
      if (!isValidAmount(amount)) {
        return res.status(400).json({
          success: false,
          message: "Invalid recharge amount. Must be a positive integer.",
        });
      }
  
      // Create a Razorpay order for wallet recharge
      const orderOptions = {
        amount: amount * 100, // Convert to paise (1 INR = 100 paise)
        currency: "INR",
        receipt: `wallet_${loggedInCustID}_${Date.now()}`, // Unique receipt ID
        payment_capture: 1, // Auto-capture the payment
      };
  
      const razorpayOrder = await razorpay.orders.create(orderOptions);
  
      // Insert recharge request into database for tracking
      await paxDB.query(
        `INSERT INTO wallet_recharges (CustID, amount, order_id, status, created_at) 
         VALUES (:CustID, :amount, :order_id, :status, :created_at)`,
        {
          replacements: {
            CustID: loggedInCustID,
            amount,
            order_id: razorpayOrder.id,
            status: "PENDING",
            created_at: moment().format("YYYY-MM-DD HH:mm:ss"),
          },
          type: paxDB.QueryTypes.INSERT,
          transaction: transaction,
        }
      );
  
      // Fetch current wallet balance
      const walletBalance = await paxDB.query(
        `SELECT balance 
         FROM wallet 
         WHERE CustID = :CustID`,
        {
          replacements: { CustID: loggedInCustID },
          type: paxDB.QueryTypes.SELECT,
          transaction: transaction,
        }
      );
  
      if (!walletBalance || walletBalance.length === 0) {
        return res.status(400).json({
          success: false,
          message: "No wallet found for this user.",
        });
      }
  
      // Calculate new wallet balance
      const newBalance = walletBalance[0].balance + amount;
  
      // Update wallet balance
      await paxDB.query(
        `UPDATE wallet 
         SET balance = :balance 
         WHERE CustID = :CustID`,
        {
          replacements: {
            balance: newBalance,
            CustID: loggedInCustID,
          },
          type: paxDB.QueryTypes.UPDATE,
          transaction: transaction,
        }
      );
  
      // Commit transaction
      await transaction.commit();
  
      // Respond with Razorpay order details and updated balance
      return res.status(200).json({
        success: true,
        message: "Recharge initiated successfully. Proceed with payment.",
        razorpayOrder,
        updatedBalance: newBalance,
      });
    } catch (error) {
      // Rollback transaction in case of error
      await transaction.rollback();
      console.error("Error in wallet recharge:", error);
  
      return res.status(500).json({
        success: false,
        message: "An error occurred while recharging the wallet.",
        error: error.message, // Optional: Include error details for debugging
      });
    }
  });
  

// Fetch Wallet Balance API
router.get("/wallet-balance", [auth.isAuthorized], async (req, res) => {
  try {
    // Logged-in user details
    const loggedInCustID = req.logedINUser;

    if (!loggedInCustID) {
      return res.status(400).json({
        success: false,
        message: "User not authorized or session expired.",
      });
    }

    // Query to fetch wallet balance
    const walletBalance = await paxDB.query(
      `SELECT balance 
       FROM wallet 
       WHERE CustID = :CustID`,
      {
        replacements: { CustID: loggedInCustID },
        type: paxDB.QueryTypes.SELECT,
      }
    );

    if (!walletBalance || walletBalance.length === 0) {
      return res.status(200).json({
        success: true,
        balance: 0,
        message: "No wallet found. Balance is 0.",
      });
    }

    return res.status(200).json({
      success: true,
      balance: walletBalance[0].balance,
    });
  } catch (error) {
    console.error("Error fetching wallet balance:", error);

    return res.status(500).json({
      success: false,
      message: "An error occurred while fetching the wallet balance.",
    });
  }
});

module.exports = router;
