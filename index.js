const express = require('express')
const cors = require('cors')
const jwt = require('jsonwebtoken')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config()

const app = express()
const port = process.env.PORT || 5000

// middlewares
app.use(cors())
app.use(express.json())


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.ui8slz3.mongodb.net/?retryWrites=true&w=majority`;
console.log(uri);
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function run(){
    try{
        const categoryCollection = client.db('used-carDb').collection('category')
        const productsCollection = client.db('used-carDb').collection('products')
        const brandsCollection = client.db('used-carDb').collection('brands')
        const bookingsCollection = client.db('used-carDb').collection('bookings')
        const usersCollection = client.db('used-carDb').collection('users')
        // const productsCollection = client.db("used-carDb").collection("products");


        // get category :
        app.get('/category' , async(req, res)=>{
            const category = await categoryCollection.find().toArray()
            console.log(category);
            res.send(category)
        })
        

        app.get('/brands/:id', async(req,res)=>{
            const id = req.params.id;
            console.log(id);
           const query = {product_id : id}
           const products = await brandsCollection.find(query).toArray()
           
           console.log(products);
           res.send(products)   

        })

        /// get all products 
        app.get('/brands' , async(req, res)=>{
            const products = await brandsCollection.find().toArray()
            console.log(products);
            res.send(products)
        })
        
        // create user
        app.post("/users", async (req, res) => {
			const user = req.body;
			const result = await usersCollection.insertOne(user);
			res.send(result);
		});

        // get user 
        app.get('/users' , async(req,res) =>{
            const query = {};
            const users = await usersCollection.find(query).toArray()
            res.send(users)
        })

        

        // Save user email & generate JWT
    app.put('/user/:email', async (req, res) => {
        const email = req.params.email
        const user = req.body
        const filter = { email: email }
        const options = { upsert: true }
        const updateDoc = {
          $set: user,
          
        }
        const result = await usersCollection.updateOne(filter, updateDoc, options)
        console.log(result)
  
        const token = jwt.sign(user, process.env.ACCESS_SECRET_TOKEN, {
          expiresIn: '1d',
        })
        console.log(token)
        res.send({ result, token })
      })

        // booking api
		app.post("/bookings", async (req, res) => {
			const booking = req.body;
			console.log(booking);
            
			// restiction on booking
			// const query = {
			// 	appointmentDate: booking.appointmentDate,
			// 	email: booking.email,
			// 	treatment: booking.treatment,
			// };
			// const alreadyBooked = await bookingsCollection.find(query).toArray();
			// if (alreadyBooked.length) {
			// 	const message = `You already booked ${booking.appointmentDate}`;
			// 	return res.send({ acknowledged: false, message });
			// }

			//-----------------------------
			const result = await bookingsCollection.insertOne(booking);
			res.send(result);
		});

        // get booking
		app.get("/bookings",  async (req, res) => {
           
			const email = req.query.email;
            
			// // jwt verify
			// const decodedEmail = req.decoded.email;

			// if (email !== decodedEmail) {
			// 	return res.status(403).send({ message: "forbidden access" });
			// }

			const query = { email: email };
			const bookings = await bookingsCollection.find(query).toArray();
			res.send(bookings);
		});

        //add product collection create
		app.post("/products", verifyJwt, verifyAdmin, async (req, res) => {
			const doctor = req.body;
			const result = await doctorsCollection.insertOne(doctor);
			res.send(result);
		});
    }
    finally{

    }
}

run().catch(err =>console.log(err))

app.get('/' , (req,res) =>{
    res.send(' used car Server is running...')
})

app.listen(port, () => {
    console.log(`Car Server is running...on ${port}`)
  })
