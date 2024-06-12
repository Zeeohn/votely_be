const jwt = require("jsonwebtoken");
const argon2 = require("argon2");
const dotenv = require("dotenv");
const User = require("./userModel");
const Vote = require("./voteModel");

dotenv.config();

exports.signup = async (req, res) => {
  try {
    const { email, password, firstname, lastname } = req.body;
    if (!email || !password || !firstname || !lastname) {
      return res
        .status(400)
        .json({ status: false, message: "Please provide email and password" });
    }

    const userExists = await User.findOne({
      email,
    });

    if (userExists) {
      return res.status(400).json({
        status: false,
        message: "User with email already exists, please login",
      });
    }

    const hashedPassword = await argon2.hash(password);

    const user = await User.create({
      email,
      password: hashedPassword,
      userType: "voter",
      firstname,
      lastname,
    });

    const token = jwt.sign(
      { id: user._id, role: user.userType },
      process.env.JWT_SECRET,
      {
        expiresIn: "5d",
      }
    );
    res.status(201).json({ status: true, user, token });
  } catch (error) {
    console.log(error);
    res.status(500).json({ status: false, message: error.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res
        .status(400)
        .json({ status: false, message: "Please provide email and password" });
    }
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({
        status: false,
        message: "User not found, please signup and try again!",
      });
    }

    const verifiedPassword = await argon2.verify(user.password, password);

    if (!verifiedPassword) {
      res.status(401).json({
        status: false,
        passwordCorrect: false,
        message: "Invalid password, please check and try again!",
      });
      return;
    }
    const token = jwt.sign(
      { id: user._id, role: user.userType },
      process.env.JWT_SECRET,
      {
        expiresIn: "36h",
      }
    );
    res.status(200).json({ status: true, user, token });
  } catch (error) {
    res.status(500).json({ status: false, message: error.message });
  }
};

exports.createCandidates = async (req, res) => {
  const { name, party, picture, category, end, start } = req.body;

  try {
    if (!name || !party || !category || !end || !start) {
      return res.status(400).json({
        status: false,
        message: "Please fill in all required fields!",
      });
    }

    const existingCandidate = await Vote.findOne({
      candidateName: name.toLowerCase(),
    });

    if (
      existingCandidate ||
      (existingCandidate?.candidateParty?.toLowerCase() ===
        party.toLowerCase() &&
        existingCandidate)
    ) {
      return res.status(400).json({
        status: false,
        message: "This candidate exists already!",
      });
    }

    const vote = await Vote.create({
      candidateName: name.toLowerCase(),
      candidateParty: party.toLowerCase(),
      voteCategory: category.toLowerCase(),
      candidatePicture: picture,
      startDate: start,
      endDate: end,
    });

    res.status(201).json({
      status: true,
      data: vote,
      message: "Candidate added successfully!",
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      status: false,
      message: "An unexpected error occurred please try again!",
    });
  }
};

exports.getCandidates = async (req, res) => {
  try {
    const candidates = await Vote.find();

    if (!candidates && req.user.userType === admin) {
      return res.status(200).json({
        status: true,
        data: [],
        message: "No available candidates yet, you need to create one first!",
      });
    }

    if (!candidates && req.user.userType === "voter") {
      return res.status(200).json({
        status: true,
        data: [],
        message: "No available candidates yet, check back later!",
      });
    }

    res.status(200).json({
      status: true,
      data: candidates,
      message: "Candidates fetched successfully!",
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: "An error occurred while fetching candidates!",
    });
  }
};

exports.getSingleCandidate = async (req, res) => {
  const id = req.params.id;

  if (!id) {
    return res.status(400).json({
      status: false,
      message: "ID cannot be empty",
    });
  }

  try {
    const candidate = await Vote.findById(id);

    if (!candidate) {
      return res.status(400).json({
        status: false,
        message: "There is no such existing candidate!",
      });
    }
  } catch (error) {
    res.status(500).json({
      status: false,
      message: "An error occurred!",
    });
  }
};
