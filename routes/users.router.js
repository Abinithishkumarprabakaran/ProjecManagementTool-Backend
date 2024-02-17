import express from "express";
import bcrypt from "bcrypt";
import { getUserByName, createUser, confirmEmailOTP, getUserById, checkOTP, updatePassword } from "../service/users.service.js";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";
import { totp } from 'otplib';
import Mailgen from 'mailgen';

const router = express.Router();

async function generateHashedPassword(password) {
    const NO_OF_ROUNDS = 10;
    const salt = await bcrypt.genSalt(NO_OF_ROUNDS);
    const hashedPassword = await bcrypt.hash(password, salt)
    // console.log(salt)
    // console.log(hashedPassword)
    return hashedPassword
  }

router.post("/signup", async function (request, response) {
    const { username, password } = request.body;

    const userFromDB = await getUserByName(username);

    if(userFromDB) {
        response.status(404).send({message: "Username Already Exists"})
    }
    else if(password.length < 8) {
        response.status(404).send({message: "Password Length should be more than 8 characters"})
    }
    else{
        const hashedPassword = await generateHashedPassword(password)
        const result = await createUser({
            username: username,
            password: hashedPassword
        })
        response.send(result)
    }
});

router.post("/login", async function (request, response) {
    const { username, password } = request.body;
  
    const userFromDB = await getUserByName(username);
    // console.log(userFromDB)
  
    if( !userFromDB ) {
      response.status(401).send({message: "Invalid Credentials"})
    }
    else {
      const storedDBPassword = userFromDB.password;
      const isPasswordCheck = await bcrypt.compare(password, storedDBPassword)
      // console.log(isPasswordCheck)
      if( isPasswordCheck ) {
        const token = jwt.sign({ id: userFromDB._id }, process.env.SECRET_KEY)
        // console.log(token);
        response.send({ message: 'Login successful', token: token, userId: userFromDB._id})
      }
      else {
        response.status(401).send({ message: 'Invalid Credentials' })
      }
    }
})

router.post("/confirmation", async function( request, response ) {
  const { username } = request.body

  const userFromDB = await getUserByName(username);
  console.log(userFromDB.username)

  if( !userFromDB ) {
    console.log("No user found")
    response.status(404).send({message: "User Not Found"})
  }
  else {
    const OTP = totp.generate(process.env.SECRET_KEY_FOR_RESET);
    console.log(OTP);

    const resetToken = {
      "username" : userFromDB.username,
      "userID" : userFromDB._id,
      "OTP" : OTP,
      "ExpiresIn" : new Date().getTime() + 300000,
    }
    const result = await confirmEmailOTP(resetToken)
    console.log(resetToken)
    sendOTP(username, OTP)
    response.send(result)
  }
})

router.post("/forgotpassword", async function( request, response ) {
  const { OTP } = request.body

  const checkingOTP = await checkOTP(OTP)

  if( !checkingOTP ) {
    console.log("Invalid OTP")
    response.status(401).send({message: "Invalid OTP"})
  }
  else {

    const currentTime = new Date().getTime()
    const diff = checkingOTP.ExpiresIn - currentTime

    if(diff < 0) {
      response.status(401).send({message: "Invalid OTP"})
    }
    else {
      response.send(checkingOTP)
    }
  }

})

router.put('/changepassword/:id', async function (request, response) {
  const { password, confirmPassword} = request.body;
  const {id} = request.params

  console.log(id)

  const userFromDB = await getUserById(id)

  if (password !== confirmPassword) {
    response.status(401).send({ message: "Passwords, doesn't match"})
  }
  else if(password.length < 8) {
    response.status(404).send({message: "Password Length should be more than 8 characters"})
  }
  else {
    const hashedPassword = await generateHashedPassword(password)
    const result = await updatePassword(
      id, 
      {
        username: userFromDB.username,
        password: hashedPassword
      })
    console.log(result)
    response.send(result)
  }

})

// sending mail from gmail account
const sendOTP = (username, OTP) => {

  let config = {
    service : 'gmail',
    auth : {
      user: process.env.EMAIL,
      pass : process.env.PASSWORD
    }
  }

  let transporter = nodemailer.createTransport(config)

  let MailGenerator = new Mailgen ({
    theme: "default",
    product: {
      name: 'Mailgen',
      link: 'https://mailgen.js/'
    }
  })

  let response = {
    body: {
      name: username,
      intro: "Your OTP, to change the password",
      table: {
        data: [
          {
            OTP: OTP,
            validity: '5 mins'
          }
        ]
      },
      outro: "Enjoy the Application"
    }
  }

  let mail = MailGenerator.generate(response)

  let message = {
    from: process.env.EMAIL,
    to: username,
    subject: "Your OTP",
    html: mail
  }
  console.log("Email has been sent,jolly")
  transporter.sendMail(message)

}

export default router

