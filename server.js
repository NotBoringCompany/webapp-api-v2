require('dotenv').config();

const express = require('express');
const app = express();
const port = process.env.PORT;
const cors = require('cors');

// EXPRESS MIDDLEWARES
app.use(cors());
app.use(express.json());

app.listen(port, async() => {
    console.log(`Listening from port ${port}`);
});