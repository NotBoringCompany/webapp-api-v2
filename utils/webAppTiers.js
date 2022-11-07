/**
 * `getWebAppTierBenefits` gets all the benefits of the web app tier from `webAppTiers`
 * @param {String} tier the web app tier
 * @return {Object} the benefits of the web app tier
 */
const getWebAppTierBenefits = (tier) => {
    let tierBenefits;
    if (tier.toLowerCase() === 'newcomer') {
        tierBenefits = webAppTiers.newcomer;
    } else if (tier.toLowerCase() === 'rustic') {
        tierBenefits = webAppTiers.rustic;
    } else if (tier.toLowerCase() === 'merchant') {
        tierBenefits = webAppTiers.merchant;
    } else if (tier.toLowerCase() === 'tycoon') {
        tierBenefits = webAppTiers.merchant;
    } else if (tier.toLowerCase() === 'magnate') {
        tierBenefits = webAppTiers.magnate;
    } else if (tier.toLowerCase() === 'grandee') {
        tierBenefits = webAppTiers.grandate;
    }
    return tierBenefits;
};

/**
 * @dev `webAppTiers` is an object that contains all the available web app tiers.
 * Note: Some of these benefits MAY change in the future, depending on balancing factors.
 */
const webAppTiers = {
    'newcomer': {
        // in %
        claimFee: 4.5,
        claimRequirement: {
            accountLevel: 60,
            questsCompleted: 400,
            pvpMMR: 2000,
        },
        minimumxRECClaim: 10,
        maximumxRECClaim: 15,
        minimumxRESClaim: 100,
        maximumxRESClaim: 150,
        // in seconds
        claimCooldown: 345600,
        // in %
        breedingDiscount: 0,
        // in %
        marketplaceFee: 5,
        mintingEventTier: 'Iron',
        burningEventTier: 'Iron',
        stakingTier: 'Iron',
        // extra tickets
        airdrops: 0,
        // extra referral rewards in %
        referralRewards: 0,
        inGameEnergy: 100,
    },
    'rustic': {
        // in %
        claimFee: 4.5,
        minimumxRECClaim: 15,
        maximumxRECClaim: 30,
        minimumxRESClaim: 150,
        maximumxRESClaim: 275,
        // in seconds
        claimCooldown: 259200,
        // in %
        breedingDiscount: 1,
        // in %
        marketplaceFee: 4.9,
        mintingEventTier: 'Bronze',
        burningEventTier: 'Iron',
        stakingTier: 'Iron',
        // extra tickets
        airdrops: 5,
        // extra referral rewards in %
        referralRewards: 2.5,
        inGameEnergy: 110,
    },
    'merchant': {
        // in %
        claimFee: 4.4,
        minimumxRECClaim: 45,
        maximumxRECClaim: 75,
        minimumxRESClaim: 350,
        maximumxRESClaim: 600,
        // in seconds
        claimCooldown: 259200,
        // in %
        breedingDiscount: 1.5,
        // in %
        marketplaceFee: 4.75,
        mintingEventTier: 'Bronze',
        burningEventTier: 'Bronze',
        stakingTier: 'Bronze',
        // extra tickets
        airdrops: 10,
        // extra referral rewards in %
        referralRewards: 3.75,
        inGameEnergy: 120,
    },
    'tycoon': {
        // in %
        claimFee: 4.3,
        minimumxRECClaim: 100,
        maximumxRECClaim: 300,
        minimumxRESClaim: 750,
        maximumxRESClaim: 1500,
        // in seconds
        claimCooldown: 216000,
        // in %
        breedingDiscount: 2.5,
        // in %
        marketplaceFee: 4.5,
        mintingEventTier: 'Silver',
        burningEventTier: 'Silver',
        stakingTier: 'Bronze',
        // extra tickets
        airdrops: 15,
        // extra referral rewards in %
        referralRewards: 5,
        inGameEnergy: 140,
    },
    'magnate': {
        // in %
        claimFee: 4.2,
        minimumxRECClaim: 250,
        maximumxRECClaim: 600,
        minimumxRESClaim: 1250,
        maximumxRESClaim: 2500,
        // in seconds
        claimCooldown: 216000,
        // in %
        breedingDiscount: 3.75,
        // in %
        marketplaceFee: 4.25,
        mintingEventTier: 'Gold',
        burningEventTier: 'Silver',
        stakingTier: 'Silver',
        // extra tickets
        airdrops: 25,
        // extra referral rewards in %
        referralRewards: 7.5,
        inGameEnergy: 165,
    },
    'grandee': {
        // in %
        claimFee: 4,
        minimumxRECClaim: 450,
        maximumxRECClaim: 800,
        minimumxRESClaim: 2000,
        maximumxRESClaim: 5000,
        // in seconds
        claimCooldown: 172800,
        // in %
        breedingDiscount: 5,
        // in %
        marketplaceFee: 4,
        mintingEventTier: 'Gold',
        burningEventTier: 'Gold',
        stakingTier: 'Gold',
        // extra tickets
        airdrops: 40,
        // extra referral rewards in %
        referralRewards: 12.5,
        inGameEnergy: 200,
    },
};

module.exports = {
    webAppTiers,
    getWebAppTierBenefits,
};
