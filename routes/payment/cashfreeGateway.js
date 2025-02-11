const express = require("express");
const moment = require("moment");
const Validator = require("validatorjs");
const { paxDB } = require("./../../config/database");
const router = express.Router();
const helper = require("./../../helper/helper");
const auth = require("./../../middleware/auth");
const { Cashfree } = require("cashfree-pg");
const crypto = require("crypto");

Cashfree.XClientId = process.env.CLIENT_ID;
Cashfree.XClientSecret = process.env.CLIENT_SECRET;
Cashfree.XEnvironment = Cashfree.Environment.SANDBOX;

function generateOrderId() {
  const uniqueId = crypto.randomBytes(4).toString("hex");
  const hash = crypto.createHash("sha256");
  hash.update(uniqueId);

  const orderId = hash.digest("hex");
  return orderId.substr(0, 12);
}

// API: Create Order
router.get("/payment", async (req, res) => {
  try {
    let request = {
      order_amount: "1.00",
      order_currency: "INR",
      order_id: generateOrderId(),
      customer_details: {
        customer_id: "aman",
        customer_phone: "8779105845",
        customer_name: "Pax Freight",
        customer_email: "mandalamankumar.786@gmail.com",
      },
    };

    Cashfree.PGCreateOrder("2025-01-01", request)
      .then((response) => {
        console.log(response.data);
        res.json(response.data);
      })
      .catch((error) => {
        console.error(error);
        res.json(error.response.data.message);
      });
  } catch (error) {
    console.error(error);
    res.json(error);
  }
});

// API: Verify Payment
router.post("/verify", async (req, res) => {
  try {
    let { order_id } = req.body;
    Cashfree.PGOrderFetchPayment("2025-01-01", order_id).then((response) => {
      console.log(response.data);
      res.json(response.data);
    });
  } catch (error) {
    console.error(error);
    res.json(error.response.data.message);
  }
});

module.exports = router;
