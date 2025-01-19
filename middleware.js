module.exports.isLoggedIn = (req, res, next) => {
  if (!req.isAuthenticated()) {
    req.session.returnTo = req.originalUrl; // Store the original URL
    req.flash("error", "You must be signed in to access this page");
    return res.redirect("/login");
  }
  next();
};

module.exports.saveURL = (req, res, next) => {
  if (req.session.returnTo) {
    res.locals.returnTo = req.session.returnTo;
  }
  next();
};
