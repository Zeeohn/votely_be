const express = require("express");
const dotenv = require("dotenv");
const router = express.Router();
const morgan = require("morgan");
const cors = require("cors");
const axios = require("axios");
const crypto = require("crypto");
const mongoose = require("mongoose");
const http = require("http");
const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");

dotenv.config();

const User = require("./userModel");
const Vote = require("./voteModel");

const userRoute = require("./userRoute");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: [
      "http://localhost:5173",
      "https://votely-iota.vercel.app",
      "https://www.ebeencardiovascularedu.com.ng/",
    ],
    methods: ["GET", "POST", "PATCH"],
  },
});

app.use(
  cors({
    origin: [
      "https://votely-iota.vercel.app",
      "http://localhost:5173",
      "https://www.ebeencardiovascularedu.com.ng/",
    ],
    credentials: true,
    // allowedHeaders: "*",
  })
);

app.options("*", cors());

app.use(express.json({ extended: true }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev"));

const generateKey = () => crypto.randomBytes(32).toString("base64");

const encryptData = (data, key) => {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(
    "aes-256-cbc",
    Buffer.from(key, "base64"),
    iv
  );
  let encrypted = cipher.update(data);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString("base64") + ":" + encrypted.toString("base64");
};

// const decryptData = (data, key) => {
//   const [iv, encryptedData] = data
//     .split(":")
//     .map((part) => Buffer.from(part, "base64"));
//   const decipher = crypto.createDecipheriv(
//     "aes-256-cbc",
//     Buffer.from(key, "base64"),
//     iv
//   );
//   let decrypted = decipher.update(encryptedData);
//   decrypted = Buffer.concat([decrypted, decipher.final()]);
//   return decrypted.toString();
// };

const decryptData = (data, key, iv) => {
  const decipher = crypto.createDecipheriv(
    "aes-256-cbc",
    Buffer.from(key, "base64"),
    Buffer.from(iv, "base64")
  );
  let decrypted = decipher.update(Buffer.from(data, "base64"));
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString();
};

io.on("connection", (socket) => {
  console.log(`a user connected ${socket.id}`);
  const key = generateKey();
  socket.emit("key", key);

  console.log("key", key);

  socket.on("getCandidates", async (data) => {
    if (!data) {
      io.emit("error", {
        status: false,
        message: "User Id not found, login and try again!",
      });
    }

    const candidates = await Vote.find();
    const user = await User.findById(data);

    if (!user) {
      io.emit("error", { status: false, message: "User not found!" });
    }

    io.emit("candidates", candidates);
    io.emit("db_user", user);
  });

  socket.on("vote", async (encryptedVoteBase64, ivBase64) => {
    const decryptedVote = decryptData(encryptedVoteBase64, key, ivBase64);
    const decrypted = JSON.parse(decryptedVote);

    try {
      const currentDate = Date.now();
      const existingUser = await User.findById(decrypted.userId);

      if (!existingUser) {
        io.emit("error", {
          status: false,
          message: "User not found login and try again!",
        });
        return;
      }

      const existingVotes = await Vote.find({
        voteCategory: decrypted.category,
      });

      const hasVoted = existingVotes.some((vote) =>
        vote.voters.some((voter) => voter.voterId === decrypted.userId)
      );

      if (hasVoted) {
        io.emit("error", {
          status: false,
          message: "You have already voted for a candidate in this category!",
        });
        return;
      }

      const vote = await Vote.findOne({ _id: decrypted.candidateId });

      if (vote) {
        const voteStartDate = new Date(vote.startDate);
        const voteEndDate = new Date(vote.endDate);

        if (currentDate < voteStartDate) {
          io.emit("error", {
            status: false,
            message: "Voting has not started yet!",
          });
          return;
        }

        if (currentDate > voteEndDate) {
          io.emit("error", {
            status: false,
            message: "Voting has ended for this category!",
          });
          return;
        }

        vote.voters.push({
          voterId: decrypted.userId,
          voterEmail: decrypted.userEmail,
          voterPicture: "",
        });
        vote.voteCount += 1;

        await vote.save();

        existingUser.votes.push({
          candidate: vote.candidateName,
          candidateParty: vote.candidateParty,
          category: vote.voteCategory,
        });

        await existingUser.save();

        io.emit("success", {
          message: "Vote casted successfully!",
          category: vote.category,
          candidate: vote.candidateName,
          vote: vote.voteCount,
        });
      } else {
        io.emit("error", "Candidate not found!");
      }
    } catch (error) {
      console.log(error);
      io.emit("error", {
        status: false,
        message: "An error occurred while casting vote!",
      });
    }
  });

  socket.on("live", async () => {
    try {
      const currentDate = Date.now();

      const updates = await Vote.find();

      if (!updates) {
        io.emit("no_update", {
          status: true,
          data: [],
          message: "No vote created yet!",
        });
      }

      const ongoing = [];
      const past = [];
      const upcoming = [];

      for (const update of updates) {
        const startDate = new Date(update.startDate);
        const endDate = new Date(update.endDate);
        const currentDate = new Date();

        if (startDate > currentDate) {
          upcoming.push(update);
        } else if (startDate <= currentDate && endDate >= currentDate) {
          ongoing.push(update);
        } else if (endDate < currentDate) {
          past.push(update);
        }
      }

      io.emit("ongoing", ongoing);
      io.emit("upcoming", upcoming);
      io.emit("past", past);
    } catch (error) {
      console.log(error);
      io.emit("error", {
        status: false,
        message: "An error occurred fetching live updates",
      });
    }
  });

  socket.on("disconnect", () => {
    console.log(`user disconnected ${socket.id}`);
  });
});

app.use("/auth", userRoute);

app.post("/proxy", async (req, res) => {
  console.log(req.body);

  try {
    const response = await axios.post(
      "https://api.anthropic.com/v1/messages",
      req.body,
      {
        headers: {
          "Content-Type": "application/json",
          "x-api-key": process.env.CLAUDE_AI_KEY,
          "anthropic-version": "2023-06-01",
        },
      }
    );

    res.json(response.data);
  } catch (error) {
    console.log(error);
    res
      .status(500)
      .json({ message: "Error making request", error: error.message });
  }
});

const PORT = process.env.PORT || 8002;
mongoose.set("strictQuery", false);

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("Database Connected");
    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((err) => console.log(err));
