require('dotenv').config();

const AWS = require('aws-sdk');
const moment = require('moment');

// IMPORTS
const { getGenesisNBMon } = require('./genesisNBMon');

const hatchingDuration = process.env.HATCHING_DURATION;

const spacesEndpoint = new AWS.Endpoint(process.env.SPACES_ENDPOINT);
const s3 = new AWS.S3({
    endpoint: spacesEndpoint.href,
    credentials: new AWS.Credentials({
        accessKeyId: process.env.SPACES_KEY,
        secretAccessKey: process.env.SPACES_SECRET,
    }),
});

/**
 * @dev `uploadGenesisEggMetadata` uploads the metadata of a Genesis NBMon egg to DigitalOcean Spaces. Contains mostly empty stats/attributes.
 * Used primarily for OpenSea metadata retrieval or any similar metadata-friendly NFT marketplaces.
 * @param {Number} id the ID of the Genesis NBMon to upload.
 * @return {Object} an object with a status of 'OK' if successful, or an error thrown otherwise.
 */
const uploadGenesisEggMetadata = (id) => {
    // contains the metadata of the genesis egg
    const metadata = {
        name: `NBMon Egg #${id}`,
        description: 'This egg contains a mysterious NBMon. Hatch it to find out.',
        image: 'https://nbcompany.fra1.digitaloceanspaces.com/genesisEgg.png',
        // this is where the 'important' metadata is stored. This is what OpenSea uses to display the attributes of the NFT.
        attributes: [
            {
                display_type: 'date',
                trait_type: 'Born on',
                // this value might be slightly different than the one during minting. this is normal on async operations but should
                // only have a discrepancy of up to a few seconds, no more.
                value: moment().unix(),
            },
            {
                display_type: 'date',
                trait_type: 'Hatchable on',
                // note: the value after the + sign is the hatching duration in seconds.
                value: moment().unix() + hatchingDuration,
            },
        ],
    };

    // this will create a new object in the DigitalOcean Spaces bucket with the metadata of the Genesis NBMon egg.
    s3.putObject({
        Bucket: process.env.SPACES_NAME,
        Key: `genesisNBMon/${id}.json`,
        Body: JSON.stringify(metadata),
        ACL: 'public-read',
        ContentType: 'application/json',
    }, (err) => {
        if (err) console.log('Error in uploading to S3 Bucket, message: ', err.message);
        if (err) throw err;
    });

    return {
        status: 'OK',
    };
};

/**
 * `uploadGenesisHatchedMetadata` uploads the metadata of a hatched Genesis NBMon to DigitalOcean Spaces.
 * Contains the stats/attributes of the hatched NBMon.
 * @param {Number} id the ID of the Genesis NBMon to upload.
 * @return {Promise<Object>} an object with a status of 'OK' if successful, or an error thrown otherwise.
 */
const uploadGenesisHatchedMetadata = async (id) => {
    try {
        // we get the required metadata from Moralis. note that at this point, the nbmon already should have all of these metadata as they are hatched
        // before calling this function.
        const nbmon = await getGenesisNBMon(id);
        const genus = nbmon['genus'];
        const genusDescription = nbmon['genusDescription'];

        // here we double check and see if the nbmon is still an egg. if it is, we throw an error as something is wrong with hatching.
        // this is important as we've removed the database to check for hatched NBMons as it is deemed redundant.
        // so this serves as the function's only check to see if the nbmon is already hatched or not.
        if (nbmon['isEgg']) {
            throw new Error('NBMon is still an egg. Cannot upload hatched metadata.');
        }

        // here we insert the new hatched metadata of the nbmon to upload to DigitalOcean Spaces.
        const metadata = {
            name: `Genesis NBMon #${id} - ${genus}`,
            description: genusDescription,
            image: `https://nbcompany.fra1.digitaloceanspaces.com/genesisGenera/${genus}.png`,
            attributes: [
                {
                    display_type: 'date',
                    trait_type: 'Hatched on',
                    value: nbmon['hatchedAt'],
                },
                {
                    trait_type: 'First Type',
                    value: nbmon['types'][0],
                },
                {
                    trait_type: 'Second Type',
                    value: nbmon['types'][1],
                },
                {
                    display_type: 'number',
                    trait_type: 'Health Potential',
                    value: nbmon['healthPotential'],
                },
                {
                    display_type: 'number',
                    trait_type: 'Energy Potential',
                    value: nbmon['energyPotential'],
                },
                {
                    display_type: 'number',
                    trait_type: 'Attack Potential',
                    value: nbmon['attackPotential'],
                },
                {
                    display_type: 'number',
                    trait_type: 'Defense Potential',
                    value: nbmon['defensePotential'],
                },
                {
                    display_type: 'number',
                    trait_type: 'Special Attack Potential',
                    value: nbmon['spAtkPotential'],
                },
                {
                    display_type: 'number',
                    trait_type: 'Special Defense Potential',
                    value: nbmon['spDefPotential'],
                },
                {
                    display_type: 'number',
                    trait_type: 'Speed Potential',
                    value: nbmon['speedPotential'],
                },
                {
                    trait_type: 'Passive One',
                    value: nbmon['passives'][0],
                },
                {
                    trait_type: 'Passive Two',
                    value: nbmon['passives'][1],
                },
            ],
        };

        // notice how we aren't deleting the existing egg metadata uploaded to Spaces first before reuploading the hatched metadata.
        // This is because S3 does it automatically for us.
        s3.putObject(
            {
                Bucket: process.env.SPACES_NAME,
                Key: `genesisNBMon/${id}.json`,
                Body: JSON.stringify(metadata),
                ACL: 'public-read',
                ContentType: 'application/json',
            }, (err) => {
                if (err) console.log('Error in uploading to S3 Bucket, message: ', err.message);
                if (err) throw err;
            });

        return {
            status: 'OK',
        };
    } catch (err) {
        throw err;
    }
};

module.exports = {
    uploadGenesisEggMetadata,
    uploadGenesisHatchedMetadata,
};
