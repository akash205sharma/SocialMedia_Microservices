const Post = require("../models/Post");
const logger = require("../utils/logger");
const { publishEvent } = require("../utils/rabbitmq");
const validateCreatePost = require("../utils/validation")

const invalidateCache = async (req, input) => {
    // Invalidate all cached post lists (e.g., posts:*)
    const cachedKey = `post:${input}`
    await req.redisClient.del(cachedKey)

    const keys = await req.redisClient.keys('posts:*');
    if (keys.length > 0) {
        await req.redisClient.del(keys);
    }
}

const createPost = async (req, res) => {
    logger.info('Create post endpoint hit')
    try {
        const { error } = validateCreatePost(req.body);
        if (error) {
            logger.error("Validation error", error.details[0].message);
            res.status(400).json({
                success: false,
                message: error.details[0].message,
            });
        }
        const { content, mediaIds } = req.body;
        const newPost = Post({
            user: req.user.userId,
            content,
            mediaIds: mediaIds || []
        })

        await newPost.save();

        //publish post create method to let media receive delete event and can delete media from database.
        await publishEvent('post.created', {
            postId: newPost._id.toString(),
            userId: newPost.user.toString(),
            content: newPost.content,
            createdAt:newPost.createdAt,
        })

        await invalidateCache(req, newPost._id)
        logger.info("Post created successfully")

        res.status(201).json({
            success: true,
            message: "Post created successfully"
        })
    } catch (e) {
        logger.error("Error creating post", e);
        res.status(500).json({
            success: false,
            message: "Error creating post",
        });
    }
};

const getAllPosts = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const startIndex = (page - 1) * limit;

        const cacheKey = `posts:${page}:${limit}`;
        const cachedPosts = await req.redisClient.get(cacheKey)

        if (cachedPosts) {
            return res.json(JSON.parse(cachedPosts));
        }
        const posts = await Post.find({})
            .sort({ createdAt: -1 })
            .skip(startIndex)
            .limit(limit);

        const totalNoOfPosts = await Post.countDocuments()

        const result = {
            posts,
            currentPage: page,
            totalPages: Math.ceil(totalNoOfPosts / limit),
            totalPosts: totalNoOfPosts
        }

        await req.redisClient.setex(cacheKey, 300, JSON.stringify(result))
        res.json(result);

    } catch (e) {
        logger.error("Error fetching all post", error);
        res.status(500).json({
            success: false,
            message: "Error fetching all post",
        });
    }
};

const getPost = async (req, res) => {
    try {
        // const id = parseInt(req.query.id) || 1;
        const id = req.params.id;
        const cacheKey = `post:${id}`;
        const cachedPost = await req.redisClient.get(cacheKey)

        if (cachedPost) {
            return res.json(JSON.parse(cachedPost));
        }
        const singlePost = await Post.findById(id);

        if (!singlePost) {
            return res.status(404).json({
                success: false,
                message: "Post not found",
            });
        }
        const result = singlePost

        await req.redisClient.setex(cacheKey, 300, JSON.stringify(result))
        res.json(result);

    } catch (e) {
        logger.error("Error fetching post", error);
        res.status(500).json({
            success: false,
            message: "Error fetching post",
        });
    }
};

const deletePost = async (req, res) => {
    try {
        // const id = parseInt(req.query.id) || 1;
        const id = req.params.id;

        const post = await Post.findOneAndDelete({
            _id: id,
            user: req.user.userId
        });

        if (!post) {
            return res.status(404).json({
                message: "Post not found",
                success: false,
            })
        }
        //publish post delete method to let media receive delete event and can delete media from database.
        await publishEvent('post.deleted', {
            postId: id.toString(),
            userId: req.user.userId,
            mediaIds: post.mediaIds
        })

        await invalidateCache(req, id)
        res.status(204).json({
            success: true,
            message: "Post deleted successfully"
        });

    } catch (e) {
        logger.error("Error deleting post", e);
        res.status(500).json({
            success: false,
            message: "Error deleting post",
        });
    }
};

module.exports = { getAllPosts, getPost, createPost, deletePost }
