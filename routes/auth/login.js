const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const router = express.Router();
const {paxDB} = require("./../../config/database");
const helper = require("./../../helper/helper");
const Validator = require("validatorjs");

/** 
 * @swagger
 * /auth/signin:
 *   post:
 *     summary: Login
 *     tags: [Auth]
 *     security:
 *       - Authorization: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 token:
 *                   type: string
 *       400:
 *         description: Bad request.
 *   
 */

router.post("/signin", async (req, res) => {
  try {
    const { username, password } = req.body;

    const validator = new Validator(req.body, {
      username: "required",
      password: "required",
    });

    if (validator.fails()) {
      return res.status(400).json({
        success: false,
        message: helper.firstErrorValidatorjs(validator),
      });
    } 

    const [user] = await paxDB.query(
      "SELECT * FROM admin_login WHERE user_name = :username OR Email_ID = :username",
      {
        replacements: { username },
        type: paxDB.QueryTypes.SELECT,
      }
    );

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid username or password.",
      });
    }

    const isPasswordValid = await bcrypt.compare(password, user.Password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid username or password.",
      });
    }

    // Check KYC Status
    if (user.KYC_Status === "pending") {  
      return res.status(403).json({
        success: false,
        message: "KYC verification is pending. Please submit your KYC documents.",
      });
    }

    const token = jwt.sign(
      { userId: user.CustID, email: user.Email_ID, type: user.type, kyc_status: user.KYC_Status },
      process.env.JWT_SECRET,
      { expiresIn: "12h" }
    );

    return res.status(200).json({
      success: true,
      message: "Login successful.",
      token,
      user: {
        userId: user.CustID,
        username: user.user_name,
        email: user.Email_ID,
        type: user.type,
        kyc_status: user.KYC_Status,
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "An error occurred during login.",
      error: error.message,
    });
  }
});


module.exports = router;