const express = require("express");
const app = express();
const mongoose = require("mongoose");
const listing = require("../Airbnb/Models/listing");

const port = 3000;

app.use(express.static("public"));
app.set("view engine", "ejs");
app.set("views", __dirname + "/views");

async function main() {
  await mongoose.connect("mongodb://127.0.0.1:27017/wanderlust");
}

main()
  .then(() => {
    console.log("Connected to database");
  })
  .catch((err) => {
    console.log(err);
  });


app.get("/", (req, res) => {
  res.send("Working");
});

app.get('/listings', (req, res)=>{
  listing.find({}).then((listings)=>{
    res.render("listings", {listings});
  })
})

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
