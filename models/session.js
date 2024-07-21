const mongoose = require("mongoose");

const sessionSchema = new mongoose.Schema({
  sessionId: { type: String, required: true, unique: true },
  cart: { type: Array, required: true },
  total: { type: Number, required: true },
  user: { type: Object, required: true },
  createdAt: { type: Date, default: Date.now, expires: 3600 }, // Session expires in 1 hour
});

const Session = mongoose.model("Session", sessionSchema);

module.exports = Session;
