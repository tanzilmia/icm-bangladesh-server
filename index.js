const express = require('express');
const app = express();
const cors = require('cors');
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const port = process.env.PORT || 5000

app.use(cors())
app.use(express.json())




const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.nz3kcdw.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });



async function run(){
    try{
        const userscollection = client.db("icmdb").collection("users");
        const productcategoriesCollection = client.db("icmdb").collection("productcategories");
        const allProductscollection = client.db("icmdb").collection("allProducts");

        // get  opareton
        app.get('/categories', async (req,res)=> {
            const query = {}
            const categoriyes = await productcategoriesCollection.find(query).toArray()
            res.send(categoriyes)
        
        })

        // get spcifiq data 
        app.get('/categories/:id', async (req,res)=>{
            const id = req.params.id;
            const query = { _id : ObjectId(id)}
            const categore = await productcategoriesCollection.findOne(query)
            res.send(categore)
        })



        app.get('/allproducts/', async (req,res)=>{
            const brand_name = req.query.category_name;
            const query = {brand_name: brand_name}
            const result = await allProductscollection.find(query).toArray()
            res.send(result) 
        })


        // post 

        app.post('/users', async(req,res)=>{
            const user = req.body;
            const result = await userscollection.insertOne(user)
            res.send(result)
        })

        app.post('/allproducts', async (req,res)=>{
            const products = req.body;
            const result = await allProductscollection.insertOne(products)
            res.send(result)
        })

        // updata / put

        // delelte
        // 
    }
    finally{

    }
}
run().catch(console.log())

app.get('/', (req, res) => {
    res.send('Hello World!')
  })
app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})