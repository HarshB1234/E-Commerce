const { uuid } = require('uuidv4');
const MainCategory = require("../models/mainCategory");
const Category = require("../models/category");
const SubCategory = require("../models/subCategory");
const aws = require("aws-sdk");

// AWS Configure

const awsConfig = {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
};

const S3 = new aws.S3(awsConfig);

// Function to upload and delete image

const uploadToS3 = (bufferData, type) => {
    return new Promise((resolve, reject) => {
        const params = {
            Bucket: process.env.AWS_BUCKET_NAME,
            Key: `${Date.now().toString()}.${type}`,
            Body: bufferData
        };

        S3.upload(params, (err, data) => {
            if (err) {
                reject(err);
            }

            return resolve(data);
        })
    })
}

const deleteToS3 = (name) => {
    return new Promise((resolve, reject) => {
        const params = {
            Bucket: process.env.AWS_BUCKET_NAME,
            Key: name,
        };

        S3.deleteObject(params, (err, data) => {
            if (err) {
                reject(err);
            }

            return resolve(data);
        })
    })
}

// Add Main Category, Category and Sub-Category

const addMainCategory = async (req, res) => {
    try {
        let { name } = req.body;
        let image = req.files.image;

        if (!name) {
            return res.status(400).json({ "msg": "Some field is empty." });
        }

        let str = image.mimetype;
        let lastIndex = str.lastIndexOf("/");
        let type = str.substring(lastIndex + 1);
        var imageToSet;

        await uploadToS3(image.data, type).then((result) => {
            imageToSet = result.Location;
        });

        await MainCategory.create({
            Id: uuid(),
            Name: name,
            Image: imageToSet
        }).then(() => {
            res.status(201).json({ "msg": "Main Category created." });
        }).catch((err) => {
            res.status(409).json({ "msg": "Main Category already exists." });
        });
    } catch (err) {
        res.send(err);
    }
};

const addCategory = async (req, res) => {
    try {
        let { name, mId } = req.body;

        if (!(name && mId)) {
            return res.status(400).json({ "msg": "Some field is empty." });
        }

        const [category, created] = await Category.findOrCreate({
            where: {
                Name: name,
                M_Id: mId
            },
            defaults: {
                Id: uuid(),
                Name: name,
                M_Id: mId
            }
        });

        if (created) {
            return res.status(201).json({ "msg": "Category created." });
        }

        res.status(409).json({ "msg": "Category already exists." });
    } catch (err) {
        res.send(err);
    }
};

const addSubCategory = async (req, res) => {
    try {
        let { name, cId, mId } = req.body;
        let image = req.files.image;

        if (!(name && cId && mId)) {
            return res.status(400).json({ "msg": "Some field is empty." });
        }

        let str = image.mimetype;
        let lastIndex = str.lastIndexOf("/");
        let type = str.substring(lastIndex + 1);
        var imageToSet;

        await uploadToS3(image.data, type).then((result) => {
            imageToSet = result.Location;
        });

        const [subCategory, created] = await SubCategory.findOrCreate({
            where: {
                Name: name,
                C_Id: cId,
                M_Id: mId
            },
            defaults: {
                Id: uuid(),
                Name: name,
                C_Id: cId,
                M_Id: mId,
                Image: imageToSet
            }
        });

        if (created) {
            return res.status(201).json({ "msg": "Sub-Category created." });
        }

        return res.status(409).json({ "msg": "Sub-Category already exists." });

    } catch (err) {
        res.send(err);
    }
};

// Get Main Category, Category and Sub-Category List 

const mainCategoryList = async (req, res) => {
    try {
        await MainCategory.findAll({
            attributes: ["Id", "Name", "Image"]
        }).then((list) => {
            res.status(200).json(list);
        }).catch((err) => {
            res.send(err);
        });
    } catch (err) {
        res.send(err);
    }
};

const categoryList = async (req, res) => {
    try {
        await Category.findAll({
            attributes: ["Id", "Name", "M_Id"]
        }).then(async (list) => {
            var finalList = list;

            for (let i = 0; i < finalList.length; i++) {
                let j = finalList[i].dataValues;
                await MainCategory.findOne({
                    attributes: ["Name"],
                    where: {
                        Id: j.M_Id
                    }
                }).then((item) => {
                    j.M_Name = item.dataValues.Name;
                    delete j.M_Id;
                    finalList.splice(i, 1, j);
                }).catch((err) => {
                    res.send(err);
                });
            }

            res.status(200).json(finalList);
        }).catch((err) => {
            res.send(err);
        });
    } catch (err) {
        res.send(err);
    }
};

const subCategoryList = async (req, res) => {
    try {
        await SubCategory.findAll({
            attributes: ["Id", "Name", "C_Id", "M_Id", "Image"]
        }).then(async (list) => {
            var finalList = list;

            for (let i = 0; i < finalList.length; i++) {
                let j = finalList[i].dataValues;
                await Category.findOne({
                    attributes: ["Name"],
                    where: {
                        Id: j.C_Id
                    }
                }).then((item) => {
                    j.C_Name = item.dataValues.Name;
                    delete j.C_Id;
                }).catch((err) => {
                    res.send(err);
                });
                await MainCategory.findOne({
                    attributes: ["Name"],
                    where: {
                        Id: j.M_Id
                    }
                }).then((item) => {
                    j.M_Name = item.dataValues.Name;
                    delete j.M_Id;
                    finalList.splice(i, 1, j);
                }).catch((err) => {
                    res.send(err);
                });
            }

            res.status(200).json(finalList);
        }).catch((err) => {
            res.send(err);
        });
    } catch (err) {
        res.send(err);
    }
};

const categoryListById = async (req, res) => {
    try {
        let M_Id = req.params.mid;

        await Category.findAll({
            attributes: ["Id", "Name"],
            where: {
                M_Id
            }
        }).then((list) => {
            res.status(200).json(list);
        }).catch((err) => {
            res.send(err);
        });
    } catch (err) {
        res.send(err);
    }
};

const subCategoryListById = async (req, res) => {
    try {
        let M_Id = req.params.mid;
        let C_Id = req.params.cid;

        await SubCategory.findAll({
            attributes: ["Id", "Name"],
            where: {
                M_Id,
                C_Id
            }
        }).then((list) => {
            res.status(200).json(list);
        }).catch((err) => {
            res.send(err);
        });
    } catch (err) {
        res.send(err);
    }
};

const categoryAndSubcategoryListById = async (req, res) => {
    try {
        let M_Id = req.params.mid;

        await Category.findAll({
            attributes: ["Id", "Name"],
            where: {
                M_Id
            }
        }).then(async (item) => {
            let finalList = item;

            for (let i = 0; i < finalList.length; i++) {
                let j = finalList[i].dataValues;
                await SubCategory.findAll({
                    attributes: ["Id", "Name", "Image"],
                    where: {
                        C_Id: j.Id,
                    }
                }).then((item) => {
                    j.SubCategory = item;
                    delete j.Id;
                    finalList.splice(i, 1, j);
                }).catch((err) => {
                    res.send(err);
                });
            }

            res.status(200).json(finalList);
        }).catch((err) => {
            res.send(err);
        });
    } catch (err) {
        res.send(err);
    }
};

// Update Main Category, Category and Sub-Category

const updateMainCategory = async (req, res) => {
    try {
        let { id, name } = req.body;
        let image = req.files.image;

        if (!(id && name)) {
            return res.status(400).json({ "msg": "Some field is empty." });
        }

        let str = image.mimetype;
        let lastIndex = str.lastIndexOf("/");
        let type = str.substring(lastIndex + 1);
        var imageToSet;

        await uploadToS3(image.data, type).then((result) => {
            imageToSet = result.Location;
        });

        await MainCategory.update({
            Name: name,
            Image: imageToSet
        }, {
            where: {
                Id: id
            }
        }).then(() => {
            res.status(200).json({ "msg": "Updated successfully." });
        }).catch((err) => {
            res.send(err);
        });
    } catch (err) {
        res.send(err);
    }
};

const updateCategory = async (req, res) => {
    try {
        let { id, name } = req.body;

        if (!(id && name)) {
            return res.status(400).json({ "msg": "Some field is empty." });
        }

        await Category.update({
            Name: name
        }, {
            where: {
                Id: id
            }
        }).then(() => {
            res.status(200).json({ "msg": "Updated successfully." });
        }).catch((err) => {
            res.send(err);
        });
    } catch (err) {
        res.send(err);
    }
};

const updateSubCategory = async (req, res) => {
    try {
        let { id, name } = req.body;
        let image = req.files.image;

        if (!(id && name)) {
            return res.status(400).json({ "msg": "Some field is empty." });
        }

        let str = image.mimetype;
        let lastIndex = str.lastIndexOf("/");
        let type = str.substring(lastIndex + 1);
        var imageToSet;

        await uploadToS3(image.data, type).then((result) => {
            imageToSet = result.Location;
        });

        await SubCategory.update({
            Name: name,
            Image: imageToSet
        }, {
            where: {
                Id: id
            }
        }).then(() => {
            res.status(200).json({ "msg": "Updated successfully." });
        }).catch((err) => {
            res.send(err);
        });
    } catch (err) {
        res.send(err);
    }
};

// Delete Main Category, Category and Sub-Category

const deleteMainCategory = async (req, res) => {
    try {
        let Id = req.params.id;

        await MainCategory.findOne({
            attributes: ["Image"],
            where: {
                Id
            }
        }).then(async (item) => {
            let image = item.dataValues.Image;

            let lastIndex = image.lastIndexOf("/");
            let name = image.substring(lastIndex + 1);
            await deleteToS3(name).then((result) => {
                console.log(result);
            });
        }).catch((err) => {
            res.send(err);
        });

        await MainCategory.destroy({
            where: {
                Id
            }
        }).then(() => {
            res.status(200).json({ "msg": "Deleted successfully." });
        }).catch((err) => {
            res.send(err);
        });
    } catch (err) {
        res.send(err);
    }
};

const deleteCategory = async (req, res) => {
    try {
        let Id = req.params.id;

        await Category.destroy({
            where: {
                Id
            }
        }).then(() => {
            res.status(200).json({ "msg": "Deleted successfully." });
        }).catch((err) => {
            res.send(err);
        });
    } catch (err) {
        res.send(err);
    }
};

const deleteSubCategory = async (req, res) => {
    try {
        let Id = req.params.id;

        await SubCategory.findOne({
            attributes: ["Image"],
            where: {
                Id
            }
        }).then(async (item) => {
            let image = item.dataValues.Image;

            let lastIndex = image.lastIndexOf("/");
            let name = image.substring(lastIndex + 1);
            await deleteToS3(name).then((result) => {
                console.log(result);
            });
        }).catch((err) => {
            res.send(err);
        });

        await SubCategory.destroy({
            where: {
                Id
            }
        }).then(() => {
            res.status(200).json({ "msg": "Deleted successfully." });
        }).catch((err) => {
            res.send(err);
        });
    } catch (err) {
        res.send(err);
    }
};

module.exports = { addMainCategory, addCategory, addSubCategory, mainCategoryList, categoryList, subCategoryList, categoryListById, subCategoryListById, categoryAndSubcategoryListById, updateMainCategory, updateCategory, updateSubCategory, deleteMainCategory, deleteCategory, deleteSubCategory }