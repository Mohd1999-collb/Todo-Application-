// Import packages
const express = require('express');
const style = require('cli-color');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const validator = require('validator');
const session = require('express-session');
const mongoDbSesson = require('connect-mongodb-session')(session);
const jwt = require('jsonwebtoken')

// File imports
const { cleanUpAndValiDate, genrateJWTToken, sendVerficiationToken } = require('./utils/AuthUtils');
const userSchema = require('./userSchema');
const { isAuth } = require('./middlewares/AuthMiddleware')
// const sessionModel = require('./sessionSchema');
const todoModel = require('./models/todoModel');
const { rateLimiting } = require('./middlewares/RateLimitingMiddleware')

// Variable
const app = express();
const PORT = 5000;
const saltRound = 12;
const MONGO_URI = `mongodb+srv://mohdTalib:talib12345@cluster0.abqujwr.mongodb.net/november-todo-app`


// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }))
app.use(express.static("public"));

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
    collection: "sessions"
})

// Middleware function for session authentication
app.use(
    session({
        secret: "This is Todo application.",
        resave: false,
        saveUninitialized: false,
        store: store
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
    // console.log(req.body);
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
            // Call to Genrate JWT Token function
            const verificationToken = genrateJWTToken(email);
            // Call to send mail function 
            sendVerficiationToken({email, verificationToken})
            return res.send({
                status: 201,
                message: "Registeration Successfull, Link has been sent to your registered email id. Please verify before login",
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

// Email verification api
app.get("/api/:token", (req, res) => {
    console.log(req.params);
    const token = req.params.token;
    const SECRET_KEY = "This is march nodejs class";
  
    jwt.verify(token, SECRET_KEY, async (err, decoded) => {
      try {
        const userDb = await userSchema.findOneAndUpdate(
          { email: decoded },
          { emailAuthenticated: true }
        );
        console.log(userDb);
  
        return res.status(200).redirect("/login");
      } catch (error) {
        res.send({
          status: 500,
          message: "database error",
          error: error,
        });
      }
    });
  });

app.post('/login', async (req, res) => {
    const { loginId, password } = req.body;
    // Identify the user creadintials in database
    try {
        let userDb;
        if (validator.isEmail(loginId)) {
            userDb = await userSchema.findOne({ email: loginId });
        } else {
            userDb = await userSchema.findOne({ userName: loginId });
        }

        //  If user is not exist
        if (userDb == undefined) {
            return res.send({
                status: 400,
                message: "User not found. Please register first."
            })
        }


        // Check user email is authenticated or not
        if (userDb.emailAuthenticated === false) {
            return res.send({
              status: 400,
              message: "Email not authenticated",
            });
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
            userName: userDb.userName,
            email: userDb.email,
            userId: userDb._id
        }

        // return res.send({
        //     status: 200,
        //     mesaage: "Login Successfully."
        // })
        return res.redirect("/dashboard");
    } catch (error) {
        return res.send({
            status: 500,
            mesaage: "Database error.",
            error: error
        })
    }
})

app.get('/dashboard', isAuth, async (req, res) => {
    // return res.send('Restricted Data');
    // return res.render(__dirname + "/views/dashboard");
    const userName = req.session.user.userName;
    try {
        const todos = await todoModel.find({
            userName: userName
        });
        // console.log(todos, "line 195")
        return res.render("dashboard", { todos: todos });
        // return res.send({
        //     status: 201,
        //     message: "Todos read success.",
        //     data: todos
        // })

    } catch (error) {
        return res.send({
            status: 500,
            message: "Database error.",
            error: error
        })
    }


    console.log(userName, "line 190");
    return res.send("dashboard");
})


app.post('/logout', isAuth, (req, res) => {
    req.session.destroy((error) => {
        if (error) {
            throw error;
        } else {
            return res.redirect('/login');
        }
    })
})


app.post('/logout_from_all_devices', isAuth, async (req, res) => {
    // console.log(req.session);
    const username = req.session.user.userName;
    //create a session schema
    const Schema = mongoose.Schema;
    const sessionSchema = new Schema({ _id: String }, { strict: false });
    const sessionModel = mongoose.model("session", sessionSchema);

    try {
        const deleteCount = await sessionModel.deleteMany({
            "session.user.userName": username
        });
        return res.send({
            status: 200,
            message: "Log out from all devices successfully."
        })
    } catch (error) {
        return res.send({
            status: 500,
            message: 'Log out failed.',
            error: error
        })
    }
})

// Todo's API's

// Todo create Api
app.post('/create-item', isAuth, rateLimiting, async (req, res) => {
    const todoText = req.body.todo;

    //data validation
    if (!todoText) {
        return res.send({
            status: 400,
            message: "Todo is Empty",
        });
    }

    if (typeof todoText !== "string") {
        return res.send({
            status: 400,
            message: "Invalid Todo format",
        });
    }

    if (todoText.length > 100) {
        return res.send({
            status: 400,
            message: "Todo is too long, should be less than 100 char.",
        });
    }

    // Store the value inside todo model
    const todo = new todoModel({
        todo: todoText,
        userName: req.session.user.userName
    });


    try {
        const todoDb = await todo.save();
        return res.send(
            {
                status: 201,
                message: "Todo created successfully.",
                data: todoDb
            }
        )
    } catch (error) {
        return res.send({
            status: 500,
            message: "Database error",
            error: error
        })
    }
})


// Todo update Api
app.put("/edit-item", isAuth, async (req, res) => {
    const { id, newData } = req.body;
    //data validation
    if (!id || !newData) {
        return res.send({
            status: 400,
            message: "Missing credentials",
        });
    }
    if (typeof newData !== "string") {
        return res.send({
            status: 400,
            message: "Invalid Todo format",
        });
    }

    if (newData.length > 100) {
        return res.send({
            status: 400,
            message: "Todo is too long, should be less than 100 char.",
        });
    }

    try {
        // It return the previous data value
        const todoDb = await todoModel.findOneAndUpdate(
            { _id: id },
            { todo: newData }
        )
        console.log(todoDb, "line 339 app.js")
        return res.send({
            status: 201,
            message: "Todo updated successfully",
            data: todoDb
        })
    } catch (error) {
        return res.send({
            status: 500,
            message: "Database error.",
            error: error
        });
    }
})

// Todo delete Api
app.delete('/delete-item', isAuth, async (req, res) => {
    const { id } = req.body;
    try {
        const todoDb = await todoModel.findOneAndDelete({
            _id: id
        });
        return res.send({
            status: 200,
            message: "Todo deleted successfully.",
            data: todoDb
        })
    } catch (error) {
        return res.send({
            status: 500,
            message: "Database error.",
            error: error
        })
    }
})


// Read todo
app.get('/read-todo', async (req, res) => {
    // console.log(req.session);
    const userName = req.session.user.userName;


    try {
        const todos = await todoModel.find({ userName: userName });
        // console.log(todos);

        if (todos.length === 0) {
            return res.send({
                status: 400,
                message: "Todo is empty, Please create some.",
            });
        } else {

            return res.send({
                status: 200,
                message: "Todos read Success",
                data: todos,
            });
        }
    } catch (error) {
        return res.send({
            status: 500,
            message: "Database error",
            error: error,
        });
    }
})


// Pagination Api's
app.get('/pagination-dashboard', isAuth, async (req, res) => {
    const skip = req.query.skip || 0; // client
    const LIMIT = 5; // Backend
    const userName = req.session.user.userName;

    try {
        const todos = await todoModel.aggregate([
            // Match, pagination
            { $match: { userName: userName } },
            {
                $facet: {
                    data: [{ $skip: parseInt(skip) }, { $limit: LIMIT }]
                },
            },
        ]);
        // console.log(todos[0].data, "line 423 app.js")
        return res.send({
            status: 200,
            message: "Read success",
            data: todos[0].data,
        })
    } catch (error) {
        return res.send({
            status: 500,
            message: "Database error.",
            error: error
        })
    }
})

app.listen(PORT, () => {
    console.log(style.blue.bold.underline(`Server started at port http://localhost:${PORT}`))
})

