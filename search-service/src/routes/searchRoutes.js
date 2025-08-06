const express = require('express')
const {getAllSearchPost, searchPostController} = require("../controllers/searchController")
const {authenticateRequest} = require("../middleware/authMiddleware")
const router = express.Router()

//MIDDLEWARE HERE as auth service is not here

router.use(authenticateRequest);

router.get("/",searchPostController)
router.get("/all",getAllSearchPost)


module.exports = router;