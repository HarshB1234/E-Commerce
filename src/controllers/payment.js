const crypto = require("crypto");
const Order = require("../models/order");

const paymentVerification = async (req, res) => { 
    try {
        const { razorpay_payment_id, razorpay_order_id, razorpay_signature, orderId } = req.body;

        const generated_signature = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET).update(razorpay_order_id + "|" + razorpay_payment_id).digest('hex');

        if (razorpay_signature === generated_signature) {
            await Order.update({
                Payment_Status: Paid
            },{
                where: {
                    Id: oId
                }
            }).then(() => {
                return res.status(200).json({ "msg": "Order placed." });
            }).catch((err) => {
                return res.send(err);
            })
        } else {
            return res.status(200).json({ "msg": "Payment verification failed." });
        }
    } catch (err) {
        res.send(err);
    }
};

module.exports = { paymentVerification }