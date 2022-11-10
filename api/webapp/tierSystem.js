require('dotenv').config();
const Moralis = require('moralis-v1/node');
const ethers = require('ethers');
const fs = require('fs');
const path = require('path');
const { parseJSON } = require('../../utils/jsonParser');

// NOTE: The GenesisNBMon contract will only exist in ONE blockchain.
// This means that there is no need to specify multiple RPC URLs for dynamic interaction.
// Currently, this RPC URL is set to BSC Testnet for testing purposes, but it will most likely be on Ethereum.
const rpcUrl = process.env.BSC_RPC_URL;
const rpcProvider = new ethers.providers.JsonRpcProvider(rpcUrl);

// Genesis NBMon contract-related variables
const genesisABI = JSON.parse(
    fs.readFileSync(
        path.join(__dirname, '../../abi/GenesisNBMon.json'),
    ),
);

const genesisContract = new ethers.Contract(
    process.env.GENESIS_NBMON_ADDRESS,
    genesisABI,
    rpcProvider,
);

/**
 * `updateWebAppData` updates the user's web app data.
 * NOTE: This function should be scheduled and called at least a few times a day, or whenever applicable.
 * @param {String} address the EVM address of the user
 * @return {Object} an object with the tier, claim and deposit status if applicable, else an error is thrown.
 */
const updateWebAppData = async (address) => {
    try {
        const tier = await updateWebAppTier(address);
        const claim = await updateClaimEligibility(address);
        const deposit = await updateDepositEligibility(address);

        return {
            tierStatus: tier,
            claimStatus: claim,
            depositStatus: deposit,
        };
    } catch (err) {
        throw err;
    }
};

/**
 * `updateWebAppTier` updates the user's tier.
 * @param {String} address the EVM address of the user
 * @return {Object} an object with the status, object id and new tier if applicable, else an error is thrown.
 */
const updateWebAppTier = async (address) => {
    try {
        const webAppData = new Moralis.Query('WebAppData');
        webAppData.equalTo('address', address);

        const query = await webAppData.first({ useMasterKey: true });

        if (query === undefined) {
            throw new Error('User with given address not found in UserWebAppData');
        }

        const parsedQuery = parseJSON(query);

        // check the NFTs held
        const ownedNFTs = await getNftsOwned(address);

        // check the REC held
        /* eslint-disable-next-line */
        ///////////////////// TO DO! ///////////////////////////
        /* eslint-disable-next-line */
        ///////////////////// REC SMART CONTRACT NOT DEVELOPED YET, WILL READ DIRECTLY FROM CONTRACT ///////////
        const ownedREC = 0;

        // check the total REC deposit
        const RECDeposit = parsedQuery['totalRECDeposited'] === undefined ? 0 : parsedQuery['totalRECDeposited'];

        // check the monthly marketplace trading volume
        const monthlyVolume = parseInt(parsedQuery['monthlyTradingVolume']);

        let updatedTier;

        // TIER REQUIREMENTS ARE CURRENTLY HARDCODED!
        if (
            (monthlyVolume >= 200000 && ownedNFTs >= 50 && ownedREC >= 60000) ||
            RECDeposit >= 125000
        ) {
            updatedTier = 'grandee';
        } else if (
            (monthlyVolume >= 50000 && ownedNFTs >= 20 && ownedREC >= 15000) ||
            ownedREC >= 40000 ||
            RECDeposit >= 55000
        ) {
            updatedTier = 'magnate';
        } else if (
            (monthlyVolume >= 10000 && ownedNFTs >= 12) ||
            ownedREC >= 10000 ||
            RECDeposit >= 12500
        ) {
            updatedTier = 'tycoon';
        } else if (
            monthlyVolume >= 5000 || ownedNFTs >= 10 || ownedREC >= 2500 || RECDeposit >= 3000
        ) {
            updatedTier = 'merchant';
        } else if (
            ownedNFTs >= 3 || ownedREC >= 300 || RECDeposit >= 400
        ) {
            updatedTier = 'rustic';
        } else {
            updatedTier = 'newcomer';
        };

        query.set('webAppTier', updatedTier);

        let resultId;

        await query.save(null, { useMasterKey: true }).then((obj) => {
            resultId = obj.id;
        });

        return {
            status: 'OK',
            moralisObjId: resultId,
            newTier: updatedTier,
        };
    } catch (err) {
        throw err;
    }
};

/**
 * `updateClaimEligibility` updates the user's claim eligibility.
 * If a user was previously ineligible to claim because their web app tier was "newcomer" and hasn't met the required claiming requirements,
 * we can check again if they are now eligible to claim, either by:
 *
 * checking if the user is no longer a "newcomer", OR
 *
 * if they have met the requirements as a newcomer.
 *
 * IMPORTANT: ADDITIONALLY, THE USER NEEDS TO HAVE A PLAYFAB ID STORED IN MORALIS TO CLAIM. OTHERWISE, THEY CAN'T.
 * if the checks fail, `canClaim` will return false.
 * @param {String} address the EVM address of the user
 */
const updateClaimEligibility = async (address) => {
    try {
        const webAppData = new Moralis.Query('WebAppData');
        webAppData.equalTo('address', address);

        // can either be in Playfab or Moralis. For now, it's stored in Moralis.
        // NOTE: This query is now only for Realm Hunter. Once we produce more games in the future,
        // this check will change.
        const inGameData = new Moralis.Query('RealmHunterData');
        inGameData.equalTo('address', address);

        const InGameResult = await inGameData.first({ useMasterKey: true });
        const WebAppResult = await webAppData.first({ useMasterKey: true });

        if (InGameResult === undefined) {
            throw new Error('User with given address not found in RealmHunterData');
        }

        if (WebAppResult === undefined) {
            throw new Error('User with given address not found in WebAppData');
        }

        const parsedInGameResult = parseJSON(InGameResult);
        const parsedWebAppResult = parseJSON(WebAppResult);

        // first, we check their tier. if it's newcomer, we need to check if they meet the requirements.
        const tier = parsedWebAppResult['webAppTier'];
        const playfabId = parsedWebAppResult['playfabId'];
        const canClaim = parsedWebAppResult['canClaim'];

        // instead of throwing an error, it will return `claimAdditionalInfo` if `canClaim` shouldn't be changed.
        // if `canClaim` is changed, claimAdditionalInfo will be ''.
        let claimAdditionalInfo = '';

        // if the user wasn't able to claim before because `canClaim` is false, we do the checks.
        if (!canClaim) {
            // first we check if the user has a playfab id in moralis.
            if (!playfabId) {
                claimAdditionalInfo = 'Can\'t update claim eligibility. User needs to have a playfab ID stored before being able to claim.';
            } else {
                if (tier.toLowerCase() === 'newcomer') {
                    // currently, the threshold is set to at least:
                    // account level 60 or 1000 quests completed or 2000 PVP MMR. THIS WILL CHANGE!!!
                    if (
                        parsedInGameResult['accountLevel'] >= 60 ||
                        parsedInGameResult['questsCompleted'] >= 1000 ||
                        parsedInGameResult['pvpMMR'] >= 2000
                    ) {
                        WebAppResult.set('canClaim', true);
                    } else {
                        claimAdditionalInfo = 'Cannot update claim eligibility. User has not met the claim requirements.';
                    }
                } else {
                    WebAppResult.set('canClaim', true);
                }
            }
        // if the user was previously able to claim, we now check again if their tier has fallen back to newcomer or if they have a playfab id.
        } else {
            if (!playfabId) {
                WebAppResult.set('canClaim', false);
            } else {
                if (tier.toLowerCase() === 'newcomer') {
                    if (
                        parsedInGameResult['accountLevel'] >= 60 ||
                        parsedInGameResult['questsCompleted'] >= 1000 ||
                        parsedInGameResult['pvpMMR'] >= 2000
                    ) {
                        claimAdditionalInfo = 'User is already able to claim and has met the requirements again.';
                    } else {
                        WebAppResult.set('canClaim', false);
                    }
                } else {
                    claimAdditionalInfo = 'User is already able to claim and is not a newcomer.';
                }
            }
        }
        await WebAppResult.save(null, { useMasterKey: true });

        const claimStatus = claimAdditionalInfo !== '' ? 'OK' : 'See claimAdditionalInfo';

        return {
            claimStatus: claimStatus,
            claimAdditionalInfo: claimAdditionalInfo,
        };
    } catch (err) {
        throw err;
    }
};

/**
 * `updateDepositEligibility` updates the user's deposit eligibility.
 * @param {String} address the EVM address of the user
 * @return {Object} with `depositStatus` and `depositAdditionalInfo`
 */
const updateDepositEligibility = async (address) => {
    try {
        const webAppData = new Moralis.Query('WebAppData');
        webAppData.equalTo('address', address);

        const WebAppResult = await webAppData.first({ useMasterKey: true });
        if (!WebAppResult) {
            throw new Error('User with given address not found in WebAppData');
        }
        const parsedWebAppResult = parseJSON(WebAppResult);

        const canDeposit = parsedWebAppResult['canDeposit'];

        // instead of throwing an error, it will return `depositAdditionalInfo` if `canDeposit` shouldn't be changed.
        // if `canDeposit` is changed, depositAdditionalInfo will be ''.

        if (!canDeposit) {
            if (!playfabId) {
                depositAdditionalInfo = 'Can\'t update deposit eligibility. User needs to have a playfab ID stored before being able to deposit.';
            } else {
                WebAppResult.set('canDeposit', true);
            }
        } else {
            if (!playfabId) {
                WebAppResult.set('canDeposit', false);
            } else {
                depositAdditionalInfo = 'User is already able to deposit.';
            }
        }

        const depositStatus = depositAdditionalInfo !== '' ? 'OK' : 'See depositAdditionalInfo';

        WebAppResult.save(null, { useMasterKey: true });

        return {
            depositStatus: depositStatus,
            depositAdditionalInfo: depositAdditionalInfo,
        };
    } catch (err) {
        throw err;
    }
};

/**
 * `getWebAppTier` returns the user's web app tier.
 * @param {String} address the EVM address of the user
 * @return {String} the web app tier
 */
const getWebAppTier = async (address) => {
    try {
        const webAppData = new Moralis.Query('WebAppData');
        webAppData.equalTo('address', address);

        const query = await webAppData.first({ useMasterKey: true });

        if (!query) {
            throw new Error('User with given address not found in WebAppData');
        }

        let tier = parseJSON(query)['webAppTier'];

        // if tier is undefined or an empty string, we give them the newcomer tier
        if (tier === undefined || tier === '') {
            query.set('webAppTier', 'newcomer');

            await query.save(null, { useMasterKey: true });

            tier = 'newcomer';
        }
        return tier;
    } catch (err) {
        throw err;
    }
};

const getNftsOwned = async (address) => {
    try {
        let nftsHeld = 0;

        // ALL AVAILABLE NFTS WILL BE ADDED HERE WHEN MORE ARE IMPLEMENTED.
        const genesisNBMons = await genesisContract.balanceOf(address);
        const genesisNBMonsParsed = parseInt(genesisNBMons);

        nftsHeld += genesisNBMonsParsed;

        return nftsHeld;
    } catch (err) {
        throw err;
    }
};

module.exports = {
    updateWebAppData,
    getNftsOwned,
    updateWebAppTier,
    getWebAppTier,
    updateClaimEligibility,
    updateDepositEligibility,
};

