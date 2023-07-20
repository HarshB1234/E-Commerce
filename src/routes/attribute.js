const express = require("express");
const router = express.Router();
const Auth = require("../middleware/auth");
const { addAttribute, getAttributesGroupList, getAttributesList, getAttributesListForProduct, deleteAttribute } = require("../controllers/attribute");

// Add
router.route("/add").post(Auth, addAttribute);

// Get
router.route("/group").get(Auth, getAttributesGroupList);
router.route("/list").get(Auth, getAttributesList);
router.route("/list/product").get(Auth, getAttributesListForProduct);

// Delete
router.route("/delete/:id").delete(Auth, deleteAttribute);

module.exports = router