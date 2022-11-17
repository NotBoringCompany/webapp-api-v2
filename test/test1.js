const { expect, should } = require('chai');
const chaiHttp = require('chai-http');

describe('Test 1', () => {
    it('should return 1', () => {
        const res1 = 1;
        expect(res1).to.equal(1);
    });
});
