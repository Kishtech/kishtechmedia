const express = require('express');
const router = express.Router();
const { ensureAuthenticated, forwardAuthenticated } = require('../config/auth');
const Post = require("../models/Post");
const User = require("../models/User");
const Img = require("../models/Img");

const multer = require("multer");



//only alowing admin to certain page using isAdmin
const isAdmin = (req, res, next) => {
    if (req.user.role === 'admin') {
      return next();
    }else{
      res.render('./noper')
    }
    
  };
//Configuration for Multer

  const murStorage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, "public");
    },
    filename: (req, file, cb) => {
      const ext = file.mimetype.split("/")[1];
      cb(null, `images/imgs/admin-${file.fieldname}-${Date.now()}.${ext}`);
    },
  });
//Calling the "multer" Function for image
const uploadImg = multer({
    storage: murStorage,
    
  });

//image upload route
// /imgs/upload route

router.get('/upload', ensureAuthenticated, (req, res) =>
  
res.render('./admin/img-upload', {
    user: req.user
  })
);



// Step 8 - the POST handler for processing the uploaded file
  
router.post('/uploadImg', uploadImg.single('img'), (req, res, next) => {
  
  var obj = {
      name: req.body.name,
      title: req.body.title,
      desc: req.body.desc,
      type: req.body.type,
      img: req.file.filename,
      user: req.user,
  }
  Img.create(obj, (err, item) => {
      if (err) {
          console.log(err);
      }
      else {
          // item.save();
          res.redirect('/forum');
      }
  });
});


//get all images
router.get('/images', ensureAuthenticated, async (req,res)=>{
    try {
        const imgs = await Img.find({type: 'active'} )
        .populate('user')
        .sort({ createdAt: 'desc'})
        
        .lean()
  
        res.render('images/images', {
            imgs,
            
            
  
        })
    } catch (err) {
        console.error(err)
        res.render('404')
    }
  })

//@desc Show single post
//@route GET /posts/id
router.get('/:id', ensureAuthenticated, async (req,res)=>{
  try {
      let img= await Img.findById(req.params.id)
    
      .populate('user')
      .lean()

      if(!img){
          return res.render('404')
      }

      if(img.user._id != img.user.id && img.type == 'draft'){
          res.render('404')
      }else{
       res.render('images/image',{
           img, 
    
       })

      }
     
      
  } catch (err) {
      console.error(err)
      return res.render('404')
      
  }
})

//@desc User Post
//@route GET /user/:userId
router.get('/users/:id', ensureAuthenticated, async (req,res)=>{
   try {
       const imgs = await Img.find({
           user: req.params.id,
           type: 'active',
       })
       .populate('user')
       .lean()
 
       res.render('images/images', {
           imgs,
       })
   } catch (err) {
       console.error(err)
       return res.render('404')
   }
 })

  //All images for admin to monitor
router.get('/imagelist', ensureAuthenticated, isAdmin, async (req,res)=>{
    try {
        const imageList = await Img.find({} )
        .populate('user')
        .sort({ createdAt: 'desc'})
        .lean()
  
        res.render('./admin/image_list', {
            imageList,
           
           
        })
    } catch (err) {
        console.error(err)
        res.render('404')
    }
  })
  
  //module exports
module.exports = router;