require('dotenv').config();

const ethers = require('ethers');
const fs = require('fs');
const path = require('path');
const moment = require('moment');
const Moralis = require('moralis-v1/node');

// IMPORTS
const parseJSON = require('../../../utils/jsonParser').parseJSON;
const { getAttackEffectiveness, getDefenseEffectiveness } = require('../../../api-calculations/nbmonTypeEffectiveness');

// NOTE: The GenesisNBMon contract will only exist in ONE blockchain. This means that there is no need to specify multiple RPC URLs for dynamic interaction.
// Currently, this RPC URL is set to Cronos Testnet for testing purposes, but it will most likely be on Ethereum.
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

const serverUrl = process.env.MORALIS_SERVERURL;
const appId = process.env.MORALIS_APPID;
const masterKey = process.env.MORALIS_MASTERKEY;

// FUNCTIONS
/**
 * `getGenesisNBMon` returns a Genesis NBMon object with all relevant blockchain and non-blockchain data.
 * @param {Number} id the ID of the Genesis NBMon to query.
 * @returns {Object} a GenesisNBMon object.
 */
const getGenesisNBMon = async (id) => {
    try {
        await Moralis.start({ 
            serverUrl,
            appId,
            masterKey
        });
        const GenesisNBMon = new Moralis.Query("MintedNFTs");
        // we set the query to match the contract address of the Genesis NBMon contract and the specified ID.
        GenesisNBMon.equalTo("contractAddress", process.env.GENESIS_NBMON_TESTING_ADDRESS);
        GenesisNBMon.equalTo("tokenId", id);

        const query = await GenesisNBMon.first({ useMasterKey: true });

        // if the query result doesn't return anything, we throw an error.
        if (query === undefined || query === null || query === "" || query.length === 0) {
            throw new Error(`No Genesis NBMon found with the specified ID ${id}`);
        }


        // we parse the query to return a readable object.
        const nbmon = parseJSON(query);

        //////////////// TO DO: QUERY THE GENESIS NBMONS GAMEDATA STUFF HERE //////////////////
		// const GameData = Moralis.Object.extend("Genesis_NBMons_GameData");
		// const gameData = new Moralis.Query(GameData);
		// gameData.matchesQuery("NBMon_Instance", query);

		// const gdQuery = await gameData.first({ useMasterKey: true });
		// const parsedGdQuery = parseJSON(gdQuery);
        ///////////////////////////////////////////////////////////////////////////////////////

        // we initialize an empty object to store all the Genesis NBMon data.
        let nbmonData = {};

        nbmonData['nbmonId'] = nbmon['tokenId'];
        nbmonData['owner'] = nbmon['owner'];
        nbmonData['bornAt'] = nbmon['bornAt'];

        // calculates if the nbmon is hatchable
        let now = moment().unix();
        let hatchableTime = parseInt(Number(nbmon["numericMetadata"][0])) + parseInt(Number(nbmon["bornAt"]));

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
            ////////////////////////// TO DO: CREATE GENESIS BEHAVIOR CALCULATION //////////////////////////
            // nbmonObj['behavior'] = await getGenesisBehavior(nbmonObj['genus']);
            /////////////////////////////////////////////////////////////////////////////////////////////////
        }

        console.log(nbmonData);



    } catch (err) {
        throw err;
    }
}

/**
 * `getGenesisNBMonOwner` gets the owner of the Genesis NBMon.
 * @param {*} id the ID of the Genesis NBMon.
 * @returns {string} the address of the owner.
 */
const getGenesisNBMonOwner = async (id) => {
    try {
        await Moralis.start({ 
            serverUrl,
            appId,
            masterKey
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
}

// getGenesisNBMon(1);

