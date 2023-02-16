const { model, Schema, ObjectId } = require('mongoose');

const schema = new Schema({
    photos: [{}],
    price: {
        type: Number,
        maxLength: 255
    },
    address: {
        type: String,
        maxLength: 255,
        required: true
    },
    bedrooms: Number,
    bathrooms: Number,
    landsize: Number,
    carpark: Number,
    location: {
        type: {
            type: String,
            enum: ["point"],
            default: "Point"
        },
        coordinates: {
            type: [Number],
            default: [34.052235, -118.243683]                   // Los Angeles
        }
    },
    title: {
        type: String
    }, 
    slug: {
        type: String,
        lowercase: true,
        unique: true
    },
    description: {},
    postedBy: {
        type: ObjectId,
        ref: "User"
    },
    sold: {
        type: Boolean,
        default: false
    },
    googleMap: {},
    type: {
        type: String,
        default: 'Other'
    },
    action: {
        type: String,
        default: 'Sell'
    },
    views: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true
});

module.exports = model("Ad", schema);