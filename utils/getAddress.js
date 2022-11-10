const axios = require('axios').default;

/**
 * `getEvmAddress` gets the EVM address of the user from their playfab ID.
 * @param {String} playfabId the PlayFab ID of the user
 * @return {String} the EVM address of the user
 */
const getEvmAddress = async (playfabId) => {
    try {
        const headers = {
            'X-SecretKey': xSecretKey,
        };

        const data = {
            'playFabId': playfabId,
        };

        let ethAddress;

        await axios.post(`https://${titleId}.playfabapi.com/Admin/GetUserInternalData`, data, {
            headers: headers,
        }).then((response) => {
            ethAddress = response.data.data['Data']['ethAddress']['Value'];
        });

        return ethAddress;
    } catch (err) {
        if (err.response) {
            throw new Error(`Error: ${err.response.data.errorMessage}`);
        } else if (err.request) {
            throw new Error(`Error: ${err.request.data.errorMessage}`);
        } else {
            throw new Error(`Error: ${err.message}`);
        }
    }
};

module.exports = {
    getEvmAddress,
};
