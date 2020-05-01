var express = require("express");
var router = express.Router();
var Campground = require("../models/campground");
var middleware = require("../middleware");
var NodeGeocoder = require('node-geocoder');
var User = require("../models/user");
 
var options = {
  provider: 'google',
  httpAdapter: 'https',
  apiKey: process.env.GEOCODER_API_KEY,
  formatter: null
};
 
var geocoder = NodeGeocoder(options);

var multer = require('multer');

var storage = multer.diskStorage({
  filename: function(req, file, callback) {
    callback(null, Date.now() + file.originalname);
  }
});

var imageFilter = function (req, file, cb) {
    // accept image files only
    if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/i)) {
        return cb(new Error('Only image files are allowed!'), false);
    }
    cb(null, true);
};
var upload = multer({ storage: storage, fileFilter: imageFilter})

var cloudinary = require('cloudinary');
cloudinary.config({ 
  cloud_name: 'dtzqoz2xj', 
  api_key: process.env.CLOUDINARY_API_KEY, 
  api_secret: process.env.CLOUDINARY_API_SECRET
});

router.get("/", function(req, res){
	var noMatch = "";
	if(req.query.search){
		const regex = new RegExp(escapeRegex(req.query.search), 'gi');
		Campground.find({name: regex}, function(err, allCampgrounds){
			if(err){
				console.log(err);
			} else {
				if(allCampgrounds.length < 1) {
					noMatch = "No campgrounds found.";
				} 
				res.render("campgrounds/index", {campgrounds: allCampgrounds, currentUser: req.user, page: "campgrounds", noMatch: noMatch});
			}
		});
	} else {
		Campground.find({}, function(err, allCampgrounds){
			if(err){
				console.log(err);
			} else {
				res.render("campgrounds/index", {campgrounds: allCampgrounds, currentUser: req.user, page: "campgrounds", noMatch: noMatch});
			}
		});
	}
});

//CREATE - add new campground to DB
router.post("/", middleware.isLoggedIn, upload.single('image'), function(req, res) {
  // get data from form and add to campgrounds array
  var name = req.body.name;
  var desc = req.body.description;
  var price = req.body.price;
  var author = {
      id: req.user._id,
      username: req.user.username
  }
  geocoder.geocode(req.body.location, function (err, data) {
    if (err || !data.length) {
      req.flash('error', 'Invalid address');
	  console.log(err);
      return res.redirect('back');
    }
	console.log(data);
    var lat = data[0].latitude;
    var lng = data[0].longitude;
    var location = data[0].formattedAddress;
    // Create a new campground and save to DB
    cloudinary.uploader.upload(req.file.path, function(result) {
  		// add cloudinary url for the image to the campground object under image property
  		req.body.image = result.secure_url;
		var image = req.body.image;
		var imageId = result.secure_url;
		var newCampground = {name: name, price: price, image: image, description: desc, author:author, location: location, lat: lat, lng: lng, imageId: imageId};
  		Campground.create(newCampground, async function(err, campground) {
			if (err) {
			  req.flash('error', err.message);
			  return res.redirect('back');
    		}
    		res.redirect('/campgrounds/' + campground.id);
  		});
	});
  });
});

//NEW
router.get("/new", middleware.isLoggedIn, function(req, res){
	res.render("campgrounds/new")
});

//SHOW
router.get("/:id", function(req, res){
	Campground.findById(req.params.id).populate("comments").exec(function(err, foundCampground){
		if(err || !foundCampground){
			req.flash("error", "Campground not found");
			res.redirect("back");
		} else {
			res.render("campgrounds/show", {campground: foundCampground});
		}
	});
});

//Edit 
router.get("/:id/edit", middleware.checkCampgroundOwnership, function(req, res){
	Campground.findById(req.params.id, function(err, foundCampground){
		res.render("campgrounds/edit", {campground: foundCampground});
	});	
});


// UPDATE CAMPGROUND ROUTE
router.put("/:id", middleware.checkCampgroundOwnership, upload.single('campground[image]'), function(req, res){
  geocoder.geocode(req.body.location, function (err, data) {
    if (err || !data.length) {
      req.flash('error', 'Invalid address');
      return res.redirect('back');
    }
    req.body.campground.lat = data[0].latitude;
    req.body.campground.lng = data[0].longitude;
    req.body.campground.location = data[0].formattedAddress;
	  
	if(req.file){
		cloudinary.uploader.upload(req.file.path, function(result) {
  		// add cloudinary url for the image to the campground object under image property
  		req.body.campground.image = result.secure_url;
  		Campground.findByIdAndUpdate(req.params.id, req.body.campground, function(err, campground) {
			if (err) {
			  req.flash('error', err.message);
			  return res.redirect('back');
    		}
			campground.imageId = result.public_id;
			campground.save();
			req.flash("success","Successfully Updated!");
    		res.redirect('/campgrounds/' + campground.id);
  		});
	});  
	} else {
		Campground.findByIdAndUpdate(req.params.id, req.body.campground, function(err, campground) {
			if (err) {
			  req.flash('error', err.message);
			  return res.redirect('back');
    		}

			req.flash("success","Successfully Updated!");
    		res.redirect('/campgrounds/' + campground.id);
  		});
	}
  });
});

//Destroy
router.delete('/:id', middleware.checkCampgroundOwnership, function(req, res) {
  Campground.findById(req.params.id, async function(err, campground) {
    if(err) {
      req.flash("error", err.message);
      return res.redirect("back");
    }
    try {
        await cloudinary.v2.uploader.destroy(campground.imageId);
        campground.remove();
        req.flash('success', 'Campground deleted successfully!');
        res.redirect('/campgrounds');
    } catch(err) {
        if(err) {
          req.flash("error", err.message);
          return res.redirect("back");
        }
    }
  });
});

function escapeRegex(text) {
    return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
};

module.exports = router;