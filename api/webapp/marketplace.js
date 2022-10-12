require('dotenv').config();

const crypto = require('crypto');
const Moralis = require('moralis-v1/node');
const moment = require('moment');
const axios = require('axios').default;

// IMPORTS
const { parseJSON } = require('../../utils/jsonParser');

/**
 * `listItem` lists an item for sale in the marketplace.
 * @param {String} nftContract the address of the item's NFT contract
 * @param {Number} tokenId the NFT ID
 * @param {String} paymentToken the address of the payment token (e.g. BUSD, WETH etc)
 * @param {String} paymentTokenChain the chain of the payment token (e.g. BSC). Can be in hexadecimal or string format, but preferably string.
 * @param {String} seller the address of the seller
 * @param {String} txSalt a random string generated by the `crypto` library to ensure that the hash is unique
 * @param {String} signature the signature generated by the seller to prove ownership of the NFT
 * @param {Number} saleType a number representing an enum type of sale (0 = fixed price, 1 = timed auction, 2 = bid auction)
 * @param {Number} price the price of the item in ether
 * @param {Number} startingPrice the starting price of the item
 * @param {Number} endingTime the unix timestamp of when the sale ends
 * @param {Number} endingPrice the ending price of the item
 * @param {Number} minimumReserveBid ONLY for bid auctions. the minimum bid required for the item to be sold.
 * @param {Number} duration the duration of the sale (in seconds)
 * @param {String} listingType the listing type of the sale (used in FE).
 * This can be `fixedPrice`, `timedAuction`,`absoluteBidding`, `reservedBidding` or `minimumBidding`. Not used for transaction data to the blockchain.
 * @return {Object} an object with 'status: OK' if successful, or an error thrown otherwise.
 */
const listItem = async (
    nftContract,
    tokenId,
    paymentToken,
    paymentTokenChain,
    seller,
    txSalt,
    signature,
    saleType,
    price,
    startingPrice,
    endingTime,
    endingPrice,
    minimumReserveBid,
    duration,
    listingType,
) => {
    try {
        // checks if the nft contract address is equivalent to the Genesis NBMon contract. The marketplace only supports Genesis NBMons for now.
        // this is to prevent random nft sales to be added to Moralis.
        // NOTE: Please change the env to ACTUAL_ADDRESS once testing is complete.
        if (nftContract.toLowerCase() !== process.env.GENESIS_NBMON_TESTING_ADDRESS.toLowerCase()) {
            throw new Error('Specified NFT contract is NOT Genesis NBMon. We currently only support Genesis NBMon');
        }

        const ItemsOnSale = Moralis.object.extend('ItemsOnSale');
        const itemsOnSale = new ItemsOnSale();

        itemsOnSale.set('nftContract', nftContract);
        itemsOnSale.set('tokenId', tokenId);
        itemsOnSale.set('paymentToken', paymentToken);
        itemsOnSale.set('paymentTokenChain', paymentTokenChain);
        itemsOnSale.set('seller', seller);
        itemsOnSale.set('txSalt', txSalt);
        itemsOnSale.set('signature', signature);
        itemsOnSale.set('saleType', saleType);
        itemsOnSale.set('price', price);
        itemsOnSale.set('startingPrice', startingPrice);
        itemsOnSale.set('endingTime', endingTime);
        itemsOnSale.set('endingPrice', endingPrice);
        itemsOnSale.set('minimumReserveBid', minimumReserveBid);
        itemsOnSale.set('duration', duration);
        itemsOnSale.set('listingType', listingType);

        itemsOnSale.save(null, { useMasterKey: true });

        return {
            status: 'OK',
        };
    } catch (err) {
        throw err;
    }
};

/**
 * @param {Boolean} status changes the status of the item to be listed or not listed.
 * @param {String} nftContract the address of the item's NFT contract
 * @param {Number} tokenId the NFT ID
 * @return {Object} an object with 'status: OK' if successful, or an error thrown otherwise.
 */
const changeIsListedStatus = async (status, nftContract, tokenId) => {
    try {
        const MintedNFTs = new Moralis.Query('MintedNFTs');
        MintedNFTs.equalTo('contractAddress', nftContract);
        MintedNFTs.equalTo('tokenId', tokenId);

        const result = await MintedNFTs.first({ useMasterKey: true });

        result.set('isListed', status);

        await result.save(null, { useMasterKey: true });

        return {
            status: 'OK',
        };
    } catch (err) {
        throw err;
    }
};

/**
 * `generateTxSalt` generates a random string to be used as a salt for the transaction.
 * @return {String} a random string generated by the `crypto` library
 */
const generateTxSalt = () => {
    return crypto.randomBytes(256).toString('hex');
};

/**
 * `getItemsOnSale` gets all items that are currently on sale in the marketplace.
 * @return {Array} an array of items that are on sale.
 */
const getItemsOnSale = async () => {
    try {
        // we are querying the MintedNFTs class since we want to query for items that have `isListed` to be true.
        // `isListed` turns true after an item is put up for sale.
        const MintedNFTs = new Moralis.Query('MintedNFTs');
        MintedNFTs.equalTo('isListed', true);

        const result = await MintedNFTs.find({ useMasterKey: true });

        if (result === undefined) {
            throw new Error('Cannot find items on sale. Please check the database.');
        }

        // we want to parse the items to be returned in a more readable format.
        const items = parseJSON(result);

        // we create a new array to structure and readjust `items`.
        const structuredItems = items.map(async (item, index) => {
            // we get the nft contract address and token id of each item to obtain their specific listing data.
            const nftContract = item.contractAddress;
            const tokenId = item.tokenId;
            const listingData = await getListingData(nftContract, tokenId);

            // if listing data is null, that means that the item is still on sale but has expired.
            if (listingData === null) {
                // we set the `isListed` status to false and delete the item from being on sale.
                await changeIsListedStatus(false, nftContract, tokenId);
                await deleteItemOnSale(nftContract, tokenId);

                return null;
            } else {
                return { ...item, listingData };
            }
        });

        // we want to only return all items that are not null.
        return (await Promise.all(structuredItems)).filter((item) => item !== null);
    } catch (err) {
        throw err;
    }
};

/**
 * `deleteItemOnSale` deletes an item that was on sale from the `ItemsOnSale` class.
 * NOTE: does NOT change the status of the item on `MintedNFTs`. For this, an extra call to `changeIsListedStatus` is required.
 * @param {String} nftContract the address of the item's NFT contract
 * @param {Number} tokenId the NFT ID
 * @return {Object} an object with 'status: OK' if successful, or an error thrown otherwise.
 */
const deleteItemOnSale = async (nftContract, tokenId) => {
    try {
        const ItemsOnSale = new Moralis.Query('ItemsOnSale');
        ItemsOnSale.equalTo('nftContract', nftContract);
        ItemsOnSale.equalTo('tokenId', tokenId);

        const item = await ItemsOnSale.first({ useMasterKey: true });

        if (item === undefined) {
            throw new Error('Cannot find specific item. Please ensure that the item specified is on sale, or that the NFT address is correct.');
        }

        await item.destroy({ useMasterKey: true });

        return {
            status: 'OK',
        };
    } catch (err) {
        throw err;
    }
};

/**
 * `getListingData` gets a single item on sale's listing detail/data
 * @param {String} nftContract the address of the item's NFT contract
 * @param {Number} tokenId the NFT ID
 * @return {Object} an item for sale object if query is not empty.
 */
const getListingData = async (nftContract, tokenId) => {
    try {
        // first, we query for items on sale that are of `nftContract`, then of `tokenId`.
        const ItemsOnSale = new Moralis.Query('ItemsOnSale');
        ItemsOnSale.equalTo('nftContract', nftContract);
        ItemsOnSale.equalTo('tokenId', tokenId);

        // we get the initial result to first check if this particular item exists in `ItemsOnSale`.
        const initialResult = await ItemsOnSale.first({ useMasterKey: true });

        if (initialResult === undefined || initialResult === null || initialResult === '') {
            throw new Error('Item not found. Please check the NFT contract address and token ID.');
        }

        // then we ensure that the item on sale is not expired.
        ItemsOnSale.greaterThan('endingTime', moment().unix());

        const result = await ItemsOnSale.first({ useMasterKey: true });

        // instead of throwing an error, if the item does exist BUT is expired, we return null.
        if (result === undefined || result === null || result === '') {
            return null;
        }

        const item = parseJSON(result);
        return item;
    } catch (err) {
        throw err;
    }
};

/**
 * `changeOwnerAndListingStatus` is called after a successful item purchase.
 * It changes the owner of the purchased item to `purchaserAddress` and at the same time changes `isListed` to false.
 * @param {String} nftContract the address of the item's NFT contract
 * @param {Number} tokenId the NFT ID
 * @param {String} purchaserAddress the purchaser's address. this will be the new owner we are trying to set to.
 * @return {Object} an object with 'status: OK' if successful, or an error thrown otherwise.
 */
const changeOwnerAndListingStatus = async (nftContract, tokenId, purchaserAddress) => {
    try {
        const MintedNFTs = new Moralis.Query('MintedNFTs');
        MintedNFTs.equalTo('contractAddress', nftContract);
        MintedNFTs.equalTo('tokenId', tokenId);

        const result = await MintedNFTs.first({ useMasterKey: true });

        if (result === undefined) {
            throw new Error('Cannot find specific item. Please ensure that the parameters are correct.');
        }

        result.set('isListed', false);
        result.set('owner', purchaserAddress);

        await result.save(null, { useMasterKey: true });

        return {
            status: 'OK',
        };
    } catch (err) {
        throw err;
    }
};

/**
 * `calculateUsdPrice` calculates the USD price of an item based on the price of the item in their respective currencies.
 * This is used since we are going to accommodate more than 1 acceptable payment token (e.g. BUSD, WETH, AVAX, CRO etc).
 * @param {String} nftContract the address of the item's NFT contract
 * @param {Number} tokenId the NFT ID
 * @return {Number} the USD price of the item.
 */
const calculateUsdPrice = async (nftContract, tokenId) => {
    try {
        const ItemsOnSale = new Moralis.Query('ItemsOnSale');
        ItemsOnSale.equalTo('nftContract', nftContract);
        ItemsOnSale.equalTo('tokenId', tokenId);

        const result = await ItemsOnSale.first({ useMasterKey: true });

        if (result === undefined) {
            throw new Error('Cannot find specific item. Please ensure that the parameters are correct.');
        }

        // we get the payment token name and the amount of tokens the item costs
        const paymentToken = (parseJSON(result)).paymentToken;
        const tokenAmount = (parseJSON(result)).price;

        let coinId;
        let coinPrice;

        // Note: we will use CoinGecko to retrieve the price of the token.
        // there is a chance that for newer tokens (such as our REC and RES) the price won't be available on CoinGecko yet.
        // though we will apply for them to be listed on CoinGecko soon, it won't be available immediately.
        // in this case, we will specifically hardcode the price search ourselves.
        // if the token isn't found, however, it will return an error.
        if (paymentToken.toLowerCase().includes('rec') || paymentToken.toLowerCase().includes('realm coin')) {
            // assuming we are launching REC in PancakeSwap
            console.log('To do: PancakeSwap API call');
        } else if (paymentToken.toLowerCase().includes('res') || paymentToken.toLowerCase().includes('realm shards')) {
            // assuming we are launching REs in PancakeSwap
            console.log('To do: PancakeSwap API call');
        } else {
            await axios
                .get(`https://api.coingecko.com/api/v3/coins/list`)
                .then((response) => {
                    const data = response.data;
                    for (let i = 0; i < data.length; i++) {
                        const coin = data[i];
                        // some tokens have multiple results. in this case, we only want the first result and hope that it is the correct one.
                        if (coin.symbol === paymentToken.toLowerCase()) {
                            coinId = coin.id;
                            break;
                        }
                    }
                });

            await axios
                .get(`https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd`)
                .then((response) => {
                    coinPrice = response.data[coinId].usd;
                });

            if (coinPrice === undefined || coinPrice === null || coinPrice === 0) {
                throw new Error('Cannot determine price of token. Please try again later');
            }
        }

        return tokenAmount * coinPrice;
    } catch (err) {
        throw err;
    }
};

module.exports = {
    listItem,
    generateTxSalt,
    deleteItemOnSale,
    getItemsOnSale,
    getListingData,
    changeOwnerAndListingStatus,
    changeIsListedStatus,
    calculateUsdPrice,
};
