const express = require('express');
/* eslint-disable new-cap */
const router = express.Router();

const genesisNBMon = require('../api/nfts/genesisNBMon');
const httpErrorStatusCode = require('../utils/httpErrorStatusCode');

router.get('/getGenesisNBMon/:id', async (req, res) => {
    try {
        const id = req.params.id;
        const nbmon = await genesisNBMon
            .getGenesisNBMon(parseInt(id))
            .catch((err) => {
                throw err;
            });
        res.json(nbmon);
    } catch (err) {
        res
            .status(httpErrorStatusCode(err.code))
            .json({ error: err.toString() });
    }
});


module.exports = router;
