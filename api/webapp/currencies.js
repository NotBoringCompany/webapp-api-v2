require('dotenv').config();
const moment = require('moment');
const ethers = require('ethers');
const Moralis = require('moralis-v1/node');
const fs = require('fs');
const path = require('path');
const { parseJSON } = require('../../utils/jsonParser');
const { getWebAppTier, getNftsOwned } = require('./tierSystem');
const { getWebAppTierBenefits, getClaimingFeeAndLimits } = require('../../utils/webAppTiers');
const { getEvmAddress } = require('../../utils/getAddress');
const axios = require('axios').default;

const titleId = process.env.PLAYFAB_TITLE_ID;
const xSecretKey = process.env.PLAYFAB_XSECRETKEY;

// CHANGE TO PROPER ADMIN LATER!
const privateKey = process.env.ADMIN_PRIVATE_KEY;
const adminAddress = process.env.TEST_ADMIN_ADDRESS;

const rpcUrl = process.env.BSC_RPC_URL;
const rpcProvider = new ethers.providers.JsonRpcProvider(rpcUrl);

// Realm Shards related variables.
// NOTE: Realm Shards is now deployed in BSC TESTNET. This will be for testing purposes and will change to a mainnet (not necessarily BSC).
const resABI = JSON.parse(
    fs.readFileSync(
        path.resolve(__dirname, '../../abi/realmShards.json'),
    ),
);
const resContract = new ethers.Contract(
    process.env.REALM_SHARDS_ADDRESS,
    resABI,
    rpcProvider,
);

/**
 * `getAllWebAppData` gets all web app related data.
 * @param {String} address the EVM address of the user
 * @return {Object} with all web app related data
 */
const getAllWebAppData = async (address) => {
    try {
        const webAppData = new Moralis.Query('WebAppData');
        webAppData.equalTo('address', address);

        const result = await webAppData.first({ useMasterKey: true });

        if (!result) {
            throw new Error('User with given EVM address does not exist in WebAppData');
        }

        const playfabId = parseJSON(result)['playfabId'];

        if (!playfabId) {
            throw new Error('Cannot fully query without Playfab ID. Please require the user to add a playfab ID using `addPlayfabId`.');
        }

        // get RES allowance of the user
        const resAllowance = await getRESAllowance(ethAddress);
        // get owned xRES of user (from playfab account)
        const ownedxRES = await getOwnedxRESFromAddress(ethAddress);
        // get owned RES of user (from blockchain)
        const ownedRES = await getOwnedRES(ethAddress);
        // get user RES transactions (total RES deposited + xRES claimed)
        const resTransactions = await userRESTransactions(ethAddress);
        // get user's claim cooldown time for xRES and xREC
        const claimCooldown = await getClaimCooldown(ethAddress);
        // get user's web app tier
        const webAppTier = await getWebAppTier(ethAddress);
        // get nfts owned by user
        const nftsOwned = await getNftsOwned(address);
        // get user's claiming fee and limits
        const claimingInfo = getClaimingFeeAndLimits(webAppTier);
        // get all web app tier benefits of user
        const webAppTierBenefits = getWebAppTierBenefits(webAppTier);

        return {
            resAllowance: resAllowance,
            ownedxRES: ownedxRES,
            ownedRES: ownedRES,
            resTransactions: resTransactions,
            claimCooldown: claimCooldown,
            webAppTier: webAppTier,
            nftsOwned: nftsOwned,
            claimingInfo: claimingInfo,
            webAppTierBenefits: webAppTierBenefits,
        };
    } catch (err) {
        throw err;
    }
};

/**
 * `getRESAllowance` gets the allowance amount of `adminAddress` to spend on behalf of `address`.
 * @param {String} address the EVM address of the user
 * @return {Number} the allowance amount
 */
const getRESAllowance = async (address) => {
    try {
        const allowance = await resContract.allowance(address, adminAddress);

        return parseInt(allowance);
    } catch (err) {
        throw err;
    }
};

/**
 * `getPlayfabClaimingData` gets the address and owned xRES of the user.
 * @param {String} playfabId the PlayFab ID of the user
 * @return {Object} an object with the address and owned xRES.
 */
const getPlayfabClaimingData = async (playfabId) => {
    try {
        const headers = {
            'X-SecretKey': xSecretKey,
        };
        const data = {
            playFabId: playfabId,
        };

        let address;
        let ownedxRES;

        if (!playfabId) {
            ownedxRES = 0;
        }

        await axios
            .post(
                `https://${titleId}.playfabapi.com/Admin/GetUserReadOnlyData`,
                data,
                {
                    headers: headers,
                },
            )
            .then((response) => {
                ownedxRES = parseFloat(response.data.data['Data']['xRES']['Value']);
            });

        await axios
            .post(
                `https://${titleId}.playfabapi.com/Admin/GetUserInternalData`,
                data,
                {
                    headers: headers,
                },
            )
            .then((response) => {
                address = response.data.data['Data']['ethAddress']['Value'];
            });

        return {
            address: address,
            ownedxRES: ownedxRES,
        };
    } catch (err) {
        if (err.response) {
            throw new Error(`Error: ${err.response.data.errorMessage}`);
        } else if (err.request) {
            throw new Error(`Error: ${err.request.data.errorMessage}`);
        } else {
            throw new Error(`Error: ${err.message}`);
        }
    }
};

/**
 * `getOwnedxRES` gets the owned xRES of the user.
 * @param {String} playfabId the PlayFab ID of the user
 * @return {Float} the owned xRES
 */
const getOwnedxRES = async (playfabId) => {
    try {
        const headers = {
            'X-SecretKey': xSecretKey,
        };
        const data = {
            playFabId: playfabId,
        };

        let ownedxRES;

        if (!playfabId) {
            ownedxRES = 0;
        } else {
            await axios
                .post(
                    `https://${titleId}.playfabapi.com/Admin/GetUserReadOnlyData`,
                    data,
                    {
                        headers: headers,
                    },
                )
                .then((response) => {
                    ownedxRES = parseFloat(response.data.data['Data']['xRES']['Value']);
                });
        }

        return ownedxRES;
    } catch (err) {
        if (err.response) {
            throw new Error(`Error: ${err.response.data.errorMessage}`);
        } else if (err.request) {
            throw new Error(`Error: ${err.request.data.errorMessage}`);
        } else {
            throw new Error(`Error: ${err.message}`);
        }
    }
};

/**
 * `getOwnedxRESFromAddress` gets the owned xRES of the user from the address.
 * @param {String} address the EVM address of the user
 * @return {Float} the owned xRES
 */
const getOwnedxRESFromAddress = async (address) => {
    try {
        const webAppData = new Moralis.Query('WebAppData');
        webAppData.equalTo('address', address);

        const result = await webAppData.first({ useMasterKey: true });

        if (!result) {
            throw new Error('User with given EVM address not found in WebAppData');
        }

        const playfabId = parseJSON(result)['playfabId'];

        let ownedxRES;

        if (!playfabId) {
            ownedxRES = 0;
        } else {
            ownedxRES = await getOwnedxRES(playfabId);
        }

        return ownedxRES;
    } catch (err) {
        throw err;
    }
};

/**
 * `getOwnedRES` gets the owned RES of the user from the blockchain.
 * @param {String} address the EVM address of the user
 * @return {Float} the owned RES
 */
const getOwnedRES = async (address) => {
    try {
        const ownedRES = await resContract.balanceOf(address);

        return parseFloat(ethers.utils.formatUnits(ownedRES));
    } catch (err) {
        throw err;
    }
};

/**
 * `userRESTransactions` gets the user's total RES deposited and xRES claimed.
 * @param {String} address the EVM address of the user
 * @return {Object} an object with the total RES deposited and xRES claimed.
 */
const userRESTransactions = async (address) => {
    try {
        const webAppData = new Moralis.Query('WebAppData');
        webAppData.equalTo('address', address);

        const result = await webAppData.first({ useMasterKey: true });

        if (!result) {
            throw new Error('User with given EVM address not found in WebAppData');
        }

        const totalxRESClaimed = parseJSON(result)['totalxRESClaimed'];
        const totalRESDeposited = parseJSON(result)['totalRESDeposited'];

        let claimed;
        let deposited;

        if (totalxRESClaimed === undefined || totalxRESClaimed === null) {
            claimed = 0;
        } else {
            claimed = totalxRESClaimed;
        }

        if (totalRESDeposited === undefined || totalRESDeposited === null) {
            deposited = 0;
        } else {
            deposited = totalRESDeposited;
        }

        return {
            totalxRESClaimed: claimed,
            totalRESDeposited: deposited,
        };
    } catch (err) {
        throw err;
    }
};

/**
 * `getClaimCooldown` gets the claim cooldown time for both xRES and xREC.
 * @param {String} address the EVM address of the user
 */
const getClaimCooldown = async (address) => {
    try {
        const webAppData = new Moralis.Query('WebAppData');
        webAppData.equalTo('address', address);

        const result = await webAppData.first({ useMasterKey: true });

        if (!result) {
            throw new Error('User with given EVM address not found in WebAppData');
        }

        let xRESCooldown;
        let xRECCooldown;

        // we're checking the last time they've claimed xRES/xREC
        const lastxRESClaimTime = parseJSON(result)['lastxRESClaimTime'];
        const lastxRECClaimTime = parseJSON(result)['lastxRECClaimTime'];

        if (
            lastxRESClaimTime === undefined ||
            lastxRESClaimTime === null ||
            lastxRESClaimTime === 0
        ) {
            xRESCooldown = 0;
        }

        if (
            lastxRECClaimTime === undefined ||
            lastxRECClaimTime === null ||
            lastxRECClaimTime === 0
        ) {
            xRECCooldown = 0;
        }

        // we now get their tier which in return will give the respective cooldowns for both xRES and xREC.
        const webAppTier = await getWebAppTier(address);
        const claimCooldown = getWebAppTierBenefits(webAppTier)['claimCooldown'];

        const now = moment().unix();

        // these checks should pass anyway, but we want to double check.
        // if either xRESCooldown/xRECCooldown is < 0, then the cooldown is automatically set to 0,
        // meaning that they can already claim.
        if ( now > lastxRESClaimTime) {
            xRESCooldown = claimCooldown - (now - lastxRESClaimTime);
            if (xRESCooldown < 0) {
                xRESCooldown = 0;
            }
        }

        if ( now > lastxRECClaimTime) {
            xRECCooldown = claimCooldown - (now - lastxRECClaimTime);
            if (xRECCooldown < 0) {
                xRECCooldown = 0;
            }
        }

        return {
            xRESCooldown: xRESCooldown,
            xRECCooldown: xRECCooldown,
        };
    } catch (err) {
        throw err;
    }
};

/**
 * `claimxRES` converts the user's xRES and mints RES in the blockchain to the user's address (claims it).
 * @param {Float} amount the amount of RES to be claimed
 * @param {String} playfabId the PlayFab ID of the user
 * @return {Object} an object with several status messages if everything is okay.
 */
const claimxRES = async (amount, playfabId) => {
    try {
        // gets the user's EVM address and current owned xRES.
        const { address, ownedxRES } = await getPlayfabClaimingData(playfabId);

        const headers = {
            'X-SecretKey': xSecretKey,
        };
        const data = {
            playFabId: playfabId,
            Data: {
                xRES: ownedxRES - amount,
            },
        };

        // if the user doesn't have enough xRES, we throw an error.
        if (ownedxRES < amount) {
            throw new Error('Not enough xRES to claim');
        }

        // get the current owned RES (blockchain value) of the user
        const currentOwnedRES = await resContract.balanceOf(address);

        // MIDDLEWARE CHECKS (CAN CLAIM + CLAIMING COOLDOWN + LIMITS)
        /* eslint-disable-next-line */
        ///////////////////////// TO DO!!!!!!!!! /////////////////////////
        const { onCooldown, claimable, isWithinLimits } = await claimingCheck(
            'xres',
            amount,
            playfabId,
        );

        if (!claimable) {
            throw new Error(
                'User can\'t claimable. ENsure that the user is of eligible tier or meets the requirements if they\'re a newcomer',
            );
        }
        if (onCooldown) {
            throw new Error('Claiming is on cooldown. Try again later.');
        }
        if (!isWithinLimits) {
            throw new Error('Claiming outside of tier limits. Try with an amount within the tier bounds');
        }

        const webAppData = new Moralis.Query('WebAppData');
        webAppData.equalTo('address', address);

        const result = await webAppData.first({ useMasterKey: true });

        if (!result) {
            throw new Error('User with given EVM address not found in WebAppData');
        }

        // claiming RES means minting it in the blockchain to the user.
        // first, we calculate the fees depending on the tier.
        const tier = parseJSON(result)['webAppTier'];
        const fee = (getClaimingFeeAndLimits(tier)['claimFee'] * amount) / 100;

        const mintToUser = amount - fee;
        // right now, for testing purposes, it's being sent to `admin`.
        // this will change to `treasury` later on!!
        const mintToAdmin = fee;

        const signer = new ethers.Wallet(privateKey, rpcProvider);
        const mintTo = address;

        const userMint = await resContract.populateTransaction.mint(
            mintTo,
            ethers.utils.parseEther(mintToUser.toString()),
        );

        const adminMint = await resContract.populateTransaction.mint(
            adminAddress,
            ethers.utils.parseEther(mintToAdmin.toString()),
        );

        const responseUser = await signer.sendTransaction(userMint);
        await responseUser.wait();

        // note that we don't need to wait() here, to reduce the runtime of this code.
        // most important thing is that the user already gets the amount he claimed.
        const responseAdmin = await signer.sendTransaction(adminMint);

        // we now check again for the new RES balance of the user after minting.
        // if it's not the same as the original one, we can continue.
        const renewedOwnedRES = await resContract.balanceOf(address);

        if (renewedOwnedRES === currentOwnedRES) {
            throw new Error('Error during minting RES. Amount is still the same. Please try again');
        }

        // if there are no issues with minting, we will then deduct the respective RES from the user's playfab account.
        let responseCode;
        let responseStatus;

        await axios
            .post(
                `https://${titleId}.playfabapi.com/Admin/UpdateUserReadOnlyData`,
                data,
                {
                    headers: headers,
                },
            )
            .then((response) => {
                responseCode = response.data.code;
                responseStatus = response.data.status;
            });
        // now, we will also update the `lastRESClaimTIme` in moralis to the current unix timestamp.
        // we will also update the total RES claim amount.
        const now = moment().unix();
        result.set('lastxRESClaimTime', now);

        const currentxRESClaim = parseJSON(result)['totalxRESClaimed'];

        if (
            currentxRESClaim === undefined ||
            currentxRESClaim === null ||
            currentxRESClaim === 0
        ) {
            result.set('totalxRESClaimed', parseFloat(amount));
        } else {
            const updatedxRESClaim = currentxRESClaim + parseFloat(amount);
            result.set('totalxRESClaimed', updatedxRESClaim);
        }

        result.save(null, { useMasterKey: true });

        return {
            playfabResponseCode: responseCode,
            playfabResponseStatus: responseStatus,
            mintToUser: responseUser.hash,
            mintToAdmin: responseAdmin.hash,
            moralisSaved: 'OK',
        };
    } catch (err) {
        if (err.response) {
            throw new Error(`Error: ${err.response.data.errorMessage}`);
        } else if (err.request) {
            throw new Error(`Error: ${err.request.data.errorMessage}`);
        } else {
            throw new Error(`Error: ${err.message}`);
        }
    }
};

/**
 * `depositRES` deposits the user's RES for xRES from the blockchain to their playfab accounts.
 * @param {Float} amount the amount of RES to be deposited
 * @param {String} playfabId the PlayFab ID of the user
 * @return {Object} with several status messages if everything is okay.
 */
const depositRES = async (amount, playfabId) => {
    try {
        const currentOwnedxRES = await getOwnedxRES(playfabId);
        const address = await getEvmAddress(playfabId);

        const currentOwnedRES = parseFloat(await resContract.balanceOf(address));

        if (amount > currentOwnedRES) {
            throw new Error('Not enough RES to deposit');
        }

        const headers = {
            'X-SecretKey': xSecretKey,
        };
        const data = {
            playFabId: playfabId,
            Data: {
                xRES: currentOwnedxRES + amount,
            },
        };

        // MIDDLEWARE CHECK (CANDEPOSIT)
        const depositable = await canDeposit(playfabId);
        if (!depositable) {
            throw new Error('User can\'t deposit RES. Ensure they have a playfab ID.');
        }

        // now we will deposit the RES to the NBExchequer contract.
        // NOTE: THIS WILL NOW DEPOSIT TO ADMIN ACCOUNT FIRST SINCE WE DON'T
        // HAVE AN NBEXCHEQUER CONTRACT YET.
        const signer = new ethers.Wallet(privateKey, rpcProvider);

        // The user needs to already allow admin to have access to their wallet
        // to remove RES for depositing. Here, we check if the user has given at least
        // enough allowance (>= amount) for the admin to take from their wallet.
        // Otherwise, an error gets thrown.
        const allowance = await getRESAllowance(address);

        if (allowance < ethers.utils.formatUnits(amount.toString(), 'wei')) {
            throw new Error(
                'User has not given enough allowance for admin to take from their wallet',
            );
        }

        const depositData = await resContract.populateTransaction.transferFrom(
            address,
            adminAddress,
            ethers.utils.parseEther(amount.toString()),
        );

        const response = await signer.sendTransaction(depositData);
        await response.wait();

        // now we check if the user's owned RES has changed. if it has, we assume it has worked and we will
        // then deposit the RES to the user's playfab account.

        const renewedOwnedRES = await resContract.balanceOf(address);
        if (renewedOwnedRES === currentOwnedRES) {
            throw new Error('Error during depositing RES. Amount is still the same. Please try again');
        }

        // if there are no issues with depositing, we will then increase the respective xRES to the user's playfab account
        let responseCode;
        let responseStatus;

        await axios
            .post(
                `https://${titleId}.playfabapi.com/Admin/UpdateUserReadOnlyData`,
                data,
                {
                    headers: headers,
                },
            )
            .then((response) => {
                responseCode = response.data.code;
                responseStatus = response.data.status;
            });

        const webAppData = new Moralis.Query('WebAppData');
        webAppData.equalTo('address', address);

        const result = await webAppData.first({ useMasterKey: true });

        if (!result) {
            throw new Error('User with given EVM address not found in Moralis.');
        }

        const getRESDeposit = parseJSON(result)['totalRESDeposited'];

        if (
            getRESDeposit === undefined ||
            getRESDeposit === null ||
            getRESDeposit === 0
        ) {
            result.set('totalRESDeposited', amount);
        } else {
            const updatedRESDeposit = getRESDeposit + amount;
            result.set('totalRESDeposited', updatedRESDeposit);
        }

        await result.save(null, { useMasterKey: true });

        return {
            playfabResponseCode: responseCode,
            playfabResponseStatus: responseStatus,
            depositHash: response.hash,
            moralisSaved: 'OK',
        };
    } catch (err) {
        throw err;
    }
};

module.exports = {
    getOwnedxRESFromAddress,
    getRESAllowance,
    getOwnedRES,
    getOwnedxRES,
    claimxRES,
    depositRES,
    userRESTransactions,
    getClaimCooldown,
    getAllWebAppData,
};

