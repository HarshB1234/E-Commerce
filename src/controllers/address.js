const { uuid } = require('uuidv4');
const Address = require("../models/address");

// Add Address

const addAddress = async (req, res) => {
    try {
        const { name, number, address, area, pincode, city, state } = req.body;

        if (!(name && number && address && area && pincode && city && state)) {
            return res.status(400).json({"msg": "Some field is empty."});
        }

        await Address.create({
            Id: uuid(),
            U_Id: req.user.Id,
            Name: name,
            Number: number,
            Address: address,
            Area: area,
            Pincode: pincode,
            City: city,
            State: state
        }).then(() => {
            res.status(201).json({ "msg": "Address created." })
        }).catch((err) => {
            res.send(err);
        })
    } catch (err) {
        res.send(err);
    }
};

// Get Address List

const getAddressList = async (req, res) => {
    try {
        await Address.findAll({
            attributes: { exclude: ["U_Id"] }
        }).then((list) => {
            res.status(200).json(list);
        }).catch((err) => {
            res.send(err);
        });
    } catch (err) {
        res.send(err);
    }
};

// Delete Address

const deleteAddress = async (req, res) => {
    try {
        const Id = req.params.id;

        await Address.destroy({
            where: {
                Id
            }
        }).then(() => {
            res.status(200).json({ "msg": "Deleted successfully." });
        }).catch((err) => {
            res.send(err);
        });
    } catch (err) {
        res.send(err);
    }
};

module.exports = {addAddress, getAddressList, deleteAddress}