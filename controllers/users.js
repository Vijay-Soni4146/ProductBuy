const UserService = require("../db/userServices");
const { v4: uuidv4 } = require("uuid");
const {
  GeneralMsgs,
  TableFields,
  ValidationMsgs,
} = require("../utils/constants");
const ValidationError = require("../utils/ValidationError");
const Session = require("../models/session");
const Order = require("../models/order");
const stripe = require("stripe")(process.env.SKTEST_KEY);

exports.register = async (req, res) => {
  // Check if email exists
  const userExists = await UserService.getUserByEmail(req.body.email)
    .withEmail()
    .execute();

  if (userExists) {
    return res.status(500).json({
      status: 500,
      message: GeneralMsgs.emailExists,
      result: [],
    });
  }

  const User = await UserService.insertUserRecord(req.body);

  return res.json({ User });
};

exports.login = async (req, res) => {
  const { email, password } = req.body;
  // console.log(email, password);

  const user = await UserService.getUserByEmail(email)
    .withEmail()
    .withPassword()
    .withId()
    .withName()
    .withMobile()
    .execute();

  if (!user) {
    res.status(500).json({
      message: "Invalid Email",
    });
  }

  if (!(await user.isValidPassword(password))) {
    res.status(500).json({
      message: "Invalid Password",
    });
  }

  const token = await UserService.genAuthToken(user);

  UserService.saveAuthToken(user[TableFields.ID], token);

  return res.json({ user, token });
};

exports.isAuth = async (req, res) => {
  return res.json(req.user);
};

exports.logout = async (req, res) => {
  const headerToken = req.header("Authorization").replace("Bearer ", "");
  UserService.removeAuth(req.user[TableFields.ID], headerToken);
  return res.json(true);
};

exports.forgotPassword = async (req, res) => {
  let providedEmail = req.body[TableFields.email];
  providedEmail = (providedEmail + "").trim().toLowerCase();

  if (!providedEmail) throw new ValidationError(ValidationMsgs.emailEmpty);

  let { code, name, email } = await UserService.getResetPasswordToken(
    providedEmail
  );
  return { code, name, email };
  // Email.SendForgotPasswordEmail(name, email, code);
};

exports.resetPassword = async (req, res) => {
  let providedEmail = req.body[TableFields.email];
  providedEmail = (providedEmail + "").trim().toLowerCase();

  const { code, newPassword } = req.body;

  if (!providedEmail) throw new ValidationError(ValidationMsgs.emailEmpty);
  if (!code) throw new ValidationError(ValidationMsgs.passResetCodeEmpty);
  if (!newPassword) throw new ValidationError(ValidationMsgs.newPasswordEmpty);

  let user = await UserService.resetPassword(providedEmail, code, newPassword);
  let token = await createAndStoreAuthToken(user);
  return {
    user: await UserService.getUserById(user[TableFields.ID])
      .withPassword()
      .withEmail()
      .withId()
      .withName()
      .execute(),
    token: token || undefined,
  };
};

async function createAndStoreAuthToken(userObj) {
  const token = UserService.genAuthToken(userObj);
  await UserService.saveAuthToken(userObj[TableFields.ID], token);
  return token;
}

exports.getCheckout = async (req, res) => {
  const cart = req.body.cart;
  // console.log(cart);
  let total = 0;
  const products = cart.map((item) => {
    total += item.amount * item.price;
  });
  total = total / 100;
  // console.log(total);
  // console.log("Creating Stripe session...");

  const sessionId = uuidv4();
  let user = {
    email: req.user.email,
    userId: req.user._id,
  };
  await UserService.insertCartData(sessionId, cart, total, user);

  stripe.checkout.sessions
    .create({
      payment_method_types: ["card"],
      mode: "payment",
      line_items: cart.map((p) => {
        return {
          price_data: {
            currency: "inr",
            product_data: {
              name: p.name,
            },
            unit_amount: p.price,
          },
          quantity: p.amount,
        };
      }),
      success_url:
        req.protocol +
        "://" +
        req.get("host") +
        `/api/users/checkout/success?sessionId=${sessionId}`, // => http://localhost:3000
      cancel_url: `https://simplebuyz.netlify.app/cart`,
    })
    .then((session) => {
      // console.log("Stripe session created:", session);
      res.status(200).json({
        sessionId: session.id,
        totalSum: total,
      });
    })
    .catch((err) => {
      // console.error("Error creating Stripe session:", err);
      res.status(500).json({
        message: "Internal Server Error",
      });
    });
};

exports.getCheckoutSuccess = async (req, res, next) => {
  // console.log("Hello");
  const sessionId = req.query.sessionId;
  // console.log(sessionId);

  if (!sessionId) {
    return res.status(400).json({
      message: "Missing session ID",
    });
  }

  try {
    const sessionData = await Session.findOne({ sessionId });

    if (!sessionData) {
      return res.status(404).json({
        message: "Session data not found",
      });
    }

    const { cart, user } = sessionData;

    // console.log("Checkout success with cart:", cart);
    // console.log("Total:", total);

    const products = cart.map((item) => {
      return { quantity: item.amount, product: { ...item } };
    });

    const order = new Order({
      user: {
        email: user.email,
        userId: user.userId,
      },
      products: products,
    });
    await order.save();

    await Session.deleteOne({ sessionId });

    res.redirect(`https://simplebuyz.netlify.app/order`);
  } catch (err) {
    res.status(500).json({
      message: "Internal Server Error",
    });
  }
};

exports.getOrders = async (req, res) => {
  const orders = await Order.find({ "user.userId": req.user._id });
  if (orders) {
    return res.status(200).json({
      order: orders,
    });
  } else {
    res.status(500).json({
      message: "Internal Server Error",
    });
  }
};
