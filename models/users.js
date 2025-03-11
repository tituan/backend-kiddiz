const mongoose = require("mongoose");

const { Schema } = mongoose;

const addressSchema = new Schema({
  number: { type: Number },
  line1: { type: String },
  line2: { type: String }, // Optionnal
  zipCode: { type: Number },
  city: { type: String },
  state: { type: String },
  country: { type: String },
});

const termsSchema = new Schema({
  conditionUtilisation: { type: Boolean },
  publicy: { type: Boolean },
});

const userSchema = mongoose.Schema({
  email: { type: String },
  password: { type: String },
  firstname: { type: String },
  lastname: { type: String },
  token: { type: String },
  dateOfBirth: { type: Date },
  registrationDate: { type: Date },
  address: addressSchema, // Adress of the user
  picture: { type: String },
  phoneNumber: Number,
  note: { type: String },
  followers: [{ type: Schema.Types.ObjectId, ref: "users" }],
  stripeCustomerId: { type: String },
  socketId: { type: String },
  googleAuth: Boolean,
  terms: termsSchema, // Terms and conditions
  iban: { type: String },
  status: {
    type: String,
    enum: ["active", "banned", "pending"],
    default: "active",
  },
});


const User = mongoose.model("users", userSchema);

module.exports = User;
