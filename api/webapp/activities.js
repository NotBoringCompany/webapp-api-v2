/* eslint linebreak-style: ["error", "windows"] */
require('dotenv').config();

// instead of importing the ABI similar to other files using
// JSON.parse(fs.readFileSync()), we want to decode the ABI using the
// Ethereum Decoder to try and match the hash obtained from the
// blockchain data hashes, such as in `checkHatchingSignatureValid`.
const InputDataDecoder = require('ethereum-input-data-decoder');
const genesisABI = require(`${__dirname}/../../abi/genesisNBMon.json`);

const decoder = new InputDataDecoder(genesisABI);

const Moralis = require('moralis-v1/node');

/**
 * `saveHatchingSignature` saves the newly generated hatching signature of ANY hatchable NFT (not only NBMons) to Moralis.
 * This signature is used to be checked later after the hatching has finished.
 * This method is a part of adding a 'hatching event' to the user's activities list.
 * For more information, see `addToActivities`, `checkHatchingSignatureValid` and `invalidateHatchingSignature`.
 * @param {String} nftName the name of the NFT that the signature belongs to. (e.g. `genesisNbmon`).
 * @param {Object} blockchain the blockchain network the hatching happened in.
 * @param {String} signature the signature obtained by calling `hatchingHash` and signing it with the minter's private key.
 * @return {Object} an OK status if the saving is successful.
 */
const saveHatchingSignature = async (nftName, blockchain, signature) => {
    try {
        const HatchingSignatures = Moralis.Object.extend('HatchingSignatures');
        const hatchingSignatures = new HatchingSignatures();

        hatchingSignatures.set('signature', signature);
        hatchingSignatures.set('blockchain', blockchain);
        hatchingSignatures.set('addedToActivities', false);
        hatchingSignatures.set('nftName', nftName);

        await hatchingSignatures.save(null, { useMasterKey: true });

        return {
            status: 'OK',
        };
    } catch (err) {
        throw err;
    }
};

/**
 * `checkHatchingSignatureValid` checks if the hatching signature obtained from generating it is valid.
 * Valid here means:
 * 1. An egg has been hatched with that signature AND
 * 2. this hatching 'event' hasn't been added to the user's activity list yet.
 * this object contains both the `name` and the `chainId` of the network, since some network names are unrecognized by ethers.
 * @param {Object} tx the transaction object of the activity.
 * @return {Object} an object that contains `valid`, `data` and `decodedSignature`.
 */
const checkHatchingSignatureValid = async (tx) => {
    try {
        // we get the data input for the transaction
        const txData = tx.data;

        // checks from all hatching signatures that are valid
        const HatchingSignatures = new Moralis.Query('HatchingSignatures');
        const decodedInput = decoder.decodeData(txData);
        // this is the hatching signature obtained from the transaction input
        const sigFromTxData = decodedInput.inputs[0];

        // here we check for two validities: that the signature matches and that `addedToActivities` is false.
        HatchingSignatures.equalTo('signature', sigFromTxData);
        HatchingSignatures.equalTo('addedToActivities', false);

        const hatchingSignatures = await HatchingSignatures.first({ useMasterKey: true });

        // if the query is NOT empty and if the method is `hatchFromEgg`, the hatching signature is valid.
        if (hatchingSignatures !== undefined && decodedInput.method === 'hatchFromEgg') {
            return {
                valid: true,
                data: tx,
                decodedSignature: sigFromTxData,
            };
        }

        // otherwise, we will return false for `valid` and null for `data` and `decodedSignature`.
        return {
            valid: false,
            data: null,
            decodedSignature: null,
        };
    } catch (err) {
        throw err;
    }
};

/**
 * `invalidateHatchingSignature` invalidates the hatching signature in the `HatchingSignatures` class
 * by changing the `addedToActivities` field to true.
 * This ensures that no same activity can be added more than once.
 * @param {String} signature the hatching signature to be invalidated.
 * @return {Object} an object with an 'OK' status if the invalidation is successful.
 */
const invalidateHatchingSignature = async (signature) => {
    try {
        const HatchingSignatures = new Moralis.Query('HatchingSignatures');
        HatchingSignatures.equalTo('signature', signature);

        const hatchingSignatures = await HatchingSignatures.first({ useMasterKey: true });

        if (hatchingSignatures === undefined) {
            throw new Error('Hatching signature not found in database. Please check that the signature exists.');
        }

        hatchingSignatures.set('addedToActivities', true);

        await hatchingSignatures.save(null, { useMasterKey: true });

        return {
            status: 'OK',
        };
    } catch (err) {
        throw err;
    }
};

/* eslint-disable */
/**
 * `addToActivities` adds an activity to the Activities class in Moralis.
 * This is used to keep track of each user's activities.
 * Anytime a user does something in the web app that produces a certain transaction
 * (mostly blockchain, but could also be non-blockchain), this method gets called.
 * 
 * Note: Currently, `addToActivities` only supports chains that are supported by Moralis. This includes:
 * ETH, BSC, MATIC, CRONOS and AVAX. Other chains will need to have a special function dedicated to them. Work in progress.
 * 
 * @param {Object} tx the blockchain transaction object of the activity (e.g. minting/hatching a Genesis NBMon)
 * @param {String} txType the type of activity (e.g. Genesis NBMon minting/hatching)
 * @param {Object} blockchain the blockchain network the activity happened on (e.g. Ethereum Mainnet, abbreviated to 'eth').
 * this object contains both the `name` and the `chainId` of the network, since some network names are unrecognized by ethers.
 * @param {Number} txValue the transaction value (if any, otherwise 0, example when transferring someone some ETH)
 * @param {String} toAddress the `to` address for this activity. for hatching/minting, `toAddress` is the owner.
 * @param {Number} timestamp the block timestamp of the signed transaction
 * @return {Object} an object that shows 'OK' if the activity is successfully added and no errors are thrown.
 */
/* eslint-enable */
const addToActivities = async (tx, txType, blockchain, txValue, toAddress, timestamp) => {
    try {
        // lowercase check for flexibility in small mistypes.
        // if the tx type is genesis nbmon minting
        if (txType.toLowerCase() === 'genesisminting') {
            // the tx hash
            const txHash = tx.hash;
            // from address for minting is always from the `dead address`
            const fromAddress = '0x0000000000000000000000000000000000000000';

            // we are going to plug the data into our custom UserActivities class.
            const Activities = Moralis.Object.extend('UserActivities');
            const activities = new Activities();

            // in this case, `fromAddress` will be the dead address and `toAddress` is the owner of the nbmon.
            activities.set('activityOwnerAddress', toAddress);
            activities.set('fromAddress', fromAddress);
            activities.set('toAddress', toAddress);
            activities.set('txHash', txHash);
            activities.set('txType', txType);
            activities.set('blockchain', blockchain);
            activities.set('txValue', txValue);
            activities.set('timestamp', timestamp);
            activities.set('nftName', 'genesisNbmon');
            activities.set('nftContractAddress', process.env.GENESIS_NBMON_ADDRESS);

            await activities.save(null, { useMasterKey: true });
        // if the tx type is genesis nbmon hatching
        } else if (txType.toLowerCase() === 'genesishatching') {
            const hatchingSignature = await checkHatchingSignatureValid(tx);

            // we destructure the object obtained from `hatchingSignature` to get the three variables
            const { valid, decodedSignature } = hatchingSignature;

            if (valid) {
                const hash = tx.hash;

                // after obtaining the three variables above, we are now ready to plug it into our custom UserActivities class.
                const Activities = Moralis.Object.extend('UserActivities');
                const activities = new Activities();

                // in this case, `both fromAddress` and `toAddress` are the owner of the nbmon (since hatching is not a transfer).
                activities.set('activityOwnerAddress', toAddress);
                activities.set('fromAddress', toAddress);
                activities.set('toAddress', toAddress);
                activities.set('txHash', hash);
                activities.set('txType', txType);
                activities.set('blockchain', blockchain);
                activities.set('txValue', txValue);
                activities.set('timestamp', block_timestamp);

                await activities.save(null, { useMasterKey: true });

                // after adding the hatching activity to `UserActivities`, we are now ready to invalidate the hatching signature
                // from ever being able to be used again.
                await invalidateHatchingSignature(decodedSignature);

                return {
                    status: 'OK',
                    message: 'Activity successfully added.',
                };
            } else {
                throw new Error('Hatching signature is invalid. Please check the signature again.');
            }
        } else {
            // Note: When more activities are implemented, this code will be updated to include them.
            throw new Error('No other activity is implemented yet as of now. Only `genesisMinting` and `genesisHatching` are allowed.');
        }
    } catch (err) {
        throw err;
    }
};

module.exports = {
    saveHatchingSignature,
    checkHatchingSignatureValid,
    invalidateHatchingSignature,
    addToActivities,
};
