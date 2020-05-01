var mongoose = require("mongoose");
var passportLocalMongoose = require("passport-local-mongoose");

var UserSchema = new mongoose.Schema({
	username: {type: String, unique: true, required: true},
	password: String,
	followers: [{
		type: mongoose.Schema.Types.ObjectId,
		ref: "User"
	}],
	isFollowed: {type: Boolean, default: false},
	avatar: String,
	firstName: String,
	lastName: String,
	email: {type: String, unique: true, required: true},
	bio: String,
	favCamp: String,
	resetPasswordToken: String,
	resetPasswordExpires: Date,
	isAdmin: {type: Boolean, default: false}
});

UserSchema.plugin(passportLocalMongoose);

module.exports = mongoose.model("User", UserSchema);