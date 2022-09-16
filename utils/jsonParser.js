/**
 * @dev Helper function to parse object data into a JSON string.
 */
const parseJSON = (data) => JSON.parse(JSON.stringify(data));

module.exports = { parseJSON };