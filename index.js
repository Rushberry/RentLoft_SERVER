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
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

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

        app.get('/coupons', async (req, res) => {
            const result = await couponsBase.find().toArray()
            res.send(result)
        })

        app.get('/apartments', async (req, res) => {
            const result = await apartmentsBase.find().toArray()
            res.send(result)
        })

        app.get('/users', async (req, res) => {     // Admin
            const result = await usersBase.find().toArray()
            res.send(result)
        })

        app.get('/apartmentRent', async (req, res) => { //Member + Admin
            const result = await apartmentRentBase.find().toArray()
            res.send(result)
        })

        app.get('/announcements', async (req, res) => {
            const result = await announcementsBase.find().toArray()
            res.send(result)
        })

        // All [ POST ] APIS >
        app.post('/addUser', async (req, res) => {
            const response = req.body;
            const result = await usersBase.insertOne(response)
            res.send(result)
        })

        app.post('/announcements', async (req, res) => { //Admin
            const response = req.body;
            const result = await announcementsBase.insertOne(response)
            res.send(result)
        })

        app.post('/coupons', async (req, res) => { //Admin
            const response = req.body;
            const result = await couponsBase.insertOne(response)
            res.send(result)
        })

        app.post('/checkRole', async (req, res) => {
            const response = req.body;
            const email = req.body.email;
            // console.log(email)
            const user = await usersBase.findOne({ email: email });
            const data = { role: user?.role }
            res.send(data)
        })

        app.post('/apartmentRent', async (req, res) => {
            const response = req.body;
            const email = req.body.email;
            console.log(email)
            const existing = await apartmentRentBase.findOne({ email: email });
            // console.log(existing)
            if (existing) {
                return res.send({ message: 'You’ve already applied for an apartment.' });
            }
            const result = await apartmentRentBase.insertOne(response);
            res.send({ message: 'Apartment application submitted successfully.', result });
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
        app.patch('/updateCouponActive/:id', async (req, res) => { //Admin
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) }
            const options = { upsert: true }
            const updateCoupon = { $set: { status: "active" } }
            const result = await couponsBase.updateOne(filter, updateCoupon, options)
            res.send(result)
        })
        app.patch('/updateCouponInactive/:id', async (req, res) => { //Admin
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) }
            const options = { upsert: true }
            const updateCoupon = { $set: { status: "inactive" } }
            const result = await couponsBase.updateOne(filter, updateCoupon, options)
            res.send(result)
        })
        app.patch('/accept', async (req, res) => { //Admin
            const response = req.body;
            const id = response.id;
            const email = response.email;
            const filter = { _id: new ObjectId(id) }
            const updateCoupon = { $set: { status: "checked", approval: true } }
            const result1 = await apartmentRentBase.updateOne(filter, updateCoupon)
            const cursor = { email: email }
            const userUpdate = { $set: { role: 'member' } }
            const result2 = await usersBase.updateOne(cursor, userUpdate)
            res.send({ message: 'Apartment Request Accepted & Changed User to Member', result1, result2 })
        })
        app.patch('/reject', async (req, res) => { //Admin
            const response = req.body;
            const id = response.id;
            const filter = { _id: new ObjectId(id) }
            const updateCoupon = { $set: { status: "checked", approval: false } }
            const result = await apartmentRentBase.updateOne(filter, updateCoupon)
            res.send({ message: 'Apartment Request Accepted & Changed User to Member', result })
        })
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
