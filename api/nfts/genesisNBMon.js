require('dotenv').config();

const ethers = require('ethers');
const fs = require('fs');
const path = require('path');
const moment = require('moment');
const Moralis = require('moralis-v1/node');

// IMPORTS
const parseJSON = require('../../utils/jsonParser').parseJSON;
const { getAttackEffectiveness, getDefenseEffectiveness } = require('../../api-calculations/nbmonTypeEffectiveness');
const { getNBMonData } = require('../../api-calculations/nbmonData');
const { getGenesisFertilityDeduction } = require('../../api-calculations/genesisNBMonHelper');
const { getListingData, changeIsListedStatus, deleteItemOnSale } = require('../webapp/marketplace');

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
 * `getGenesisNBMon` returns a Genesis NBMon object with all relevant blockchain and non-blockchain data.
 *
 * stringMetadata[] = gender, rarity, mutation, species, genus, first type, second type, first passive and second passive (9 indexes)
 *
 * numericMetadata[] = hatchingDuration, health potential, energy potential, attack potential, defense potential, spAtk potential,
 * spDef potential, speed potential, fertility points and hatchedAt (10 indexes)
 *
 * boolMetadata[] = isEgg (1 index)
 *
 * @param {Number} id the ID of the Genesis NBMon to query.
 * @return {Object} a GenesisNBMon object.
 */
const getGenesisNBMon = async (id) => {
    try {
        const GenesisNBMon = new Moralis.Query('MintedNFTs');
        // we set the query to match the contract address of the Genesis NBMon contract and the specified ID.
        GenesisNBMon.equalTo('contractAddress', process.env.GENESIS_NBMON_ADDRESS);
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

        // we check if the nbmon is listed on sale in the marketplace.
        if (nbmon.isListed) {
            const listingData = await getListingData(process.env.GENESIS_NBMON_ADDRESS, id);

            // if listing data is null, this means that the listing is expired.
            // we will set `isListed` to be false and then change its status and delete this item from `ItemsOnSale`.
            if (listingData === null) {
                nbmonData['isListed'] = false;

                await changeIsListedStatus(false, process.env.GENESIS_NBMON_ADDRESS, id);
                await deleteItemOnSale(process.env.GENESIS_NBMON_ADDRESS, id);
            }

            nbmonData = { ...nbmonData, listingData };
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
 * `getGenesisNBMonAlt` is an alternative to `getGenesisNBMon` where certain data are returned in different format.
 * This function will primarily be used for our backend Playfab API which uses C#.
 * C# is static type, meaning that the return values will have to default to -1, '' or 0 instead of `null`, otherwise there will be formatting errors.
 * @param {Number} id the NFT ID
 * @return {Object} a GenesisNBMon object
 */
const getGenesisNBMonAlt = async (id) => {
    try {
        const GenesisNBMon = new Moralis.Query('MintedNFTs');
        // we set the query to match the contract address of the Genesis NBMon contract and the specified ID.
        GenesisNBMon.equalTo('contractAddress', process.env.GENESIS_NBMON_ADDRESS);
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
            nbmonData['hatchedAt'] = -1;
            nbmonData['isHatchable'] = now >= hatchableTime;
        } else {
            nbmonData['hatchedAt'] = nbmon['numericMetadata'][9];
            nbmonData['isHatchable'] = false;
        }

        nbmonData['transferredAt'] = nbmon['transferredAt'];
        nbmonData['hatchingDuration'] = nbmon['numericMetadata'][0];

        // the types of the nbmon. will most likely be undefined if the nbmon is an egg.
        const firstType = nbmon['stringMetadata'][5] === undefined ? '' : nbmon['stringMetadata'][5];
        const secondType = nbmon['stringMetadata'][6] === undefined ? '' : nbmon['stringMetadata'][6];

        nbmonData['types'] = [firstType, secondType];

        // calculates type effectiveness of the NBMon
        const attackEff = await getAttackEffectiveness(firstType, secondType);
        const defenseEff = await getDefenseEffectiveness(firstType, secondType);

        nbmonData['strongAgainst'] = attackEff['Strong against'];
        nbmonData['weakAgainst'] = attackEff['Weak against'];
        nbmonData['resistantTo'] = defenseEff['Resistant to'];
        nbmonData['vulnerableTo'] = defenseEff['Vulnerable to'];

        // obtaining the passives of the NBMon. checks for undefined values as well.
        const firstPassive = nbmon['stringMetadata'][7] === undefined ? '' : nbmon['stringMetadata'][7];
        const secondPassive = nbmon['stringMetadata'][8] === undefined ? '' : nbmon['stringMetadata'][8];

        nbmonData['passives'] = [firstPassive, secondPassive];
        nbmonData['gender'] = nbmon['stringMetadata'][0] === undefined ? '' : nbmon['stringMetadata'][0];
        nbmonData['rarity'] = nbmon['stringMetadata'][1] === undefined ? '' : nbmon['stringMetadata'][1];
        nbmonData['species'] = nbmon['stringMetadata'][3] === undefined ? '' : nbmon['stringMetadata'][3];
        nbmonData['genus'] = nbmon['stringMetadata'][4] === undefined ? '' : nbmon['stringMetadata'][4];

        let nbpediaData;

        if (nbmonData['genus'] === null || '') {
            nbmonData['genusDescription'] = '';
        } else {
            nbpediaData = getNBMonData(nbmonData['genus']);
        }

        // mutation calculation
        // checks if nbmon is still an egg
        if (nbmon['boolMetadata'][0] === true) {
            nbmonData['mutation'] = 'Not mutated';
            nbmonData['mutationType'] = '';
            nbmonData['behavior'] = '';
        // if it already has hatched
        } else {
            nbmonData['mutation'] = nbmon['stringMetadata'][2] === 'Not mutated' ? nbmon['stringMetadata'][2] : 'Mutated';
            nbmonData['mutationType'] === nbmonData['mutation'] === 'Mutated' ? nbmon['stringMetadata'][2] : '';
            nbmonData['behavior'] = nbpediaData['behavior'] === undefined ? '' : nbpediaData['behavior'];
        }

        nbmonData['fertility'] = nbmon['numericMetadata'][8] === undefined ? -1 : nbmon['numericMetadata'][8];

        if (nbmonData['rarity'] !== null) {
            nbmonData['fertilityDeduction'] = getGenesisFertilityDeduction(nbmonData['rarity']);
        } else {
            nbmonData['fertilityDeduction'] = -1;
        }

        nbmonData['healthPotential'] = nbmon['numericMetadata'][1] === undefined ? -1 : nbmon['numericMetadata'][1];
        nbmonData['energyPotential'] = nbmon['numericMetadata'][2] === undefined ? -1 : nbmon['numericMetadata'][2];
        nbmonData['attackPotential'] = nbmon['numericMetadata'][3] === undefined ? -1 : nbmon['numericMetadata'][3];
        nbmonData['defensePotential'] = nbmon['numericMetadata'][4] === undefined ? -1 : nbmon['numericMetadata'][4];
        nbmonData['spAtkPotential'] = nbmon['numericMetadata'][5] === undefined ? -1 : nbmon['numericMetadata'][5];
        nbmonData['spDefPotential'] = nbmon['numericMetadata'][6] === undefined ? -1 : nbmon['numericMetadata'][6];
        nbmonData['speedPotential'] = nbmon['numericMetadata'][7] === undefined ? -1 : nbmon['numericMetadata'][7];
        nbmonData['isEgg'] = nbmon['boolMetadata'][0] === undefined ? false : nbmon['boolMetadata'][0];
        nbmonData['isListed'] = nbmon['isListed'] === undefined ? false : nbmon['isListed'];

        // we check if the nbmon is listed on sale in the marketplace.
        if (nbmon.isListed) {
            const listingData = await getListingData(process.env.GENESIS_NBMON_ADDRESS, id);

            // if listing data is null, this means that the listing is expired.
            // we will set `isListed` to be false and then change its status and delete this item from `ItemsOnSale`.
            if (listingData === null) {
                nbmonData['isListed'] = false;

                await changeIsListedStatus(false, process.env.GENESIS_NBMON_ADDRESS, id);
                await deleteItemOnSale(process.env.GENESIS_NBMON_ADDRESS, id);
            }

            nbmonData = { ...nbmonData, listingData };
        } else {
            nbmonData['listingData'] = [];
        }

        // nbmon game data manipulation
        nbmonData['currentExp'] = nbmonGameData['currentExp'] === undefined ? -1 : nbmonGameData['currentExp'];
        nbmonData['level'] = nbmonGameData['level'] === undefined ? -1 : nbmonGameData['level'];
        nbmonData['nickname'] = nbmonGameData['nickname'] === undefined ? '' : nbmonGameData['nickname'];
        nbmonData['skillList'] = nbmonGameData['skillList'] === undefined ? [] : nbmonGameData['skillList'];
        nbmonData['maxHpEffort'] = nbmonGameData['maxHpEffort'] === undefined ? -1 : nbmonGameData['maxHpEffort'];
        nbmonData['maxEnergyEffort'] = nbmonGameData['maxEnergyEffort'] === undefined ? -1 : nbmonGameData['maxEnergyEffort'];
        nbmonData['speedEffort'] = nbmonGameData['speedEffort'] === undefined ? -1 : nbmonGameData['speedEffort'];
        nbmonData['attackEffort'] = nbmonGameData['attackEffort'] === undefined ? -1 : nbmonGameData['attackEffort'];
        nbmonData['spAtkEffort'] = nbmonGameData['spAtkEffort'] === undefined ? -1 : nbmonGameData['spAtkEffort'];
        nbmonData['defenseEffort'] = nbmonGameData['defenseEffort'] === undefined ? -1 : nbmonGameData['defenseEffort'];
        nbmonData['spDefEffort'] = nbmonGameData['spDefEffort'] === undefined ? -1 : nbmonGameData['spDefEffort'];

        return nbmonData;
    } catch (err) {
        throw err;
    }
};

const serverUrl = process.env.MORALIS_SERVERURL;
const appId = process.env.MORALIS_APPID;
const masterKey = process.env.MORALIS_MASTERKEY;

/**
 * `updateGenesisNBMonsByAddress` updates the `MintedNFTs` class with all up to date Genesis NBMons from the blockchain for `address`.
 * This function is mostly called due to errors during minting/hatching which leads to the class not having correct or missing NBMons.
 * This function will call `getNFTs` from the blockchain which will check if there are discrepancies between the class' and blockchain's data.
 * @param {String} address the wallet address of the user
 * @return {Object} an object with 'status: OK' if successful, or an error thrown otherwise. If no update is needed, return is empty.
 */
const updateGenesisNBMonsByAddress = async (address) => {
    try {
        const serverUrl = process.env.MORALIS_SERVERURL;
        const appId = process.env.MORALIS_APPID;
        const masterKey = process.env.MORALIS_MASTERKEY;
        await Moralis.start({
            serverUrl,
            appId,
            masterKey,
        });
        // we are trying to fetch ALL current Genesis NBMons from the `MintedNFTs` class owned by `address`.
        const MintedNFTs = new Moralis.Query('MintedNFTs');
        MintedNFTs.equalTo('contractAddress', process.env.GENESIS_NBMON_ADDRESS);
        MintedNFTs.equalTo('owner', address);

        const nbmons = await MintedNFTs.find({ useMasterKey: true });

        if (nbmons === undefined || nbmons.length === 0) {
            throw new Error('Cannot find Genesis NBMons. Please check Moralis or this code.');
        }

        const parsedNBMons = parseJSON(nbmons);

        // now we will obtain all NBMons that are minted from the blockchain.
        // first, we check the total NBMons owned by the address from the array of owned IDs' length.
        const ownedNBMons = await getOwnedGenesisNBMonIDs(address);

        if (parsedNBMons.length !== 0) {
            // if the length of the `ownedNBMons` array is the same as the `parsedNBMons` array from Moralis, then no need to update anything.
            if (ownedNBMons.length === parsedNBMons.length) {
                return;
            // if it isn't the same, then we check which IDs are missing and we update it accordingly.
            } else {
                // for each id in `ownedNBMons`, we check if `parsedNBMons` from Moralis contains the id. if it doesn't,
                // that means that this id will be queried using `getNFT` and then added to the `MintedNFTs` class.
                ownedNBMons.forEach(async (id) => {
                    const index = parsedNBMons.findIndex((nbmon) => nbmon.tokenId === id);
                    if (index === -1) {
                        // if index is not found, then we query this id and add it to the `MintedNFTs` class.
                        const getNBMon = await genesisContract.getNFT(id);

                        // we initialize the `MintedNFTs` class
                        const MintedNFTs = Moralis.Object.extend('MintedNFTs');
                        const mintedNFTs = new MintedNFTs();

                        // get the blockchain object
                        const blockchain = await rpcProvider.getNetwork();

                        mintedNFTs.set('contractAddress', process.env.GENESIS_NBMON_ADDRESS);
                        mintedNFTs.set('nftName', 'genesisNbmon'),
                        mintedNFTs.set('owner', address);
                        mintedNFTs.set('tokenId', id);
                        mintedNFTs.set('stringMetadata', getNBMon.stringMetadata);
                        mintedNFTs.set('blockchain', blockchain);
                        mintedNFTs.set('boolMetadata', getNBMon.boolMetadata);
                        mintedNFTs.set('transferredAt', parseInt(getNBMon.transferredAt));
                        mintedNFTs.set('bornAt', parseInt(getNBMon.bornAt));

                        // numeric metadata comes with big number objects. we want to convert all of these to numbers.
                        const parsedNumericMetadata = [];

                        getNBMon.numericMetadata.forEach((num) => {
                            parsedNumericMetadata.push(parseInt(num));
                        });
                        mintedNFTs.set('numericMetadata', parsedNumericMetadata);

                        await mintedNFTs.save(null, { useMasterKey: true });
                    }
                });
            }
        } else {
            throw new Error('Address does not seem to own any Genesis NBMons');
        }

        return {
            status: 'OK',
        };
    } catch (err) {
        throw err;
    }
};

updateGenesisNBMonsByAddress('0x2175cF248625c4cBefb204E76f0145b47d9061F8');

/**
 * `changeOwnership` changes the ownership of a Genesis NBMon.
 * NOTE: `safeTransferFrom` NEEDS TO BE CALLED FROM FRONTEND BEFOREHAND!
 * You are essentially able to also change ownership by using the `safeTransferFrom` option from the Genesis NBMon smart contract, however:
 * Most of our functions will query our Moralis Database (which currently isn't actively and dynamically following the smart contract events/changes).
 * This means that if someone calls `safeTransferFrom`, Moralis will not change the ownership in their class unless we do it manually.
 * This function serves to change the ownership at the same time in the Moralis class, only after `safeTransferFrom` is called from the frontend.
 * This ensures that the ownership of the NBMon is changed both in the backend and smart contract level.
 * OTHERWISE: If a player only calls `safeTransferFrom`, there is a risk of ownership discrepancy and information may be altered. Huge risk.
 * @param {Number} nbmonId the Genesis NBMon ID
 * @param {String} toAddress the address to change the ownership to
 * @return {Object} an object with `Status: OK` if successful.
 */
const changeOwnership = async (nbmonId, toAddress) => {
    try {
        // we query the MintedNFTs class in Moralis
        const MintedNFTs = new Moralis.Query('MintedNFTs');
        // we ensure that the query is set to the Genesis NBMon contract and the respective NBMon ID
        MintedNFTs.equalTo('contractAddress', process.env.GENESIS_NBMON_ADDRESS);
        MintedNFTs.equalTo('tokenId', nbmonId);

        const result = await MintedNFTs.first({ useMasterKey: true });

        if (result === undefined) {
            throw new Error('Genesis NBMon with given ID not found.');
        }

        // now, we set the owner to the new `toAddress` and save it.
        result.set('owner', toAddress);
        await result.save(null, { useMasterKey: true });

        return {
            status: 'OK',
        };
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
        MintedNFTs.equalTo('contractAddress', process.env.GENESIS_NBMON_ADDRESS);
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
 * `getOwnedGenesisNBMonsAlt` is an alternative to `getOwnedGenesisNBMons` which utilizes `getGenesisNBMonAlt` to retrieve the NBMons instead.
 * @param {String} address the address of the owner to query.
 * @return {Array} an array of Genesis NBMons owned by `address`.
 */
const getOwnedGenesisNBMonsAlt = async (address) => {
    try {
        const ownedIDs = await getOwnedGenesisNBMonIDs(address);

        const nbmons = [];

        ownedIDs.forEach(async (id) => {
            const nbmon = await getGenesisNBMonAlt(id);
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
 * @param {String} address the wallet address of the user
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
 * @param {Boolean} isPublicOpen checks if public minting is open
 * @param {Boolean} isWhitelistOpen checks if whitelist minting is open
 * @param {Number} amountMinted checks the amount of NBMons minted from the user already
 * @param {Boolean} hasMintedFive checks if the user has minted 5 NBMons
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
    getGenesisNBMonAlt,
    getGenesisNBMonOwner,
    getOwnedGenesisNBMons,
    getOwnedGenesisNBMonsAlt,
    getOwnedGenesisNBMonIDs,
    generalConfig,
    config,
    changeOwnership,
};
