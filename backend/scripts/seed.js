import 'dotenv/config';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import pool from '../src/configs/mysql.js';

const DEFAULT_CATEGORIES = [
  { categoryId: 1, categoryName: 'Sách vở', description: 'Sách giáo trình, truyện, vở ghi' },
  { categoryId: 2, categoryName: 'Quần áo', description: 'Quần áo, phụ kiện thời trang' },
  { categoryId: 3, categoryName: 'Phòng trọ', description: 'Thông tin phòng trọ, ký túc xá' },
  { categoryId: 4, categoryName: 'Đồ điện tử', description: 'Điện thoại, laptop, thiết bị điện tử' },
  { categoryId: 5, categoryName: 'Đồ gia dụng', description: 'Đồ dùng sinh hoạt, nội thất nhỏ' },
  { categoryId: 6, categoryName: 'Đồ thể thao', description: 'Dụng cụ, trang phục luyện tập thể thao' },
  { categoryId: 7, categoryName: 'Khóa học', description: 'Khóa học online/offline, tài liệu học tập' },
];

const DEFAULT_WAREHOUSES = [
  { warehouseName: 'Kho Hà Nội', capacity: 2000 },
  { warehouseName: 'Kho TP.HCM', capacity: 2200 },
  { warehouseName: 'Kho Đà Nẵng', capacity: 1500 },
];

const SAMPLE_USERS = [
  {
    email: 'maitoan@stu.ptit.edu.vn',
    firstName: 'Mai',
    lastName: 'Toàn',
    userName: 'maitoan',
    password: 'Pmarket@123',
    referralToken: 'PMKT-MAI001',
    phone: '0987 654 321',
    address: 'KTX PTIT, Hà Đông, Hà Nội',
    avatar: 'uploads/1762917453999-308760901.png',
    reputationScore: 120,
    greenCredit: 240,
    isCustomer: true,
    isSupplier: true,
    studentClass: 'D23CQCE04-B',
  },
  {
    email: 'greenstore@pmarket.vn',
    firstName: 'Nguyễn',
    lastName: 'Hà',
    userName: 'greenstore',
    password: 'Pmarket@123',
    referralToken: 'PMKT-GREEN',
    phone: '0901 234 567',
    address: '24 Duy Tân, Cầu Giấy',
    avatar: 'uploads/1762917810763-594966041.png',
    reputationScore: 155,
    greenCredit: 320,
    isCustomer: false,
    isSupplier: true,
  },
  {
    email: 'buyer@stu.ptit.edu.vn',
    firstName: 'Đào',
    lastName: 'Minh',
    userName: 'daominh',
    password: 'Pmarket@123',
    referralToken: 'PMKT-MINH',
    phone: '0904 555 888',
    address: 'Học viện Công nghệ Bưu chính Viễn thông',
    avatar: 'uploads/1762921411835-343674603.png',
    reputationScore: 95,
    greenCredit: 110,
    isCustomer: true,
    isSupplier: false,
    studentClass: 'D23CQCE04-B',
    referredBy: 'PMKT-MAI001',
  },
];

const SAMPLE_PRODUCTS = [
  {
    productName: 'Chuột gaming RGB Pulse',
    supplierEmail: 'greenstore@pmarket.vn',
    categoryId: 4,
    unitPrice: 550000,
    size: 'Universal',
    discount: 5,
    status: 'Active',
    imageURL: 'uploads/1762921477292-405608472.png',
    description: 'Chuột gaming không dây RGB, hỗ trợ 6 nút macro và pin 70 giờ.',
    complianceDocs: ['uploads/1762921477292-405608472.png'],
    stock: [
      { warehouseName: 'Kho Hà Nội', quantity: 80 },
      { warehouseName: 'Kho TP.HCM', quantity: 60 },
    ],
  },
  {
    productName: 'Tai nghe Canvas Air',
    supplierEmail: 'maitoan@stu.ptit.edu.vn',
    categoryId: 4,
    unitPrice: 420000,
    size: 'Universal',
    discount: 0,
    status: 'Active',
    imageURL: 'uploads/1762921411835-343674603.png',
    description: 'Tai nghe không dây với chip chống ồn Hybrid ANC, pin 32 giờ.',
    complianceDocs: ['uploads/1762921411835-343674603.png'],
    stock: [
      { warehouseName: 'Kho Hà Nội', quantity: 120 },
      { warehouseName: 'Kho Đà Nẵng', quantity: 40 },
    ],
  },
  {
    productName: 'Phòng trọ mini Cầu Giấy',
    supplierEmail: 'maitoan@stu.ptit.edu.vn',
    categoryId: 3,
    unitPrice: 2500000,
    size: '25m2',
    discount: 0,
    status: 'Active',
    imageURL: 'uploads/1762921477292-405608472.png',
    description: 'Phòng trọ gác lửng 25m2 đầy đủ nội thất, phù hợp 2-3 sinh viên.',
    complianceDocs: [],
    stock: [{ warehouseName: 'Kho Hà Nội', quantity: 5 }],
  },
];

const SAMPLE_ORDERS = [
  {
    reference: 'PMKT-ESC-1001',
    customerEmail: 'buyer@stu.ptit.edu.vn',
    shippingAddress: 'Tòa nhà A12, Học viện PTIT, Hà Đông',
    status: 'Completed',
    totalAmount: 2100000,
    orderDate: '2024-05-18 09:15:00',
    deliveryDate: '2024-05-20 09:15:00',
    items: [
      { productName: 'Chuột gaming RGB Pulse', quantity: 2, unitPrice: 550000 },
      { productName: 'Tai nghe Canvas Air', quantity: 2, unitPrice: 500000 },
    ],
    escrowStatus: 'Completed',
  },
  {
    reference: 'PMKT-ESC-1002',
    customerEmail: 'maitoan@stu.ptit.edu.vn',
    shippingAddress: 'Ký túc xá PTIT, Nguyễn Trãi',
    status: 'Pending',
    totalAmount: 2500000,
    orderDate: '2024-06-02 02:30:00',
    deliveryDate: '2024-06-05 02:30:00',
    items: [{ productName: 'Phòng trọ mini Cầu Giấy', quantity: 1, unitPrice: 2500000 }],
    escrowStatus: 'Pending',
  },
];

const SAMPLE_REFERRALS = [
  {
    referrerEmail: 'maitoan@stu.ptit.edu.vn',
    referredEmail: 'buyer@stu.ptit.edu.vn',
    status: 'REWARDED',
    rewardType: 'GREEN_CREDIT',
    rewardAmount: 25,
    txHash: '0xe229af964abfd2a77110b9a3983075b6',
  },
];

const SAMPLE_DEVELOPER_APPS = [
  {
    ownerEmail: 'greenstore@pmarket.vn',
    name: 'P-Market HScoin',
    origins: ['https://p-market.onrender.com', 'https://p-market-1.onrender.com'],
    quota: 1000,
    status: 'ACTIVE',
    apiKey: process.env.HSCOIN_API_KEY || '4176EE7EE9C54DA09C2776AE12327DEA1',
  },
];

const SAMPLE_DEVELOPER_METRICS = [
  {
    appName: 'P-Market HScoin',
    day: '2024-05-20',
    escrowTransactions: 6,
    walletRpcCalls: 24,
    smartContractEvents: 4,
  },
];

const DEFAULT_PAYMENT_METHOD_SEED = {
  methodName: 'Ví HScoin',
  provider: 'HScoin Escrow',
  accountNumber: 'HSC-0001',
  status: 'ACTIVE',
};

let cachedPaymentMethodId = null;

async function ensureCategories() {
  for (const category of DEFAULT_CATEGORIES) {
    await pool.query(
      `
        insert into Category (categoryId, categoryName, description)
        values (?, ?, ?)
        on duplicate key update categoryName = values(categoryName), description = values(description)
      `,
      [category.categoryId, category.categoryName, category.description || null]
    );
  }
}

async function ensureWarehouses() {
  const [existingRows] = await pool.query('select warehouseId, warehouseName from Warehouse');
  const map = new Map(existingRows.map((row) => [row.warehouseName, row]));

  for (const warehouse of DEFAULT_WAREHOUSES) {
    if (map.has(warehouse.warehouseName)) continue;
    const [result] = await pool.query(
      `
        insert into Warehouse (warehouseName, capacity)
        values (?, ?)
      `,
      [warehouse.warehouseName, warehouse.capacity]
    );
    map.set(warehouse.warehouseName, {
      warehouseId: result.insertId,
      warehouseName: warehouse.warehouseName,
    });
  }

  if (map.size === 0) {
    const [rows] = await pool.query('select warehouseId, warehouseName from Warehouse');
    rows.forEach((row) => map.set(row.warehouseName, row));
  }

  return map;
}

async function ensurePaymentMethodId() {
  if (cachedPaymentMethodId) {
    return cachedPaymentMethodId;
  }

  const [existing] = await pool.query(
    'select paymentMethodId from PaymentMethod order by paymentMethodId asc limit 1'
  );
  if (existing.length > 0) {
    cachedPaymentMethodId = existing[0].paymentMethodId;
    return cachedPaymentMethodId;
  }

  const [columns] = await pool.query('show columns from PaymentMethod');
  const columnNames = [];
  const values = [];

  for (const column of columns) {
    const field = column.Field;
    if (String(column.Extra || '').toLowerCase().includes('auto_increment')) {
      continue;
    }

    let value = DEFAULT_PAYMENT_METHOD_SEED[field];

    if (value === undefined) {
      if (column.Default !== null || column.Null === 'YES') {
        continue;
      }

      if (/int|decimal|float|double/i.test(column.Type)) {
        value = 0;
      } else if (/date|time/i.test(column.Type)) {
        value = new Date().toISOString().slice(0, 19).replace('T', ' ');
      } else {
        value = 'HScoin Seed';
      }
    }

    columnNames.push(field);
    values.push(value);
  }

  if (columnNames.length === 0) {
    throw new Error('Không thể tạo payment method mặc định vì không xác định được cột bắt buộc.');
  }

  const placeholders = columnNames.map(() => '?').join(', ');
  const sql = `insert into PaymentMethod (${columnNames.join(', ')}) values (${placeholders})`;
  const [result] = await pool.query(sql, values);
  cachedPaymentMethodId = result.insertId;
  return cachedPaymentMethodId;
}

async function upsertUser(user) {
  const [existingRows] = await pool.query(
    `select userId, referralToken from User where email = ? limit 1`,
    [user.email]
  );

  const passwordHash = await bcrypt.hash(user.password, 10);
  const referralToken =
    user.referralToken ||
    existingRows[0]?.referralToken ||
    `PMKT-${user.userName.slice(0, 4).toUpperCase()}${Date.now().toString(36).toUpperCase()}`;

  if (existingRows.length > 0) {
    const existing = existingRows[0];
    await pool.query(
      `
        update User
        set firstName = ?, lastName = ?, userName = ?, passwordHash = ?, referralToken = ?, referredByToken = ?,
            avatar = ?, phone = ?, address = ?, reputationScore = ?, greenCredit = ?
        where userId = ?
      `,
      [
        user.firstName,
        user.lastName,
        user.userName,
        passwordHash,
        referralToken,
        user.referredBy || null,
        user.avatar || null,
        user.phone || null,
        user.address || null,
        user.reputationScore || 60,
        user.greenCredit || 80,
        existing.userId,
      ]
    );
    return { userId: existing.userId, referralToken };
  }

  const [result] = await pool.query(
    `
      insert into User (firstName, lastName, userName, email, passwordHash, referralToken, referredByToken, avatar, phone, address, reputationScore, greenCredit)
      values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      user.firstName,
      user.lastName,
      user.userName,
      user.email,
      passwordHash,
      referralToken,
      user.referredBy || null,
      user.avatar || null,
      user.phone || null,
      user.address || null,
      user.reputationScore || 60,
      user.greenCredit || 80,
    ]
  );
  return { userId: result.insertId, referralToken };
}

async function ensureSupplier(userId, user) {
  if (!user.isSupplier) return;
  const shopName = user.shopName || `shop_${user.userName}`;
  await pool.query(
    `
      insert into Supplier (supplierId, shopName, sellerRating)
      values (?, ?, ?)
      on duplicate key update shopName = values(shopName), sellerRating = values(sellerRating)
    `,
    [userId, shopName, user.sellerRating || 4.8]
  );
}

async function ensureCustomer(userId, user) {
  if (!user.isCustomer) return;
  await pool.query(
    `
      insert into Customer (customerId, class, totalPurchasedOrders)
      values (?, ?, 0)
      on duplicate key update class = values(class)
    `,
    [userId, user.studentClass || 'D23CQCE04-B']
  );
}

async function ensureUsers() {
  const userMap = new Map();
  for (const sample of SAMPLE_USERS) {
    const created = await upsertUser(sample);
    await ensureSupplier(created.userId, sample);
    await ensureCustomer(created.userId, sample);
    userMap.set(sample.email, { ...sample, ...created });
  }
  return userMap;
}

async function ensureProductCatalog(userMap, warehouseMap) {
  const productMap = new Map();
  for (const product of SAMPLE_PRODUCTS) {
    const supplier = userMap.get(product.supplierEmail);
    if (!supplier) continue;

    const [existing] = await pool.query(
      'select productId from Product where productName = ? limit 1',
      [product.productName]
    );

    if (existing.length > 0) {
      await pool.query(
        `
          update Product
          set supplierId = ?, categoryId = ?, description = ?, imageURL = ?, unitPrice = ?, size = ?, status = ?, discount = ?, complianceDocs = ?
          where productId = ?
        `,
        [
          supplier.userId,
          product.categoryId,
          product.description || null,
          product.imageURL || null,
          product.unitPrice,
          product.size || null,
          product.status || 'Draft',
          product.discount || 0,
          product.complianceDocs?.length ? JSON.stringify(product.complianceDocs) : null,
          existing[0].productId,
        ]
      );
      productMap.set(product.productName, {
        productId: existing[0].productId,
        supplierId: supplier.userId,
      });
    } else {
      const [result] = await pool.query(
        `
          insert into Product (supplierId, categoryId, productName, description, imageURL, unitPrice, size, status, discount, complianceDocs)
          values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          supplier.userId,
          product.categoryId,
          product.productName,
          product.description || null,
          product.imageURL || null,
          product.unitPrice,
          product.size || null,
          product.status || 'Draft',
          product.discount || 0,
          product.complianceDocs?.length ? JSON.stringify(product.complianceDocs) : null,
        ]
      );
      productMap.set(product.productName, {
        productId: result.insertId,
        supplierId: supplier.userId,
      });
    }

    for (const stock of product.stock || []) {
      const warehouse = warehouseMap.get(stock.warehouseName);
      if (!warehouse) continue;
      await pool.query(
        `
          insert into Store (productId, warehouseId, quantity)
          values (?, ?, ?)
          on duplicate key update quantity = values(quantity)
        `,
        [productMap.get(product.productName).productId, warehouse.warehouseId, stock.quantity]
      );
    }
  }
  return productMap;
}

function mapEscrowStatus(status) {
  if (status === 'Completed') return 'RELEASED';
  if (status === 'Cancelled') return 'REFUNDED';
  return 'LOCKED';
}

async function ensureEscrowLedger(salesOrderId, order, index = 0) {
  const [existing] = await pool.query(
    'select ledgerId from EscrowLedger where salesOrderId = ? limit 1',
    [salesOrderId]
  );
  const txSeed = `${salesOrderId}-${order.reference}-${index}`;
  const txHash = `0x${crypto.createHash('sha256').update(txSeed).digest('hex').slice(0, 64)}`;
  const blockNumber = 700 + salesOrderId + index;
  const status = mapEscrowStatus(order.escrowStatus || order.status);

  if (existing.length > 0) {
    await pool.query(
      `
        update EscrowLedger
        set txHash = ?, blockNumber = ?, gasUsed = ?, network = ?, status = ?
        where ledgerId = ?
      `,
      [txHash, blockNumber, status === 'RELEASED' ? 105000 : 46000, 'HScoin Devnet', status, existing[0].ledgerId]
    );
    return;
  }

  await pool.query(
    `
      insert into EscrowLedger (salesOrderId, txHash, blockNumber, gasUsed, network, status)
      values (?, ?, ?, ?, ?, ?)
    `,
    [salesOrderId, txHash, blockNumber, status === 'RELEASED' ? 105000 : 46000, 'HScoin Devnet', status]
  );
}

async function ensureOrders(userMap, productMap) {
  for (const order of SAMPLE_ORDERS) {
    const customer = userMap.get(order.customerEmail);
    if (!customer) continue;
    const paymentMethodId = order.paymentMethodId || (await ensurePaymentMethodId());

    const [existing] = await pool.query(
      `
        select salesOrderId
        from SalesOrder
        where customerId = ? and totalAmount = ? and date(orderDate) = date(?)
        limit 1
      `,
      [customer.userId, order.totalAmount, order.orderDate]
    );

    let salesOrderId;
    if (existing.length > 0) {
      salesOrderId = existing[0].salesOrderId;
      await pool.query(
        `
          update SalesOrder
          set status = ?, shippingAddress = ?, deliveryDate = ?, paymentMethodId = ?
          where salesOrderId = ?
        `,
        [
          order.status,
          order.shippingAddress || null,
          order.deliveryDate || null,
          paymentMethodId,
          salesOrderId,
        ]
      );
    } else {
      const [result] = await pool.query(
        `
          insert into SalesOrder (customerId, totalAmount, shippingAddress, status, orderDate, deliveryDate, paymentMethodId)
          values (?, ?, ?, ?, ?, ?, ?)
        `,
        [
          customer.userId,
          order.totalAmount,
          order.shippingAddress || null,
          order.status,
          order.orderDate || new Date(),
          order.deliveryDate || null,
          paymentMethodId,
        ]
      );
      salesOrderId = result.insertId;
    }

    for (const item of order.items || []) {
      const product = productMap.get(item.productName);
      if (!product) continue;
      const [detail] = await pool.query(
        `
          select orderDetailId
          from OrderDetail
          where salesOrderId = ? and productId = ?
          limit 1
        `,
        [salesOrderId, product.productId]
      );

      if (detail.length > 0) {
        await pool.query(
          `
            update OrderDetail
            set quantity = ?, unitPrice = ?
            where orderDetailId = ?
          `,
          [item.quantity, item.unitPrice, detail[0].orderDetailId]
        );
      } else {
        await pool.query(
          `
            insert into OrderDetail (salesOrderId, productId, quantity, unitPrice)
            values (?, ?, ?, ?)
          `,
          [salesOrderId, product.productId, item.quantity, item.unitPrice]
        );
      }
    }

    await ensureEscrowLedger(salesOrderId, order);
  }
}

async function ensureReferrals(userMap) {
  for (const referral of SAMPLE_REFERRALS) {
    const referrer = userMap.get(referral.referrerEmail);
    const referred = userMap.get(referral.referredEmail);
    if (!referrer || !referred) continue;

    const [existing] = await pool.query(
      `
        select referralId
        from ReferralTracking
        where referrerId = ? and referredUserId = ?
        limit 1
      `,
      [referrer.userId, referred.userId]
    );

    let referralId;
    if (existing.length > 0) {
      referralId = existing[0].referralId;
      await pool.query(
        `
          update ReferralTracking
          set status = ?, qualifiedAt = coalesce(qualifiedAt, now()), rewardedAt = ?
          where referralId = ?
        `,
        [referral.status || 'QUALIFIED', referral.status === 'REWARDED' ? new Date() : null, referralId]
      );
    } else {
      const [result] = await pool.query(
        `
          insert into ReferralTracking (referrerId, referredUserId, referralToken, status, qualifiedAt, rewardedAt, rewardTxHash)
          values (?, ?, ?, ?, ?, ?, ?)
        `,
        [
          referrer.userId,
          referred.userId,
          referrer.referralToken,
          referral.status || 'QUALIFIED',
          new Date(),
          referral.status === 'REWARDED' ? new Date() : null,
          referral.txHash || null,
        ]
      );
      referralId = result.insertId;
    }

    if (referral.status === 'REWARDED' && referral.rewardAmount) {
      await pool.query(
        `
          insert into ReferralRewardLog (referralId, rewardType, amount, note, txHash)
          values (?, ?, ?, ?, ?)
        `,
        [
          referralId,
          referral.rewardType || 'GREEN_CREDIT',
          referral.rewardAmount,
          'Seed reward',
          referral.txHash || null,
        ]
      );
    }
  }
}

async function ensureDeveloperApps(userMap) {
  for (const app of SAMPLE_DEVELOPER_APPS) {
    const owner = userMap.get(app.ownerEmail);
    if (!owner) continue;

    const [existing] = await pool.query(
      `
        select appId
        from DeveloperApp
        where ownerId = ? and name = ?
        limit 1
      `,
      [owner.userId, app.name]
    );

    let appId;
    if (existing.length > 0) {
      appId = existing[0].appId;
      await pool.query(
        `
          update DeveloperApp
          set origins = ?, quotaPerDay = ?, status = ?, apiKey = ?
          where appId = ?
        `,
        [JSON.stringify(app.origins || []), app.quota || 1000, app.status || 'PENDING', app.apiKey || null, appId]
      );
    } else {
      const [result] = await pool.query(
        `
          insert into DeveloperApp (ownerId, name, origins, quotaPerDay, apiKey, apiSecret, status)
          values (?, ?, ?, ?, ?, ?, ?)
        `,
        [
          owner.userId,
          app.name,
          JSON.stringify(app.origins || []),
          app.quota || 1000,
          app.apiKey || crypto.randomBytes(16).toString('hex'),
          crypto.randomBytes(24).toString('hex'),
          app.status || 'PENDING',
        ]
      );
      appId = result.insertId;
    }

    const metrics = SAMPLE_DEVELOPER_METRICS.filter((metric) => metric.appName === app.name);
    for (const metric of metrics) {
      await pool.query(
        `
          insert into DeveloperMetric (appId, day, escrowTransactions, walletRpcCalls, smartContractEvents)
          values (?, ?, ?, ?, ?)
          on duplicate key update
            escrowTransactions = values(escrowTransactions),
            walletRpcCalls = values(walletRpcCalls),
            smartContractEvents = values(smartContractEvents)
        `,
        [appId, metric.day, metric.escrowTransactions, metric.walletRpcCalls, metric.smartContractEvents]
      );
    }
  }
}

async function runSeed() {
  console.log('⏳ Running database seed for P-Market...');
  await ensureCategories();
  const warehouses = await ensureWarehouses();
  const users = await ensureUsers();
  const products = await ensureProductCatalog(users, warehouses);
  await ensureOrders(users, products);
  await ensureReferrals(users);
  await ensureDeveloperApps(users);
  console.log('✅ Seed data inserted successfully.');
}

runSeed()
  .then(() => pool.end())
  .catch((error) => {
    console.error('❌ Seed failed:', error);
    pool.end().finally(() => process.exit(1));
  });
