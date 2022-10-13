require('dotenv').config();

const ethers = require('ethers');

/**
 * `networksByChainId` gets the network names by their Chain IDs.
 * Used primarily for `calculateUsdPrice` whereby if the networks are unknown, it can be searched here using their chainId.
 * Manually implemented as a lot of networks are unrecognized by Ethers.
 * More networks will be introduced later on.
 * Contains:
 *
 * `networkName` the custom name of the network, manually inputted (especially to identify `unknown` networks)
 *
 * `name` which is the network's name given by ethers.
 *
 * `symbol` the symbol of the network (usually their main token's symbol). adapted to CoinGecko's symbol naming to query for the price.
 *
 * `chainId` the network's chain ID
 */
const networksByChainId = {
    43114: {
        networkName: 'Avalanche Network',
        name: 'unknown',
        symbol: 'avax',
        chainId: 43114,
    },
    43113: {
        networkName: 'Avalanche Network Testnet',
        name: 'unknown',
        symbol: 'avax',
        chainId: 43113,
    },
    56: {
        networkName: 'BNB Smart Chain',
        name: 'bnb',
        symbol: 'bnb',
        chainId: 56,
        ensAddress: null,
        _defaultProvider: null,
    },
    97: {
        networkName: 'BNB Smart Chain Testnet',
        name: 'bnbt',
        symbol: 'bnb',
        chainId: 97,
        ensAddress: null,
        _defaultProvider: null,
    },
    25: {
        networkName: 'Cronos Mainnet',
        name: 'unknown',
        symbol: 'cro',
        chainId: 25,
    },
    338: {
        networkName: 'Cronos Testnet',
        name: 'unknown',
        symbol: 'cro',
        chainId: 338,
    },
    1: {
        networkName: 'Ethereum Mainnet',
        name: 'homestead',
        symbol: 'eth',
        chainId: 1,
        ensAddress: '0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e',
        // _defaultProvider: [Function: func] { renetwork: [Function (anonymous)]
    },
    5: {
        networkName: 'Ethereum Goerli Testnet',
        name: 'goerli',
        symbol: 'eth',
        chainId: 5,
        ensAddress: '0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e',
        // _defaultProvider: [Function: func] { renetwork: [Function (anonymous)]
    },
    137: {
        networkName: 'Matic Network',
        name: 'matic',
        symbol: 'matic',
        chainId: 137,
        ensAddress: null,
        // _defaultProvider: [Function: func] { renetwork: [Function (anonymous)]
    },
    80001: {
        networkName: 'Matic Mumbai Testnet',
        name: 'maticmum',
        symbol: 'matic',
        chainId: 80001,
        ensAddress: null,
        _defaultProvider: null,
    },
};

/**
 * `checkNetworkObject` returns an Ethers Network object which contains its:
 * `name`, `chainId`, `ensAddress` and `_defaultProvider`.
 * @param {String} rpcUrl the network's RPC URL
 * @return {ethers.providers.Network} the Ethers Network object.
 */
const checkNetworkObject = async (rpcUrl) => {
    try {
        const rpcProvider = new ethers.providers.JsonRpcProvider(rpcUrl);
        const networkObject = await rpcProvider.getNetwork();

        console.log(networkObject);
    } catch (err) {
        throw err;
    }
};

module.exports = {
    networksByChainId,
    checkNetworkObject,
};
