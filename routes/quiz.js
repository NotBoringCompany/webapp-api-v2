const express = require('express');
const router = express.Router();

// const { getQuiz } = require('../api/quiz/getQuiz');
const { getUserStats, uploadScoreToMoralis } = require('../api/quiz/quizStats');
const httpErrorStatusCode = require('../utils/httpErrorStatusCode');

// router.get('/getQuiz', async (req, res) => {
//     try {
//         const quiz = await getQuiz();
//         res.json(quiz);
//     } catch (err) {
//         res
//             .status(httpErrorStatusCode(err.code))
//             .json({ error: err.toString() });
//     }
// });

router.get('/getUserStats/:address', async (req, res) => {
    try {
        const address = req.params.address;
        const stats = await getUserStats(address);
        res.json(stats);
    } catch (err) {
        res
            .status(httpErrorStatusCode(err.code))
            .json({ error: err.toString() });
    }
});

router.post('/uploadScore', async (req, res) => {
    try {
        const {
            address,
            correctChoices,
            totalCorrectChoices,
            wrongChoices,
            points,
            totalPoints,
        } = req.body;

        const uploadScore = await uploadScoreToMoralis(address, correctChoices, totalCorrectChoices, wrongChoices, points, totalPoints);
        res.json(uploadScore);
    } catch (err) {
        res
            .status(httpErrorStatusCode(err.code))
            .json({ error: err.toString() });
    }
});

module.exports = router;
