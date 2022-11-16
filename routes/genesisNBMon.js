const express = require('express');
const router = express.Router();

const genesisNBMon = require('../api/nfts/genesisNBMon');
const httpErrorStatusCode = require('../utils/httpErrorStatusCode');

router.get('/getGenesisNBMon/:id', async (req, res) => {
    try {
        const id = req.params.id;
        const nbmon = await genesisNBMon.getGenesisNBMon(parseInt(id));
        res.json(nbmon);
    } catch (err) {
        res
            .status(httpErrorStatusCode(err.code))
            .json({ error: err.toString() });
    }
});

router.post('/changeOwnership', async (req, res) => {
    try {
        const { id, toAddress } = req.body;

        const result = await genesisNBMon.changeOwnership(parseInt(id), toAddress);
        res.json(result);
    } catch (err) {
        res
            .status(httpErrorStatusCode(err.code))
            .json({ error: err.toString() });
    }
});

router.get('/getGenesisNBMonAlt/:id', async (req, res) => {
    try {
        const id = req.params.id;
        const nbmon = await genesisNBMon.getGenesisNBMonAlt(parseInt(id));
        res.json(nbmon);
    } catch (err) {
        res
            .status(httpErrorStatusCode(err.code))
            .json({ error: err.toString() });
    }
});

router.get('/getOwnedIDs/:address', async (req, res) => {
    try {
        const address = req.params.address;
        const ownedIds = await genesisNBMon.getOwnedGenesisNBMonIDs(address);
        res.json(ownedIds);
    } catch (err) {
        res
            .status(httpErrorStatusCode(err.code))
            .json({ error: err.toString() });
    }
});

router.get('/getOwnedNBMons/:address', async (req, res) => {
    try {
        const address = req.params.address;
        const nbmons = await genesisNBMon.getOwnedGenesisNBMons(address);
        res.json(nbmons);
    } catch (err) {
        res
            .status(httpErrorStatusCode(err.code))
            .json({ error: err.toString() });
    }
});

router.get('/getOwnedNBMonsAlt/:address', async (req, res) => {
    try {
        const address = req.params.address;
        const nbmons = await genesisNBMon.getOwnedGenesisNBMonsAlt(address);
        res.json(nbmons);
    } catch (err) {
        res
            .status(httpErrorStatusCode(err.code))
            .json({ error: err.toString() });
    }
});

router.get('/config', async (_, res) => {
    try {
        const config = await genesisNBMon.generalConfig();
        res.json(config);
    } catch (err) {
        res
            .status(httpErrorStatusCode(err.code))
            .json({ error: err.toString() });
    }
});

router.get('/config/:address', async (req, res) => {
    try {
        const address = req.params.address;
        const config = await genesisNBMon.config(address);
        res.json(config);
    } catch (err) {
        res
            .status(httpErrorStatusCode(err.code))
            .json({ error: err.toString() });
    }
});


module.exports = router;
