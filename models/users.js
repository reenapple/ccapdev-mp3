const mongoose = require("mongoose")

let Users = mongoose.model("users",{
    username: String, 
    hash: String,
    salt: String,
    firstname: String,
    lastname: String,
    email: String,
    filename: String,
    originalfilename: String
})

module.exports = {
    Users
}