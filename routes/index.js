const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');

const { ensureAuthenticated, forwardAuthenticated } = require('../config/auth');
const User = require('../models/User');
const Post = require("../models/Post");
const Img = require("../models/Img");
const Product = require("../models/Product");

const multer = require("multer");

const passport= require('passport')
const Json2csvParser = require("json2csv").Parser;
const fs = require('fs');

const ITEMS_PER_PAGE = 2;

//Configuration for Multer
//Configuration for Multer
const multerStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "public");
  },
  filename: (req, file, cb) => {
    const ext = file.mimetype.split("/")[1];
    cb(null, `images/admin-${file.fieldname}-${Date.now()}.${ext}`);
  },
});

//Configuration for Multer
const mStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "public");
  },
  filename: (req, file, cb) => {
    const ext = file.mimetype.split("/")[1];
    cb(null, `files/admin-${file.fieldname}-${Date.now()}.${ext}`);
  },
});






//Calling the "multer" Function for image
const upload = multer({
  storage: multerStorage,
  
});
//Calling the "multer" Function for files
const uploadf = multer({
  storage: mStorage,
  
});




//only alowing admin to certain page using isAdmin
const isAdmin = (req, res, next) => {
  if (req.user.role === 'admin') {
    return next();
  }else{
    res.render('./noper')
  }
  
};

// // Welcome Page
// router.get('/', forwardAuthenticated, (req, res) => res.render('welcome'));

router.get('/',  async (req,res)=>{
  try {

  const products = await Product.find({type: 'public'})
  .populate('user')
  .sort({ price: 'desc'})
  .limit(2)
  .lean()

  const posts = await Post.find({status: 'public'} )
  .populate('user')
  .sort({ createdAt: 'desc'})
  .limit(2)
  .lean()
  const imgs = await Img.find({type: 'active'} )
  .populate('user')
  .sort({ createdAt: 'desc'})
  .limit(2)
  .lean()

      res.render('dashboard', {
          posts,
          imgs,
          products,



          
          

      })
  } catch (err) {
      console.error(err)
      res.render('404')
  }
})


  //get all in dashboard

  router.get('/dashboard',  async (req,res)=>{
    try {

    const products = await Product.find({type: 'public'})
    .populate('user')
    .sort({ price: 'desc'})
    .limit(2)
    .lean()

    const posts = await Post.find({status: 'public'} )
    .populate('user')
    .sort({ createdAt: 'desc'})
    .limit(2)
    .lean()
    const imgs = await Img.find({type: 'active'} )
    .populate('user')
    .sort({ createdAt: 'desc'})
    .limit(2)
    .lean()
  
        res.render('dashboard', {
            posts,
            imgs,
            products,



            
            
  
        })
    } catch (err) {
        console.error(err)
        res.render('404')
    }
  })

// Welcome Page
router.get('/welcome', forwardAuthenticated, (req, res) => res.render('welcome'));

// Dashboard
// router.get('/dashboard', ensureAuthenticated, (req, res) =>
//   res.render('dashboard', {
//     user: req.user,

//   })
// );



//404 page
router.get('/404', ensureAuthenticated, (req, res) =>
  res.render('404', {
    user: req.user,

  })
);




// Chats
router.get('/chats', ensureAuthenticated, (req, res) =>
  res.render('chats', {
    user: req.user
  })
);




// @route   GET /Forum page
router.get('/forum', ensureAuthenticated, async (req, res) => {
  try {
    const posts = await Post.find({ user: req.user.id }).lean()
    res.render('blog/forum', {
      user: req.user,
      posts,
    })
  } catch (err) {
    console.error(err)
    res.render('404')
  }
})


// User create a project
router.get('/cproject', ensureAuthenticated, (req, res) =>
  res.render('cproject', {
    user: req.user
  })
);

// User work on a project
router.get('/dproject', ensureAuthenticated, (req, res) =>
  
res.render('dproject', {
    user: req.user
  })
);

// IT Support
router.get('/itSupport', ensureAuthenticated, (req, res) =>
  res.render('itSupport', {
    user: req.user
  })
);

// Admin page
router.get('/admin', isAdmin, ensureAuthenticated, (req, res) =>
  res.render('./admin/admin', {
    user: req.user
  })
);




//users List
router.get('/userlist', ensureAuthenticated, isAdmin, async (req,res)=>{
  try {
      const userList = await User.find({} )
      .populate('user')
      .sort({ createdAt: 'desc'})
      .lean()

      res.render('./admin/userList', {
          userList,
         
         
      })
  } catch (err) {
      console.error(err)
      res.render('404')
  }
})


//requests page
router.get('/requests', isAdmin, ensureAuthenticated, (req, res) =>  {
  User.find({}, function(err, users) {
      res.render('./admin/request', {
          userList: users,
          
          
      })
  })
});
//view users CV page

router.get('/requests/:id', isAdmin, ensureAuthenticated,  (req, res) => {
  let searchQuery = { _id: req.params.id };
 User.findOne(searchQuery , function(err, user) {
     res.render('./admin/view', {
       user: user,
       
         
     })
 })
})




// Admin add new user
router.get('/add-user', isAdmin, ensureAuthenticated, (req, res) =>
  res.render('./admin/add-user')
);




//New User by admin
router.post('/add-user',isAdmin,  upload.single("image"), (req, res) => {
  const { fname, lname, email, password, password2, role, image } = req.body;
  let errors = [];

  if (!fname || !lname || !email || !password || !password2 ) {
    errors.push({ msg: 'Please enter all fields' });
  }

  if (password != password2) {
    errors.push({ msg: 'Passwords do not match' });
  }

  if (password.length < 6) {
    errors.push({ msg: 'Password must be at least 6 characters' });
  }

  if (errors.length > 0) {
    res.render('./admin/add-user', {
      errors,
      fname,
      lname,
      email,
      password,
      password2,
      role,
      image,
     
    });
  } else {
    User.findOne({ email: email }).then(user => {
      if (user) {
        errors.push({ msg: 'Email already exists' });
        res.render('./admin/add-user', {
          errors,
          fname,
          lname,
          email,
          password,
          password2,
          role,
          image,
        });
      } else {
        const newUser = new User({
          fname: req.body.fname,
          lname: req.body.lname,
          email: req.body.email,
          password: req.body.password,
          role: req.body.role,
          image: req.file.filename,
        });

        bcrypt.genSalt(10, (err, salt) => {
          bcrypt.hash(newUser.password, salt, (err, hash) => {
            if (err) throw err;
            newUser.password = hash;
            newUser
              .save()
              .then(user => {




                res.render('./admin/success');
              })

              
              .catch(err => console.log(err));
          });
        });
      }
    });
  }
});
//admin update user Profile route
router.get('/update/:id', isAdmin,  (req, res) => {
   let searchQuery = { _id: req.params.id };
  User.findOne(searchQuery , function(err, user) {
      res.render('./admin/update_user', {
        user: user,
        
          
      })
  })
})

//user update profile view
router.get('/update', (req, res) => {
  let searchQuery = { _id: req.params.id };
 User.findOne(searchQuery , function(err, user) {
     res.render('update_profile', {
       user: req.user,
       
         
     })
 })
} );

//user  profile view
router.get('/profile', (req, res) => {
  let searchQuery = { _id: req.params.id };
 User.findOne(searchQuery , function(err, user) {
     res.render('myprofile', {
       user: req.user,
       
         
     })
 })
} );

//update profile by user
router.post('/update-profile/:id', upload.single("image") , (req, res) => {
  let searchQuery = { _id: req.params.id };
 User.findOneAndUpdate(searchQuery , {
    
  fname: req.body.fname,
  lname: req.body.lname,
  image: req.file.filename,
 

}, function(err, user) {
     res.render('success')
 })
} );

//upload file by user
router.post('/uploadFile/:id', uploadf.single("file"), (req, res) => {
  let searchQuery = { _id: req.params.id };
 User.findOneAndUpdate(searchQuery , {
    
  file: req.file.filename,

 

}, function(err, user) {
     res.render('./tasks/workerdash')
 })
} );

//update profile by admin
//post
router.post('/update-user', isAdmin,  (req, res) => {
  let searchQuery = { _id: req.params.id };
 User.findOneAndUpdate(searchQuery , {
    
  fname: req.body.fname,
  lname: req.body.lname,
  email: req.body.email,
  role: req.body.role,

 

}, function(err, user) {
     res.render('./admin/success')
 })
} );




router.get('/success', (req,res)=>{
  res.render('success')
});


//admin del user Profile route
router.get('/delete-user/:id', isAdmin,  (req, res) => {
  let searchQuery = { _id: req.params.id };
 User.findOne(searchQuery , function(err, user) {
     res.render('./admin/del', {
       user: user,
       
         
     })
 })
})

//del user


//delete user data
router.post("/del-usr/:id", isAdmin,  (req, res) => {
  let searchQuery = { _id: req.params.id };

  User
    .deleteOne(searchQuery)
    .then((User) => {
     
      res.render("./admin/success");
    })

});


//upload file by user
router.post('/users/uploadFile', uploadf.single("file"), (req, res) => {
  let searchQuery = { _id: req.params.id };
 User.findOneAndUpdate(searchQuery , {
    
  file: req.body.file,

 

}, function(err, user) {
     res.render('success')
 })
} );

router.get('/export/csv', async (req, res) => {
  await User.find({}).lean().exec((err, data) => {
      if (err) throw err;
      const csvFields = ['_id', 'fname', 'lname']
      console.log(csvFields);
      const json2csvParser = new Json2csvParser({
          csvFields
      });
      const csvData = json2csvParser.parse(data);
      fs.writeFile("mongodb_fs.csv", csvData, function(error) {
          if (error) throw error;
          console.log("Write to mongodb_fs.csv successfully!");
      });
      res.render('success')
  });
});



//@desc User Post
//@route GET /user/:userId
router.get('/users/:id', ensureAuthenticated, async (req,res)=>{
  try {
      const posts = await Post.find({
          user: req.params.id,
          status: 'public',
      })
      .populate('user')
      .lean()

      res.render('blog/posts', {
          posts,
      })
  } catch (err) {
      console.error(err)
      return res.render('404')
  }
})


//@desc Show edit page
//@route GET /posts/edit/:id
router.get('/edit/:id', ensureAuthenticated, async (req,res)=>{
  try {
   const post = await Post.findOne({
       _id: req.params.id,
   }).lean()
   if(!post){
       return res.render('404')
   }
   if (post.user != req.user.id){
       res.redirect('/users/forum')
   } else {
       res.render('blog/edit', {
           post,
       })
   }
      
  } catch (err) {
      console.error(err)
      return res.render()
      
  }
})





module.exports = router;
