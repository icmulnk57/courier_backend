exports.firstErrorValidatorjs = (obj) => {
    return Object.values(obj.errors.all())[0][0];
  };

  exports.getCurrentTime = () => {
    return moment(new Date()).tz("Asia/Kolkata").format("HH:mm:ss");
  };
  exports.getCurrentDate = () => {
    return moment(new Date()).tz("Asia/Kolkata").format("YYYY-MM-DD");
  };


  function trimObjectP(obj) {
    if (typeof obj === "string") {
      return obj.trimEnd().trimStart();
    } else if (Array.isArray(obj)) {
      return obj.map(trimObjectP);
    } else if (typeof obj === "object" && obj !== null) {
      for (let key in obj) {
        if (obj.hasOwnProperty(key)) {
          obj[key] = trimObjectP(obj[key]);
        }
      }
    }
    return obj;
  }
  
  exports.trimObjectValueStartEnd = (obj) => {
    return trimObjectP(obj);
  };


 //Function to setup Razorpay instance and create an order
exports.createRazorpayOrder = async (amount, currency, receipt) => {
  try {
    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });

    const options = {
      amount: amount * 100, // Amount in paise (smallest currency unit)
      currency: currency, // INR, USD, etc.
      receipt: receipt, // Receipt ID
      payment_capture: 1, // Automatically capture the payment
    };

    const response = await razorpay.orders.create(options);
    return response; // Return the Razorpay order response
  } catch (error) {
    console.error("Error creating Razorpay order:", error);
    throw new Error("Failed to create Razorpay order.");
  }
};
  