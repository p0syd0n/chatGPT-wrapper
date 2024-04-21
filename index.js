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
const colors = require('colors/safe');

const { error } = require('console');
const moment = require('moment');
const { exec } = require('child_process');

// Defining constants
const api_key = process.env.API_KEY
const port = process.env.PORT;
const app = express();
const server = http.createServer(app);
const io = new Server(server);

//database stuff
const DB_USERNAME = process.env.DB_USERNAME;
const DB_PASSWORD = process.env.DB_PASSWORD;
const DB_HOST = process.env.DB_HOST;

const pool = mysql.createPool({
  connectionLimit: 100,
  database: "GPTwrapper",
  user: DB_USERNAME,
  password: DB_PASSWORD,
  host: DB_HOST
});

// Helper functions

function printError(data) {
    console.log(colors.red.bold(data));
}

function currentDate() {
  const now = new Date();
  now.setHours(0, 0, 0, 0); // Set the time to 00:00:00.000
  return now.getTime(); // Convert to epoch time
}

const hasMoreThanAMonthPassed = (epoch1, epoch2) => Math.max(0, (new Date(epoch2).getFullYear() - new Date(epoch1).getFullYear()) * 12 + new Date(epoch2).getMonth() - new Date(epoch1).getMonth()) > 1;


// ChatGPT api functions

async function getContent(query) {
  const url = 'https://api.openai.com/v1/chat/completions';
  const headers = new Headers({
      'Content-Type': 'application/json',
      'Authorization': `Bearer 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`
  });

  const body = JSON.stringify({
      "model": "gpt-3.5-turbo",
      "messages": [{role: "system", content: "You are a helpful assistant."}, {role: "user", content: query}],
      "temperature": 0.7
  });

  try {
      const response = await fetch(url, {
          method: 'POST',
          headers: headers,
          body: body
      });

      if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      let responseContent = data['choices'][0]['message']['content'];
      return responseContent;
  } catch (error) {
      console.log('Error while fetching content: \n ', error);
      return 'Error fetching content';
  }
}

// Security + Database functions

async function argonHash(password) {
    try {
      const hash = await argon2.hash(password);
      return hash;
    } catch (err) {
      error("ERROR HASHING: " + err);
    }
  }

  const executeSQL = (sqlQuery) => {
    return new Promise((resolve, reject) => {
      pool.query(sqlQuery, (error, results) => {
        if (error) {
          reject(error);
        } else {
          resolve(results);
        }
      });
    });
  };

  async function addUser(username, password, first_name, last_name, last_paid, admin) {
    if (typeof last_paid != "number") {
        try {
            last_paid = moment(last_paid, 'DD/MM/YYYY').startOf('day').unix();
        } catch (err) {
            printError (`Error encountered converting last_paid to unix timestamp while adding a user. Error: \n ${err}`);
        }
    }

    const hashedPassword = await argonHash(password);

    const response = await executeSQL(`INSERT INTO users (username, password, first_name, last_name, last_paid, admin) VALUES ('${username}', '${hashedPassword}', '${first_name}', '${last_name}', '${last_paid}', ${admin})`);
    return response;
  }

  async function getUsers() {
    const response = await executeSQL('SELECT * FROM users;');
    return response;
  }
  

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
        if (req.session.admin) {
          res.render('main_admin');
          return;
        }
        res.render('main');
        return;
    } else {
        res.redirect('/login');
        return;
    }
});

app.get('/login', (req, res) => {
    res.render('login');
});

app.get('/payment_due', (req, res) => {
  res.render('payment_due');
});

app.post('/executeLogin', async (req, res) => {
    const { username, password } = req.body;
    const users = await getUsers();
    for (let user of users) {
        if (user.username == username && argon2.verify(user.password, password)) {
          if (hasMoreThanAMonthPassed(currentDate, user.last_paid)) {
            res.redirect('/payment_due');
            return;
          }
          req.session.username = user.username;
          req.session.first_name = user.first_name;
          req.session.last_name = user.last_name;
          req.session.last_paid = user.last_paid;
          req.session.admin = req.session.admin;
          console.log(`Sucessful login by ${first_name} (${username})`);
          res.redirect('/');
          return;
        }
    }
    
    
})


// Starting server on port
app.listen(port, async () => {
   // const response = await addUser('user', 'user', 'john', 'smith', '14/04/2024', false);
    //console.log(response);
    console.log(`Server listening on port ${port}`)
})