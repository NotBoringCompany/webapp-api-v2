require('dotenv').config();

const ethers = require('ethers');
const fs = require('fs');
const path = require('path');
const Moralis = require('moralis-v1/node');
const crypto = require('crypto');

const privateKey = process.env.TEST_ADMIN_PRIVATE_KEY;
const hatchingDuration = process.env.HATCHING_DURATION;

const minterWallet = new ethers.Wallet(privateKey);
const rpcUrl = process.env.CRONOS_RPC_URL;
const rpcProvider = new ethers.providers.JsonRpcProvider(rpcUrl);

// IMPORTS
const statRandomizer = require('../../../api-calculations/nbmonBlockchainStats.js');
const { getNBMonData } = require('../../../api-calculations/nbmonData.js');

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

/**
 * `generateSignature` generates the minter's signature after obtaining the hash from several parameters.
 * This is used to hatch the NBMon to ensure that the stats of the NBMon cannot be tampered.
 * @param {Number} nbmonId the ID of the Genesis NBMon
 * @param {String} minter the minter's address
 * @param {Number} bornAt the unix timestamp/block timestamp of when the NBMon was born
 * @returns {Object} an object containing both signature and tx salt
 */
const generateSignature = async (nbmonId, minter, bornAt) => {
    // generates a random salt string from the crypto library, used for hashing.
    const txSalt = crypto.randomBytes(52).toString('hex');

    // the so called `hatching hash` is obtained from calling the contract. returns a bytes32 hash.
    const hash = await genesisContract.hatchingHash(
        nbmonId,
        minter,
        bornAt,
        txSalt
    );

    // the hash is currently considered as a string message. in order to obtain the proper bytes32 format, we need the Uint8Array format of the hash,
    // available by 'arrayifying' the hash before plugging it into `signMessage`.
    const arrayifiedHash = ethers.utils.arrayify(hash);
    // we now get the signature of the minter.
    const signature = await minterWallet.signMessage(arrayifiedHash);

    return { signature, txSalt };
}

/**
 * `randomizeHatchingStats` obtains all the data from `api-calculations/nbmonBlockchainStats.js` to randomize the NBMon-to-hatch's blockchain stats.
 * @param {Number} nbmonId the ID of the Genesis NBMon
 * @param {String} txSalt a random salt generated from `crypto.randomBytes` to ensure that the hash is unique.
 * @param {String} signature a bytes32 keccak256 signature obtained from ethers' `signMessage` method.
 */
const randomizeHatchingStats = async (nbmonId, txSalt, signature) => {
    try {
        // we get the wallet object of the minter
        const minter = new ethers.Wallet(privateKey, rpcProvider);

        // obtaining all the different blockchain stats
        const gender = statRandomizer.randomizeGender();
        const rarity = statRandomizer.randomizeGenesisRarity();
        const genus = statRandomizer.randomizeGenesisGenus();

        if (genus === undefined || genus === null || genus === '') {
            throw new Error('Error getting genus. Please check the code.');
        }

        const mutation = await statRandomizer.randomizeGenesisMutation(genus);
        const species = 'Origin';
        const fertility = 3000;
        
        // getting nbmon data based on genus
        const nbmonData = await getNBMonData(genus);

        const types = nbmonData['Types'];

        console.log(gender, rarity, genus, mutation, types);
    } catch (err) {
        throw err;
    }
}

randomizeHatchingStats(1, 'asdasdas', 'asdasd');

module.exports = {
    generateSignature
}


