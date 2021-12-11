const express = require('express');
const expressLayouts = require('express-ejs-layouts');
const mongoose = require('mongoose');
const passport = require('passport');
const dotenv= require('dotenv')
const flash = require('connect-flash');
const session = require('express-session');
const MongoStore = require('connect-mongo')(session)
const path = require('path')
const methodOverride = require('method-override')
const multer = require("multer");
const morgan= require('morgan')
const connectDB= require('./config/db')




const app = express();


require('./config/validation')();
//load config
dotenv.config({path: './config/config.env'})

//logging
if(process.env.NODE_ENV === 'development'){
  app.use(morgan('dev'))
}


// Passport Config
require('./config/passport')(passport);


//DB connection
connectDB()



// EJS
app.use(expressLayouts);
app.set('view engine', 'ejs');
app.use('/', express.static(path.join(__dirname, '/public')))
app.use('/imgs', express.static(path.join(__dirname, '/public')))
app.use('/posts', express.static(path.join(__dirname, '/public')))
app.use('/markets', express.static(path.join(__dirname, '/public')))
app.use('/imgs/users', express.static(path.join(__dirname, '/public')))
app.use('/posts/users', express.static(path.join(__dirname, '/public')))

app.set("views", path.join(__dirname, "views"));
app.use(methodOverride("_method"));
// Express body parser
app.use(express.urlencoded({ extended: true }));

// Express session
app.use(
  session({
    secret: 'secret',
    resave: true,
    saveUninitialized: true,
    store: new MongoStore({
      mongooseConnection: mongoose.connection
    })

  })
);

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

//Set global var which allows us to use user in other tenpletes 
app.use(function (req, res, next){
  res.locals.user = req.user || null
  next()
})


// Connect flash
app.use(flash());

// Global variables
app.use(function(req, res, next) {
  res.locals.success_msg = req.flash('success_msg');
  res.locals.error_msg = req.flash('error_msg');
  res.locals.error = req.flash('error');
  next();
});

// Method override
app.use(
  methodOverride(function (req, res) {
    if (req.body && typeof req.body === 'object' && '_method' in req.body) {
      // look in urlencoded POST bodies and delete it
      let method = req.body._method
      delete req.body._method
      return method
    }
  })
)



// Routes
app.use('/', require('./routes/index.js'));
app.use('/users', require('./routes/users.js'));
app.use('/auth', require('./routes/users.js'));
app.use('/posts', require('./routes/post.js'));
app.use('/imgs', require('./routes/img.js'));
app.use('/markets', require('./routes/market.js'));




const PORT = process.env.PORT || 8000;

app.listen(PORT, console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`))