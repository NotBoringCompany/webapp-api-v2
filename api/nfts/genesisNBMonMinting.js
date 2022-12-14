require('dotenv').config();

const Moralis = require('moralis-v1/node');
const ethers = require('ethers');
const fs = require('fs');
const path = require('path');
const moment = require('moment');

// IMPORTS
const { uploadGenesisEggMetadata } = require('./nbmonMetadata');
const { addToActivities } = require('../webapp/activities');
const { parseJSON } = require('../../utils/jsonParser');

const privateKey = process.env.TEST_ADMIN_PRIVATE_KEY;
const hatchingDuration = process.env.HATCHING_DURATION;

const rpcUrl = process.env.BSC_RPC_URL;
const rpcProvider = new ethers.providers.JsonRpcProvider(rpcUrl);

// Genesis NBMon contract-related variables
const genesisABI = JSON.parse(
    fs.readFileSync(
        path.join(__dirname, '../../abi/genesisNBMon.json'),
    ),
);

const genesisContract = new ethers.Contract(
    process.env.GENESIS_NBMON_ADDRESS,
    genesisABI,
    rpcProvider,
);

/**
 * `publicMint` mints a Genesis NBMon egg (public minting method).
 * The NBMon will get stored both in the blockchain (as a source of truth) and the Moralis GenesisNBMons class for faster querying.
 * The NBMon metadata gets stored in DigitalOcean for OpenSea (and other NFT Marketplaces)-friendly metadata retrieval.
 * @param {String} toAddress the address the Genesis NBMon is minted to (aka the owner)
 * @return {Number} the ID of the newly minted Genesis NBMon.
 */
const publicMint = async (toAddress) => {
    try {
        const serverUrl = process.env.MORALIS_SERVERURL;
        const appId = process.env.MORALIS_APPID;
        const masterKey = process.env.MORALIS_MASTERKEY;
        await Moralis.start({
            serverUrl,
            appId,
            masterKey,
        });
        const signer = new ethers.Wallet(privateKey, rpcProvider);

        // NBMon related metadata. Note that most of them are empty since they will be replaced when the NBMon is hatched.
        const amountToMint = 1;
        const stringMetadata = ['', '', '', '', '', '', '', '', ''];

        // current hatching duration for testing is temporary. This will be changed to the appropriate number for production.
        const numericMetadata = [parseInt(hatchingDuration), 0, 0, 0, 0, 0, 0, 0, 0, 0];
        const boolMetadata = [true];

        const unsignedTx = await genesisContract.populateTransaction.publicMint(
            toAddress,
            amountToMint,
            stringMetadata,
            numericMetadata,
            boolMetadata,
        );

        const signedTx = await signer.sendTransaction(unsignedTx);
        // waits for the transaction to be signed and mined.
        await signedTx.wait();

        // getting the block timestamp (since the signedTx doesn't have the block timestamp, this may be slightly off)
        const blockNumber = await rpcProvider.getBlockNumber();
        const block = await rpcProvider.getBlock(blockNumber);
        const blockTimestamp = block.timestamp;

        // upon successful minting, the _currentIndex of the GenesisNBMons contract should be incremented by 1.
        // _currentIndex refers to the next NBMon ID to be minted (essentially totalSupply + 1).
        // so here, the mintedId will be the supposed actual ID that was minted.
        const currentCount = await genesisContract._currentIndex();
        const mintedId = parseInt(currentCount) - 1;

        // Moralis saving-related variables
        const MintedNFTs = Moralis.Object.extend('MintedNFTs');
        const mintedNFTs = new MintedNFTs();

        const GameData = Moralis.Object.extend('nbmonGameData');
        const gameData = new GameData();

        mintedNFTs.set('nftName', 'genesisNbmon');
        mintedNFTs.set('contractAddress', genesisContract.address);
        mintedNFTs.set('tokenId', mintedId);
        mintedNFTs.set('owner', toAddress);
        mintedNFTs.set('stringMetadata', stringMetadata);
        mintedNFTs.set('numericMetadata', numericMetadata);
        mintedNFTs.set('boolMetadata', boolMetadata);
        mintedNFTs.set('bornAt', moment().unix());
        mintedNFTs.set('transferredAt', moment().unix());

        // we save the blockchain object (with chain id and name, just in case some blockchains have no name)
        const blockchain = await rpcProvider.getNetwork();
        mintedNFTs.set('blockchain', blockchain);

        // after successful minting and setting the variables, we can now save the newly minted NBMon to both our
        // `MintedNFTs` and `nbmonGameData` class.
        await mintedNFTs.save(null, { useMasterKey: true }).then((obj) => {
            gameData.set('nbmonInstance', {
                __type: 'Pointer',
                className: 'MintedNFTs',
                objectId: obj.id,
            });
        });

        await gameData.save(null, { useMasterKey: true });

        // we upload the newly minted NBMon egg's metadata to DigitalOcean Spaces.
        uploadGenesisEggMetadata(mintedId);

        const jsonTx = parseJSON(signedTx);

        // we upload the activity to our custom `UserActivities` class.
        await addToActivities(
            jsonTx,
            'genesisMinting',
            blockchain,
            parseFloat(process.env.MINTING_PRICE),
            toAddress,
            mintedId,
            new Date(blockTimestamp * 1000),
        );

        return { nbmonId: mintedId };
    } catch (err) {
        throw err;
    }
};

publicMint('0x2175cF248625c4cBefb204E76f0145b47d9061F8');

/**
 * `whitelistedMint` mints a Genesis NBMon egg (whitelisted minting method).
 * The NBMon will get stored both in the blockchain (as a source of truth) and the Moralis GenesisNBMons class for faster querying.
 * The NBMon metadata gets stored in DigitalOcean for OpenSea (and other NFT Marketplaces)-friendly metadata retrieval.
 * @param {String} toAddress the address the Genesis NBMon is minted to (aka the owner)
 * @return {Number} the ID of the newly minted Genesis NBMon.
 */
const whitelistedMint = async (toAddress) => {
    try {
        const signer = new ethers.Wallet(privateKey, rpcProvider);

        // NBMon related metadata. Note that most of them are empty since they will be replaced when the NBMon is hatched.
        const amountToMint = 1;
        const stringMetadata = ['', '', '', '', '', '', '', '', ''];

        // current hatching duration for testing is temporary. This will be changed to the appropriate number for production.
        const numericMetadata = [parseInt(hatchingDuration), 0, 0, 0, 0, 0, 0, 0, 0, 0];
        const boolMetadata = [true];

        const unsignedTx = await genesisContract.populateTransaction.whitelistedMint(
            toAddress,
            amountToMint,
            stringMetadata,
            numericMetadata,
            boolMetadata,
        );

        const signedTx = await signer.sendTransaction(unsignedTx);
        // waits for the transaction to be signed and mined.
        await signedTx.wait();

        // getting the block timestamp (since the signedTx doesn't have the block timestamp, this may be slightly off)
        const blockNumber = await rpcProvider.getBlockNumber();
        const block = await rpcProvider.getBlock(blockNumber);
        const blockTimestamp = block.timestamp;

        // upon successful minting, the _currentIndex of the GenesisNBMons contract should be incremented by 1.
        // _currentIndex refers to the next NBMon ID to be minted (essentially totalSupply + 1).
        // so here, the mintedId will be the supposed actual ID that was minted.
        const currentCount = await genesisContract._currentIndex();
        const mintedId = parseInt(currentCount) - 1;

        // just in case that minted ID isn't an actual ID.
        if (!mintedId || mintedId === undefined || isNaN(mintedId)) {
            throw new Error('mintedId is undefined or NaN.');
        }

        // Moralis saving-related variables
        const MintedNFTs = Moralis.Object.extend('MintedNFTs');
        const mintedNFTs = new MintedNFTs();

        const GameData = Moralis.Object.extend('nbmonGameData');
        const gameData = new GameData();

        mintedNFTs.set('nftName', 'genesisNbmon');
        mintedNFTs.set('contractAddress', genesisContract.address);
        mintedNFTs.set('tokenId', mintedId);
        mintedNFTs.set('owner', toAddress);
        mintedNFTs.set('stringMetadata', stringMetadata);
        mintedNFTs.set('numericMetadata', numericMetadata);
        mintedNFTs.set('boolMetadata', boolMetadata);
        mintedNFTs.set('bornAt', moment().unix());
        mintedNFTs.set('transferredAt', moment().unix());

        // we save the blockchain object (with chain id and name, just in case some blockchains have no name)
        const blockchain = await rpcProvider.getNetwork();
        mintedNFTs.set('blockchain', blockchain);

        // after successful minting and setting the variables, we can now save the newly minted NBMon to both our
        // `MintedNFTs` and `nbmonGameData` class.
        await mintedNFTs.save(null, { useMasterKey: true }).then((obj) => {
            gameData.set('nbmonInstance', {
                __type: 'Pointer',
                className: 'MintedNFTs',
                objectId: obj.id,
            });
        });

        await gameData.save(null, { useMasterKey: true });

        // we upload the newly minted NBMon egg's metadata to DigitalOcean Spaces.
        uploadGenesisEggMetadata(mintedId);

        const jsonTx = parseJSON(signedTx);

        // we upload the activity to our custom `UserActivities` class.
        await addToActivities(
            jsonTx,
            'genesisMinting',
            blockchain,
            parseFloat(process.env.MINTING_PRICE),
            toAddress,
            mintedId,
            new Date(blockTimestamp * 1000),
        );

        return { nbmonId: mintedId };
    } catch (err) {
        throw err;
    }
};

module.exports = {
    publicMint,
    whitelistedMint,
};
