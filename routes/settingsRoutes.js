const express = require("express")
const router = express.Router()
const { getPlatformSettings, setPlatformSettings } = require("../controller/settingsController")
const { authenticationToken } = require("../middleware/authMiddleware")

router.put("/setplatformfee", authenticationToken, setPlatformSettings);
router.get("/getsettings", authenticationToken, getPlatformSettings);

module.exports = router;