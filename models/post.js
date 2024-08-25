const mongoose = require("mongoose");

const postSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      trim: true,
    },
    content: {
      type: String,
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    image: {
      type: String,
      default: "",
    },
    status: {
      type: Number,
      enum: [1, 2, 3], //1->publish 2->draft 3->thrash
      default: 2,
    },
    trashDate: {
      type: Date,
      default: null,
      index: { expires: "30d", partialFilterExpression: { status: "trash" } },
    },
    publishedOn: {
      type: Date,
      default: null,
    },
    views: {
      type: Number,
      default: 0,
    },
    commentCount: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: { createdAt: "createdAt", updatedAt: "updatedAt" } }
);

const Post = mongoose.model("Post", postSchema);

module.exports = Post;
