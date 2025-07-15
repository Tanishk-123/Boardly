const mongoose = require('mongoose');
const plm = require("passport-local-mongoose");

mongoose.connect(process.env.DB_URL);

const userSchema = mongoose.Schema({
  username: String,
  email: String,
  password: String,
  pinned: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "post" 
    }
  ],
  posts: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "post" 
  }],
})

userSchema.plugin(plm);

module.exports = mongoose.model("user", userSchema);