const express = require('express');
const cors = require('cors');
const app = express();
const port = process.env.PORT || 5000;
const stripe = require('stripe')('sk_test_51PL3tFCkMElpXPySRd553MHA7IdXTXCwIlyTDYBb8GESWcNFL9TU8uQriDdePdwknEPXR1KGmbiC7TU01FZNknpT00TDMDKHkD');
require('dotenv').config();
var jwt = require('jsonwebtoken');
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
    const paymentCollection = client.db('VeloxDB').collection('payment');
    const forumCollection = client.db('VeloxDB').collection('forum');
    const appliedTrainerCollection = client.db('VeloxDB').collection('appliedTrainers');

    // to create jwt access token
    app.post('/jwt', async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '365d' });

      res.send({ token });
    });

    // middlewares
    const verifyToken = (req, res, next) => {
      console.log('inside verify token', req.headers.authorization);
      if (!req.headers.authorization) return res.status(401).send({ message: 'Unauthorized access' });
      const token = req.headers.authorization.split(' ')[1];
      jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) return res.status(401).send({ message: 'Unauthorized access' });
        req.decodedUser = decoded;
        next();
      });
    };

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

    // to get all users
    app.get('/users', verifyToken, async (req, res) => {
      const status = req.query?.status;
      let query = {};
      if (status) {
        query = { status: status };
      }
      const users = await userCollection.find(query).toArray();
      res.send(users);
    });

    // to get a specific user by email
    app.get('/users/:email', async (req, res) => {
      const email = req.params.email;
      const user = await userCollection.findOne({ email: email });
      res.send(user);
    });

    // to get all forum post data
    app.get('/forum', async (req, res) => {
      const sort = req.query?.sort;
      const size = parseInt(req.query?.size);

      let options = {};
      if (sort) {
        options = { sort: { createdAt: sort === 'asc' ? 1 : -1 } };
        const forum = await forumCollection.find({}, options).limit(size).toArray();
        return res.send(forum);
      }

      const forum = await forumCollection.find({}).toArray();
      res.send(forum);
    });

    // to get a specific forum post by _id
    app.get('/forum/:id', async (req, res) => {
      const id = req.params.id;
      const forum = await forumCollection.findOne({ _id: new ObjectId(id) });
      res.send(forum);
    });

    // to update a forum post with upVote
    app.put('/forum/:id/upVote', async (req, res) => {
      const id = req.params.id;
      const userEmail = req.query?.email;
      const query = { _id: new ObjectId(id) };

      let updateDoc = {};
      const forum = await forumCollection.findOne(query);
      if (forum.upVoteBy?.includes(userEmail)) {
        updateDoc = {
          $inc: { upVotes: -1 },
          $pull: { upVoteBy: userEmail },
        };
      } else if (forum.downVoteBy?.includes(userEmail)) {
        updateDoc = {
          $inc: { upVotes: 1, downVotes: -1 },
          $push: { upVoteBy: userEmail },
          $pull: { downVoteBy: userEmail },
        };
      } else {
        updateDoc = {
          $inc: { upVotes: 1 },
          $push: { upVoteBy: userEmail },
        };
      }

      const result = await forumCollection.updateOne(query, updateDoc);
      res.send(result);
    });

    // to update a forum post with down vote
    app.put('/forum/:id/downVote', async (req, res) => {
      const id = req.params.id;
      const userEmail = req.query?.email;

      const query = { _id: new ObjectId(id) };

      let updateDoc = {};
      const forum = await forumCollection.findOne(query);

      if (forum.downVoteBy?.includes(userEmail)) {
        updateDoc = {
          $inc: { downVotes: -1 },
          $pull: { downVoteBy: userEmail },
        };
      } else if (forum.upVoteBy?.includes(userEmail)) {
        updateDoc = {
          $inc: { upVotes: -1, downVotes: 1 },
          $pull: { upVoteBy: userEmail },
          $push: { downVoteBy: userEmail },
        };
      } else {
        updateDoc = {
          $inc: { downVotes: 1 },
          $push: { downVoteBy: userEmail },
        };
      }

      const result = await forumCollection.updateOne(query, updateDoc);
      res.send(result);
    });

    // to get all classes
    app.get('/classes', async (req, res) => {
      const size = parseInt(req.query?.size);
      const page = parseInt(req.query?.page) - 1;
      const sort = req.query?.sort;
      const search = req.query?.search;

      let options = {};
      if (sort) {
        options = { sort: { booking_count: sort === 'asc' ? 1 : -1 } };
        const classes = await classCollection.find({}, options).limit(6).toArray();
        return res.send(classes);
      }

      let query = {
        title: { $regex: search ?? '', $options: 'i' },
      };

      const classes = await classCollection
        .find(query, options)
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

    // to save applied-trainer data
    app.post('/applied-trainer', verifyToken, async (req, res) => {
      const requestedUser = req.body;
      const result = await appliedTrainerCollection.insertOne(requestedUser);

      const userQuery = { email: requestedUser?.email };
      const updateDoc = { $set: { status: 'Pending' } };
      await userCollection.updateOne(userQuery, updateDoc);
      res.send(result);
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

    // to get a specific trainer by email
    app.get('/trainer/:email', async (req, res) => {
      const email = req.params?.email;
      const user = await trainersCollection.findOne({ email: email });
      res.send(user);
    });

    // to delete a availableSlotDetails by _id that is inside an trainer object
    app.delete('/availableSlotDetails/:id', verifyToken, async (req, res) => {
      const id = req.params.id;
      const query = { 'availableSlotsDetails._id': new ObjectId(id) };
      const updateDoc = { $pull: { availableSlotsDetails: { _id: new ObjectId(id) } } };
      const result = await trainersCollection.updateOne(query, updateDoc);
      res.send(result);
    });

    // to get a specific trainer with specific slot selected by it's _id for booking page
    app.get('/trainer-booking/:id', async (req, res) => {
      const id = req.params.id;
      const user = await trainersCollection.findOne({ 'availableSlotsDetails._id': new ObjectId(id) });
      res.send(user);
    });

    // to add new object into a trainer data's availableSlotsDetails array
    app.put('/availableSlotDetails/:id', verifyToken, async (req, res) => {
      const id = req.params.id;
      const slot = req.body;
      const query = { _id: new ObjectId(id) };
      const updateDoc = { $push: { availableSlotsDetails: slot } };
      const result = await trainersCollection.updateOne(query, updateDoc);
      res.send(result);
    });

    // to get all testimonials data
    app.get('/testimonials', async (req, res) => {
      const testimonials = await testimonialsCollection.find().toArray();
      res.send(testimonials);
    });

    // to save a booking data
    app.post('/addToCart', verifyToken, async (req, res) => {
      const user = req.body;
      const result = await cartCollection.insertOne(user);
      res.send(result);
    });

    // to get a booking data by email
    app.get('/cart/:email', verifyToken, async (req, res) => {
      const email = req.params.email;
      if (email !== req.decodedUser.email) return res.status(403).send({ message: 'forbidden access' });
      const user = await cartCollection.findOne({ 'user.email': email });
      res.send(user);
    });

    // to get booked trainers by user email
    app.get('/booked-trainers/:email', async (req, res) => {
      const email = req.params.email;
      // if (email !== req.decodedUser.email) return res.status(403).send({ message: 'forbidden access' });
      const paidUser = await paymentCollection.find({ email }).toArray();
      const bookedTrainers = paidUser.map((item) => item.bookedTrainerId);

      // now get all the trainer objects from trainerCollection based on the _id existed in bookTrainers array
      const objectIdArray = bookedTrainers.map((id) => new ObjectId(id));
      const query = { _id: { $in: objectIdArray } };
      const trainers = await trainersCollection.find(query).toArray();
      res.send(trainers);
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

    // to save a payment data
    app.post('/payment/:email', async (req, res) => {
      const payment = req.body;
      const userEmail = req.params?.email;
      const paymentResult = await paymentCollection.insertOne(payment);

      const classQuery = { title: { $in: payment.classes } };
      const updateDoc = { $inc: { booking_count: 1 } };

      const updateResult = await classCollection.updateMany(classQuery, updateDoc);

      // delete cart item
      const query = { 'user.email': userEmail };
      const deleteResult = await cartCollection.deleteMany(query);

      res.send({ paymentResult, deleteResult, updateResult });
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
