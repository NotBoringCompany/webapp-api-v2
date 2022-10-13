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
const { parseJSON } = require('../../utils/jsonParser');

/**
 * `saveHatchingSignature` saves the newly generated hatching signature of ANY hatchable NFT (not only NBMons) to Moralis.
 * This signature is used to be checked later after the hatching has finished.
 * This method is a part of adding a 'hatching event' to the user's activities list.
 * For more information, see `addToActivities`, `checkHatchingSignatureValid` and `invalidateHatchingSignature`.
 * @param {String} nftName the name of the NFT that the signature belongs to. (e.g. `genesisNbmon`).
 * @param {String} signature the signature obtained by calling `hatchingHash` and signing it with the minter's private key.
 * @return {Object} an OK status if the saving is successful.
 */
const saveHatchingSignature = async (nftName, signature) => {
    try {
        const HatchingSignatures = Moralis.Object.extend('HatchingSignatures');
        const hatchingSignatures = new HatchingSignatures();

        hatchingSignatures.set('signature', signature);
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
 * @param {string} network the blockchain network the activity was conducted in.
 * @param {String} txHash the transaction hash of the activity.
 * @return {Object} an object that contains `valid`, `data` and `decodedSignature`.
 */
const checkHatchingSignatureValid = async (network, txHash) => {
    try {
        let Transactions;

        // if the network is Ethereum (Mainnet/Testnet)
        if (network.toLowerCase().contains('eth')) {
            Transactions = new Moralis.Query('EthTransactions');
        // if the network is Matic (Mainnet/Testnet)
        } else if (network.toLowerCase().contains('polygon') || network.toLowerCase().contains('matic')) {
            Transactions = new Moralis.Query('PolygonTransactions');
        // if the network is BSC/BNB Chain (Mainnet/Testnet)
        } else if (network.toLowerCase().contains('bsc')) {
            Transactions = new Moralis.Query('BscTransactions');
        // if the network is Cronos (Mainnet/Testnet)
        } else if (network.toLowerCase().contains('cronos')) {
            Transactions = new Moralis.Query('CronosTransactions');
        // if none of the networks match, Moralis currently doesn't support the network
        // (and maybe also the fact that our NFTs haven't went to that chain yet)
        } else {
            return {
                valid: false,
                data: null,
                decodedSignature: null,
            };
        }

        Transactions.equalTo('hash', txHash);
        const transactions = await Transactions.first({ useMasterKey: true });

        if (transactions === undefined) {
            return {
                valid: false,
                data: null,
                decodedSignature: null,
            };
        };

        const transactionsResult = parseJSON(transactions);

        // checks from all hatching signatures that are valid
        const HatchingSignatures = new Moralis.Query('HatchingSignatures');
        const decodedInput = decoder.decodeData(transactionsResult.input);
        // this is the hatching signature obtained from the transaction input
        const sigFromTxInput = decodedInput.inputs[0];

        // here we check for two validities: that the signature matches and that `addedToActivities` is false.
        HatchingSignatures.equalTo('signature', sigFromTxInput);
        HatchingSignatures.equalTo('addedToActivities', false);

        const hatchingSignatures = await HatchingSignatures.first({ useMasterKey: true });

        // if the query is NOT empty and if the method is `hatchFromEgg`, the hatching signature is valid.
        if (hatchingSignatures !== undefined && decodedInput.method === 'hatchFromEgg') {
            return {
                valid: true,
                data: transactionsResult,
                decodedSignature: sigFromTxInput,
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
 * @param {String} txHash the blockchain transaction hash of the activity (e.g. minting/hatching a Genesis NBMon)
 * @param {String} txType the type of activity (e.g. Genesis NBMon minting/hatching)
 * @param {String} network the blockchain network the activity happened on (e.g. Ethereum Mainnet, abbreviated to 'eth').
 * @param {Number} txValue the transaction value (if any, otherwise 0, example when transferring someone some ETH)
 * @return {Object} an object that shows 'OK' if the activity is successfully added and no errors are thrown.
 */
/* eslint-enable */
const addToActivities = async (txHash, txType, network, txValue) => {
    try {
        // lowercase check for flexibility in small mistypes.
        // if the tx type is genesis nbmon minting
        if (txType.toLowerCase() === 'genesisminting') {
            let NFTTransfers;

            // if the activity is done in Ethereum (Mainnet/Testnet), it automatically gets added to
            // `EthNFTTransfers`, in Moralis.
            if (network.toLowerCase().includes('eth')) {
                NFTTransfers = new Moralis.Query('EthNFTTransfers');
            } else if (network.toLowerCase().includes('matic') || network.toLowerCase().includes('polygon')) {
                NFTTransfers = new Moralis.Query('PolygonNFTTransfers');
            } else if (network.toLowerCase().includes('bsc')) {
                NFTTransfers = new Moralis.Query('BscNFTTransfers');
            } else if (network.toLowerCase().includes('cronos')) {
                NFTTransfers = new Moralis.Query('CronosNFTTransfers');
            } else if (network.toLowerCase().includes('avax')) {
                // Note: Since we haven't had 1 transaction in AVAX, I'm unsure if it is `AvaxNFTTransfers` or `AvalancheNFTTransfers`.
                // This will be updated accordingly.
                NFTTransfers = new Moralis.Query('AvaxNFTTransfers');
            } else {
                throw new Error('Network not supported or `unknown`. For now, only ETH, MATIC, BSC, CRONOS and AVAX are supported in Moralis.');
            }

            NFTTransfers.equalTo('transaction_hash', txHash);
            const nftTransfers = await NFTTransfers.first({ useMasterKey: true });

            if (nftTransfers === undefined) {
                throw new Error('Either the transaction hash is invalid or is not added yet to Moralis. Please check again later.');
            }

            const result = parseJSON(nftTransfers);

            /* eslint-disable-next-line */
            const { from_address, to_address, block_timestamp } = result;

            // after obtaining the three variables above, we are now ready to plug it into our custom UserActivities class.
            const Activities = Moralis.Object.extend('UserActivities');
            const activities = new Activities();

            // to_address is the user, which in this case is the 'owner' of the activity.
            activities.set('activityOwnerAddress', to_address);
            activities.set('fromAddress', from_address);
            activities.set('toAddress', to_address);
            activities.set('txHash', txHash);
            activities.set('txType', txType);
            activities.set('network', network);
            activities.set('txValue', txValue);
            activities.set('timestamp', block_timestamp);
            activities.set('nftName', 'genesisNbmon');
            activities.set('nftContractAddress', process.env.GENESIS_NBMON_ADDRESS);

            await activities.save(null, { useMasterKey: true });
        // if the tx type is genesis nbmon hatching
        } else if (txType.toLowerCase() === 'genesishatching') {
            const hatchingSignature = await checkHatchingSignatureValid(network, txHash);

            // we destructure the object obtained from `hatchingSignature` to get the three variables
            const { valid, data, decodedSignature } = hatchingSignature;

            if (valid) {
                /* eslint-disable-next-line */
                const { from_address, to_address, block_timestamp } = data;

                // after obtaining the three variables above, we are now ready to plug it into our custom UserActivities class.
                const Activities = Moralis.Object.extend('UserActivities');
                const activities = new Activities();

                // in this case, the owner is the one hatching the egg, which means that the `fromAddress` should be the owner.
                activities.set('activityOwnerAddress', from_address);
                activities.set('fromAddress', from_address);
                activities.set('toAddress', to_address);
                activities.set('txHash', txHash);
                activities.set('txType', txType);
                activities.set('network', network);
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
