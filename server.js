const express = require('express');
const mysql = require('mysql');
const bodyParser = require('body-parser');
const cors = require('cors');

var jwt = require('jsonwebtoken');
const { authenticateJWT } = require('./auth');
const stripe = require("stripe")("sk_test_51HrL86AnmICYgk9ZISxo5dw3KJL48IsccgZW5SWKDNaYqg38cLQ2caEBRGt8Qs3qJWdrtV0mUPR62sX2ZFIQChzd00hPfjomTK");
const uuid = require("uuid/v4");
//Create connection

const db = mysql.createConnection({
    host: 'localhost',
    user: 'Sainama',
    password: 'Password123@',
    database: 'singulart'
});

//Connect

db.connect((err) => {
    if (err) {
        throw err;
    } 
    console.log('Mysql connected.');
})

const app = express();



app.use(cors());


app.use(bodyParser.json());
app.use(express.json());

var token_secret = '82e4e438a0705fabf61f9854e3b575af'



app.get('/',(req, res) => {
    let sql = 'SELECT * FROM User;';
    db.query(sql, (err, result) =>{
        if (err) throw err;
        res.send(result);
    })
});

app.get('/artworks',(req,res) => {
    let sql = 'SELECT * FROM Gallery NATURAL JOIN (SELECT * FROM Artwork INNER JOIN User ON Artwork.artist_id = User.user_id) AS T;';
    db.query(sql, (err,result) => {
        if (err) throw err;
        res.send(result);
    })
})

app.get('/artworks/:id',(req,res) =>
{
    let sql = `SELECT * FROM Gallery NATURAL JOIN (SELECT * FROM Artwork INNER JOIN User ON Artwork.artist_id = User.user_id) AS T WHERE art_id=${req.params.id};`;
    db.query(sql,(err,result)=>{
        if (err) throw err;
        res.send(result);
    })
    
})

app.get('/getArtists', (req,res) => {
    let sql = 'SELECT * FROM Artist NATURAL JOIN User';
    db.query(sql, (err,result) => {
        if (err) throw err;
        res.send(result);
    })
})

app.get('/getArtists/:id', (req,res) => {
    let sql = `SELECT * FROM Artist NATURAL JOIN User where user_id = ${req.params.id};`;
    db.query(sql, (err,result) => {
        if (err) throw err;
        res.send(result);
    })
})

app.get('/artworks/:id',(req,res)=> {
    let sql= `SELECT * FROM Artwork NATURAL JOIN Gallery WHERE User_id=${req.params.id};`;
    db.query(sql,(err,result)=> {
        if (err) throw err;
        res.send(result)
    })
})

app.post('/signin', (req,res,next) => {

    var email = req.body.email;
    var password = req.body.password

    if (email && password) {
        let sql = `SELECT * FROM User WHERE email = ? AND password = ?;`;
        let query = db.query(sql,[email, password], (err,result) => {
            if (err) throw err;
            if (result.length>0) {
                res.json({
                    email
                });
            } else {
                var Err = new Error("Incorrect Email and/or Password !")
                Err.status = 401;
                return next(Err)
            }
        });
    } else {
        res.send('Please fill both the fields')
    }
})

app.post('/signup', (req, res, next) => {
    var email = req.body.email;
    var contact = req.body.contact;
    var password = req.body.password;
    var name = req.body.name;
    var city= req.body.city;
    var pin= req.body.pin;

    let sql = `INSERT INTO User (email,contact_no,password,username) VALUES ('${email}','${contact}', '${password}','${name}');`;
    db.query(sql,(err,result) => {
        if (err) throw err;
        let sql = `SELECT user_id FROM User WHERE email = '${email}';`;
        db.query(sql,(err,result)=>{
            if (err) throw err;
            var uid=result[0].user_id;
            let sql =`INSERT INTO Customer (user_id,place,zipcode) VALUES ('${uid}','${city}','${pin}');`;
            db.query(sql,(err,result)=>
            {
                if (err) throw err;
                console.log(result)
                res.send(result)
            })
        })
        
    })
})

app.post('/signup/artist', (req, res, next) => {
    var email = req.body.email;
    var contact = req.body.contact;
    var password = req.body.password;
    var name = req.body.name;
    var speciality= req.body.speciality;

    let sql = `INSERT INTO User (email,contact_no,password,username) VALUES ('${email}','${contact}', '${password}','${name}');`;
    db.query(sql,(err,result) => {
        if (err) throw err;
        let sql = `SELECT user_id FROM User WHERE email = '${email}';`;
        db.query(sql,(err,result)=>{
            if (err) throw err;
            var uid=result[0].user_id;
            let sql =`INSERT INTO Artist (user_id,speciality) VALUES ('${uid}','${speciality}');`;
            db.query(sql,(err,result)=>
            {
                if (err) throw err;
                console.log(result)
                res.send(result)
            })
        })
        
    })
})
app.post('/addtocart', (req, res, next) => {
    var email = req.body.email;
    var id = req.body.id;

    console.log(email, id);

    let sql = `SELECT user_id FROM User WHERE email = '${email}';`;
    console.log(sql);
    db.query(sql,(err, result) => {
        if (err) throw err;
        console.log(result);
        var uid = result[0].user_id;
        let sql = `INSERT INTO buys (customer_id, art_id, order_id) VALUES (${uid}, ${id}, CONCAT('OD','${uid}','${id}'));`;
        db.query(sql,(err, result) => {
            if (err) throw err; 
            let sql =`DELETE FROM Gallery where art_id= ${id};`;
            db.query(sql,(err,result)=>{
            if (err) throw err;
            res.send(result);
            })
        })
    })

    
})

///Payment_method
app.post("/checkout", async (req, res) => {
    console.log("Request:", req.body);
  
    let error;
    let status;
    try {
      const { product, token } = req.body;
  
      const customer = await stripe.customers.create({
        email: token.email,
        source: token.id
      });
  
      const idempotency_key = uuid();
      const charge = await stripe.charges.create(
        {
          amount: product.price,
          currency: "inr",
          customer: customer.id,
          receipt_email: token.email,
          description: `Purchased the ${product.name}`,
          shipping: {
            name: token.card.name,
            address: {
              line1: token.card.address_line1,
              line2: token.card.address_line2,
              city: token.card.address_city,
              country: token.card.address_country,
              postal_code: token.card.address_zip
            }
          }
        },
        {
          idempotency_key
        }
      );
      console.log("Charge:", { charge });
      status = "success";
    } catch (error) {
      console.error("Error:", error);getArtists
      status = "failure";
    }
  
    res.json({ error, status });
  });
  


app.get('/main', (req,res) => {
    // console.log('In main *** ', req.get('set-cookie'));
    res.send({loggedIn:1});    
})

app.listen('8000', () => {
    console.log('Server started on port 8000...')
})


//The Sketch of the popular Marvel charachter IronMan (Robert downy jr)
//This is a Digital Artwork illustrating a Dog
//The Recreation of the World Famous Painting Made by Leonardo-da-vincii  "The Mona LIsa". 
//The Beautiful Illustration of Nature .This artwork will definitly give you good vibes.  