// Import packages
const express = require('express');
const style = require('cli-color');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const validator = require('validator');
const session = require('express-session');
const mongoDbSesson = require('connect-mongodb-session')(session);

// File imports
const { cleanUpAndValiDate } = require('./utils/AuthUtils');
const userSchema = require('./userSchema');
const {isAuth} = require('./middlewares/AuthMiddleware')

// Variable
const app = express();
const PORT = 5000;
const saltRound = 12;
const MONGO_URI = `mongodb+srv://mohdTalib:talib12345@cluster0.abqujwr.mongodb.net/november-todo-app`


// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }))

// Set EJS as template engine 
app.set('view engine', 'ejs');

// Mongodb connection
const promise = mongoose.connect(MONGO_URI);
promise.then(() => {
    console.log(style.bgGreen.black.underline("MongoDb database connected."));
}).catch((error) => {
    console.log(style.red.underline.bgWhite(error));
})

// Give the location of collection in mongodb atlas
const store = new mongoDbSesson({
    uri: MONGO_URI,
    collection : "sessions"
})

// Middleware function for session authentication
app.use(
    session({
        secret: "This is Todo application.",
        resave: false,
        saveUninitialized : false,
        store : store
    })
)

// Routes
app.get("/register", (req, res) => {
    return res.render(__dirname + "/views/register");
})

app.get("/login", (req, res) => {
    return res.render(__dirname + "/views/login");
})

app.get("/", (req, res) => {
    return res.send("This is your Todo App");
})

// MVC --> MODEL VIEW CONTROLLER
app.post('/register', async (req, res) => {
    console.log(req.body);
    const { name, email, password, username } = req.body;


    // Data validation
    try {
        await cleanUpAndValiDate({ name, email, username, password });

        // Check if the user alreday exist or not

        const userExistEmail = await userSchema.findOne({ email: email });
        if (userExistEmail) {
            return res.send({
                status: 400,
                message: "Email already exist.",
            });
        }

        const userExistUsername = await userSchema.findOne({ userName: username });
        if (userExistUsername) {
            return res.send({
                status: 400,
                message: "Username already exist.",
            });
        }

        // Hash the password using bcrypt
        const hashPassword = await bcrypt.hash(password, saltRound);

        const user = new userSchema({
            name: name,
            email: email,
            userName: username,
            // password: password
            password: hashPassword
        });

        // Save into database
        try {
            const userDb = await user.save();
            return res.send({
                status: 201,
                message: "User register successfully.",
                data: userDb,
            })
        } catch (error) {
            return res.send({
                status: 500,
                message: "Database error.",
                error: error,
            })
        }
    } catch (error) {
        console.log(error);
        return res.send({
            status: 400,
            message: "Data Invalid",
            error: error,
        });
    }

})

app.post('/login', async (req, res) => {
    const { loginId, password } = req.body;
    // Identify the user creadintials in database
    try {
        let userDb;
        if (validator.isEmail(loginId)) {
            userDb = await userSchema.findOne({ email: loginId });
        } else {
            userDb = await userSchema.findOne({ userName :  loginId});  
        }

        //  If user is not exist
        if (userDb == undefined) {
            return res.send({
                status: 400,
                message: "User not found. Please register first."
            })
        }


        // Match the user password in database.
        const isMatch = await bcrypt.compare(password, userDb.password);

        // If password does not match
        if (!isMatch) {
            return res.send({
                status: 400,
                message: "Password does not match."
            })
        }

        // Save the session id into the mongodb database
        req.session.isAuth = true;
        req.session.user = {
            name : userDb.name,
            email : userDb.email,
            userId : userDb._id
        }

        return res.send({
            status: 200,
            mesaage: "Login Successfully."
        })
    } catch (error) {
        return res.send({
            status: 500,
            mesaage: "Database error.",
            error: error
        })
    }
})

app.get('/dashboard', isAuth, (req, res) =>{
    return res.send('Restricted Data');
})

app.listen(PORT, () => {
    console.log(style.blue.bold.underline(`Server started at port http://localhost:${PORT}`))
})

