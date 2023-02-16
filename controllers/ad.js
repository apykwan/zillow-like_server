const { nanoid } = require("nanoid");
const slugify = require('slugify');

const Ad = require('../models/ad');
const User = require('../models/user');
const { AWSS3, GOOGLE_GEOCODER } = require('../config');

const uploadImage = async (req, res) => {
    try {
        const { image } = req.body;
        const base64Image = new Buffer.from(
            image.replace(/^data:image\/\w+;base64,/, ""),
            "base64"
        );

        // image = 'data:image/jpeg;base...'
        // first split ['data:image/jepg', 'base...' ]
        // second split ['data:image', 'jepg'] 
        const type = image.split(";")[0].split("/")[1];

        //image params
        const params = {
            Bucket: 'zillow-like-bucket',
            Key: `${req.user._id}_${nanoid(6)}.${type}`,
            Body: base64Image,
            ACL: 'public-read',
            ContentEncoding: 'base64',
            ContentType: `image/${type}`
        };

        AWSS3.upload(params, (err, data) => {
            if(err) {
                console.log(err);
                return res.sendStatus(400);
            } 
            res.send(data);
        });

    } catch (err) {
        console.log(err);
        res.json({ error: 'Upload failed. Try Again '});
    }
};

const removeImage = async (req, res) => {
    try {
        const { Key, Bucket } = req.body;

        AWSS3.deleteObject({ Bucket, Key }, (err, data) => {
            if(err) {
                console.log(err);
                return res.sendStatus(400);
            }
            res.send({ ok: true });
        });
    } catch (err) {
        console.log(err);
    }
}

const create = async (req, res) => {
    try {
        const { photos, description, title, address, price, type, landsize } = req.body;

        if(!photos?.length) {
            return res.json({ error: 'At least a photo is required.' });
        }

        if(!price) {
            return res.json({ error: 'Price is required.' });
        }

        if(!type) {
            return res.json({ error: 'Is property house or land?' });
        }

        if(!address) {
            return res.json({ error: 'Address is required.' });
        }

        if(!description) {
            return res.json({ error: 'Description is required.' });
        }

        const geo = await GOOGLE_GEOCODER.geocode(address);
        console.log('geo => ', geo);
        res.send({ ok: true });
    } catch (err) {
        res.json({ error: "Something went wrong. Please try again."});
    }
}

module.exports = {
    uploadImage,
    removeImage,
    create
};