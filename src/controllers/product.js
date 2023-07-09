const { Op, QueryTypes } = require("sequelize");
const { uuid } = require('uuidv4');
const Product = require("../models/product");
const sequelize = require("../db/conn");

// Add Product

const addProduct = async (req, res) => {
    try {
        let { name, image, brand, description, sizeQuantity, price, attributes, mId, cId, sId, active } = req.body;

        if (!(name && image && brand && description && sizeQuantity && price && attributes && mId && cId && sId)) {
            return res.status(400).json({ "msg": "Some field is empty." });
        }

        await Product.create({
            Id: uuid(),
            Name: name,
            Image: image.toString(),
            Brand: brand,
            Description: description,
            Size_Quantity: sizeQuantity,
            Price: price,
            Attributes: attributes,
            M_Id: mId,
            C_Id: cId,
            S_Id: sId,
            Active: active
        }).then(() => {
            res.status(201).json({ "msg": "Product added." });
        }).catch((err) => {
            res.send(err);
        });
    } catch (err) {
        res.send(err);
    }
};

// Get Product List

const productList = async (req, res) => {
    try {
        await Product.findAll({
            attributes: ["Id", "Name", "Image", "Brand", "Price", "Active"]
        }).then((item) => {
            let finalList = item;

            for (let i = 0; i < finalList.length; i++) {
                let j = finalList[i];
                j.Image = j.Image.split(",");
                finalList.splice(i, 1, j);
            }

            res.status(200).json(finalList);
        }).catch((err) => {
            res.send(err);
        })
    } catch (err) {
        res.send(err);
    }
};

const productListById = async (req, res) => {
    try {
        const S_Id = req.params.id;

        await Product.findAll({
            attributes: ["Id", "Name", "Image", "Brand", "Price"],
            where: {
                S_Id,
                Active: true
            }
        }).then((item) => {
            let finalList = item;

            for (let i = 0; i < finalList.length; i++) {
                let j = finalList[i];
                j.Image = j.Image.split(",");
                finalList.splice(i, 1, j);
            }

            res.status(200).json(finalList);
        }).catch((err) => {
            res.send(err);
        });
    } catch (err) {
        res.send(err);
    }
};

const filterProductList = async (req, res) => {
    try {
        let query = req.query;
        let S_Id = req.params.id;
        let queryKeys = Object.keys(query);
        let queryValues = Object.values(query);

        let sql = `SELECT Id, Name, Image, Brand, Price FROM Products AS Product WHERE Product.S_Id = "${S_Id}" AND Product.Active = true`;

        let size = [];
        let color = [];
        let brand = [];
        let price = [];

        for (let i in queryValues) {
            if (queryValues[i] == "Size") {
                size.push(queryKeys[i]);
            }
            if (queryValues[i] == "Color") {
                color.push(queryKeys[i]);
            }
            if (queryValues[i] == "Brand") {
                brand.push(queryKeys[i]);
            }
            if (queryValues[i] == "Min") {
                price.push(Number(queryKeys[i]));
            }
            if (queryValues[i] == "Max") {
                price.push(Number(queryKeys[i]));
                break;
            }
        }

        for (let i in size) {
            if (i == 0) {
                sql += " AND ";
            }
            sql += `json_unquote(json_extract(Product.Attributes,'$.\"${size[i]}\"')) = 'Size'`;
            if (i != (size.length - 1)) {
                sql += " OR ";
            }
        }
        for (let i in color) {
            if (i == 0) {
                sql += " AND ";
            }
            sql += `json_unquote(json_extract(Product.Attributes,'$.\"${color[i]}\"')) = 'Color'`;
            if (i != (color.length - 1)) {
                sql += " OR ";
            }
        }
        for (let i in brand) {
            if (i == 0) {
                sql += " AND ";
            }
            sql += `json_unquote(json_extract(Product.Attributes,'$.\"${brand[i]}\"')) = 'Brand'`;
            if (i != (brand.length - 1)) {
                sql += " OR ";
            }
        }

        if (price.length > 0) {
            sql += ` AND Product.Price BETWEEN ${price[0]} AND ${price[1]}`;
        };

        await sequelize.query(sql, { type: QueryTypes.SELECT }).then((item) => {
            let finalList = item;

            for (let i = 0; i < finalList.length; i++) {
                let j = finalList[i];
                j.Image = j.Image.split(",");
                finalList.splice(i, 1, j);
            }

            res.status(200).json(finalList);
        }).catch((err) => {
            console.log(err);
            res.send(err);
        });
    } catch (err) {
        console.log(err, "out");
        res.send(err);
    }
};

const productById = async (req, res) => {
    try {
        const Id = req.params.id;

        await Product.findOne({
            attributes: ["Id", "Name", "Image", "Brand", "Description", "Size_Quantity", "Price", "Active"],
            where: {
                Id
            }
        }).then((item) => {
            item.Image = item.Image.split(",");

            res.status(200).json(item);
        }).catch((err) => {
            res.send(err);
        })
    } catch (err) {
        res.send(err);
    }
};

// Active Product

const activeProduct = async (req, res) => {
    try {
        const { id, active } = req.body;

        if (!id) {
            return res.status(400).json({ "msg": "Some field is empty." });
        }

        await Product.update({
            Active: active
        }, {
            where: {
                Id: id
            }
        }).then(() => {
            res.status(200).json({ "msg": "Updated successfully." });
        }).catch((err) => {
            res.send(err);
        });
    } catch (err) {
        res.send(err);
    }
};

// Update Product

const updateProduct = async (req, res) => {
    try {
        let { id, name, image, brand, description, sizeQuantity, price, attributes, mId, cId, sId, active } = req.body;

        if (!(id && name && image && brand && description && sizeQuantity && attributes && price && mId && cId && sId)) {
            return res.status(400).json({ "msg": "Some field is empty." });
        }

        await Product.update({
            Name: name,
            Image: image.toString(),
            Brand: brand,
            Description: description,
            Size_Quantity: sizeQuantity,
            Price: price,
            Attributes: attributes,
            M_Id: mId,
            C_Id: cId,
            S_Id: sId,
            Active: active
        }, {
            where: {
                Id: id
            }
        }).then(() => {
            res.status(200).json({ "msg": "Updated successfully." });
        }).catch((err) => {
            res.send(err);
        });
    } catch (err) {
        res.send(err);
    }
};

// Delete Product

const deleteProduct = async (req, res) => {
    try {
        const Id = req.params.id;

        await Product.destroy({
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

module.exports = { addProduct, productList, productListById, filterProductList, productById, activeProduct, updateProduct, deleteProduct }