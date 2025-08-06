const Search = require("../models/Search")
const logger = require("../utils/logger")

const getAllSearchPost = async (req, res) => {
    logger.info('Search endPoint hit!')
    try {
    
        const results = await Search.findOne({userId:req.user.userId})
        if(!results || results.length ===0 ) return res.status(400).json({
            success:true,
            message:"No post is there",
        })
        res.json(results);
    } catch (e) {
        logger.error("Error searching post", e);
        res.status(500).json({
            success: false,
            message: "Error searching post",
        });
    }
}
const searchPostController = async (req, res) => {
    logger.info('Search endPoint hit!')
    try {
        const { query } = req.query
        console.log(query);

        const results = await Search.find(
            {
                $text: { $search: query }
            },
            {
                score: { $meta: 'textScore' }
            }
        ).sort({ score: { $meta: "textScore" } })
            .limit(10);

        res.json(results);
    } catch (e) {
        logger.error("Error searching post", e);
        res.status(500).json({
            success: false,
            message: "Error searching post",
        });
    }
}

module.exports = {getAllSearchPost,searchPostController};