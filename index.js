require("dotenv").config();
const express = require('express')
const cors = require('cors')
const jwt = require('jsonwebtoken')
const app = express()
const stripe = require("stripe")(process.env.STRIPE_SECRET);
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

        // JWT API & MIDDLEWARE >
        app.post('/jwt', async (req, res) => {
            const user = req.body;
            const token = jwt.sign(user, process.env.SECRET_TOKEN, { expiresIn: '1h' });
            res.send({ token });
        })

        const verifyToken = (req, res, next) => {
            // console.log('inside verify token', req.headers.authorization);
            if (!req.headers.authorization) {
                return res.status(401).send({ message: 'unauthorized access' });
            }
            const token = req.headers.authorization;
            jwt.verify(token, process.env.SECRET_TOKEN, (err, decoded) => {
                if (err) {
                    return res.status(401).send({ message: 'unauthorized access' })
                }
                req.decoded = decoded;
                next();
            })
        }

        const verifyAdmin = async (req, res, next) => {
            const email = req.decoded.email;

            const query = { email: email };
            const user = await usersBase.findOne(query);
            const isAdmin = user?.role === 'admin';
            if (!isAdmin) {
                return res.status(403).send({ message: 'forbidden access' });
            }
            next();
        }

        const verifyMember = async (req, res, next) => {
            const email = req.decoded.email;
            const query = { email: email };
            const user = await usersBase.findOne(query);
            const isAdmin = user?.role === 'member';
            if (!isAdmin) {
                return res.status(403).send({ message: 'forbidden access' });
            }
            next();
        }

        const verifyAdminOrMember = async (req, res, next) => {
            const email = req.decoded.email;
            const query = { email: email };
            const user = await usersBase.findOne(query);
            const isAdmin = user?.role === 'admin';
            const isMember = user?.role === 'member';
            if (!isAdmin && !isMember) {
                return res.status(403).send({ message: 'forbidden access' });
            }
            next();
        }


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

        app.get('/users', verifyToken, verifyAdmin, async (req, res) => {     // Admin
            const result = await usersBase.find().toArray()
            res.send(result)
        })

        app.get('/user', verifyToken, verifyAdmin, async (req, res) => {     // Admin
            const filter = { role: 'user' }
            const result = await usersBase.find(filter).toArray()
            res.send(result)
        })

        app.get('/members', verifyToken, verifyAdmin, async (req, res) => {     // Admin
            const filter = { role: 'member' }
            const result = await usersBase.find(filter).toArray()
            res.send(result)
        })

        app.get('/admins', verifyToken, verifyAdmin, async (req, res) => {     // Admin
            const filter = { role: 'admin' }
            const result = await usersBase.find(filter).toArray()
            res.send(result)
        })

        app.get('/apartmentRent', verifyToken, verifyAdminOrMember, async (req, res) => { //Admins &  Members
            const result = await apartmentRentBase.find().toArray()
            res.send(result)
        })

        app.get('/announcements', verifyToken, async (req, res) => {
            const result = await announcementsBase.find().toArray()
            res.send(result)
        })


        // All [ POST ] APIS >

        // Stripe Payment Gateway
        app.post("/stripe-intent", async (req, res) => {
            const { rentAmount } = req.body;
            const paymentIntent = await stripe.paymentIntents.create({
                amount: parseInt(rentAmount * 100),
                currency: "bdt",
                payment_method_types: [
                    "card",
                ],
            });
            res.send({ clientSecret: paymentIntent.client_secret })
        })

        app.post('/paymentHistory', verifyToken, verifyMember, async (req, res) => { //Member
            const response = req.body;
            const email = req.body.email;
            const result = await paymentsBase.find({ email: email }).toArray();
            res.send(result)
        })

        app.post('/payments', verifyToken, verifyMember, async (req, res) => { //Member
            const response = req.body;
            const result = await paymentsBase.insertOne(response)
            res.send(result)
        })

        app.post('/addUser', async (req, res) => {
            const response = req.body;
            const result = await usersBase.insertOne(response)
            res.send(result)
        })

        app.post('/checkCoupon', verifyToken, verifyMember, async (req, res) => { // Member
            const code = req.body.code;
            // console.log(code);

            const coupon = await couponsBase.findOne({ code: code });

            if (coupon && coupon.status === "active") {
                res.send({
                    message: 'Coupon Applied',
                    discount: coupon?.discount
                });
            } else {
                res.send({
                    message: 'Coupon not found or unavailable'
                });
            }
        });


        app.post('/announcements', verifyToken, verifyAdmin, async (req, res) => { //Admin
            const response = req.body;
            const result = await announcementsBase.insertOne(response)
            res.send(result)
        })

        app.post('/coupons', verifyToken, verifyAdmin, async (req, res) => { //Admin
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

        app.post('/apartmentRent', verifyToken, async (req, res) => {
            const response = req.body;
            const email = req.body.email;
            // console.log(email)
            const existing = await apartmentRentBase.findOne({ email: email });
            // console.log(existing)
            if (existing) {
                return res.send({ message: 'You’ve already applied for an apartment.' });
            }
            const id = req.body.apartmentId;
            const filter = { _id: new ObjectId(id) }
            const updateApartmentAvailability = { $set: { availability: false } }
            const update = await apartmentsBase.updateOne(filter, updateApartmentAvailability)
            const result = await apartmentRentBase.insertOne(response);
            res.send({ message: 'Apartment application submitted successfully.', result, update });
        })

        app.post('/apartmentRentInfo', verifyToken, verifyMember, async (req, res) => { //Member
            const email = req.body.email;
            const result = await apartmentRentBase.findOne({ email: email });
            res.send(result);
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
        app.patch('/updateCouponActive/:id', verifyToken, verifyAdmin, async (req, res) => { //Admin
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) }
            const options = { upsert: true }
            const updateCoupon = { $set: { status: "active" } }
            const result = await couponsBase.updateOne(filter, updateCoupon, options)
            res.send(result)
        })
        app.patch('/updateCouponInactive/:id', verifyToken, verifyAdmin, async (req, res) => { //Admin
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) }
            const options = { upsert: true }
            const updateCoupon = { $set: { status: "inactive" } }
            const result = await couponsBase.updateOne(filter, updateCoupon, options)
            res.send(result)
        })
        app.patch('/degradeMember', verifyToken, verifyAdmin, async (req, res) => { //Admin
            const email = req.body.email;
            const filter = { email: email }
            const updateToUser = { $set: { role: "user" } }
            const result = await usersBase.updateOne(filter, updateToUser)
            res.send(result)
        })
        app.patch('/accept', verifyToken, verifyAdmin, async (req, res) => { //Admin
            const response = req.body;
            const id = response.id;
            const email = response.email;
            const date = response.date;
            const filter = { _id: new ObjectId(id) }
            const update = { $set: { status: "checked", approval: true, acceptDate: date } }
            const result1 = await apartmentRentBase.updateOne(filter, update)
            const cursor = { email: email }
            const userUpdate = { $set: { role: 'member' } }
            const result2 = await usersBase.updateOne(cursor, userUpdate)
            const ids = req.body.apartmentId;
            const find = { _id: new ObjectId(ids) }
            const updateApartmentAvailability = { $set: { availability: false } }
            const result3 = await apartmentsBase.updateOne(find, updateApartmentAvailability)
            res.send({ message: 'Apartment Request Accepted & Changed User to Member', result1, result2, result3 })
        })
        app.patch('/reject', verifyToken, verifyAdmin, async (req, res) => { //Admin
            const response = req.body;
            const id = response.id;
            const filter = { _id: new ObjectId(id) }
            const update = { $set: { status: "checked", approval: false } }
            const result = await apartmentRentBase.updateOne(filter, update)
            const ids = req.body.apartmentId;
            const find = { _id: new ObjectId(ids) }
            const updateApartmentAvailability = { $set: { availability: true } }
            const result2 = await apartmentsBase.updateOne(find, updateApartmentAvailability)
            res.send({ message: 'Apartment Request Rejected', result, result2 })
        })
        // All [ PUT ] APIS >
        // All [ DELETE ] APIS >

        // await client.db("admin").command({ ping: 1 });  // Need to comment this part before deployment
        // console.log("Connected to MongoDB!");  // Need to comment this part before deployment
    } finally {
        // await client.close();
    }
}
run().catch(console.dir);

app.listen(port, () => {
    console.dir(`Server is running on Port > ${port}`)
})
