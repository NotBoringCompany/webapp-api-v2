const { expect } = require('chai');
const Moralis = require('moralis-v1/node');
require('dotenv').config();

const genesisNBMon = require('../api/nfts/genesisNBMon');

describe('Get Genesis NBMon #1', async () => {
    let nbmon;
    beforeEach(async () => {
        // await Moralis.start({
        //     serverUrl: process.env.MORALIS_SERVERURL,
        //     appId: process.env.MORALIS_APPID,
        //     masterKey: process.env.MORALIS_MASTERKEY,
        // });
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

// describe('Get Genesis NBMon #1 (alternative)', async () => {
//     beforeEach(async () => {
//         await Moralis.start({
//             serverUrl: process.env.MORALIS_SERVERURL,
//             appId: process.env.MORALIS_APPID,
//             masterKey: process.env.MORALIS_MASTERKEY,
//         });
//         nbmon = await genesisNBMon.getGenesisNBMonAlt(1);
//     });

//     it('Should have C#-friendly return values', async () => {
//         expect(nbmon.hatchedAt).to.equal(-1);
//         expect(nbmon.behavior).to.equal('');
//     });
// });


