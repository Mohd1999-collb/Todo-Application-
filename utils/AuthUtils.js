const validator = require('validator');

const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const SECRET_KEY = "This is march nodejs class";

const cleanUpAndValiDate = ({ name, email, username, password }) => {
    const promise = new Promise((resolve, reject) => {

        if (!email || !password || !name || !username) {
            reject("Missing credentials");
        }

        if (typeof email !== "string") {
            reject("Invalid Email");
        }
        if (typeof username !== "string") {
            reject("Invalid userName");
        }
        if (typeof password !== "string") {
            reject("Invalid password");
        }

        if (username.length <= 2 || username.length > 50)
            reject("userName length should be 3-50");

        if (password.length <= 2 || password.length > 25)
            reject("Password length should be 3-25");

        if (!validator.isEmail(email)) {
            reject("Invalid Email format");
        }
        resolve();
    })
    return promise;
}


const genrateJWTToken = (email)=>{
    const JWT_TOKEN = jwt.sign(email, SECRET_KEY);
    return JWT_TOKEN;
}

const sendVerficiationToken = ({ email, verificationToken }) => {
    //nodemailer
    const transpoter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      service: "Gmail",
      auth: {
        user: "mohdsidd7232@gmail.com",
        pass: "vlnd ilvw pdrp kfef",
      },
    });
  
    const mailOptions = {
      from: "Todo App pvt lt",
      to: email,
      subject: "Email verfication for Todo App",
      html: `Click <a href="http://localhost:5000/api/${verificationToken}">Here!!</a>`,
    };
  
    transpoter.sendMail(mailOptions, function (err, response) {
      if (err) throw err;
      console.log("Mail sent succeessfully");
    });
  };
  
module.exports = { cleanUpAndValiDate, genrateJWTToken, sendVerficiationToken }