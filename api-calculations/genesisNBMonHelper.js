/**
 * `getGenesisFertilityDeduction` checks for the fertility point deduction of a Genesis NBMon after it has bred.
 * This will be different than other NBMon generations.
 * @param {String} rarity the rarity of the NBMon.
 * @returns {Number} the fertility point deduction.
 */
const getGenesisFertilityDeduction = (rarity) => {
    switch (rarity) {
        case 'Common':
            return 1000;
        case 'Uncommon':
            return 750;
        case 'Rare':
            return 600;
        case 'Epic':
            return 500;
        case 'Legendary':
            return 375;
        case 'Mythical':
            return 300;
        default:
            throw new Error('Invalid rarity.');
    }
}

module.exports = { getGenesisFertilityDeduction };