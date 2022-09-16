require('dotenv').config();

const ethers = require('ethers');
const fs = require('fs');
const path = require('path');
const moment = require('moment');

// IMPORTS
const parseJSON = require('../../../utils/jsonParser').parseJSON;

// NOTE: The GenesisNBMon contract will only exist in ONE blockchain. This means that there is no need to specify multiple RPC URLs for dynamic interaction.
// Currently, this RPC URL is set to Cronos Testnet for testing purposes, but it will most likely be on Ethereum.
const rpcUrl = process.env.CRONOS_RPC_URL;
const rpcProvider = new ethers.providers.JsonRpcProvider(rpcUrl);

// Genesis NBMon contract-related variables
const genesisABI = JSON.parse(
    fs.readFileSync(
        path.join(__dirname, '../../../abi/GenesisNBMon.json')
    )
);
const genesisContract = new ethers.Contract(
    process.env.GENESIS_NBMON_TESTING_ADDRESS,
    genesisABI,
    rpcProvider
);

// FUNCTIONS
/**
 * `getGenesisNBMon` returns a Genesis NBMon object with all relevant blockchain and non-blockchain data.
 * @param {Number} id the ID of the Genesis NBMon to query.
 * @returns {Object} a GenesisNBMon object.
 */
const getGenesisNBMon = async (id) => {
    try {
        //
    } catch (err) {
        throw err;
    }
}

