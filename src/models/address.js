const { Sequelize, DataTypes } = require("sequelize");
const sequelize = require("../db/conn");
const User = require("./register");

const Address = sequelize.define("Address", {
  Id: {
    type: DataTypes.UUID,
    primaryKey: true
  },
  U_Id: {
    type: DataTypes.UUID,
    onDelete: "CASCADE",
    references: { 
        model: User,
        key: "Id"
    }
  },
  Name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  Number: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  Address: {
    type: DataTypes.STRING,
    allowNull: false
  },
  Area: {
    type: DataTypes.STRING,
    allowNull: false
  },
  Pincode: {
    type: DataTypes.STRING,
    allowNull: false
  },
  City: {
    type: DataTypes.STRING,
    allowNull: false
  },
  State: {
    type: DataTypes.STRING,
    allowNull: false
  },
});

module.exports = Address