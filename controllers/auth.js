const { nanoid } = require("nanoid");
const validator = require('email-validator');

const User = require('../models/user');
const { AWSSES, REPLY_TO, CLIENT_URL } = require('../config');
const { emailTemplate } = require('../helpers/email');
const { 
    hashPassword, 
    comparePassword, 
    signToken,
    verifyToken, 
    tokenAndUserResponse 
} = require('../helpers/auth');

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

        // validate email format
        if(!validator.validate(email)) {
            return res.json({ error: 'A valid email is required' });
        }

        if(!password) {
            return res.json({error: "Password is required" });
        }

        if(password?.length < 4) {
          return res.json({error: "Password should be at least 4 characters" });
        }

        const user = await User.findOne({ email });
        if(user) {
            return res.json({ error: " Email is taken!!" });
        }

        // hash the password before sending confirmation
        const hashedPassword = await hashPassword(password);

        const token = signToken({ email, password: hashedPassword }, '1h');

        const content = ` 
            <p>Please click the link below to activate your account.</p>
            <p>This link will be expired in an hour!</p>
            <a href="${CLIENT_URL}/auth/account-activate/${token}">Activate my account</a>
        `;
        const subject = 'Activate your account';

        AWSSES.sendEmail(
        emailTemplate(email, content, REPLY_TO, subject), 
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
        const { email, password } = verifyToken(req.body.token);

        const exitUser = await User.findOne({ email });
        if(exitUser) {
            return res.json({ error: " Email is taken!!" });
        }

        const user = await new User({
                username: nanoid(6),
                email,
                password
        }).save();

        tokenAndUserResponse(user, res);
    } catch (err) {
        console.log(err);
        return res.json({ error: "Something went wrong. Please try again." });
    }
};

const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        // find user by email
        const user = await User.findOne({ email });

        // 2. compare password
        const match = await comparePassword(password, user.password);

        if(!match) {
            return res.json({ error: "Either incorrect email or password. "});
        }

        // 3. create jwt token
        tokenAndUserResponse(user, res);
    } catch (err) {
        console.log(err);
        return res.json({ error: "Something went wrong. Please try again." });
    }
};

const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;

        const user = await User.findOne({ email });
        if(!user) {
            return res.json({ error: "Could not find user with that email "});
        }

        const resetCode = nanoid();
        user.resetCode = resetCode;
        user.save();

        const token = signToken({ resetCode }, '1h');
        const content = `
            <p>Please click the link below to access your account.</p>
            <p>This link will be expired in an hour!</p>
            <a href="${CLIENT_URL}/auth/access-account/${token}">Access my account</a>
        `;
        const subject = 'Access your account';

        AWSSES.sendEmail(
        emailTemplate(email, content, REPLY_TO, subject), 
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

const accessAccount = async (req, res) => {
    try {
        const { resetCode } = verifyToken(req.body.resetCode);

        const user = await User.findOneAndUpdate({ resetCode }, { resetCode: '' }, { new: true });
        tokenAndUserResponse(user, res);

    } catch (err) {
        console.log(err);
        return res.json({ error: "Something went wrong. Please try again." });
    }
};

const refreshToken = async (req, res) => {
    try {
        const { _id } = verifyToken(req.headers.refresh_token);
        const user = await User.findById(_id);
        tokenAndUserResponse(user, res);
    } catch (err) {
        console.log(err);
        return res.status(403).json({ error: "Refresh token failed. "});
    }
}

const currentUser = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        user.password = undefined;
        user.resetCode = undefined;
        res.json(user);
    } catch (err) {
        console.log(err);
        return res.status(403).json({ error: 'Unauthorized' });
    }
};

const publicProfile = async (req, res) => {
    try {
        const user = await User.findOne({ username: req.params.username });

        res.json(user);
        
    } catch (err) {
        console.log(err);
        return res.status(403).json({ error: 'User not found' });
    }
};

const updatePassword = async (req, res) => {
    try {
        let { password } = req.body;

        if(!password) {
            return res.json({ error: " Password is required"});
        }

        if(password?.length < 4) {
            return res.json({error: "Password should be at least 4 characters" });
        }

        password = await hashPassword(password);
        await User.findByIdAndUpdate(req.user._id, { password });

        res.json({ ok: true });
    } catch (err) {
        console.log(err);
        return res.status(403).json({ error: 'Unauthorized' });
    }
};

const updateProfile = async (req, res) => {
    try {
        const user = await User.findByIdAndUpdate(req.user._id, req.body, { new: true });
        user.password = undefined;
        user.resetCode = undefined;
        res.json(user);
    } catch (err) {
        let error = ''
        if(err.codeName === 'DuplicateKey') {
            error = 'Username or email is already taken!';
        } else {
            console.log(err);
            error = 'Unauthorized!';
        }
        return res.status(403).json({ error });
    }
}

module.exports = {
    welcome,
    preRegister,
    register, 
    login,
    forgotPassword,
    accessAccount,
    refreshToken,
    currentUser,
    publicProfile,
    updatePassword,
    updateProfile
};
