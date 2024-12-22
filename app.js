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
var wrapAsync = require("./utils/wrapAsync");

const port = 3000;

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride("_method"));
app.use(express.static("public"));
app.engine("ejs", ejsMate);

const validateReview = (req, res, next) => {
  const { error } = reviewSchema.validate(req.body); // Validate directly from the body
  if (error) {
    const msg = error.details.map((el) => el.message).join(", ");
    console.error("Validation Error:", msg);  // Log the error to the console for debugging
    throw new ExpressError(msg, 400);  // Send validation error response
  } else {
    next();
  }
};

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
    res.render("listings/listings.ejs", { listings });
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
    // Use 'listing' (the imported model) to update the listing
    const updatedListing = await listing.findByIdAndUpdate(id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!updatedListing) {
      return res.status(404).send("Listing not found");
    }

    // Send a response or redirect after successful update
    res.redirect(`/listings`);
  } catch (err) {
    console.error(err);
    res.status(500).send("Error updating the listing");
  }
});

app.get("/listings/:id/", async (req, res) => {
  let { id } = req.params;
  try {
    // Find the listing and populate its reviews
    const listingToShow = await listing.findById(id).populate('reviews');
    
    if (!listingToShow) {
      return res.status(404).send("Listing not found");
    }

    // Render the listing with populated reviews
    res.render("listings/showparticular.ejs", {
      particularBnb: listingToShow,
    });
  } catch (err) {
    console.error("Error fetching listing details:", err);
    res.status(500).send("Error fetching listing details");
  }
});

// Delete Route
app.delete("/listings/:id", async (req, res) => {
  let { id } = req.params;
  let deletedListing = await listing.findByIdAndDelete(id);
  res.redirect("/listings");
});

// POST Review Route
app.post(
  "/listings/:id/reviews",
  validateReview,
  wrapAsync(async (req, res) => {
    try {
      let { id } = req.params;
      let { rating, comment } = req.body;

      // Ensure both rating and comment are provided
      if (!rating || !comment) {
        return res.status(400).send('Rating and Comment are required');
      }

      // Create the new review instance
      let newReview = new review({ rating, comment });

      // Save the new review to the Review collection
      await newReview.save();  // Save the review to the database

      // Find the listing by ID
      let listingToUpdate = await listing.findById(id);

      if (!listingToUpdate) {
        return res.status(404).send('Listing not found');
      }

      // Push the new review's ObjectId to the reviews array of the listing
      listingToUpdate.reviews.push(newReview._id); // Use the _id of the saved review

      // Save the updated listing with the new review reference
      await listingToUpdate.save();

      // Redirect back to the listing page
      res.redirect(`/listings/${id}`);
    } catch (error) {
      console.error('Error adding review:', error);
      res.status(500).send('Something went wrong');
    }
  })
);

// Global error handler
app.use((err, req, res, next) => {
  const { message, statusCode = 500 } = err;
  res.status(statusCode).send(message);
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
