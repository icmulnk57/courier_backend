const express = require("express");
const moment = require("moment");
const Validator = require("validatorjs");
const { paxDB } = require("./../../config/database");
const router = express.Router();
const helper = require("./../../helper/helper");
const auth = require("./../../middleware/auth");
const razorpay = require("./../../payment/razorpay");


// router.post("/add-order", [auth.isAuthorized,auth.checkKYC], async (req, res) => {
//   const transaction = await paxDB.transaction();

//   try {
//     // Fetch CustID from the logged-in user's session
//     const loggedInCustID = req.logedINUser;

//     if (!loggedInCustID) {
//       return res.status(400).json({
//         success: false,
//         message: "User not authorized or session expired.",
//       });
//     }

//     // Validate Buyer Details
//     const buyerValidation = new Validator(req.body.buyerDetails, {
//       first_name: "required|string",
//       last_name: "required|string",
//       mobile_no: "required|regex:/^[6-9][0-9]{9}$/",
//       alternate_mobile_no: "string",
//       email_id: "required|email",
//       country: "required|string",
//       locality: "string",
//       address1: "string",
//       address2: "string",
//       pincode: "required|string",
//       city: "required|string",
//       state: "required|string",
//     });

//     if (buyerValidation.fails()) {
//       await transaction.rollback();
//       return res.status(400).json({
//         success: false,
//         message: helper.firstErrorValidatorjs(buyerValidation),
//       });
//     }

//     // Insert Buyer Details (Include CustID)
//     const [buyer] = await paxDB.query(
//       `INSERT INTO buyer_details 
//       (CustID, first_name, last_name, mobile_no, alternate_mobile_no, email_id, country, locality, address1, address2, pincode, city, state) 
//       VALUES 
//       (:CustID, :first_name, :last_name, :mobile_no, :alternate_mobile_no, :email_id, :country, :locality, :address1, :address2, :pincode, :city, :state)`,
//       {
//         replacements: { ...req.body.buyerDetails, CustID: loggedInCustID },
//         type: paxDB.QueryTypes.INSERT,
//         transaction: transaction,
//       }
//     );

//     const buyerId = buyer;

//     // Validate Order Details
//     const orderValidation = new Validator(req.body.orderDetails, {
//       shipment_type: "required|string", // CSB-V or CSB-IV
//       actual_weight: "required|numeric",
//       length: "required|numeric",
//       breadth: "required|numeric",
//       height: "required|numeric",
//       invoice_no: "required|string",
//       invoice_date: "required|date",
//       invoice_currency: "required|string", // INR
//       order_ref_id: "required|string",
//       ioss_number: "string",
//     });

//     if (orderValidation.fails()) {
//       await transaction.rollback();
//       return res.status(400).json({
//         success: false,
//         message: helper.firstErrorValidatorjs(orderValidation),
//       });
//     }

//     // Insert Order Details
//     const [order] = await paxDB.query(
//       `INSERT INTO order_details 
//       (buyer_id, shipment_type, actual_weight, length, breadth, height, invoice_no, invoice_date, invoice_currency, order_ref_id, ioss_number) 
//       VALUES 
//       (:buyer_id, :shipment_type, :actual_weight, :length, :breadth, :height, :invoice_no, :invoice_date, :invoice_currency, :order_ref_id, :ioss_number)`,
//       {
//         replacements: { ...req.body.orderDetails, buyer_id: buyerId },
//         type: paxDB.QueryTypes.INSERT,
//         transaction: transaction,
//       }
//     );

//     const orderId = order;

//     // Validate Item Details
//     if (!Array.isArray(req.body.itemDetails) || req.body.itemDetails.length === 0) {
//       await transaction.rollback();
//       return res.status(400).json({
//         success: false,
//         message: "Item details must be a non-empty array.",
//       });
//     }

//     for (const item of req.body.itemDetails) {
//       const itemValidation = new Validator(item, {
//         product_name: "required|string",
//         sku: "string",
//         hsn: "string",
//         quantity: "required|numeric",
//         unit_price: "required|numeric",
//         igst: "required|numeric",
//       });

//       if (itemValidation.fails()) {
//         await transaction.rollback();
//         return res.status(400).json({
//           success: false,
//           message: helper.firstErrorValidatorjs(itemValidation),
//         });
//       }

//       // Insert Item Details
//       await paxDB.query(
//         `INSERT INTO item_details 
//         (order_id, product_name, sku, hsn, quantity, unit_price, igst) 
//         VALUES 
//         (:order_id, :product_name, :sku, :hsn, :quantity, :unit_price, :igst)`,
//         {
//           replacements: { ...item, order_id: orderId },
//           type: paxDB.QueryTypes.INSERT,
//           transaction: transaction,
//         }
//       );
//     }

//     // Commit the transaction
//     await transaction.commit();

//     return res.status(200).json({
//       success: true,
//       message: "Order added successfully.",
//     });
//   } catch (error) {
//     // Rollback the transaction in case of an error
//     await transaction.rollback();
//     console.error("Error adding order:", error);
//     return res.status(500).json({
//       success: false,
//       message: "An error occurred while adding the order.",
//     });
//   }
// });


router.post("/add-order", [auth.isAuthorized], async (req, res) => {
  const transaction = await paxDB.transaction();

  try {
    const loggedInCustID = req.logedINUser;

    if (!loggedInCustID) {
      return res.status(400).json({
        success: false,
        message: "User not authorized or session expired.",
      });
    }

   
    const orderValidation = new Validator(req.body.orderDetails, {
      shipment_type: "required|string",
      actual_weight: "required|numeric",
      length: "required|numeric",
      breadth: "required|numeric",
      height: "required|numeric",
      invoice_no: "required|string",
      invoice_date: "required",
      invoice_currency: "required|string",
      order_ref_id: "required|string",
      ioss_number: "string",
      address1: "required|string",
      address2: "string",
      city: "required|string",
      state: "required|string",
      pincode: "required|string",
      country: "required|string",
    });

    if (orderValidation.fails()) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: helper.firstErrorValidatorjs(orderValidation),
      });
    }


    const [address] = await paxDB.query(
      `INSERT INTO addresses 
        (CustID, address1, address2, city, state, pincode, country) 
      VALUES 
        (:CustID, :address1, :address2, :city, :state, :pincode, :country)`,
      {
        replacements: {
          CustID: loggedInCustID,
          address1: req.body.orderDetails.address1,
          address2: req.body.orderDetails.address2,
          city: req.body.orderDetails.city,
          state: req.body.orderDetails.state,
          pincode: req.body.orderDetails.pincode,
          country: req.body.orderDetails.country,
        },
        type: paxDB.QueryTypes.INSERT,
        transaction: transaction,
      }
    );

    // Insert order details (using CustID as logged-in user)
    const [order] = await paxDB.query(
      `INSERT INTO order_details 
        (CustID, shipment_type, actual_weight, length, breadth, height, invoice_no, invoice_date, invoice_currency, order_ref_id, ioss_number, address1, address2, city, state, pincode, country) 
      VALUES 
        (:CustID, :shipment_type, :actual_weight, :length, :breadth, :height, :invoice_no, :invoice_date, :invoice_currency, :order_ref_id, :ioss_number, :address1, :address2, :city, :state, :pincode, :country)`,
      {
        replacements: {
          ...req.body.orderDetails,
          CustID: loggedInCustID,
        },
        type: paxDB.QueryTypes.INSERT,
        transaction: transaction,
      }
    );

    const orderId = order;

    // Validate and insert item details
    if (!Array.isArray(req.body.itemDetails) || req.body.itemDetails.length === 0) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: "Item details must be a non-empty array.",
      });
    }

    for (const item of req.body.itemDetails) {
      const itemValidation = new Validator(item, {
        product_name: "required|string",
        sku: "string",
        hsn: "string",
        quantity: "required|numeric",
        unit_price: "required|numeric",
        igst: "required|numeric",
      });

      if (itemValidation.fails()) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: helper.firstErrorValidatorjs(itemValidation),
        });
      }

      // Insert item details
      await paxDB.query(
        `INSERT INTO item_details 
          (order_id, product_name, sku, hsn, quantity, unit_price, igst) 
        VALUES 
          (:order_id, :product_name, :sku, :hsn, :quantity, :unit_price, :igst)`,
        {
          replacements: { ...item, order_id: orderId },
          type: paxDB.QueryTypes.INSERT,
          transaction: transaction,
        }
      );
    }


    await transaction.commit();

    return res.status(200).json({
      success: true,
      message: "Order added successfully.",
    });
  } catch (error) {
    console.log(error);
    await transaction.rollback();
    return res.status(500).json({
      success: false,
      message: "An error occurred while adding the order.",
    });
  }
});


//fetch draft order
router.get("/get-orders", [auth.isAuthorized], async (req, res) => {
  try {
    const loggedInCustID = req.logedINUser;
    const status = req.query.status || 'DRAFT'; 

    if (!loggedInCustID) {
      return res.status(400).json({
        success: false,
        message: "User not authorized or session expired.",
      });
    }

    const orders = await paxDB.query(
      `SELECT 
         od.order_id, 
         od.created_at, 
         od.status, 
         od.length, 
         od.breadth, 
         od.height, 
         a.address1, 
         a.city, 
         a.state, 
         a.pincode 
       FROM 
         order_details od
       LEFT JOIN 
         addresses a 
         ON od.CustID = a.CustID 
       WHERE 
         od.status = :status 
         AND od.CustID = :loggedInCustID 
       ORDER BY 
         od.order_id DESC`,
      {
        type: paxDB.QueryTypes.SELECT,
        replacements: { loggedInCustID, status },
      }
    );

    if (!orders || orders.length === 0) {
      return res.status(200).json({
        success: true,
        data: [],
        message: `No orders found for the status: ${status}.`,
      });
    }

    // Map the fetched orders to a structured response
    const data = orders.map((order) => ({
      order_id: order.order_id,
      order_date: order.created_at,
      address: `${order.address1 || ""}, ${order.city || ""}, ${order.state || ""} - ${order.pincode || ""}`.trim(),
      package_details: `${order.length || 0}x${order.breadth || 0}x${order.height || 0}`,
      status: order.status,
    }));

    // Return the response with the data
    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("Error fetching orders:", error);

    return res.status(500).json({
      success: false,
      message: "An error occurred while fetching the orders. Please try again later.",
    });
  }
});




// Wallet recharge API
router.post("/wallet-recharge", [auth.isAuthorized], async (req, res) => {
  try {
    const loggedInCustID = req.logedINUser;

    if (!loggedInCustID) {
      return res.status(400).json({
        success: false,
        message: "User not authorized or session expired.",
      });
    }

    // Validate recharge amount
    const validation = new Validator(req.body, {
      amount: "required|numeric|min:10", // Minimum recharge amount is 10
      currency: "required|string",
    });

    if (validation.fails()) {
      return res.status(400).json({
        success: false,
        message: "Invalid input: " + validation.errors.first("amount"),
      });
    }

    const { amount, currency } = req.body;

    // Create a Razorpay order
    const options = {
      amount: amount * 100, // Amount in smallest currency unit (e.g., paise for INR)
      currency,
      receipt: `receipt_${Date.now()}`,
      payment_capture: 1, // Auto-capture payment
    };

    const razorpayOrder = await razorpay.orders.create(options);

    // Save order details to database
    await paxDB.query(
      `INSERT INTO wallet_recharges (CustID, order_id, amount, currency, status) VALUES (:CustID, :order_id, :amount, :currency, 'PENDING')`,
      {
        replacements: {
          CustID: loggedInCustID,
          order_id: razorpayOrder.id,
          amount,
          currency,
        },
        type: paxDB.QueryTypes.INSERT,
      }
    );

    return res.status(200).json({
      success: true,
      message: "Razorpay order created successfully.",
      order: razorpayOrder, // Return Razorpay order details to client
    });
  } catch (error) {
    console.error("Error creating Razorpay order:", error);

    return res.status(500).json({
      success: false,
      message: "An error occurred while creating the order. Please try again later.",
    });
  }
});

// Razorpay webhook to handle payment updates
router.post("/wallet-recharge-webhook", express.json(), async (req, res) => {
  try {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;

    // Validate webhook signature
    const crypto = require("crypto");
    const shasum = crypto.createHmac("sha256", secret);
    shasum.update(JSON.stringify(req.body));
    const digest = shasum.digest("hex");

    if (digest !== req.headers["x-razorpay-signature"]) {
      return res.status(400).json({ success: false, message: "Invalid signature." });
    }

    const payload = req.body;
    const { order_id, status } = payload.payload.payment.entity;

    // Update the wallet recharge status based on Razorpay response
    await paxDB.query(
      `UPDATE wallet_recharges SET status = :status WHERE order_id = :order_id`,
      {
        replacements: { status: status === "captured" ? "COMPLETED" : "FAILED", order_id },
        type: paxDB.QueryTypes.UPDATE,
      }
    );

    return res.status(200).json({ success: true, message: "Webhook processed successfully." });
  } catch (error) {
    console.error("Error processing Razorpay webhook:", error);

    return res.status(500).json({
      success: false,
      message: "An error occurred while processing the webhook.",
    });
  }
});

module.exports = router;
