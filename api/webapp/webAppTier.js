const Moralis = require('moralis-v1/node');
const { parseJSON } = require('../../utils/jsonParser');

/**
 * `addMonthlyTradingVolume` adds `amount` to `address`'s monthly trading volume.
 * This is called after a successful sale/purchase of items in our web app marketplace.
 * Note: This ONLY supports our web app. Any NFT purchases or sales in OpenSea are NOT included.
 * @param {String} address the EVM address of the user
 * @param {Number} amount the dollar value of the amount to be increased.
 * @return {Object} an object with 'status: OK' if successful, or an error thrown otherwise.
 */
const addMonthlyTradingVolume = async (address, amount) => {
    try {
        // we are trying to query the WebAppData class in Moralis to obtain the specific address' data.
        const WebAppData = new Moralis.Query('WebAppData');
        WebAppData.equalTo('address', address);

        if (amount <= 0) {
            throw new Error('Amount specified must be greater than 0');
        }

        const result = WebAppData.first({ useMasterKey: true });

        if (result === undefined) {
            throw new Error('User with given address cannot be found in WebAppData');
        }

        const currentVolume = (parseJSON(result))['monthlyTradingVolume'];

        // if any of these values arise from the query, this means that the user hasn't had any trading volume yet.
        if (currentVolume === undefined || currentVolume === null || currentVolume === 0) {
            result.set('monthlyTradingVolume', amount);
        // if the user has had trading volume before, we add the new amount to the existing amount.
        } else {
            const newVolume = currentVolume + amount;
            result.set('monthlyTradingVolume', newVolume);
        }

        await result.save(null, { useMasterKey: true });

        return {
            success: 'OK',
        };
    } catch (err) {
        throw err;
    }
};

/**
 * `resetMonthlyTradingVolume` resets the monthly trading volume of `address` back to 0.
 * This function should be called once at the start of every month (1st of each month @ 00:00 GMT).
 * @param {String} address the EVM address of the user
 * @return {Object} an object with 'status: OK' if successful, or an error thrown otherwise.
 */
const resetMonthlyTradingVolume = async (address) => {
    try {
        const WebAppData = new Moralis.Query('WebAppData');
        WebAppData.equalTo('address', address);

        const result = WebAppData.first({ useMasterKey: true });

        if (result === undefined) {
            throw new Error('User with given address cannot be found in WebAppData');
        }

        result.set('monthlyTradingVolume', 0);
        await result.save(null, { useMasterKey: true });

        return {
            success: 'OK',
        };
    } catch (err) {
        throw err;
    }
};

/**
 * `addTotalTradingVolume` adds the TOTAL trading volume by `amount` $ to `address`.
 * This will always be called after a successful sale/purchase.
 * @param {String} address the EVM address of the user
 * @param {Number} amount the dollar value of the amount to be increased.
 * @return {Object} an object with 'status: OK' if successful, or an error thrown otherwise.
 */
const addTotalTradingVolume = async (address, amount) => {
    try {
        const WebAppData = new Moralis.Query('WebAppData');
        WebAppData.equalTo('address', address);

        if (amount <= 0) {
            throw new Error('Amount specified must be greater than 0');
        }

        const result = WebAppData.first({ useMasterKey: true });

        if (result === undefined) {
            throw new Error('User with given address cannot be found in WebAppData');
        }

        const currentVolume = (parseJSON(result))['totalTradingVolume'];

        if (currentVolume === undefined || currentVolume === null || currentVolume === 0) {
            result.set('totalTradingVolume', amount);
        } else {
            const newVolume = currentVolume + amount;
            result.set('totalTradingVolume', newVolume);
        }

        await result.save(null, { useMasterKey: true });

        return {
            success: 'OK',
        };
    } catch (err) {
        throw err;
    }
};


module.exports = {
    addMonthlyTradingVolume,
    resetMonthlyTradingVolume,
    addTotalTradingVolume,
};
