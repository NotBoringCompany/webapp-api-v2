/////////////////////// This utils file is used to calculate the type effectiveness of NBMons ///////////////////////
require('dotenv').config();

const axios = require('axios').default;

const typesTable = process.env.TYPESTABLE_ID;
const notionSecret = process.env.NOTION_TOKEN;

/**
 * @dev These are all the available types of NBMons.
 * These are organized in this manner based on the Types table/damage multiplier from Notion.
 * The syntax to obtain the type TITLE is as follows:
 * 
 * (from axios post response): response.data.results[xyz].properties['Atk (Y) /Def (X)'].title[0].rich_text
 * 
 * where xyz is the index of the type, starting from 0.
 * Reptile is 0, and Water is 14.
 */
const allTypes = [
    'Reptile',
    'Toxic',
    'Magic',
    'Psychic',
    'Brawler',
    'Crystal',
    'Frost',
    'Spirit',
    'Nature',
    'Wind',
    'Ordinary',
    'Fire',
    'Earth',
    'Electric',
    'Water'
];

/**
 * `getAttackEffectiveness` gets the attack effectiveness of the NBMon against other types.
 * @param {String} firstType is the first type of the NBMon.
 * @param {String} secondType is the second type of the NBMon (if not empty/null).
 * @returns {Object} an object containing what the NBMon is strong or weak against attack-wise.
 */
const getAttackEffectiveness = async (firstType, secondType) => {
    try {
        if (firstType === undefined || firstType === null || firstType === '') {
            throw new Error('Please specify at least the firstType.');
        }

        // if second type is empty, we force it to become null.
        if (secondType === undefined || secondType === null || secondType === '') {
            secondType = null;
        }

        // the config to obtain the types table from notion.
        const config = {
            method: 'post',
            url: `https://api.notion.com/v1/databases/${typesTable}/query`,
            headers: {
                'Notion-Version': '2022-06-28',
                'Authorization': notionSecret
            }
        };

        // response will return the entire notion database in JSON format.
        // Additional error manipulation to retrieve if it comes from the response or the request.
        const response = await axios(config).catch((err) => {
            if (err.response) {
                throw new Error(`Error: ${err.response.data.errorMessage}`);
            } else if (err.request) {
                throw new Error(`Error: ${err.request.data.errorMessage}`);
            } else {
                throw new Error(`Error: ${err}`);
            }
        });

        // we will return the index of the respective types from the `allTypes` array when querying the response obtained above.
        // note the extra check `toLowerCase`. This is to make the type search case-insensitive.
        const firstTypeIndex = allTypes.findIndex(type => type.toLowerCase() === firstType.toLowerCase());
        const secondTypeIndex = secondType !== null ? allTypes.findIndex(type => type.toLowerCase() === secondType.toLowerCase()) : -1;

        // now, we get all the attack multipliers to find the attack effectiveness for the first type. this is done by doing a for loop on the `allTypes` array.
        // strong against are the types that the first type is strong against (attack wise).
        // weak against are the types that the first type is weak against (attack wise).
        // the calculation is as follows: if the multiplier is more than 1, then it is strong against that type. if the multiplier is less than 1, then it is weak against that type.
        let strongAgainst = [];
        let weakAgainst = [];

        if (secondType === null) {
            allTypes.forEach((type) => {
                // first we check if the multiplier array is empty. if it is, then it's counted as 1. if not, we will get `rich_text[0].plain_text`.
                let multiplier = response.data.results[firstTypeIndex].properties[type].rich_text;
    
                if (multiplier.length === 0 || multiplier === undefined || multiplier === null) {
                    multiplier = 1;
                } else {
                    multiplier = parseFloat(response.data.results[firstTypeIndex].properties[type].rich_text[0].plain_text) / 100;
                }
    
                // if multiplier is less than 1, then this type is weak against that type (attack wise), otherwise it is strong against it.
                if (multiplier < 1) {
                    weakAgainst.push(type);
    
                } else if (multiplier > 1) {
                    strongAgainst.push(type);
                }
            });
        // if there is a second type, we multiply the first and second type effectiveness to get the resulting effectiveness.
        } else {
            allTypes.forEach((type) => {
                let firstTypeMultiplier = response.data.results[firstTypeIndex].properties[type].rich_text;
                let secondTypeMultiplier = response.data.results[secondTypeIndex].properties[type].rich_text;

                if (firstTypeMultiplier.length === 0 || firstTypeMultiplier === undefined || firstTypeMultiplier === null) {
                    firstTypeMultiplier = 1;
                } else {
                    firstTypeMultiplier = parseFloat(response.data.results[firstTypeIndex].properties[type].rich_text[0].plain_text) / 100;
                }

                if (secondTypeMultiplier.length === 0 || secondTypeMultiplier === undefined || secondTypeMultiplier === null) {
                    secondTypeMultiplier = 1;
                } else {
                    secondTypeMultiplier = parseFloat(response.data.results[secondTypeIndex].properties[type].rich_text[0].plain_text) / 100;
                }

                const multiplier = firstTypeMultiplier * secondTypeMultiplier;

                if (multiplier < 1) {
                    weakAgainst.push(type);
                } else {
                    strongAgainst.push(type);
                }
            });
        }

        console.log(strongAgainst, weakAgainst);

        return {
            'Strong against': strongAgainst,
            'Weak against': weakAgainst
        };
    } catch (err) {
        throw err;
    }
}

/**
 * `getDefenseEffectiveness` gets the defense effectiveness of the NBMon against other types.
 * NOTE: For this function, please enter the types with proper casing (i.e. Reptile, not reptile, rEpTile, or anything else.)
 * @param {String} firstType is the first type of the NBMon.
 * @param {String} secondType is the second type of the NBMon (if not empty/null).
 * @returns {Object} an object containing what the NBMon is resistant or vulnerable to defense-wise.
 */
const getDefenseEffectiveness = async (firstType, secondType) => {
    try {
        if (firstType === undefined || firstType === null || firstType === '') {
            throw new Error('Please specify at least the firstType.');
        }
        
        // if second type is empty, we force it to become null.
        if (secondType === undefined || secondType === null || secondType === '') {
            secondType = null;
        }

        // the config to obtain the types table from notion.
        const config = {
            method: 'post',
            url: `https://api.notion.com/v1/databases/${typesTable}/query`,
            headers: {
                'Notion-Version': '2022-06-28',
                'Authorization': notionSecret
            }
        };

        // response will return the entire notion database in JSON format.
        // Additional error manipulation to retrieve if it comes from the response or the request.
        const response = await axios(config).catch((err) => {
            if (err.response) {
                throw new Error(`Error: ${err.response.data.errorMessage}`);
            } else if (err.request) {
                throw new Error(`Error: ${err.request.data.errorMessage}`);
            } else {
                throw new Error(`Error: ${err}`);
            }
        });

        // now, we get all the defense multipliers to find the defense effectiveness for the first type. this is done by doing a for loop on the `allTypes` array.
        // resistant to are the types that the first type is resistant to (defense wise).
        // vulnerable to are the types that the first type is vulnerable to (defense wise).
        // the calculation is as follows: if the multiplier is less than 1, then it is resistant to that type. if the multiplier is more than 1, then it is vulnerable to that type.
        let resistantTo = [];
        let vulnerableTo = [];

        // the query for the multiplier is slightly different than `getAttackEffectiveness`. in `getAttackEffectiveness`, the multiplier is searched by using this syntax:
        // response.data.results[TYPE INDEX OF HERE].properties[ATTACKING TYPE].rich_text[0].plain_text (assuming rich_text is not empty).
        // the syntax will be the same, but slightly changed in order:
        // response.data.results[ATTACKING TYPE].properties[DEFENDING TYPE NAME].rich_text[0].plain_text.
        // this is to obtain the attack multiplier of the attacking type against the defending type (the nbmon).

        if (secondType === null) {
            allTypes.forEach((type, index) => {
                // this multiplier actually works as both the attacking multiplier of the `type` to the NBMon's type as well as the
                // defense multiplier. The logic works like this:
                // if let's say the `type` is a Reptile and the NBMon is an Ordinary type, the multiplier will return 0.75.
                // this means that the Reptile is weak against the NBMon (attack wise), and the NBMon is resistant to the Reptile (defense wise).
                let multiplier = response.data.results[index].properties[firstType].rich_text;
                
                if (multiplier.length === 0 || multiplier === undefined || multiplier === null) {
                    multiplier = 1;
                } else {
                    multiplier = parseFloat(response.data.results[index].properties[firstType].rich_text[0].plain_text) / 100;
                }

                if (multiplier < 1) {
                    resistantTo.push(type);
                } else if (multiplier > 1) {
                    vulnerableTo.push(type);
                }
            });
        // if there is a second type, we multiply the first and second type effectiveness to get the resulting effectiveness.
        } else {
            allTypes.forEach((type, index) => {
                let firstTypeMultiplier = response.data.results[index].properties[firstType].rich_text;
                let secondTypeMultiplier = response.data.results[index].properties[secondType].rich_text;

                if (firstTypeMultiplier.length === 0 || firstTypeMultiplier === undefined || firstTypeMultiplier === null) {
                    firstTypeMultiplier = 1;
                } else {
                    firstTypeMultiplier = parseFloat(response.data.results[index].properties[firstType].rich_text[0].plain_text) / 100;
                }

                if (secondTypeMultiplier.length === 0 || secondTypeMultiplier === undefined || secondTypeMultiplier === null) {
                    secondTypeMultiplier = 1;
                } else {
                    secondTypeMultiplier = parseFloat(response.data.results[index].properties[secondType].rich_text[0].plain_text) / 100;
                }

                const multiplier = firstTypeMultiplier * secondTypeMultiplier;

                if (multiplier < 1) {
                    resistantTo.push(type);
                } else if (multiplier > 1) {
                    vulnerableTo.push(type);
                }
            });
        }

        console.log(resistantTo, vulnerableTo);

        return {
            'Resistant to': resistantTo,
            'Vulnerable to': vulnerableTo
        };
    } catch (err) {
        throw err;
    }
}

module.exports = {
    getAttackEffectiveness,
    getDefenseEffectiveness
}