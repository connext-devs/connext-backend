const mongoose = require("mongoose");
const { v4: uuidv4 } = require("uuid");

const ScrapeBatchSchema = new mongoose.Schema(
  {
    batchUID: {
      type: String,
      unique: true,
    },

    scrapeDate: {
      type: Date,
      default: Date.now, 
    },

    duration: {
      type: Number,
      default: 0,      
    },

    numOfJobScraped: {
      type: Number,
      default: 0,
    },

    type: {
      type: String
    }
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Scrape_Batch", ScrapeBatchSchema);
