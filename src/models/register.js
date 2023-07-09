const { Sequelize, DataTypes } = require("sequelize");
const sequelize = require("../db/conn");

const User = sequelize.define("User", {
  Id: {
    type: DataTypes.UUID,
    allowNull: false
  },
  Name: {
    type: DataTypes.TEXT,
    allowNull: false,
    validate: {
      isAlpha: true
    }
  },
  Email: {
    type: DataTypes.STRING,
    primaryKey: true,
    allowNull: false,
    validate: {
      isEmail: true
    }
  },
  Password: {
    type: DataTypes.STRING,
    allowNull: false
  },
  Address:{
    type: DataTypes.STRING
  },
  Otp: {
    type: DataTypes.INTEGER
  },
  isAdmin: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  }
});

module.exports = User