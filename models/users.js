const mongoose = require("mongoose");

const { Schema } = mongoose;

const addressSchema = new Schema({
  number: { type: Number },
  line1: { type: String },
  line2: { type: String }, // Optionnel
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
  dateOfBirth: { type: String },
  registrationDate: { type: Date },
  address: addressSchema, // Intégration du sous-schéma d'adresse
  picture: { type: String },
  phoneNumber: Number,
  note: { type: String, default: 5},
  followers: [{ type: Schema.Types.ObjectId, ref: "User" }],
  stripeCustomerId: { type: String },
  socketId: { type: String },
  terms: termsSchema,
  status: {
    type: String,
    enum: ["active", "banned", "pending"],
    default: "active",
  },
});


const User = mongoose.model("users", userSchema);

module.exports = User;
