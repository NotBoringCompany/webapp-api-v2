require('dotenv').config();

const Moralis = require('moralis-v1/node');

/**
 * `saveHatchingSignature` saves the newly generated hatching signature of ANY hatchable NFT (not only Genesis NBMons or NBMons in general) to Moralis.
 * This signature is used to be checked later after the hatching has finished. 
 * This method is a part of adding a 'hatching event' to the user's activities list.
 * For more information, see `addToActivities`, `checkHatchingSignatureValid` and `invalidateHatchingSignature`.
 * @param {String} signature the signature obtained by calling `hatchingHash` and signing it with the minter's private key.
 * @returns {Object} an OK status if the saving is successful.
 */
const saveHatchingSignature = async (signature) => {
    try {
        const HatchingSignatures = Moralis.Object.extend('HatchingSignatures');
        const hatchingSignatures = new HatchingSignatures();

        hatchingSignatures.set('signature', signature);
        hatchingSignatures.set('addedToActivities', false);

        await hatchingSignatures.save(null, { useMasterKey: true });

        return {
            status: 'OK'
        }
    } catch (err) {
        throw err;
    }
}

const addToActivities = async (
    txHash,
    txType,
    network,
    value
)

module.exports = {
    saveHatchingSignature
}