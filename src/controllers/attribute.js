const { uuid } = require('uuidv4');
const Attribute = require("../models/attribute");

// Add

const addAttribute = async (req, res) => {
    try {
        const { name, g_name } = req.body;

        if (!(name && g_name)) {
            return res.status(400).json({"msg": "Some field is empty."});
        }

        await Attribute.create({
            Id: uuid(),
            Name: name,
            G_Name: g_name
        }).then(() => {
            res.status(201).json({ "msg": "Attribute created." })
        }).catch((err) => {
            res.status(409).json({ "msg": "Attribute already exists." });
        })
    } catch (err) {
        res.send(err);
    }
};

// Get

const getAttributesGroupList = async (req, res) => {
    try {
        await Attribute.findAll({
            attributes: ["G_Name"],
            group: ["G_Name"]
        }).then((list) => {
            res.status(200).json(list);
        }).catch((err) => {
            res.send(err);
        });
    } catch (err) {
        res.send(err);
    }
};

const getAttributesList = async (req, res) => {
    try {
        await Attribute.findAll({
            attributes: ["Id", "Name", "G_Name"],
            order: [["G_Name"]]
        }).then((list) => {
            res.status(200).json(list);
        }).catch((err) => {
            res.send(err);
        });
    } catch (err) {
        res.send(err);
    }
};

module.exports = { addAttribute, getAttributesGroupList, getAttributesList }