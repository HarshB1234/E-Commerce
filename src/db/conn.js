const { Sequelize } = require("sequelize");

const sequelize = new Sequelize("ecommerce", "root", process.env.DATABASE_PASSWORD, {
    host: "localhost",
    dialect: "mysql"
});

try {
    sequelize.authenticate();
    console.log("Connection has been established successfully.");
} catch (error) {
    console.error("Unable to connect to the database:", error);
}

module.exports = sequelize