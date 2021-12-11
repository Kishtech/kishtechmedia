const express = require('express')
const router = express.Router()
const { ensureAuthenticated, forwardAuthenticated } = require('../config/auth');
const Post = require("../models/Post");
const Img = require("../models/Img");
const User = require("../models/User");
const Product = require("../models/Product");
const Order = require("../models/Order");
const multer = require("multer");
const stripe = require('stripe')('sk_test_51JvexoHTlAF53iyafW8p3CiwXBRGjmJ4JrkRPJ1AnrjRHg4EPTpLt7jz3ESzuDUY67CxZ6r1OD64RHTadS88d2jL001P4DV8CV');

const fs = require('fs');
const path = require('path');

const PDFDocument = require('pdfkit');



//only alowing admin to certain page using isAdmin
const isAdmin = (req, res, next) => {
    if (req.user.role === 'admin') {
      return next();
    }else{
      res.render('./noper')
    }
    
  };

//Configuration for Multer

const mulStorage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, "public");
    },
    filename: (req, file, cb) => {
      const ext = file.mimetype.split("/")[1];
      cb(null, `images/market/admin-${file.fieldname}-${Date.now()}.${ext}`);
    },
  });
//Calling the "multer" Function for image
const upldImg = multer({
    storage: mulStorage,
    
  });


//market home
router.get('/home', ensureAuthenticated, (req, res) =>
  res.render('./market/home', {
    user: req.user
  })
);
//add product page
router.get('/add-product',isAdmin, ensureAuthenticated, (req, res, next) =>
res.render('./market/add-product', {
    pageTitle: 'Add Product',
    path: '/markets/add-product',
    editing: false,
    hasError: false,
    errorMessage: null,
    validationErrors: []
})
)
//post product
router.post('/add-prdct', isAdmin, upldImg.single('pimage'), (req, res, next) => {
  
    var obj = {
        
        title: req.body.title,
        description: req.body.description,
        type: req.body.type,
        price: req.body.price,
        pimage: req.file.filename,
        user: req.user,
    }
    Product.create(obj, (err, item) => {
        if (err) {
            console.log(err);
        }
        else {
            // item.save();
            res.render('market/home');
        }
    });
  });
//@desc Show edit page
//@route GET /posts/edit/:id
router.get('/edit/:id', isAdmin,ensureAuthenticated, async (req,res)=>{
    try {
     const product = await Product.findOne({
         _id: req.params.id,
     }).lean()
     if(!product){
         return res.render('404')
     }
     if (product.user != req.user.id){
         res.redirect('/markets/products')
     } else {
         res.render('market/edit-product', {
             product,
         })
     }
        
    } catch (err) {
        console.error(err)
        return res.render()
        
    }
  })

  //@desc Update product
//@route PUT 
router.put('/update/:id', ensureAuthenticated,  async (req,res)=>{
    try {
        let product = await Product.findById(req.params.id).lean()
    if(!product){
        return res.render('404')
    }
    if (product.user != req.user.id){
        res.redirect('/markets/products')
    } else {
      product = await Product.findOneAndUpdate({_id: req.params.id }, req.body, {
          new: true,
          runValidators: true
      })
      res.redirect('/markets/products')
        
    }
        
    } catch (err) {
        console.error(err)
        return res.render('404')
    }


})
  

 
//get all products
router.get('/products', ensureAuthenticated, async (req,res, next)=>{
    try {
       
    let totalItems;
    Product.find({type: 'public'})
    .countDocuments()
    .then(numProducts => {
        totalItems = numProducts;
        return Product.find()
          
    })
    .then(products => {
        res.render('market/product-list', {
            prods: products,
            pageTitle: 'All Products',

        });
    })
    } catch (err) {
        console.error(err)
        res.render('404')
    }
  })

     //cart (always get cart before post)
     router.get('/carts', ensureAuthenticated, async (req,res, next)=>{
        try {
            req.user
            .populate('cart.items.productId')
            .execPopulate() // populate itself does not return a promise
            .then(user => {
                const products = user.cart.items;
                res.render('market/cart', {
                   
                   
                    products: products
                });
            })
          
        } catch (err) {
            console.error(err)
            res.render('404')
        }
      })


//delete cart
router.post('/cart-delete-item', ensureAuthenticated, async (req,res, next)=>{
    try {
        const prodId = req.body.productId;
        req.user
            .removeFromCart(prodId)
            .then(user => {
                const products = user.cart.items;
                res.render('market/cart', {
                   
                   
                    products: products
                })
            })
    } catch (err) {
        console.error(err)
        res.render('404')
    }
  })

  
  //get checkout
  router.get('/checkout', ensureAuthenticated, async (req,res, next)=>{
    try {
        req.user
        .populate('cart.items.productId')
        .execPopulate() // populate itself does not return a promise
        .then(user => {
            const products = user.cart.items;
            let total = 0;
            products.forEach(p => {
                total += p.quantity * p.productId.price;
            });
            res.render('market/checkout', {

                products: products,
                totalSum: total
            });
        })
    } catch (err) {
        console.error(err)
        res.render('404')
    }
  })


    //get products by id
router.get('/:productId', ensureAuthenticated, async (req,res, next)=>{
    try {
        const prodId = req.params.productId;
        // findById() can accept a string and Mongoose will
        // automatically convert it to an Object Id
        Product.findById(prodId)
            .then(product => {
                res.render('market/product', { 
                    product: product,
                    pageTitle: product.title,
                    path: '/products'
                });
            })
    } catch (err) {
        console.error(err)
        res.render('404')
    }
  })


 
//post orders
router.post('/new/create-order', ensureAuthenticated, async (req,res, next)=>{
    try {
        
const token = req.body.stripeToken;
let totalSum = 0;

req.user
    .populate('cart.items.productId')
    .execPopulate() // populate itself does not return a promise
    .then(user => {
        user.cart.items.forEach(p => {
            totalSum += p.quantity * p.productId.price;
        });
        const products = user.cart.items.map(i => {
            return { quantity: i.quantity, product: { ...i.productId._doc } };
        });
        const order = new Order({
            user: {
                email: req.user.email,
                userId: req.user    // Mongoose will pick the id
            },
            products: products
        });
        return order.save();
    })
    .then(result => {
        const charge = stripe.charges.create({
            amount: totalSum * 100,
            currency: 'usd',
            description: 'Your Order',
            source: token,
            metadata: { order_id: result._id.toString() }
        });
        return req.user.clearCart();
    })
    .then(() => {
        res.redirect('/markets/orders/orders');
    })
    } catch (err) {
        console.error(err)
        res.render('404')
    }
  })

//  get orders
router.get('/orders/orders', ensureAuthenticated, async (req,res, next)=>{
    try {
        Order.find({ "user.userId": req.user._id })
        .then(orders => {
            res.render('market/orders', {
                orders: orders
            });
        })
    } catch (err) {
        console.error(err)
        res.render('404')
    }
  })

  
//   router.get('/orders/:orderId', isAuth, shopController.getInvoice);


//  get orders
router.get('/orders/:orderId', ensureAuthenticated, async (req,res, next)=>{
    try {
          const orderId = req.params.orderId;
    Order.findById(orderId)
        .then(order => {
            if (!order) {
                return next(new Error('No order found'));
            }
            if (order.user.userId.toString() !== req.user._id.toString()) {
                return next(new Error('Unauthorized'));
            }
            const invoiceName = 'invoice-' + orderId + '.pdf';
            const invoicePath = path.join('data', 'invoices', invoiceName);

            const pdfDoc = new PDFDocument();
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', 'inline; filename="' + invoiceName + '"'); // replace inline with attachment for download
            // pipe into a writable stream
            pdfDoc.pipe(fs.createWriteStream(invoicePath));
            pdfDoc.pipe(res);

            pdfDoc.fontSize(26).text('Invoice', {
                underline: true
            });
            pdfDoc.fontSize(14).text('--------------------------');
            let totalPrice = 0;
            order.products.forEach(prod => {
                totalPrice += prod.quantity * prod.product.price;
                pdfDoc.fontSize(14).text(
                    prod.product.title +
                    ' - ' +
                    prod.quantity +
                    ' x ' +
                    '$' +
                    prod.product.price
                );
            });
            pdfDoc.text('--------------------------');
            pdfDoc.fontSize(20).text('Total Price: $' + totalPrice);

            pdfDoc.end();

            // reads the entire content into memory and returns it into the response
            // (for bigger files) may take long time to send a response + may overflow in memory
            /*
            fs.readFile(invoicePath, (err, data) => {
                if (err) {
                    return next(err);
                }
                res.setHeader('Content-Type', 'application/pdf');
                res.setHeader('Content-Disposition', 'inline; filename="' + invoiceName + '"');
                res.send(data);
            });
            */
           
            // const file = fs.createReadStream(invoicePath);
            // res.setHeader('Content-Disposition', 'inline; filename="' + invoiceName + '"');
            // pipe forwards the data that is read in with that stream to the response
            // the response object is actually a writable stream
            // no need to preload the whole data into the memory as before
            // file.pipe(res);
        })
    } catch (err) {
        console.error(err)
        res.render('404')
    }
  })





//post product to cart
router.post('/cart', ensureAuthenticated, async (req,res, next)=>{
    try {
        const prodId = req.body.productId;
        Product.findById(prodId)
            .then(product => {
                return req.user.addToCart(product);
            })
            .then(result => {
                res.redirect('/markets/products');
            })
    } catch (err) {
        console.error(err)
        res.render('404')
    }
  })








  //module exports
  module.exports = router;