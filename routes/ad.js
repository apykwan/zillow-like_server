const express = require('express');

const ad = require('../controllers/ad');
const { requireSignin } = require('../middlewares/auth');

const router = express.Router();

router.post("/upload-image", requireSignin, ad.uploadImage);
router.post("/remove-image", requireSignin, ad.removeImage);
router.post("/ad", requireSignin, ad.create);

module.exports = router;