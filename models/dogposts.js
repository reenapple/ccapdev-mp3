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
    img: {
        data: Buffer,
        contentType: String
    }
})

module.exports = {
    dogPost
}