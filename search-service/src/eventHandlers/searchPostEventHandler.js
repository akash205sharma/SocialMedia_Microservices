const Search = require("../models/Search");
const logger = require("../utils/logger");

const handlePostCreated = async (event) => {
    logger.info(event, "New Post created event received ");
    const newSearchPost = new Search({
        postId: event.postId,
        userId: event.userId,
        content: event.content,
        createdAt: event.createdAt,
    })
    await newSearchPost.save()
    logger.info(`Search post created: ${event.postId}, ${newSearchPost._id.toString()}`);

    try {

        logger.info();
    } catch (e) {
        // ✅ Log error message properly
        logger.error(`Error occurred while           media for post: ${event.postId}`, {
            error: e.message,
            stack: e.stack,
        });
    }
};

const handlePostDeleted = async (event) => {
    logger.info(event, "Post deleted event received ");
    try {
    await Search.findOneAndDelete({ postId: event.postId })

    logger.info(`Search post deleted: ${event.postId}`);
    } catch (e) {
        // ✅ Log error message properly
        logger.error(`Error occurred while           media for post: ${event.postId}`, {
            error: e.message,
            stack: e.stack,
        });
    }
};

module.exports = { handlePostCreated, handlePostDeleted };
