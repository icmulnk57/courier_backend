const express = require("express");
const moment = require("moment");
const Validator = require("validatorjs");
const { paxDB } = require("./../../config/database");
const router = express.Router();
const helper = require("./../../helper/helper");
const auth = require("./../../middleware/auth");
router.post("/add-multibox-order", [auth.isAuthorized], async (req, res) => {
  const transaction = await paxDB.transaction();
  
  try {
    const loggedInCustID = req.logedINUser;

    if (!loggedInCustID) {
      return res.status(400).json({
        success: false,
        message: "User not authorized or session expired.",
      });
    }

    // Validate Order Details
    const orderValidation = new Validator(req.body.orderDetails, {
      shipment_type: "required|string",
      invoice_no: "required|string",
      invoice_date: "required|date",
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

    // Insert Order Details
    const result = await paxDB.query(
      `INSERT INTO order_details 
        (CustID, shipment_type, invoice_no, invoice_date, invoice_currency, order_ref_id, ioss_number, address1, address2, city, state, pincode, country) 
      VALUES 
        (:CustID, :shipment_type, :invoice_no, :invoice_date, :invoice_currency, :order_ref_id, :ioss_number, :address1, :address2, :city, :state, :pincode, :country)`,
      {
        replacements: { ...req.body.orderDetails, CustID: loggedInCustID },
        type: paxDB.QueryTypes.INSERT,
        transaction: transaction,
      }
    );

    const orderId = result[0]; // Extract last inserted order_id

    if (!orderId) {
      await transaction.rollback();
      return res.status(500).json({
        success: false,
        message: "Failed to insert order details.",
      });
    }

    // Validate and Insert Box Details
    if (!Array.isArray(req.body.boxDetails) || req.body.boxDetails.length === 0) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: "Box details must be a non-empty array.",
      });
    }

    const boxIdMap = {}; // Store mapping between request index and inserted box_id

    for (const [index, box] of req.body.boxDetails.entries()) {
      const boxValidation = new Validator(box, {
        actual_weight: "required|numeric",
        length: "required|numeric",
        breadth: "required|numeric",
        height: "required|numeric",
      });

      if (boxValidation.fails()) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: helper.firstErrorValidatorjs(boxValidation),
        });
      }

      const boxResult = await paxDB.query(
        `INSERT INTO box_details 
          (order_id, actual_weight, length, breadth, height) 
        VALUES 
          (:order_id, :actual_weight, :length, :breadth, :height)`,
        {
          replacements: { ...box, order_id: orderId },
          type: paxDB.QueryTypes.INSERT,
          transaction: transaction,
        }
      );

      const boxId = boxResult[0]; // Extract last inserted box_id

      if (!boxId) {
        await transaction.rollback();
        return res.status(500).json({
          success: false,
          message: "Failed to insert box details.",
        });
      }

      boxIdMap[index] = boxId; // Store box_id for later use
    }

    // Validate and Insert Item Details into the Correct Box
    for (const [index, box] of req.body.boxDetails.entries()) {
      const box_id = boxIdMap[index];

      if (!box.items || !Array.isArray(box.items) || box.items.length === 0) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: `Box at index ${index} must have at least one item.`,
        });
      }

      for (const item of box.items) {
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

        await paxDB.query(
          `INSERT INTO item_details 
            (box_id, product_name, sku, hsn, quantity, unit_price, igst) 
          VALUES 
            (:box_id, :product_name, :sku, :hsn, :quantity, :unit_price, :igst)`,
          {
            replacements: { ...item, box_id: box_id },
            type: paxDB.QueryTypes.INSERT,
            transaction: transaction,
          }
        );
      }
    }

    await transaction.commit();

    return res.status(200).json({
      success: true,
      message: "MultiBox order added successfully with items inside respective boxes.",
    });

  } catch (error) {
    console.error(error);
    await transaction.rollback();
    return res.status(500).json({
      success: false,
      message: "An error occurred while adding the MultiBox order.",
    });
  }
});

  
  
  



module.exports = router;