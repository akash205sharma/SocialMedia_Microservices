const Media = require("../models/Media");
const { deleteMediaFromCloudinary } = require("../utils/cloudinary");
const logger = require("../utils/logger");

const handlePostDeleted = async (event) => {
    logger.info(event, "post deleted event received");

    try {
        const { postId, userId, mediaIds } = event;
        logger.info(`PostID: ${postId}, MediaIDs: ${JSON.stringify(mediaIds)}`);

        // ✅ Await the database query
        const mediaToDelete = await Media.find({ _id: { $in: mediaIds } });

        for (const media of mediaToDelete) {
            await deleteMediaFromCloudinary(media.publicId);
            await Media.findByIdAndDelete(media._id);
            logger.info(`Deleted media ${media._id} associated with post ${postId}`);
        }

        logger.info(`Processed deletion of media for post id ${postId}`);
    } catch (e) {
        // ✅ Log error message properly
        logger.error(`Error occurred while deleting media for post: ${event.postId}`, {
            error: e.message,
            stack: e.stack,
        });
    }
};

module.exports = { handlePostDeleted };
