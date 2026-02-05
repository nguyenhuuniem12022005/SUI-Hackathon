/**
 * SUI Blockchain Service
 * Transaction builders and helpers for P-Market DApp
 */

import { Transaction } from '@mysten/sui/transactions';

// Get package ID from environment
const getPackageId = () => {
  const packageId = process.env.NEXT_PUBLIC_PMARKET_PACKAGE_ID;
  if (!packageId) {
    throw new Error('NEXT_PUBLIC_PMARKET_PACKAGE_ID is not configured');
  }
  return packageId;
};

// ============================================
// PMT Token Functions
// ============================================

/**
 * Build transaction to transfer PMT tokens
 * @param {string} coinObjectId - The coin object ID to transfer
 * @param {number} amount - Amount to transfer (in smallest unit)
 * @param {string} recipient - Recipient address
 * @returns {Transaction}
 */
export function buildTransferPMT(coinObjectId, amount, recipient) {
  const tx = new Transaction();
  const packageId = getPackageId();

  // Split the coin if needed and transfer
  const [coin] = tx.splitCoins(tx.object(coinObjectId), [amount]);
  
  tx.moveCall({
    target: `${packageId}::pmarket_token::transfer_token`,
    arguments: [coin, tx.pure.address(recipient)],
  });

  return tx;
}

/**
 * Build transaction to merge multiple PMT coins
 * @param {string} primaryCoinId - Main coin to merge into
 * @param {string[]} coinIdsToMerge - Array of coin IDs to merge
 * @returns {Transaction}
 */
export function buildMergePMTCoins(primaryCoinId, coinIdsToMerge) {
  const tx = new Transaction();
  const packageId = getPackageId();

  coinIdsToMerge.forEach((coinId) => {
    tx.moveCall({
      target: `${packageId}::pmarket_token::merge_coins`,
      arguments: [tx.object(primaryCoinId), tx.object(coinId)],
    });
  });

  return tx;
}

// ============================================
// Escrow Functions
// ============================================

/**
 * Build transaction to create an escrow
 * @param {number} orderId - Order ID from backend
 * @param {string} sellerAddress - Seller's SUI address
 * @param {string} paymentCoinId - PMT coin object ID for payment
 * @param {number} amount - Amount to escrow
 * @returns {Transaction}
 */
export function buildCreateEscrow(orderId, sellerAddress, paymentCoinId, amount) {
  const tx = new Transaction();
  const packageId = getPackageId();

  // Split the exact amount from the payment coin
  const [paymentCoin] = tx.splitCoins(tx.object(paymentCoinId), [amount]);

  tx.moveCall({
    target: `${packageId}::escrow::create_escrow`,
    arguments: [
      tx.pure.u64(orderId),
      tx.pure.address(sellerAddress),
      paymentCoin,
      tx.object('0x6'), // Clock object (shared, immutable)
    ],
  });

  return tx;
}

/**
 * Build transaction for seller to confirm shipment
 * @param {string} escrowId - Escrow object ID
 * @returns {Transaction}
 */
export function buildSellerConfirm(escrowId) {
  const tx = new Transaction();
  const packageId = getPackageId();

  tx.moveCall({
    target: `${packageId}::escrow::seller_confirm`,
    arguments: [tx.object(escrowId)],
  });

  return tx;
}

/**
 * Build transaction for buyer to confirm delivery
 * @param {string} escrowId - Escrow object ID
 * @returns {Transaction}
 */
export function buildConfirmDelivery(escrowId) {
  const tx = new Transaction();
  const packageId = getPackageId();

  tx.moveCall({
    target: `${packageId}::escrow::confirm_delivery`,
    arguments: [tx.object(escrowId)],
  });

  return tx;
}

/**
 * Build transaction to cancel escrow (buyer only, before seller confirms)
 * @param {string} escrowId - Escrow object ID
 * @returns {Transaction}
 */
export function buildCancelEscrow(escrowId) {
  const tx = new Transaction();
  const packageId = getPackageId();

  tx.moveCall({
    target: `${packageId}::escrow::cancel_escrow`,
    arguments: [tx.object(escrowId)],
  });

  return tx;
}

/**
 * Build transaction to cancel expired escrow
 * @param {string} escrowId - Escrow object ID
 * @returns {Transaction}
 */
export function buildCancelExpiredEscrow(escrowId) {
  const tx = new Transaction();
  const packageId = getPackageId();

  tx.moveCall({
    target: `${packageId}::escrow::cancel_expired_escrow`,
    arguments: [
      tx.object(escrowId),
      tx.object('0x6'), // Clock object
    ],
  });

  return tx;
}

/**
 * Build transaction to initiate dispute
 * @param {string} escrowId - Escrow object ID
 * @returns {Transaction}
 */
export function buildInitiateDispute(escrowId) {
  const tx = new Transaction();
  const packageId = getPackageId();

  tx.moveCall({
    target: `${packageId}::escrow::initiate_dispute`,
    arguments: [tx.object(escrowId)],
  });

  return tx;
}

// ============================================
// Green NFT Functions
// ============================================

/**
 * Build transaction to mint a Green Product NFT (by issuer)
 * @param {string} issuerCapId - Issuer capability object ID
 * @param {number} productId - Product ID from backend
 * @param {string} productName - Product name
 * @param {number} certificationLevel - Level 1-4 (Bronze to Platinum)
 * @param {string} description - Why this product is green
 * @param {string} imageUrl - Certificate image URL
 * @param {object} metadata - Additional metadata
 * @param {number} validityDays - Number of days until expiration (0 = never)
 * @returns {Transaction}
 */
export function buildMintGreenNFT(
  issuerCapId,
  productId,
  productName,
  certificationLevel,
  description,
  imageUrl,
  metadata = {},
  validityDays = 365
) {
  const tx = new Transaction();
  const packageId = getPackageId();

  tx.moveCall({
    target: `${packageId}::green_nft::mint_green_nft_by_issuer`,
    arguments: [
      tx.object(issuerCapId),
      tx.pure.u64(productId),
      tx.pure.vector('u8', Array.from(new TextEncoder().encode(productName))),
      tx.pure.u8(certificationLevel),
      tx.pure.vector('u8', Array.from(new TextEncoder().encode(description))),
      tx.pure.vector('u8', Array.from(new TextEncoder().encode(imageUrl))),
      tx.pure.vector('u8', Array.from(new TextEncoder().encode(JSON.stringify(metadata)))),
      tx.pure.u64(validityDays),
      tx.object('0x6'), // Clock object
    ],
  });

  return tx;
}

/**
 * Build transaction to burn own Green NFT
 * @param {string} nftId - Green NFT object ID
 * @returns {Transaction}
 */
export function buildBurnGreenNFT(nftId) {
  const tx = new Transaction();
  const packageId = getPackageId();

  tx.moveCall({
    target: `${packageId}::green_nft::burn_own_nft`,
    arguments: [tx.object(nftId)],
  });

  return tx;
}

// ============================================
// Helper Functions
// ============================================

/**
 * Get all PMT coins owned by an address
 * @param {SuiClient} client - SUI client instance
 * @param {string} owner - Owner address
 * @returns {Promise<Array>} Array of coin objects
 */
export async function getPMTCoins(client, owner) {
  const packageId = getPackageId();
  const coinType = `${packageId}::pmarket_token::PMARKET_TOKEN`;

  const coins = await client.getCoins({
    owner,
    coinType,
  });

  return coins.data;
}

/**
 * Get total PMT balance for an address
 * @param {SuiClient} client - SUI client instance
 * @param {string} owner - Owner address
 * @returns {Promise<number>} Total balance in smallest unit
 */
export async function getPMTBalance(client, owner) {
  const coins = await getPMTCoins(client, owner);
  return coins.reduce((sum, coin) => sum + Number(coin.balance), 0);
}

/**
 * Get escrow objects for a user (as buyer or seller)
 * @param {SuiClient} client - SUI client instance
 * @param {string} address - User address
 * @returns {Promise<Array>} Array of escrow objects
 */
export async function getUserEscrows(client, address) {
  const packageId = getPackageId();
  
  // Query escrow objects owned/involved by the user
  const escrows = await client.getOwnedObjects({
    owner: address,
    filter: {
      StructType: `${packageId}::escrow::Escrow`,
    },
    options: {
      showContent: true,
    },
  });

  return escrows.data;
}

/**
 * Get Green NFTs owned by an address
 * @param {SuiClient} client - SUI client instance
 * @param {string} owner - Owner address
 * @returns {Promise<Array>} Array of Green NFT objects
 */
export async function getGreenNFTs(client, owner) {
  const packageId = getPackageId();

  const nfts = await client.getOwnedObjects({
    owner,
    filter: {
      StructType: `${packageId}::green_nft::GreenProductNFT`,
    },
    options: {
      showContent: true,
      showDisplay: true,
    },
  });

  return nfts.data;
}

/**
 * Get escrow details by object ID
 * @param {SuiClient} client - SUI client instance
 * @param {string} escrowId - Escrow object ID
 * @returns {Promise<object>} Escrow object details
 */
export async function getEscrowDetails(client, escrowId) {
  const escrow = await client.getObject({
    id: escrowId,
    options: {
      showContent: true,
    },
  });

  return escrow.data;
}

/**
 * Convert amount to smallest unit (6 decimals for PMT)
 * @param {number} amount - Amount in human readable format
 * @returns {number} Amount in smallest unit
 */
export function toSmallestUnit(amount) {
  return Math.floor(amount * 1_000_000);
}

/**
 * Convert from smallest unit to human readable (6 decimals)
 * @param {number} amount - Amount in smallest unit
 * @returns {number} Amount in human readable format
 */
export function fromSmallestUnit(amount) {
  return amount / 1_000_000;
}

/**
 * Escrow status constants
 */
export const ESCROW_STATUS = {
  PENDING: 0,
  SELLER_CONFIRMED: 1,
  COMPLETED: 2,
  CANCELLED: 3,
  DISPUTED: 4,
};

/**
 * Green NFT certification levels
 */
export const CERTIFICATION_LEVEL = {
  BRONZE: 1,
  SILVER: 2,
  GOLD: 3,
  PLATINUM: 4,
};

export const CERTIFICATION_LEVEL_NAMES = {
  1: 'Bronze',
  2: 'Silver',
  3: 'Gold',
  4: 'Platinum',
};
