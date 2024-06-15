const express = require('express');
const cors = require('cors');
const app = express();
const port = process.env.PORT || 5000;
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
