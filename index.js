require("dotenv").config();
const express = require('express')
const cors = require('cors')
const jwt = require('jsonwebtoken')
const app = express()
const port = process.env.PORT || 2008

// Middlewares
app.use(cors({
    origin: ['http://localhost:5173', 'https://rentloft.surge.sh'],
    credentials: true
}))
app.use(express.json())

// MongoDB
const { MongoClient, ServerApiVersion } = require('mongodb');

const username = process.env.DB_USER;
const password = process.env.DB_PASS;
const secret = process.env.SECRET_TOKEN;

const uri = `mongodb+srv://${username}:${password}@user-management-server.kivdz.mongodb.net/?retryWrites=true&w=majority&appName=User-Management-Server`;

const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        // await client.connect();
        const database = client.db("RentLoftDB");
        const usersBase = database.collection("users");
        const paymentsBase = database.collection("payments");
        const apartmentsBase = database.collection("apartments");
        const apartmentRentBase = database.collection("apartmentRent");
        const couponsBase = database.collection("coupons");
        const statsBase = database.collection("stats");
        const announcementsBase = database.collection("announcements");

        // All [ GET ] APIS >
        app.get('/', (req, res) => {
            res.send('Rent Loft > https://rentloft.surge.sh')
        })

        app.get('/coupons', async (req, res) => {  //Public
            const result = await couponsBase.find().toArray()
            res.send(result)
        })

        app.get('/apartments', async (req, res) => {
            const result = await apartmentsBase.find().toArray()
            res.send(result)
        })

        app.get('/users', async (req, res) => {
            const result = await usersBase.find().toArray()
            res.send(result)
        })

        // All [ POST ] APIS >
        app.post('/addUser', async (req, res) => {
            const response = req.body;
            const result = await usersBase.insertOne(response)
            res.send(result)
        })

        app.post('/apartmentPrice', async (req, res) => { 
            const min = parseInt(req.body.min);
            const max = parseInt(req.body.max);

            const query = {
                rent: { $gte: min, $lte: max }
            };

            const result = await apartmentsBase.find(query).toArray();
            res.send(result);
        })
        // All [ PATCH ] APIS >
        // All [ PUT ] APIS >
        // All [ DELETE ] APIS >

        await client.db("admin").command({ ping: 1 });  // Need to comment this part before deployment
        console.log("Connected to MongoDB!");  // Need to comment this part before deployment
    } finally {
        // await client.close();
    }
}
run().catch(console.dir);

app.listen(port, () => {
    console.log(`Server is running on Port > ${port}`)
})
