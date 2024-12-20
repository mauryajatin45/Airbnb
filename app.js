const express = require("express");
const app = express();
const mongoose = require("mongoose");
const listing = require("../Airbnb/Models/listing"); // Use 'listing' as imported model
const methodOverride = require("method-override");
const path = require("path");
const ejsMate = require("ejs-mate");

const port = 3000;

app.set("view engine", "ejs");
app.set('views', path.join(__dirname, 'views'));
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride("_method"));
app.use(express.static("public"));
app.engine("ejs", ejsMate);

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
    console.log("Request received on listing page");
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
    console.log("New listing created");
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
    console.log(listingToEdit);
    res.render("listings/edit.ejs", { particularBnb: listingToEdit });
  } catch (err) {
    console.error("Error fetching listing for edit:", err);
    res.status(500).send("Error fetching listing for edit");
  }
});

// Update a listing
app.put("/listings/:id", async (req, res) => {
  const { id } = req.params;

  // Log the incoming body to check what data is being sent
  console.log("req.body", req.body);

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

// Show a particular listing
app.get("/listings/:id/", async (req, res) => {
  let { id } = req.params;
  try {
    const listingToShow = await listing.findById(id); // This expects an ObjectId
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

// Delete Route
app.delete("/listings/:id", async (req, res) => {
  let { id } = req.params;
  let deletedListing = await listing.findByIdAndDelete(id);
  console.log(deletedListing);
  res.redirect("/listings");
});

app.use((err, req, res, next)=>{
  res.send("Something went Wrong!!!")
})

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
