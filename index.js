import express from "express";
import api from './routes/index.js'
import * as dotenv from 'dotenv'
import mongoose from "mongoose";
import { MongoClient } from "mongodb";
import userRouter from "./routes/users.router.js"
import cors from "cors";
dotenv.config()

mongoose.connect(process.env.MONGODB_PATH, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  });

  const db = mongoose.connection;
  
  db.on('error', console.error.bind(console, 'Connection error:'));
  db.once('connected', () => {
    console.log('Connected to the Mongoose');
  });

const client = new MongoClient(process.env.MONGO_URL);
await client.connect();
console.log("MongoDB is Connected!!!")

const PORT = process.env.PORT || 4000
const origin = process.env.CORS_ORIGIN || 'http://localhost:5173/'

const app = express()

app.use(cors({
    origin
}));
app.use(express.json())
// app.use(express.urlencoded())

app.use(api)

app.use("/users", userRouter);

app.listen(PORT, () => {
    console.log(`Your app is running in http://localhost:${PORT}`)
})

export { client }