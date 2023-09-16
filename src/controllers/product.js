const { Op, QueryTypes } = require("sequelize");
const { uuid } = require("uuidv4");
const jwt = require("jsonwebtoken");
const Product = require("../models/product");
const Wishlist = require("../models/wishlist");
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
        let { name, brand, description, sizeQuantity, price, sPrice, attributes, mId, cId, sId, active } = req.body;
        let image = req.files.image;

        if (!(name && brand && description && sizeQuantity && price && sPrice && attributes && mId && cId && sId)) {
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
            Name: name,
            Image: { "images": imagePath },
            Brand: brand,
            Description: description,
            Size_Quantity: sizeQuantityToAdd,
            Price: price,
            S_Price: sPrice,
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
            attributes: ["Id", "Name", "Image", "Brand", "Price", "S_Price", "Active"]
        }).then((item) => {
            res.status(200).json(item);
        }).catch((err) => {
            res.send(err);
        })
    } catch (err) {
        res.send(err);
    }
};

const productListById = async (req, res) => {
    try {
        const {id, token} = req.params;

        if(token != "nToken"){
            let list;
            const verifyUser = jwt.verify(token, process.env.JWT_SECRET_KEY);

            await Wishlist.findOne({
                attributes: ["P_Id"],
                where: {
                    U_Id: verifyUser.Id
                }
            }).then(async (item) => {
                if(item){
                    list = item.dataValues.P_Id.products;

                    await Product.findAll({
                        attributes: ["Id", "Name", "Image", "Brand", "Price", "S_Price", "Wishlist_Status"],
                        where: {
                            [Op.or]: {
                                M_Id: id,
                                S_Id: id
                            },
                            Active: true
                        },
                        offset: ((Number(req.params.number)-1)*15),
                        limit: 15
                    }).then((item) => {
                        let productList = item;
            
                        for(let i in productList){
                            let temp = productList[i].dataValues;
                            let id = temp.Id;
                            let exists = list.includes(id);
                            
                            if(exists){
                                temp.Wishlist_Status = 1;
                                list.splice(i, 1, temp);
                            }
                        }
            
                        return res.status(200).json(productList);
                    }).catch((err) => {
                        return res.send(err);
                    });
                }else{
                    await Product.findAll({
                        attributes: ["Id", "Name", "Image", "Brand", "Price", "S_Price", "Wishlist_Status"],
                        where: {
                            [Op.or]: {
                                M_Id: id,
                                S_Id: id
                            },
                            Active: true
                        },
                        offset: ((Number(req.params.number)-1)*15),
                        limit: 15
                    }).then((item) => {
                        return res.status(200).json(item);
                    }).catch((err) => {
                        return res.send(err);
                    });
                }
            }).catch((err) => {
                return res.send(err);
            });
        }else{
            await Product.findAll({
                attributes: ["Id", "Name", "Image", "Brand", "Price", "S_Price", "Wishlist_Status"],
                where: {
                    [Op.or]: {
                        M_Id: id,
                        S_Id: id
                    },
                    Active: true
                },
                offset: ((Number(req.params.number)-1)*15),
                limit: 15
            }).then((item) => {
                return res.status(200).json(item);
            }).catch((err) => {
                return res.send(err);
            });
        }
    } catch (err) {
        res.send(err);
    }
};

const filterProductList = async (req, res) => {
    try {
        let query = req.query;
        let id = req.params.id;
        let queryKeys = Object.keys(query);
        let queryValues = Object.values(query);

        let sql = `SELECT Id, Name, Image, Brand, Price, S_Price FROM Products AS Product WHERE Product.M_Id = "${id}" OR Product.S_Id = "${id}"AND Product.Active = true`;

        let attributesObject = {};

        for(let i of queryValues){
            if(i == "Min" || i == "Max"){
                continue;
            }
            attributesObject[i] = [];
        }

        let price = {};

        for (let i in queryValues) {
            if(i == "Min" || i == "Max"){
                price[i] = queryKeys[i];
            }else{
                for(let k in attributesObject){  
                    if (k == queryValues[i]) {
                        let temp = attributesObject[k];
                        temp.push(queryKeys[i]);
                        attributesObject[k] = temp;
                    }
                }
            }
        }

        for(let i in attributesObject){
            let temp = attributesObject[i];
            for(let j in temp){
                if (j == 0) {
                    sql += " AND ";
                }
                sql += `json_unquote(json_extract(Product.Attributes,'$.\"${temp[j]}\"')) = \'${i}\'`;
                if (i != (temp.length - 1)) {
                    sql += " OR ";
                }
            }
        }

        sql += ` AND Product.Price BETWEEN ${price["Min"]} AND ${price["Max"]} LIMIT 15 OFFSET ${((Number(req.params.number)-1)*15)},
        limit: 15`;

        await sequelize.query(sql, { type: QueryTypes.SELECT }).then((item) => {
            res.status(200).json(item);
        }).catch((err) => {
            res.send(err);
        });
    } catch (err) {
        res.send(err);
    }
};

// const filterProductList = async (req, res) => {
//     try {
//         let query = req.query;
//         let S_Id = req.params.id;
//         let queryKeys = Object.keys(query);
//         let queryValues = Object.values(query);

//         let sql = `SELECT Id, Name, Image, Brand, Price, S_Price FROM Products AS Product WHERE Product.S_Id = "${S_Id}" AND Product.Active = true`;

//         let size = [];
//         let color = [];
//         let brand = [];
//         let price = [0, 1];

//         for(let i in queryValues){
//             if (queryValues[i] == "Size") {
//                 size.push(queryKeys[i]);
//             }
//             if (queryValues[i] == "Color") {
//                 color.push(queryKeys[i]);
//             }
//             if (queryValues[i] == "Brand") {
//                 brand.push(queryKeys[i]);
//             }
//             if (queryValues[i] == "Min") {
//                 price.splice(0, 1, Number(queryKeys[i]));
//             }
//             if (queryValues[i] == "Max") {
//                 price.splice(1, 1, Number(queryKeys[i]));
//             }
//         }

//         for (let i in size) {
//             if (i == 0) {
//                 sql += " AND ";
//             }
//             sql += `json_unquote(json_extract(Product.Attributes,'$.\"${size[i]}\"')) = 'Size'`;
//             if (i != (size.length - 1)) {
//                 sql += " OR ";
//             }
//         }
//         for (let i in color) {
//             if (i == 0) {
//                 sql += " AND ";
//             }
//             sql += `json_unquote(json_extract(Product.Attributes,'$.\"${color[i]}\"')) = 'Color'`;
//             if (i != (color.length - 1)) {
//                 sql += " OR ";
//             }
//         }
//         for (let i in brand) {
//             if (i == 0) {
//                 sql += " AND ";
//             }
//             sql += `json_unquote(json_extract(Product.Attributes,'$.\"${brand[i]}\"')) = 'Brand'`;
//             if (i != (brand.length - 1)) {
//                 sql += " OR ";
//             }
//         }

//         if (price.length > 0) {
//             sql += ` AND Product.Price BETWEEN ${price[0]} AND ${price[1]}`;
//         };

//         await sequelize.query(sql, { type: QueryTypes.SELECT }).then((item) => {
//             res.status(200).json(item);
//         }).catch((err) => {
//             res.send(err);
//         });
//     } catch (err) {
//         res.send(err);
//     }
// };

const productById = async (req, res) => {
    try {
        const Id = req.params.id;

        await Product.findOne({
            attributes: ["Id", "Name", "Image", "Brand", "Description", "Size_Quantity", "Price", "S_Price", "Attributes"],
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
        let { id, name, brand, description, sizeQuantity, price, sPrice, attributes } = req.body;
        let image = req.files.image;

        if (!(id && name && brand && description && sizeQuantity && attributes && price && sPrice)) {
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
            S_Price: sPrice,
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

module.exports = { addProduct, productList, productListById, filterProductList, productById, activeProduct, updateProduct, deleteProduct }