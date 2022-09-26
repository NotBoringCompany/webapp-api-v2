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
 * @param {Number} nbmonId the ID of the NBMon
 * @param {String} minter the minter's address
 * @param {Number} bornAt the unix timestamp/block timestamp of when the NBMon was born
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


