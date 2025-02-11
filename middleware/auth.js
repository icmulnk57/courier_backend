var jwt = require("jsonwebtoken");

module.exports.isAuthorized = function (req, res, next) {
  let token = req.headers["authorization"];

  if (token && token.startsWith("Bearer ")) {
    token = token.slice(7, token.length);
  } else {
    return res.status(401).json({
      message: "Token identification mismatched. Please login again.",
    });
  }

  jwt.verify(token, process.env.JWT_SECRET, function (err, decoded) {
    if (err) {
      return res.status(401).json({
        message: "Token authentication failed. Please login again.",
      });
    }

  
    req.logedINUser = decoded.userId; 
    req.kycStatus = decoded.kyc_status;
    req.type = decoded.type;  

    next();
  });
};

module.exports.isAdmin = function (req, res, next) {
  if (req.type !== "admin") {  
    return res.status(403).json({
      success: false,
      message: "Unauthorized. Only admins can access this route.",
    });
  }
  next();
};

// Check KYC verification status
module.exports.checkKYC = function (req, res, next) {
  if (req.kycStatus !== "Verified") {
    return res.status(403).json({
      success: false,
      message: "Access denied. KYC verification is pending.",
    });
  }
  next();
};
