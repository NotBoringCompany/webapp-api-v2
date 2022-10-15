require('dotenv').config();
const ethers = require('ethers');
const rpcUrl = process.env.BSC_RPC_URL;
const rpcProvider = new ethers.providers.JsonRpcProvider(rpcUrl);
const genesisABI = require(`${__dirname}/../abi/genesisNBMon.json`);
const InputDataDecoder = require('ethereum-input-data-decoder');
const decoder = new InputDataDecoder(genesisABI);


const test = async () => {
    console.log(parseInt(process.env.MINTING_PRICE));
};

test();