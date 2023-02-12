const jwt = require('jsonwebtoken');
const { nanoid } = require("nanoid");

const { AWSSES, JWT_SECRET, REPLY_TO, CLIENT_URL } = require('../config');
const { emailTemplate } = require('../helpers/email');
const { hashPassword, comparePassword } = require('../helpers/auth');
const User = require('../models/user');

const welcome =  (req, res) => {
    res.json({
        data: "Hello from nodejs api"
    });
};

const preRegister = async (req, res) => {
    try {
        // Create jwt with email and password then email as clickable link
        // only when user click on that email link, registeration will complete

        const { email, password } = req.body;
        const hashedPassword = await hashPassword(password);

        const token = jwt.sign({ email, password: hashedPassword }, JWT_SECRET, {
            expiresIn: '1h'
        });
        const content = ` 
            <p>Please click the link below to activate your account.</p>
            <p>This link will be expired in an hour!</p>
            <a href="${CLIENT_URL}/auth/account-activate/${token}">Activate my account</a>
        `;
        const subject = 'Activate your account';

        AWSSES.sendEmail
        (emailTemplate(email, content, REPLY_TO, subject), 
        (err, data) => {
            if(err) {
                console.log(err);
                return res.json({ ok: false });
            } else {
                console.log(data);
                return res.json({ ok: true });
            }
        });
        
    } catch (err) {
        console.log(err);
        return res.json({ error: "Something went wrong. Please try again." });
    }
};

const register = async (req, res) => {
    try {
       const { email, password } = jwt.verify(req.body.token, JWT_SECRET);

       const user = await new User({
            username: nanoid(6),
            email,
            password
       }).save();

       const token = jwt.sign({ _id: user._id }, JWT_SECRET, {
        expiresIn: '1h'
       });

       const refreshToken = jwt.sign({ _id: user._id }, JWT_SECRET, {
        expiresIn: '77d'
       });

       user.password = undefined;
       user.resetCode = undefined;

       return res.json({ user, token, refreshToken });
        
    } catch (err) {
        console.log(err);
    }
};

module.exports = {
    welcome,
    preRegister,
    register
};
