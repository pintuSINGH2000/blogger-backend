const express = require("express");
const { createPostController, updatePostController, getAllPostController, getSinglePostController, updatePostStatusController, deletePostController, createCommentController, getPublicPostController } = require("../controllers/post");
const { verifyToken } = require("../middleware/verifyToken");
const router = express.Router();

router.post("/",verifyToken, createPostController);
router.put("/:postId",verifyToken, updatePostController);
router.put("/update-status/:postId",verifyToken, updatePostStatusController);
router.get("/",verifyToken,getAllPostController);
router.get("/:postId",verifyToken,getSinglePostController);
router.delete("/:postId",verifyToken, deletePostController);
router.get("/public-post/:postId/:userId?",getPublicPostController);

module.exports = router;