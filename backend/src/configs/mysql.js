import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 15,
    queueLimit: 0
});

async function connectDB() {
    try {
        const connection = await pool.getConnection();
        console.log('Kết nối database Mysql thành công!');
        connection.release();
        
        // Run migrations for wallet support
        await runMigrations();
    } catch (error) {
        console.log('Kết nối thất bại không thành công, lỗi: ', error.message);
    }
}

async function runMigrations() {
    console.log('[Migration] Starting migrations...');
    // Column migrations
    const columnMigrations = [
        {
            table: 'User',
            column: 'walletAddress',
            sql: 'ALTER TABLE User ADD COLUMN walletAddress VARCHAR(66) NULL UNIQUE AFTER email'
        },
        {
            table: 'User',
            column: 'greenBadgeLevel',
            sql: 'ALTER TABLE User ADD COLUMN greenBadgeLevel INT DEFAULT 0'
        },
        {
            table: 'Review',
            column: 'comment',
            sql: 'ALTER TABLE Review ADD COLUMN comment TEXT NULL'
        },
        {
            table: 'Product',
            column: 'isGreen',
            sql: 'ALTER TABLE Product ADD COLUMN isGreen TINYINT(1) NOT NULL DEFAULT 0'
        },
        {
            table: 'SalesOrder',
            column: 'isGreen',
            sql: 'ALTER TABLE SalesOrder ADD COLUMN isGreen TINYINT(1) NOT NULL DEFAULT 0'
        },
        {
            table: 'SalesOrder',
            column: 'isGreenConfirmed',
            sql: 'ALTER TABLE SalesOrder ADD COLUMN isGreenConfirmed TINYINT(1) NOT NULL DEFAULT 0'
        },
        {
            table: 'Product',
            column: 'editCount',
            sql: 'ALTER TABLE Product ADD COLUMN editCount INT NOT NULL DEFAULT 0'
        },
        {
            table: 'Product',
            column: 'complianceDocs',
            sql: 'ALTER TABLE Product ADD COLUMN complianceDocs JSON NULL'
        }
    ];

    for (const migration of columnMigrations) {
        try {
            const [columns] = await pool.query(`
                SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
                WHERE TABLE_SCHEMA = DATABASE() 
                AND TABLE_NAME = ? 
                AND COLUMN_NAME = ?
            `, [migration.table, migration.column]);
            
            if (columns.length === 0) {
                console.log(`[Migration] Adding ${migration.column} column to ${migration.table} table...`);
                await pool.query(migration.sql);
                console.log(`[Migration] ${migration.column} column added successfully!`);
            }
        } catch (error) {
            console.log(`[Migration] Note for ${migration.table}.${migration.column}:`, error.message);
        }
    }

    // Table migrations
    const tableMigrations = [
        {
            name: 'ReferralTracking',
            sql: `CREATE TABLE IF NOT EXISTS ReferralTracking (
                referralId INT AUTO_INCREMENT PRIMARY KEY,
                referrerId INT NOT NULL,
                referredUserId INT NOT NULL,
                referralToken VARCHAR(50),
                status ENUM('REGISTERED', 'QUALIFIED', 'REWARDED') DEFAULT 'REGISTERED',
                createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                qualifiedAt TIMESTAMP NULL,
                rewardedAt TIMESTAMP NULL,
                rewardTxHash VARCHAR(100) NULL,
                UNIQUE KEY unique_referral (referrerId, referredUserId),
                FOREIGN KEY (referrerId) REFERENCES User(userId),
                FOREIGN KEY (referredUserId) REFERENCES User(userId)
            )`
        },
        {
            name: 'ReferralRewardLog',
            sql: `CREATE TABLE IF NOT EXISTS ReferralRewardLog (
                rewardId INT AUTO_INCREMENT PRIMARY KEY,
                referralId INT NOT NULL,
                rewardType ENUM('REPUTATION', 'GREEN_CREDIT', 'TOKEN') NOT NULL,
                amount DECIMAL(18,6) DEFAULT 0,
                note TEXT NULL,
                txHash VARCHAR(100) NULL,
                createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (referralId) REFERENCES ReferralTracking(referralId)
            )`
        }
    ];

    for (const migration of tableMigrations) {
        try {
            await pool.query(migration.sql);
            console.log(`[Migration] Table ${migration.name} ensured.`);
        } catch (error) {
            console.log(`[Migration] Note for table ${migration.name}:`, error.message);
        }
    }
}

connectDB();

export default pool;