/**
 * SUI Blockchain Service for P-Market Backend
 * Handles transaction verification and on-chain data queries
 */

import pool from '../../configs/mysql.js';
import ApiError from '../../utils/classes/api-error.js';

// SUI Network Configuration
const SUI_NETWORK = process.env.SUI_NETWORK || 'testnet';
const SUI_RPC_URL = process.env.SUI_RPC_URL || `https://fullnode.${SUI_NETWORK}.sui.io:443`;
const PMARKET_PACKAGE_ID = process.env.PMARKET_PACKAGE_ID || '';

// Escrow status mapping
export const ESCROW_STATUS = {
  PENDING: 0,
  SELLER_CONFIRMED: 1,
  COMPLETED: 2,
  CANCELLED: 3,
  DISPUTED: 4,
};

export const ESCROW_STATUS_NAMES = {
  0: 'Pending',
  1: 'SellerConfirmed',
  2: 'Completed',
  3: 'Cancelled',
  4: 'Disputed',
};

/**
 * Ensure SUI transaction tables exist
 */
async function ensureSuiTables() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS SuiTransaction (
      id INT AUTO_INCREMENT PRIMARY KEY,
      userId INT NOT NULL,
      transactionDigest VARCHAR(128) NOT NULL UNIQUE,
      transactionType VARCHAR(64) NOT NULL,
      status VARCHAR(32) DEFAULT 'PENDING',
      relatedId INT NULL,
      relatedType VARCHAR(64) NULL,
      gasUsed BIGINT NULL,
      timestampMs BIGINT NULL,
      rawData JSON NULL,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_user (userId),
      INDEX idx_digest (transactionDigest),
      INDEX idx_type (transactionType)
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS SuiEscrow (
      id INT AUTO_INCREMENT PRIMARY KEY,
      escrowObjectId VARCHAR(128) NOT NULL UNIQUE,
      orderId INT NOT NULL,
      buyerAddress VARCHAR(128) NOT NULL,
      sellerAddress VARCHAR(128) NOT NULL,
      amount BIGINT NOT NULL,
      status TINYINT DEFAULT 0,
      createdTxDigest VARCHAR(128) NULL,
      completedTxDigest VARCHAR(128) NULL,
      expiresAt BIGINT NULL,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_order (orderId),
      INDEX idx_buyer (buyerAddress),
      INDEX idx_seller (sellerAddress),
      INDEX idx_status (status)
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS SuiGreenNFT (
      id INT AUTO_INCREMENT PRIMARY KEY,
      nftObjectId VARCHAR(128) NOT NULL UNIQUE,
      productId INT NOT NULL,
      ownerAddress VARCHAR(128) NOT NULL,
      certificationLevel TINYINT NOT NULL,
      issuer VARCHAR(255) NULL,
      mintTxDigest VARCHAR(128) NULL,
      certifiedAt BIGINT NULL,
      expiresAt BIGINT NULL,
      isActive BOOLEAN DEFAULT TRUE,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_product (productId),
      INDEX idx_owner (ownerAddress)
    )
  `);
}

// Initialize tables on module load
let tablesInitialized = false;
async function initTables() {
  if (!tablesInitialized) {
    await ensureSuiTables();
    tablesInitialized = true;
  }
}

/**
 * Make RPC call to SUI network
 * @param {string} method - RPC method name
 * @param {Array} params - RPC params
 * @returns {Promise<any>}
 */
async function suiRpcCall(method, params = []) {
  try {
    const response = await fetch(SUI_RPC_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method,
        params,
      }),
    });

    const data = await response.json();

    if (data.error) {
      throw new Error(data.error.message || 'SUI RPC error');
    }

    return data.result;
  } catch (error) {
    console.error('[SUI RPC] Error:', error.message);
    throw error;
  }
}

/**
 * Get transaction details by digest
 * @param {string} digest - Transaction digest
 * @returns {Promise<object>}
 */
export async function getTransaction(digest) {
  return suiRpcCall('sui_getTransactionBlock', [
    digest,
    {
      showInput: true,
      showEffects: true,
      showEvents: true,
      showObjectChanges: true,
    },
  ]);
}

/**
 * Get object details by ID
 * @param {string} objectId - Object ID
 * @returns {Promise<object>}
 */
export async function getObject(objectId) {
  return suiRpcCall('sui_getObject', [
    objectId,
    {
      showType: true,
      showContent: true,
      showOwner: true,
    },
  ]);
}

/**
 * Get all objects owned by an address
 * @param {string} address - Owner address
 * @param {string} structType - Optional struct type filter
 * @returns {Promise<Array>}
 */
export async function getOwnedObjects(address, structType = null) {
  const filter = structType
    ? { StructType: structType }
    : null;

  return suiRpcCall('suix_getOwnedObjects', [
    address,
    {
      filter,
      options: {
        showType: true,
        showContent: true,
      },
    },
  ]);
}

/**
 * Verify a transaction was successful
 * @param {string} digest - Transaction digest
 * @returns {Promise<boolean>}
 */
export async function verifyTransaction(digest) {
  try {
    const tx = await getTransaction(digest);
    
    if (!tx) return false;
    
    const status = tx.effects?.status?.status;
    return status === 'success';
  } catch (error) {
    console.error('[SUI] Verify transaction error:', error);
    return false;
  }
}

// ============================================
// Database Operations
// ============================================

/**
 * Record a SUI transaction
 * @param {object} data - Transaction data
 * @returns {Promise<number>} Insert ID
 */
export async function recordTransaction(data) {
  await initTables();

  const {
    userId,
    transactionDigest,
    transactionType,
    status = 'SUCCESS',
    relatedId = null,
    relatedType = null,
    gasUsed = null,
    timestampMs = null,
    rawData = null,
  } = data;

  const [result] = await pool.query(
    `
    INSERT INTO SuiTransaction 
    (userId, transactionDigest, transactionType, status, relatedId, relatedType, gasUsed, timestampMs, rawData)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE status = VALUES(status), updatedAt = NOW()
    `,
    [
      userId,
      transactionDigest,
      transactionType,
      status,
      relatedId,
      relatedType,
      gasUsed,
      timestampMs,
      rawData ? JSON.stringify(rawData) : null,
    ]
  );

  return result.insertId;
}

/**
 * Get user transactions
 * @param {number} userId - User ID
 * @param {object} options - Query options
 * @returns {Promise<Array>}
 */
export async function getUserTransactions(userId, { limit = 50, offset = 0, type = null } = {}) {
  await initTables();

  let query = `
    SELECT * FROM SuiTransaction
    WHERE userId = ?
  `;
  const params = [userId];

  if (type) {
    query += ` AND transactionType = ?`;
    params.push(type);
  }

  query += ` ORDER BY createdAt DESC LIMIT ? OFFSET ?`;
  params.push(limit, offset);

  const [rows] = await pool.query(query, params);
  return rows;
}

/**
 * Create or update escrow record
 * @param {object} data - Escrow data
 * @returns {Promise<number>}
 */
export async function saveEscrow(data) {
  await initTables();

  const {
    escrowObjectId,
    orderId,
    buyerAddress,
    sellerAddress,
    amount,
    status = ESCROW_STATUS.PENDING,
    createdTxDigest = null,
    expiresAt = null,
  } = data;

  const [result] = await pool.query(
    `
    INSERT INTO SuiEscrow 
    (escrowObjectId, orderId, buyerAddress, sellerAddress, amount, status, createdTxDigest, expiresAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE 
      status = VALUES(status),
      updatedAt = NOW()
    `,
    [escrowObjectId, orderId, buyerAddress, sellerAddress, amount, status, createdTxDigest, expiresAt]
  );

  return result.insertId;
}

/**
 * Update escrow status
 * @param {string} escrowObjectId - Escrow object ID
 * @param {number} status - New status
 * @param {string} completedTxDigest - Optional completion transaction digest
 */
export async function updateEscrowStatus(escrowObjectId, status, completedTxDigest = null) {
  await initTables();

  await pool.query(
    `
    UPDATE SuiEscrow 
    SET status = ?, completedTxDigest = COALESCE(?, completedTxDigest)
    WHERE escrowObjectId = ?
    `,
    [status, completedTxDigest, escrowObjectId]
  );
}

/**
 * Get escrow by order ID
 * @param {number} orderId - Order ID
 * @returns {Promise<object|null>}
 */
export async function getEscrowByOrderId(orderId) {
  await initTables();

  const [rows] = await pool.query(
    `SELECT * FROM SuiEscrow WHERE orderId = ? LIMIT 1`,
    [orderId]
  );

  return rows[0] || null;
}

/**
 * Get escrow by object ID
 * @param {string} escrowObjectId - Escrow object ID
 * @returns {Promise<object|null>}
 */
export async function getEscrowByObjectId(escrowObjectId) {
  await initTables();

  const [rows] = await pool.query(
    `SELECT * FROM SuiEscrow WHERE escrowObjectId = ? LIMIT 1`,
    [escrowObjectId]
  );

  return rows[0] || null;
}

/**
 * Get user escrows (as buyer or seller)
 * @param {string} address - User wallet address
 * @param {object} options - Query options
 * @returns {Promise<Array>}
 */
export async function getUserEscrows(address, { role = 'all', status = null, limit = 50 } = {}) {
  await initTables();

  let query = `SELECT * FROM SuiEscrow WHERE `;
  const params = [];

  if (role === 'buyer') {
    query += `buyerAddress = ?`;
    params.push(address);
  } else if (role === 'seller') {
    query += `sellerAddress = ?`;
    params.push(address);
  } else {
    query += `(buyerAddress = ? OR sellerAddress = ?)`;
    params.push(address, address);
  }

  if (status !== null) {
    query += ` AND status = ?`;
    params.push(status);
  }

  query += ` ORDER BY createdAt DESC LIMIT ?`;
  params.push(limit);

  const [rows] = await pool.query(query, params);
  return rows;
}

/**
 * Save Green NFT record
 * @param {object} data - NFT data
 * @returns {Promise<number>}
 */
export async function saveGreenNFT(data) {
  await initTables();

  const {
    nftObjectId,
    productId,
    ownerAddress,
    certificationLevel,
    issuer = null,
    mintTxDigest = null,
    certifiedAt = null,
    expiresAt = null,
  } = data;

  const [result] = await pool.query(
    `
    INSERT INTO SuiGreenNFT 
    (nftObjectId, productId, ownerAddress, certificationLevel, issuer, mintTxDigest, certifiedAt, expiresAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE 
      ownerAddress = VALUES(ownerAddress),
      isActive = TRUE
    `,
    [nftObjectId, productId, ownerAddress, certificationLevel, issuer, mintTxDigest, certifiedAt, expiresAt]
  );

  return result.insertId;
}

/**
 * Get Green NFT by product ID
 * @param {number} productId - Product ID
 * @returns {Promise<object|null>}
 */
export async function getGreenNFTByProductId(productId) {
  await initTables();

  const [rows] = await pool.query(
    `SELECT * FROM SuiGreenNFT WHERE productId = ? AND isActive = TRUE LIMIT 1`,
    [productId]
  );

  return rows[0] || null;
}

/**
 * Get user Green NFTs
 * @param {string} ownerAddress - Owner wallet address
 * @returns {Promise<Array>}
 */
export async function getUserGreenNFTs(ownerAddress) {
  await initTables();

  const [rows] = await pool.query(
    `SELECT * FROM SuiGreenNFT WHERE ownerAddress = ? AND isActive = TRUE ORDER BY createdAt DESC`,
    [ownerAddress]
  );

  return rows;
}

/**
 * Mark Green NFT as revoked/burned
 * @param {string} nftObjectId - NFT object ID
 */
export async function revokeGreenNFT(nftObjectId) {
  await initTables();

  await pool.query(
    `UPDATE SuiGreenNFT SET isActive = FALSE WHERE nftObjectId = ?`,
    [nftObjectId]
  );
}

// ============================================
// Wallet Management
// ============================================

/**
 * Update user's SUI wallet address
 * @param {number} userId - User ID
 * @param {string} walletAddress - SUI wallet address
 */
export async function updateUserWallet(userId, walletAddress) {
  // Validate SUI address format (0x followed by 64 hex chars)
  if (!/^0x[a-fA-F0-9]{64}$/.test(walletAddress)) {
    throw ApiError.badRequest('Địa chỉ ví SUI không hợp lệ');
  }

  await pool.query(
    `UPDATE User SET walletAddress = ?, walletConnectedAt = NOW() WHERE userId = ?`,
    [walletAddress.toLowerCase(), userId]
  );
}

/**
 * Disconnect user's wallet
 * @param {number} userId - User ID
 */
export async function disconnectUserWallet(userId) {
  await pool.query(
    `UPDATE User SET walletAddress = NULL, walletConnectedAt = NULL WHERE userId = ?`,
    [userId]
  );
}

/**
 * Get user wallet info
 * @param {number} userId - User ID
 * @returns {Promise<object>}
 */
export async function getUserWalletInfo(userId) {
  const [rows] = await pool.query(
    `SELECT walletAddress, walletConnectedAt FROM User WHERE userId = ? LIMIT 1`,
    [userId]
  );

  const user = rows[0];
  
  return {
    walletAddress: user?.walletAddress || null,
    connectedAt: user?.walletConnectedAt || null,
    isConnected: Boolean(user?.walletAddress),
    network: SUI_NETWORK,
  };
}

// ============================================
// Configuration
// ============================================

/**
 * Get SUI configuration
 * @returns {object}
 */
export function getSuiConfig() {
  return {
    network: SUI_NETWORK,
    rpcUrl: SUI_RPC_URL,
    packageId: PMARKET_PACKAGE_ID,
  };
}

export default {
  // RPC functions
  getTransaction,
  getObject,
  getOwnedObjects,
  verifyTransaction,
  
  // Transaction records
  recordTransaction,
  getUserTransactions,
  
  // Escrow
  saveEscrow,
  updateEscrowStatus,
  getEscrowByOrderId,
  getEscrowByObjectId,
  getUserEscrows,
  ESCROW_STATUS,
  ESCROW_STATUS_NAMES,
  
  // Green NFT
  saveGreenNFT,
  getGreenNFTByProductId,
  getUserGreenNFTs,
  revokeGreenNFT,
  
  // Wallet
  updateUserWallet,
  disconnectUserWallet,
  getUserWalletInfo,
  
  // Config
  getSuiConfig,
};
