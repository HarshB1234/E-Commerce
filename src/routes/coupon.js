const express = require("express");
const router = express.Router();
const Auth = require("../middleware/auth");
const { addCoupon, couponList, deleteCoupon } = require("../controllers/coupon");

// Add 
router.route("/add").post(Auth, addCoupon);

// Get
router.route("/list/:amount").get(Auth, couponList);

// Delete
router.route("/delete/:id").delete(Auth, deleteCoupon);

module.exports = router