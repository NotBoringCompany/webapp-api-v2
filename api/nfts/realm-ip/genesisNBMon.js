require('dotenv').config();

const ethers = require('ethers');
const fs = require('fs');
const path = require('path');
const moment = require('moment');
const Moralis = require('moralis-v1/node');

const serverUrl = process.env.MORALIS_SERVERURL;
const appId = process.env.MORALIS_APPID;
const masterKey = process.env.MORALIS_MASTERKEY;

// IMPORTS
const parseJSON = require('../../../utils/jsonParser').parseJSON;
const { getAttackEffectiveness, getDefenseEffectiveness } = require('../../../api-calculations/nbmonTypeEffectiveness');
const { getNBMonData } = require('../../../api-calculations/nbmonData');
const { getGenesisFertilityDeduction } = require('../../../api-calculations/genesisNBMonHelper');

// NOTE: The GenesisNBMon contract will only exist in ONE blockchain.
// This means that there is no need to specify multiple RPC URLs for dynamic interaction.
// Currently, this RPC URL is set to Cronos Testnet for testing purposes, but it will most likely be on Ethereum.
const rpcUrl = process.env.CRONOS_RPC_URL;
const rpcProvider = new ethers.providers.JsonRpcProvider(rpcUrl);

// Genesis NBMon contract-related variables
const genesisABI = JSON.parse(
    fs.readFileSync(
        path.join(__dirname, '../../../abi/GenesisNBMon.json'),
    ),
);
const genesisContract = new ethers.Contract(
    process.env.GENESIS_NBMON_TESTING_ADDRESS,
    genesisABI,
    rpcProvider,
);

// FUNCTIONS
/**
 * `getGenesisNBMon` returns a Genesis NBMon object with all relevant blockchain and non-blockchain data.
 * @param {Number} id the ID of the Genesis NBMon to query.
 * @return {Object} a GenesisNBMon object.
 */
const getGenesisNBMon = async (id) => {
    try {
        await Moralis.start({
            serverUrl,
            appId,
            masterKey,
        });
        const GenesisNBMon = new Moralis.Query('MintedNFTs');
        // we set the query to match the contract address of the Genesis NBMon contract and the specified ID.
        GenesisNBMon.equalTo('contractAddress', process.env.GENESIS_NBMON_TESTING_ADDRESS);
        const querySearch = GenesisNBMon.equalTo('tokenId', id);

        const query = await querySearch.first({ useMasterKey: true });

        // if the query result doesn't return anything, we throw an error.
        if (query === undefined || query === null || query === '' || query.length === 0) {
            throw new Error(`No Genesis NBMon found with the specified ID ${id}`);
        }


        // we parse the query to return a readable object.
        const nbmon = parseJSON(query);

        // we query the nbmon instance in another class called `nbmonGameData` to retrieve the nbmon's game data
        const GameData = new Moralis.Query('nbmonGameData');
        GameData.matchesQuery('nbmonInstance', querySearch);

        const gameDataQuery = await GameData.first({ useMasterKey: true });
        // we parse the nbmon game data query to return a readable object.
        const nbmonGameData = parseJSON(gameDataQuery);

        // we initialize an empty object to store all the Genesis NBMon data.
        const nbmonData = {};

        nbmonData['nbmonId'] = nbmon['tokenId'];
        nbmonData['owner'] = nbmon['owner'];
        nbmonData['bornAt'] = nbmon['bornAt'];

        // calculates if the nbmon is hatchable
        const now = moment().unix();
        const hatchableTime = parseInt(Number(nbmon['numericMetadata'][0])) + parseInt(Number(nbmon['bornAt']));

        // check if isEgg is true or false to return respective hatching metadata
        if (nbmon['boolMetadata'][0] === true) {
            nbmonData['hatchedAt'] = null;
            nbmonData['isHatchable'] = now >= hatchableTime;
        } else {
            nbmonData['hatchedAt'] = nbmon['numericMetadata'][9];
            nbmonData['isHatchable'] = false;
        }

        nbmonData['transferredAt'] = nbmon['transferredAt'];
        nbmonData['hatchingDuration'] = nbmon['numericMetadata'][0];

        // the types of the nbmon. will most likely be undefined if the nbmon is an egg.
        const firstType = nbmon['stringMetadata'][5] === undefined ? null : nbmon['stringMetadata'][5];
        const secondType = nbmon['stringMetadata'][6] === undefined ? null : nbmon['stringMetadata'][6];

        nbmonData['types'] = [firstType, secondType];

        // calculates type effectiveness of the NBMon
        const attackEff = await getAttackEffectiveness(firstType, secondType);
        const defenseEff = await getDefenseEffectiveness(firstType, secondType);

        nbmonData['strongAgainst'] = attackEff['Strong against'];
        nbmonData['weakAgainst'] = attackEff['Weak against'];
        nbmonData['resistantTo'] = defenseEff['Resistant to'];
        nbmonData['vulnerableTo'] = defenseEff['Vulnerable to'];

        // obtaining the passives of the NBMon. checks for undefined values as well.
        const firstPassive = nbmon['stringMetadata'][7] === undefined ? null : nbmon['stringMetadata'][7];
        const secondPassive = nbmon['stringMetadata'][8] === undefined ? null : nbmon['stringMetadata'][8];

        nbmonData['passives'] = [firstPassive, secondPassive];
        nbmonData['gender'] = nbmon['stringMetadata'][0] === undefined ? null : nbmon['stringMetadata'][0];
        nbmonData['rarity'] = nbmon['stringMetadata'][1] === undefined ? null : nbmon['stringMetadata'][1];
        nbmonData['species'] = nbmon['stringMetadata'][3] === undefined ? null : nbmon['stringMetadata'][3];
        nbmonData['genus'] = nbmon['stringMetadata'][4] === undefined ? null : nbmon['stringMetadata'][4];

        let nbpediaData;

        if (nbmonData['genus'] === null || '') {
            nbmonData['genusDescription'] = null;
        } else {
            nbpediaData = getNBMonData(nbmonData['genus']);
        }

        // mutation calculation
        // checks if nbmon is still an egg
        if (nbmon['boolMetadata'][0] === true) {
            nbmonData['mutation'] = 'Not mutated';
            nbmonData['mutationType'] = null;
            nbmonData['behavior'] = null;
        // if it already has hatched
        } else {
            nbmonData['mutation'] = nbmon['stringMetadata'][2] === 'Not mutated' ? nbmon['stringMetadata'][2] : 'Mutated';
            nbmonData['mutationType'] === nbmonData['mutation'] === 'Mutated' ? nbmon['stringMetadata'][2] : null;
            nbmonData['behavior'] = nbpediaData['behavior'] === undefined ? null : nbpediaData['behavior'];
        }

        nbmonData['fertility'] = nbmon['numericMetadata'][8] === undefined ? null : nbmon['numericMetadata'][8];

        if (nbmonData['rarity'] !== null) {
            nbmonData['fertilityDeduction'] = getGenesisFertilityDeduction(nbmonData['rarity']);
        } else {
            nbmonData['fertilityDeduction'] = null;
        }

        nbmonData['healthPotential'] = nbmon['numericMetadata'][1] === undefined ? null : nbmon['numericMetadata'][1];
        nbmonData['energyPotential'] = nbmon['numericMetadata'][2] === undefined ? null : nbmon['numericMetadata'][2];
        nbmonData['attackPotential'] = nbmon['numericMetadata'][3] === undefined ? null : nbmon['numericMetadata'][3];
        nbmonData['defensePotential'] = nbmon['numericMetadata'][4] === undefined ? null : nbmon['numericMetadata'][4];
        nbmonData['spAtkPotential'] = nbmon['numericMetadata'][5] === undefined ? null : nbmon['numericMetadata'][5];
        nbmonData['spDefPotential'] = nbmon['numericMetadata'][6] === undefined ? null : nbmon['numericMetadata'][6];
        nbmonData['speedPotential'] = nbmon['numericMetadata'][7] === undefined ? null : nbmon['numericMetadata'][7];
        nbmonData['isEgg'] = nbmon['boolMetadata'][0] === undefined ? false : nbmon['boolMetadata'][0];
        nbmonData['isListed'] = nbmon['isListed'] === undefined ? false : nbmon['isListed'];

        if (nbmon.isListed) {
            /* eslint-disable */
            // ////////////////// GET LISTING DATA FUNCTION HERE////////////////////
            // /If !listingData (listingData === null) -> listing is expired
			// if (!listingData) {
			// 	nbmonObj["isListed"] = false;

			// 	// Changes the isListed to be false
			// 	await changeIsListedStatus(false, id);
			// 	await deleteItemOnSale(id);
			// }
			// nbmonObj = { ...nbmonObj, listingData };
            // /////////////////////////////////////////////////////////////////////
            /* eslint-enable */
        } else {
            nbmonData['listingData'] = null;
        }

        // nbmon game data manipulation
        nbmonData['currentExp'] = nbmonGameData['currentExp'] === undefined ? null : nbmonGameData['currentExp'];
        nbmonData['level'] = nbmonGameData['level'] === undefined ? null : nbmonGameData['level'];
        nbmonData['nickname'] = nbmonGameData['nickname'] === undefined ? null : nbmonGameData['nickname'];
        nbmonData['skillList'] = nbmonGameData['skillList'] === undefined ? null : nbmonGameData['skillList'];
        nbmonData['maxHpEffort'] = nbmonGameData['maxHpEffort'] === undefined ? null : nbmonGameData['maxHpEffort'];
        nbmonData['maxEnergyEffort'] = nbmonGameData['maxEnergyEffort'] === undefined ? null : nbmonGameData['maxEnergyEffort'];
        nbmonData['speedEffort'] = nbmonGameData['speedEffort'] === undefined ? null : nbmonGameData['speedEffort'];
        nbmonData['attackEffort'] = nbmonGameData['attackEffort'] === undefined ? null : nbmonGameData['attackEffort'];
        nbmonData['spAtkEffort'] = nbmonGameData['spAtkEffort'] === undefined ? null : nbmonGameData['spAtkEffort'];
        nbmonData['defenseEffort'] = nbmonGameData['defenseEffort'] === undefined ? null : nbmonGameData['defenseEffort'];
        nbmonData['spDefEffort'] = nbmonGameData['spDefEffort'] === undefined ? null : nbmonGameData['spDefEffort'];

        return nbmonData;
    } catch (err) {
        throw err;
    }
};

/**
 * `getGenesisNBMonOwner` gets the owner of the Genesis NBMon.
 * @param {Number} id the ID of the Genesis NBMon.
 * @return {string} the address of the owner.
 */
const getGenesisNBMonOwner = async (id) => {
    try {
        await Moralis.start({
            serverUrl,
            appId,
            masterKey,
        });

        const MintedNFTs = new Moralis.Query('MintedNFTs');
        // first we ensure that we are querying for the Genesis NBMons.
        MintedNFTs.equalTo('contractAddress', process.env.GENESIS_NBMON_TESTING_ADDRESS);
        MintedNFTs.equalTo('tokenId', id);

        const genesisNBMon = await MintedNFTs.first({ useMasterKey: true });

        if (genesisNBMon === undefined) {
            throw new Error('Genesis NBMon with given ID not found in database.');
        }

        const owner = (parseJSON(genesisNBMon))['owner'];
        return owner;
    } catch (err) {
        throw err;
    }
};

/**
 * `getOwnedGenesisNBMons` returns all the Genesis NBMons owned by `address`.
 * @param {String} address the address of the owner to query.
 * @return {Array} an array of Genesis NBMons owned by `address`.
 */
const getOwnedGenesisNBMons = async (address) => {
    try {
        const ownedIDs = await getOwnedGenesisNBMonIDs(address);

        const nbmons = [];

        ownedIDs.forEach(async (id) => {
            const nbmon = await getGenesisNBMon(id);
            nbmons.push(nbmon);
        });

        return nbmons;
    } catch (err) {
        throw err;
    }
};

/**
 * `getOwnedGenesisNBMonIDs` returns all the Genesis NBMon IDs owned by `address`.
 * @param {String} address the address of the owner to query.
 * @return {Array} an array of Genesis NBMon IDs owned by `address`.
 */
const getOwnedGenesisNBMonIDs = async (address) => {
    try {
        const ownedIDs = await genesisContract.getOwnerNFTIds(address);
        // since the array from the blockchain will be in `BigNumber` type, we need to parse it to `Number` first.
        const ids = [];

        ownedIDs.forEach((id) => {
            const convertedID = parseInt(Number(id));
            ids.push(convertedID);
        });

        console.log(ids);
        return ids;
    } catch (err) {
        throw err;
    }
};

/**
 * @dev `generalConfig` shows the supply and time-related configs for the Genesis NBMon contract.
 * @return {Object} returns `supplies` which refer to the supply information for Genesis NBMons and `timestamps` which refer to time-related info.
 */
const generalConfig = async () => {
    try {
        // refers to the total number of Genesis NBMons that can ever be minted
        const supplyLimit = await genesisContract.maxSupply();
        // refers to the number of Genesis NBMons that have been minted
        const minted = parseInt(Number(await genesisContract.totalSupply()));
        const now = moment().unix();
        // the unix timestamp of when public minting is open
        const publicOpen = parseInt(process.env.PUBLIC_MINT_TIME_UNIX);
        // the unix timestamp of when whitelist minting is opened
        const whitelistOpen = parseInt(process.env.WHITELIST_MINT_TIME_UNIX);
        // the unix timestamp of when minting closes in general
        const mintingClosed = parseInt(process.env.CLOSE_MINT_TIME_UNIX);

        // checks if whitelist minting is currently open
        const isWhitelistOpen = now >= whitelistOpen && now < mintingClosed;
        // checks if public minting is currently open
        const isPublicOpen = now >= publicOpen && now < mintingClosed;
        // cchecks if minting has ended/is currently closed
        const isMintingEnded = now > mintingClosed;

        const timestamps = {
            now,
            publicOpen,
            whitelistOpen,
            mintingClosed,
            isPublicOpen,
            isWhitelistOpen,
            isMintingEnded,
        };
        const supplies = { minted, supplyLimit };

        return { timestamps, supplies };
    } catch (err) {
        throw err;
    }
};

/**
 * `config` uses the config info from `generalConfig ` but is specified to one wallet address.
 * this includes the ability for an address to mint, if they have exceeded the mint limit etc (their status)
 * @param {*} address the wallet address of the user
 * @return {Object} the so-called 'status' of the address along with `generalConfig`'s return value.
 */
const config = async (address) => {
    try {
        // returns the values from `generalConfig`
        const generalConfigs = await generalConfig();
        // checks if the address is blacklisted
        const isBlacklisted = await genesisContract.checkBlacklisted(address);
        // checks the amount of Genesis NBMons that the address has minted
        const amountMinted = await genesisContract.checkAmountMinted(address);
        // NOTE: This function is currently assuming that EVERY address can mint up to FIVE Genesis NBMons. This is potentially subject to change.
        // Initially, in our V1 API, this checks if `amountMinted` === 5, but an error can cause a user to mint more than 5.
        // with >= 5, this means that if the user has minted more than 5, hasMintedFive will automatically return `true`.
        const hasMintedFive = amountMinted >= 5 ? true : false;

        // if the address is blacklisted, we will manually return the config with these given values.
        if (isBlacklisted) {
            const status = {
                address,
                canMint: false,
                isWhitelisted: false,
                amountMinted,
                hasMintedFive,
            };

            return { status, ...generalConfigs };
        }

        // destructures the object obtained from `generalConfigs`
        const { minted, supplyLimit } = generalConfigs.supplies;
        const { isPublicOpen, isWhitelistOpen, isMintingEnded } = generalConfigs.timestamps;
        // checks if the address is whitelisted
        const isWhitelisted = await genesisContract.checkWhitelisted(address);
        // checks if the user has registered their profile in our web app
        const isProfileRegistered = await genesisContract.profileRegistered(address);
        // initializes `canMint` to false
        let canMint = false;

        // if the address has minted 5 or more Genesis NBMons or the minting time has ended, the address cannot mint anymore.
        if (hasMintedFive || isMintingEnded) {
            canMint = false;
        } else {
            // if the total amount of NBMons minted is still less than the limit
            if (minted < supplyLimit) {
                // if the address is whitelisted
                if (isWhitelisted) {
                    // checks if `canMintWhitelisted` returns true or false
                    canMint = canMintWhitelisted(isPublicOpen, isWhitelistOpen, amountMinted, hasMintedFive);
                } else {
                    // if the user isn't whitelisted, it checks if public minting is open and if the user hasn't minted five or more NBMons yet
                    if (isPublicOpen && !hasMintedFive) {
                        canMint = true;
                    } else {
                        canMint = false;
                    }
                }
            }
        }

        // returns the status of the address with the given variables
        const status = {
            address,
            canMint: canMint && isProfileRegistered,
            isWhitelisted,
            amountMinted,
            isProfileRegistered,
            hasMintedFive,
        };

        return { status, ...generalConfigs };
    } catch (err) {
        throw err;
    }
};

/**
 * `canMintWhitelisted` checks if a whitelisted user is eligible to mint.
 * NOTE: `hasMintedFive` will be changed accordingly if users can mint more than FIVE NBMONS.
 * @param {*} isPublicOpen checks if public minting is open
 * @param {*} isWhitelistOpen checks if whitelist minting is open
 * @param {*} amountMinted checks the amount of NBMons minted from the user already
 * @param {*} hasMintedFive checks if the user has minted 5 NBMons
 * @return {Boolean} returns `true` if the user is eligible to mint, `false` otherwise.
 */
const canMintWhitelisted = (isPublicOpen, isWhitelistOpen, amountMinted, hasMintedFive) => {
    // if whitelist minting isn't open, it returns false
    if (!isWhitelistOpen) return false;

    // if user hasn't minted yet and public is still closed, they can mint
    if (amountMinted === 0 && !isPublicOpen) return true;

    // if user has minted once and public is closed, it returns false.
    // NOTE: this is subject to change as we assume that whitelisted users can only mint once.
    if (amountMinted === 1 && !isPublicOpen) return false;

    // if user hasn't minted five and public is open, they can mint
    if (!hasMintedFive && isPublicOpen) return true;

    // otherwise, this gets called. (this most likely will never be called)
    return false;
};

module.exports = {
    getGenesisNBMon,
    getGenesisNBMonOwner,
    getOwnedGenesisNBMons,
    getOwnedGenesisNBMonIDs,
    generalConfig,
    config,
};
