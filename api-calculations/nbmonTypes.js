////////////////////// This file serves to retrieve the types of a particular NBMon ///////////////////////
require('dotenv').config();

const axios = require('axios').default;

const nbpedia = process.env.NBPEDIA_ID;
const notionSecret = process.env.NOTION_TOKEN;

/**
 * `getNBMonTypes` retrieves the types of the NBMon.
 * @param {String} genus is the genus of the NBMon (e.g. Lamox, Licorine etc.)
 * @returns {Array} an array of the NBMon's types.
 */
const getNBMonTypes = async (genus) => {
    try {
        if (genus === undefined || genus === null || genus === '') {
            throw new Error('Please specify a genus');
        }

        // the config to obtain the NBPedia from notion.
        const config = {
            method: 'post',
            url: `https://api.notion.com/v1/databases/${nbpedia}/query`,
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

        const results = response.data.results;
        let types = [];

        results.forEach((result) => {
            // case-insensitive search
            if (result.properties['Official Name'].title[0].plain_text.toLowerCase() === genus.toLowerCase()) {
                // we check if Notion has the correct amount of types for the NBMon (at least 1).
                let amountOfTypes = result.properties.Types.multi_select.length;
                if (amountOfTypes === 0) {
                    throw new Error('This NBMon does not have any types added on Notion. Please add at least 1 type.');
                } else if (amountOfTypes === 1) {
                    types.push(result.properties.Types.multi_select[0].name);
                } else if (amountOfTypes === 2) {
                    types.push(result.properties.Types.multi_select[0].name);
                    types.push(result.properties.Types.multi_select[1].name);
                // if there are more than 2 types, then the NBMon needs to be changed to have a maximum of only 2 types to not damage the whole code structure.
                } else if (amountOfTypes >= 3) {
                    throw new Error('An NBMon cannot have more than 2 types. Please check the Notion database and fix this.');
                }
            }
        });

        return types;
    } catch (err) {
        throw err;
    }
}

module.exports = { getNBMonTypes };