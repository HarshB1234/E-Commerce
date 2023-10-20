const { uuid } = require("uuidv4");
const nodeMailer = require("nodemailer");
const Razorpay = require("razorpay");
const Product = require("../models/product");
const Order = require("../models/order");
const OrderItem = require("../models/orderItem");
const Coupon = require("../models/coupon");
const User = require("../models/register");
const Address = require("../models/address");
const Cart = require("../models/cart");
const Logo = require("../models/logo");
const { Op } = require("sequelize");

// Razorpay Instance

var instance = new Razorpay({ key_id: process.env.RAZORPAY_KEY_ID, key_secret: process.env.RAZORPAY_KEY_SECRET });

// Add Order

const addOrder = async (req, res) => {
    try {
        let { items, shippingDetails, cId, pMode } = req.body;
        let orderItemId = [];
        let totalPrice = 0;
        let quantity = 0;
        let discountCoupon = "None";
        let discount = 0;
        let minCartValue = 0;

        if (!(items && shippingDetails && cId && pMode)) {
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
                Shipping_Details: shippingDetails,
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
                            return res.status(200).json({ "oId": details.dataValues.Id, order });
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

                if (j.Order_Status != "Delivered") {
                    j.Delivery_Date = "None"
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
            where: {
                O_Number: req.params.number
            }
        }).then(async (details) => {
            let orderDetails = details.dataValues;

            await User.findOne({
                attributes: ["Name"],
                where: {
                    Id: orderDetails.U_Id
                }
            }).then((name) => {
                orderDetails.Name = name.dataValues.Name;
                delete orderDetails["U_Id"];
            }).catch((err) => {
                return res.send(err);
            });

            if (orderDetails.Order_Status == "Canceled") {
                orderDetails.Payment_Status = "None";
            }

            orderDetails.Cancel_Status = true;
            if (orderDetails.Order_Status != "Pending") {
                orderDetails.Cancel_Status = false;
            }

            res.status(200).json({ orderDetails });
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
        let { id, status, uId } = req.body;

        if (!(id && status)) {
            return res.status(400).json({ "msg": "Some field is empty." });
        }

        if(status == "Accepted"){
            await Logo.findOne({
                attributes: ["Logo"]
            }).then(async (logo) => {
                await User.findOne({
                    attributes: ["Name", "Email"],
                    where: {
                        Id: uId
                    }
                }).then(async (details) => {
                    let temp = details.dataValues;
    
                    await Order.findOne({
                        attributes: ["OI_Id", "Discount_Coupon", "T_Price", "Shipping_Details", "O_Number"],
                        where: {
                            Id: id
                        }
                    }).then(async (details) => {
                        let temp2 = details.dataValues;
                        let orderItemRow = "";
    
                        for (let i of temp2.OI_Id.orderItemId) {
                            await OrderItem.findOne({
                                attributes: { exclude: ["Id", "createdAt", "updatedAt"] },
                                where: {
                                    Id: i
                                }
                            }).then(async (details) => {
                                let j = details.dataValues;
    
                                await Product.findOne({
                                    attributes: ["Name"],
                                    where: {
                                        Id: j.P_Id
                                    }
                                }).then((pName) => {
                                    if (pName) {
                                        orderItemRow += `<tr class="row-border-bottom">
                                        <th class="product-details-wrapper table-stack stack-column" style="mso-line-height-rule: exactly; padding-top: 13px; padding-bottom: 13px; border-bottom-width: 2px; border-bottom-color: #dadada; border-bottom-style: solid;" bgcolor="#ffffff" valign="middle">
                                          <table cellspacing="0" cellpadding="0" border="0" width="100%" style="min-width: 100%;" role="presentation">
                                            <tbody><tr>
                                              
                                              <th class="line-item-description" style="mso-line-height-rule: exactly; font-family: -apple-system,BlinkMacSystemFont,'Segoe UI',Arial,'Karla'; font-size: 16px; line-height: 26px; font-weight: 400; color: #666363; padding: 13px 6px 13px 0;" align="left" bgcolor="#ffffff" valign="top">
                                                <p style="mso-line-height-rule: exactly; font-family: -apple-system,BlinkMacSystemFont,'Segoe UI',Arial,'Karla'; font-size: 16px; line-height: 26px; font-weight: 400; color: #666363; margin: 0;" align="left">
                                                  <p style="color: #666363; text-decoration: none !important; text-underline: none; word-wrap: break-word; text-align: left !important; font-weight: bold;">
                                                    ${pName.dataValues.Name}
                                                  </p>
                                                  <br>
                                                  <span class="muted" style="text-align: center; font-family: -apple-system,BlinkMacSystemFont,'Segoe UI',Arial,'Karla'; font-size: 14px; font-weight: normal; color: #bdbdbd; word-break: break-all;">
                                                      
                                                  Size: ${Object.keys(j.Size_Quantity)[0]}
                                                        </span>
                                                  </p>
                                                </th>
                                                
                                                  <th style="mso-line-height-rule: exactly;" bgcolor="#ffffff" valign="top"></th>
                                                
                                                <th class="right line-item-qty" width="1" style="mso-line-height-rule: exactly; white-space: nowrap; padding: 13px 0 13px 13px;" align="right" bgcolor="#ffffff" valign="top">
                                                  <p style="mso-line-height-rule: exactly; font-family: -apple-system,BlinkMacSystemFont,'Segoe UI',Arial,'Karla'; font-size: 16px; line-height: 26px; font-weight: 400; color: #666363; margin: 0;" align="right">
                                                  &#10005; ${j.Quantity}
                                                  </p>
                                                </th>
                                                <th class="right line-item-line-price" width="1" style="mso-line-height-rule: exactly; white-space: nowrap; padding: 13px 0 13px 26px;" align="right" bgcolor="#ffffff" valign="top">
                                                  <p style="mso-line-height-rule: exactly; font-family: -apple-system,BlinkMacSystemFont,'Segoe UI',Arial,'Karla'; font-size: 16px; line-height: 26px; font-weight: 400; color: #666363; margin: 0;" align="right">
                                                    ₹ ${j.T_Price}
                                                  </p>
                                                </th>
                                              </tr>
                                            </tbody></table>
                                          </th>
                                        </tr>`
                                    }
                                }).catch((err) => {
                                    return res.send(err);
                                });
                            }).catch((err) => {
                                return res.send(err);
                            });
                        }
    
                        const transporter = nodeMailer.createTransport({
                            host: "smtp.gmail.com",
                            secure: true,
                            port: 465,
                            auth: {
                                user: process.env.MAIL_ID,
                                pass: process.env.MAIL_PASS,
                            },
                        });
    
                        const info = {
                            from: process.env.MAIL_ID,
                            to: temp.Email,
                            subject: "Order Placed.",
                            html: `<head>
                            <meta name="viewport" content="width=device-width">
                            <meta http-equiv="X-UA-Compatible" content="IE=edge">
                            <meta name="x-apple-disable-message-reformatting">
                            <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
                            <style type="text/css" data-premailer="ignore">
                                html,
                                body {
                                    Margin: 0 auto !important;
                                    padding: 0 !important;
                                    width: 100% !important;
                                    height: 100% !important;
                                }
                        
                                * {
                                    -ms-text-size-adjust: 100%;
                                    -webkit-text-size-adjust: 100%;
                                    text-rendering: optimizeLegibility;
                                    -webkit-font-smoothing: antialiased;
                                    -moz-osx-font-smoothing: grayscale;
                                }
                        
                                .ExternalClass {
                                    width: 100%;
                                }
                        
                                div[style*="Margin: 16px 0"] {
                                    Margin: 0 !important;
                                }
                        
                                table,
                                th {
                                    mso-table-lspace: 0pt;
                                    mso-table-rspace: 0pt;
                                }
                        
                                .ExternalClass,
                                .ExternalClass * {
                                    line-height: 100% !important;
                                }
                        
                                table {
                                    border-spacing: 0 !important;
                                    border-collapse: collapse !important;
                                    border: none;
                                    Margin: 0 auto;
                                }
                        
                                div[style*="Margin: 16px 0"] {
                                    Margin: 0 !important;
                                }
                        
                                img {
                                    -ms-interpolation-mode: bicubic;
                                }
                        
                                .yshortcuts a {
                                    border-bottom: none !important;
                                }
                        
                                *[x-apple-data-detectors],
                                /* iOS */
                                .x-gmail-data-detectors,
                                /* Gmail */
                                .x-gmail-data-detectors *,
                                .aBn {
                                    border-bottom: none !important;
                                    cursor: default !important;
                                    color: inherit !important;
                                    text-decoration: none !important;
                                    font-size: inherit !important;
                                    font-family: inherit !important;
                                    font-weight: inherit !important;
                                    line-height: inherit !important;
                                }
                        
                                .a6S {
                                    display: none !important;
                                    opacity: 0.01 !important;
                                }
                        
                                img.g-img+div {
                                    display: none !important;
                                }
                        
                                a,
                                a:link,
                                a:visited {
                                    color: #ecba78;
                                    text-decoration: none !important;
                                }
                        
                                .header a {
                                    color: #c3c3c3;
                                    text-decoration: none;
                                    text-underline: none;
                                }
                        
                                .main a {
                                    color: #ecba78;
                                    text-decoration: none;
                                    text-underline: none;
                                    word-wrap: break-word;
                                }
                        
                                .main .section.customer_and_shipping_address a,
                                .main .section.shipping_address_and_fulfillment_details a {
                                    color: #666363;
                                    text-decoration: none;
                                    text-underline: none;
                                    word-wrap: break-word;
                                }
                        
                                .footer a {
                                    color: #ecba78;
                                    text-decoration: none;
                                    text-underline: none;
                                }
                        
                                img {
                                    border: none !important;
                                    outline: none !important;
                                    text-decoration: none !important;
                                }
                        
                                [style*="Karla"] {
                                    font-family: 'Karla', -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif !important;
                                }
                        
                                [style*="Karla"] {
                                    font-family: 'Karla', -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif !important;
                                }
                        
                                [style*="Karla"] {
                                    font-family: 'Karla', -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif !important;
                                }
                        
                                [style*="Playfair Display"] {
                                    font-family: 'Playfair Display', Georgia, serif !important;
                                }
                        
                                td.menu_bar_1 a:hover,
                                td.menu_bar_6 a:hover {
                                    color: #ecba78 !important;
                                }
                        
                                th.related_product_wrapper.first {
                                    border-right: 13px solid #ffffff;
                                    padding-right: 6px;
                                }
                        
                                th.related_product_wrapper.last {
                                    border-left: 13px solid #ffffff;
                                    padding-left: 6px;
                                }
                            </style>
                        
                            <link
                                href="https://fonts.googleapis.com/css?family=Karla:400,700%7CPlayfair+Display:700,400%7CKarla:700,400%7CKarla:700,700"
                                rel="stylesheet" type="text/css" data-premailer="ignore">
                            <style type="text/css" data-premailer="ignore">
                                @media only screen and (min-device-width: 375px) and (max-device-width: 413px) {
                                    .container {
                                        min-width: 375px !important;
                                    }
                                }
                        
                                @media only screen and (max-width:480px) {
                                    .email-container {
                                        width: 100% !important;
                                        min-width: 100% !important;
                                    }
                        
                                    .section>th {
                                        padding: 13px 26px 13px 26px !important;
                                    }
                        
                                    .section.divider>th {
                                        padding: 26px 26px !important;
                                    }
                        
                                    .main .section:first-child>th,
                                    .main .section:first-child>td {
                                        padding-top: 26px !important;
                                    }
                        
                                    .main .section:nth-last-child(2)>th,
                                    .main .section:nth-last-child(2)>td {
                                        padding-bottom: 52px !important;
                                    }
                        
                                    .section.recommended_products>th,
                                    .section.discount>th {
                                        padding: 26px 26px !important;
                                    }
                        
                                    img.fluid,
                                    img.fluid-centered {
                                        width: 100% !important;
                                        min-width: 100% !important;
                                        max-width: 100% !important;
                                        height: auto !important;
                                        Margin: auto !important;
                                        box-sizing: border-box;
                                    }
                        
                                    img.fluid-centered {
                                        Margin: auto !important;
                                    }
                        
                                    th.stack-column,
                                    th.stack-column-left,
                                    th.stack-column-center,
                                    th.related_product_wrapper,
                                    .column_1_of_2,
                                    .column_2_of_2 {
                                        display: block !important;
                                        width: 100% !important;
                                        min-width: 100% !important;
                                        direction: ltr !important;
                                        box-sizing: border-box;
                                    }
                        
                                    th.stack-column-left {
                                        text-align: left !important;
                                    }
                        
                                    th.stack-column-center,
                                    th.related_product_wrapper {
                                        text-align: center !important;
                                        border-right: none !important;
                                        border-left: none !important;
                                    }
                        
                                    .column_button,
                                    .column_button>table,
                                    .column_button>table th {
                                        width: 100% !important;
                                        text-align: center !important;
                                        Margin: 0 !important;
                                    }
                        
                                    .column_1_of_2 {
                                        padding-bottom: 26px !important;
                                    }
                        
                                    .column_1_of_2 th {
                                        padding-right: 0 !important;
                                    }
                        
                                    .column_2_of_2 th {
                                        padding-left: 0 !important;
                                    }
                        
                                    .column_text_after_button {
                                        padding: 0 13px !important;
                                    }
                        
                                    /* Adjust product images */
                                    th.table-stack {
                                        padding: 0 !important;
                                    }
                        
                                    th.product-image-wrapper {
                                        padding: 26px 0 13px 0 !important;
                                    }
                        
                                    img.product-image {
                                        width: 240px !important;
                                        max-width: 240px !important;
                                    }
                        
                                    tr.row-border-bottom th.product-image-wrapper {
                                        border-bottom: none !important;
                                    }
                        
                                    th.related_product_wrapper.first,
                                    th.related_product_wrapper.last {
                                        padding-right: 0 !important;
                                        padding-left: 0 !important;
                                    }
                        
                                    .text_banner th.banner_container {
                                        padding: 13px !important;
                                    }
                        
                                    .mobile_app_download .column_1_of_2 .image_container {
                                        padding-bottom: 0 !important;
                                    }
                        
                                    .mobile_app_download .column_2_of_2 .image_container {
                                        padding-top: 0 !important;
                                    }
                                }
                            </style>
                            <style type="text/css" data-premailer="ignore">
                                @media only screen and (max-width:480px) {
                                    .column_logo {
                                        display: block !important;
                                        width: 100% !important;
                                        min-width: 100% !important;
                                        direction: ltr !important;
                                        text-align: center !important;
                                    }
                        
                                    p,
                                    .column_1_of_2 th p,
                                    .column_2_of_2 th p,
                                    .order_notes *,
                                    .invoice_link * {
                                        text-align: center !important;
                                    }
                        
                                    .line-item-description p {
                                        text-align: left !important;
                                    }
                        
                                    .line-item-price p,
                                    .line-item-qty p,
                                    .line-item-line-price p {
                                        text-align: right !important;
                                    }
                        
                                    h1,
                                    h2,
                                    h3,
                                    .column_1_of_2 th,
                                    .column_2_of_2 th {
                                        text-align: center !important;
                                    }
                        
                                    td.order-table-title {
                                        text-align: center !important;
                                    }
                        
                                    .footer .column_1_of_2 {
                                        border-right: 0 !important;
                                        border-bottom: 0 !important;
                                    }
                        
                                    .footer .section_wrapper_th {
                                        padding: 0 17px;
                                    }
                                }
                            </style>
                        </head>
                        
                        <body class="body" id="body" leftmargin="0" topmargin="0" marginwidth="0" marginheight="0" bgcolor="#f4f4f3"
                            style="-webkit-text-size-adjust: none; -ms-text-size-adjust: none; margin: 0; padding: 0;">
                            <div
                                style="display: none; overflow: hidden; line-height: 1px; max-height: 0px; max-width: 0px; opacity: 0; mso-hide: all;">
                                We've got your order! Your world is about to look a whole lot better.
                            </div>
                        
                            <table class="container container_full" cellpadding="0" cellspacing="0" border="0" width="100%"
                                style="border-collapse: collapse; min-width: 100%;" role="presentation" bgcolor="#f4f4f3">
                                <tbody>
                                    <tr>
                                        <th valign="top" style="mso-line-height-rule: exactly;">
                                            <center style="width: 100%;">
                                                <table border="0" width="600" cellpadding="0" cellspacing="0" align="center"
                                                    style="width: 600px; min-width: 600px; max-width: 600px; margin: auto;"
                                                    class="email-container" role="presentation">
                                                    <tbody>
                                                        <tr>
                                                            <th valign="top" style="mso-line-height-rule: exactly;">
                                                                <table class="section_wrapper header" data-id="header" id="section-header"
                                                                    border="0" width="100%" cellpadding="0" cellspacing="0" align="center"
                                                                    style="min-width: 100%;" role="presentation" bgcolor="#ffffff">
                                                                    <tbody>
                                                                        <tr>
                                                                            <td class="section_wrapper_th"
                                                                                style="mso-line-height-rule: exactly; padding-top: 52px; padding-bottom: 26px;"
                                                                                bgcolor="#ffffff">
                                                                                <table border="0" width="100%" cellpadding="0" cellspacing="0"
                                                                                    align="center" style="min-width: 100%;" role="presentation">
                                                                                    <tbody>
                                                                                        <tr>
                                                                                            <th class="column_logo"
                                                                                                style="mso-line-height-rule: exactly; padding-top: 13px; padding-bottom: 13px;"
                                                                                                align="center" bgcolor="#ffffff">
                                                                                                   <h1  style=" height: auto !important; display: block; text-align: center; margin: auto;color:black">Urban Style</h1>
                                                                                                </a>
                                                                                            </th>
                                                                                        </tr>
                                                                                    </tbody>
                                                                                </table>
                                                                            </td>
                                                                        </tr>
                                                                    </tbody>
                                                                </table>
                                                                <table class="section_wrapper main" data-id="main" id="section-main" border="0"
                                                                    width="100%" cellpadding="0" cellspacing="0" align="center"
                                                                    style="min-width: 100%;" role="presentation" bgcolor="#ffffff">
                                                                    <tbody>
                                                                        <tr>
                                                                            <td class="section_wrapper_th"
                                                                                style="mso-line-height-rule: exactly;" bgcolor="#ffffff">
                                                                                <table border="0" width="100%" cellpadding="0" cellspacing="0"
                                                                                    align="center" style="min-width: 100%;" id="mixContainer"
                                                                                    role="presentation">
                                                                                    <tbody>
                                                                                        <tr id="section-1468266" class="section heading">
                                                                                            <th style="mso-line-height-rule: exactly; color: #4b4b4b; padding: 26px 52px 13px;"
                                                                                                bgcolor="#ffffff">
                                                                                                <table cellspacing="0" cellpadding="0"
                                                                                                    border="0" width="100%" role="presentation"
                                                                                                    style="color: #4b4b4b;" bgcolor="#ffffff">
                                                                                                    <tbody>
                                                                                                        <tr style="color: #4b4b4b;"
                                                                                                            bgcolor="#ffffff">
                                                                                                            <th style="mso-line-height-rule: exactly; color: #4b4b4b;"
                                                                                                                bgcolor="#ffffff" valign="top">
                                                                                                                <h1 data-key="1468266_heading"
                                                                                                                    style="font-family: Georgia,serif,'Playfair Display'; font-size: 28px; line-height: 46px; font-weight: 700; color: #4b4b4b; text-transform: none; background-color: #ffffff; margin: 0;">
                                                                                                                    Order Confirmation</h1>
                                                                                                            </th>
                                                                                                        </tr>
                                                                                                    </tbody>
                                                                                                </table>
                                                                                            </th>
                                                                                        </tr>
                        
                                                                                        <tr id="section-1468267" class="section introduction">
                                                                                            <th style="mso-line-height-rule: exactly; padding: 13px 52px ;"
                                                                                                bgcolor="#ffffff">
                        
                                                                                                <p style="mso-line-height-rule: exactly; font-family: -apple-system,BlinkMacSystemFont,'Segoe UI',Arial,'Karla'; font-size: 16px; line-height: 26px; font-weight: 400; color: #666363; margin: 0 0 13px;"
                                                                                                    align="center">
                                                                                                    <span data-key="1468267_greeting_text"
                                                                                                        style="text-align: center; font-family: -apple-system,BlinkMacSystemFont,'Segoe UI',Arial,'Karla'; font-size: 16px; line-height: 26px; font-weight: 400; color: #666363;">
                                                                                                        Hey
                                                                                                    </span>
                                                                                                    ${temp.Name},
                                                                                                </p>
                        
                        
                                                                                                <p data-key="1468267_introduction_text"
                                                                                                    class="text"
                                                                                                    style="mso-line-height-rule: exactly; font-family: -apple-system,BlinkMacSystemFont,'Segoe UI',Arial,'Karla'; font-size: 16px; line-height: 26px; font-weight: 400; color: #666363; margin: 13px 0;"
                                                                                                    align="center">
                                                                                                </p>
                                                                                                <p style="mso-line-height-rule: exactly; font-family: -apple-system,BlinkMacSystemFont,'Segoe UI',Arial,'Karla'; font-size: 16px; line-height: 26px; font-weight: 400; color: #666363; margin: 13px 0;"
                                                                                                    align="center">We've got your order! Your
                                                                                                    world is about to look a whole lot better.
                                                                                                </p>
                                                                                            </th>
                                                                                        </tr>
                        
                                                                                        <tr id="section-1468270"
                                                                                            class="section order_number_and_date">
                                                                                            <th style="mso-line-height-rule: exactly; padding: 13px 52px;"
                                                                                                bgcolor="#ffffff">
                                                                                                <h2 style="font-family: -apple-system,BlinkMacSystemFont,'Segoe UI',Arial,'Karla'; color: #4b4b4b; font-size: 20px; line-height: 26px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; margin: 0;"
                                                                                                    align="center">
                                                                                                    <span data-key="1468270_order_number">Order
                                                                                                        No.</span> #${temp2.O_Number}
                                                                                                </h2>
                        
                                                                                            </th>
                                                                                        </tr>
                        
                                                                                        <tr id="section-1468271"
                                                                                            class="section products_with_pricing">
                        
                                                                                            <th style="mso-line-height-rule: exactly; padding: 13px 52px 0px;"
                                                                                                bgcolor="#ffffff">
                                                                                                <table class="table-inner" cellspacing="0"
                                                                                                    cellpadding="0" border="0" width="100%"
                                                                                                    style="min-width: 100%;"
                                                                                                    role="presentation">
                                                                                                    <tbody>
                                                                                                        <tr>
                                                                                                            <th class="product-table"
                                                                                                                style="mso-line-height-rule: exactly;"
                                                                                                                bgcolor="#ffffff" valign="top">
                                                                                                                <table cellspacing="0"
                                                                                                                    cellpadding="0" border="0"
                                                                                                                    width="100%"
                                                                                                                    style="min-width: 100%;"
                                                                                                                    role="presentation">
                                                                                                                    <tbody>
                                                                                                                        <tr>
                                                                                                                            <th colspan="2"
                                                                                                                                class="product-table-h3-wrapper"
                                                                                                                                style="mso-line-height-rule: exactly;"
                                                                                                                                bgcolor="#ffffff"
                                                                                                                                valign="top">
                                                                                                                                <h3 data-key="1468271_item"
                                                                                                                                    style="font-family: -apple-system,BlinkMacSystemFont,'Segoe UI',Arial,'Karla'; color: #bdbdbd; font-size: 16px; line-height: 52px; font-weight: 700; text-transform: uppercase; border-bottom-width: 2px; border-bottom-color: #dadada; border-bottom-style: solid; letter-spacing: 1px; margin: 0;"
                                                                                                                                    align="left">
                                                                                                                                    Items
                                                                                                                                    ordered</h3>
                                                                                                                            </th>
                                                                                                                        </tr>
                                                                                                                        ${orderItemRow}
                                                                                                                        <tr>
                                                                                                                            <th colspan="2"
                                                                                                                                class="product-empty-row"
                                                                                                                                style="mso-line-height-rule: exactly;"
                                                                                                                                bgcolor="#ffffff"
                                                                                                                                valign="top">
                                                                                                                            </th>
                                                                                                                        </tr>
                        
                                                                                                                    </tbody>
                                                                                                                </table>
                                                                                                            </th>
                                                                                                        </tr>
                                                                                                        <tr>
                                                                                                            <th class="pricing-table"
                                                                                                                style="mso-line-height-rule: exactly; padding: 13px 0;"
                                                                                                                bgcolor="#ffffff" valign="top">
                                                                                                                <table cellspacing="0"
                                                                                                                    cellpadding="0" border="0"
                                                                                                                    width="100%"
                                                                                                                    style="min-width: 100%;"
                                                                                                                    role="presentation">
                        
                                                                                                                    <tbody>
                                                                                                                        <tr
                                                                                                                            class="pricing-table-total-row">
                                                                                                                            <th class="table-title"
                                                                                                                                data-key="1468271_total"
                                                                                                                                style="mso-line-height-rule: exactly; font-family: -apple-system,BlinkMacSystemFont,'Segoe UI',Arial,'Karla'; font-size: 16px; line-height: 26px; font-weight: bold; color: #666363; width: 65%; padding: 6px 0;"
                                                                                                                                align="left"
                                                                                                                                bgcolor="#ffffff"
                                                                                                                                valign="top">
                                                                                                                                Total</th>
                                                                                                                            <th class="table-text"
                                                                                                                                style="mso-line-height-rule: exactly; font-family: -apple-system,BlinkMacSystemFont,'Segoe UI',Arial,'Karla'; font-size: 16px; line-height: 26px; font-weight: 400; color: #666363; width: 35%; padding: 6px 0;"
                                                                                                                                align="right"
                                                                                                                                bgcolor="#ffffff"
                                                                                                                                valign="middle">
                                                                                                                                ₹
                                                                                                                                ${temp2.T_Price}
                                                                                                                            </th>
                                                                                                                        </tr>
                        
                                                                                                                    </tbody>
                                                                                                                </table>
                                                                                                            </th>
                                                                                                        </tr>
                                                                                                    </tbody>
                                                                                                </table>
                                                                                            </th>
                        
                                                                                        </tr>
                                                                                        <tr id="section-1468275" class="section divider">
                                                                                            <th style="mso-line-height-rule: exactly; padding: 0px 52px;"
                                                                                                bgcolor="#ffffff">
                                                                                                <table cellspacing="0" cellpadding="0"
                                                                                                    border="0" width="100%" role="presentation">
                                                                                                    <tbody>
                                                                                                        <tr>
                                                                                                            <th style="mso-line-height-rule: exactly; border-top-width: 2px; border-top-color: #dadada; border-top-style: solid;"
                                                                                                                bgcolor="#ffffff" valign="top">
                                                                                                            </th>
                                                                                                        </tr>
                                                                                                    </tbody>
                                                                                                </table>
                                                                                            </th>
                                                                                        </tr>
                                                                                        <tr id="section-1468273"
                                                                                            class="section customer_and_shipping_address">
                                                                                            <th style="mso-line-height-rule: exactly; padding: 13px 52px;"
                                                                                                bgcolor="#ffffff">
                                                                                                <table border="0" width="100%" cellpadding="0"
                                                                                                    cellspacing="0" align="center"
                                                                                                    style="min-width: 100%;"
                                                                                                    role="presentation">
                                                                                                    <tbody>
                                                                                                        <tr>
                                                                                                            <!-- BEGIN : Column 1 of 2 : BILL_TO -->
                                                                                                            <th width="50%"
                                                                                                                class="column_1_of_2 column_bill_to "
                                                                                                                style="mso-line-height-rule: exactly;"
                                                                                                                align="left" bgcolor="#ffffff"
                                                                                                                valign="top">
                                                                                                                <table align="center" border="0"
                                                                                                                    width="100%" cellpadding="0"
                                                                                                                    cellspacing="0"
                                                                                                                    style="min-width: 100%;"
                                                                                                                    role="presentation">
                                                                                                                    <tbody>
                                                                                                                        <tr>
                                                                                                                            <th style="mso-line-height-rule: exactly; padding-right: 5%;"
                                                                                                                                align="left"
                                                                                                                                bgcolor="#ffffff"
                                                                                                                                valign="top">
                                                                                                                                <h3 data-key="1468273_bill_to"
                                                                                                                                    style="font-family: -apple-system,BlinkMacSystemFont,'Segoe UI',Arial,'Karla'; color: #bdbdbd; font-size: 16px; line-height: 52px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; margin: 0;"
                                                                                                                                    align="left">
                                                                                                                                    Shipping
                                                                                                                                    Address</h3>
                                                                                                                            </th>
                                                                                                                        </tr>
                                                                                                                        <tr>
                                                                                                                            <th class="billing_address "
                                                                                                                                style="mso-line-height-rule: exactly; padding-right: 5%;"
                                                                                                                                align="left"
                                                                                                                                bgcolor="#ffffff"
                                                                                                                                valign="top">
                                                                                                                                <p style="mso-line-height-rule: exactly; font-family: -apple-system,BlinkMacSystemFont,'Segoe UI',Arial,'Karla'; font-size: 16px; line-height: 26px; font-weight: 400; color: #666363; margin: 0;"
                                                                                                                                    align="left">
                                                                                                                                    ${temp.Name}<br>
                                                                                                                                    ${temp2.Shipping_Details.Address}
                                                                                                                                    <br>
                                                                                                                                    ${temp2.Shipping_Details.Area}<br>
                                                                                                                                    ${temp2.Shipping_Details.City}<br>
                                                                                                                                    ${temp2.Shipping_Details.State}<br>
                                                                                                                                    ${temp2.Shipping_Details.Pincode}<br>
                                                                                                                            </th>
                                                                                                                        </tr>
                                                                                                                    </tbody>
                                                                                                                </table>
                                                                                                            </th>
                                                                                                            <!-- END : Column 1 of 2 : BILL_TO -->
                        
                                                                                                        </tr>
                                                                                                    </tbody>
                                                                                                </table>
                                                                                            </th>
                                                                                        </tr>
                        
                                                                                        
                                                                                    </tbody>
                                                                                </table>
                                                                            </td>
                                                                        </tr>
                                                                    </tbody>
                                                                </table>
                                            </center>
                                        </th>
                                    </tr>
                                </tbody>
                            </table>
                        </body>`,
                        };
    
                        transporter.sendMail(info, async (err) => {
                            if (err) {
                                return res.send(err);
                            } else {
                                await Order.update({
                                    Order_Status: status,
                                    Delivery_Date: new Date()
                                }, {
                                    where: {
                                        Id: id
                                    }
                                }).then(() => {
                                    return  res.status(200).json({ "msg": "Order status updated successfully." });
                                }).catch((err) => {
                                    return res.send(err);;
                                });
                            }
                        });
                    })
                }).catch((err) => {
                    return res.send(err);;
                });
            }).catch((err) => {
                return res.send(err);;
            });
        }else if(status == "Packed" || status == "Shipped"){
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
        }else if(status == "Delivered"){
            await Order.update({
                Order_Status: status,
                Payment_Status: "Paid",
                Delivery_Date: new Date()
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