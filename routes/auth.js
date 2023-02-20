const express = require('express');

const auth = require('../controllers/auth');
const { requireSignin } = require('../middlewares/auth');

const router = express.Router();

router.post("/pre-register", auth.preRegister);
router.post("/register", auth.register);
router.post("/login", auth.login);
router.post("/forgot-password", auth.forgotPassword);
router.post("/access-account", auth.accessAccount);
router.get("/refresh-token", auth.refreshToken);
router.get("/current-user", requireSignin, auth.currentUser);
router.get("/profile/:username", auth.publicProfile);
router.put("/update-password", requireSignin, auth.updatePassword);
router.put("/update-profile", requireSignin, auth.updateProfile);

module.exports = router;