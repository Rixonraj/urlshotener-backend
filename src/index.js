const express = require("express")
const cors = require("cors")
const app = express();
const mongoose = require("mongoose")
const dotenv = require("dotenv")
const session = require("express-session")
const bcrypt = require("bcrypt")
const jwt = require("jsonwebtoken")
const nodemailer = require('nodemailer');
dotenv.config({ path: require('find-config')('.env') })
// const JWT_SECRET = process.env.JWT_SECRET;
const JWT_SECRET = process.env.JWT_SECRET

const URL = (`${process.env.START_MONGO}${process.env.MONGO_USERNAME}:${process.env.MONGO_PASSWORD}${process.env.END_MONGO}${process.env.DB_NAME}${process.env.LAST_MONGO}`)

mongoose.connect(URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => console.log('Connected!'));


const userLogin = require('./models/urldata_model.js')
const urlShort = require('./models/shorturl_model.js')

app.use(express.json())

app.use(cors({
    origin: '*',
    // credentials: true,
    // exposedHeaders: ['Set-Cookie']
}))

// app.set("trust proxy", 1);


app.use(
    session({
        secret: "secretcode",
        resave: true,
        saveUninitialized: true,
        cookie: {
            // sameSite: 'none',
            // secure: true,
            // maxAge: 1000 * 60 * 60 * 24 * 7,
            httpOnly: true
        }
    }))

const transporter = nodemailer.createTransport({
    service: process.env.GSERVICE,
    auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GKEY
    }
});


app.get("/", (req, res) => {

    res.send("Hello World From BACKEND");
})




app.post("/user/register", async (req, res) => {

    try {
        userLogin.findOne({ username: req.body.username }).then(async (docs) => {
            // || !docs.emailVerified wirite use case
            if (!docs) {

                var salt = await bcrypt.genSalt(10)
                var hash = await bcrypt.hash(req.body.password, salt)
                req.body.password = hash
                // var emailtoken = 
                const emailtoken = jwt.sign({
                    name: req.body.username,
                    exp: Math.floor(Date.now() / 1000) + (60 * 60), //exp in one hour
                    iat: Math.floor(Date.now() / 1000)

                }, JWT_SECRET)


                const newUser = new userLogin({
                    username: req.body.username,
                    password: req.body.password,
                    emailToken: emailtoken
                });
                newUser.save().then(() => {
                    console.log("SAVED");
                    userLogin.findOne({ username: req.body.username }).then(async (docs) => {
                        if (docs) {
                            // mail url
                            const mailURL = process.env.FRONTEND_URL + "/emailVerification/:" + docs._id + "?emailToken=" + emailtoken

                            //send email
                            const mailOptions = {
                                from: 'rixrajr@gmail.com',
                                to: req.body.username,
                                subject: 'Sending Email using Node.js password reset link',
                                text: mailURL
                            };

                            transporter.sendMail(mailOptions, async function (error, info) {
                                if (error) {
                                    console.log(error);
                                    res.status(404).json({ message: error })

                                } else {
                                    // send url and save in db 
                                    res.send({ message: 'Email sent: ' + info.response });
                                    console.log('Email sent: ' + info.response);


                                }
                            });
                            //end email
                        }
                    })

                    // res.send({ message: "Success ceated" });
                    // mongoose.connection.close().then(console.log("connection closed"));
                }
                )





            } else {
                if (docs.emailVerified) {
                    res.send({ message: "User Already Exist, Try another Name" });
                }
                else {

                    var salt = await bcrypt.genSalt(10)
                    var hash = await bcrypt.hash(req.body.password, salt)
                    req.body.password = hash
                    // var emailtoken = 
                    const emailtoken = jwt.sign({
                        name: req.body.username,
                        exp: Math.floor(Date.now() / 1000) + (60 * 60), //exp in one hour
                        iat: Math.floor(Date.now() / 1000)

                    }, JWT_SECRET)

                    //set new pass and email token
                    userLogin.updateOne({ _id: docs._id },
                        {
                            $set: {
                                password: req.body.password,
                                emailToken: emailtoken
                            }
                        }
                    )

                    // mail url
                    const mailURL = process.env.FRONTEND_URL + "/emailVerification/" + docs._id + "?emailToken=" + emailtoken

                    //send email
                    const mailOptions = {
                        from: 'rixrajr@gmail.com',
                        to: req.body.username,
                        subject: 'Verify Email ID',
                        text: mailURL
                    };

                    transporter.sendMail(mailOptions, async function (error, info) {
                        if (error) {
                            console.log(error);
                            res.status(404).json({ message: error })

                        } else {
                            // send url and save in db 
                            res.send({ message: 'Email sent: ' + info.response });
                            console.log('Email sent: ' + info.response);


                        }
                    });
                }
            }
        })


    } catch (error) {
        console.log("error", error)
    }
})


app.put("/emailVerification/:id", async (req, res) => {
    console.log("req.params,", req.params)
    console.log("req.query,", req.query)
    try {
        const decodedEmailToken = jwt.verify(req.query.emailToken, JWT_SECRET)

        // if (err) { console.log("ERROREE : ",err); res.status(401).json({ message: err })};
        if (decodedEmailToken) {
            console.log("TOKEN Authorized!", decodedEmailToken)
            // find user using param id and compare user name from token and db
            userLogin.findOne({ _id: req.params.id.toString().replace(':', '') }).then(async (docs) => {
                if (docs) {
                    console.log("DOCCSSS", docs)
                    if (decodedEmailToken.name == docs.username) {
                        userLogin.updateOne({ _id: docs._id }, {
                            $set: {
                                emailVerified: true
                            }
                        }).then(res.json({ message: "Email Verified!" }))

                    } else {
                        res.status(401).json({ message: "User Mismatch Login Again" })
                    }
                }
            })

        } else {
            res.status(401).json({ message: "Token Mismatch" })

        }
    }
    catch (error) {

        res.status(401).json({ message: "Unauthorized" + error })
    }


})

app.put("/forgotpassword", async (req, res) => {
    console.log("req.params,", req.params)
    console.log("req.query,", req.query)
    console.log("req.body.values:", req.body)
    try {
        //check user there? user email verified? send email with reset Link 
        userLogin.findOne({ username: req.body.username }).then(async (docs) => {

            try {
                if (docs) {
                    if (docs.emailVerified) {

                        const emailtoken = jwt.sign({
                            name: req.body.username,
                            exp: Math.floor(Date.now() / 1000) + (120), //2 min exp in sec
                            iat: Math.floor(Date.now() / 1000)

                        }, JWT_SECRET)
                        // update email token
                        userLogin.updateOne({ _id: docs._id },
                            {
                                $set: {
                                    emailToken: emailtoken
                                }
                            }
                        ).then(() => {
                            // mail url
                            const mailURL = process.env.FRONTEND_URL + "/updatePassword/:" + docs._id + "?emailToken=" + emailtoken + "&name=" + req.body.username

                            //send email
                            const mailOptions = {
                                from: 'rixrajr@gmail.com',
                                to: req.body.username,
                                subject: 'password reset link',
                                text: mailURL
                            };

                            transporter.sendMail(mailOptions, async function (error, info) {
                                if (error) {
                                    console.log(error);
                                    res.status(404).json({ message: error })

                                } else {
                                    // send url and save in db 
                                    res.send({ message: 'Email sent: ' + info.response });
                                    console.log('Email sent: ' + info.response);


                                }
                            });
                            //end email

                        })

                    } else {
                        res.json({ message: "Register again Email Not verified" })
                    }

                } else {
                    res.json({ message: "User Does not Exist" })
                }

            } catch (error) {
                res.json({ message: error })
            }
        })
    }
    catch (error) {
        res.status(401).json({ message: "Unauthorized" + error })
    }
})

app.put("/updatePassword", async (req, res) => {
    console.log("req.params,", req.params)
    console.log("req.query,", req.query)
    console.log("req.body.values:", req.body.username, req.body.emailToken)
    try {

        const decodedEmailToken = jwt.verify(req.body.emailToken, JWT_SECRET)
        if (decodedEmailToken) {
            console.log("TOKEN Authorized!", decodedEmailToken)
            userLogin.findOne({ username: req.body.username }).then(async (docs) => {
                // token email name === body.username

                //token valid ? expired or what
                //if all ok encrypt body password and update in db
                if (decodedEmailToken.name == docs.username) {
                    var salt = await bcrypt.genSalt(10)
                    var hash = await bcrypt.hash(req.body.password, salt)
                    req.body.password = hash
                    userLogin.updateOne({ _id: docs._id },
                        {
                            $set: {
                                password: req.body.password
                            }
                        }
                    ).then((doc) => {
                        console.log("doc", doc);
                        res.send({ message: "Password Changed" });
                    })
                        .catch((err) => { console.log(err); res.send({ message: err }) })
                }

            })
        }
        //check user there? user email verified? send email with reset Link 








    }
    catch (error) {

        res.status(401).json({ message: "Unauthorized" + error })
    }


})

app.post("/user/login", async (req, res) => {
    try {

        userLogin.findOne({ username: req.body.username }).then(async (docs) => {
            if (docs) {

                if (docs.emailVerified) {
                    const compare = await bcrypt.compare(req.body.password, docs.password)
                    //Issue Token
                    const token = jwt.sign({
                        _id: docs._id,
                        exp: Math.floor(Date.now() / 1000) + (60 * 60), //exp in one hour
                        iat: Math.floor(Date.now() / 1000)

                    }, JWT_SECRET)


                    if (compare) {
                        res.json({ message: "Success Auth", user_id: docs._id, token })
                    } else {
                        res.json({ message: "Wrong Pass" })
                    }
                } else {
                    res.json({ message: "Register Again - Email Not Verified" })
                }

            } else {
                res.status(404).json({ message: "User does not exist, Register" })
            }

        }
        );

    } catch (error) {

    }
})

let authorize = (req, res, next) => {
    try {
        // dbqueries
        if (req.headers.authorization) {
            //check token is valid
            let decodedToken = jwt.verify(req.headers.authorization, JWT_SECRET)
            if (decodedToken) {
                // console.log("TOKEN Authorized!", decodedToken)
                if (decodedToken._id == req.params.id) {
                    next()
                } else {
                    res.status(401).json({ message: "User Mismatch Login Again" })
                }
            }
            else {
                res.status(401).json({ message: "Unauthorized" })
            }

            //if valid say next() req.params.id
            // if moy valid say Unatuthorized
        }

    } catch (error) {
        res.status(500).json({ message: error })
    }
}

app.post("/generate_url/:id", authorize, async (req, res) => {
    try {
        if (req.body.values.url !== "") {
            const newurlShort = new urlShort({
                actualurl: req.body.values.url,
                createdBy: req.params.id
            })
            newurlShort.save().then((docs) => {
                res.send({ message: "Success ceated", urlId: docs._id })
            })
        }
    } catch (error) {
        res.status(500).json({ message: error })
    }
})

app.put("/goto/:id", async (req, res) => {
    try {
        console.log("SSSSS", req.params)
        urlShort.updateOne({ _id: req.params.id },
            {
                $inc: { clicks: 1 }
            }
        ).then((docs) => {
            console.log("SSSSS", docs)
            urlShort.findOne({ _id: req.params.id }).then((urldoc) => {
                console.log("urldoc", urldoc)
                res.send({ message: "Success redirect", urldoc: urldoc })
            })
        }).catch((err) => {
            res.status(404).json({ message: "URL NOT FOUND", error: err })
        })


    } catch (error) {
        res.status(500).json({ message: error })
    }
})

app.get("/tableData/:id", authorize, async (req, res) => {
    try {
        console.log("req.params,", req.params)
        console.log("req.query,", req.query)
        const page = req.query.page
        const docsPerPage = 10
        urlShort.find({ createdBy: req.params.id })
            .sort('-createdAt')
            .skip(page * docsPerPage)
            .limit(docsPerPage)
            .then((docs) => {
                res.send({ message: "Success", tabledocs: docs })
            })
    }
    catch (error) {
        res.status(500).json({ message: error })
    }
})
app.get("/totalTableData/:id", authorize, async (req, res) => {
    try {
        await urlShort.countDocuments({ createdBy: req.params.id }).then((docs) => {
            res.send({ message: "Success", totalDocs: docs })
        });
    } catch (error) {
        res.status(500).json({ message: error })
    }
})

app.listen(process.env.PORT || 4000, async () => {
    console.log("Server Starrted");

})