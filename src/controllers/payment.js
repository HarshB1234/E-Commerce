const Razorpay = require("razorpay");
const crypto = require("crypto");

var instance = new Razorpay({ key_id: process.env.RAZORPAY_KEY_ID, key_secret: process.env.RAZORPAY_KEY_SECRET });

const generateOrderId = (req, res) => {
    try {
        const amount = req.params.amount;

        const options = {
            amount: amount,
            currency: "INR",
            receipt: "order_rcptid_11"
        };

        instance.orders.create(options, (err, order) => {
            if (err) {
                return res.send(err);
            }

            res.status(200).json(order);
        });
    } catch (err) {
        res.send(err);
    }
};

const paymentVerification = (req, res) => {
    try {
        const { razorpay_payment_id, razorpay_order_id, razorpay_signature } = req.body;

        const generated_signature = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET).update(razorpay_order_id + "|" + razorpay_payment_id).digest('hex');

        if (razorpay_signature === generated_signature) {
            res.status(200).json({ "msg": "Payment has been verified." });
        } else {
            res.status(200).json({ "msg": "Payment verification failed." });
        }
    } catch (err) {
        res.send(err);
    }
};

module.exports = { generateOrderId, paymentVerification }