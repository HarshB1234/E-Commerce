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
// const Address = require("./models/address");
const Banner = require("./models/banner");
const Wishlist = require("./models/wishlist");
const Policy = require("./models/policy");
const Contact = require("./models/contact");

// Package
const cors = require("cors");
const express = require("express");
const fileUpload = require("express-fileupload");

// PORT
const port = process.env.PORT || 8000;

// Routes
const register_router = require("./routes/register");
const login_router = require("./routes/login");
const category_router = require("./routes/category");
const product_router = require("./routes/product");
const attribute_router = require("./routes/attribute");
// const address_router = require("./routes/address");
// const payment_router = require("./routes/payment");
const banner_router = require("./routes/banner");
const wishlist_router = require("./routes/wishlist");
const policy_router = require("./routes/policy");
const contact_router = require("./routes/contact");

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
app.use(fileUpload());

// Controllers
app.use("/register", register_router);
app.use("/login", login_router);
app.use("/category", category_router);
app.use("/product", product_router);
app.use("/attribute", attribute_router);
// app.use("/address", address_router);
// app.use("/payment", payment_router);
app.use("/banner", banner_router);
app.use("/wishlist", wishlist_router);
app.use("/policy", policy_router);
app.use("/contact", contact_router);

// Listening
app.listen(port, () => {
    console.log(`Listening at ${port}`);
});