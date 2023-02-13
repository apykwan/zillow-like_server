const { verifyToken } = require('../helpers/auth');

const requireSignin = (req, res, next) => {
    try {
        const decoded = verifyToken(req.headers.authorization);
        req.user = decoded;     // req.user._id

        next();
    } catch (err) {
        console.log(err);
        res.status(401).json({ error: "Invalid or expired token "});         
    }
};

module.exports = {
    requireSignin
}