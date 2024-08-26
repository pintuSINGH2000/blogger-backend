const { default: mongoose } = require("mongoose");
const Comment = require("../models/comment");
const Post = require("../models/post");
const User = require("../models/user");

const createPostController = async (req, res) => {
  try {
    const creator = req.creator;
    const post = new Post({
      title: "",
      content: "",
      author: creator,
      image: "",
    });

    await post.save();
    res
      .status(201)
      .send({ postId: post._id, message: "Post Created Successfully" });
  } catch (error) {
    return res.status(500).json({ errorMessage: "Internal Server Error" });
  }
};

const updatePostController = async (req, res) => {
  try {
    const { postId } = req.params;
    const postData = req.body;
    const creator = req.creator;
    const post = await Post.findOne({ _id: postId, author: creator });

    if (!post) {
      return res.status(404).json({ errorMessage: "Post not found" });
    }

    // Update the post fields
    post.title = postData.title || post.title;
    post.content = postData.content || post.content;
    post.image = postData.image || post.image;

    // Save the updated post
    await post.save();
    res.status(200).send({ updated: true });
  } catch (error) {
    return res.status(500).json({ errorMessage: "Internal Server Error" });
  }
};

const updatePostStatusController = async (req, res) => {
  try {
    const { postId } = req.params;
    const postData = req.body;
    const creator = req.creator;
    if (
      !postData ||
      !postId ||
      !postData.status ||
      ![1, 2, 3].includes(postData.status)
    ) {
      return res.status(400).send({ errorMessage: "Bad request" });
    }

    const post = await Post.findOne({ _id: postId, author: creator });
    if (!post) {
      return res.status(404).json({ errorMessage: "Post not found" });
    }

    if (postData.status == 1) {
      post.status = 1;
      post.publishedOn = new Date();
      post.trashDate = null;
      post.title = postData.title || post.title;
      post.content = postData.content || post.content;
      post.image = postData.image || post.image;
    } else if (postData.status == 3) {
      post.status = 3;
      post.publishedOn = null;
      post.trashDate = new Date();
    } else {
      post.status = 2;
      post.publishedOn = null;
      post.trashDate = null;
    }
    await post.save();
    let message = "";
    if (postData.status === 1) {
      message = "Post publish successfully";
    } else if (postData.status == 2) {
      message = "Post saved as draft";
    } else if (postData.status == 3) {
      message = "Post saved in thrash";
    }
    res.status(200).send({ post: post, message: message });
  } catch (error) {
    return res.status(500).json({ errorMessage: "Internal Server Error" });
  }
};

const getSinglePostController = async (req, res) => {
  try {
    const { postId } = req.params;
    const creator = req.creator;
    if (!postId) {
      return res.status(400).send({ errorMessage: "Bad request" });
    }
    const post = await Post.findOne({ _id: postId, author: creator }).select(
      "title content imageurl status"
    );
    res.status(200).send({ post: post });
  } catch (error) {
    return res.status(500).json({ errorMessage: "Internal Server Error" });
  }
};

const getAllPostController = async (req, res) => {
  try {
    const status = parseInt(req.query.status);
    const creator = req.creator;
    const skip = req.query.skip;
    const isFirst = !skip || parseInt(skip) === 0;
    let query = { author: creator };

    if (![0, 1, 2, 3].includes(status)) {
      return res.status(400).send({ errorMessage: "Bad request" });
    }
    if (status > 0) {
      query.status = status;
    }
    let statusCount = {};
    if (isFirst) {
      const result = await Post.aggregate([
        {
          $match: {
            author: new mongoose.Types.ObjectId(creator),
          },
        },
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 },
          },
        },
      ]);
      const counts = result.reduce((acc, { _id, count }) => {
        acc[_id] = count;
        return acc;
      }, {});

      // Get counts for specific status:
      statusCount.publish = counts[1] || 0;
      statusCount.draft = counts[2] || 0;
      statusCount.thrash = counts[3] || 0;

      // Overall total count for these status:
      statusCount.all =
        statusCount.publish + statusCount.draft + statusCount.thrash;
    }

    const posts = await Post.find(query)
      .sort({ status: 1, createdAt: -1 })
      .skip(parseInt(skip))
      .limit(12);
    res.status(200).send({
      statusCount: statusCount,
      posts: posts,
      message: "Post Updated Successfully",
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ errorMessage: "Internal Server Error" });
  }
};

const deletePostController = async (req, res) => {
  try {
    const { postId } = req.params;
    const creator = req.creator;
    if (!postId) {
      return res.status(400).send({ errorMessage: "Bad request" });
    }
    const deletedPost = await Post.findOneAndDelete({
      _id: postId,
      author: creator,
    });
    res
      .status(200)
      .send({ deleted: true, message: "Post deleted Successfully" });
  } catch (error) {
    return res.status(500).json({ errorMessage: "Internal Server Error" });
  }
};

const getPublicPostController = async (req, res) => {
  const { postId, userId } = req.params;

  if (
    !postId ||
    !mongoose.Types.ObjectId.isValid(postId) ||
    (userId && !mongoose.Types.ObjectId.isValid(userId))
  ) {
    return res.status(400).send({ errorMessage: "Bad request" });
  }
  let user = null;
  if (userId) {
    user = await User.findById(userId);
  }

  const post = await Post.findById(postId)
    .populate({
      path: "author",
      select: "username",
    })
    .select("title content imageurl author");

  if (!post) {
    return res.status(404).send({ errorMessage: "Post not found" });
  }

  const postObjectId = new mongoose.Types.ObjectId(postId);
  const postAuthorObjectId = new mongoose.Types.ObjectId(post.author);
  const comments = await Comment.find({
    postId: postObjectId,
    parentComment: null,
  })
    .sort({ createdAt: -1 })
    .populate({
      path: "author",
      select: "username",
    })
    .lean();

  const commentIds = comments.map((comment) => comment._id);

  const replies = await Comment.find({ parentComment: { $in: commentIds } })
    .sort({ createdAt: 1 })
    .populate({
      path: "author",
      select: "username",
    })
    .lean();

  const repliesByParentId = replies.reduce((acc, reply) => {
    let isDeletable = false;
    let isEditable = false;

    if (userId) {
      const userObjectId = new mongoose.Types.ObjectId(userId);
      isDeletable =
        reply.author._id.equals(userObjectId) ||
        postAuthorObjectId.equals(userObjectId);
    }

    const replyWithDeletable = { ...reply, isDeletable, isEditable };

    if (!acc[reply.parentComment]) {
      acc[reply.parentComment] = [];
    }
    acc[reply.parentComment].push(replyWithDeletable);
    return acc;
  }, {});

  const commentsWithReplies = comments.map((comment) => {
    let isDeletable = false;
    let isEditable = false;

    // Check if userObjectId is present
    if (userId) {
      const userObjectId = new mongoose.Types.ObjectId(userId);
      isDeletable =
        comment.author._id.equals(userObjectId) ||
        postAuthorObjectId.equals(userObjectId);
    }
    if (user) {
      isEditable = true;
    }
    

    return {
      ...comment,
      isDeletable,
      isEditable,
      replies: repliesByParentId[comment._id] || [],
    };
  });
  await Post.findByIdAndUpdate(postId, { $inc: { views: 1 } });
  res.status(200).send({ post, comments: commentsWithReplies });
};

const createCommentController = async (req, res) => {
  try {
    const { postId, content, parentComment } = req.body;
    const creator = req.creator;
    if (!postId || !content) {
      return res.status(400).send({ errorMessage: "Bad request" });
    }
    if (
      !mongoose.Types.ObjectId.isValid(postId) ||
      (parentComment && !mongoose.Types.ObjectId.isValid(parentComment))
    ) {
      return res.status(400).send({ errorMessage: "Bad request" });
    }
    const newComment = new Comment({
      postId,
      author: creator,
      content,
      parentComment: parentComment ? parentComment : null,
    });

    await newComment.save();
    await Post.findByIdAndUpdate(postId, { $inc: { commentCount: 1 } });
    await newComment.populate({
      path: "author",
      select: "username",
    });
    res
      .status(201)
      .json({ message: "Comment added successfully", comment: newComment });
  } catch (error) {
    return res.status(500).json({ errorMessage: "Internal Server Error" });
  }
};

const deleteCommentController = async (req, res) => {
  try {
    const { commentId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(commentId)) {
      return res.status(400).send({ errorMessage: "Bad request" });
    }
    const creator = req.creator;
    const comment = await Comment.findById(commentId);
    if (!comment) {
      return res.status(400).send({ errorMessage: "Bad request" });
    }

    const post = await Post.findById(comment.postId);

    if (!post) {
      return res.status(400).send({ errorMessage: "Bad request" });
    }

    // Check if the user is authorized to delete the comment
    if (
      comment.author.toString() !== creator.toString() &&
      post.author.toString() !== creator.toString()
    ) {
      return res.status(403).send({
        errorMessage: "You are not authorized to delete this comment",
      });
    }

    await Comment.deleteOne({ _id: commentId });

    const result = await Comment.deleteMany({ parentComment: commentId });
    await Post.findByIdAndUpdate(comment.postId, {
      $inc: { commentCount: -(result.deletedCount + 1) },
    });

    res
      .status(200)
      .json({ deleted: 1, message: "Comment deleted successfully" });
  } catch (error) {
    return res.status(500).json({ errorMessage: "Internal Server Error" });
  }
};

module.exports = {
  createPostController,
  updatePostController,
  getAllPostController,
  updatePostStatusController,
  getSinglePostController,
  deletePostController,
  getPublicPostController,
  createCommentController,
  deleteCommentController,
};
