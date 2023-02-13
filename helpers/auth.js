const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const { JWT_SECRET } = require('../config');

const hashPassword = password => {
    try {
        const salt = bcrypt.genSaltSync(12);
        return bcrypt.hashSync(password, salt);

    } catch (err) {
        console.log(err);
    }
};

const comparePassword = (password, hashed) => bcrypt.compare(password, hashed);

const signToken = (payload, expiresIn) => jwt.sign(payload, JWT_SECRET, { expiresIn });

const verifyToken = token => jwt.verify(token, JWT_SECRET);

const tokenAndUserResponse = (user, res) => {
    const token = signToken({ _id: user._id }, '1h');
    const refreshToken = signToken({ _id: user._id }, '77d');

    user.password = undefined;
    user.resetCode = undefined;

    return res.json({ token, refreshToken, user });
}

module.exports = {
    hashPassword,
    comparePassword,
    comparePassword,
    signToken,
    verifyToken,
    tokenAndUserResponse
}