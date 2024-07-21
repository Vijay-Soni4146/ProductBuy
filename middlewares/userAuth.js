const jwt = require("jsonwebtoken");
const {
  TableFields,
  ApiResponseCode,
  ValidationMsgs,
} = require("../utils/constants");
const Util = require("../utils/utils");
const userService = require("../db/userServices");
const ValidationError = require("../utils/ValidationError");
require("dotenv").config();

const userAuth = async (req, res, next) => {
  try {
    const token = req.header("Authorization").replace("Bearer ", "");
    const decode = jwt.verify(token, process.env.JWT_SECRET);

    const user = await userService
      .getUserByIdAndToken(decode[TableFields.ID], token)
      .withEmail()
      .withId()
      .withMobile()
      .withName()
      .execute();
    if (!user) {
      res.json({message:"Error JWT"})
    }
    req.user = user;
    next();
  } catch (err) {
    // console.log("JWT error:", err.message);
    res
      .status(ApiResponseCode.Unauthorized)
      .send(Util.getErrorMessageFromString(ValidationMsgs.authFail));
  }
};

module.exports = userAuth;
