const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const {
  ValidationMsgs,
  TableFields,
} = require("../utils/constants");

const userSchema = new Schema({
  email: {
    type: String,
    required: true,
  },
  password: {
    type: String,
    required: true
  },
  [TableFields._name]: {
      type: String,
      trim: true,
    },
    [TableFields.mobile]: {
      type: Number,
      trim: true,
    },
    [TableFields.tokens]: [
      {
        _id: false,
        [TableFields.token]: {
          type: String,
        },
      },
    ],
    [TableFields.passwordResetToken]: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
    toObject: {
      transform: function (doc, ret) {
        delete ret.__v;
      },
    },
    toJSON: {
      transform: function (doc, ret) {
        delete ret.__v;
        delete ret.password;
      },
    },
  }
);

userSchema.pre("save", async function (next) {
  const user = this;
  if (user.isModified("password")) {
    user.password = await bcrypt.hash(user.password, 8);
  }
  next();
});

userSchema.methods.isValidPassword = async function (password) {
  return await bcrypt.compare(password, this.password);
};
userSchema.methods.generateAuthToken = function () {
  let user = this;
  const userObj = {
    [TableFields.ID]: user[TableFields.ID].toString(),
    email: user.email,
  };
  const token = jwt.sign(userObj, process.env.JWT_SECRET, { expiresIn: "1d" });
  return token;
};

const User = mongoose.model('User', userSchema);

module.exports = {User}
