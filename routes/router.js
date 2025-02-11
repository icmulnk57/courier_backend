module.exports = function (app) {
    app.use("/auth", require("./auth/login"));
    app.use("/admin", require("./ADMIN/CUSTOMER/user"));
    app.use("/order", require("./order/order"));
    // app.use("/payment", require("./payment/wallet"));
    app.use("/payment", require("./payment/payment"));
    app.use("/multiboxorder", require("./order/multiboxorder"));
    app.use("/cashfree", require("./payment/cashfreeGateway"));

}