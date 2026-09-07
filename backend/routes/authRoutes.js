const express = require("express");

const {
    registerUser,
    loginUser,
} = require("../controllers/authController");
const protect = require("../middleware/protect");

const router = express.Router();

router.post("/register", registerUser);
router.post("/login", loginUser);

router.get("/profile", protect, (req, res) => {
    res.status(200).json({
        message: "Protected route accessed successfully",
        user: req.user,
    });
});

module.exports = router;