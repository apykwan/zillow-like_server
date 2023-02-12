const express = require('express');

const auth = require('../controllers/auth');
const router = express.Router();

router.get("/", auth.welcome);
router.post("/pre-register", auth.preRegister);
router.post("/register", auth.register);

module.exports = router;