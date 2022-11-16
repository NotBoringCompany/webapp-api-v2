const ERROR_CODE_TO_STATUS_CODE_MAP = {
    INVALID_ARGUMENT: 400, // Invalid Request
    CALL_EXCEPTION: 404, // Resource can't be found
    DEFAULT: 500, // Internal server error
};

const httpErrorStatusCode = (errorCode = 'DEFAULT') => {
    if (!(errorCode in ERROR_CODE_TO_STATUS_CODE_MAP)) {
        errorCode = 'DEFAULT';
    }
    return ERROR_CODE_TO_STATUS_CODE_MAP[errorCode];
};

module.exports = httpErrorStatusCode;
