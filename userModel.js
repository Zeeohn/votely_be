const mongoose = require("mongoose");
const { Schema, model } = mongoose;

const userSchema = new Schema(
  {
    email: {
      type: String,
      unique: [true, "Email already registered"],
      maxlength: 50,
      index: true,
      required: true,
    },
    password: {
      type: String,
      required: true,
    },
    firstname: {
      type: String,
      required: true,
    },
    lastname: {
      type: String,
      required: true,
    },
    resetPasswordToken: { type: String, default: null },
    resetPasswordExpires: { type: Date, default: null },
    resetPasswordStatus: { type: Boolean, default: false },
    picture: {
      type: String,
    },
    lastVisited: {
      type: Date,
      default: new Date(),
    },
    userType: {
      type: String,
      required: true,
      enum: ["voter", "admin"],
    },
    signupDate: {
      type: Date,
      default: new Date(),
    },
    votes: [
      {
        candidate: String,
        candidateParty: String,
        category: String,
      },
    ],
  },
  { timestamps: true }
);

const userModel = model("User", userSchema);
module.exports = userModel;
