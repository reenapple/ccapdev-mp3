const express = require("express")
const session = require("express-session")
const bodyparser = require("body-parser")
const cookieparser = require("cookie-parser")
const path = require("path")
const hbs = require("hbs")
const mongoose = require("mongoose")
const moment = require("moment")
const multer = require("multer")
const fs = require("fs")
const crypto = require("crypto")
const btoa = require("btoa")
const dogPost = require("./models/dogposts.js").dogPost
const Requests = require("./models/requests.js").Requests
const Users = require("./models/users.js").Users

const app = express()

//connecting to mongodb 
mongoose.connect("mongodb+srv://reenapple:47yMLTXSA6qxa4tv@cluster0.0j7bt.mongodb.net/doggymate-db?retryWrites=true&w=majority",{
    useNewUrlParser: true,
    useUnifiedTopology: true
})
const storage = multer.diskStorage({
    destination: function (req, res, cb) {
        cb(null, 'uploads/')
    }
})
const upload = multer({ storage: storage });

app.use(session({
    secret: "very secret",
    resave: true,
    saveUninitialized: true,
    cookie: {
        maxAge: 1000*60*60*24*7, //7 days
        httpOnly: true //no cross-site scripting
    }
}))

app.use(cookieparser())
app.use(express.static(path.join(__dirname, '/public')));

const urlencoder = bodyparser.urlencoded({
    extended: false
})

app.set("view engine", "hbs")

hbs.registerPartials(__dirname + '/views/partials');

hbs.handlebars.registerHelper('tobase64', function(buffer) {
    var b64 = btoa(buffer)
    return b64
})

//start of index
app.get("/", function(req, res){
    let data = {}
    req.session.page = 1
    
    if(req.session.username){
        data.username = req.session.username
    }

    dogPost.find({}).sort({datecreated: -1}).limit(5).then((doc)=>{
        data.dogpost = doc

        res.render("index.hbs", data)
    })
})
//end of index

//start of browse
app.get("/browse", (req,res)=>{
    let limit = 12; //number of posts per page
    let page
    let sort 
    let data = {}
    req.session.redirectTo = "/browse"

    if(req.session.username){
        data.username = req.session.username
    }
    
    if(req.session.page){
        page = req.session.page
    }else{
        page = 1
    }
    if(req.session.sort){
        sort = req.session.sort
    }else{
        sort = {datecreated:-1}
    }

    if(sort.breed){
        data.bybreed = true
    }else{
        data.bynew = true
    }

    dogPost.find({}).then((doc)=>{
        data.pages = []

        for(let i=0;i<Math.ceil(doc.length/limit);i++){
            if(!req.session.page && page-1==i){
                data.pages.push({
                    pagenum: i+1,
                    pageselected: true
                })
            }else if(req.session.page-1 == i){
                data.pages.push({
                    pagenum: i+1,
                    pageselected: true
                })
            }else{
                data.pages.push({
                    pagenum: i+1,
                    pageselected: false
                })
            }
        }

        dogPost.find({}).sort(sort).limit(limit).skip((page-1)*limit).then((doc)=>{
            data.dogpost = doc
            res.render("browse.hbs", data)
        })
    })

    
    
})

app.get("/page::pagenum", function(req,res){
    req.session.page = req.params.pagenum
    res.redirect("/browse")
})

app.get("/sort:sortby", function(req,res){
    if(req.params.sortby=="bynew"){
        req.session.sort = {datecreated:-1}
    }
    else if(req.params.sortby=="bybreed"){
        req.session.sort = {breed:1,datecreated:-1}
    }
    res.redirect("/browse")
})

app.get("/search", function(req, res){
    let data = {}
    let limit = 12;
    let page
    let sort
    let q = req.query.q
    
    if(req.session.username){
        data.username = req.session.username
    }
    
    if(req.session.page){
        page = req.session.page
    }else{
        page = 1
    }
    if(req.session.sort){
        sort = req.session.sort
    }else{
        sort = {datecreated:-1}
    }

    if(sort.breed){
        data.bybreed = true
    }else{
        data.bynew = true
    }

    dogPost.find({}).then((doc)=>{
        data.pages = []

        for(let i=0;i<Math.ceil(doc.length/limit);i++){
            if(!req.session.page && page-1==i){
                data.pages.push({
                    pagenum: i+1,
                    pageselected: true
                })
            }else if(req.session.page-1 == i){
                data.pages.push({
                    pagenum: i+1,
                    pageselected: true
                })
            }else{
                data.pages.push({
                    pagenum: i+1,
                    pageselected: false
                })
            }
        }
    })
    if(q==""){
        res.redirect("/browse")
    }else{
        dogPost.find({$or:[
            {username: {$regex:'.*'+q+'.*',$options:'i'}},
            {dogname: {$regex:'.*'+q+'.*',$options:'i'}}, 
            {breed: {$regex:'.*'+q+'.*',$options:'i'}}, 
            {location: {$regex:'.*'+q+'.*',$options:'i'}}, 
            {gender: {$regex:'.*'+q+'.*',$options:'i'}}]}).sort(sort).limit(limit).skip((page-1)*limit).then((doc)=>{
                data.dogpost = doc
                res.render("browse.hbs", data)
            })
    }
})
//end of browse

//start of about
app.get("/about", function(req, res){
    let data = {}
    req.session.page = 1
    
    if(req.session.username){
        data.username = req.session.username
    }
    
    res.render("about.hbs", data)
})
//end of about

//start for editing a post
app.get("/postedit:_id", (req,res)=>{
    let data = {}

    if(req.session.username){
        data.username = req.session.username
        dogPost.find({'_id': req.params._id}).then((doc)=>{
            data.dogpost = doc
            
            res.render("postedit.hbs", data)
        })
    }
})

app.post("/editpost:_id", urlencoder, (req,res)=>{
    req.session.page = 1
    let data = {}
    let dogname = titleCase(req.body.dogname)
    let breed = titleCase(req.body.breed)
    let dogage = req.body.dogage
    let dogender = titleCase(req.body.dogender)
    let location = titleCase(req.body.location)
    let dogdesc = req.body.dogdesc
    data.username = req.session.username

    if(dogname==""||breed==""||dogage==""||location==""){ 
        dogPost.find({'_id': req.params._id}).then((doc)=>{
            data.dogpost = doc
            data.error = "Incomplete input"
            console.log(data)
            res.render("postedit.hbs", data)
        })
    }else{
        dogPost.find({'_id': req.params._id}).then((doc)=>{
            data.dogpost = doc
    
            dogPost.findOneAndUpdate({_id: req.params._id}, {
                dogname: dogname,
                breed: breed,
                dogage: dogage, 
                gender: dogender, 
                location: location, 
                dogdesc: dogdesc
            }).then((updatedDoc)=>{
                console.log("Updated file: " + JSON.stringify(doc)); 
            })
        
            console.log(data)
            res.render("postedit.hbs", {
                success: "Post has been updated",
                _id: data.dogpost[0]._id})
        })
    }    
})
//end for editing a post

//start for deleting a post 
app.get("/deletepost:_id", (req,res)=>{  
    req.session.page = 1

    dogPost.find({_id: req.params._id}).then((doc)=>{
        Requests.remove({userdog_id: doc[0]._id}).then((doc)=>{
            console.log("Deleted " + doc.n + " document/s"); 
        })
        Requests.remove({dogownerdog_id: doc[0]._id}).then((doc)=>{
            console.log("Deleted " + doc.n + " document/s"); 
        })
    })

    dogPost.remove({'_id': req.params._id}).then((doc)=>{
        console.log("Deleted " + doc.n + " document/s"); 
    })
    
    res.redirect("/browse") 
})
//end for deleting a post

// start for creating a post 
app.get("/postcreate", (req,res)=>{
    if(req.session.username){
        //if user signed in
        res.render("postcreate.hbs", {
            username: req.session.username
        })
    }else{
        //if user not signed in
        // change this to error message or smth 
        res.render("login.hbs", {
            error: "This content is only available for members. Please log in first."
        })
    }
})

app.post("/createpost", upload.single("img"), (req,res)=>{
    req.session.page = 1
    let username = req.session.username
    let dogname = titleCase(req.body.dogname)
    let breed = titleCase(req.body.breed)
    let dogage = req.body.dogage
    let dogender = titleCase(req.body.dogender)
    let location = titleCase(req.body.location)
    let dogdesc = req.body.dogdesc
    let err = {}

    if(dogname==""||breed==""||dogage==""||location==""||dogender=="blank"||typeof req.file=='undefined'){ 
        err.e = true 
        err.error = "Incomplete input"
        res.render("postcreate.hbs", err)
    }else{

        let datecreated = new Date();
        
        let dogpost = new dogPost({
            username: username, 
            dogname: dogname, 
            breed: breed, 
            location: location, 
            dogage: dogage, 
            gender: dogender, 
            dogdesc: dogdesc,
            datecreated: datecreated
            })
        
        dogpost.img.data = fs.readFileSync(req.file.path)
        dogpost.img.contentType = 'image/jpeg';
   
        dogpost.save().then((doc)=>{
            console.log("Successfully added: " + doc)
        }, (err)=>{
            console.log("Error in adding: " + doc)
        })

        res.redirect("/browse") 
    }
})

app.get("/cancel", (req,res)=>{
    res.redirect("/browse")
})
// end for creating a post 

// start for seeing a specific post 

app.get("/post:_id", function(req,res){
    let data = {}

    if(req.session.username){
        data.username = req.session.username
    }

    if(req.session.username){
        dogPost.find({'username': req.session.username}).then((doc)=>{
            data.dogpostreq = doc

            dogPost.find({'_id': req.params._id}).then((doc)=>{

                data.dogpost = doc
                data.dogpost[0].currentDate = moment(data.dogpost[0].datecreated).fromNow()
        
                if(req.session.username == data.dogpost[0].username){
                    data.dogpost[0].loggedisme = req.session.username
                }else{
                    data.dogpost[0].logged = req.session.username
                }
                res.render("post.hbs", data)
            })
        })
    }else{
        dogPost.find({'_id': req.params._id}).then((doc)=>{
            data.dogpost = doc
            data.dogpost[0].currentDate = moment(data.dogpost[0].datecreated).fromNow()
            res.render("post.hbs", data)
        })
    }

    
})

app.get('/prevpage', function(req,res){
    var redirectTo = req.session.redirectTo || '/';
    delete req.session.redirectTo;
    res.redirect(redirectTo);
})

app.post("/sendrequest", urlencoder, (req,res)=>{
    req.session.page = 1
    let username = req.body.username
    let userdog_id = req.body.userdog_id
    let dogownerdog_id = req.body.dogownerdog_id
    let dogownerdogname = req.body.dogownerdogname
    let dogownername = req.body.dogownername
    let venue = titleCase(req.body.venue)
    let date = req.body.date
    let time = req.body.time

    if(userdog_id=="blank"||venue==""||date==""||time==""){
        res.redirect("/browse")
    }else{
        dogPost.find({_id: userdog_id}).then((doc)=>{
            let userdogname = doc[0].dogname
            let request = new Requests({
                username: username, 
                userdog_id: userdog_id, 
                userdogname: userdogname, 
                dogownername: dogownername,
                dogownerdog_id: dogownerdog_id,
                dogownerdogname: dogownerdogname,
                venue: venue, 
                date: date,
                time: time,
                approval: "pending"
            })
        
            request.save().then((request)=>{
                console.log("Successfully added: " + request)
            }, (err)=>{
                console.log("Error in adding: " + request)
            })
        
            res.redirect("/browse")
        })    
    }
})
//end for seeing a specific post

//start of request
app.get("/requests-sent", (req,res)=>{
    let data = {}
    req.session.redirectTo = "/requests-sent"
    req.session.page = 1

    if(req.session.username){
        data.username = req.session.username

        Requests.find({username: req.session.username}).sort({date: 1}).then((doc)=>{
            data.sentrequests = doc
            for(let i=0;i<data.sentrequests.length;i++){
                data.sentrequests[i].dateset = moment(data.sentrequests[i].date).format('LL')
            }
            data.sentrequestsbox = true
            res.render("requests.hbs", data)
        })
    }else{
        res.render("login.hbs", {
            error: "This content is only available for members. Please log in first."
        })
    }
})

app.get("/requests-received", (req,res)=>{
    let data = {}
    req.session.redirectTo = "/requests-received"

    if(req.session.username){
        data.username = req.session.username

        Requests.find({dogownername: req.session.username}).sort({date: 1}).then((doc)=>{
            data.receivedrequests = doc
            for(let i=0;i<data.receivedrequests.length;i++){
                if(data.receivedrequests[i].approval == "pending"){
                    data.receivedrequests[i].pending = true
                }else if(data.receivedrequests[i].approval == "accepted"){
                    data.receivedrequests[i].accepted = true
                }else{
                    data.receivedrequests[i].rejected = true
                }
                data.receivedrequests[i].dateset = moment(data.receivedrequests[i].date).format('LL')
            }
            data.receivedrequestsbox = true
            res.render("requests.hbs", data)
        })
    }else{
        res.render("login.hbs", {
            error: "This content is only available for members. Please log in first."
        })
    }
})
app.get("/raccept:_id", (req,res)=>{
    Requests.findOneAndUpdate({_id: req.params._id}, {
        approval: "accepted"
    }).then((updatedDoc)=>{
        console.log("Updated file: " + JSON.stringify(doc)); 
    })
    res.redirect("/requests-received")
})
app.get("/rreject:_id", (req,res)=>{
    Requests.findOneAndUpdate({_id: req.params._id}, {
        approval: "rejected"
    }).then((updatedDoc)=>{
        console.log("Updated file: " + JSON.stringify(doc)); 
    })
    res.redirect("/requests-received")
})
app.get("/rdelete:_id", (req,res)=>{  
    Requests.remove({'_id': req.params._id}).then((doc)=>{
        console.log("Deleted " + doc.n + " document/s"); 
    })
    res.redirect("/requests-sent") 
})
//end of request

app.get("/login", (req,res)=>{
    req.session.page = 1
    res.render("login.hbs")
})

app.post("/signin", urlencoder, (req,res)=>{
    let username=req.body.username
    let password=req.body.password

    if(username=="" || password==""){
        res.render("login.hbs",{
            error: "Enter username and password"
        })
    }else{
        Users.findOne({'username': username}).then((doc)=>{
            if(doc == null){
                res.render("login.hbs",{
                    error:"User does not exist"
                })
            }else{
                let hash = crypto.pbkdf2Sync(password, doc.salt, 1000, 64, `sha512`).toString(`hex`)
                if (doc.hash === hash) { 
                    req.session.username = username
                    res.redirect("/")
                } 
                else { 
                    res.render("login.hbs",{
                        error: "Username and password do not match"
                    })
                }
            }
        })
    }
    
})

app.get("/register", (req,res)=>{
    req.session.page = 1
    res.render("register.hbs")
})
app.post("/signup", upload.single("userimg"), (req,res)=>{
    let firstname = titleCase(req.body.firstname)
    let lastname = titleCase(req.body.lastname)
    let email = req.body.email
    let username = req.body.username
    let password = req.body.password
    let confirmpassword = req.body.confirmpassword

    
    if(firstname==""||lastname==""||email==""||username==""||password==""||typeof req.file=='undefined'){
        res.render("register.hbs",{
            error: "Incomplete Input"
        })
    }else if(password != confirmpassword){
        res.render("register.hbs",{
            error: "Password does not match"
        })
    }else{
        Users.find({'username': username}).then((doc)=>{
            if(doc.length != 0){
                res.render("register.hbs",{
                    error: "Username already exists. Input a different username."
                })
            }else{
                let salt = crypto.randomBytes(16).toString('hex')
                let hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex')
                req.session.username = username

                let user = new Users({
                    firstname:firstname,
                    lastname:lastname,
                    email:email,
                    username:username,
                    salt: salt,
                    hash: hash
                })

                user.img.data = fs.readFileSync(req.file.path)
                user.img.contentType = 'image/jpeg';

                user.save().then((doc)=>{
                    console.log("Successfully added: " + doc)
                }, (err)=>{
                    console.log("Error in adding: " + doc)
                })
        
                res.redirect("/")
            }
        })
    }
})

app.get("/profile-:username", (req,res)=>{
    let data = {}
    req.session.page = 1
    req.session.redirectTo = "/browse"


    if(req.session.username){
        data.username = req.session.username
    }
    Users.find({username: req.params.username}).then((doc)=>{
        if(doc.length == 0){
            res.send("ERROR: user does not exist")
        }else{
            data.user = doc
            dogPost.find({username: req.params.username}).then((doc)=>{
                data.dogpost = doc
                if(data.user[0].username == req.session.username){
                    data.isme = true
                }
                console.log(data)
                res.render("profile.hbs", data)
            })
        }
    })
    
})
app.get("/settings-:username", (req,res)=>{
    let data = {}

    if(req.session.username){
        data.username = req.session.username
        Users.find({username: req.params.username}).then((doc)=>{
            data.users = doc
            res.render("profileedit.hbs", data)
        })
    }
})

app.post("/editprofile:_id", urlencoder, (req,res)=>{
    req.session.page = 1
    let data = {}
    let firstname = titleCase(req.body.firstname)
    let lastname = titleCase(req.body.lastname)
    let email = req.body.email
    data.username = req.session.username

    if(firstname=="" || lastname==""|| email==""){
        Users.find({'_id': req.params._id}).then((doc)=>{
            data.users = doc
            data.error = "Incomplete input"
            data.e = true
            res.render("profileedit.hbs", data)
        })
    }else{
        Users.findOne({'_id': req.params._id}).then((doc)=>{
            data.users = doc
            Users.findOneAndUpdate({_id: req.params._id}, {
                firstname: firstname,
                lastname: lastname,
                email: email
            }).then((updatedDoc)=>{
                console.log("Updated file: " + JSON.stringify(doc)); 
            })

            if(req.body.password){
                let newpassword = req.body.password
                let newsalt = crypto.randomBytes(16).toString('hex')
                let newhash = crypto.pbkdf2Sync(newpassword, newsalt, 1000, 64, 'sha512').toString('hex')

                let confirmpassword = req.body.confirmpassword
                let confirmhash = crypto.pbkdf2Sync(confirmpassword, doc.salt, 1000, 64, `sha512`).toString(`hex`)

                if (doc.hash === confirmhash) {
                    Users.findOneAndUpdate({_id: req.params._id}, {
                        salt: newsalt,
                        hash: newhash
                    }).then((updatedDoc)=>{
                        console.log("Updated file: " + JSON.stringify(doc));
                    })
                    res.render("profileedit.hbs", {
                        success: "Profile has been updated",
                        username: data.users.username})
                }else{
                    Users.find({'_id': req.params._id}).then((doc)=>{
                        data.users = doc
                        data.error = "Password does not match"
                        res.render("profileedit.hbs", data)
                    })
                }
            }else{
                res.render("profileedit.hbs", {
                    success: "Profile has been updated",
                    username: data.users.username})
            }
        })
    }
})

app.get("/deleteprofile:_id", urlencoder, (req,res)=>{  
    req.session.page = 1

    Users.find({_id: req.params._id}).then((doc)=>{
        console.log(doc[0].username)
        dogPost.remove({username: doc[0].username}).then((doc)=>{
            console.log("Deleted " + doc.n + " document/s"); 
        })
        Requests.remove({username: doc[0].username}).then((doc)=>{
            console.log("Deleted " + doc.n + " document/s"); 
        })
        Requests.remove({dogownername: doc[0].username}).then((doc)=>{
            console.log("Deleted " + doc.n + " document/s"); 
        })
    })

    Users.remove({_id: req.params._id}).then((doc)=>{
        console.log("Deleted " + doc.n + " document/s"); 
    })
    
    req.session.destroy()
    res.redirect("/") 
})

app.get("/logout", (req,res)=>{
    req.session.destroy()
    res.redirect("/")
})

function titleCase(str) {
    var splitStr = str.toLowerCase().split(' ');
    for (var i = 0; i < splitStr.length; i++) {
        splitStr[i] = splitStr[i].charAt(0).toUpperCase() + splitStr[i].substring(1);     
    }
    return splitStr.join(' '); 
 }

 app.listen(process.env.PORT || 3000)