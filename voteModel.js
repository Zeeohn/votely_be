const mongoose = require("mongoose");
const { Schema, model } = mongoose;

const voteSchema = new Schema(
  {
    candidateName: {
      type: String,
      required: true,
    },
    candidateParty: {
      type: String,
      required: true,
    },
    candidatePicture: {
      type: String,
    },
    voteCategory: {
      type: String,
    },
    voters: [
      {
        voterId: String,
        voterEmail: String,
        voterPicture: String,
      },
    ],
    voteCount: {
      type: Number,
      default: 0,
    },
    startDate: {
      type: String,
    },
    endDate: {
      type: String,
    },
  },
  { timestamps: true }
);

const voteModel = model("Vote", voteSchema);
module.exports = voteModel;
