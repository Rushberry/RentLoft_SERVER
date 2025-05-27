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
        const users = database.collection("users");
        const payments = database.collection("payments");
        const apartments = database.collection("apartments");
        const coupons = database.collection("coupons");
        const stats = database.collection("stats");
        const announcements = database.collection("announcements");


        // All [ GET ] APIS >

        app.get('/', (req, res) => {
            res.send('Rent Loft > https://rentloft.surge.sh')
        })


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
