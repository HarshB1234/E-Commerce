const express = require("express");
const router = express.Router();
const Auth = require("../middleware/auth");
const { generateOrderId, paymentVerification } = require("../controllers/payment");

router.route("/:amount").get(Auth, generateOrderId);

router.route("/verify").post(Auth, paymentVerification);

module.exports = router