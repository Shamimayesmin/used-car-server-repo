const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();

const app = express();
const port = process.env.PORT || 5000;

// stripe key
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

// middlewares
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.ui8slz3.mongodb.net/?retryWrites=true&w=majority`;
console.log(uri);
const client = new MongoClient(uri, {
	useNewUrlParser: true,
	useUnifiedTopology: true,
	serverApi: ServerApiVersion.v1,
});

// jwt function
function verifyJwt(req, res, next) {
	const authHeader = req.headers.authorization;
	console.log(authHeader);
	if (!authHeader) {
		return res.status(401).send("unauthorized access");
	}
	const token = authHeader.split(" ")[1];

	jwt.verify(token, process.env.ACCESS_SECRET_TOKEN, function (err, decoded) {
		console.log({err,decoded});
		if (err) {
			return res.status(403).send({ message: "forbidden access" });
		}
		req.decoded = decoded;
		next();
	});
}

async function run() {
	try {
		const categoryCollection = client.db("used-carDb").collection("category");
		const productsCollection = client.db("used-carDb").collection("products");
		const brandsCollection = client.db("used-carDb").collection("brands");
		const bookingsCollection = client.db("used-carDb").collection("bookings");
		const usersCollection = client.db("used-carDb").collection("users");

		const paymentCollection = client.db("used-carDb").collection("payments");

		// verifyAdmin function

		const verifyAdmin = async (req, res, next) => {
			const decodedEmail = req.decoded.email;
			const query = { email: decodedEmail };
			const user = await usersCollection.findOne(query);
			if (user?.role !== "admin") {
				return res.status(403).send({ message: "forbidden access" });
			}
			next();
		};

		// jwt token
		app.get("/jwt", async (req, res) => {
			const email = req.query.email;
			const query = { email: email };
			const user = await usersCollection.findOne(query);
			if (user) {
				const token = jwt.sign({ email }, process.env.ACCESS_SECRET_TOKEN, {
					expiresIn: "8d",
				});
				return res.send({ usedcarToken: token });
			}
			// console.log(user);
			res.status(403).send({ usedcarToken: "" });
		});

		// get category :
		app.get("/category", async (req, res) => {
			const category = await categoryCollection.find().toArray();
			// console.log(category);
			res.send(category);
		});

		app.get("/brands/:id", async (req, res) => {
			const id = req.params.id;
			console.log(id);
			const query = { product_id: id };
			const products = await brandsCollection.find(query).toArray();

			console.log(products);
			res.send(products);
		});

		/// get all products
		app.get("/brands", async (req, res) => {
			const products = await brandsCollection.find().toArray();
			console.log(products);
			res.send(products);
		});

		// create user
		app.post("/users", async (req, res) => {
			const user = req.body;
			const result = await usersCollection.insertOne(user);
			res.send(result);
		});

		// get user
		app.get("/users", async (req, res) => {
			const query = {};
			const users = await usersCollection.find(query).toArray();
			res.send(users);
		});


		// booking api
		app.post("/bookings", async (req, res) => {
			const booking = req.body;
			console.log(booking);


			// // restiction on booking
			// const query = {
				
			// 	email: booking.email,
			// 	productName: booking.productName,
			// };
			// const alreadyBooked = await bookingsCollection.find(query).toArray();
			// if (alreadyBooked.length) {
			// 	const message = `You already booked ${booking.productName}`;
			// 	return res.send({ acknowledged: false, message });
			// }
			
			//-----------------------------
			const result = await bookingsCollection.insertOne(booking);
			res.send(result);
		});

		// get booking
		app.get("/bookings", verifyJwt, async (req, res) => {
			const email = req.query.email;

			// jwt verify
			const decodedEmail = req.decoded.email;
			console.log(decodedEmail,email);
			if (email !== decodedEmail) {
				return res.status(403).send({ message: "forbidden access" });
			}

			const query = { email: email };
			const bookings = await bookingsCollection.find(query).toArray();
			res.send(bookings);
		});

		//add product collection create
		app.post("/products", async (req, res) => {
			const product = req.body;
			const result = await productsCollection.insertOne(product);
			res.send(result);
		});

		// load all products data
		app.get("/products", async (req, res) => {
			const query = {};
			const product = await productsCollection.find(query).toArray();
			res.send(product);
		});

		// add products name :
		app.get("/productName", async (req, res) => {
			const query = {};
			const result = await categoryCollection
				.find(query)
				.project({ brand: 1 })
				.toArray();
			res.send(result);
		});


		// delete myproduct
		app.delete("/products/:id", async (req, res) => {
			const id = req.params.id;
			const filter = { _id: ObjectId(id) };
			const result = await productsCollection.deleteOne(filter);
			res.send(result);
		});

		//get products with advertise field
        app.get('/advertise', async (req, res) => {
            const query = {
                advertise: "true",
                status: 'available'
            }
            const result = await brandsCollection.find(query).toArray();
            res.send(result);
        })

		//update field for advertise
        app.put('/products/:id', async (req, res) => {
            const id = req.params.id;
            const filter = {
                _id: ObjectId(id)
            }
            const options = { upsert: true };
            const updatedDoc = {
                $set: {
                    advertise: "true"
                }
            }
            const result = await productsCollection.updateOne(filter, updatedDoc, options);
            res.send(result);
        })
		// user role
		app.get("/users/:role", async (req, res) => {
			const buyer = req.params.role;
			const query = { role: buyer };
			const user = await usersCollection.find(query).toArray();
			console.log(user.role);
			res.send(user);
		});
		app.get("/users/:role", async (req, res) => {
			const seller = req.params.role;
			const query = { role: seller };
			const user = await usersCollection.find(query).toArray();
			console.log(user.role);
			res.send(user);
		});
		app.get("/users/:role", async (req, res) => {
			const admin = req.params.role;
			const query = { role: admin };
			const user = await usersCollection.find(query).toArray();
			console.log(user.role);
			res.send(user);
		});

		// delete buyer and seller
		app.delete("/users/:id", async (req, res) => {
			const id = req.params.id;
			const filter = { _id: ObjectId(id) };
			const result = await usersCollection.deleteOne(filter);
			res.send(result);
		});
		// delete myorder 
		app.delete("/bookings/:id", async (req, res) => {
			const id = req.params.id;
			const filter = { _id: ObjectId(id) };
			const result = await bookingsCollection.deleteOne(filter);
			res.send(result);
		});


		//get verified sellers
        app.get('/verifiedSeller', async (req, res) => {
            const email = req.query.email;
            const query = {
                verifyStatus: true,
                email: email
            }
            const result = await usersCollection.findOne(query);
            res.send(result);
        })

		//update seller verification status
        // app.put('/sellers/:id', async (req, res) => {
        //     const id = req.params.id;
        //     const filter = {
        //         _id: ObjectId(id)
        //     }
        //     const options = { upsert: true };
        //     const updatedDoc = {
        //         $set: {
        //             verifyStatus: true
        //         }
        //     }
        //     const result = await usersCollection.updateOne(filter, updatedDoc, options);
        //     res.send(result);
        // })

		// verify user :
		app.put("/users/seller/:id", async (req, res) => {
			
			//admin or not
			// const decodedEmail = req.decoded.email;
			// const query = {email : decodedEmail}
			// const user = await usersCollection.findOne(query)
			// if(user.role === 'seller'){
			//     return res.status(403).send({message : 'forbidden access'})
			// }

			const id = req.params.id;
			console.log(id);
			const filter = { _id: ObjectId(id) };
			const options = { upsert: true };
			const updatedDoc = {
				$set: {
					verifyStatus: true
				},
			};
			const result = await usersCollection.updateOne(
				filter,
				updatedDoc,
				options
			);
			res.send(result);
		});



		// check admin
		app.get("/users/admin/:email", async (req, res) => {
			const email = req.params.email;
			const query = { email };
			const user = await usersCollection.findOne(query);
			res.send({ isAdmin: user?.role === "admin" });
		});

		// check seller
		app.get("/users/seller/:email", async (req, res) => {
			const email = req.params.email;
			const query = { email };
			const user = await usersCollection.findOne(query);
			res.send({ isSeller: user?.role === "seller" });
		});

		// check buyer
		app.get("/users/buyer/:email", async (req, res) => {
			const email = req.params.email;
			const query = { email };
			const user = await usersCollection.findOne(query);
			res.send({ isBuyer: user?.role === "buyer" });
		});

		// payment for specific(id) booking
		app.get("/bookings/:id", async (req, res) => {
			const id = req.params.id;
			const query = { _id: ObjectId(id) };
			const booking = await bookingsCollection.findOne(query);
			res.send(booking);
		});

		//payment api
		app.post("/create-payment-intent", async (req, res) => {
			const booking = req.body;
			const price = booking.price;
			const amount = price * 100;

			// Create a PaymentIntent with the order amount and currency
			const paymentIntent = await stripe.paymentIntents.create({
				amount: amount,
				currency: "usd",
				payment_method_types: ["card"],
			});

			res.send({
				clientSecret: paymentIntent.client_secret,
			});
		});

		// payment post
		app.post("/payments", async (req, res) => {
			const payment = req.body;
			const result = await paymentCollection.insertOne(payment);
			const id = payment.bookingId;
			const filter = { _id: ObjectId(id) };
			const updatedDoc = {
				$set: {
					paid: true,
					transactionId: payment.transactionId,
				},
			};
			const updateResult = await bookingsCollection.updateOne(
				filter,
				updatedDoc
			);
			res.send(result);
		});





	} finally {
	}
}

run().catch((err) => console.log(err));

app.get("/", (req, res) => {
	res.send(" used car Server is running...");
});

app.listen(port, () => {
	console.log(`Car Server is running...on ${port}`);
});
