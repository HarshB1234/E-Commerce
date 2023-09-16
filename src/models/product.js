const { DataTypes } = require("sequelize");
const sequelize = require("../db/conn");
const MainCategory = require("./mainCategory");
const Category = require("../models/category");
const SubCategory = require("../models/subCategory");

const Product = sequelize.define("Product", {
  Id: {
    type: DataTypes.UUID,
    primaryKey: true
  },
  Name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  Image: {
    type: DataTypes.JSON,
    allowNull: false
  },
  Brand:{
    type: DataTypes.STRING,
    allowNull: false
  },
  Description:{
    type: DataTypes.STRING,
    allowNull: false
  },
  Size_Quantity: {
    type: DataTypes.JSON,
    allowNull: false
  },
  Price: {
    type: DataTypes.FLOAT,
    allowNull: false
  },
  S_Price: {
    type: DataTypes.FLOAT,
    allowNull: false
  },
  Attributes: {
    type: DataTypes.JSON,
    allowNull: false
  },
  M_Id: {
    type: DataTypes.UUID,
    onDelete: "CASCADE",
    references: {
        model: MainCategory,
        key: "Id"
    }
  },
  C_Id: {
    type: DataTypes.UUID,
    onDelete: "CASCADE",
    references: {
        model: Category,
        key: "Id"
    }
  },
  S_Id: {
    type: DataTypes.UUID,
    onDelete: "CASCADE",
    references: {
        model: SubCategory,
        key: "Id"
    }
  },
  Active: {
    type: DataTypes.BOOLEAN,
    allowNull: false
  },
  Wislist_Status: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  }
});

module.exports = Product