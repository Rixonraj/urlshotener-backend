const mongoose = require('mongoose');

const Schema = mongoose.Schema;


const userLoginSchema = new Schema({
    googleId: {
        required: false,
        type: String
    },
    twitterId: {
        required: false,
        type: String
    },
    githubId: {
        required: false,
        type: String
    },
    username: {
        required: true,
        type: String
    },
    password: {
        required: true,
        type: String
    },
    emailVerified:{
        required: false,
        default: false,
        type: Boolean
    },
    emailToken:{
        required: true,
        type: String
    }
}
// , {
//   timestamps: true,
// }

);

const userLogin = mongoose.model('userLogin', userLoginSchema, 'url_user_collection');
module.exports = userLogin;