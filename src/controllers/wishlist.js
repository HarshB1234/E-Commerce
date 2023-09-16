const { uuid } = require("uuidv4");
const Wishlist = require("../models/wishlist");
const Product = require("../models/product");

// Add Product

const addToWishlist = async (req, res) => {
    try {
        const { pId } = req.body;

        if (!pId) {
            return res.status(400).json({ "msg": "Some field is empty." });
        }

        await Wishlist.findOne({
            attributes: ["P_Id"],
            where:{
                U_Id: req.user.Id
            }
        }).then(async (item) => {
            if(!item){
                let productList = [pId];

                await Wishlist.create({
                    Id: uuid(),
                    U_Id: req.user.Id,
                    P_Id: { "products": productList }
                }).then(() => {
                    return res.status(201).json({ "msg": "Product added in wishlist." });
                }).catch((err) => {
                    return res.send(err);
                }); 
            }else{
                let productList = item.dataValues.P_Id.products;
                productList.push(pId);
    
                await Wishlist.update({
                    P_Id: { "products": productList }
                },{
                    where: {
                        U_Id: req.user.Id,
                    }
                }).then(() => {
                    return res.status(201).json({ "msg": "Product added in wishlist." });
                }).catch((err) => {
                    return res.send(err);
                });
            }
        }).catch((err) => {
            res.send(err);
        });
    } catch (err) {
        res.send(err);
    }
};

// Get Wishlist List

const wishlistList = async (req, res) => {
    try {
        let listToSend = [];
        
        await Wishlist.findOne({
            attributes: ["P_Id"],
            where: {
                U_Id: req.user.Id
            }
        }).then(async (item) => {
            if(item){
                let list = item.dataValues.P_Id.products;
    
                for(let i of list){
                    await Product.findOne({
                        attributes: ["Id", "Name", "Image", "Brand", "Price", "S_Price"],
                        where: {
                            Id: i
                        }
                    }).then((item) => {
                        listToSend.push(item);
                    }).catch((err) => {
                        res.send(err);
                    })
                }
    
                return res.status(200).json(listToSend);
            }else{
                return res.status(200).json(listToSend);
            }
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

        await Wishlist.findOne({
            attributes: ["P_Id"],
            where: {
                U_Id: req.user.Id
            }
        }).then(async (item) => {
            let list = item.dataValues.P_Id.products;
            let pIndex = list.indexOf(Id);
            list.splice(pIndex, 1);

            await Wishlist.update({
                "P_Id": {"products": list}
            },{
                where: {
                    U_Id: req.user.Id
                }
            }).then(() => {
                return res.status(200).json({ "msg": "Product deleted successfully." });
            }).catch((err) => {
                return res.send(err);
            }); 
        }).catch((err) => {
            res.send(err);
        }); 
    } catch (err) {
        res.send(err);
    }
};

module.exports = {addToWishlist, wishlistList, deleteProduct}