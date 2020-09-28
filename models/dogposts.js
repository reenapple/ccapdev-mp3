const mongoose = require("mongoose")

let dogPost = mongoose.model("dogpost",{
    username: String, 
    dogname: String, 
    breed: String, 
    location: String, 
    dogage: Number, 
    gender: String, 
    dogdesc: String,
    datecreated: Date,
    filename: String, 
    originalfilename: String
})

module.exports = {
    dogPost
}