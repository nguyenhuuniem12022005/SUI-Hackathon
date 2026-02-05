import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import pool from '../../configs/mysql.js';
import moment from 'moment';
import NodeCache from 'node-cache';
import * as userService from './userService.js';
import * as referralService from './referralService.js';

dotenv.config();

export const tokenBlocklist = new NodeCache();

export async function checkValidLogin(email, password) {
    const [rows] = await pool.query(`
        select * from User
        where email = ? 
        `, [email]);
    const user = rows[0];

    if (user) {
        const verified = await bcrypt.compare(password, user.passwordHash);
        if (verified) {
            return user;
        }
    }
    return false;
}

export async function register({ firstName, lastName, userName, email, password, referralCode }) {
    const sanitizedReferral = referralCode?.trim()?.toUpperCase() || null;
    const referrer = sanitizedReferral
        ? await referralService.findReferrerByToken(sanitizedReferral)
        : null;

    const referralToken = await referralService.generateUniqueReferralToken(userName);

    // Tạo User trước
    const newUser = await userService.createUser({
        firstName,
        lastName,
        userName,
        email,
        password,
        referralToken,
        referredByToken: referrer ? sanitizedReferral : null,
    });
    
    // Kiểm tra email để phân quyền
    const isPTIT = email.endsWith('@stu.ptit.edu.vn') || email.endsWith('@ptit.edu.vn');
    
    // Tạo Supplier (tất cả user đều là supplier)
    const shopName = "shop_" + newUser.userId + "_" + Math.random().toString(36).substring(2, 6);
    await pool.query(`
        INSERT INTO Supplier(supplierId, shopName, sellerRating)
        VALUES (?, ?, 0)
    `, [newUser.userId, shopName]);
    
    // Nếu là email PTIT thì tạo thêm Customer
    if (isPTIT) {
        await pool.query(`
            INSERT INTO Customer(customerId, class, totalPurchasedOrders)
            VALUES (?, 'D23CQCE04-B', 0)
        `, [newUser.userId]);
    }

    if (referrer) {
        await referralService.createReferralTracking({
            referrerId: referrer.userId,
            referredUserId: newUser.userId,
            referralToken: sanitizedReferral,
        });
    }
    
    return newUser;
}

export function authToken(user) {
    const payload = { userId: user.userId };
    const accessToken = jwt.sign(payload, process.env.SECRET_KEY, { expiresIn: process.env.LOGIN_EXPIRE_IN });
    const decode = jwt.decode(accessToken);
    const expireIn = decode.exp - decode.iat;
    return {
        access_token: accessToken,
        expire_in: expireIn,
        auth_type: 'Bearer token'
    };
}

export function blockToken(token){
    const expireIn = moment().add(7, 'days').unix();
    tokenBlocklist.set(token, true, expireIn);
}
