const { expect, should } = require('chai');
const chaiHttp = require('chai-http');
const Moralis = require('moralis-v1/node');
require('dotenv').config();

const genesisNBMon = require('../api/nfts/genesisNBMon');

// describe('Test 1', () => {
//     it('should return 1', () => {
//         const res1 = 1;
//         expect(res1).to.equal(1);
//     });
// });

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
