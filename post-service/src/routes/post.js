const express = require('express')
const {getAllPosts, getPost, deletePost, createPost} = require("../controllers/post")
const {authenticateRequest} = require("../middleware/auth")
const router = express()

//MIDDLEWARE HERE as auth service is not here

router.use(authenticateRequest);

router.post("/createPost",createPost)
router.get("/",getAllPosts)
router.get("/:id", getPost)
router.delete("/:id", deletePost)



module.exports = router;