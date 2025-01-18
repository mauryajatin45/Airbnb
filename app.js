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
    res.status(500).send("Error fetching listings");
  }
});

// Render new listing form
app.get("/listings/new", (req, res) => {
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
    await newListing.save();
    req.flash("success", "New listing created");
    res.redirect("/listings");
  } catch (err) {
    console.error("Error saving new listing:", err);
    res.status(500).send("Error creating new listing");
  }
});

// Edit a specific listing
app.get("/listings/:id/edit", async (req, res) => {
  let { id } = req.params;
  try {
    const listingToEdit = await listing.findById(id);
    if (!listingToEdit) {
      return res.status(404).send("Listing not found");
    }
    res.render("listings/edit.ejs", { particularBnb: listingToEdit });
  } catch (err) {
    console.error("Error fetching listing for edit:", err);
    res.status(500).send("Error fetching listing for edit");
  }
});

// Update a listing
app.put("/listings/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const updatedListing = await listing.findByIdAndUpdate(id, req.body, {
      new: true,
      runValidators: true,
    });
    req.flash("success", "Existing Listing Updated");

    if (!updatedListing) {
      return res.status(404).send("Listing not found");
    }

    res.redirect(`/listings`);
  } catch (err) {
    console.error(err);
    res.status(500).send("Error updating the listing");
  }
});

// Show a specific listing
app.get("/listings/:id/", async (req, res) => {
  let { id } = req.params;
  try {
    const listingToShow = await listing.findById(id).populate("reviews");

    if (!listingToShow) {
      return res.status(404).send("Listing not found");
    }

    res.render("listings/showparticular.ejs", {
      particularBnb: listingToShow,
    });
  } catch (err) {
    console.error("Error fetching listing details:", err);
    res.status(500).send("Error fetching listing details");
  }
});

// Delete a listing
app.delete("/listings/:id", async (req, res) => {
  let { id } = req.params;
  let deletedListing = await listing.findByIdAndDelete(id);
  req.flash("success", "Listing Deleted");
  res.redirect("/listings");
});

// POST Review Route
app.post(
  "/listings/:id/reviews",
  wrapAsync(async (req, res) => {
    try {
      let { id } = req.params;
      let { rating, comment } = req.body;

      if (!rating || !comment) {
        return res.status(400).send("Rating and Comment are required");
      }

      let newReview = new review({ rating, comment });

      await newReview.save();

      let listingToUpdate = await listing.findById(id);

      if (!listingToUpdate) {
        return res.status(404).send("Listing not found");
      }

      listingToUpdate.reviews.push(newReview._id);
      await listingToUpdate.save();
      req.flash("success", "New Review Created");
      res.redirect(`/listings/${id}`);
    } catch (error) {
      console.error("Error adding review:", error);
      res.status(500).send("Something went wrong");
    }
  })
);

// Deleting a review
app.delete("/listings/:id/reviews/:reviewId", async (req, res) => {
  let { id, reviewId } = req.params;

  let deletedReview = await review.findByIdAndDelete(reviewId);
  console.log(deletedReview);
  req.flash("success", "Review Deleted");
  res.redirect(`/listings/${id}`);
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
    let registeredUser = await User.register(newUser, password);
    passport.authenticate("local")(req, res, () => {
      req.flash("success", "Welcome to Airbnb");
      res.redirect("/listings");
    });
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
    res.redirect("/listings");
  }
);

// Global error handler
app.use((err, req, res, next) => {
  const { message, statusCode = 500 } = err;
  res.status(statusCode).send(message);
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
