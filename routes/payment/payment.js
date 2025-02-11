const express = require("express");
const moment = require("moment");
const Validator = require("validatorjs");
const { paxDB } = require("./../../config/database");
const router = express.Router();
const helper = require("./../../helper/helper");
const auth = require("./../../middleware/auth");
const razorpay = require("./../../payment/razorpay");

// API: Create Order
router.post("/create-order", async (req, res) => {
    const { user_id, amount } = req.body;

    if (!amount || amount <= 0) {
        return res.status(400).json({ error: "Invalid amount" });
    }

    try {
        
        const options = {
            amount: amount * 100, 
            currency: "INR",
            receipt: `receipt_${Date.now()}`,
            payment_capture: 1
        };

        const order = await razorpay.orders.create(options);

       
        const [result] = await paxDB.query(
            "INSERT INTO payments (user_id, amount, order_id, status) VALUES (:user_id, :amount, :order_id, :status)",
            {
                replacements: { user_id, amount, order_id: order.id, status: "pending" },
                type: paxDB.QueryTypes.INSERT
            }
        );

        res.json({ id: order.id, amount: order.amount });
    } catch (error) {
        res.status(500).json({ error: "Failed to create order" , message: error.message });
    }
});

// API: Verify Payment
router.post("/verify-payment", async (req, res) => {
    const { order_id, payment_id, status } = req.body;

    if (!order_id || !payment_id) {
        return res.status(400).json({ error: "Invalid payment data" });
    }

    try {
        
        await paxDB.execute(   
            "UPDATE payments SET payment_id = ?, status = ? WHERE order_id = ?",
            [payment_id, status, order_id]
        );

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: "Failed to update payment status" });
    }
});

module.exports = router;

