const multer = require("multer");
const path = require("path");
const crypto = require("crypto");

// Allowed file types (images only)
const ALLOWED_FILE_TYPES = /jpeg|jpg|png|gif|webp/;


//Set Storage engine
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "./public/images/uploads");
  },
  filename: function (req, file, cb) {
    const uniqueName = crypto.randomBytes(16).toString("hex") + path.extname(file.originalname);
    cb(null, uniqueName);
  },
});


const upload = multer({ storage: storage });
module.exports = upload;