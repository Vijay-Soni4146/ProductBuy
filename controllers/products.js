const Product = require("../models/product");

const getAllProducts = async (req, res) => {
  const { company, name, feature, sort, select } = req.query;
  const queryObject = {};

  if (company) {
    queryObject.company = company;
  }
  if (feature) {
    queryObject.feature = feature;
  }
  if (name) {
    queryObject.name = { $regex: name, $options: "i" };
  }

  let apiData = Product.find(queryObject);
  if (sort) {
    let sortFix = sort.replace(",", " ");
    apiData = apiData.sort(sortFix);
    // queryObject.sort = sortFix;
  }

  if (select) {
    let selectFix = select.split(",").join(" ");
    apiData = apiData.select(selectFix);
  }

  let page = Number(req.query.page) || 1;
  let limit = Number(req.query.limit) || 3;

  let skip = (page - 1) * limit;

  // apiData = apiData.skip(skip).limit(limit);

  // console.log(queryObject);

  const Products = await apiData;
  res.status(200).json({ Products, nbHits: Products.length });
};

const createProduct = async (req, res) => {
  const product = new Product({
    ...req.body,
  });
  try {
    let products = await product.save();
    res.json({ result: "success", products: products });
  } catch (err) {
    // console.log(err);
    res.status(500).json({
      message: "Internal Server Error",
    });
  }
};

const getProduct = async (req, res) => {
  const id = req.params.id;
  try {
    const product = await Product.findById(id);
    res.status(200).json({ product });
  } catch (err) {
    // console.log(err);
    res.status(500).json({
      message: "Internal Server Error",
    });
  }
};

module.exports = {
  getAllProducts,
  createProduct,
  getProduct,
};
