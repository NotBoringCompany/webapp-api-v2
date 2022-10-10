require('dotenv').config();

const ethers = require('ethers');
const fs = require('fs');
const path = require('path');
const Moralis = require('moralis-v1/node');
const crypto = require('crypto');

const privateKey = process.env.TEST_ADMIN_PRIVATE_KEY;

const minterWallet = new ethers.Wallet(privateKey);
const rpcUrl = process.env.CRONOS_RPC_URL;
const rpcProvider = new ethers.providers.JsonRpcProvider(rpcUrl);

// IMPORTS
const statRandomizer = require('../../api-calculations/nbmonBlockchainStats.js');
const { getNBMonData } = require('../../api-calculations/nbmonData.js');
const { getBornAtAlt } = require('../../api-calculations/genesisNBMonHelper.js');
const { saveHatchingSignature } = require('../webapp/activities.js');

// Genesis NBMon contract-related variables
const genesisABI = JSON.parse(
    fs.readFileSync(
        path.join(__dirname, '../../abi/GenesisNBMon.json'),
    ),
);

const genesisContract = new ethers.Contract(
    process.env.GENESIS_NBMON_TESTING_ADDRESS,
    genesisABI,
    rpcProvider,
);

/**
 * `generateSignature` generates the minter's signature after obtaining the hash from several parameters.
 * This is used to hatch the NBMon to ensure that the stats of the NBMon cannot be tampered.
 * @param {Number} nbmonId the ID of the Genesis NBMon
 * @param {String} minter the minter's address
 * @param {Number} bornAt the unix timestamp/block timestamp of when the NBMon was born
 * @return {Object} an object containing both signature and tx salt
 */
const generateSignature = async (nbmonId, minter, bornAt) => {
    // generates a random salt string from the crypto library, used for hashing.
    const txSalt = crypto.randomBytes(52).toString('hex');

    // the so called `hatching hash` is obtained from calling the contract. returns a bytes32 hash.
    const hash = await genesisContract.hatchingHash(
        nbmonId,
        minter,
        bornAt,
        txSalt,
    );

    // the hash is currently considered as a string message. in order to obtain the proper bytes32 format, we need the Uint8Array format of the hash,
    // available by 'arrayifying' the hash before plugging it into `signMessage`.
    const arrayifiedHash = ethers.utils.arrayify(hash);
    // we now get the signature of the minter.
    const signature = await minterWallet.signMessage(arrayifiedHash);

    return { signature, txSalt };
};

/**
 * `randomizeHatchingStats` obtains all the data from `api-calculations/nbmonBlockchainStats.js` to randomize the NBMon-to-hatch's blockchain stats.
 * @param {Number} nbmonId the ID of the Genesis NBMon
 * @param {String} txSalt a random salt generated from `crypto.randomBytes` to ensure that the hash is unique.
 * @param {String} signature a bytes32 keccak256 signature obtained from ethers' `signMessage` method.
 */
const randomizeHatchingStats = async (nbmonId, txSalt, signature) => {
    try {
        // Note: Notice how for most of the parameter-dependent code, we don't check for errors.
        // This is because the error handling with error throws is already
        // done inside these methods, so no need for extra checks here.

        // we get the wallet object of the minter
        const minter = new ethers.Wallet(privateKey, rpcProvider);

        // obtaining all the different blockchain stats
        const gender = statRandomizer.randomizeGender();
        const rarity = statRandomizer.randomizeGenesisRarity();
        const genus = statRandomizer.randomizeGenesisGenus();
        const mutation = await statRandomizer.randomizeGenesisMutation(genus);
        const species = 'Origin';
        const fertility = 3000;

        // getting nbmon data based on genus
        const nbmonData = await getNBMonData(genus);

        const types = nbmonData['Types'].length > 0 ? nbmonData['Types'] : null;
        const [typeOne, typeTwo] = [types[0], types[1]];
        const potential = statRandomizer.randomizeGenesisPotential(rarity);

        if (potential.length === 0) {
            throw new Error('Error getting potential. Please check the code.');
        }

        const [
            healthPotential,
            energyPotential,
            atkPotential,
            defPotential,
            spAtkPotential,
            spDefPotential,
            speedPotential,
        ] = [
            potential[0],
            potential[1],
            potential[2],
            potential[3],
            potential[4],
            potential[5],
            potential[6],
        ];

        const passives = await statRandomizer.randomizePassives();
        const [passiveOne, passiveTwo] = [passives[0], passives[1]];
        const blockNumber = await rpcProvider.getBlockNumber();
        const hatchedTimestamp = (await rpcProvider.getBlock(blockNumber)).timestamp;

        // pack all of the calculated data into the different metadata arrays
        const stringMetadata = [
            gender,
            rarity,
            mutation,
            species,
            genus,
            typeOne,
            typeTwo,
            passiveOne,
            passiveTwo,
        ];

        const numericMetadata = [
            0,
            healthPotential,
            energyPotential,
            atkPotential,
            defPotential,
            spAtkPotential,
            spDefPotential,
            speedPotential,
            fertility,
            hatchedTimestamp,
        ];

        const boolMetadata = [false];

        // we get bornAt to match signature
        const bornAt = await getBornAtAlt(nbmonId);

        // after all the data is calculated and sorted, we are now ready to sign the transaction and call `addHatchingStats` for the NBMon.
        const unsignedTx = await genesisContract.populateTransaction.addHatchingStats(
            nbmonId,
            minter.address,
            bornAt,
            txSalt,
            signature,
            stringMetadata,
            numericMetadata,
            boolMetadata,
        );

        const signedTx = await minter.signTransaction(unsignedTx);
        const minedTx = await signedTx.wait();

        await saveHatchingSignature(signature);

        return {
            response: minedTx,
            signature: signature,
        };
    } catch (err) {
        throw err;
    }
};

/**
 * `updateHatchedNBMon` updates the NBMon's blockchain data in Moralis.
 * Since previously after the NBMon was minted it gets added to Moralis, we now also
 * need to update the data in Moralis after the NBMon hatches in the blockchain to reflect its new data.
 * @param {Number} nbmonId the ID of the Genesis NBMon
 * @return {Object} an Object that shows 'OK' if the update is successful.
 */
const updateHatchedNBMon = async (nbmonId) => {
    try {
        // we get the nbmon from the blockchain.
        // Note: IMPORTANT. the nbmon needs to already be hatched and have its stats updated in the blockchain prior to this,
        // or else the updated stats will either remain the same, or worse, be completely off.
        const nbmon = await genesisContract.getNFT(nbmonId);
        const stringMetadata = nbmon[7];
        const numericMetadata = nbmon[8];

        // the numeric metadata obtained above will be in BigNumber format, which needs to be converted to a Number before updating it to Moralis.
        const convertedNumericMetadata = [];

        numericMetadata.forEach((metadata) => {
            const converted = parseInt(Number(metadata));
            convertedNumericMetadata.push(converted);
        });

        const boolMetadata = nbmon[9];

        const MintedNFTs = new Moralis.Query('MintedNFTs');
        // we ensure that we are querying for Genesis NBMons in the MintedNFTs class.
        MintedNFTs.equalTo('contractAddress', process.env.GENESIS_NBMON_TESTING_ADDRESS);
        MintedNFTs.equalTo('tokenId', nbmonId);

        const genesisNBMon = await MintedNFTs.first({ useMasterKey: true });

        if (genesisNBMon === undefined) {
            throw new Error('Genesis NBMon with given ID not found in database.');
        }

        genesisNBMon.set('stringMetadata', stringMetadata);
        genesisNBMon.set('numericMetadata', convertedNumericMetadata);
        genesisNBMon.set('boolMetadata', boolMetadata);

        await genesisNBMon.save(null, { useMasterKey: true });

        return {
            status: 'OK',
        };
    } catch (err) {
        throw err;
    }
};

module.exports = {
    generateSignature,
    randomizeHatchingStats,
    updateHatchedNBMon,
};


