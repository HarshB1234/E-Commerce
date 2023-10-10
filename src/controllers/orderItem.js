const { uuid } = require("uuidv4");
const { Op } = require("sequelize");
const Product = require("../models/product");
const Order = require("../models/order");
const OrderItem = require("../models/orderItem");

// Get Order Item List

const getOrderItemListAdmin = async (req, res) => {
    try {
        await Order.findOne({
            attributes: ["OI_Id", "Order_Status"],
            where: {
                Id: req.params.id
            }
        }).then(async (details) => {
            let temp = details.dataValues;

            await OrderItem.findAll({
                attributes: { exclude: ["Price", "createdAt", "updatedAt"] },
                where: {
                    Id: {
                        [Op.or]: temp.OI_Id.orderItemId
                    }
                }
            }).then(async (list) => {
                let listToSend = [];

                for (let i in list) {
                    let j = list[i].dataValues;

                    await Product.findOne({
                        attributes: ["Name", "Image", "Brand"],
                        where: {
                            Id: j.P_Id
                        }
                    }).then((details) => {
                        if (details) {
                            let productDetails = details.dataValues;

                            j.Name = productDetails.Name;
                            j.Image = productDetails.Image;
                            j.Brand = productDetails.Brand;
                            j.Quantity = Object.values(j.Size_Quantity)[0];
                            j.Cancel_Status = false;
                            j.Return_Status = false;

                            if (temp.Order_Status == "Pending") {
                                j.Cancel_Status = true;
                            }

                            if (temp.Order_Status == "Delivered") {
                                j.Return_Status = true;
                            }

                            listToSend.push(j);
                        }
                    }).catch((err) => {
                        return res.send(err);
                    });
                }

                res.status(200).send(listToSend);
            }).catch((err) => {
                return res.send(err);
            });
        }).catch((err) => {
            res.send(err);
        });
    } catch (err) {
        res.send(err);
    }
}

const getOrderItemList = async (req, res) => {
    try {
        let listToSend = [];

        await Order.findAll({
            attributes: ["OI_Id", "Order_Status"],
            where: {
                U_Id: req.user.Id
            },
            order: [["createdAt", "DESC"]],
        }).then(async (list) => {
            if (list.length > 0) {
                for (let i of list) {
                    let orderItemIdList = i.dataValues.OI_Id.orderItemId;

                    for (let j of orderItemIdList) {
                        await OrderItem.findOne({
                            attributes: { exclude: ["Price", "Cancel_Status", "createdAt", "updatedAt"] },
                            where: {
                                Id: j
                            }
                        }).then(async (details) => {
                            let temp = details.dataValues;

                            await Product.findOne({
                                attributes: ["Name", "Image", "Brand"],
                                where: {
                                    Id: details.dataValues.P_Id
                                }
                            }).then((details) => {
                                if (details) {
                                    let productDetails = details.dataValues;

                                    temp.Name = productDetails.Name;
                                    temp.Image = productDetails.Image;
                                    temp.Brand = productDetails.Brand;
                                    temp.Status = i.dataValues.Order_Status;

                                    listToSend.push(temp);
                                }
                            }).catch((err) => {
                                res.send(err);
                            })

                            listToSend.push(j);
                        }).catch((err) => {
                            res.send(err);
                        });
                    }
                }

                res.status(200).send(listToSend);
            } else {
                res.status(200).send(listToSend);
            }
        });
    } catch (err) {
        res.send(err);
    }
}

// Update Order Item Quantity

const updateOrderItemQuantity = async (req, res) => {
    try {
        let { oId, id, quantity } = req.body;

        if (!(oId && id && quantity)) {
            return res.status(400).json({ "msg": "Some field is empty." });
        }

        await OrderItem.findOne({
            attributes: { exclude: ["createdAt", "updatedAt"] },
            where: {
                Id: id
            }
        }).then(async (details) => {
            let temp = details.dataValues;
            let diff;

            await Product.findOne({
                attributes: ["Size_Quantity"],
                where: {
                    Id: temp.P_Id
                }
            }).then(async (sizeQuantityDetail) => {
                let sizeQuantityToUpdate = sizeQuantityDetail.dataValues.Size_Quantity;

                for (let i in sizeQuantityToUpdate) {
                    if (i == Object.keys(temp.Size_Quantity)) {
                        diff = temp.Size_Quantity[i] - quantity;
                        sizeQuantityToUpdate[i] = sizeQuantityToUpdate[i] + diff;
                    }
                }

                await Product.update({
                    Size_Quantity: sizeQuantityToUpdate
                }, {
                    where: {
                        Id: details.dataValues.P_Id
                    }
                }).then(async () => {
                    let sizeQuantityToUpdate = {};
                    let size = Object.keys(temp.Size_Quantity)[0];
                    sizeQuantityToUpdate[size] = quantity;

                    await OrderItem.update({
                        Size_Quantity: sizeQuantityToUpdate,
                        T_Price: temp.T_Price - (temp.Price * diff)
                    }, {
                        where: {
                            Id: id
                        }
                    }).then(async () => {
                        await Order.findOne({
                            attributes: ["Price", "T_Price", "Payment_Status", "Due_Refund_Amount", "Total_Refund_Amount"]
                        }, {
                            where: {
                                Id: oId
                            }
                        }).then(async (details) => {
                            let temp2 = details.dataValues;

                            if (temp2.Payment_Status != "Pending") {
                                await Order.update({
                                    Due_Refund_Amount: temp2.Due_Refund_Amount + (temp.Price * diff),
                                    Total_Refund_Amount: temp2.T_Price + (temp.Price * diff),
                                    Refund_Status: "Unpaid"
                                }, {
                                    where: {
                                        Id: oId
                                    }
                                }).then(() => {
                                    return res.status(200).json({ "msg": "Order item updated successfully." });
                                }).catch((err) => {
                                    return res.send(err);
                                });
                            }else{
                                await Order.update({
                                    Price: temp2.Price - (temp.Price * diff),
                                    T_Price: temp2.T_Price - (temp.Price * diff)
                                }, {
                                    where: {
                                        Id: oId
                                    }
                                }).then(() => {
                                    return res.status(200).json({ "msg": "Order item updated successfully." });
                                }).catch((err) => {
                                    return res.send(err);
                                });
                            }
                        }).catch((err) => {
                            return res.send(err);
                        });
                    }).catch((err) => {
                        return res.send(err);
                    });
                }).catch((err) => {
                    return res.send(err);
                });
            }).catch((err) => {
                return res.send(err);
            });
        }).catch((err) => {
            res.send(err);
        });
    } catch (err) {
        res.send(err);
    }
}

// Delete Order Item

const deleteOrderItem = async (req, res) => {
    try {
        let { oId, id } = req.params;

        await OrderItem.findOne({
            attributes: { exclude: ["createdAt", "updatedAt"] },
            where: {
                Id: id
            }
        }).then(async (details) => {
            let temp = details.dataValues;

            await Product.findOne({
                attributes: ["Size_Quantity"],
                where: {
                    Id: temp.P_Id
                }
            }).then(async (sizeQuantityDetail) => {
                let sizeQuantityToUpdate = sizeQuantityDetail.dataValues.Size_Quantity;

                for (let i in sizeQuantityToUpdate) {
                    if (i == Object.keys(temp.Size_Quantity)) {
                        sizeQuantityToUpdate[i] = sizeQuantityToUpdate[i] + temp.Size_Quantity[i];
                    }
                }

                await Product.update({
                    Size_Quantity: sizeQuantityToUpdate
                }, {
                    where: {
                        Id: details.dataValues.P_Id
                    }
                }).then(async () => {
                    await OrderItem.destroy({
                        where: {
                            Id: id
                        }
                    }).then(async () => {
                        await Order.findOne({
                            attributes: ["OI_Id", "Price", "T_Price", "Payment_Status", "Due_Refund_Amount", "Total_Refund_Amount"]
                        }, {
                            where: {
                                Id: oId
                            }
                        }).then(async (details) => {
                            let temp2 = details.dataValues;
                            let orderItemIdList = temp2.OI_Id.orderItemId;
                            let index = orderItemIdList.indexOf(id);
                            orderItemIdList.splice(index, 1);
                            let orderItemIdListToUpdate = { "orderItemId": orderItemIdList };

                            if (temp2.Payment_Status != "Pending") {
                                await Order.update({
                                    OI_Id: orderItemIdListToUpdate,
                                    Due_Refund_Amount: temp2.Due_Refund_Amount + temp.T_Price,
                                    Total_Refund_Amount: temp2.T_Price + temp.T_Price,
                                    Refund_Status: "Pending"
                                }, {
                                    where: {
                                        Id: oId
                                    }
                                }).then(() => {
                                    return res.status(200).json({ "msg": "Order item deleted successfully." });
                                }).catch((err) => {
                                    return res.send(err);
                                });
                            }else{
                                await Order.update({
                                    OI_Id: orderItemIdListToUpdate,
                                    Price: temp2.Price - temp.T_Price,
                                    T_Price: temp2.T_Price - temp.T_Price
                                }, {
                                    where: {
                                        Id: oId
                                    }
                                }).then(() => {
                                    return res.status(200).json({ "msg": "Order item deleted successfully." });
                                }).catch((err) => {
                                    return res.send(err);
                                });
                            }
                        }).catch((err) => {
                            return res.send(err);
                        });
                    }).catch((err) => {
                        return res.send(err);
                    });
                }).catch((err) => {
                    return res.send(err);
                });
            }).catch((err) => {
                return res.send(err);
            });
        }).catch((err) => {
            res.send(err);
        });
    } catch (err) {
        res.send(err);
    }
}

module.exports = { getOrderItemListAdmin, getOrderItemList, updateOrderItemQuantity, deleteOrderItem }