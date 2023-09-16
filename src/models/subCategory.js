const { Sequelize, DataTypes } = require("sequelize");
const sequelize = require("../db/conn");
const Category = require("./category");
const MainCategory = require("./mainCategory");

const SubCategory = sequelize.define("SubCategory", {
  Id: {
    type: DataTypes.UUID,
    primaryKey: true
  },
  Name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  C_Id: {
    type: DataTypes.UUID,
    onDelete: "CASCADE",
    references: {
        model: Category,
        key: "Id"
    }
  },
  M_Id: {
    type: DataTypes.UUID,
    onDelete: "CASCADE",
    references: {
        model: MainCategory,
        key: "Id"
    }
  },
  Image:{
    type: DataTypes.TEXT("long"),
    allowNull: false
  }
});

module.exports = SubCategory