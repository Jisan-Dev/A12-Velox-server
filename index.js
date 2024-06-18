const express = require('express');
const cors = require('cors');
const app = express();
const port = process.env.PORT || 5000;
const stripe = require('stripe')('sk_test_51PL3tFCkMElpXPySRd553MHA7IdXTXCwIlyTDYBb8GESWcNFL9TU8uQriDdePdwknEPXR1KGmbiC7TU01FZNknpT00TDMDKHkD');
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.chn7ebi.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

app.use(cors());
app.use(express.json());

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});
async function run() {
  try {
    const userCollection = client.db('VeloxDB').collection('users');
    const classCollection = client.db('VeloxDB').collection('class');
    const trainersCollection = client.db('VeloxDB').collection('trainers');
    const testimonialsCollection = client.db('VeloxDB').collection('testimonials');
    const cartCollection = client.db('VeloxDB').collection('cart');

    // to save a user data
    app.post('/users', async (req, res) => {
      const user = req.body;
      const isExist = await userCollection.findOne({ email: user.email });
      if (isExist) {
        return res.send({ message: 'user already exists', insertedId: null });
      }
      const result = await userCollection.insertOne(user);
      res.send(result);
    });

    // to get all classes
    app.get('/classes', async (req, res) => {
      const size = parseInt(req.query?.size);
      const page = parseInt(req.query?.page) - 1;
      const search = req.query?.search;

      let query = {
        title: { $regex: search, $options: 'i' },
      };

      const classes = await classCollection
        .find(query)
        .skip(size * page)
        .limit(size)
        .toArray();
      res.send(classes);
    });

    // to get all classes count
    app.get('/classes-count', async (req, res) => {
      const search = req.query?.search;

      let query = {
        title: { $regex: search, $options: 'i' },
      };

      const classes = await classCollection.countDocuments(query);
      res.send({ count: classes });
    });

    // to get all the trainers data
    app.get('/trainers', async (req, res) => {
      const size = req.query?.size;

      let query = trainersCollection.find();

      if (size) {
        query = trainersCollection.find().limit(parseInt(size));
      }

      const trainers = await query.toArray();
      res.send(trainers);
    });

    // to get a specific trainer by _id
    app.get('/trainers/:id', async (req, res) => {
      const id = req.params.id;
      const user = await trainersCollection.findOne({ _id: new ObjectId(id) });
      res.send(user);
    });

    // to get a specific trainer with specific slot selected by it's _id for booking page
    app.get('/trainer-booking/:id', async (req, res) => {
      const id = req.params.id;
      const user = await trainersCollection.findOne({ 'availableSlotsDetails._id': new ObjectId(id) });
      res.send(user);
    });

    // to get all testimonials data
    app.get('/testimonials', async (req, res) => {
      const testimonials = await testimonialsCollection.find().toArray();
      res.send(testimonials);
    });

    // to save a booking data
    app.post('/addToCart', async (req, res) => {
      const user = req.body;
      const result = await cartCollection.insertOne(user);
      res.send(result);
    });

    // to get a booking data by email
    app.get('/cart/:email', async (req, res) => {
      const email = req.params.email;
      const user = await cartCollection.findOne({ 'user.email': email });
      res.send(user);
    });

    // Payment Intent
    app.post('/create-payment-intent', async (req, res) => {
      const { price } = req.body;
      const floatedPrice = parseFloat(price).toFixed(2);
      const amount = parseInt(floatedPrice * 100);
      console.log(amount, 'amount inside intent');

      // Create a PaymentIntent with the order amount and currency
      const paymentIntent = await stripe.paymentIntents.create({
        amount,
        currency: 'usd',
        payment_method_types: ['card'],
      });

      res.send({ clientSecret: paymentIntent.client_secret });
    });

    // Send a ping to confirm a successful connection
    await client.db('admin').command({ ping: 1 });
    console.log('Pinged your deployment. You successfully connected to MongoDB!');
  } finally {
  }
}
run().catch(console.dir);

app.get('/', (req, res) => {
  res.send('Hello World from Velox!');
});

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`);
});
