const express = require("express")
const router = express.Router()
const { authenticationToken } = require("../middleware/authMiddleware")

const {getMe} = require("../controller/testController.js")

router.get("/me", authenticationToken, getMe); // Protected route

module.exports = router;
