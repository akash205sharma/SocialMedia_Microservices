const logger= require("../utils/logger")

const authenticateRequest = (req,res,next) =>{
    const userId = req.headers['x-user-id']
    if(!userId){
        logger.warn('Access attempt withou user ID')
        return res.status(401).json({
            success:false,
            message:"Authenticate required! Please login to constinue"
        })
    }
    req.user = {userId}
    next()
}

module.exports = {authenticateRequest};