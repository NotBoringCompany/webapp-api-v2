const moment = require('moment');
const Moralis = require('moralis-v1/node');
const { getWebAppTier } = require('../api/webapp/tierSystem');
const { getEvmAddress } = require('../utils/getAddress');
const { parseJSON } = require('../utils/jsonParser');
const { getWebAppTierBenefits, getClaimingFeeAndLimits } = require('../utils/webAppTiers');

/**
 * `claimingCheck` checks if claim is on cooldown, if the user can claim, and if the claim is within limits.
 * @param {String} currencyToClaim the currency to claim
 * @param {Float} amount the amount of the currency to claim
 * @param {Promise<String>} playfabId the playfab ID of the user
 */
const claimingCheck = async (currencyToClaim, amount, playfabId) => {
    try {
        // checks if claiming is on cooldown
        let onCooldown = true;
        // checks if canClaim is true
        let claimable = false;
        // checks if claiming amount is within user's web app tier limits
        let isWithinLimits = false;

        const address = await getEvmAddress(playfabId);

        const webAppData = new Moralis.Query('WebAppData');
        webAppData.equalTo('address', address);

        const result = await webAppData.first({ useMasterKey: true });

        if (!result) {
            throw new Error('User with given EVM address cannot be found in WebAppData');
        }

        // last claimed time in UNIX timestamp
        const lastClaimed = (parseJSON(result))[`lastx${currencyToClaim.toUpperCase()}ClaimTime`];

        const getTier = await getWebAppTier(address);

        if (getTier === undefined || getTier === '') {
            throw new Error('Please check the EVM address and its tier and ensure it exists in Moralis.');
        }

        const getCooldown = (getWebAppTierBenefits(getTier))['claimCooldown'];

        // it can be that the user has never claimed before. if so, this will return undefined or 0.
        // in this case, this check is completed.
        if (lastClaimed === undefined || lastClaimed === 0) {
            onCooldown = false;
        }

        if (lastClaimed + getCooldown <= moment().unix()) {
            onCooldown = false;
        }

        const isClaimable = (parseJSON(result))['canClaim'];
        if (isClaimable) {
            claimable = true;
        }

        if (currencyToClaim.toLowerCase() === 'xres') {
            const limits = {
                lowerLimit: (getClaimingFeeAndLimits(getTier))['minimumxRESClaim'],
                upperLimit: (getClaimingFeeAndLimits(getTier))['maximumxRESClaim'],
            };

            if (amount >= limits.lowerLimit && amount <= limits.upperLimit) {
                isWithinLimits = true;
            }
        } else if (currencyToClaim.toLowerCase() === 'xrec') {
            const limits = {
                lowerLimit: (getClaimingFeeAndLimits(getTier))['minimumxRECClaim'],
                upperLimit: (getClaimingFeeAndLimits(getTier))['maximumxRECClaim'],
            };

            if (amount >= limits.lowerLimit && amount <= limits.upperLimit) {
                isWithinLimits = true;
            }
        } else {
            throw new Error('Invalid currency. Please check if it is xREC or xRES.');
        }

        return {
            onCooldown: onCooldown,
            claimable: claimable,
            isWithinLimits: isWithinLimits,
        };
    } catch (err) {
        throw err;
    }
};

/**
 * `canDeposit` checks if the user is eligible to deposit.
 * @param {String} playfabId the playfab ID of the user
 * @return {Promise<Boolean>} true if the user can deposit, false if not
 */
const canDeposit = async (playfabId) => {
    try {
        let depositable = false;

        const webAppData = new Moralis.Query('WebAppData');
        webAppData.equalTo('playfabId', playfabId);

        const result = await webAppData.first({ useMasterKey: true });

        // instead of throwing an error, we check if result is undefined.
        // if it is, depositable will return false.
        if (!result) {
            // isDepositable can return `undefined`. therefore, we need to instantiate
            // a new variable before passing in the value into `depositable`.
            const isDepositable = (parseJSON(result))['canDeposit'];
            if (isDepositable) {
                depositable = true;
            }
        }

        return depositable;
    } catch (err) {
        throw err;
    }
};

module.exports = {
    claimingCheck,
    canDeposit,
};
