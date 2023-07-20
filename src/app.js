// ENV
const path = require("path");
require("dotenv").config({ path: __dirname + "/.env" });

// Database
const sequelize = require("./db/conn");
const mysql = require("mysql2");

// Models
sequelize.sync();
const User = require("./models/register");
const MainCategory = require("./models/mainCategory");
const Category = require("./models/category");
const SubCategory = require("./models/subCategory");
const Product = require("./models/product");
const Attribute = require("./models/attribute");
const Address = require("./models/address");

// Package
const cors = require("cors");
const express = require("express");

// PORT
const port = process.env.PORT || 8000;

// Routes
const register_router = require("./routes/register");
const login_router = require("./routes/login");
const category_router = require("./routes/category");
const product_router = require("./routes/product");
const attribute_router = require("./routes/attribute");
const address_router = require("./routes/address");

// Express App
const app = express();

// Middle Ware
app.use(cors({
    origin: "*",
    methods: "GET, POST, PUT, DELETE, PATCH",
    credentials: true,
}));
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: false }));

// Controllers
app.use("/register", register_router);
app.use("/login", login_router);
app.use("/category", category_router);
app.use("/product", product_router);
app.use("/attribute", attribute_router);
app.use("/address", address_router);

// Listening
app.listen(port, () => {
    console.log(`Listening at ${port}`);
});