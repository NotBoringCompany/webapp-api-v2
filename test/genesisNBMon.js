require('dotenv').config();
const { expect } = require('chai');
const Moralis = require('moralis-v1/node');
const ethers = require('ethers');
const fs = require('fs');
const path = require('path');

const genesisNBMon = require('../api/nfts/genesisNBMon');

// NOTE: The GenesisNBMon contract will only exist in ONE blockchain.
// This means that there is no need to specify multiple RPC URLs for dynamic interaction.
// Currently, this RPC URL is set to BSC Testnet for testing purposes, but it will most likely be on Ethereum.
const rpcUrl = process.env.BSC_RPC_URL;
const rpcProvider = new ethers.providers.JsonRpcProvider(rpcUrl);

// Genesis NBMon contract-related variables
const genesisABI = JSON.parse(
    fs.readFileSync(
        path.join(__dirname, '../abi/genesisNBMon.json'),
    ),
);

const genesisContract = new ethers.Contract(
    process.env.GENESIS_NBMON_ADDRESS,
    genesisABI,
    rpcProvider,
);

describe('Get Genesis NBMon #1', async () => {
    let nbmon;
    beforeEach(async () => {
        await Moralis.start({
            serverUrl: process.env.MORALIS_SERVERURL,
            appId: process.env.MORALIS_APPID,
            masterKey: process.env.MORALIS_MASTERKEY,
        });
        nbmon = await genesisNBMon.getGenesisNBMon(1);
    });

    // it('Test BSC URL should equal the one in .env', async () => {
    //     expect(process.env.BSC_RPC_URL).to.equal('https://data-seed-prebsc-1-s1.binance.org:8545');
    // });

    it('Should return an object', async () => {
        expect(nbmon).to.be.an('object');
    });

    it('Should contain the right properties', async () => {
        expect(nbmon).to.have.all.keys(
            'nbmonId',
            'owner',
            'bornAt',
            'hatchedAt',
            'isHatchable',
            'transferredAt',
            'hatchingDuration',
            'types',
            'strongAgainst',
            'weakAgainst',
            'resistantTo',
            'vulnerableTo',
            'passives',
            'gender',
            'rarity',
            'species',
            'genus',
            'mutation',
            'mutationType',
            'behavior',
            'fertility',
            'fertilityDeduction',
            'healthPotential',
            'energyPotential',
            'attackPotential',
            'defensePotential',
            'spAtkPotential',
            'spDefPotential',
            'speedPotential',
            'isEgg',
            'isListed',
            'listingData',
            'currentExp',
            'level',
            'nickname',
            'skillList',
            'maxHpEffort',
            'maxEnergyEffort',
            'speedEffort',
            'attackEffort',
            'spAtkEffort',
            'defenseEffort',
            'spDefEffort',
        );
    });

    it('Should have a proper ID', async () => {
        expect(nbmon.nbmonId).to.equal(1);
    });
});

describe('Get Genesis NBMon #1 (alternative)', async () => {
    beforeEach(async () => {
        await Moralis.start({
            serverUrl: process.env.MORALIS_SERVERURL,
            appId: process.env.MORALIS_APPID,
            masterKey: process.env.MORALIS_MASTERKEY,
        });
        nbmon = await genesisNBMon.getGenesisNBMonAlt(1);
    });

    it('Should have C#-friendly return values', async () => {
        expect(nbmon.hatchedAt).to.equal(-1);
        expect(nbmon.behavior).to.equal('');
    });
});

// ONE TIME FN! please remember to change the addresses after the tests succeed or else it will fail when invoking the blockchain fn.
describe('Change ownership', async () => {
    const idToTransfer = 6;
    beforeEach(async () => {
        await Moralis.start({
            serverUrl: process.env.MORALIS_SERVERURL,
            appId: process.env.MORALIS_APPID,
            masterKey: process.env.MORALIS_MASTERKEY,
        });
    });
    // SAFE TRANSFER FROM FN HAS ISSUES WITH THE `V` HASH. THIS WILL BE DONE MANUALLY!
    it('Should transfer ownership via `safeTransferFrom`', async () => {
        // first, invoke `safeTransferFrom` to transfer the Genesis NBMon to another owner, then check for ownership.
        // since we need to sign the transaction, we need to use the private key of the owner.

        // instead of using populate transaction, this method is needed due to `safeTransferFrom` being an overloaded fn.
        const unsignedTx = await genesisContract.populateTransaction['safeTransferFrom(address,address,uint256)'](
            // from address
            '0x213D2806B07fB2BFCd51fCbC7503755784C72F09',
            // to address
            '0x2175cF248625c4cBefb204E76f0145b47d9061F8',
            // nbmon ID
            idToTransfer,
        );

        // TEST_NBMON_OWNER_PRIVATE_KEY is the private key to genesis nbmon owner 9 (0x213D2806B07fB2BFCd51fCbC7503755784C72F09)
        const signer = new ethers.Wallet(process.env.TEST_NBMON_OWNER_PRIVATE_KEY, rpcProvider);

        const signedTx = await signer.sendTransaction(unsignedTx);
        // wait for the tx to be signed and mined
        await signedTx.wait();
    });

    it('Should call `changeOwnership` with no issues', async () => {
        // now, after changing the ownership, we can call the `changeOwnership` function and see if it doesn't throw.
        const changeOwner = await genesisNBMon.changeOwnership(idToTransfer);
        // note that `changeOwnership` has two potential return statements - 'Unchanged' and 'OK'.
        expect(changeOwner.status).to.be.oneOf(['Unchanged', 'OK']);
    });
});

describe('Update Genesis NBMons by address', async () => {
    beforeEach(async () => {
        await Moralis.start({
            serverUrl: process.env.MORALIS_SERVERURL,
            appId: process.env.MORALIS_APPID,
            masterKey: process.env.MORALIS_MASTERKEY,
        });
    });

    it('Should not throw', async () => {
        // from previous test, check if both addresses update properly.
        const addr1 = await genesisNBMon.updateGenesisNBMonsByAddress('0x2175cF248625c4cBefb204E76f0145b47d9061F8');
        const addr2 = await genesisNBMon.updateGenesisNBMonsByAddress('0x213D2806B07fB2BFCd51fCbC7503755784C72F09');
        expect(addr1.status).to.be.oneOf(['Unchanged', 'OK']);
        expect(addr2.status).to.be.oneOf(['Unchanged', 'OK']);
    });
});


