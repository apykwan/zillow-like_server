const { nanoid } = require("nanoid");
const slugify = require('slugify');

const Ad = require('../models/ad');
const User = require('../models/user');
const { AWSS3, AWSSES, GOOGLE_GEOCODER, CLIENT_URL } = require('../config');
const { emailTemplate } = require('../helpers/email');

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
};

const create = async (req, res) => {
    try {
        let { 
            photos, 
            description, 
            title, 
            address, 
            price, 
            type, 
            landsize,
            action,
            bedrooms,
            bathrooms,
            carpark, 
        } = req.body;

        // Vallidation
        if(!photos?.length)  return res.json({ error: 'At least a photo is required.' });
        if(!price) return res.json({ error: 'Price is required.' });
        if(!type) return res.json({ error: 'Is property house or land?' });
        if(!address) return res.json({ error: 'Address is required.' });
        if(!title) return res.json({ error: 'Title is required.' });
        if(!description) return res.json({ error: 'Description is required.' });

        const geo = await GOOGLE_GEOCODER.geocode(address);
        const slug = slugify(`${type}-${address}-${price}-${nanoid(6)}`);
        // Add unit to landsize if not provided
        // if(/^\d+$/.test(landsize) && !landsize.includes("sqft")) landsize = `${landsize} sqft`;

        const ad = await new Ad({
            photos,
            price,
            address,
            bedrooms,
            bathrooms,
            carpark,
            landsize: `${landsize} sqft`,
            title,
            description,
            type,
            action,   
            postedBy: req.user._id,
            location: {
                type: "Point",
                coordinates: [geo?.[0]?.longitude, geo?.[0]?.latitude],
            },
            googleMap: geo[0],
            slug
        }).save();

        // make user role > seller
        const user = await User.findByIdAndUpdate(req.user._id, { $addToSet: { role: "Seller" } }, { new: true });
        user.password = undefined;
        user.resetCode = undefined;

        res.json({ ad, user });
    } catch (err) {
        res.json({ error: "Something went wrong. Please try again."});
    }
};

const ads = async (req, res) => {
    try {
        const adsForSell = await Ad
            .find({ action: "Sell" })
            .select('-googleMap -location')
            .sort({ createdAt: -1 })
            .limit(12);

        const adsForRent = await Ad
            .find({ action: "Rent" })
            .select('-googleMap -location')
            .sort({ createdAt: -1 })
            .limit(12);

        res.json({ adsForSell, adsForRent });
    } catch (err) {
        console.log(err);
    }
};

const read = async (req, res) => {
    try {
        const ad = await Ad.findOne({ slug: req.params.slug }).populate(
            'postedBy', 
            'name username email phone company photo.Location'
        );
        
        // related
        const related = await Ad.find({
            _id: {$ne: ad._id},
            action: ad.action,
            type: ad.type,
            $or: [{
                address: {
                    $regex: ad.googleMap.city,
                    $options: "i"}}, {
                'googleMap.administrativeLevels.level2long': {
                    $regex: ad.googleMap.administrativeLevels.level2long,
                    $options: "i"
                }
            }]
        })
            .select('-photos.Key -photos.key -photos.ETag -photos.Bucket -googleMap')
            .limit(3);

        res.json({ ad, related });
    } catch (err) {
        console.log(err);
    }
};

const addToWishlist = async (req, res) => {
    try {
        const user = await User.findByIdAndUpdate(req.user._id, {
            $addToSet: { wishlist: req.body.adId }
        }, { new: true });

        const { password, resetCode, ...rest } = user._doc;
        res.json(rest);
    } catch (err) {
        console.log(err);
    }
};

const removeFromWishlist = async (req, res) => {
    try {
        const user = await User.findByIdAndUpdate(req.user._id, {
            $pull: { wishlist: req.params.adId }
        }, { new: true });

        const { password, resetCode, ...rest } = user._doc;
        res.json(rest);
    } catch (err) {
        console.log(err);
    }
};

const contactSeller = async (req, res) => {
    try {
        const { name, email, message, phone, adId } = req.body;
        if(!email || !message) {
            return res.json({ error: "Email and message are required!" });
        }
        
        const user = await User.findByIdAndUpdate(req.user._id, {
            $addToSet: { enquiredProperties: adId }
        }, { new: true });

        if(!user) {
            return res.json({ error: "Could not find user with that email." });
        }

        const ad = await Ad
            .findById(adId)
            .populate("postedBy", "email");

        const content = ` 
            <p>You have received a new customer enquiry.</p>
            <h4>Customer Details</h4>
            <p>Name: ${name}</p>
            <p>Email: ${email}</p>
            <p>Phone: ${phone}</p>
            <hr />
            <p>${message}</p>

            <a href="${CLIENT_URL}/ad/${ad.slug}">${ad.type} in ${ad.address} for ${ad.action} - $${ad.price}</a>
        `;
        const subject = `New Enquiry received: ${ad.type} in ${ad.address} for ${ad.action}`;

        AWSSES.sendEmail(
        emailTemplate(ad.postedBy.email, content, req.user.email, subject), 
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
    }
}

const userAds = async (req, res) => {
    try {
        const perPage = 3;
        const page = req.params.page ? req.params.page : 1;

        const total = await Ad.find({ postedBy: req.user._id});
        const ads = await Ad
            .find({ postedBy: req.user._id })
            .select('-photos.key -photos.Key -photos.ETag -photos.ServerSideEncryption -photos.Bucket -location -googleMap')
            .populate('postedBy', 'name email username phone company')
            .skip((page - 1) * perPage)
            .limit(perPage)
            .sort({ createdAt: -1 });

        if(!total || !ads) return res.json({ error: "erro has been occured." });

        res.json({ ads, total: total.length });
    } catch (err) {
        console.log(err);
    }
};

const update = async (req, res) => {
    try {
        let { photos, price, type, address, description, title, landsize } = req.body;
        const ad = await Ad.findById(req.params._id);

        const owner = req.user._id == ad?.postedBy;
        if (!owner) return res.json({ error: "Permission denied."});
        
        // Vallidation
        if(!photos?.length)  return res.json({ error: 'At least a photo is required.' });
        if(!price) return res.json({ error: 'Price is required.' });
        if(!type) return res.json({ error: 'Is property house or land?' });
        if(!address) return res.json({ error: 'Address is required.' });
        if(!title) return res.json({ error: 'Title is required.' });
        if(!description) return res.json({ error: 'Description is required.' });

        const geo = await GOOGLE_GEOCODER.geocode(address);
        if(/^\d+$/.test(landsize) && !landsize.includes("sqft")) landsize = `${landsize} sqft`;

        await ad.update({
            photos,
            price,
            type,
            address,
            title,
            landsize,
            description,
            slug: ad.slug,
            location: {
                type: "Point",
                coordinates: [geo?.[0]?.longitude, geo?.[0]?.latitude],
            },
            googleMap: geo[0],
            bedrooms: req.body.bedrooms ? req.body.bedrooms : ad.bedrooms,
            bathrooms: req.body.bathrooms ? req.body.bathrooms : ad.bathrooms,
            carpark: req.body.carpark ? req.body.carpark : ad.carpark
        });
        res.json({ ok: true });
    } catch (err) {
        res.json({ ok: false });
        console.log(err);
    }
};

const enquiriedProperties = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        const ads = await Ad
            .find({ _id: user.enquiredProperties })
            .sort({ createdAt: -1 });

        res.json(ads);
    } catch (err) {
        console.log(err);
    }
};

const wishlist = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        const ads = await Ad
            .find({ _id: user.wishlist })
            .sort({ createdAt: -1 });

        res.json(ads);
    } catch (err) {
        console.log(err);
    }
};

module.exports = {
    uploadImage,
    removeImage,
    create,
    ads,
    read,
    addToWishlist,
    removeFromWishlist,
    contactSeller,
    userAds,
    update,
    enquiriedProperties,
    wishlist
};