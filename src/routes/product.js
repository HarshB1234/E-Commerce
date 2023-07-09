const express = require("express");
const router = express.Router();
const Auth = require("../middleware/auth");
const { addProduct, productList, productListById, filterProductList, productById, activeProduct, updateProduct, deleteProduct } = require("../controllers/product");

// Add 
router.route("/add").post(Auth, addProduct);

// Get
router.route("/list").get(productList);
router.route("/list/:id").get(productListById);
router.route("/filter/:id").get(filterProductList);
router.route("/:id").get(productById);

// Update
router.route("/update").put(Auth, updateProduct);
router.route("/active").post(Auth, activeProduct);

// Delete
router.route("/delete/:id").delete(Auth, deleteProduct);

module.exports = router