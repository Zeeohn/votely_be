const { Router } = require("express");
const authorize = require("./authorize");
const {
  signup,
  login,
  createCandidates,
  getCandidates,
} = require("./userController");

const userRoute = Router();

userRoute.post("/signup", signup);

userRoute.post("/login", login);

userRoute.post("/create", authorize, createCandidates);

userRoute.get("/get_candidates", authorize, getCandidates);

module.exports = userRoute;
