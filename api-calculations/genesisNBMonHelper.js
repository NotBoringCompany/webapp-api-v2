require('dotenv').config();

const ethers = require('ethers');
const fs = require('fs');
const Moralis = require('moralis-v1/node');
const path = require('path');

const rpcUrl = process.env.BSC_RPC_URL;
const rpcProvider = new ethers.providers.JsonRpcProvider(rpcUrl);

// Genesis NBMon contract-related variables
const genesisABI = JSON.parse(
    fs.readFileSync(
        path.join(__dirname, '../abi/genesisNBMon.json'),
    ),
);
const genesisContract = new ethers.Contract(
    process.env.GENESIS_NBMON_ADDRESS,
    genesisABI,
    rpcProvider,
);

const parseJSON = require('../utils/jsonParser').parseJSON;

/**
 * `getGenesisFertilityDeduction` checks for the fertility point deduction of a Genesis NBMon after it has bred.
 * This will be different than other NBMon generations.
 * @param {String} rarity the rarity of the NBMon.
 * @return {Number} the fertility point deduction.
 */
const getGenesisFertilityDeduction = (rarity) => {
    switch (rarity) {
    case 'Common':
        return 1000;
    case 'Uncommon':
        return 750;
    case 'Rare':
        return 600;
    case 'Epic':
        return 500;
    case 'Legendary':
        return 375;
    case 'Mythical':
        return 300;
    case undefined:
        return null;
    case null:
        return null;
    case '':
        return null;
    default:
        throw new Error('Invalid rarity.');
    }
};

/**
 * `getBornAt` gets the birth timestamp of a genesis NBMon (in unix time). This method uses blockchain, which will take longer than Moralis.
 * @param {Number} nbmonId the ID of the NBMon
 * @return {Number} the unix birth timestamp of the genesis NBMon.
 */
const getBornAt = async (nbmonId) => {
    try {
        const nbmon = await genesisContract.getNFT(nbmonId);
        return parseInt(Number(nbmon['bornAt']));
    } catch (err) {
        throw err;
    }
};

const serverUrl = process.env.MORALIS_SERVERURL;
const appId = process.env.MORALIS_APPID;
const masterKey = process.env.MORALIS_MASTERKEY;

/**
 * `getBornAt` gets the birth timestamp of a genesis NBMon (in unix time). This method uses Moralis, which results in a faster query.
 * @param {Number} nbmonId the ID of the NBMon
 * @return {Number} the unix birth timestamp of the genesis NBMon.
 */
const getBornAtAlt = async (nbmonId) => {
    try {
        await Moralis.start({
            serverUrl,
            appId,
            masterKey,
        });
        const MintedNFTs = new Moralis.Query('MintedNFTs');
        MintedNFTs.equalTo('tokenId', nbmonId);

        const result = await MintedNFTs.first();

        // if and only if result is undefined (meaning that the query cannot be successfully executed), we will run the `getBornAt` function.
        if (result === undefined) {
            const bornAt = await getBornAt(nbmonId);
            return bornAt;
        }

        const bornAt = (parseJSON(result))['bornAt'];

        return bornAt;
    } catch (err) {
        throw err;
    }
};

module.exports = {
    getGenesisFertilityDeduction,
    getBornAt,
    getBornAtAlt,
};

