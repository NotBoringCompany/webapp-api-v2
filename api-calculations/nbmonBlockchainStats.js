require('dotenv').config();

const axios = require('axios').default;

const nbpedia = process.env.NBPEDIA_ID;
const passivesTable = process.env.PASSIVESTABLE_ID;
const notionSecret = process.env.NOTION_TOKEN;

/**
 * `randomizeGender` randomizes the gender of the NBMon between male and female.
 * @return {String} the gender of the NBMon.
 */
const randomizeGender = () => {
    const genderRand = Math.floor(Math.random() * 2) + 1;
    return genderRand === 1 ? 'Male': 'Female';
};

/**
 * `randomizeGenesisRarity` randomizes the rarity of a Genesis NBMon.
 * Note that other NBMon generations will have different rarity calculations.
 * @return {String} the rarity of the NBMon.
 */
const randomizeGenesisRarity = () => {
    const rarityRand = Math.floor(Math.random() * 1000) + 1;

    switch (true) {
    // 50% chance to get common
    case (rarityRand <= 500):
        return 'Common';
    // 25% chance to get uncommon
    case (rarityRand <= 750):
        return 'Uncommon';
    // 12.5% chance to get rare
    case (rarityRand <= 875):
        return 'Rare';
    // 7% chance to get epic
    case (rarityRand <= 945):
        return 'Epic';
    // 4% chance to get legendary
    case (rarityRand <= 985):
        return 'Legendary';
    // 1.5% chance to get mythical
    case (rarityRand <= 1000):
        return 'Mythical';
    }
};

/**
 * `randomizeGenesisGenus` randomizes the available genera for the Genesis NBMon.
 * Only 12 genesis genera are available to be picked.
 * @return {String} the genus of the Genesis NBMon.
 */
const randomizeGenesisGenus = () => {
    const availableGenera = [
        'Lamox',
        'Licorine',
        'Unicorn',
        'Dranexx',
        'Milnas',
        'Todillo',
        'Birvo',
        'Pongu',
        'Darrakan',
        'Kirin',
        'Heree',
        'Spherno',
    ];

    const genusRand = Math.floor(Math.random() * availableGenera.length);

    return availableGenera[genusRand];
};

/**
 * `randomizeGenesisMutation` randomizes the chance for a Genesis NBMon to be mutated. Returns the mutation type if mutated.
 * @param {String} genus the genus of the Genesis NBMon.
 * @return {Promise<String>} The mutation type of the NBMon if applicable.
 */
const randomizeGenesisMutation = async (genus) => {
    try {
        const mutationRand = Math.floor(Math.random() * 1000) + 1;

        // there is a 0.5% chance of mutation for Genesis NBMons.
        if (mutationRand >= 996) {
            const config = {
                method: 'post',
                url: `https://api.notion.com/v1/databases/${nbpedia}/query`,
                headers: {
                    'Notion-Version': '2022-06-28',
                    'Authorization': notionSecret,
                },
            };

            // getting the axios response for the mutations table from Notion
            const response = await axios(config).catch((err) => {
                if (err.response) {
                    throw new Error(`Error: ${err.response.data.errorMessage}`);
                } else if (err.request) {
                    throw new Error(`Error: ${err.request.data.errorMessage}`);
                } else {
                    throw new Error(`Error: ${err}`);
                }
            });

            // the results obtained from the axios response if no errors are found
            const results = response.data.results;

            let mutationType;

            // here we query through the results index until we find the one that matches our genus.
            results.forEach((result) => {
                // if it matches, we proceed to get the mutation type.
                if (result.properties['Official Name'].title[0].plain_text.toLowerCase() === genus.toLowerCase()) {
                    const possibleMutations = result.properties['Mutations'].multi_select;

                    // if somehow the database doesn't have a mutation type available for that genus, we don't want to throw an error and make the
                    // user lose their mutated NBMon. So we just temporarily return this string which will prompt them to contact us.
                    if (possibleMutations.length === 0) {
                        return 'NBMon mutated, but no available mutations specified for that genus yet. Please contact the developers.';
                    }

                    // here we randomize the mutation type depending on the amount of mutation types available for that particular genus.
                    const mutationTypeRand = Math.floor(Math.random() * possibleMutations.length);

                    // same like the above check, we don't want the user to lose their mutated NBMon.
                    // We temporarily return this string which will prompt them to contact us.
                    if (
                        possibleMutations[mutationTypeRand].name === undefined ||
                        possibleMutations[mutationTypeRand].name === null ||
                        possibleMutations[mutationTypeRand].name === '') {
                        return 'NBMon mutated, but no available mutations specified for that genus yet. Please contact the developers.';
                    }
                    mutationType = possibleMutations[mutationTypeRand].name;
                }
            });

            return mutationType;
        } else {
            return 'Not mutated';
        }
    } catch (err) {
        throw err;
    }
};

/**
 * `randomizeGenesisPotential` randomizes the potential stats of the Genesis NBMon.
 * Note that similar to rarity, other NBMon generations will have different potential calculations.
 * @param {String} rarity the rarity of the Genesis NBMon.
 * @return {Array} the potential stats of the Genesis NBMon.
 */
const randomizeGenesisPotential = (rarity) => {
    // there are 7 potential stats in total. all of them will be stored in this array.
    const potentialArray = [];

    switch (rarity) {
    case 'Common':
        for (let i = 0; i <= 6; i++) {
            // potential for each stat is between 0 - 25
            const potentialRand = Math.floor(Math.random() * 25);
            potentialArray[i] = potentialRand;
        }
        break;
    case 'Uncommon':
        for (let i = 0; i <= 6; i++) {
            // potential for each stat is between 10 - 30
            const potentialRand = Math.floor(Math.random() * 21) + 10;
            potentialArray[i] = potentialRand;
        }
        break;
    case 'Rare':
        for (let i = 0; i <= 6; i++) {
            // potential for each stat is between 20 - 40
            const potentialRand = Math.floor(Math.random() * 21) + 20;
            potentialArray[i] = potentialRand;
        }
        break;
    case 'Epic':
        for (let i = 0; i <= 6; i++) {
            // potential for each stat is between 30 - 50
            const potentialRand = Math.floor(Math.random() * 21) + 30;
            potentialArray[i] = potentialRand;
        }
        break;
    case 'Legendary':
        for (let i = 0; i <= 6; i++) {
            // potential for each stat is between 40 - 55
            const potentialRand = Math.floor(Math.random() * 16) + 40;
            potentialArray[i] = potentialRand;
        }
        break;
    case 'Mythical':
        for (let i = 0; i <= 6; i++) {
            // potential for each stat is between 50 - 65
            const potentialRand = Math.floor(Math.random() * 16) + 50;
            potentialArray[i] = potentialRand;

            // guaranteed 1 stat which is max potential (65)
            if (!potentialArray.includes(65)) {
                const maximizerRand = Math.floor(Math.random() * 7);
                potentialArray[maximizerRand] = 65;
            }
        }
        break;
    default:
        throw new Error('Invalid rarity specified. Make sure that the first letter is uppercased.');
    }

    return potentialArray;
};

/**
 * `randomizePassive` randomizes the passives the Genesis NBMon will obtain.
 * @return {Promise<Object>} the two passives the Genesis NBMon will obtain.
 */
const randomizePassives = async () => {
    try {
        // we will query the passives table to obtain the passives
        const config = {
            method: 'post',
            url: `https://api.notion.com/v1/databases/${passivesTable}/query`,
            headers: {
                'Notion-Version': '2022-06-28',
                'Authorization': notionSecret,
            },
        };

        // getting the axios response for the passives table from Notion
        const response = await axios(config).catch((err) => {
            if (err.response) {
                throw new Error(`Error: ${err.response.data.errorMessage}`);
            } else if (err.request) {
                throw new Error(`Error: ${err.request.data.errorMessage}`);
            } else {
                throw new Error(`Error: ${err}`);
            }
        });

        const results = response.data.results;

        // results.length is the total amount of passives that are available (per the passives table).
        // in order for us to randomize the two passives, we will randomize the index to obtain.
        const passiveRand = Math.floor(Math.random() * results.length);
        let passiveRandTwo = Math.floor(Math.random() * results.length);

        // to not get the same passive index, we will do a while do loop to prevent this.
        do {
            passiveRandTwo = Math.floor(Math.random() * results.length);
        } while (passiveRand === passiveRandTwo);

        // there is a possibility that some passives might accidentally have no name.
        // in this case, we will return a string that says `passive name unavailable` to make aware of this.
        const firstPassive = results[passiveRand].properties.Name.title[0].plain_text !== undefined ?
            results[passiveRand].properties.Name.title[0].plain_text :
            'Passive name unavailable. Please contact us about this.';

        const secondPassive = results[passiveRandTwo].properties.Name.title[0].plain_text !== undefined ?
            results[passiveRandTwo].properties.Name.title[0].plain_text :
            'Passive name unavailable. Please contact us about this.';

        return {
            firstPassive: firstPassive,
            secondPassive: secondPassive,
        };
    } catch (err) {
        throw err;
    }
};

module.exports = {
    randomizeGenesisGenus,
    randomizeGenesisRarity,
    randomizeGenesisMutation,
    randomizeGenesisPotential,
    randomizePassives,
    randomizeGender,
};
