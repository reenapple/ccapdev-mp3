const mongoose = require("mongoose")

let Requests = mongoose.model("request",{
    userdog_id: String,
    userdogname: String,
    username: String,
    dogownerdog_id: String,
    dogownerdogname: String,
    dogownername: String,
    venue: String,
    date: Date,
    time: String,
    approval: String
})

module.exports = {
    Requests
}