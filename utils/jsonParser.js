/**
 * @dev Helper function to parse object data into a JSON string.
 * @param {Object} data the data to be parsed.
 * @return {String} the JSON string.
 */
const parseJSON = (data) => JSON.parse(JSON.stringify(data));

module.exports = { parseJSON };
