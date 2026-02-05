/**
 * SUI Blockchain Helper Functions for P-Market
 * Provides transaction builders for PMT token operations
 */

import { Transaction } from '@mysten/sui/transactions';

// Package ID from environment
const PACKAGE_ID = process.env.NEXT_PUBLIC_PMARKET_PACKAGE_ID;

// Module names in the smart contract
const MODULES = {
  TOKEN: 'pmarket_token',
  ESCROW: 'escrow',
  STAKING: 'staking',
  GREEN_NFT: 'green_nft',
};

// Object type strings
const TYPES = {
  PMT_TOKEN: `${PACKAGE_ID}::${MODULES.TOKEN}::PMARKET_TOKEN`,
  ESCROW: `${PACKAGE_ID}::${MODULES.ESCROW}::Escrow`,
  STAKE_POOL: `${PACKAGE_ID}::${MODULES.STAKING}::StakePool`,
  STAKE_POSITION: `${PACKAGE_ID}::${MODULES.STAKING}::StakePosition`,
  GREEN_NFT: `${PACKAGE_ID}::${MODULES.GREEN_NFT}::GreenCertificate`,
};

/**
 * Get the coin type for PMT token
 */
export function getPMTCoinType() {
  return TYPES.PMT_TOKEN;
}

/**
 * Format PMT amount (6 decimals)
 */
export function formatPMT(amount) {
  if (!amount) return '0';
  return (Number(amount) / 1_000_000).toLocaleString();
}

/**
 * Parse PMT to smallest unit
 */
export function parsePMT(amount) {
  return Math.floor(Number(amount) * 1_000_000);
}

/**
 * Format SUI amount (9 decimals)
 */
export function formatSUI(amount) {
  if (!amount) return '0';
  return (Number(amount) / 1_000_000_000).toFixed(4);
}

/**
 * Build transaction to claim PMT from faucet
 * @param {string} treasuryCapId - Treasury cap object ID
 * @param {number} amount - Amount of PMT to claim
 */
export function buildClaimFaucetTx(treasuryCapId, amount = 1000) {
  const tx = new Transaction();
  
  // Call mint function from token module
  tx.moveCall({
    target: `${PACKAGE_ID}::${MODULES.TOKEN}::mint`,
    arguments: [
      tx.object(treasuryCapId),
      tx.pure.u64(parsePMT(amount)),
    ],
  });
  
  return tx;
}

/**
 * Build transaction to transfer PMT tokens
 * @param {object} suiClient - SUI client
 * @param {string} senderAddress - Sender address
 * @param {string} recipientAddress - Recipient address  
 * @param {number} amount - Amount of PMT to transfer
 */
export async function buildTransferPMTTx(suiClient, senderAddress, recipientAddress, amount) {
  const tx = new Transaction();
  
  // Get sender's PMT coins
  const coins = await suiClient.getCoins({
    owner: senderAddress,
    coinType: TYPES.PMT_TOKEN,
  });
  
  if (coins.data.length === 0) {
    throw new Error('Không có PMT token trong ví');
  }
  
  const amountInSmallest = parsePMT(amount);
  
  // Merge all coins if needed and split exact amount
  const [primaryCoin, ...restCoins] = coins.data.map(c => c.coinObjectId);
  
  if (restCoins.length > 0) {
    tx.mergeCoins(tx.object(primaryCoin), restCoins.map(c => tx.object(c)));
  }
  
  const [coinToTransfer] = tx.splitCoins(tx.object(primaryCoin), [tx.pure.u64(amountInSmallest)]);
  tx.transferObjects([coinToTransfer], tx.pure.address(recipientAddress));
  
  return tx;
}

/**
 * Build transaction to stake PMT tokens
 * @param {object} suiClient - SUI client
 * @param {string} senderAddress - Staker address
 * @param {string} stakePoolId - Stake pool object ID
 * @param {number} amount - Amount to stake
 * @param {number} lockDays - Lock period in days (7, 30, 90)
 */
export async function buildStakeTx(suiClient, senderAddress, stakePoolId, amount, lockDays = 7) {
  const tx = new Transaction();
  
  // Get PMT coins
  const coins = await suiClient.getCoins({
    owner: senderAddress,
    coinType: TYPES.PMT_TOKEN,
  });
  
  if (coins.data.length === 0) {
    throw new Error('Không có PMT token để stake');
  }
  
  const amountInSmallest = parsePMT(amount);
  const [primaryCoin, ...restCoins] = coins.data.map(c => c.coinObjectId);
  
  if (restCoins.length > 0) {
    tx.mergeCoins(tx.object(primaryCoin), restCoins.map(c => tx.object(c)));
  }
  
  const [stakeCoins] = tx.splitCoins(tx.object(primaryCoin), [tx.pure.u64(amountInSmallest)]);
  
  // Call stake function
  tx.moveCall({
    target: `${PACKAGE_ID}::${MODULES.STAKING}::stake`,
    arguments: [
      tx.object(stakePoolId),
      stakeCoins,
      tx.pure.u64(lockDays),
    ],
  });
  
  return tx;
}

/**
 * Build transaction to unstake PMT tokens
 * @param {string} stakePoolId - Stake pool object ID
 * @param {string} stakePositionId - User's stake position object ID
 */
export function buildUnstakeTx(stakePoolId, stakePositionId) {
  const tx = new Transaction();
  
  tx.moveCall({
    target: `${PACKAGE_ID}::${MODULES.STAKING}::unstake`,
    arguments: [
      tx.object(stakePoolId),
      tx.object(stakePositionId),
    ],
  });
  
  return tx;
}

/**
 * Build transaction to claim staking rewards
 * @param {string} stakePoolId - Stake pool object ID
 * @param {string} stakePositionId - User's stake position object ID
 */
export function buildClaimRewardsTx(stakePoolId, stakePositionId) {
  const tx = new Transaction();
  
  tx.moveCall({
    target: `${PACKAGE_ID}::${MODULES.STAKING}::claim_rewards`,
    arguments: [
      tx.object(stakePoolId),
      tx.object(stakePositionId),
    ],
  });
  
  return tx;
}

/**
 * Build transaction to create escrow for order payment
 * @param {object} suiClient - SUI client
 * @param {string} buyerAddress - Buyer address
 * @param {string} sellerAddress - Seller address
 * @param {number} amount - Payment amount in PMT
 * @param {number} orderId - Order ID for reference
 */
export async function buildCreateEscrowTx(suiClient, buyerAddress, sellerAddress, amount, orderId) {
  const tx = new Transaction();
  
  // Get buyer's PMT coins
  const coins = await suiClient.getCoins({
    owner: buyerAddress,
    coinType: TYPES.PMT_TOKEN,
  });
  
  if (coins.data.length === 0) {
    throw new Error('Không có PMT token để thanh toán');
  }
  
  const amountInSmallest = parsePMT(amount);
  const totalBalance = coins.data.reduce((sum, c) => sum + Number(c.balance), 0);
  
  if (totalBalance < amountInSmallest) {
    throw new Error(`Số dư PMT không đủ. Cần ${amount} PMT, có ${formatPMT(totalBalance)} PMT`);
  }
  
  const [primaryCoin, ...restCoins] = coins.data.map(c => c.coinObjectId);
  
  if (restCoins.length > 0) {
    tx.mergeCoins(tx.object(primaryCoin), restCoins.map(c => tx.object(c)));
  }
  
  const [paymentCoins] = tx.splitCoins(tx.object(primaryCoin), [tx.pure.u64(amountInSmallest)]);
  
  // Create escrow
  tx.moveCall({
    target: `${PACKAGE_ID}::${MODULES.ESCROW}::create_escrow`,
    arguments: [
      paymentCoins,
      tx.pure.address(sellerAddress),
      tx.pure.u64(orderId),
    ],
  });
  
  return tx;
}

/**
 * Build transaction to confirm delivery and release escrow
 * @param {string} escrowId - Escrow object ID
 */
export function buildConfirmDeliveryTx(escrowId) {
  const tx = new Transaction();
  
  tx.moveCall({
    target: `${PACKAGE_ID}::${MODULES.ESCROW}::confirm_delivery`,
    arguments: [
      tx.object(escrowId),
    ],
  });
  
  return tx;
}

/**
 * Build transaction to cancel escrow and refund
 * @param {string} escrowId - Escrow object ID
 */
export function buildCancelEscrowTx(escrowId) {
  const tx = new Transaction();
  
  tx.moveCall({
    target: `${PACKAGE_ID}::${MODULES.ESCROW}::cancel_escrow`,
    arguments: [
      tx.object(escrowId),
    ],
  });
  
  return tx;
}

/**
 * Build transaction to mint Green NFT certificate
 * @param {string} productId - Product ID
 * @param {string} productName - Product name
 * @param {number} certLevel - Certification level (1-5)
 * @param {string} issuer - Issuer name
 */
export function buildMintGreenNFTTx(productId, productName, certLevel, issuer) {
  const tx = new Transaction();
  
  tx.moveCall({
    target: `${PACKAGE_ID}::${MODULES.GREEN_NFT}::mint_certificate`,
    arguments: [
      tx.pure.u64(productId),
      tx.pure.string(productName),
      tx.pure.u8(certLevel),
      tx.pure.string(issuer),
    ],
  });
  
  return tx;
}

/**
 * Get user's stake positions
 * @param {object} suiClient - SUI client
 * @param {string} ownerAddress - Owner address
 */
export async function getStakePositions(suiClient, ownerAddress) {
  try {
    const objects = await suiClient.getOwnedObjects({
      owner: ownerAddress,
      filter: {
        StructType: TYPES.STAKE_POSITION,
      },
      options: {
        showContent: true,
        showType: true,
      },
    });
    
    return objects.data.map(obj => ({
      id: obj.data?.objectId,
      ...obj.data?.content?.fields,
    }));
  } catch (error) {
    console.error('Error fetching stake positions:', error);
    return [];
  }
}

/**
 * Get user's Green NFTs
 * @param {object} suiClient - SUI client
 * @param {string} ownerAddress - Owner address
 */
export async function getGreenNFTs(suiClient, ownerAddress) {
  try {
    const objects = await suiClient.getOwnedObjects({
      owner: ownerAddress,
      filter: {
        StructType: TYPES.GREEN_NFT,
      },
      options: {
        showContent: true,
        showType: true,
        showDisplay: true,
      },
    });
    
    return objects.data.map(obj => ({
      id: obj.data?.objectId,
      display: obj.data?.display?.data,
      ...obj.data?.content?.fields,
    }));
  } catch (error) {
    console.error('Error fetching Green NFTs:', error);
    return [];
  }
}

/**
 * Get user's escrow objects
 * @param {object} suiClient - SUI client  
 * @param {string} ownerAddress - Owner address
 */
export async function getEscrowObjects(suiClient, ownerAddress) {
  try {
    const objects = await suiClient.getOwnedObjects({
      owner: ownerAddress,
      filter: {
        StructType: TYPES.ESCROW,
      },
      options: {
        showContent: true,
        showType: true,
      },
    });
    
    return objects.data.map(obj => ({
      id: obj.data?.objectId,
      ...obj.data?.content?.fields,
    }));
  } catch (error) {
    console.error('Error fetching escrow objects:', error);
    return [];
  }
}

export default {
  // Formatters
  formatPMT,
  parsePMT,
  formatSUI,
  getPMTCoinType,
  
  // Transaction builders
  buildClaimFaucetTx,
  buildTransferPMTTx,
  buildStakeTx,
  buildUnstakeTx,
  buildClaimRewardsTx,
  buildCreateEscrowTx,
  buildConfirmDeliveryTx,
  buildCancelEscrowTx,
  buildMintGreenNFTTx,
  
  // Query functions
  getStakePositions,
  getGreenNFTs,
  getEscrowObjects,
};
