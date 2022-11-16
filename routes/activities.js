const express = require('express');
const router = express.Router();

const { getUserActivities } = require('../api/webapp/activities');
const httpErrorStatusCode = require('../utils/httpErrorStatusCode');

router.get('/:address', async (req, res) => {
    const address = req.params.address;
    try {
        const activities = await getUserActivities(address);
        res.json(activities);
    } catch (err) {
        res
            .status(httpErrorStatusCode(err.code))
            .json({ error: err.toString() });
    }
});