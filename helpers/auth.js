const bcrypt = require('bcrypt');

exports.hashPassword = password => {
    try {
        const salt = bcrypt.genSaltSync(12);
        return bcrypt.hashSync(password, salt);

    } catch (err) {
        console.log(err);
    }
}

exports.comparePassword = (password, hashed) => {
    return bcrypt.compare(password, hashed);
}