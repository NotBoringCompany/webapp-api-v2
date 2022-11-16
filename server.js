require('dotenv').config();

const express = require('express');
const app = express();
const port = process.env.PORT;
const cors = require('cors');
const Moralis = require('moralis-v1/node');

const serverUrl = process.env.MORALIS_SERVERURL;
const appId = process.env.MORALIS_APPID;
const masterKey = process.env.MORALIS_MASTERKEY;

// EXPRESS MIDDLEWARES
app.use(cors());
app.use(express.json());

const genesisNBMon = require('./routes/genesisNBMon');
const activities = require('./routes/activities');

app.use('/genesisNBMon', genesisNBMon);
app.use('/activities', activities);

app.listen(port, async () => {
    console.log(`Listening from port ${port}`);

    // initiates a moralis instance
    await Moralis.start({
        serverUrl,
        appId,
        masterKey,
    });
});
