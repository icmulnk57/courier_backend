var createError = require("http-errors");
var express = require("express");
var https = require("https");
var http = require("http");
var path = require("path");
var cookieParser = require("cookie-parser");
var logger = require("morgan");
var cors = require("cors");
var compression = require("compression");
var nocache = require("nocache");
var bodyParser = require("body-parser");
const swaggerUi = require("swagger-ui-express");
const swaggerJsDoc = require("swagger-jsdoc");
const swaggerDocument = require("./swagger.json");
const moment = require("moment");
const crypto = require('crypto');
require("dotenv").config();


// File System
var fs = require("fs");

// Initialize SSL Certificates
// var https_options = {
//   key: fs.readFileSync("certificate/private.key"),
//   cert: fs.readFileSync("certificate/certificate.crt"),
//   ca: fs.readFileSync("certificate/ca_bundle.crt"),
// };

var app = express();

//timestamp: High-resolution time information.
//counterString: Ensures uniqueness for concurrent requests.
//randomSuffix: Adds randomness to avoid collisions.
//instanceId: Uniquely identifies the server instance.

const instanceId = crypto.randomBytes(4).toString('hex'); 
let requestCounter = 0; 

const generateLogId = (req, res, next) => {
 
  requestCounter = (requestCounter + 1) % 10000;
  const counterString = requestCounter.toString().padStart(4, '0');
  const randomSuffix = Math.floor(100 + Math.random() * 900); 
  req.myReqId = `${counterString}${randomSuffix}${instanceId}`; 
  next();
}
app.use(generateLogId);


// view engine setup
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "jade");

// log when user has hit the api endpoints

var accessLogStream = fs.createWriteStream(path.join(__dirname, "access.log"), { flags: "a" });
app.use(logger("combined", { stream: accessLogStream }));


app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(compression());
app.use(nocache());



// Initialize CORS
corsOptions = {
 
  origin: "*",
  optionsSuccessStatus: 200, // some legacy browsers (IE11, various SmartTVs) choke on 204
  methods: ["GET,HEAD,PUT,PATCH,POST,DELETE"],
};
app.use(cors(corsOptions));

// IMPORT AND INITIALIZE ROUTES
require("./routes/router")(app);


// swagger
const specs = swaggerJsDoc(swaggerDocument);
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(specs, { customCss: "https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/3.24.2/swagger-ui.css" }));

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  // next(createError(404));
  return res.status(404).send(require("./helper/backendProcess/error_404").error_404());
});

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get("env") === "development" ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render("error");
});

const port = process.env.PORT;

http
  .createServer(app, () => {
    timeout = 60000; //Miliseconds
  })
  .listen(port);

console.log(`server started at port ${port}`);
