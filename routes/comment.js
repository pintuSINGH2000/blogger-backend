const express = require("express");
const {
  createCommentController,
  deleteCommentController,
} = require("../controllers/post");
const { verifyToken } = require("../middleware/verifyToken");
const router = express.Router();

router.post("/", verifyToken, createCommentController);
router.delete("/:commentId", verifyToken, deleteCommentController);

module.exports = router;
