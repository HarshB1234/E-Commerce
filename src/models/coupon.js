const { DataTypes } = require("sequelize");
const sequelize = require("../db/conn");

const Coupon = sequelize.define("Coupon", {
  Id: {
    type: DataTypes.UUID,
    primaryKey: true
  },
  Coupon_Code: {
    type: DataTypes.STRING,
    allowNull: false
  },
  Discription: {
    type: DataTypes.STRING,
    allowNull: false
  },
  Discount: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  Min_Cart_Value: {
    type: DataTypes.INTEGER,
    allowNull: false
  }
});

module.exports = Coupon