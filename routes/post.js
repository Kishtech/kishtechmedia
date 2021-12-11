const express = require('express')
const router = express.Router()
const { ensureAuthenticated, forwardAuthenticated } = require('../config/auth');
const Post = require("../models/Post");
const Comments = require('../models/Comment');
const multer = require("multer");

//Configuration for Multer

const murStorage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, "public");
    },
    filename: (req, file, cb) => {
      const ext = file.mimetype.split("/")[1];
      cb(null, `images/bimages/admin-${file.fieldname}-${Date.now()}.${ext}`);
    },
  });
//Calling the "multer" Function for image
const uploadbImg = multer({
    storage: murStorage,
    
  });




//get all post

router.get('/all', ensureAuthenticated, async (req,res)=>{
    try {
        const posts = await Post.find({status: 'public'} )
        .populate('user')
        .sort({ createdAt: 'desc'})
        .lean()
  
        res.render('blog/posts', {
            posts,
            
            
  
        })
    } catch (err) {
        console.error(err)
        res.render('404')
    }
  })


//@desc Show add page
//@route GET /posts/add
router.get('/add', ensureAuthenticated, (req,res)=>{
    res.render('blog/add_post',  {
        user: req.user,
    
      })
})



//@desc Process the add form
//@route GET POST/stories
router.post('/add', ensureAuthenticated,uploadbImg.single('bimage'), async (req,res)=>{

   try {
       req.body.user = req.user.id,

       await Post.create(req.body)
       res.redirect('/forum')
       
   } catch (err) {
       console.error(err)
       res.send('error')
   }
})






//@desc Show single post
//@route GET /posts/id
router.get('/:id', ensureAuthenticated, async (req,res)=>{
   try {
       let post= await Post.findById(req.params.id)
     
       .populate('user')
       .lean()

       if(!post){
           return res.render('404')
       }

       if(post.user._id != req.user.id && post.status == 'private'){
           res.render('404')
       }else{
        res.render('blog/show',{
            post, 
     
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
// router.get('/edit/:id', ensureAuthenticated, async (req,res)=>{
//    try {
//     const post = await Post.findOne({
//         _id: req.params.id,
//     }).lean()
//     if(!post){
//         return res.render('404')
//     }
//     if (post.user != req.user.id){
//         res.redirect('/users/forum')
//     } else {
//         res.render('blog/edit', {
//             post,
//         })
//     }
       
//    } catch (err) {
//        console.error(err)
//        return res.render()
       
//    }
// })
//@desc Update story
//@route PUT /posts/:id
router.put('/:id', ensureAuthenticated, async (req,res)=>{
    try {
        let post = await Post.findById(req.params.id).lean()
    if(!post){
        return res.render('404')
    }
    if (post.user != req.user.id){
        res.redirect('/forum')
    } else {
      post = await Post.findOneAndUpdate({_id: req.params.id }, req.body, {
          new: true,
          runValidators: true
      })
      res.redirect('/forum')
        
    }
        
    } catch (err) {
        console.error(err)
        return res.render('404')
    }


})


//@desc Delete Story
//@route DELETE /posts/delete/:id

router.delete('/delete/:id', ensureAuthenticated, async (req, res)=>{
   try {
       let post = await Post.findById(req.params.id)
       .lean()

       if(!post){
           return res.render('404')

       }
       if (post.user != req.user.id){
           res.redirect('/forum')
       }else{
           
       await Post.remove({ _id: req.params.id})
       res.redirect('/forum')
       }



   } catch (err) {
       
    console.error(err)
    return res.render('404')
   }

})




//export this module

module.exports =router