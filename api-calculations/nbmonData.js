////////////////////// This file serves to retrieve the types of a particular NBMon ///////////////////////
require('dotenv').config();

const axios = require('axios').default;

const nbpedia = process.env.NBPEDIA_ID;
const notionSecret = process.env.NOTION_TOKEN;

/**
 * `getNBMonData` retrieves the data of the NBMon from our handbuilt Notion database (NBPedia). May include blockchain data.
 * @param {String} genus is the genus of the NBMon (e.g. Lamox, Licorine etc.)
 * @returns {Object} an object containing the NBMon's data.
 */
const getNBMonData = async (genus) => {
    try {
        if (genus === undefined || genus === null || genus === '') {
            return {
                'Genus': null,
                'Types': null,
                'Summary': null,
                'Species': null,
                'Behavior': null,
                'Habitat': null,
                'Intended Playstyle': null,
                'Base Stats': null  
            };
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
        let summary;
        let species;
        let behavior;
        let habitat = [];
        let intendedPlaystyle;
        let baseStats;

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

                // we now obtain the summary of the NBMon.
                if (result.properties.Summary.rich_text.length === 0) {
                    summary = 'No summary specified yet.';
                } else {
                    summary = result.properties.Summary.rich_text[0].plain_text;
                }

                // we now obtain the species of the NBMon.
                if (result.properties.Species.select === null) {
                    species = 'No species specified yet.';
                } else {
                    species = result.properties.Species.select.name;
                }

                // we now obtain the behavior of the NBMon.
                if (result.properties.Behavior.select === null) {
                    behavior = 'No behavior specified yet.'
                } else {
                    behavior = result.properties.Behavior.select.name;
                }

                // we now obtain the habitat of the NBMon.
                if (result.properties.Habitat.multi_select.length === 0) {
                    habitat = [];
                } else {
                    result.properties.Habitat.multi_select.forEach((habitatType) => {
                        habitat.push(habitatType.name);
                    });
                }

                // we now obtain the intended playstyle of the NBMon.
                if (result.properties['Intended Playstyle'].rich_text.length === 0) {
                    intendedPlaystyle = 'No intended playstyle specified yet.';
                } else {
                    intendedPlaystyle = result.properties['Intended Playstyle'].rich_text[0].plain_text;
                }

                // we now obtain the base stats of the NBMon.
                if (result.properties['Base Stats (Range: 3 ~ 8, Max 35?)'].rich_text.length === 0) {
                    baseStats = 'No base stats specified yet.';
                } else {
                    baseStats = result.properties['Base Stats (Range: 3 ~ 8, Max 35?)'].rich_text[0].plain_text;
                }
            }
        });

        return {
            'Genus': genus,
            'Types': types,
            'Summary': summary,
            'Species': species,
            'Behavior': behavior,
            'Habitat': habitat,
            'Intended Playstyle': intendedPlaystyle,
            'Base Stats': baseStats
        }
    } catch (err) {
        throw err;
    }
}

module.exports = { getNBMonData };