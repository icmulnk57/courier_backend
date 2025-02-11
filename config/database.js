require("dotenv").config();

const { Sequelize } = require("sequelize");

let options = {
  multipleStatements: true,
  connectTimeout: 180000,
  connectionLimit: 10,
  waitForConnections: true,
  queueLimit: 0,
};
let poolOption = {
  max: 100,
  min: 0,
  idle: 10000,
  acquire: 100 * 1000,
};



const paxDb = new Sequelize(process.env.DB_PAX, process.env.DB_USER, process.env.DB_PASS, {
  host: process.env.DB_HOST,
  dialect: "mysql",
  dialectOptions: options,
  pool: poolOption,
});



console.log("Connecting to database...");

paxDb
  .authenticate()
  .then(() => {
    console.log("Connection has been established successfully.");
  })
  .catch((err) => {
    console.error("Unable to connect to the database:", err);
  });

module.exports = { paxDB: paxDb };
