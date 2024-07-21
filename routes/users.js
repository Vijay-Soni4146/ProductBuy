const express = require("express");
const router = express.Router();
const {
  register,
  login,
  logout,
  resetPassword,
  forgotPassword,
  isAuth,
  getCheckout,
  getCheckoutSuccess,
  getOrders
} = require("../controllers/users");

const userAuth = require("../middlewares/userAuth");

router.post("/register", register);
router.post("/login", login);
router.post("/forgotPassword", forgotPassword);
router.post("/resetPassword", resetPassword);
router.post("/logout",userAuth, logout);
router.get("/isauth", userAuth, isAuth);

router.post("/checkout",userAuth, getCheckout);

router.get("/checkout/success", getCheckoutSuccess);

router.get("/orders", userAuth, getOrders);

// router.get("/orders", userAuth, getOrders);

// router.get("/orders/:orderId", userAuth, getInvoice);

module.exports = router;
