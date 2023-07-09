const express = require("express");
const router = express.Router();
const Auth = require("../middleware/auth");
const { addAttribute, getAttributesGroupList, getAttributesList } = require("../controllers/attribute");

router.route("/add").post(Auth, addAttribute);
router.route("/group").get(Auth, getAttributesGroupList);
router.route("/list").get(Auth, getAttributesList);

module.exports = router