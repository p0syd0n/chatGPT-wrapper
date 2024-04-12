// 20.120.56.11
// https://glowing-orbit-9rrvv6vjjjjc9x9g-3000.app.github.dev/
// Installing packages (server, environmental variable package)
const express = require('express');
const dotenv = require('dotenv').config();
const http = require('http');
const path = require('path');
const expressSocketIO = require('express-socket.io-session')
const { Server } = require('socket.io')
const session = require('express-session');
const argon2 = require('argon2');
const mysql = require('mysql2');

// Defining constants
const port = process.env.port;
const app = express();
const server = http.createServer(app);
const io = new Server(server);

//database stuff
const DB_USERNAME = process.env.DB_USERNAME;
const DB_PASSWORD = process.env.DB_PASSWORD;
const DB_HOST = process.env.DB_HOST;
const DB_PORT = process.env.DB_PORT;

const pool = mysql.createPool({
  connectionLimit: 100,
  database: "atlantic",
  user: DB_USERNAME,
  password: DB_PASSWORD,
  host: DB_HOST
});

// Server configurations
const sessionMiddleware = session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    proxy: true,
    cookie: {
      secure: true, // required for cookies to work on HTTPS
      httpOnly: false,
      sameSite: 'strict'
    }
  });
  
  app.use(sessionMiddleware);
  io.use(expressSocketIO(sessionMiddleware));
  app.use(express.urlencoded({ extended: true }));
  app.use(express.json());
  app.set('views', path.join(__dirname, 'public', 'views'));
  app.set('view engine', 'ejs');
  app.use(express.static(path.join(__dirname, 'public')));
  app.set("trust proxy", 1);

// Routes
app.get('/', (req, res) => {
    if (req.session.username) {
        res.render('main');
    } else {
        res.redirect('/login');
    }
});

app.get('/login', (req, res) => {
    res.render('login');
});

app.get('/executeLogin', (req, res) => {
    if (req.method != 'POST') {
        res.sendStatus(400);
        return;
    }
    const { username, password } = req.body;
    const users;
    
    
})


// Starting server on port
app.listen(port, () => {
console.log(`Server listening on port ${port}`)
})