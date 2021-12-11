const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const passport = require('passport');
// Load User model
const User = require('../models/User');
// const Img = require("../models/Img");

const { forwardAuthenticated } = require('../config/auth');



// Login Page
router.get('/users/login', forwardAuthenticated, (req, res) => res.render('login'));

// Register Page
router.get('/users/register', forwardAuthenticated, (req, res) => res.render('register'));

//forum
router.get('/users/forum', forwardAuthenticated, (req, res) => res.render('blog/forum'));

//chats
router.get('/users/chats', forwardAuthenticated, (req, res) => res.render('chats'));

//Users submit project
router.get('/users/cproject', forwardAuthenticated, (req, res) => res.render('cproject'));

//User Start to work
router.get('/users/dproject', forwardAuthenticated, (req, res) => res.render('dproject'));

//User Ask for simple IT help
router.get('/users/dproject', forwardAuthenticated, (req, res) => res.render('dproject'));

// Register
router.post('/users/register', (req, res) => {
  const { fname, lname, email, password, password2, file} = req.body;
  let errors = [];

  if (!fname || !lname || !email || !password || !password2) {
    errors.push({ msg: 'Please enter all fields' });
  }

  if (password != password2) {
    errors.push({ msg: 'Passwords do not match' });
  }

  if (password.length < 6) {
    errors.push({ msg: 'Password must be at least 6 characters' });
  }

  if (errors.length > 0) {
    res.render('register', {
      errors,
      fname,
      lname,
      email,
      password,
      password2
    });
  } else {
    User.findOne({ email: email }).then(user => {
      if (user) {
        errors.push({ msg: 'Email already exists' });
        res.render('register', {
          errors,
          fname,
          lname,
          email,
          password,
          password2
        });
      } else {
        const newUser = new User({
          fname,
          lname,
          email,
          password,
          file
        });

        bcrypt.genSalt(10, (err, salt) => {
          bcrypt.hash(newUser.password, salt, (err, hash) => {
            if (err) throw err;
            newUser.password = hash;
            newUser
              .save()
              .then(user => {
                req.flash(
                  'success_msg',
                  'You are now registered and can log in'
                );
                res.redirect('/users/users/login');
              })
              .catch(err => console.log(err));
          });
        });
      }
    });
  }
});

// Login
router.post('/users/login', (req, res, next) => {
  passport.authenticate('local', {
    
    successRedirect: '/dashboard',
    
    failureRedirect: '/users/users/login',
    failureFlash: true
  })(req, res, next);
});

//@desc auth with google
//@route GET /auth/google
router.get('/google', passport.authenticate('google', { scope: ['profile']}))

//@desc Google auth callback
//@route GET/ auth/google/callback
//if there is failure in login then it redirects to the login page

router.get('/google/callback', passport.authenticate('google', {failureRedirect: '/users/users/login'}), 
(req, res)=>{
    res.redirect('/dashboard')
})



// Logout
router.get('/users/logout', (req, res) => {
  req.logout();
  req.flash('success_msg', 'You are logged out');
  res.redirect('/dashboard');
});


//update user
router.put('/users/admin/update-user/:id', (req, res)=>{
  let searchQuery = { _id: req.params.id };
	User.updateOne(searchQuery,
		{
			$set:{
        fname: req.body.fname,
        lname: req.body.lname,
        email: req.body.email,

			}
		}
	);
	res.redirect('/success')
});





module.exports = router;
