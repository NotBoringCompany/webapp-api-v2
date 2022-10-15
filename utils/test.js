const ethers = require('ethers');
const genesisABI = require(`${__dirname}/../abi/genesisNBMon.json`);
const InputDataDecoder = require('ethereum-input-data-decoder');
const decoder = new InputDataDecoder(genesisABI);


const test = async () => {
    const data = '0x40131e6800000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000041241110ddfb6f077fc4e8cf6091511b4d69d0aca17d96baeecdc5abbe3e7897fb12a66c95ce3d33f75f59d5886c7c881e1614dafd17a121cd2773dd698097df051b00000000000000000000000000000000000000000000000000000000000000';

    const decodedInput = decoder.decodeData(data);
    console.log(decodedInput);
};

test();