const express = require('express');
const router = express.Router();
const passport = require("passport");
const localStrategy = require("passport-local");
const userModel = require("./users");
const postModel = require("./posts");
const upload = require('./multer');

//Passport Config
passport.use(new localStrategy(userModel.authenticate()));

function isLoggedIn(req, res, next) {
  if (req.isAuthenticated()) return next();
  res.redirect("/login");
}

// ------------------- GET ROUTES ------------------- //
// Landing page route
router.get('/', (req, res) => {
    const data = {
        title: 'Boardly - Pin Your Inspiration',
        currentPage: 'Home',
        footer: true
    };
    res.render('index', data);
    console.log("Home Page is served");
});

router.get('/login',(req,res)=>{
    const login = {
        title: 'Login - Boardly',
        currentPage: 'Login',
        messages: req.flash()
    };
    res.render('login',login);
    console.log("Login Page served");
});

router.get('/register',(req,res)=>{
    const register = {
        title: 'Register - Boardly',
        currentPage: 'Register',
        messages: req.flash()
    };
    res.render('register',register);
    console.log("Register Page served");
});

router.get("/board", isLoggedIn, async function (req, res) {
  try{  
    let user = await userModel
    .findOne({ username: req.session.passport.user })
    .populate("posts");
  let posts = await postModel.find().populate("user");

  res.render("board", {
    title: "Boards Feed",
    user,
    posts,
  });
} catch (err) {
    console.error("Error fetching board:", err);
    res.status(500).send("Something went wrong");
}
});

router.get("/profile",isLoggedIn, async (req,res)=> {
    try {
    const user = await userModel.findOne({ username: req.session.passport.user })
      .populate("posts")
      .populate("pinned");
      console.log(user);
      res.render("profile", { title: user.username + "'s Profile",user, posts: user.posts });
    } catch (err) {
        console.error("Error loading profile:", err);
        res.redirect("/board");
    }
});

router.get("/profile/:user", isLoggedIn, async (req, res) => {
    try {
    if (req.params.user === req.session.passport.user) {
        return res.redirect("/profile");  
        } //  It checks if the user is trying to view their own profile via the dynamic route /profile/:user
    // and redirects user to their dedicated personal profile page

    const user = await userModel.findOne({ username: req.session.passport.user });
    const userprofile = await userModel.findOne({ username: req.params.user }).populate("posts");
    res.render("userprofile", { userprofile, user });    
    }  catch (err) {
    console.error("Error loading user profile:", err);
    res.redirect("/board");
    }
});


router.get("/edit", isLoggedIn, async (req, res) => {
    const user = await userModel.findOne({ username: req.session.passport.user });
    res.render("edit", { user });
});

router.get("/upload", isLoggedIn, async (req, res) => {
  const user = await userModel.findOne({ username: req.session.passport.user });
  res.render("upload", { user });
});

// ------------------- POST ROUTES ------------------- //

router.post('/register', async (req, res, next) => {
  try {
    const { username, email, password } = req.body;

    //  Validate inputs
    if (!username?.trim() || !email?.trim() || !password) {
      console.warn("Missing registration fields");
      req.flash("error", "All fields are required.");
      return res.redirect("/register");
    }

    //  Check for existing username
    const existingUser = await userModel.findOne({ username: username.trim() });
    if (existingUser) {
      console.warn("Username already exists:", username);
      req.flash("error", "Username is already taken. Please choose another.");
      return res.redirect("/register");
    }

    //  Check for existing email
    const existingEmail = await userModel.findOne({ email: email.trim().toLowerCase() });
    if (existingEmail) {
      console.warn("Email already exists:", email);
      req.flash("error", "Email is already registered. Try logging in.");
      return res.redirect("/register");
    }

    // Create and register user
    const user = new userModel({ username: username.trim(), email: email.trim().toLowerCase() });
    const registeredUser = await userModel.register(user, password);

    console.log("User registered:", registeredUser.username);

    // Auto-login after registration
    req.login(registeredUser, (err) => {
      if (err) {
        console.error("Login error after registration:", err);
        req.flash("error", "Something went wrong during login.");
        return next(err);
      }
      req.flash("success", `Welcome, ${registeredUser.username}!`);
      res.redirect("/profile");
    });
  } catch (err) {
    console.error("Registration error:", err);
    req.flash("error", "An unexpected error occurred. Please try again.");
    res.redirect("/register");
  }
});


router.post("/login", (req, res, next) => {
  passport.authenticate("local", (err, user, info) => {
    if (err) return next(err);
    
     if (!user) {
      // Handle passport-local-mongoose messages
      if (info && info.message === "Missing credentials") {
        req.flash("error", "Please enter both username and password.");
      } else if (info && info.message === "Password or username is incorrect") {
        req.flash("error", "Invalid username or password. Please try again.");
      } else if (info && info.message === "Too many attempts, account locked") {
        req.flash("error", "Account temporarily locked due to too many failed attempts. Please try again later.");
      } else {
        // Generic fallback message
        req.flash("error", "Login failed. Please check your credentials and try again.");
      }
      return res.redirect("/login");
    }

    // Auth successful
    req.logIn(user, (err) => {
      if (err) return next(err);
      return res.redirect("/board");
    });
  })(req, res, next);
});


router.post("/update", isLoggedIn, async (req, res) => {
  try {
    const updatedUser = await userModel.findOneAndUpdate(
      { username: req.session.passport.user },
      { username: req.body.username, name: req.body.name, bio: req.body.bio },
      { new: true }
    );
    req.login(updatedUser, (err) => {
      if (err) throw err;
      res.redirect("/profile");
    });
  } catch (err) {
    console.error("Profile update failed:", err);
    res.redirect("/edit");
  }
});

router.post("/post", isLoggedIn, upload.single("image"), async (req, res) => {
  try {
    const user = await userModel.findOne({ username: req.session.passport.user });

      const post = await postModel.create({
        user: user._id,
        caption: req.body.caption,
        picture: req.file.filename
      });
      user.posts.push(post._id);
    

    await user.save();
    res.redirect("/board");
  } catch (err) {
    console.error("Post/ upload failed:", err);
    res.redirect("/upload");
  }
});

router.get("/logout", (req, res, next) => {
  req.logout((err) => {
    if (err) return next(err);
    res.redirect("/login");
  });
});

// ------------------- INTERACTION ROUTES ------------------- //
router.post("/save/:postid", isLoggedIn, async (req, res) => {
  try {
    const user = await userModel.findOne({ username: req.session.passport.user });

    if (!user.pinned.includes(req.params.postid)) {
      user.pinned.push(req.params.postid);
    } else {
      user.pinned.pull(req.params.postid);
    }

    await user.save();
    res.json({ pinned: user.pinned });
  } catch (err) {
    console.error("Save/Unsave failed:", err);
    res.status(500).json({ success: false });
  }
});

module.exports = router;