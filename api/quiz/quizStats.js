require('dotenv').config();
const Moralis = require('moralis-v1/node');
const { parseJSON } = require('../../utils/jsonParser');

/**
 * `getUserStats` gets the user's quiz stats from the database.
 * @param {String} address the EVM address of the user
 * @return {Object} the user's quiz stats
 */
const getUserStats = async (address) => {
    try {
        const AddressStats = new Moralis.Query('RHQuizLeaderboard');
        AddressStats.equalTo('address', address);

        const result = await AddressStats.first({ useMasterKey: true });

        if (!result) {
            return {
                quizzesPlayed: 0,
                allQuizStats: 0,
            };
        }

        const parsedResult = parseJSON(result);
        const quizzesPlayed = parsedResult['quizzesPlayed'] ? parsedResult['quizzesPlayed'] : 0;
        const allQuizStats = parsedResult['allQuizStats'] ? parsedResult['allQuizStats'] : [];

        return {
            quizzesPlayed: quizzesPlayed,
            allQuizStats: allQuizStats,
        };
    } catch (err) {
        throw err;
    }
};

/**
 * `uploadScoreToMoralis` uploads the user's quiz stats to Moralis when a quiz ends.
 * @param {String} address
 * @param {Number} correctChoices
 * @param {Number} totalCorrectChoices
 * @param {Number} wrongChoices
 * @param {Number} points
 * @param {Number} totalPoints
 * @return {Object} an object with status OK if everything is ok.
 */
const uploadScoreToMoralis = async (address, correctChoices, totalCorrectChoices, wrongChoices, points, totalPoints) => {
    try {
        const AddressStats = new Moralis.Query('RHQuizLeaderboard');
        AddressStats.equalTo('address', address);

        // check if the stats for this address is in the DB
        const addressStats = await AddressStats.first({ useMasterKey: true });

        if (addressStats === undefined || addressStats === null) {
            const Stats = Moralis.Object.extend('RHQuizLeaderboard');
            const stats = new Stats();
            stats.set('address', address);
            stats.set('quizzesPlayed', 1);
            stats.set('allQuizStats', [{
                correctChoices: correctChoices + '/' + totalCorrectChoices,
                wrongChoices: wrongChoices,
                points: points + '/' + totalPoints,
            }]);

            await stats.save(null, { useMasterKey: true });
        } else {
            const parsedAddressStats = parseJSON(addressStats);

            const currentQuizzesPlayed = parseInt(parsedAddressStats['quizzesPlayed']);
            addressStats.set('quizzesPlayed', currentQuizzesPlayed + 1);
            const currentAllQuizStats = parsedAddressStats['allQuizStats'];
            currentAllQuizStats.push({
                correctChoices: correctChoices + '/' + totalCorrectChoices,
                wrongChoices: wrongChoices,
                points: points + '/' + totalPoints,
            });

            addressStats.set('allQuizStats', currentAllQuizStats);

            await addressStats.save(null, { useMasterKey: true });
        }

        return {
            status: 'OK',
        };
    } catch (err) {
        throw err;
    }
};

module.exports = {
    getUserStats,
    uploadScoreToMoralis,
};

