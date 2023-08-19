const mongoose = require('mongoose');

const Schema = mongoose.Schema;


const urlShortSchema = new Schema({
    actualurl: {
        required: true,
        type: String
    },
    clicks: {
        required: false,
        default: 0,
        type: Number
    },
    createdBy: {
        required: true,
        type: String
    },
    shorturl: {
        required: false,
        type: String
    }
}
, {
  timestamps: true,
}

);

const urlShort = mongoose.model('urlShort', urlShortSchema, 'shorturl_collection');
module.exports = urlShort;