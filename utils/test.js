require('dotenv').config();
const ethers = require('ethers');
const rpcUrl = process.env.BSC_RPC_URL;
const rpcProvider = new ethers.providers.JsonRpcProvider(rpcUrl);
const genesisABI = require(`${__dirname}/../abi/genesisNBMon.json`);
const InputDataDecoder = require('ethereum-input-data-decoder');
const decoder = new InputDataDecoder(genesisABI);


const test = async () => {
    const blockNumber = await rpcProvider.getBlockNumber();
    const timestamp = (await rpcProvider.getBlock(blockNumber)).timestamp;
    console.log(timestamp);
};

test();