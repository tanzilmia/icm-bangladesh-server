const express = require("express");
const app = express();
const cors = require("cors");
require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const stripe = require("stripe")(process.env.STRIPE_KEY);
const jwt = require("jsonwebtoken");
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.nz3kcdw.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

function verifyingToken(req, res, next) {
  const header = req.headers.authorization;
  if (!header) {
    return res.status(401).send("sorry unauthrize access");
  }
  const token = header.split(" ")[1];
  jwt.verify(token, process.env.ACCESS_TOKEN, function (err, decoded) {
    if (err) {
      return res.status(403).send({ message: "forbidden access" });
    }
    req.decoded = decoded;
    next();
  });
}

async function run() {
  try {
    const userscollection = client.db("icmdb").collection("users");
    const productcategoriesCollection = client
      .db("icmdb")
      .collection("productcategories");
    const allProductscollection = client.db("icmdb").collection("allProducts");
    const bookedproductcollection = client
      .db("icmdb")
      .collection("bookedproduct");

    // A function for veryfy admin
    const adminVerify = async (req, res, next) => {
      const decodedEmail = req.decoded.email;
      const query = { email: decodedEmail };
      const user = await userscollection.findOne(query);

      if (user?.role !== "admin") {
        return res.status(403).send({ message: "forbidden access" });
      }
      next();
    };

    // get  opareton
    // get all categories data
    app.get("/categories", async (req, res) => {
      const query = {};
      const categoriyes = await productcategoriesCollection
        .find(query)
        .toArray();
      res.send(categoriyes);
    });

    // get spcifiq data
    app.get("/categories/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const categore = await productcategoriesCollection.findOne(query);
      res.send(categore);
    });

    // gee booked product for bayeing
    app.get("/product/parces/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await bookedproductcollection.findOne(query);
      res.send(result);
    });

    // get all seller -- jwt & admin route
    app.get("/seller", verifyingToken, adminVerify, async (req, res) => {
      const email = req.query.email;
      const decodedEmail = req.decoded.email;
      if (email !== decodedEmail) {
        return res.status(403).send({ message: "forbidden access" });
      }
      const query = { role: "seller" };
      const seller = await userscollection.find(query).toArray();
      res.send(seller);
    });

    // get campain data
    app.get("/campain", async (req, res) => {
      const query = {
        campain: true,
        sold:false
      };
      const campaininfo = await allProductscollection.find(query).toArray();
      res.send(campaininfo);
    });

    // get all seller
    app.get("/bayer", verifyingToken, adminVerify, async (req, res) => {
      const email = req.query.email;
      const decodedEmail = req.decoded.email;
      if (email !== decodedEmail) {
        return res.status(403).send({ message: "forbidden access" });
      }
      const query = { role: "bayer" };
      const seller = await userscollection.find(query).toArray();
      res.send(seller);
    });

    // get similar type of data
    app.get("/allproducts/", verifyingToken, async (req, res) => {
      const email = req.query.email;
      const decodedEmail = req.decoded.email;
      if (email !== decodedEmail) {
        return res.status(403).send({ message: "forbidden access" });
      }
      const brand_name = req.query.category_name;
      const query = { 
        brand_name: brand_name,
        sold: false
     };
      const result = await allProductscollection.find(query).toArray();
      res.send(result);
    });

    // get my product
    // jwt will be apply here
    app.get("/myproduct", verifyingToken, async (req, res) => {
      const email = req.query.email;
      const decodedEmail = req.decoded.email;
      if (email !== decodedEmail) {
        return res.status(403).send({ message: "forbidden access" });
      }
      const query = { userEmail: email };
      const result = await allProductscollection.find(query).toArray();
      res.send(result);
    });

    // get jwt token for admin and seller
    app.get("/jwt", async (req, res) => {
      const email = req.query.email;
      const query = { email: email };
      const user = await userscollection.findOne(query);
      if (user) {
        const token = jwt.sign({ email }, process.env.ACCESS_TOKEN, {
          expiresIn: "8h",
        });
        return res.send({ jwtToken: token });
      }
      res
        .status(403)
        .send({ jwtToken: "sorry you have not permissiton for access" });
    });

    // get admin access
    app.get("/users/admin/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email };
      const user = await userscollection.findOne(query);
      res.send({ isAdmin: user?.role === "admin" });
    });

    // get seller access
    app.get("/users/seller/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email };
      const user = await userscollection.findOne(query);
      res.send({ isSeller: user?.role === "seller" });
    });

    // get my booking
    app.get("/bookingproduct", verifyingToken, async (req, res) => {
      const email = req.query.email;
      const decodedEmail = req.decoded.email;
      if (email !== decodedEmail) {
        return res.status(403).send({ message: "forbidden access" });
      }
      const query = { email: email };
      const mybooking = await bookedproductcollection.find(query).toArray();
      res.send(mybooking);
    });

    // get spacefiq user info

    app.get("/user", async (req, res) => {
      const username = req.query.sellerName;
      const query = { name: username };
      const result = await userscollection.findOne(query);
      res.send(result);
    });

    // post

    // payment system
    app.post("/create-payment-intent", async (req, res) => {
      const booking = req.body;
      const price = parseInt(booking.product_price);
      const amount = price * 100;
      const paymentIntent = await stripe.paymentIntents.create({
        amount,
        currency: "usd",
        payment_method_types: ["card"],
      });
      res.send({
        clientSecret: paymentIntent.client_secret,
      });
    });
    // sotre user info
    app.post("/users", async (req, res) => {
      const user = req.body;
      const result = await userscollection.insertOne(user);
      res.send(result);
    });

    // store product in db , only seller can do it,jwt apply here
    app.post("/allproducts", verifyingToken, async (req, res) => {
      const email = req.query.email;
      const decodedEmail = req.decoded.email;
      if (email !== decodedEmail) {
        return res.status(403).send({ message: "forbidden access" });
      }
      const products = req.body;
      const result = await allProductscollection.insertOne(products);
      res.send(result);
    });

    // verifyingToken,
    app.post("/bookingproduct", verifyingToken, async (req, res) => {
      const email = req.query.email;
      const decodedEmail = req.decoded.email;
      if (email !== decodedEmail) {
        return res.status(403).send({ message: "forbidden access" });
      }
      const bookedproduct = req.body;
      const result = await bookedproductcollection.insertOne(bookedproduct);
      res.send(result);
    });

    // updata / put

    //    verify batch for verified user,

    app.put("/users", verifyingToken, async (req, res) => {
      const email = req.query.email;
      const decodedEmail = req.decoded.email;
      if (email !== decodedEmail) {
        return res.status(403).send({ message: "forbidden access" });
      }
      const id = req.query.userid;
      console.log(id);
      const filter = { _id: ObjectId(id) };
      const options = { upsert: true };
      const updateDoc = {
        $set: {
          verified: true,
        },
      };

      const result = await userscollection.updateOne(
        filter,
        updateDoc,
        options
      );
      res.send(result);
    });

    // store payment info
    app.put("/addpayment", verifyingToken, async (req, res) => {
      const email = req.query.email;
      const decodedEmail = req.decoded.email;
      if (email !== decodedEmail) {
        return res.status(403).send({ message: "forbidden access" });
      }
      const sellerEmail = req.query.sellerEmail;
      const productName = req.query.product_name;

      const filter = {
        userEmail:sellerEmail,
        product_name:productName

       };
      const options = { upsert: true };
      const updateDoc = {
        $set: {
          sold: true,
        },
      };

      const result = await allProductscollection.updateOne(
        filter,
        updateDoc,
        options
      );
      res.send(result);
    });


    // capmaining products
    app.put("/campain", verifyingToken, async (req, res) => {
      const email = req.query.email;
      const decodedEmail = req.decoded.email;
      if (email !== decodedEmail) {
        return res.status(403).send({ message: "forbidden access" });
      }
      const id = req.query.productId;
      console.log(id);
      const filter = { _id: ObjectId(id) };
      const options = { upsert: true };
      const updateDoc = {
        $set: {
          campain: true,
        },
      };

      const result = await allProductscollection.updateOne(
        filter,
        updateDoc,
        options
      );
      res.send(result);
    });

    // delelte
  } finally {
  }
}
run().catch(console.log());

app.get("/", (req, res) => {
  res.send("Hello World!");
});
app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
