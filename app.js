// ExpressError class definition
class ExpressError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
  }
}

// Import necessary packages
const express = require("express");
const app = express();
const mongoose = require("mongoose");
const listing = require("../Airbnb/Models/listing"); // Use 'listing' as imported model
const methodOverride = require("method-override");
const path = require("path");
const ejsMate = require("ejs-mate");
const review = require("../Airbnb/Models/review");
const { reviewSchema } = require("../Airbnb/schema");
const wrapAsync = require("./utils/wrapAsync");
const session = require("express-session");
const flash = require("connect-flash");
const passport = require("passport");
const LocalStrategy = require("passport-local");
const User = require("./Models/user");
const isLoggedIn = require("./middleware").isLoggedIn;
const {saveURL} = require("./middleware").saveURL;

const port = 3000;

const sessionpOptions = {
  secret: "mysupersecretcode",
  resave: false,
  saveUninitialized: true,
  cookie: {
    expires: Date.now() + 7 * 24 * 60 * 60 * 1000,
    maxAge: 7 * 24 * 60 * 60 * 1000,
    httpOnly: true,
  },
};

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride("_method"));
app.use(express.json());
app.use(express.static("public"));
app.use(session(sessionpOptions));
app.use(flash()); // Initialize connect-flash
app.engine("ejs", ejsMate);

app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));

// below two statements are used to make login user in a particular session and to login after a session has been ended.
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

// Middleware to pass flash messages to all views
app.use((req, res, next) => {
  // Make flash messages available globally in all views
  res.locals.success = req.flash("success");
  res.locals.error = req.flash("error");
  res.locals.currentUser = req.user;
  next();
});

// Database connection
async function main() {
  try {
    await mongoose.connect("mongodb://127.0.0.1:27017/wanderlust");
    console.log("Connected to database");
  } catch (err) {
    console.error("Error connecting to the database", err);
  }
}

main();

// Routes
app.get("/", (req, res) => {
  res.send("Working");
});

// List all listings
app.get("/listings", async (req, res) => {
  try {
    const listings = await listing.find({});
    res.render("listings/listings.ejs", {
      listings,
    });
  } catch (err) {
    console.error("Error fetching listings:", err);
    req.flash("error", "Error fetching listings");
    res.redirect("/listings");
  }
});

// Render new listing form
app.get("/listings/new", isLoggedIn,(req, res) => {
  res.render("listings/new.ejs");
});

// Create a new listing
app.post("/listings/new", async (req, res) => {
  const { title, description, url, price, location, country } = req.body;
  const newListing = new listing({
    title,
    description,
    url,
    price,
    location,
    country,
  });

  try {
    newListing.owner = req.user._id;
    await newListing.save();

    req.flash("success", "New listing created");
    res.redirect("/listings");
  } catch (err) {
    console.error("Error saving new listing:", err);
    req.flash("error", "Error creating new listing");
    res.redirect("/listings");
  }
});

// Edit a specific listing
app.get("/listings/:id/edit",isLoggedIn, async (req, res) => {
  let { id } = req.params;
  try {
    const listingToEdit = await listing.findById(id);
    if (!listingToEdit) {
      req.flash("error", "Listing not found");
      return res.redirect("/listings");
    }
    res.render("listings/edit.ejs", { particularBnb: listingToEdit });
  } catch (err) {
    console.error("Error fetching listing for edit:", err);
    req.flash("error", "Error fetching listing for edit");
    res.redirect("/listings");
  }
});

// Update a listing
app.put("/listings/:id",isLoggedIn, async (req, res) => {
  const { id } = req.params;
  try {
    const updatedListing = await listing.findByIdAndUpdate(id, req.body, {
      new: true,
      runValidators: true,
    });
    req.flash("success", "Existing Listing Updated");

    if (!updatedListing) {
      req.flash("error", "Listing not found");
      return res.redirect("/listings");
    }

    res.redirect(`/listings`);
  } catch (err) {
    console.error(err);
    req.flash("error", "Error updating the listing");
    res.redirect("/listings");
  }
});

// Show a specific listing
app.get("/listings/:id/", async (req, res) => {
  const listings = req.user;
  let { id } = req.params;
  try {
    const listingToShow = await listing.findById(id).populate("reviews").populate("owner");

    if (!listingToShow) {
      req.flash("error", "Listing not found");
      return res.redirect("/listings");
    }

    res.render("listings/showparticular.ejs", {
      particularBnb: listingToShow,
    });
  } catch (err) {
    console.error("Error fetching listing details:", err);
    req.flash("error", "Error fetching listing details");
    res.redirect("/listings");
  }
});

// Delete a listing
app.delete("/listings/:id",isLoggedIn, async (req, res) => {
  let { id } = req.params;
  try {
    let deletedListing = await listing.findByIdAndDelete(id);
    req.flash("success", "Listing Deleted");
    res.redirect("/listings");
  } catch (err) {
    console.error("Error deleting listing:", err);
    req.flash("error", "Error deleting listing");
    res.redirect("/listings");
  }
});

// POST Review Route
app.post(
  "/listings/:id/reviews",isLoggedIn,
  wrapAsync(async (req, res) => {
    try {
      let { id } = req.params;
      let { rating, comment } = req.body;

      if (!rating || !comment) {
        req.flash("error", "Rating and Comment are required");
        return res.redirect(`/listings/${id}`);
      }

      let newReview = new review({ rating, comment });
      await newReview.save();

      let listingToUpdate = await listing.findById(id);

      if (!listingToUpdate) {
        req.flash("error", "Listing not found");
        return res.redirect(`/listings/${id}`);
      }

      listingToUpdate.reviews.push(newReview._id);
      await listingToUpdate.save();
      req.flash("success", "New Review Created");
      res.redirect(`/listings/${id}`);
    } catch (error) {
      console.error("Error adding review:", error);
      req.flash("error", "Something went wrong");
      res.redirect(`/listings/${id}`);
    }
  })
);

// Deleting a review
app.delete("/listings/:id/reviews/:reviewId", async (req, res) => {
  let { id, reviewId } = req.params;

  try {
    let deletedReview = await review.findByIdAndDelete(reviewId);
    console.log(deletedReview);
    req.flash("success", "Review Deleted");
    res.redirect(`/listings/${id}`);
  } catch (err) {
    console.error("Error deleting review:", err);
    req.flash("error", "Error deleting review");
    res.redirect(`/listings/${id}`);
  }
});

// Signup functionality
app.get("/signup", (req, res) => {
  res.render("./users/signup.ejs");
});

app.post("/signup", async (req, res) => {
  let { email, username, password } = req.body;

  // Ensure all required fields are provided
  if (!email || !username || !password) {
    req.flash("error", "All fields are required.");
    return res.redirect("/signup");
  }

  let newUser = new User({ email, username });
  try {
    // Register the new user
    let registeredUser = await User.register(newUser, password);
    
    // Authenticate the user using passport
    passport.authenticate("local", (err, user, info) => {
      if (err) {
        console.log("Authentication error: ", err);
        req.flash("error", "Something went wrong during authentication.");
        return res.redirect("/signup");
      }
      if (!user) {
        req.flash("error", info.message || "Login failed.");
        return res.redirect("/signup");
      }

      req.login(user, (loginErr) => {
        if (loginErr) {
          console.log("Error during login: ", loginErr);
          req.flash("error", "Something went wrong during login.");
          return res.redirect("/signup");
        }
        
        req.flash("success", "Welcome to Airbnb!");
        res.redirect("/listings");
      });
    })(req, res);
  } catch (err) {
    console.log("Error during registration: ", err);
    req.flash("error", "Something went wrong during registration.");
    res.redirect("/signup");
  }
});

app.get("/login", (req, res) => {
  res.render("./users/login.ejs");
});

app.post(
  "/login",
  passport.authenticate("local", {
    failureFlash: true,
    failureRedirect: "/login",
  }),
  async (req, res) => {
    req.flash("success", "Welcome back!");
    const redirectTo = req.session.returnTo || "/listings";
    delete req.session.returnTo; // Clear the returnTo session after using it
    res.redirect(redirectTo);
  }
);

// Logout Route
app.get("/logout", (req, res) => {
  req.logout((err)=>{
    if(err){
      console.log("Error during logout: ", err);
      req.flash("error", "Something went wrong during logout.");
      return res.redirect("/listings");
  }});
  req.flash("success", "Goodbye!");
  res.redirect("/listings");
}); 

// Global error handler
app.use((err, req, res, next) => {
  const { message, statusCode = 500 } = err;
  req.flash("error", message || "Something went wrong.");
  res.status(statusCode).redirect("/listings");
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
