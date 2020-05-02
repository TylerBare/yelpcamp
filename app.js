//Could change to travel site named NextDestination
require("dotenv").config();

var express = require("express"),
	app = express(),
    bodyParser = require("body-parser"),
    rp = require("request-promise"),
    mongoose = require("mongoose"),
	passport = require("passport"),
	LocalStrategy = require("passport-local"),
	Campground = require("./models/campground.js"),
	Comment = require("./models/comment"),
	methodOverride = require("method-override"),
	User = require("./models/user"),
	flash = require("connect-flash"),
	seedDB = require("./seeds.js");


var commentRoutes = require("./routes/comments"),
	campgroundRoutes = require("./routes/campgrounds"),
	indexRoutes = require("./routes/index")

mongoose.connect(process.env.DATABASEURL, {useNewUrlParser: true, useCreateIndex: true, useUnifiedTopology: true}).then(()=> {
	console.log("connected to db");
}).catch(err => {
	console.log("error", err.message);
});

// mongoose.connect("mongodb+srv://Tyler:College_1@cluster0-tu7dl.mongodb.net/test?retryWrites=true&w=majority", {useNewUrlParser: true, useCreateIndex: true, useUnifiedTopology: true}).then(()=> {
// 	console.log("connected to db");
// }).catch(err => {
// 	console.log("error", err.message);
// });

app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static(__dirname + "/public"));
app.use(methodOverride("_method"));
app.use(flash());
app.locals.moment = require('moment');
// seedDB();

//Passport Config
app.use(require("express-session")({
	secret: "Lucy is the best dog",
	resave: false,
	saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use(function(req, res, next){
	res.locals.currentUser = req.user;
	res.locals.error = req.flash("error");
	res.locals.success = req.flash("success");
	next();
});


app.use(indexRoutes);
app.use("/campgrounds/:id/comments", commentRoutes);
app.use("/campgrounds", campgroundRoutes);


app.listen(process.env.PORT, process.env.IP);

// app.listen(3000, function(){
// 	console.log("YelpCamp Server Started!");
// });