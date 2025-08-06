const logger = require("../utils/logger");
const jwt = require("jsonwebtoken")
const validateToken = (req, res, next) => {
    const authHeaders = req.headers['authorization'];
    const token = authHeaders && authHeaders.split(" ")[1]
    console.log("token",!token)

    if (!token) {
        logger.warn('Access attempt wihtout valid token!')
        return res.status(401).json({
            message: 'Authentication required',
            success: false
        })
    }
    
    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            console.log(err)
            logger.warn('Invalid token!')
            return res.status(429).json({
                message: 'Invalid token!',
                success: false
            })
        }
        req.user = user;
        next()
    })
}

module.exports = validateToken;