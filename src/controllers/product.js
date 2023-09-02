const { Op, QueryTypes } = require("sequelize");
const { uuid } = require("uuidv4");
const Product = require("../models/product");
const sequelize = require("../db/conn");
const aws = require("aws-sdk");

// AWS Configure

const awsConfig = {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
};

const S3 = new aws.S3(awsConfig);

// Function to upload and delete image

const uploadToS3 = (bufferData, type) => {
    return new Promise((resolve, reject) => {
        const params = {
            Bucket: process.env.AWS_BUCKET_NAME,
            Key: `${Date.now().toString()}.${type}`,
            Body: bufferData
        };

        S3.upload(params, (err, data) => {
            if (err) {
                reject(err);
            }

            return resolve(data);
        })
    })
}

const deleteToS3 = (name) => {
    return new Promise((resolve, reject) => {
        const params = {
            Bucket: process.env.AWS_BUCKET_NAME,
            Key: name,
        };

        S3.deleteObject(params, (err, data) => {
            if (err) {
                reject(err);
            }

            return resolve(data);
        })
    })
}

// Add Product

const addProduct = async (req, res) => {
    try {
        let { name, brand, description, sizeQuantity, price, attributes, mId, cId, sId, active } = req.body;
        let image = req.files.image;

        if (!(name && brand && description && sizeQuantity && price && attributes && mId && cId && sId)) {
            return res.status(400).json({ "msg": "Some field is empty." });
        }

        sizeQuantity = JSON.parse(req.body.sizeQuantity);
        let sizeQuantityToAdd = {};

        for (let i of sizeQuantity) {
            let k = Object.keys(i);
            let v = Object.values(i);
            sizeQuantityToAdd[k[0]] = v[0];
        }

        var imagePath = [];

        for (let i of image) {
            let str = i.mimetype;
            let lastIndex = str.lastIndexOf("/");
            let type = str.substring(lastIndex + 1);
            await uploadToS3(i.data, type).then((result) => {
                imagePath.push(result.Location);
            });
        }

        await Product.create({
            Id: uuid(),
            U_Id: req.user.Id,
            Name: name,
            Image: { "images": imagePath },
            Brand: brand,
            Description: description,
            Size_Quantity: sizeQuantityToAdd,
            Price: price,
            Attributes: JSON.parse(attributes),
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
            res.status(200).json(item);
        }).catch((err) => {
            res.send(err);
        })
    } catch (err) {
        res.send(err);
    }
};

const productListByMainId = async (req, res) => {
    try {
        const M_Id = req.params.id;

        await Product.findAll({
            attributes: ["Id", "Name", "Image", "Brand", "Price"],
            where: {
                M_Id,
                Active: true
            }
        }).then((item) => {
            res.status(200).json(item);
        }).catch((err) => {
            res.send(err);
        });
    } catch (err) {
        res.send(err);
    }
};

const productListBySubId = async (req, res) => {
    try {
        const S_Id = req.params.id;

        await Product.findAll({
            attributes: ["Id", "Name", "Image", "Brand", "Price"],
            where: {
                S_Id,
                Active: true
            }
        }).then((item) => {
            res.status(200).json(item);
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
                // break;
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
            res.status(200).json(item);
        }).catch((err) => {
            res.send(err);
        });
    } catch (err) {
        res.send(err);
    }
};

const productById = async (req, res) => {
    try {
        const Id = req.params.id;

        await Product.findOne({
            attributes: ["Id", "Name", "Image", "Brand", "Description", "Size_Quantity", "Price"],
            where: {
                Id
            }
        }).then((item) => {
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
            res.status(200).json({ "msg": "Product status updated successfully." });
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
        let { id, name, brand, description, sizeQuantity, price, attributes } = req.body;
        let image = req.files.image;

        if (!(id && name && brand && description && sizeQuantity && attributes && price)) {
            return res.status(400).json({ "msg": "Some field is empty." });
        }

        sizeQuantity = JSON.parse(req.body.sizeQuantity);
        let sizeQuantityToAdd = {};

        for (let i of sizeQuantity) {
            let k = Object.keys(i);
            let v = Object.values(i);
            sizeQuantityToAdd[k[0]] = v[0];
        }

        var imagePath = [];

        for (let i of image) {
            let str = i.mimetype;
            let lastIndex = str.lastIndexOf("/");
            let type = str.substring(lastIndex + 1);
            await uploadToS3(i.data, type).then((result) => {
                imagePath.push(result.Location);
            });
        }

        await Product.findOne({
            attributes: ["Image"],
            where: {
                Id: id
            }
        }).then(async (item) => {
            let image = item.dataValues.Image.images;

            for (let i of image) {
                let lastIndex = i.lastIndexOf("/");
                let name = i.substring(lastIndex + 1);
                await deleteToS3(name).then((result) => {
                    console.log(result);
                });
            }
        }).catch((err) => {
            res.send(err);
        });

        await Product.update({
            Name: name,
            Image: { "images": imagePath },
            Brand: brand,
            Description: description,
            Size_Quantity: sizeQuantityToAdd,
            Price: price,
            Attributes: JSON.parse(req.body.attributes)
        }, {
            where: {
                Id: id
            }
        }).then((data) => {
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

        await Product.findOne({
            attributes: ["Image"],
            where: {
                Id
            }
        }).then(async (item) => {
            let image = item.dataValues.Image.images;

            for (let i of image) {
                let lastIndex = i.lastIndexOf("/");
                let name = i.substring(lastIndex + 1);
                await deleteToS3(name).then((result) => {
                    console.log(result);
                });
            }
        }).catch((err) => {
            res.send(err);
        });

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

module.exports = { addProduct, productList, productListByMainId, productListBySubId, filterProductList, productById, activeProduct, updateProduct, deleteProduct }