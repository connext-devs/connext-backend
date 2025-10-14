const express = require('express');
const morgan = require('morgan');
const cors = require('cors')
require('dotenv').config()

//prereq imports
const {connectDB} = require('./src/config/db')
const {router} = require('./src/routes/index.route') 

//server
const server = require('./server')
const app = express();


//CORS configurations
const corsOptions = {
    origin: true,
methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}

//middlewares
app.use(cors(corsOptions))
app.use(express.json());
app.use(morgan('dev'))

//db
connectDB()

//routings
app.use(router)


app.get('/' ,(req,res) => {
    res.json({"Test":"Hello from the backend"})
})



//server
server

module.exports = {app}