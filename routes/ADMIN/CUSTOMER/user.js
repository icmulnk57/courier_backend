const express = require("express");
const bcrypt = require("bcrypt");
const moment = require("moment");
const  Validator  = require("validatorjs");
const { paxDB } = require("../../../config/database");
const router = express.Router();
const helper=require("../../../helper/helper");
const multer = require("multer"); 
const path = require("path");
const auth = require("./../../../middleware/auth");




router.post("/create-user", async (req, res) => {
  const transaction = await paxDB.transaction();
  try {
    // Validate input
    const valid = new Validator(
      req.body,
      {
        name: "required|string",
        email: "required|email",
        mobileNo: "required|regex:/^[6-9][0-9]{9}$/",
        password: "required|regex:/^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.{8,})/",
        role: "required|string",
        gender: "required|in:M,F",
      },
      {
        "regex.password": "Password must contain at least 1 uppercase letter, 1 lowercase letter, and 1 number, and at least 8 or more characters",
        "regex.mobileNo": "Please enter a valid mobile number",
      }
    );

    if (valid.fails()) {
     transaction.rollback();
      return res.status(400).json({
       
        success: false,
        message: helper.firstErrorValidatorjs(valid),
      });
    }

    const existingMobile = await paxDB.query(
      "SELECT * FROM `admin_login` WHERE `Mobile_No` = :mobile",
      {
        replacements: { mobile: req.body.mobileNo },
        type: paxDB.QueryTypes.SELECT,
      }
    );

    if (existingMobile.length > 0) {
     transaction.rollback();
      return res.status(400).json({
        success: false,
        message: "User mobile number already exists.",
      });
    }

   
    const existingEmail = await paxDB.query(
      "SELECT * FROM `admin_login` WHERE `Email_ID` = :email",
      {
        replacements: { email: req.body.email },
        type: paxDB.QueryTypes.SELECT,
      }
    );

    if (existingEmail.length > 0) {
     transaction.rollback();
      return res.status(400).json({
        success: false,
        message: "User email address already exists.",
      });
    }

   
    const newUserID = "CUST" + req.body.mobileNo.slice(-7);

    
    await paxDB.query(
      "INSERT INTO admin_login (user_name, Mobile_No, Email_ID, Password, CustID, reg_date, login_status, type, role_id, gender) VALUES (:fullname, :mobile, :email, :password, :custid, :regdate, :status, :type, :role, :gender)",
      {
        replacements: {
          fullname: req.body.name,
          mobile: req.body.mobileNo,
          email: req.body.email,
          password: await bcrypt.hash(req.body.password, 10),
          custid: newUserID,
          regdate: moment().format("YYYY-MM-DD HH:mm:ss"),
          status: "1", 
          type:req.body.type,
          role: req.body.role,
          gender: req.body.gender,
        },
        type: paxDB.QueryTypes.INSERT,
        transaction: transaction,
      }
    );

    await transaction.commit();

    return res.status(200).json({
      success: true,
      message: `User created successfully. UserID: ${newUserID}`,
    });
  } catch (error) {
  
   
    return res.status(500).json({
      success: false,
      message: "An error occurred while creating the user.",
      error: error.stack,
    });
  }
});



const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/kyc"); // Save files in 'uploads/kyc' directory
  },
  filename: function (req, file, cb) {
    cb(null, req.logedINUser + "_" + Date.now() + path.extname(file.originalname));
  },
});

const upload = multer({ storage: storage });

// Update KYC
router.put(
  "/updateKyc",
  auth.isAuthorized,
  upload.fields([{ name: "aadhaar", maxCount: 1 }, { name: "pan", maxCount: 1 }]), 
  async (req, res) => {
    try {
      console.log("Received Body:", req.body);
      console.log("Uploaded Files:", req.files);

      const validation = new Validator(req.body, {
        panno: "required|string",
        addhar: "required|string",
      });

      if (validation.fails()) {
        return res.status(400).json({
          success: false,
          message: "Validation failed: " + helper.firstErrorValidatorjs(validation),
        });
      }

      const { panno, addhar } = req.body;
      const aadhaarFile = req.files?.aadhaar?.[0]?.filename || null;
      const panFile = req.files?.pan?.[0]?.filename || null;

      if (!aadhaarFile || !panFile) {
        return res.status(400).json({ success: false, message: "Both Aadhaar and PAN proof are required." });
      }

      await paxDB.query(
        `UPDATE admin_login 
         SET PAN_Card = :panFile, 
             Aadhaar_Card = :aadhaarFile, 
             PAN_Number = :panno, 
             Aadhaar_Number = :addhar, 
             KYC_Status = 'Pending' 
         WHERE CustID = :userId`,
        {
          replacements: { 
            aadhaarFile, 
            panFile, 
            panno, 
            addhar, 
            userId: req.logedINUser 
          },
          type: paxDB.QueryTypes.UPDATE,
        }
      );

      return res.status(200).json({
        success: true,
        message: "KYC updated successfully. Verification is pending.",
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({
        success: false,
        message: "Error updating KYC.",
        error: error.message,
      });
    }
  }
);



//update profile
router.put(
  "/update-profile",
  auth.isAuthorized,
  upload.single("profile_pic"), 
  async (req, res) => {
    try {
      const validation = new Validator(req.body, {
        full_name: "required|string",
        email: "required|email",
        mobileNo: "required|regex:/^[6-9][0-9]{9}$/",
        // gender: "required|in:M,F",

      });

      const userId = req.logedINUser;

      if (validation.fails()) {
        return res.status(400).json({
          success: false,
          message: helper.firstErrorValidatorjs(validation),
        });
      }

      const { full_name, email, mobileNo, gender } = req.body;
      const profilePic = req.file ? req.file.filename : null; 

      await paxDB.query(
        `UPDATE admin_login 
         SET user_name = :full_name, 
             Email_ID = :email, 
             Mobile_No = :mobileNo, 

             profile_pic = :profilePic 
         WHERE CustID = :userId`,
        {
          replacements: { full_name, email, mobileNo,  profilePic, userId },
          type: paxDB.QueryTypes.UPDATE,
        }
      );

      return res.status(200).json({
        success: true,
        message: "Profile updated successfully.",
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({
        success: false,
        message: "Error updating profile.",
        error: error.message,
      });
    }
  }
);



//verify kyc
router.post("/verifyKYC", auth.isAuthorized, auth.isAdmin, async (req, res) => {
  try {
    const { userId, status } = req.body;

    if (!["Verified", "Rejected"].includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid status. Use 'Verified' or 'Rejected'." });
    }


    await paxDB.query(
      `UPDATE admin_login SET KYC_Status = :status WHERE CustID = :userId`,
      { replacements: { status, userId } }
    );

    return res.status(200).json({
      success: true,
      message: `KYC status updated to ${status}.`,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Error verifying KYC.",
      error: error.message,
    });
  }
});


//get user details
router.get("/get-user-details", auth.isAuthorized, async (req, res) => {
  try {
    const userId = req.logedINUser;

    if (!userId) {
      return res.status(400).json({ success: false, message: "User not found." });
    }

    const user = await paxDB.query(
      `SELECT 
        al.user_name AS full_name, 
        al.Email_ID AS email, 
        al.Mobile_No AS mobile_no, 
        al.gender, 
        al.KYC_Status AS kyc_status, 
        al.Aadhaar_Card, 
        al.PAN_Card, 
        al.Aadhaar_Number, 
        al.PAN_Number, 
        al.profile_pic, 
        ad.address1, 
        ad.address2, 
        ad.city, 
        ad.state, 
        ad.pincode, 
        ad.country 
      FROM admin_login al
      LEFT JOIN addresses ad ON al.CustID = ad.CustID
      WHERE al.CustID = :userId`,
      { replacements: { userId }, type: paxDB.QueryTypes.SELECT }
    );

    if (!user || user.length === 0) {
      return res.status(400).json({ success: false, message: "User not found." });
    }

    return res.status(200).json({
      success: true,
      user: user[0], // Assuming only one user per CustID
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Error fetching user details.",
      error: error.message,
    });
  }
});



module.exports = router;
