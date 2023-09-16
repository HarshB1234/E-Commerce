const express = require("express");
const router = express.Router();
const Auth = require("../middleware/auth");
const { addProduct, productList, productListById, filterProductList, productById, activeProduct, updateProduct, deleteProduct } = require("../controllers/product");

// Add 
router.route("/add").post(Auth, addProduct);

// Get
router.route("/list").get(productList);
router.route("/list/:id/:number/:token").get(productListById);
router.route("/filter/:id/:number").get(filterProductList);
router.route("/:id").get(productById);

// Update
router.route("/update").put(Auth, updateProduct);
router.route("/active").patch(Auth, activeProduct);

// Delete
router.route("/delete/:id").delete(Auth, deleteProduct);

module.exports = router