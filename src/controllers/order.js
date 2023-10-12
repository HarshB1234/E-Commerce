const { uuid } = require("uuidv4");
const Razorpay = require("razorpay");
const Product = require("../models/product");
const Order = require("../models/order");
const OrderItem = require("../models/orderItem");
const Coupon = require("../models/coupon");
const User = require("../models/register");
const Address = require("../models/address");
const Cart = require("../models/cart");
const { Op } = require("sequelize");

// Razorpay Instance

var instance = new Razorpay({ key_id: process.env.RAZORPAY_KEY_ID, key_secret: process.env.RAZORPAY_KEY_SECRET });

// Add Order

const addOrder = async (req, res) => {
    try {
        let { items, aId, cId, pMode } = req.body;
        let orderItemId = [];
        let totalPrice = 0;
        let quantity = 0;
        let discountCoupon = "None";
        let discount = 0;
        let minCartValue = 0;

        if (!(items && aId && cId)) {
            return res.status(400).json({ "msg": "Some field is empty." });
        }

        for (let i of items) {
            await Product.findOne({
                attributes: ["Price"],
                where: {
                    Id: i.pId
                }
            }).then(async (price) => {
                await OrderItem.create({
                    Id: uuid(),
                    P_Id: i.pId,
                    Size_Quantity: i.sizeQuantity,
                    Quantity: Object.values(i.sizeQuantity)[0],
                    T_Price: Object.values(i.sizeQuantity)[0] * price.dataValues.Price
                }).then((details) => {
                    orderItemId.push(details.dataValues.Id);
                    totalPrice += details.dataValues.T_Price;
                    quantity += details.dataValues.Quantity;
                }).catch((err) => {
                    return res.send(err);
                });

                await Cart.findAll({
                    attributes: ["Id", "Size_Quantity"],
                    where: {
                        U_Id: req.user.Id,
                        P_Id: i.pId
                    }
                }).then(async (list) => {
                    for (let j in list) {
                        let temp = list[j].dataValues;

                        if (Object.keys(temp.Size_Quantity)[0] == Object.keys(i.sizeQuantity)[0]) {
                            await Cart.destroy({
                                where: {
                                    Id: temp.Id
                                }
                            }).catch((err) => {
                                return res.send(err);
                            })
                        }
                    }
                }).catch((err) => {
                    return res.send(err);
                });
            }).catch((err) => {
                return res.send(err);
            });
        }

        if (cId != "noCoupon") {
            await Coupon.findOne({
                attributes: ["Coupon_Code", "Discount", "Min_Cart_Value"],
                where: {
                    Id: cId
                }
            }).then((details) => {
                discountCoupon = details.dataValues.Coupon_Code;
                discount = details.dataValues.Discount;
                minCartValue = details.dataValues.Min_Cart_Value;
            }).catch((err) => {
                return res.send(err);
            });
        }

        if (totalPrice >= minCartValue) {
            await Order.create({
                Id: uuid(),
                U_Id: req.user.Id,
                A_Id: aId,
                OI_Id: { orderItemId },
                Discount_Coupon: discountCoupon,
                T_Price: totalPrice - discount
            }).then(async (details) => {
                await OrderItem.findAll({
                    attributes: ["Id", "Quantity", "T_Price"],
                    where: {
                        Id: {
                            [Op.or]: orderItemId
                        }
                    }
                }).then(async (list) => {
                    let dicountPerQuantity = discount / quantity;

                    for (let i of list) {
                        let j = i.dataValues;

                        let totalPriceToUpdate = j.T_Price - (j.Quantity * dicountPerQuantity);

                        await OrderItem.update({
                            T_Price: totalPriceToUpdate
                        }, {
                            where: {
                                Id: j.Id
                            }
                        }).catch((err) => {
                            return res.send(err);
                        });
                    }
                }).catch((err) => {
                    return res.send(err);
                });

                if (pMode == "COD") {
                    res.status(201).json({ "msg": "Order placed." });
                } else {
                    const options = {
                        amount: (totalPrice - discount) * 100,
                        currency: "INR",
                        receipt: details.dataValues.Id
                    };

                    instance.orders.create(options, (err, order) => {
                        if (err) {
                            return res.send(err);
                        } else {
                            return res.status(200).json({"oId": details.dataValues.Id, order});
                        }
                    });
                }
            }).catch((err) => {
                return res.send(err);
            });
        } else {
            res.status(200).json({ "msg": "This coupon cannot be applied." });
        }
    } catch (err) {
        res.send(err);
    }
};

// Get Order List

const getOrderListAdmin = async (req, res) => {
    try {
        await Order.findAll({
            attributes: { exclude: ["OI_Id", "createdAt", "updatedAt"] },
            order: [["createdAt", "DESC"]],
            offset: ((Number(req.params.number) - 1) * 15),
            limit: 15
        }).then(async (list) => {
            let listToSend = [];

            for (let i in list) {
                let j = list[i].dataValues;

                await User.findOne({
                    attributes: ["Name"],
                    where: {
                        Id: j.U_Id
                    }
                }).then((name) => {
                    j.Name = name.dataValues.Name;
                    delete j["U_Id"];
                }).catch((err) => {
                    return res.send(err);
                });

                await Address.findOne({
                    where: {
                        Id: j.A_Id
                    }
                }).then((details) => {
                    j.Address = details.dataValues;
                    delete j["A_Id"];
                }).catch((err) => {
                    return res.send(err);
                });

                if (j.Order_Status == "Canceled") {
                    j.Payment_Status = "None";
                }

                j.Cancel_Status = true;
                if (j.Order_Status != "Pending") {
                    j.Cancel_Status = false;
                }

                listToSend.push(j);
            }

            res.status(200).send(listToSend);
        }).catch((err) => {
            res.send(err);
        });
    } catch (err) {
        res.send(err);
    }
}

// Filter Order

const filterOrderByNumber = async (req, res) => {
    try {
        await Order.findOne({
            attributes: { exclude: ["OI_Id", "createdAt", "updatedAt"] },
            where:{
                O_Number: req.params.number
            }
        }).then((details) => {
            res.status(200).send(details);
        }).catch((err) => {
            res.send(err);
        })
    } catch (err) {
       res.send(err); 
    }
}

// Update Order Status

const updateOrderStatus = async (req, res) => {
    try {
        let { id, status } = req.body;


        if (!(id && status)) {
            return res.status(400).json({ "msg": "Some field is empty." });
        }

        if (status != "Delivered") {
            await Order.update({
                Order_Status: status
            }, {
                where: {
                    Id: id
                }
            }).then(() => {
                return res.status(200).json({ "msg": "Order status updated successfully." });
            }).catch((err) => {
                return res.send(err);
            });
        } else {
            await Order.update({
                Order_Status: status,
                Payment_Status: "Paid"
            }, {
                where: {
                    Id: id
                }
            }).then(() => {
                return res.status(200).json({ "msg": "Order status updated successfully." });
            }).catch((err) => {
                return res.send(err);
            });
        }
    } catch (err) {
        res.send(err);
    }
}

// Update Refund Status

const updateRefundStatus = async (req, res) => {
    try {
        let { id } = req.body;


        if (!id) {
            return res.status(400).json({ "msg": "Some field is empty." });
        }

        await Order.update({
            Due_Refund_Amount: 0,
            Refund_Status: "Paid"
        }, {
            where: {
                Id: id
            }
        }).then(() => {
            res.status(200).json({ "msg": "Refund successfull." });
        }).catch((err) => {
            res.send(err);
        })
    } catch (err) {
        res.send(err);
    }
}

// Delete Order

const deleteOrder = async (req, res) => {
    try {
        await Order.findOne({
            attributes: ["Payment_Status", "OI_Id", "T_Price"],
            where: {
                Id: req.params.id
            }
        }).then(async (details) => {
            let orderItemIdList = details.dataValues.OI_Id.orderItemId;

            for (let i of orderItemIdList) {
                await OrderItem.findOne({
                    attributes: ["P_Id", "Size_Quantity"],
                    where: {
                        Id: i
                    }
                }).then(async (details) => {
                    await Product.findOne({
                        attributes: ["Size_Quantity"],
                        where: {
                            Id: details.dataValues.P_Id
                        }
                    }).then(async (sizeQuantityDetail) => {
                        if (sizeQuantityDetail) {
                            let sizeQuantityToUpdate = sizeQuantityDetail.dataValues.Size_Quantity;

                            for (let i in sizeQuantityToUpdate) {
                                if (i == Object.keys(details.dataValues.Size_Quantity)[0]) {
                                    sizeQuantityToUpdate[i] = sizeQuantityToUpdate[i] + Object.values(details.dataValues.Size_Quantity)[0];
                                }
                            }

                            await Product.update({
                                Size_Quantity: sizeQuantityToUpdate
                            }, {
                                where: {
                                    Id: details.dataValues.P_Id
                                }
                            }).catch((err) => {
                                return res.send(err);
                            });
                        }
                    }).catch((err) => {
                        return res.send(err);
                    });
                })
            }

            let updatedData;

            if (details.dataValues.Payment_Status == "Pending") {
                updatedData = {
                    Order_Status: "Canceled",
                    Payment_Status: "None"
                };
            } else {
                updatedData = {
                    Order_Status: "Canceled",
                    Due_Refund_Amount: details.dataValues.T_Price,
                    Total_Refund_Amount: details.dataValues.T_Price,
                    Refund_Status: "Unpaid"
                };
            }

            await Order.update(updatedData, {
                where: {
                    Id: req.params.id
                }
            }).then(() => {
                res.status(200).json({ "msg": "Order canceled successfully." });
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

module.exports = { addOrder, getOrderListAdmin, filterOrderByNumber, updateOrderStatus, updateRefundStatus, deleteOrder }