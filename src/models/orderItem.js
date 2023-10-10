const { DataTypes } = require("sequelize");
const sequelize = require("../db/conn");
const Product = require("./product");

const OrderItem = sequelize.define("OrderItem", {
  Id: {
    type: DataTypes.UUID,
    primaryKey: true
  },
  P_Id: {
    type: DataTypes.UUID,
    allowNull: false
  },
  Size_Quantity: {
    type: DataTypes.JSON,
    allowNull: false
  },
  Price: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  T_Price: {
    type: DataTypes.INTEGER,
    allowNull: false
  }
});

module.exports = OrderItem