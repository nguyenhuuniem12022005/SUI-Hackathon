import bcrypt from 'bcrypt';
import crypto from 'crypto';
import elliptic from 'elliptic';
import { createHash } from 'crypto';
import ApiError from '../../utils/classes/api-error.js';
import pool from '../../configs/mysql.js';

const EC = elliptic.ec;
const PASSWORD_RESET_TOKEN_EXPIRES_MINUTES = Math.max(
  5,
  Number(process.env.PASSWORD_RESET_TOKEN_EXPIRES || 30)
);
const GREEN_CREDIT_TO_REPUTATION_RATE = Number(process.env.GREEN_CREDIT_TO_REPUTATION_RATE || 1);
let hasEnsuredReputationLedger = false;

const WALLET_ENCRYPTION_KEY = crypto
  .createHash('sha256')
  .update(process.env.WALLET_ENCRYPTION_KEY || process.env.SECRET_KEY || 'pmarket-wallet-secret')
  .digest();

function encryptPrivateKey(value) {
  if (!value) return null;
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-ctr', WALLET_ENCRYPTION_KEY, iv);
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  return `${iv.toString('hex')}:${encrypted.toString('hex')}`;
}

// Derive address từ private key bằng elliptic curve secp256k1
function deriveAddressFromPrivateKey(privateKey) {
  try {
    const ec = new EC('secp256k1');
    const cleanKey = privateKey.replace(/^0x/, '').toLowerCase();
    
    if (!/^[0-9a-f]{64}$/.test(cleanKey)) {
      return null;
    }
    
    const keyPair = ec.keyFromPrivate(cleanKey, 'hex');
    // Lấy public key không nén (uncompressed), bỏ byte đầu tiên (04)
    const publicKey = keyPair.getPublic(false, 'hex').slice(2);
    
    // Keccak256 hash của public key, lấy 20 bytes cuối làm address
    const hash = createHash('sha3-256').update(Buffer.from(publicKey, 'hex')).digest('hex');
    const address = '0x' + hash.slice(-40);
    
    return address.toLowerCase();
  } catch (error) {
    console.error('[Wallet] Derive address failed:', error.message);
    return null;
  }
}

function validatePrivateKeyMatchesAddress(privateKey, walletAddress) {
  const derivedAddress = deriveAddressFromPrivateKey(privateKey);
  if (!derivedAddress) {
    return false;
  }
  return derivedAddress === walletAddress.toLowerCase();
}

export async function createUser({
    firstName,
    lastName,
    userName,
    email,
    password,
    referralToken,
    referredByToken = null,
}) {
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const queryText = `
        insert into User (firstName, lastName, userName, email, passwordHash, referralToken, referredByToken)
        values (?, ?, ?, ?, ?, ?, ?)
    `;
    const [results] = await pool.query(queryText, [
        firstName,
        lastName,
        userName,
        email,
        passwordHash,
        referralToken,
        referredByToken,
    ]);

    const insertId = results.insertId;
    const [rows] = await pool.query(`
        select
          userId,
          firstName,
          lastName,
          userName,
          email,
          referralToken,
          referredByToken,
          phone,
          address,
          avatar,
          reputationScore,
          greenCredit,
          dateOfBirth,
          walletAddress
        from User where userId = ?`
        , [insertId]);

    return rows[0];
}

export async function changePassword(userId, currentPassword, newPassword) {
    const [rows] = await pool.query(`
        select userId, passwordHash
        from User
        where userId = ?
    `, [userId]);

    if (rows.length === 0) {
        throw ApiError.notFound('Không tìm thấy người dùng');
    }

    const { passwordHash: existingHash } = rows[0];
    const isMatch = await bcrypt.compare(currentPassword, existingHash);

    if (!isMatch) {
        throw ApiError.badRequest('Mật khẩu hiện tại không chính xác');
    }

    const isSamePassword = await bcrypt.compare(newPassword, existingHash);
    if (isSamePassword) {
        throw ApiError.badRequest('Mật khẩu mới phải khác mật khẩu hiện tại');
    }

    const salt = await bcrypt.genSalt(10);
    const nextHash = await bcrypt.hash(newPassword, salt);

    await pool.query(`
        update User 
        set passwordHash = ?
        where userId = ?
    `, [nextHash, userId]);
}

export async function resetPassword(email, password) {
    const [rows] = await pool.query(`
        select userId
        from User
        where email = ?
    `, [email]);

    if (rows.length === 0) {
        throw ApiError.notFound('Không tìm thấy người dùng');
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    await pool.query(`
        update User 
        set passwordHash = ?
        where email = ?
    `, [passwordHash, email]);
}

export async function setPasswordForUser(userId, password) {
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(password, salt);
  await pool.query(
    `
    update User
    set passwordHash = ?
    where userId = ?
    `,
    [passwordHash, userId]
  );
}

export async function createPasswordResetRequest(email) {
  const [users] = await pool.query(
    `
    select userId, email, firstName, lastName
    from User
    where email = ?
    limit 1
    `,
    [email]
  );
  if (users.length === 0) {
    throw ApiError.notFound('Email chưa được đăng ký');
  }
  const user = users[0];
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + PASSWORD_RESET_TOKEN_EXPIRES_MINUTES * 60 * 1000);
  await pool.query(
    `
    insert into PasswordResetToken (userId, token, expiresAt)
    values (?, ?, ?)
    `,
    [user.userId, token, expiresAt]
  );
  return { token, user, expiresAt };
}

export async function verifyPasswordResetToken(token) {
  const [rows] = await pool.query(
    `
    select *
    from PasswordResetToken
    where token = ?
    limit 1
    `,
    [token]
  );
  const entry = rows[0];
  if (!entry) {
    throw ApiError.badRequest('Mã xác nhận không hợp lệ');
  }
  if (entry.usedAt) {
    throw ApiError.badRequest('Mã xác nhận đã được sử dụng');
  }
  if (entry.expiresAt && new Date(entry.expiresAt) < new Date()) {
    throw ApiError.badRequest('Mã xác nhận đã hết hạn');
  }
  return entry;
}

export async function markPasswordResetUsed(resetId) {
  await pool.query(
    `
    update PasswordResetToken
    set usedAt = now()
    where resetId = ?
    `,
    [resetId]
  );
}

export async function updateUserName(userId, userName) {
    await pool.query(`
        update User 
        set userName = ?
        where userId = ?    
        `, [userName, userId]);
}

export async function updatePhone(userId, phone) {
    await pool.query(`
        update User 
        set phone = ?
        where userId = ?    
        `, [phone, userId]);
}

export async function updateAddress(userId, address) {
    await pool.query(`
        update User 
        set address = ?
        where userId = ?    
        `, [address, userId]);
}

export async function uploadAvatar(userId, imagePath) {
    await pool.query(`
        update User 
        set avatar = ?
        where userId = ?    
        `, [imagePath, userId]);
}

export async function updateReputationScore(userId, amount) {
    await pool.query(`
        update User 
        set reputationScore = ifnull(reputationScore, 0) + ?
        where userId = ?    
        `, [amount, userId]);
}

export async function updateGreenCredit(userId, amount) {
    await pool.query(`
        update User 
        set greenCredit = ifnull(greenCredit, 0) + ?
        where userId = ?    
        `, [amount, userId]);
}

export async function convertGreenCreditToReputation(userId, greenCreditAmount) {
    const amount = Math.max(1, Number(greenCreditAmount) || 0);
    if (!GREEN_CREDIT_TO_REPUTATION_RATE) {
        throw ApiError.badRequest('Chưa cấu hình tỷ lệ đổi Green Credit.');
    }
    const [rows] = await pool.query(
        `
        select greenCredit
        from User
        where userId = ?
        limit 1
        `,
        [userId]
    );
    if (rows.length === 0) {
        throw ApiError.notFound('Không tìm thấy người dùng');
    }
    const currentCredit = Number(rows[0].greenCredit || 0);
    if (currentCredit < amount) {
        throw ApiError.badRequest('Bạn không có đủ Green Credit để quy đổi.');
    }
    const reputationGain = Math.max(1, Math.floor(amount * GREEN_CREDIT_TO_REPUTATION_RATE));
    await ensureReputationLedger();
    await pool.query(
        `
        update User
        set greenCredit = greenCredit - ?, reputationScore = reputationScore + ?
        where userId = ?
        `,
        [amount, reputationGain, userId]
    );
    await pool.query(
        `
        insert into ReputationLedger (userId, type, deltaReputation, deltaGreen, reason)
        values (?, 'CONVERT', ?, ?, ?)
        `,
        [userId, reputationGain, -amount, 'Quy đổi Green Credit sang điểm uy tín']
    );
    return {
        reputationGain,
        greenCreditSpent: amount,
    };
}

async function ensureReputationLedger() {
    if (hasEnsuredReputationLedger) return;
    await pool.query(`
        create table if not exists ReputationLedger (
            logId int auto_increment primary key,
            userId int not null,
            type varchar(32) not null,
            deltaReputation int not null default 0,
            deltaGreen int not null default 0,
            reason text null,
            createdAt timestamp default current_timestamp
        )
    `);
    hasEnsuredReputationLedger = true;
}

export async function listReputationLedger(userId, limit = 50) {
    await ensureReputationLedger();
    const [rows] = await pool.query(
        `
        select logId, type, deltaReputation, deltaGreen, reason, createdAt
        from ReputationLedger
        where userId = ?
        order by createdAt desc
        limit ?
        `,
        [userId, Math.max(1, Math.min(Number(limit) || 50, 200))]
    );
    return rows.map((row) => ({
        ...row,
        createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : row.createdAt,
    }));
}

async function ensureNotificationTable() {
    await pool.query(`
        create table if not exists Notification (
            notificationId int auto_increment primary key,
            userId int not null,
            content text not null,
            type varchar(64) not null default 'system',
            isRead tinyint(1) not null default 0,
            relatedId int null,
            createdAt timestamp default current_timestamp
        )
    `);
}

export async function listNotifications(userId, { since, limit = 50 } = {}) {
    await ensureNotificationTable();
    const params = [userId];
    let where = 'userId = ?';
    if (since) {
        where += ' and createdAt > ?';
        params.push(new Date(since));
    }
    params.push(Math.max(1, Math.min(Number(limit) || 50, 200)));
    const [rows] = await pool.query(
        `
        select notificationId, content, type, isRead, relatedId, createdAt
        from Notification
        where ${where}
        order by createdAt desc
        limit ?
        `,
        params
    );
    return rows.map((row) => ({
        ...row,
        createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : row.createdAt,
    }));
}

export async function markNotificationsRead(userId, ids = []) {
    if (!Array.isArray(ids) || !ids.length) return;
    await ensureNotificationTable();
    await pool.query(
        `
        update Notification
        set isRead = 1
        where userId = ? and notificationId in (?)
        `,
        [userId, ids]
    );
}

export async function updateDateOfBirth(userId, dateOfBirth) {
    await pool.query(`
        update User 
        set dateOfBirth = ?
        where userId = ?    
        `, [dateOfBirth, userId]);
}

// THÊM HÀM MỚI: Lấy thông tin dashboard
export async function getUserDashboardData(userId) {
    // Lấy thông tin user
    const [userRows] = await pool.query(`
        SELECT u.*, 
               (SELECT COUNT(*) FROM Customer WHERE customerId = u.userId) as isCustomer,
               (SELECT COUNT(*) FROM Supplier WHERE supplierId = u.userId) as isSupplier
        FROM User u
        WHERE u.userId = ?
    `, [userId]);
    
    const user = userRows[0];
    if (!user) {
        throw ApiError.notFound('Không tìm thấy người dùng');
    }
    const email = user.email || '';
    const isPTIT = email.endsWith('@stu.ptit.edu.vn') || email.endsWith('@ptit.edu.vn');
    
    // Lấy sản phẩm đã bán (nếu là Supplier)
    const [soldProducts] = await pool.query(`
        SELECT p.*, od.quantity, od.unitPrice, so.orderDate, so.status,
               c.class as customerClass, u.email as customerEmail
        FROM Product p
        JOIN OrderDetail od ON p.productId = od.productId
        JOIN SalesOrder so ON od.salesOrderId = so.salesOrderId
        JOIN Customer c ON so.customerId = c.customerId
        JOIN User u ON c.customerId = u.userId
        WHERE p.supplierId = ?
        ORDER BY so.orderDate DESC
    `, [userId]);
    
    // Lấy sản phẩm đã mua (nếu là Customer)
    let purchasedProducts = [];
    if (isPTIT && user.isCustomer > 0) {
        const [purchased] = await pool.query(`
            SELECT p.*, od.quantity, od.unitPrice, so.orderDate, so.status,
                   s.shopName, u.userName as sellerName, u.email as sellerEmail
            FROM SalesOrder so
            JOIN OrderDetail od ON so.salesOrderId = od.salesOrderId
            JOIN Product p ON od.productId = p.productId
            JOIN Supplier s ON p.supplierId = s.supplierId
            JOIN User u ON s.supplierId = u.userId
            WHERE so.customerId = ?
            ORDER BY so.orderDate DESC
        `, [userId]);
        purchasedProducts = purchased;
    }
    
    const normalizedUser = {
        userId: user.userId,
        userName: user.userName,
        email: user.email,
        phone: user.phone || '',
        address: user.address || '',
        avatar: user.avatar || null,
        dateOfBirth: user.dateOfBirth || null,
        reputationScore: Number(user.reputationScore) || 0,
        greenCredit: Number(user.greenCredit) || 0,
        greenBadgeLevel: Number(user.greenBadgeLevel || 0),
        isPTIT,
        isCustomer: user.isCustomer > 0,
        isSupplier: user.isSupplier > 0,
        walletAddress: user.walletAddress || null,
        walletConnectedAt: user.walletConnectedAt || null
    };

    return {
        user: normalizedUser,
        reputation: normalizedUser.reputationScore,
        greenCredit: normalizedUser.greenCredit,
        phone: normalizedUser.phone,
        address: normalizedUser.address,
        dateOfBirth: normalizedUser.dateOfBirth,
        avatar: normalizedUser.avatar,
        isPTIT: normalizedUser.isPTIT,
        isCustomer: normalizedUser.isCustomer,
        isSupplier: normalizedUser.isSupplier,
        soldProducts,
        purchasedProducts
    };
}

export async function connectWallet(userId, { walletAddress, privateKey }) {
    if (!walletAddress || !privateKey) {
        throw ApiError.badRequest('Thiếu thông tin ví SUI');
    }

    // Normalize và validate địa chỉ ví
    const cleanAddress = walletAddress.trim().toLowerCase();
    const normalizedAddress = cleanAddress.startsWith('0x') ? cleanAddress : `0x${cleanAddress}`;

    if (!/^0x[0-9a-f]{40}$/i.test(normalizedAddress)) {
        throw ApiError.badRequest('Địa chỉ ví không hợp lệ (phải bắt đầu bằng 0x và có 40 ký tự hex)');
    }

    // Normalize private key: loại bỏ 0x prefix và chuyển về lowercase
    const cleanKey = privateKey.trim().replace(/^0x/, '').toLowerCase();

    // Validate format private key
    if (!/^[0-9a-f]{64}$/i.test(cleanKey)) {
        throw ApiError.badRequest('Private key không hợp lệ (phải là 64 ký tự hex)');
    }

    // BƯỚC 1: Gọi API HSCOIN để lấy thông tin ví theo địa chỉ
    let hscoinWalletData;
    try {
        const response = await fetch(`https://hsc-w3oq.onrender.com/api/wallet/${normalizedAddress}`);
        
        if (!response.ok) {
            if (response.status === 404) {
                throw ApiError.badRequest('Địa chỉ ví không tồn tại trên hệ thống SUI');
            }
            throw ApiError.badRequest(`Không thể truy cập SUI API (${response.status})`);
        }

        hscoinWalletData = await response.json();
        
        if (!hscoinWalletData || !hscoinWalletData.private_key) {
            throw ApiError.badRequest('Hệ thống không trả về thông tin xác thực cho ví này');
        }
    } catch (error) {
        // Nếu là ApiError thì throw lại
        if (error.statusCode) {
            throw error;
        }
        // Nếu là lỗi network hoặc parse JSON
        console.error('[Wallet] SUI API error:', error.message);
        throw ApiError.badRequest('Không thể kết nối với SUI để xác thực ví. Vui lòng thử lại sau.');
    }

    // BƯỚC 2: So sánh private key user nhập với private key từ HSCOIN
    // Normalize private key từ HSCOIN: loại bỏ 0x prefix và chuyển về lowercase
    const hscoinPrivateKey = (hscoinWalletData.private_key || '')
        .trim()
        .replace(/^0x/, '')
        .toLowerCase();

    // So sánh chính xác (case-sensitive sau khi đã normalize)
    if (hscoinPrivateKey !== cleanKey) {
        throw ApiError.badRequest(
            'Thông tin ví không hợp lệ. Không thể liên kết ví.'
        );
    }

    // BƯỚC 3: Nếu private key khớp → mã hóa và lưu vào database
    const encryptedKey = encryptPrivateKey(cleanKey);
    await pool.query(
        `
        update User
        set walletAddress = ?, walletEncryptedKey = ?, walletConnectedAt = now()
        where userId = ?
        `,
        [normalizedAddress, encryptedKey, userId]
    );

    return getWalletInfo(userId);
}


export async function disconnectWallet(userId) {
    await pool.query(
        `
        update User
        set walletAddress = null, walletEncryptedKey = null, walletConnectedAt = null
        where userId = ?
        `,
        [userId]
    );
}

export async function getWalletInfo(userId) {
    const [rows] = await pool.query(
        `
        select walletAddress, walletConnectedAt
        from User
        where userId = ?
        limit 1
        `,
        [userId]
    );

    if (rows.length === 0) {
        throw ApiError.notFound('Không tìm thấy người dùng');
    }

    return {
        walletAddress: rows[0].walletAddress || null,
        connectedAt: rows[0].walletConnectedAt || null,
        isConnected: Boolean(rows[0].walletAddress),
    };
}

const GREEN_BADGE_COST = Number(process.env.GREEN_BADGE_COST || 20);

export async function redeemGreenBadge(userId) {
  const cost = GREEN_BADGE_COST;
  const [rows] = await pool.query(
    `
    update User
    set greenCredit = greenCredit - ?,
        greenBadgeLevel = 1
    where userId = ? and greenCredit >= ?
    `,
    [cost, userId, cost]
  );
  if (rows.affectedRows === 0) {
    throw ApiError.badRequest('Không đủ Green Credit để đổi huy hiệu.');
  }
  const [userRows] = await pool.query(
    `
    select greenCredit, greenBadgeLevel
    from User
    where userId = ?
    limit 1
    `,
    [userId]
  );
  const user = userRows[0] || {};
  return {
    greenCredit: Number(user.greenCredit || 0),
    greenBadgeLevel: Number(user.greenBadgeLevel || 0),
  };
}

export async function listMyReviews(userId) {
  const [rows] = await pool.query(
    `
    select
      r.reviewId,
      r.orderDetailId,
      r.starNumber,
      r.comment,
      r.createdAt,
      p.productId,
      p.productName,
      u.userName as reviewerName,
      u.avatar   as reviewerAvatar
    from Review r
      join OrderDetail od on r.orderDetailId = od.orderDetailId
      join Product p on od.productId = p.productId
      join User u on r.customerId = u.userId
    where r.customerId = ?
    order by r.createdAt desc
    `,
    [userId]
  );

  return rows.map((row) => ({
    reviewId: row.reviewId,
    rating: Number(row.starNumber || 0),
    comment: row.comment || '',
    createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : row.createdAt,
    product: {
      productId: row.productId,
      title: row.productName,
    },
    reviewerName: row.reviewerName || 'Bạn',
    reviewerAvatar: row.reviewerAvatar || null,
  }));
}

export async function listMonthlyLeaderboard({ days = 30, limit = 10 } = {}) {
  await ensureReputationLedger();
  const windowDays = Math.max(1, Number(days) || 30);
  const maxBase = Math.max(1, Number(limit) || 10);

  const [rows] = await pool.query(
    `
    select
      u.userId,
      u.userName,
      u.avatar,
      coalesce(sum(rl.deltaReputation), 0) as repGain,
      coalesce(sum(rl.deltaGreen), 0) as greenGain
    from ReputationLedger rl
      join User u on u.userId = rl.userId
    where rl.createdAt >= date_sub(now(), interval ? day)
    group by u.userId, u.userName, u.avatar
    having repGain <> 0 or greenGain <> 0
    order by repGain desc, greenGain desc, u.userId asc
    `,
    [windowDays]
  );

  if (rows.length === 0) return [];

  // Lấy top và giữ lại tất cả ai bằng điểm với vị trí cuối cùng trong top cơ bản
  const baseCount = Math.min(rows.length, maxBase);
  const base = rows.slice(0, baseCount);
  if (rows.length <= maxBase) return base;

  const last = base[baseCount - 1];
  const tie = rows.slice(baseCount).filter(
    (r) => Number(r.repGain) === Number(last.repGain) && Number(r.greenGain) === Number(last.greenGain)
  );
  return [...base, ...tie];
}
