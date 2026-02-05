import crypto from 'crypto';
import pool from '../../configs/mysql.js';
import ApiError from '../../utils/classes/api-error.js';

const greenLedgerStore = new Map();

const HSCOIN_BASE_URL = (process.env.HSCOIN_API_BASE_URL || 'https://hsc-w3oq.onrender.com/api').replace(/\/$/, '');
const HSCOIN_API_KEY = process.env.HSCOIN_API_KEY;
const HSCOIN_ADMIN_EMAIL = process.env.HSCOIN_ADMIN_EMAIL;
const HSCOIN_ADMIN_PASSWORD = process.env.HSCOIN_ADMIN_PASSWORD;

const HSCOIN_CONTRACT_ADDRESS = '0x0137ac70725cfa67af4f5180c41e0c60f36e9118';
const HSCOIN_NETWORK = 'HScoin Devnet';
const ESCROW_STATUS_MAP = {
  Pending: 'LOCKED',
  SellerConfirmed: 'LOCKED',
  BuyerConfirmed: 'LOCKED',
  Completed: 'RELEASED',
  Cancelled: 'REFUNDED',
};

const SIMPLE_TOKEN_ADDRESS = (process.env.HSCOIN_SIMPLE_TOKEN_ADDRESS || '').trim().toLowerCase();
const HSCOIN_CONTRACT_ENDPOINT =
  (process.env.HSCOIN_CONTRACT_ENDPOINT || '/contracts').trim() || '/contracts';
const HSCOIN_MAX_RETRY = Math.max(1, Number(process.env.HSCOIN_MAX_RETRY || 5) || 5);
const HSCOIN_RETRY_DELAY_MS = Math.max(5_000, Number(process.env.HSCOIN_RETRY_DELAY_MS || 60_000) || 60_000);
const HSCOIN_WORKER_INTERVAL_MS = Math.max(5_000, Number(process.env.HSCOIN_WORKER_INTERVAL_MS || 60_000) || 60_000);
const HSCOIN_ALLOWED_CALLERS = (process.env.HSCOIN_ALLOWED_CALLERS || '')
  .split(',')
  .map((addr) => addr.trim().toLowerCase())
  .filter(Boolean);

const DEFAULT_ESCROW_SOURCE = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract PMarketT {
    // ==================== TOKEN CƠ BẢN ====================
    string public name = "SimpleToken";
    string public symbol = "STK";
    uint8 public decimals = 18;
    uint256 public totalSupply;
    mapping(address => uint256) public balanceOf;
    address public owner;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Mint(address indexed to, uint256 value);
    event Burn(address indexed from, uint256 value);

    // ==================== ESCROW ====================
    enum Status {
        None,
        Deposited,
        Refunded,
        Released
    }

    struct Order {
        address buyer;
        address seller;
        uint256 amount;
        Status status;
        uint256 createdAt;
    }

    mapping(uint256 => Order) public orders;

    event Deposited(
        uint256 indexed orderId,
        address indexed buyer,
        address indexed seller,
        uint256 amount
    );
    event Refunded(
        uint256 indexed orderId,
        address indexed buyer,
        uint256 amount
    );
    event Released(
        uint256 indexed orderId,
        address indexed seller,
        uint256 amount
    );

    constructor() {
        owner = msg.sender;
        totalSupply = 1000000 * 10 ** uint256(decimals);
        balanceOf[msg.sender] = totalSupply;
        emit Transfer(address(0), msg.sender, totalSupply);
    }

    // ==================== TOKEN FUNC ====================

    // Chuyển token
    function transfer(address _to, uint256 _value) public returns (bool success) {
        require(_to != address(0), "Invalid address");
        require(balanceOf[msg.sender] >= _value, "Insufficient balance");
        balanceOf[msg.sender] -= _value;
        balanceOf[_to] += _value;
        emit Transfer(msg.sender, _to, _value);
        return true;
    }

    // Modifier onlyOwner cho gon mint/burn admin
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    // Cộng token (mint) - chỉ owner có thể gọi
    function mint(address _to, uint256 _value)
        public
        onlyOwner
        returns (bool success)
    {
        require(_to != address(0), "Invalid address");
        totalSupply += _value;
        balanceOf[_to] += _value;
        emit Mint(_to, _value);
        emit Transfer(address(0), _to, _value);
        return true;
    }

    // Trừ token (burn) - người gọi tự đốt token của mình
    function burn(uint256 _value) public returns (bool success) {
        require(balanceOf[msg.sender] >= _value, "Insufficient balance");
        balanceOf[msg.sender] -= _value;
        totalSupply -= _value;
        emit Burn(msg.sender, _value);
        emit Transfer(msg.sender, address(0), _value);
        return true;
    }

    // Lấy số dư
    function getBalance(address _owner) public view returns (uint256) {
        return balanceOf[_owner];
    }

    // Lấy tổng cung
    function getTotalSupply() public view returns (uint256) {
        return totalSupply;
    }

    // ==================== ESCROW FUNC ====================

    // Buyer deposit token vào escrow cho 1 order
    function deposit(
        uint256 orderId,
        address seller,
        uint256 amount
    ) external {
        require(orders[orderId].status == Status.None, "Order exists");
        require(seller != address(0) && seller != msg.sender, "Bad seller");
        require(amount > 0, "Amount=0");
        require(balanceOf[msg.sender] >= amount, "Insufficient balance");

        // Trừ token cua buyer, cộng vào contract
        balanceOf[msg.sender] -= amount;
        balanceOf[address(this)] += amount;

        orders[orderId] = Order({
            buyer: msg.sender,
            seller: seller,
            amount: amount,
            status: Status.Deposited,
            createdAt: block.timestamp
        });

        emit Transfer(msg.sender, address(this), amount);
        emit Deposited(orderId, msg.sender, seller, amount);
    }

    // Buyer yêu cầu refund (tự nhận lại tiền)
    function refund(uint256 orderId) external {
        Order storage o = orders[orderId];
        require(o.status == Status.Deposited, "Not deposited");
        require(msg.sender == o.buyer, "Not buyer");

        o.status = Status.Refunded;
        balanceOf[address(this)] -= o.amount;
        balanceOf[o.buyer] += o.amount;

        emit Transfer(address(this), o.buyer, o.amount);
        emit Refunded(orderId, o.buyer, o.amount);
    }

    // Seller nhận tiền (release)
    function release(uint256 orderId) external {
        Order storage o = orders[orderId];
        require(o.status == Status.Deposited, "Not deposited");
        require(msg.sender == o.seller, "Not seller");

        o.status = Status.Released;
        balanceOf[address(this)] -= o.amount;
        balanceOf[o.seller] += o.amount;

        emit Transfer(address(this), o.seller, o.amount);
        emit Released(orderId, o.seller, o.amount);
    }
}`;
function resolveHscoinContractEndpoint(address) {
  const normalizedAddress = normalizeAddress(address || '');
  if (!normalizedAddress) {
    throw ApiError.badRequest('Thiếu contract address');
  }

  const configured = HSCOIN_CONTRACT_ENDPOINT;
  if (configured.includes('{address}')) {
    return configured.replace('{address}', normalizedAddress);
  }
  if (configured.includes('{contractAddress}')) {
    return configured.replace('{contractAddress}', normalizedAddress);
  }
  const base = configured.replace(/\/$/, '');
  return `${base}/${normalizedAddress}/execute`;
}

let hscoinTokenCache = { token: null, expiresAt: 0 };
let chainCache = { blocks: [], fetchedAt: 0 };
let hasHscoinCallTable = false;
let hscoinWorkerTimer = null;
let hasHscoinAlertTable = false;
let hasUserContractTable = false;
let hasTokenLedgerTable = false;

const SIMPLE_TOKEN_FUNCTIONS = {
  // Token functions
  burn: {
    selector: '0x42966c68', // burn(uint256)
    inputs: ['uint256'],
  },
  balanceOf: {
    selector: '0x70a08231', // balanceOf(address)
    inputs: ['address'],
  },
  mint: {
    selector: '0x40c10f19', // mint(address,uint256)
    inputs: ['address', 'uint256'],
  },
  transfer: {
    selector: '0xa9059cbb', // transfer(address,uint256)
    inputs: ['address', 'uint256'],
  },
  // Escrow functions (PMarket)
  deposit: {
    selector: '0x8340f549', // deposit(uint256,address,uint256)
    inputs: ['uint256', 'address', 'uint256'],
  },
  release: {
    selector: '0x37bdc99b', // release(uint256)
    inputs: ['uint256'],
  },
  refund: {
    selector: '0x7c41ad2c', // refund(uint256)
    inputs: ['uint256'],
  },
};

const SIMPLE_TOKEN_LEDGER_ACTIONS = {
  mint: 'MINT',
  burn: 'BURN',
  transfer: 'TRANSFER',
  deposit: 'ESCROW_DEPOSIT',
  release: 'ESCROW_RELEASE',
  refund: 'ESCROW_REFUND',
};

function normalizeAddress(address) {
  const trimmed = String(address || '').trim().toLowerCase();
  if (!trimmed) return '';
  // Tự động thêm prefix 0x nếu thiếu và là chuỗi 40 ký tự hex hợp lệ
  if (/^[0-9a-f]{40}$/.test(trimmed)) {
    return `0x${trimmed}`;
  }
  return trimmed;
}

// Encode function call to calldata hex (giống evm.js)
function encodeFunctionCall(functionName, params = []) {
  // Function selectors (4 bytes đầu của keccak256 hash)
  const SELECTORS = {
    getBalance: '0xf8b2cb4f', // getBalance(address)
    deposit: '0x8340f549', // deposit(uint256,address,uint256)
    release: '0x37bdc99b', // release(uint256)
    refund: '0x7c41ad2c', // refund(uint256)
    transfer: '0xa9059cbb', // transfer(address,uint256)
    mint: '0x40c10f19', // mint(address,uint256)
    balanceOf: '0x70a08231', // balanceOf(address)
    mintSelf: '0x40c10f19', // mintSelf(uint256) - có thể dùng mint
  };

  const selector = SELECTORS[functionName];
  if (!selector) {
    throw ApiError.badRequest(`Function ${functionName} không được hỗ trợ encode calldata`);
  }

  // Encode parameters
  let encodedParams = '';
  for (const param of params) {
    if (typeof param === 'string' && param.startsWith('0x')) {
      // Address: remove 0x, pad to 64 hex chars (32 bytes)
      const addr = param.substring(2).toLowerCase();
      encodedParams += addr.padStart(64, '0');
    } else if (typeof param === 'number' || typeof param === 'bigint') {
      // Uint256: convert to hex, pad to 64 hex chars
      const num = BigInt(param);
      encodedParams += num.toString(16).padStart(64, '0');
    } else if (typeof param === 'string') {
      // Assume it's a hex string without 0x, or try to parse as number
      const normalized = normalizeAddress(param);
      if (/^0x[0-9a-f]{40}$/.test(normalized)) {
        encodedParams += normalized.substring(2).padStart(64, '0');
      } else {
        // Try as number
        try {
          const num = BigInt(param);
          encodedParams += num.toString(16).padStart(64, '0');
        } catch {
          throw ApiError.badRequest(`Không thể encode tham số: ${param}`);
        }
      }
    } else {
      // Convert to string and try to parse
      try {
        const num = BigInt(String(param));
        encodedParams += num.toString(16).padStart(64, '0');
      } catch {
        throw ApiError.badRequest(`Không thể encode tham số: ${param}`);
      }
    }
  }

  return selector + encodedParams;
}

function validateAddress(address, fieldName = 'Địa chỉ ví') {
  const normalized = normalizeAddress(address);
  if (!/^0x[0-9a-f]{40}$/.test(normalized)) {
    throw ApiError.badRequest(`${fieldName} không hợp lệ. Địa chỉ phải bắt đầu bằng 0x và có 40 ký tự hex.`);
  }
  return normalized;
}

function encodeUint256(value) {
  try {
    const normalized = BigInt(value);
    if (normalized < 0n) {
      throw new Error('Giá trị uint256 phải không âm');
    }
    return normalized.toString(16).padStart(64, '0');
  } catch (error) {
    throw ApiError.badRequest('Tham số kiểu uint256 không hợp lệ');
  }
}

function encodeAddressParam(value) {
  const normalized = normalizeAddress(value);
  if (!/^0x[0-9a-f]{40}$/.test(normalized)) {
    throw ApiError.badRequest(`Địa chỉ ví không hợp lệ: "${value}". Địa chỉ phải bắt đầu bằng 0x và có 40 ký tự hex.`);
  }
  return normalized.replace(/^0x/, '').padStart(64, '0');
}

function encodeBoolParam(value) {
  return (value ? '1' : '0').padStart(64, '0');
}

function encodeParameterByType(type, value) {
  const normalizedType = String(type || '').toLowerCase();
  if (normalizedType.startsWith('uint') || normalizedType.startsWith('int')) {
    return encodeUint256(value);
  }
  if (normalizedType === 'address') {
    return encodeAddressParam(value);
  }
  if (normalizedType === 'bool') {
    return encodeBoolParam(Boolean(value));
  }
  throw ApiError.badRequest(`Không hỗ trợ encode tham số kiểu ${type}`);
}

function buildSimpleTokenCalldata(method, args = []) {
  const fn = SIMPLE_TOKEN_FUNCTIONS[method?.toLowerCase()];
  if (!fn) {
    throw ApiError.badRequest(`Hàm ${method} chưa được hỗ trợ trên SimpleToken`);
  }
  if (args.length !== fn.inputs.length) {
    throw ApiError.badRequest(
      `Sai số lượng tham số cho hàm ${method}. Mong đợi ${fn.inputs.length}, nhận ${args.length}`
    );
  }
  const encodedArgs = fn.inputs.map((type, idx) => encodeParameterByType(type, args[idx] ?? 0));
  return fn.selector + encodedArgs.join('');
}

function normalizeLedgerAddress(address) {
  const normalized = normalizeAddress(address);
  return /^0x[0-9a-f]{40}$/.test(normalized) ? normalized : null;
}

function normalizeOrderId(orderId) {
  const raw = String(orderId ?? '').trim();
  if (!raw || !/^\d+$/.test(raw)) return null;
  const numeric = Number(raw);
  if (!Number.isFinite(numeric)) return null;
  // Giới hạn về INT để tránh lỗi "out of range" khi dữ liệu hex bị parse thành số rất lớn
  const MAX_INT = 2147483647;
  if (numeric <= 0 || numeric > MAX_INT) return null;
  return numeric;
}

function toBigIntSafe(value) {
  if (value === null || value === undefined) return null;
  try {
    if (typeof value === 'bigint') return value;
    if (typeof value === 'number') {
      if (!Number.isFinite(value)) return null;
      return BigInt(Math.trunc(value));
    }
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (!trimmed) return null;
      return BigInt(trimmed);
    }
    return BigInt(value);
  } catch {
    return null;
  }
}

async function ensureTokenLedgerTable() {
  if (hasTokenLedgerTable) return;
  await pool.query(
    `
    create table if not exists TokenBalanceLedger (
      ledgerId int primary key auto_increment,
      callId int not null,
      contractAddress varchar(66) not null,
      action varchar(32) not null,
      fromAddress varchar(66) null,
      toAddress varchar(66) null,
      amount decimal(65,0) not null default 0,
      orderId int null,
      rawArgs longtext null,
      createdAt timestamp default current_timestamp,
      unique key uniq_call (callId),
      index idx_contract_wallet (contractAddress, toAddress, fromAddress),
      index idx_order (orderId)
    ) engine=InnoDB
    `
  );
  hasTokenLedgerTable = true;
}

async function recordTokenLedgerEntry({
  callId,
  contractAddress,
  action,
  fromAddress,
  toAddress,
  amount,
  orderId,
  rawArgs,
}) {
  if (!callId || !contractAddress || !action) return;
  const normalizedContract = normalizeLedgerAddress(contractAddress);
  const normalizedFrom = fromAddress ? normalizeLedgerAddress(fromAddress) : null;
  const normalizedTo = toAddress ? normalizeLedgerAddress(toAddress) : null;
  const normalizedAmount = toBigIntSafe(amount);
  if (!normalizedContract || normalizedAmount === null || normalizedAmount < 0n) return;

  await ensureTokenLedgerTable();
  await pool.query(
    `
    insert into TokenBalanceLedger (callId, contractAddress, action, fromAddress, toAddress, amount, orderId, rawArgs)
    values (?, ?, ?, ?, ?, ?, ?, ?)
    on duplicate key update
      action = values(action),
      fromAddress = values(fromAddress),
      toAddress = values(toAddress),
      amount = values(amount),
      orderId = values(orderId),
      rawArgs = values(rawArgs)
    `,
    [
      callId,
      normalizedContract,
      action,
      normalizedFrom,
      normalizedTo,
      normalizedAmount.toString(),
      normalizeOrderId(orderId),
      rawArgs || null,
    ]
  );
}

async function getEscrowAggregates(orderId) {
  const normalizedOrderId = normalizeOrderId(orderId);
  if (!normalizedOrderId) {
    return { deposited: 0n, released: 0n, refunded: 0n };
  }
  await ensureTokenLedgerTable();
  const [[row]] = await pool.query(
    `
    select
      coalesce(sum(case when action = 'ESCROW_DEPOSIT' then amount else 0 end), 0) as deposited,
      coalesce(sum(case when action = 'ESCROW_RELEASE' then amount else 0 end), 0) as released,
      coalesce(sum(case when action = 'ESCROW_REFUND' then amount else 0 end), 0) as refunded
    from TokenBalanceLedger
    where orderId = ?
    `,
    [normalizedOrderId]
  );
  return {
    deposited: toBigIntSafe(row?.deposited || 0) || 0n,
    released: toBigIntSafe(row?.released || 0) || 0n,
    refunded: toBigIntSafe(row?.refunded || 0) || 0n,
  };
}

async function getLedgerTokenBalance({ contractAddress, walletAddress }) {
  const normalizedContract = normalizeLedgerAddress(contractAddress);
  const normalizedWallet = normalizeLedgerAddress(walletAddress);
  if (!normalizedContract || !normalizedWallet) {
    throw ApiError.badRequest('�?a ch? kh�ng h?p l? �? t�nh s? d� token.');
  }
  await ensureTokenLedgerTable();
  const [[row]] = await pool.query(
    `
    select
      coalesce(sum(case when toAddress = ? then amount else 0 end), 0) as incoming,
      coalesce(sum(case when fromAddress = ? then amount else 0 end), 0) as outgoing
    from TokenBalanceLedger
    where contractAddress = ?
    `,
    [normalizedWallet, normalizedWallet, normalizedContract]
  );
  const incoming = toBigIntSafe(row?.incoming || 0) || 0n;
  const outgoing = toBigIntSafe(row?.outgoing || 0) || 0n;
  const net = incoming - outgoing;
  return net < 0n ? '0' : net.toString();
}

async function getLedgerTokenBalanceAllContracts(walletAddress) {
  const normalizedWallet = normalizeLedgerAddress(walletAddress);
  if (!normalizedWallet) {
    throw ApiError.badRequest('�?a ch? kh�ng h?p l? �? t�nh s? d� token.');
  }
  await ensureTokenLedgerTable();
  const [[row]] = await pool.query(
    `
    select
      coalesce(sum(case when toAddress = ? then amount else 0 end), 0) as incoming,
      coalesce(sum(case when fromAddress = ? then amount else 0 end), 0) as outgoing
    from TokenBalanceLedger
    `,
    [normalizedWallet, normalizedWallet]
  );
  const incoming = toBigIntSafe(row?.incoming || 0) || 0n;
  const outgoing = toBigIntSafe(row?.outgoing || 0) || 0n;
  const net = incoming - outgoing;
  return net < 0n ? '0' : net.toString();
}

async function recordTokenLedgerFromCall({ callId, payload, orderId }) {
  if (!callId || !payload) return;
  const originalCall = payload.originalCall || {};
  const rawArgsArray = Array.isArray(originalCall.args) ? originalCall.args : [];
  const method = (originalCall.method || payload.method || '').toLowerCase();
  const contractAddress =
    payload.contractAddress || payload.body?.contractAddress || payload.body?.contract;
  const caller = payload.body?.caller || payload.caller || payload.callerAddress;
  const normalizedCaller = normalizeLedgerAddress(caller);
  const safeArgs = rawArgsArray.map((arg) => (typeof arg === 'bigint' ? arg.toString() : arg));
  const resolvedOrderId = normalizeOrderId(orderId ?? payload.orderId ?? rawArgsArray[0]);
  const normalizedContract = normalizeLedgerAddress(contractAddress);
  if (!method || !normalizedContract) return;

  const toAmount = (idx) => toBigIntSafe(rawArgsArray[idx]);
  let entry = null;

  switch (method) {
    case 'mint': {
      const to = normalizeLedgerAddress(rawArgsArray[0]);
      const amount = toAmount(1);
      if (to && amount !== null) {
        entry = { action: SIMPLE_TOKEN_LEDGER_ACTIONS.mint, toAddress: to, amount };
      }
      break;
    }
    case 'burn': {
      const amount = toAmount(0);
      if (normalizedCaller && amount !== null) {
        entry = { action: SIMPLE_TOKEN_LEDGER_ACTIONS.burn, fromAddress: normalizedCaller, amount };
      }
      break;
    }
    case 'transfer': {
      const to = normalizeLedgerAddress(rawArgsArray[0]);
      const amount = toAmount(1);
      if (normalizedCaller && to && amount !== null) {
        entry = {
          action: SIMPLE_TOKEN_LEDGER_ACTIONS.transfer,
          fromAddress: normalizedCaller,
          toAddress: to,
          amount,
        };
      }
      break;
    }
    case 'deposit': {
      const amount = toAmount(2);
      if (normalizedCaller && amount !== null) {
        entry = {
          action: SIMPLE_TOKEN_LEDGER_ACTIONS.deposit,
          fromAddress: normalizedCaller,
          amount,
          orderId: resolvedOrderId,
        };
      }
      break;
    }
    case 'release': {
      const targetOrderId = resolvedOrderId;
      if (normalizedCaller && targetOrderId !== null) {
        const { deposited, released, refunded } = await getEscrowAggregates(targetOrderId);
        const remaining = deposited - released - refunded;
        if (remaining > 0n) {
          entry = {
            action: SIMPLE_TOKEN_LEDGER_ACTIONS.release,
            toAddress: normalizedCaller,
            amount: remaining,
            orderId: targetOrderId,
          };
        }
      }
      break;
    }
    case 'refund': {
      const targetOrderId = resolvedOrderId;
      if (normalizedCaller && targetOrderId !== null) {
        const { deposited, released, refunded } = await getEscrowAggregates(targetOrderId);
        const remaining = deposited - released - refunded;
        if (remaining > 0n) {
          entry = {
            action: SIMPLE_TOKEN_LEDGER_ACTIONS.refund,
            toAddress: normalizedCaller,
            amount: remaining,
            orderId: targetOrderId,
          };
        }
      }
      break;
    }
    default:
      break;
  }

  if (entry) {
    await recordTokenLedgerEntry({
      ...entry,
      callId,
      contractAddress: normalizedContract,
      orderId: entry.orderId ?? resolvedOrderId,
      rawArgs: JSON.stringify(safeArgs),
    });
  }
}

function defaultLedger() {
  return {
    score: 65,
    tier: 'Seedling',
    perks: [
      'Giảm 2% phí escrow khi hoàn tất 3 đơn xanh',
      'Ưu tiên trong danh mục Sản phẩm bền vững',
    ],
    audits: [
      {
        id: 1,
        title: 'Đối soát chuỗi cung ứng',
        detail: 'Đã đính kèm giấy tờ chuỗi cung ứng.',
        status: 'Approved',
      },
      {
        id: 2,
        title: 'Vận chuyển xanh',
        detail: 'Đơn vị vận chuyển phát thải thấp đang xử lý lô hàng.',
        status: 'In-progress',
      },
      {
        id: 3,
        title: 'Chứng nhận on-chain',
        detail: 'Chuẩn bị ký dữ liệu green credit lên HScoin.',
        status: 'Pending',
      },
    ],
    lastSyncedAt: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(),
    nextWindow: new Date(Date.now() + 1000 * 60 * 60 * 24 * 2).toISOString(),
  };
}

async function buildContributionsFromOrders(userId) {
  if (!userId) return [];
  const [rows] = await pool.query(
    `
    select *
    from (
      select distinct
        so.salesOrderId,
        so.totalAmount,
        so.orderDate,
        so.status,
        'BUYER' as role
      from SalesOrder so
      where so.customerId = ?
      union all
      select distinct
        so.salesOrderId,
        so.totalAmount,
        so.orderDate,
        so.status,
        'SELLER' as role
      from SalesOrder so
      join OrderDetail od on od.salesOrderId = so.salesOrderId
      join Product p on p.productId = od.productId
      where p.supplierId = ?
    ) combined
    order by combined.orderDate desc
    limit 5
    `,
    [userId, userId]
  );

  if (rows.length === 0) {
    return [];
  }

  return rows.map((row) => {
    const normalizedAmount = Number(row.totalAmount) || 0;
    const role = row.role === 'SELLER' ? 'SELLER' : 'BUYER';
    const divisor = role === 'SELLER' ? 350000 : 250000;
    const baseCarbon = normalizedAmount > 0 ? normalizedAmount / divisor : 0.5;
    const carbon = -Number(baseCarbon.toFixed(2));
    const orderDate =
      row.orderDate instanceof Date ? row.orderDate.toISOString() : row.orderDate;

    return {
      id: `${role === 'SELLER' ? 'SLR' : 'ORD'}-${row.salesOrderId}`,
      orderId: row.salesOrderId,
      type:
        role === 'SELLER'
          ? row.status === 'Completed'
            ? 'Shop giao thành công'
            : 'Shop đang xử lý'
          : row.status === 'Completed'
          ? 'Đơn escrow hoàn tất'
          : 'Đơn escrow đang khóa',
      status: row.status,
      role,
      carbon,
      tokens: Math.max(1, Math.round(normalizedAmount / 100000)),
      amount: normalizedAmount,
      orderDate,
    };
  });
}

function ensureLedger(userId) {
  if (!greenLedgerStore.has(userId)) {
    greenLedgerStore.set(userId, defaultLedger());
  }
  return greenLedgerStore.get(userId);
}

function parseOrigins(rawOrigins) {
  if (!rawOrigins) return [];
  if (Array.isArray(rawOrigins)) return rawOrigins;
  try {
    const parsed = JSON.parse(rawOrigins);
    if (Array.isArray(parsed)) return parsed;
  } catch {
    // ignore parse error
  }
  return String(rawOrigins)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function serializeOrigins(origins = []) {
  return JSON.stringify(origins);
}

function mapDeveloperApp(row) {
  return {
    id: row.appId,
    name: row.name,
    quota: row.quotaPerDay,
    origins: parseOrigins(row.origins),
    status: row.status,
    createdAt: row.createdAt,
    lastUsedAt: row.lastUsedAt,
    apiKey: row.apiKey,
  };
}

function generateApiKey() {
  return crypto.randomBytes(16).toString('hex').toUpperCase();
}

function generateApiSecret() {
  return crypto.randomBytes(24).toString('hex').toUpperCase();
}

function resolveTier(score) {
  if (score >= 90) return 'Green Legend';
  if (score >= 75) return 'Green Pioneer';
  if (score >= 60) return 'Seedling';
  return 'Newcomer';
}

const GREEN_PERK_LEVELS = [
  {
    min: 500,
    perks: [
      'Giảm 5% phí escrow khi tạo hợp đồng xanh',
      'Whitelist ưu tiên cho các chương trình HScoin',
    ],
  },
  {
    min: 250,
    perks: [
      'Giảm 3% phí escrow cho các đơn mua bền vững',
      'Được đề xuất trong danh mục Người bán Xanh',
    ],
  },
  {
    min: 100,
    perks: [
      'Giảm 1% phí escrow',
      'Ưu tiên xét duyệt sản phẩm có chứng nhận tái chế',
    ],
  },
];

function resolveGreenPerks(score, fallback = []) {
  for (const tier of GREEN_PERK_LEVELS) {
    if (score >= tier.min) {
      return tier.perks;
    }
  }
  return fallback;
}

function buildAuditTimeline(contributions = [], fallbackAudits = []) {
  if (!contributions.length) {
    return fallbackAudits;
  }
  const completed = contributions.filter((item) => item.status === 'Completed').length;
  const inProgress = contributions.length - completed;
  return [
    {
      id: 'audit-completed',
      title: 'Đơn escrow đã hoàn tất',
      detail: `${completed} đơn đã xác nhận kết quả và burn phí HScoin.`,
      status: completed > 0 ? 'Approved' : 'Pending',
    },
    {
      id: 'audit-progress',
      title: 'Đơn đang theo dõi',
      detail: `${inProgress} đơn đang khóa escrow hoặc chuẩn bị giao.`,
      status: inProgress > 0 ? 'In-progress' : 'Approved',
    },
    {
      id: 'audit-sync',
      title: 'Đồng bộ HScoin',
      detail: 'Đợi kỳ đồng bộ kế tiếp để ghi nhận green credit on-chain.',
      status: 'Pending',
    },
  ];
}

function sortContributions(contributions = []) {
  return [...contributions].sort((a, b) => {
    const aTime = a?.orderDate ? new Date(a.orderDate).getTime() : 0;
    const bTime = b?.orderDate ? new Date(b.orderDate).getTime() : 0;
    return bTime - aTime;
  });
}

async function fetchUserProfile(userId) {
  if (!userId) return null;
  const [rows] = await pool.query(
    `
    select userId, userName, email, greenCredit
    from User
    where userId = ?
    limit 1
    `,
    [userId]
  );
  return rows[0] || null;
}

async function loginToHscoin() {
  if (!HSCOIN_ADMIN_EMAIL || !HSCOIN_ADMIN_PASSWORD) {
    return null;
  }

  const response = await fetch(`${HSCOIN_BASE_URL}/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(HSCOIN_API_KEY ? { 'X-API-KEY': HSCOIN_API_KEY } : {}),
    },
    body: JSON.stringify({
      email: HSCOIN_ADMIN_EMAIL,
      password: HSCOIN_ADMIN_PASSWORD,
    }),
  });

  const data = await response.json().catch(() => ({}));
  if (response.ok && data?.success && data?.token) {
    hscoinTokenCache = {
      token: data.token,
      expiresAt: Date.now() + 15 * 60 * 1000,
    };
    return data.token;
  }
  throw new Error(data?.message || 'Không thể đăng nhập HScoin');
}

async function getHscoinToken() {
  if (hscoinTokenCache.token && hscoinTokenCache.expiresAt > Date.now()) {
    return hscoinTokenCache.token;
  }
  return loginToHscoin().catch((error) => {
    console.warn('[HScoin] Đăng nhập thất bại:', error.message);
    return null;
  });
}

async function callHscoin(path, { method = 'GET', body, headers = {}, requireAuth = false } = {}) {
  const url = path.startsWith('http') ? path : `${HSCOIN_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
  const finalHeaders = {
    Accept: 'application/json',
    ...headers,
  };

  if (body !== undefined) {
    finalHeaders['Content-Type'] = finalHeaders['Content-Type'] || 'application/json';
  }
  if (HSCOIN_API_KEY) {
    finalHeaders['X-API-KEY'] = HSCOIN_API_KEY;
  }

  if (requireAuth) {
    const token = await getHscoinToken();
    if (!token) {
      throw new Error('Thiếu thông tin đăng nhập HScoin');
    }
    finalHeaders.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    method,
    headers: finalHeaders,
    body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body),
  });

  const text = await response.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }
  }

  if (!response.ok || data?.success === false) {
    const message = data?.message || `HScoin API ${response.status}`;
    console.error('[HScoin] API error', {
      url,
      method,
      status: response.status,
      response: data,
      raw: text,
    });
    const error = new Error(message);
    error.response = data;
    error.status = response.status;
    throw error;
  }

  return data;
}

async function fetchDonationFeed() {
  try {
    const [stats, donations] = await Promise.all([
      callHscoin('/donation_stats'),
      callHscoin('/all_donations'),
    ]);
    return {
      stats: stats?.stats || {},
      donations: donations?.donations || [],
    };
  } catch (error) {
    console.warn('[HScoin] Không thể tải donation feed:', error.message);
    return null;
  }
}

function mapDonationsToContributions(donations = [], profile) {
  const normalizedEmail = profile?.email?.toLowerCase();
  const filtered = normalizedEmail
    ? donations.filter((item) => item.user_email?.toLowerCase() === normalizedEmail)
    : donations;

  return filtered.slice(0, 5).map((item, idx) => ({
    id: item.transaction_id || `HSC-${idx + 1}`,
    type: item.cause || 'Giao dịch HScoin',
    carbon: item.amount >= 0 ? -Math.min(2, item.amount / 10) : Math.abs(item.amount) / 50,
    tokens: Math.max(1, Math.round(Math.abs(item.amount || 1))),
    orderDate: item.date,
    amount: item.amount,
    userEmail: item.user_email,
    txHash: item.transaction_id,
  }));
}

async function fetchHscoinApps() {
  try {
    const response = await callHscoin('/apps/list', { requireAuth: true });
    const apps = response?.apps || [];
    return apps.map((app) => ({
      id: app.app_id || app.id || app.name,
      name: app.name,
      quota: app.quota || app.quotaPerDay || 1000,
      origins: Array.isArray(app.allowed_origins)
        ? app.allowed_origins
        : parseOrigins(app.allowed_origins),
      status: app.status || 'PENDING',
      createdAt: app.created_at || null,
      apiKey: app.api_key || null,
    }));
  } catch (error) {
    console.warn('[HScoin] Không thể lấy danh sách app:', error.message);
    return null;
  }
}

async function createHscoinDeveloperApp(payload) {
  try {
    const body = {
      name: payload.name,
      allowed_origins: Array.isArray(payload.origins) ? payload.origins.join(', ') : payload.origins,
      quota: payload.quota || 1000,
    };
    const response = await callHscoin('/apps/create', {
      method: 'POST',
      body,
      requireAuth: true,
    });
    if (response?.app) {
      const app = response.app;
      return {
        id: app.app_id || app.id || app.name,
        name: app.name,
        quota: app.quota || body.quota,
        origins: Array.isArray(app.allowed_origins)
          ? app.allowed_origins
          : parseOrigins(app.allowed_origins),
        status: app.status || 'APPROVED',
        createdAt: app.created_at || new Date().toISOString(),
        apiKey: app.api_key,
      };
    }
    return null;
  } catch (error) {
    console.warn('[HScoin] Không thể tạo app mới:', error.message);
    return null;
  }
}

async function fetchChainBlocks() {
  if (chainCache.blocks.length && Date.now() - chainCache.fetchedAt < 30 * 1000) {
    return chainCache.blocks;
  }

  try {
    const response = await callHscoin('/blockchain/chain');
    chainCache = {
      blocks: response?.data || [],
      fetchedAt: Date.now(),
    };
    return chainCache.blocks;
  } catch (error) {
    console.warn('[HScoin] Không thể tải blockchain chain:', error.message);
    return [];
  }
}

async function fetchBlockchainInfo() {
  try {
    return await callHscoin('/blockchain/info');
  } catch (error) {
    console.warn('[HScoin] Không thể tải thông tin mạng:', error.message);
    return null;
  }
}

async function fetchAccounts() {
  try {
    const response = await callHscoin('/accounts');
    return response?.data || [];
  } catch (error) {
    console.warn('[HScoin] Không thể tải danh sách account:', error.message);
    return [];
  }
}

export async function getAccountByAddress(address) {
  if (!address) return null;
  const accounts = await fetchAccounts();
  const target = String(address).toLowerCase();
  return accounts.find((a) => String(a.address || '').toLowerCase() === target) || null;
}

export async function getTokenBalance({ contractAddress, walletAddress }) {
  if (!walletAddress) {
    throw ApiError.badRequest('Thiếu contractAddress hoặc walletAddress');
  }

  const normalizedWallet = validateAddress(walletAddress);

  // Nếu không truyền contractAddress, trả tổng sổ phụ trên mọi contract
  if (!contractAddress) {
    const balance = await getLedgerTokenBalanceAllContracts(normalizedWallet);
    return { balance, source: 'ledger_all' };
  }

  const normalizedContract = validateAddress(contractAddress, 'Địa chỉ contract');

  const computeLedgerBalance = async () => {
    const balance = await getLedgerTokenBalance({
      contractAddress: normalizedContract,
      walletAddress: normalizedWallet,
    });
    return balance;
  };

  try {
    const ledgerBalance = await computeLedgerBalance();

    // Dùng format inputData (calldata) để gọi getBalance(address)
    const calldata = encodeFunctionCall('getBalance', [normalizedWallet]);
    const response = await callHscoin(`/contracts/${normalizedContract}/execute`, {
      method: 'POST',
      requireAuth: true,
      body: {
        caller: normalizedWallet,
        inputData: calldata.startsWith('0x') ? calldata : `0x${calldata}`,
        value: 0,
      },
    });
    
    // Parse returnData từ response
    // HSCOIN API trả về: { data: { returnData: "0x..." } } hoặc { returnData: "0x..." }
    const returnData = response?.data?.returnData || response?.returnData || response?.data?.data?.returnData;
    let result = null;
    
    if (returnData && returnData !== '0x' && returnData !== '0x0' && returnData !== '0x0000000000000000000000000000000000000000000000000000000000000000') {
      try {
        // Decode uint256 từ returnData (64 hex chars = 32 bytes)
        const hex = returnData.startsWith('0x') ? returnData.substring(2) : returnData;
        // Lấy 64 ký tự cuối (32 bytes cho uint256)
        // Nếu hex ngắn hơn 64, pad với 0 ở đầu
        const balanceHex = hex.length >= 64 ? hex.slice(-64) : hex.padStart(64, '0');
        result = BigInt('0x' + balanceHex).toString();
      } catch (error) {
        console.warn('[HScoin] Lỗi parse returnData:', error.message, 'returnData:', returnData);
        result = null;
      }
    }
    
    if (result !== null && result !== undefined) {
      if (ledgerBalance !== null && ledgerBalance !== undefined && String(ledgerBalance) !== String(result)) {
        return { balance: ledgerBalance, source: 'ledger' };
      }
      return { balance: result, source: 'hscoin' };
    }
  } catch (error) {
    console.warn('[HScoin] getBalance fallback sang sổ phụ:', error.message);
    const balance = await computeLedgerBalance();
    return { balance, source: 'ledger' };
  }

  const balance = await computeLedgerBalance();
  return { balance, source: 'ledger' };
}

async function getDeveloperAppsFromDb(ownerId) {
  if (!ownerId) return [];
  const [rows] = await pool.query(
    `
    select *
    from DeveloperApp
    where ownerId = ?
    order by createdAt desc
    `,
    [ownerId]
  );
  return rows.map(mapDeveloperApp);
}

async function registerDeveloperAppInDb({ ownerId, name, quota, origins }) {
  if (!ownerId) {
    throw new Error('Thiếu thông tin ownerId');
  }

  const apiKey = generateApiKey();
  const apiSecret = generateApiSecret();
  const normalizedQuota = Number(quota) || 1000;
  const [result] = await pool.query(
    `
    insert into DeveloperApp (ownerId, name, origins, quotaPerDay, apiKey, apiSecret, status)
    values (?, ?, ?, ?, ?, ?, 'PENDING')
    `,
    [ownerId, name, serializeOrigins(origins), normalizedQuota, apiKey, apiSecret]
  );

  const [rows] = await pool.query('select * from DeveloperApp where appId = ?', [result.insertId]);
  return rows.length ? mapDeveloperApp(rows[0]) : null;
}

async function getDeveloperMetricsFromDb(ownerId) {
  if (!ownerId) {
    return {
      escrowTransactions: 0,
      walletRpcCalls: 0,
      smartContractEvents: 0,
      lastDeploymentAt: null,
    };
  }

  const [rows] = await pool.query(
    `
    select
      sum(dm.escrowTransactions) as escrowTransactions,
      sum(dm.walletRpcCalls) as walletRpcCalls,
      sum(dm.smartContractEvents) as smartContractEvents,
      max(dm.day) as lastDay,
      max(da.createdAt) as lastCreated
    from DeveloperApp da
    left join DeveloperMetric dm on dm.appId = da.appId
    where da.ownerId = ?
    `,
    [ownerId]
  );

  const row = rows[0] || {};
  return {
    escrowTransactions: Number(row.escrowTransactions) || 0,
    walletRpcCalls: Number(row.walletRpcCalls) || 0,
    smartContractEvents: Number(row.smartContractEvents) || 0,
    lastDeploymentAt: row.lastDay || row.lastCreated || null,
  };
}

async function buildRemoteEscrowSnapshot({ orderId, status, amount }) {
  const fallbackStatus = ESCROW_STATUS_MAP[status] || 'LOCKED';
  const blocks = await fetchChainBlocks();
  if (!blocks.length) return null;

  const index = Math.max(0, Math.min(blocks.length - 1, Number(orderId) || 0));
  const block = blocks[index] || blocks[blocks.length - 1];

  return {
    orderId,
    status: fallbackStatus,
    txHash: block.blockHash || pseudoHash(orderId),
    network: HSCOIN_NETWORK,
    contractAddress: HSCOIN_CONTRACT_ADDRESS,
    blockNumber: block.header?.number ?? 0,
    gasUsed: block.header?.gasUsed ?? (fallbackStatus === 'RELEASED' ? 105000 : 48000),
    timestamp: block.header?.timestamp
      ? new Date(block.header.timestamp * 1000).toISOString()
      : new Date().toISOString(),
    amount: Number(amount) || 0,
  };
}

function pseudoHash(orderId = 0) {
  const normalized = Number(orderId) || 0;
  return `0x${(normalized * 987654321 + 123456)
    .toString(16)
    .padStart(40, '0')
    .slice(-40)}`;
}

function buildFallbackEscrowSnapshot({ orderId, status = 'Pending', amount = 0 }) {
  const canonicalStatus = ESCROW_STATUS_MAP[status] || 'LOCKED';
  const blockNumber = 500 + Number(orderId || 0);
  return {
    orderId,
    status: canonicalStatus,
    txHash: pseudoHash(orderId),
    network: HSCOIN_NETWORK,
    contractAddress: HSCOIN_CONTRACT_ADDRESS,
    blockNumber,
    gasUsed: canonicalStatus === 'RELEASED' ? 105000 : 48000,
    timestamp: new Date(Date.now() - blockNumber * 1000).toISOString(),
    amount: Number(amount) || 0,
  };
}

export async function getGreenCreditSummary(userId) {
  if (!userId) {
    throw ApiError.badRequest('Thiếu thông tin người dùng');
  }
  const ledger = ensureLedger(userId);
  const profile = await fetchUserProfile(userId);
  if (!profile) {
    throw ApiError.notFound('Không tìm thấy người dùng');
  }

  const [orderContributions, donationFeed] = await Promise.all([
    buildContributionsFromOrders(userId),
    fetchDonationFeed(),
  ]);

  const remoteContributions =
    donationFeed?.donations?.length && profile?.email
      ? mapDonationsToContributions(donationFeed.donations, profile)
      : [];

  const contributions = sortContributions([
    ...orderContributions,
    ...remoteContributions,
  ]).slice(0, 5);

  const score = Number(profile.greenCredit) || 0;

  return {
    userId,
    score,
    tier: resolveTier(score),
    perks: resolveGreenPerks(score, ledger.perks),
    audits: buildAuditTimeline(contributions, ledger.audits),
    contributions,
    lastSyncedAt: contributions[0]?.orderDate || ledger.lastSyncedAt,
    nextWindow: ledger.nextWindow,
    hscoinStats: donationFeed?.stats || null,
  };
}

export async function requestGreenCreditSync(userId, reason = '') {
  if (!userId) {
    throw ApiError.badRequest('Thiếu thông tin người dùng');
  }
  const ledger = ensureLedger(userId);
  ledger.lastSyncedAt = new Date().toISOString();
  ledger.nextWindow = new Date(Date.now() + 1000 * 60 * 60 * 48).toISOString();

  const networkInfo = await fetchBlockchainInfo();
  return {
    userId,
    reason,
    scheduledFor: ledger.nextWindow,
    status: 'Queued',
    network: networkInfo?.data || null,
  };
}

export async function getDeveloperApps(ownerId) {
  const remoteApps = await fetchHscoinApps();
  if (remoteApps && remoteApps.length) {
    return remoteApps;
  }
  return getDeveloperAppsFromDb(ownerId);
}

export async function registerDeveloperApp(payload) {
  const remoteApp = await createHscoinDeveloperApp(payload);
  if (remoteApp) {
    return remoteApp;
  }
  return registerDeveloperAppInDb(payload);
}

export async function getDeveloperMetrics(ownerId) {
  try {
    const [info, accounts, blocks] = await Promise.all([
      fetchBlockchainInfo(),
      fetchAccounts(),
      fetchChainBlocks(),
    ]);
    const transactions = blocks.reduce(
      (sum, block) => sum + ((block.transactions || []).length || 0),
      0
    );
    const accountsLen = accounts.length || 0;
    return {
      escrowTransactions: transactions,
      walletRpcCalls: transactions + accountsLen * 2,
      smartContractEvents: blocks.filter((block) => (block.transactions || []).length > 0).length,
      lastDeploymentAt:
        blocks[0]?.header?.timestamp || info?.data?.stateRoot
          ? new Date(
              (blocks[0]?.header?.timestamp || Date.now() / 1000) * 1000
            ).toISOString()
          : null,
    };
  } catch (error) {
    console.warn('[HScoin] Không thể lấy developer metrics, dùng dữ liệu cục bộ:', error.message);
    return getDeveloperMetricsFromDb(ownerId);
  }
}

export async function getEscrowSnapshot({ orderId, status = 'Pending', amount = 0 }) {
  const fallback = buildFallbackEscrowSnapshot({ orderId, status, amount });
  const remote = await buildRemoteEscrowSnapshot({ orderId, status, amount });
  return remote || fallback;
}

export async function executeSimpleToken({
  caller,
  method,
  args = [],
  value = 0,
  contractAddress,
  userId,
  rawInputData,
  useCalldataFormat = false, // Nếu true, tự động encode method+args thành calldata
}) {

  const normalizedCaller = normalizeAddress(caller);
  if (!normalizedCaller) {
    throw ApiError.badRequest('Thiếu địa chỉ ví caller');
  }

  const resolvedContract = await resolveContractAddress({
    userId,
    contractAddress,
    walletAddress: normalizedCaller,
  });

  const normalizedValue =
    typeof value === 'bigint'
      ? value.toString()
      : typeof value === 'string'
      ? value
      : Number(value) || 0;

  // Nếu có rawInputData (calldata hex), dùng endpoint /contracts/{address}/execute
  if (rawInputData && typeof rawInputData === 'string') {
    const requestPayload = {
      caller: normalizedCaller,
      inputData: rawInputData.startsWith('0x') ? rawInputData : `0x${rawInputData}`,
      value: normalizedValue,
    };

    const callId = await recordHscoinContractCall({
      method: 'execute',
      caller: normalizedCaller,
      payload: {
        contractAddress: resolvedContract,
        body: requestPayload,
        originalCall: { inputData: rawInputData },
      },
      orderId: null,
    });

    try {
      const response = await invokeHscoinContract({
        contractAddress: resolvedContract,
        body: requestPayload,
      });
      await markHscoinCallSuccess(callId, response, {
        orderId: null,
        payload: {
          contractAddress: resolvedContract,
          body: requestPayload,
          originalCall: { inputData: rawInputData },
        },
      });
      return {
        callId,
        status: 'SUCCESS',
        result: response?.data || response,
      };
    } catch (error) {
      const retryable = shouldRetryHscoinError(error);
      await markHscoinCallFailure(callId, error, {
        retryable,
        currentRetries: 0,
        maxRetries: HSCOIN_MAX_RETRY,
      });
      if (retryable) {
        const apiError = ApiError.serviceUnavailable(
          `HScoin đang tạm gián đoạn. Yêu cầu execute đã được xếp hàng để thử lại tự động.`
        );
        apiError.hscoinCallId = callId;
        apiError.hscoinStatus = 'QUEUED';
        throw apiError;
      }
      const apiError = ApiError.badRequest(error.message || 'Không thể thực thi hợp đồng HScoin.');
      apiError.hscoinCallId = callId;
      apiError.hscoinStatus = 'FAILED';
      throw apiError;
    }
  }

  // Nếu không có rawInputData, kiểm tra xem có muốn dùng calldata format không
  if (!method) {
    throw ApiError.badRequest('Thiếu tên hàm (function) hoặc inputData (calldata)');
  }

  const normalizedArgs = Array.isArray(args) ? args : [args];
  const loggedArgs = normalizedArgs.map((v) => (typeof v === 'bigint' ? v.toString() : v));
  const orderIdFromArgs =
    ['deposit', 'release', 'refund'].includes(String(method || '').toLowerCase()) && normalizedArgs.length
      ? normalizeOrderId(normalizedArgs[0])
      : null;

  // Nếu useCalldataFormat = true, encode thành calldata và dùng endpoint /contracts/{address}/execute
  if (useCalldataFormat) {
    try {
      const calldata = encodeFunctionCall(method, normalizedArgs);
      const requestPayload = {
        caller: normalizedCaller,
        inputData: calldata.startsWith('0x') ? calldata : `0x${calldata}`,
        value: normalizedValue,
      };

      const callId = await recordHscoinContractCall({
        method,
        caller: normalizedCaller,
        payload: {
          contractAddress: resolvedContract,
          body: requestPayload,
          originalCall: { method, args: loggedArgs },
        },
        orderId: orderIdFromArgs,
      });

      // Ghi sổ ledger ngay lập tức
      await recordTokenLedgerFromCall({
        callId,
        payload: {
          contractAddress: resolvedContract,
          body: requestPayload,
          originalCall: { method, args: loggedArgs },
          orderId: orderIdFromArgs,
        },
        orderId: orderIdFromArgs,
      });

      try {
        const response = await invokeHscoinContract({
          contractAddress: resolvedContract,
          body: requestPayload,
        });
        await markHscoinCallSuccess(callId, response, {
          orderId: orderIdFromArgs,
          payload: {
            contractAddress: resolvedContract,
            body: requestPayload,
            originalCall: { method, args: loggedArgs },
            orderId: orderIdFromArgs,
          },
        });
        // Đảm bảo returnData được forward đúng cách cho view functions như getBalance
        const result = response?.data || response;
        const returnData = result?.returnData || result?.data?.returnData || response?.returnData;
        
        return {
          callId,
          status: 'SUCCESS',
          result: returnData ? { ...result, returnData } : result,
        };
      } catch (error) {
        const retryable = shouldRetryHscoinError(error);
        await markHscoinCallFailure(callId, error, {
          retryable,
          currentRetries: 0,
          maxRetries: HSCOIN_MAX_RETRY,
        });
        if (retryable) {
          const apiError = ApiError.serviceUnavailable(
            `HScoin đang tạm gián đoạn. Yêu cầu ${method || 'giao dịch'} đã được xếp hàng để thử lại tự động.`
          );
          apiError.hscoinCallId = callId;
          apiError.hscoinStatus = 'QUEUED';
          throw apiError;
        }
        const apiError = ApiError.badRequest(error.message || 'Không thể thực thi hợp đồng HScoin.');
        apiError.hscoinCallId = callId;
        apiError.hscoinStatus = 'FAILED';
        throw apiError;
      }
    } catch (error) {
      if (error.statusCode) throw error;
      throw ApiError.badRequest(`Lỗi encode calldata: ${error.message}`);
    }
  }

  // Chuẩn bị args cho API
  // Một số hàm như mint có thể gây lỗi 405 với format method+args trên /simple-token/execute
  // Nên tự động encode thành calldata để dùng endpoint /contracts/{address}/execute
  const methodsRequiringCalldata = ['mint', 'mintSelf', 'transfer', 'burn'];
  const shouldUseCalldata = methodsRequiringCalldata.includes(method?.toLowerCase());
  
  let finalArgs = normalizedArgs;
  if (method?.toLowerCase() === 'burn') {
    const amount = Number(normalizedArgs[0]) || 0;
    finalArgs = [amount];
  }

  let requestPayload;
  if (shouldUseCalldata) {
    // Tự động encode thành calldata để tránh lỗi 405
    try {
      const calldata = encodeFunctionCall(method, finalArgs);
      requestPayload = {
        caller: normalizedCaller,
        inputData: calldata.startsWith('0x') ? calldata : `0x${calldata}`,
        value: normalizedValue,
      };
    } catch (error) {
      // Nếu encode thất bại, fallback về format method + args
      console.warn(`[HScoin] Không thể encode ${method}, dùng format method+args:`, error.message);
      requestPayload = {
        caller: normalizedCaller,
        method: method,
        args: finalArgs.map(arg => typeof arg === 'bigint' ? arg.toString() : arg),
        value: normalizedValue,
        contractAddress: resolvedContract,
      };
    }
  } else {
    // Dùng format method + args cho các hàm khác
    requestPayload = {
      caller: normalizedCaller,
      method: method,
      args: finalArgs.map(arg => typeof arg === 'bigint' ? arg.toString() : arg),
      value: normalizedValue,
      contractAddress: resolvedContract,
    };
  }

  const callId = await recordHscoinContractCall({
    method,
    caller: normalizedCaller,
    payload: {
      contractAddress: resolvedContract,
      body: requestPayload,
      originalCall: { method, args: loggedArgs },
    },
    orderId: orderIdFromArgs,
  });

  // Ghi sổ ledger ngay lập tức để off-chain vẫn thấy số dư khi HScoin chậm/trì hoãn
  await recordTokenLedgerFromCall({
    callId,
    payload: {
      contractAddress: resolvedContract,
      body: requestPayload,
      originalCall: { method, args: loggedArgs },
      orderId: orderIdFromArgs,
    },
    orderId: orderIdFromArgs,
  });

  try {
    const response = await invokeHscoinContract({
      contractAddress: resolvedContract,
      body: requestPayload,
    });
    await markHscoinCallSuccess(callId, response, {
      orderId: orderIdFromArgs,
      payload: {
        contractAddress: resolvedContract,
        body: requestPayload,
        originalCall: { method, args: loggedArgs },
        orderId: orderIdFromArgs,
      },
    });
    return {
      callId,
      status: 'SUCCESS',
      result: response?.data || response,
    };
  } catch (error) {
    const retryable = shouldRetryHscoinError(error);
    await markHscoinCallFailure(callId, error, {
      retryable,
      currentRetries: 0,
      maxRetries: HSCOIN_MAX_RETRY,
    });
    if (retryable) {
      const apiError = ApiError.serviceUnavailable(
        `HScoin đang tạm gián đoạn. Yêu cầu ${method || 'giao dịch'} đã được xếp hàng để thử lại tự động.`
      );
      apiError.hscoinCallId = callId;
      apiError.hscoinStatus = 'QUEUED';
      throw apiError;
    }
    const apiError = ApiError.badRequest(error.message || 'Không thể thực thi hợp đồng HScoin.');
    apiError.hscoinCallId = callId;
    apiError.hscoinStatus = 'FAILED';
    throw apiError;
  }
}

export async function listHscoinContractCalls({ caller, limit = 20 }) {
  if (!caller) {
    throw ApiError.badRequest('Thiếu caller');
  }
  const normalizedCaller = normalizeAddress(caller);
  await ensureHscoinCallTable();
  const [rows] = await pool.query(
    `
    select callId, method, callerAddress, status, retries, maxRetries, lastError, lastResponse, nextRunAt, createdAt, updatedAt
    from HscoinContractCall
    where callerAddress = ?
    order by createdAt desc
    limit ?
    `,
    [normalizedCaller, Math.max(1, Math.min(Number(limit) || 20, 100))]
  );
  return rows.map((row) => ({
    ...row,
    callerAddress: row.callerAddress?.toLowerCase(),
    nextRunAt: row.nextRunAt ? new Date(row.nextRunAt).toISOString() : null,
    createdAt: row.createdAt ? new Date(row.createdAt).toISOString() : null,
    updatedAt: row.updatedAt ? new Date(row.updatedAt).toISOString() : null,
  }));
}

export async function listHscoinAdminCalls({ status, limit = 50 }) {
  await ensureHscoinCallTable();
  const params = [];
  let where = '';
  if (status) {
    where = 'where status = ?';
    params.push(status);
  }
  params.push(Math.max(1, Math.min(Number(limit) || 50, 200)));
  const [rows] = await pool.query(
    `
    select callId, method, callerAddress, status, retries, maxRetries, lastError, nextRunAt, createdAt, updatedAt, orderId
    from HscoinContractCall
    ${where}
    order by createdAt desc
    limit ?
    `,
    params
  );
  return rows.map((row) => ({
    ...row,
    callerAddress: row.callerAddress?.toLowerCase(),
    nextRunAt: row.nextRunAt ? new Date(row.nextRunAt).toISOString() : null,
    createdAt: row.createdAt ? new Date(row.createdAt).toISOString() : null,
    updatedAt: row.updatedAt ? new Date(row.updatedAt).toISOString() : null,
  }));
}

export async function retryHscoinCall(callId) {
  if (!callId) {
    throw ApiError.badRequest('Thiếu callId');
  }
  await ensureHscoinCallTable();
  const [[row]] = await pool.query(
    `select * from HscoinContractCall where callId = ? and status in ('QUEUED','FAILED') and retries < maxRetries for update`,
    [callId]
  );
  if (!row) {
    throw ApiError.badRequest('Call không tồn tại hoặc không thể retry');
  }
  await pool.query(`update HscoinContractCall set status = 'PROCESSING' where callId = ?`, [callId]);
  let payload;
  try {
    payload = JSON.parse(row.payload);
  } catch {
    await markHscoinCallFailure(callId, new Error('Payload không hợp lệ'), {
      retryable: false, currentRetries: row.retries, maxRetries: row.maxRetries,
    });
    throw ApiError.badRequest('Payload không hợp lệ');
  }
  if (!payload || !payload.contractAddress || !payload.body) {
    await markHscoinCallFailure(callId, new Error('Payload thiếu dữ liệu'), {
      retryable: false, currentRetries: row.retries, maxRetries: row.maxRetries,
    });
    throw ApiError.badRequest('Payload không đầy đủ');
  }
  try {
    const response = await invokeHscoinContract(payload);
    await markHscoinCallSuccess(callId, response, { orderId: row.orderId, payload });
    return { callId, status: 'SUCCESS', result: response?.data || response, message: 'Retry thành công' };
  } catch (error) {
    const retryable = shouldRetryHscoinError(error);
    await markHscoinCallFailure(callId, error, {
      retryable, currentRetries: row.retries, maxRetries: row.maxRetries, orderId: row.orderId,
    });
    throw ApiError.serviceUnavailable(
      `Retry thất bại: ${error.message}. ${retryable ? 'Sẽ tự động retry lại sau.' : 'Không thể retry thêm.'}`
    );
  }
}

export async function verifyHscoinCallTxHash(callId) {
  if (!callId) {
    throw ApiError.badRequest('Thiếu callId');
  }
  await ensureHscoinCallTable();
  const [[row]] = await pool.query(`select callId, status, lastResponse, orderId from HscoinContractCall where callId = ?`, [callId]);
  if (!row) {
    throw ApiError.badRequest('Call không tồn tại');
  }
  let txHash = null;
  let blockNumber = null;
  if (row.lastResponse) {
    try {
      const parsed = JSON.parse(row.lastResponse);
      txHash = parsed?.txHash || parsed?.transactionHash || parsed?.data?.txHash || parsed?.data?.transactionHash;
    } catch {}
  }
  if (!txHash) {
    return { callId, status: row.status, verified: false, message: 'Chưa có txHash (giao dịch chưa được đào)' };
  }
  try {
    const blocks = await fetchChainBlocks();
    for (const block of blocks) {
      if (block.transactions && Array.isArray(block.transactions)) {
        const found = block.transactions.find(tx => 
          tx.hash?.toLowerCase() === txHash.toLowerCase() || tx.txHash?.toLowerCase() === txHash.toLowerCase()
        );
        if (found) {
          blockNumber = block.index || block.blockNumber || block.number;
          break;
        }
      }
    }
    if (blockNumber != null) {
      return { callId, txHash, blockNumber, status: row.status, verified: true, message: 'TxHash đã được xác nhận trên blockchain' };
    } else {
      return { callId, txHash, status: row.status, verified: false, message: 'TxHash chưa xuất hiện trên blockchain (đang pending)' };
    }
  } catch (error) {
    console.warn('[HScoin] Không thể verify txHash:', error.message);
    return { callId, txHash, status: row.status, verified: false, message: 'Không thể kết nối blockchain explorer', error: error.message };
  }
}
export async function listHscoinAlerts({ severity, limit = 50 }) {
  await ensureHscoinAlertTable();
  const params = [];
  let where = '';
  if (severity) {
    where = 'where severity = ?';
    params.push(severity);
  }
  params.push(Math.max(1, Math.min(Number(limit) || 50, 200)));
  const [rows] = await pool.query(
    `
    select alertId, callId, severity, message, metadata, acknowledged, createdAt
    from HscoinAlertLog
    ${where}
    order by createdAt desc
    limit ?
    `,
    params
  );
  return rows.map((row) => ({
    ...row,
    createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : row.createdAt,
    metadata: row.metadata ? safeJsonParse(row.metadata) : null,
  }));
}

function safeJsonParse(payload) {
  if (!payload) return null;
  if (typeof payload === 'object') return payload;
  try {
    return JSON.parse(payload);
  } catch {
    return null;
  }
}

async function findOrderIdForCall(callId) {
  const [rows] = await pool.query(
    `
    select orderId
    from HscoinContractCall
    where callId = ?
    limit 1
    `,
    [callId]
  );
  return rows[0]?.orderId || null;
}

async function getOrderParticipants(orderId) {
  const [rows] = await pool.query(
    `
    select so.customerId, p.supplierId as sellerId
    from SalesOrder so
    join OrderDetail od on od.salesOrderId = so.salesOrderId
    join Product p on p.productId = od.productId
    where so.salesOrderId = ?
    limit 1
    `,
    [orderId]
  );
  return rows[0] || null;
}

async function insertNotificationEntry({ userId, content, relatedId }) {
  if (!userId || !content) return;
  await pool.query(
    `
    insert into Notification (userId, content, type, isRead, relatedId)
    values (?, ?, 'hscoin', 0, ?)
    `,
    [userId, content, relatedId || null]
  );
}

async function notifyHscoinParticipants(orderId, status, { callId, error } = {}) {
  if (!orderId) return;
  const participants = await getOrderParticipants(orderId);
  if (!participants) return;
  const baseMessage =
    status === 'SUCCESS'
      ? `Đơn #${orderId}: phí HScoin đã được burn thành công.`
      : `Đơn #${orderId}: burn HScoin thất bại. ${error ? `Chi tiết: ${error}` : ''}`;
  await Promise.all(
    [participants.customerId, participants.sellerId].filter(Boolean).map((userId) =>
      insertNotificationEntry({ userId, content: baseMessage, relatedId: orderId })
    )
  );
}

export async function attachOrderToHscoinCall(callId, orderId) {
  if (!callId || !orderId) return;
  await ensureHscoinCallTable();
  await pool.query(
    `
    update HscoinContractCall
    set orderId = ?
    where callId = ?
    `,
    [orderId, callId]
  );
}

async function ensureHscoinCallTable() {
  if (hasHscoinCallTable) return;
  await pool.query(
    `
    create table if not exists HscoinContractCall (
      callId int primary key auto_increment,
      method varchar(64) not null,
      callerAddress varchar(66) not null,
      payload longtext not null,
      status enum('PENDING','PROCESSING','SUCCESS','FAILED','QUEUED') not null default 'PENDING',
      retries int not null default 0,
      maxRetries int not null default ${HSCOIN_MAX_RETRY},
      lastError text null,
      lastResponse longtext null,
      nextRunAt datetime null,
      orderId int null,
      createdAt timestamp default current_timestamp,
      updatedAt timestamp default current_timestamp on update current_timestamp
    ) engine=InnoDB
    `
  );
  await pool
    .query(
      `
      alter table HscoinContractCall
      add column orderId int null
      `
    )
    .catch((error) => {
      if (error.code !== 'ER_DUP_FIELDNAME') {
        throw error;
      }
    });
  hasHscoinCallTable = true;
}

async function ensureUserContractTable() {
  if (hasUserContractTable) return;
  await pool.query(
    `
    create table if not exists UserContract (
      contractId int primary key auto_increment,
      userId int not null,
      name varchar(120) not null,
      address varchar(66) not null,
      network varchar(60) default 'HScoin Devnet',
      isDefault tinyint(1) not null default 0,
      createdAt timestamp default current_timestamp,
      unique key uniq_user_contract (userId, address),
      foreign key (userId) references User(userId) on delete cascade
    ) engine=InnoDB
    `
  );
  hasUserContractTable = true;
}

export async function saveUserContract({ userId, name, address, network = 'HScoin Devnet', isDefault = false }) {
  if (!userId) {
    throw ApiError.badRequest('Thiếu thông tin người dùng');
  }
  const normalizedAddress = validateAddress(address, 'Địa chỉ contract');
  await ensureUserContractTable();

  if (isDefault) {
    await pool.query(
      `
      update UserContract
      set isDefault = 0
      where userId = ?
      `,
      [userId]
    );
  }

  await pool.query(
    `
    insert into UserContract (userId, name, address, network, isDefault)
    values (?, ?, ?, ?, ?)
    on duplicate key update
      name = values(name),
      network = values(network),
      isDefault = values(isDefault)
    `,
    [userId, name || 'My Contract', normalizedAddress, network || 'HScoin Devnet', isDefault ? 1 : 0]
  );

  // nếu chưa có default thì đặt bản ghi này làm default
  const [defaults] = await pool.query(
    `
    select contractId
    from UserContract
    where userId = ? and isDefault = 1
    limit 1
    `,
    [userId]
  );
  if (!defaults.length) {
    await pool.query(
      `
      update UserContract
      set isDefault = 1
      where userId = ? and address = ?
      `,
      [userId, normalizedAddress]
    );
  }

  return getDefaultUserContract(userId);
}

export async function listUserContracts(userId) {
  if (!userId) {
    throw ApiError.badRequest('Thiếu thông tin người dùng');
  }
  await ensureUserContractTable();
  const [rows] = await pool.query(
    `
    select contractId, name, address, network, isDefault, createdAt
    from UserContract
    where userId = ?
    order by isDefault desc, createdAt desc
    `,
    [userId]
  );
  return rows.map((row) => ({
    ...row,
    isDefault: Boolean(row.isDefault),
    address: normalizeAddress(row.address),
  }));
}

async function getDefaultUserContract(userId) {
  if (!userId) return null;
  await ensureUserContractTable();
  const [[preferred]] = await pool.query(
    `
    select contractId, name, address, network, isDefault, createdAt
    from UserContract
    where userId = ? and isDefault = 1
    limit 1
    `,
    [userId]
  );
  if (preferred) {
    return {
      ...preferred,
      isDefault: Boolean(preferred.isDefault),
      address: normalizeAddress(preferred.address),
    };
  }
  const [[any]] = await pool.query(
    `
    select contractId, name, address, network, isDefault, createdAt
    from UserContract
    where userId = ?
    order by createdAt asc
    limit 1
    `,
    [userId]
  );
  return any
    ? {
        ...any,
        isDefault: Boolean(any.isDefault),
        address: normalizeAddress(any.address),
      }
    : null;
}

async function resolveContractAddress({ userId, contractAddress, walletAddress }) {
  // 1) Tham số truyền vào
  if (contractAddress) {
    return validateAddress(contractAddress, 'Địa chỉ contract');
  }
  // 2) Contract mặc định đã lưu cho user
  if (userId) {
    const defaultContract = await getDefaultUserContract(userId);
    if (defaultContract?.address) {
      return defaultContract.address;
    }
  }
  // 3) Contract gần nhất mà ví này đã gọi (nếu có)
  if (walletAddress) {
    const latest = await getLatestContractByCaller(walletAddress);
    if (latest) {
      return latest;
    }
  }
  // 4) Fallback env
  if (SIMPLE_TOKEN_ADDRESS) {
    return SIMPLE_TOKEN_ADDRESS;
  }
  // Web3 mode: return null instead of throwing error - contract operations are optional
  return null;
}

async function getLatestContractByCaller(walletAddress) {
  const normalized = normalizeLedgerAddress(walletAddress);
  if (!normalized) return null;
  await ensureHscoinCallTable();
  const [[row]] = await pool.query(
    `
    select payload
    from HscoinContractCall
    where callerAddress = ?
    order by createdAt desc
    limit 1
    `,
    [normalized]
  );
  const parsed = safeJsonParse(row?.payload);
  if (!parsed) return null;
  const payloadContract = parsed.contractAddress || parsed.body?.contractAddress || parsed.body?.contract;
  const normalizedContract = normalizeLedgerAddress(payloadContract);
  return normalizedContract || null;
}

export async function resolveContractForBalance({ userId, contractAddress, walletAddress }) {
  // 1) Tham số truyền vào
  if (contractAddress) {
    return validateAddress(contractAddress, 'Địa chỉ contract');
  }
  // 2) Contract mặc định đã lưu cho user
  if (userId) {
    const defaultContract = await getDefaultUserContract(userId);
    if (defaultContract?.address) {
      return defaultContract.address;
    }
  }
  // 3) Contract mới nhất mà ví này đã gọi
  if (walletAddress) {
    const latest = await getLatestContractByCaller(walletAddress);
    if (latest) {
      return latest;
    }
  }
  // 4) Fallback ENV
  if (SIMPLE_TOKEN_ADDRESS) {
    return SIMPLE_TOKEN_ADDRESS;
  }
  // Web3 mode: return null instead of throwing error - contract operations are optional
  return null;
}

export async function compileContract({ sourceCode, contractName }) {
  if (!sourceCode || !contractName) {
    throw ApiError.badRequest('Thiếu source code hoặc tên contract');
  }
  const body = { sourceCode, contractName };
  const response = await callHscoin('/contracts/compile', {
    method: 'POST',
    body,
    requireAuth: true,
  });
  return response?.data || response;
}

export async function deployContract({
  sourceCode,
  contractName,
  abi,
  bytecode,
  deployer,
  setDefault = true,
  userId,
}) {
  if (!deployer) {
    throw ApiError.badRequest('Thiếu địa chỉ deployer (ví đã liên kết)');
  }
  let finalAbi = abi;
  let finalBytecode = bytecode;
  if (!finalAbi || !finalBytecode) {
    const compiled = await compileContract({ sourceCode, contractName });
    finalAbi = compiled?.abi;
    finalBytecode = compiled?.bytecode;
  }
  const response = await callHscoin('/contracts/deploy', {
    method: 'POST',
    body: {
      deployer,
      contractName,
      sourceCode,
      abi: finalAbi,
      bytecode: finalBytecode,
    },
    requireAuth: true,
  });

  const contractAddress =
    response?.data?.contractAddress ||
    response?.data?.address ||
    response?.contractAddress ||
    response?.address;

  if (userId && contractAddress) {
    await saveUserContract({
      userId,
      name: contractName || 'Contract',
      address: contractAddress,
      network: 'HScoin Devnet',
      isDefault: setDefault,
    });
  }

  return {
    ...(response?.data || response),
    contractAddress,
  };
}

export async function autoDeployDefaultContract({ deployer, userId }) {
  if (!deployer) {
    throw ApiError.badRequest('Thiếu địa chỉ deployer (ví đã liên kết)');
  }
  
  // Luôn compile và deploy contract mới (không check existing)
  // Điều này đảm bảo user luôn có contract mới nhất và có thể deploy lại nếu cần
  const compiled = await compileContract({
    sourceCode: DEFAULT_ESCROW_SOURCE,
    contractName: 'PMarketT',
  });

  const deployed = await deployContract({
    sourceCode: DEFAULT_ESCROW_SOURCE,
    contractName: 'PMarketT',
    abi: compiled?.abi,
    bytecode: compiled?.bytecode,
    deployer,
    setDefault: true,
    userId,
  });

  return {
    ...deployed,
    message: 'Đã tự động compile và deploy contract PMarket thành công!',
    existing: false,
  };
}

export async function ensureUserEscrowContract({ userId, walletAddress, contractAddress }) {
  // Nếu đã truyền contractAddress thì dùng luôn
  if (contractAddress) {
    return validateAddress(contractAddress, 'Địa chỉ contract');
  }

  // Thử lấy contract đã lưu/đã dùng gần nhất
  try {
    const resolved = await resolveContractAddress({
      userId,
      contractAddress: null,
      walletAddress,
    });
    if (resolved) return resolved;
  } catch {
    // ignore để auto deploy bên dưới
  }

  // Không có -> auto deploy contract mặc định và lưu cho user
  if (!walletAddress) {
    throw ApiError.badRequest('Thiếu ví để auto deploy contract.');
  }
  const deployed = await deployContract({
    sourceCode: DEFAULT_ESCROW_SOURCE,
    contractName: 'PMarketT',
    deployer: walletAddress,
    setDefault: true,
    userId,
  });
  if (!deployed?.contractAddress) {
    throw ApiError.serviceUnavailable('Không thể deploy contract tự động.');
  }
  return deployed.contractAddress.toLowerCase();
}

async function ensureHscoinAlertTable() {
  if (hasHscoinAlertTable) return;
  await pool.query(
    `
    create table if not exists HscoinAlertLog (
      alertId int primary key auto_increment,
      callId int null,
      severity enum('info','warning','critical') not null default 'info',
      message text not null,
      metadata json null,
      acknowledged tinyint(1) not null default 0,
      createdAt timestamp default current_timestamp
    ) engine=InnoDB
    `
  );
  hasHscoinAlertTable = true;
}

async function recordHscoinAlert({ callId, severity, message, metadata }) {
  await ensureHscoinAlertTable();
  await pool.query(
    `
    insert into HscoinAlertLog (callId, severity, message, metadata)
    values (?, ?, ?, ?)
    `,
    [callId || null, severity || 'info', message, metadata ? JSON.stringify(metadata) : null]
  );
}

async function recordHscoinContractCall({ method, caller, payload, orderId = null }) {
  await ensureHscoinCallTable();
  const resolvedOrderId = normalizeOrderId(orderId);
  const [result] = await pool.query(
    `
    insert into HscoinContractCall (method, callerAddress, payload, status, maxRetries, orderId)
    values (?, ?, ?, 'PROCESSING', ?, ?)
    `,
    [method, caller, JSON.stringify(payload), HSCOIN_MAX_RETRY, resolvedOrderId]
  );
  return result.insertId;
}

async function getHscoinCallPayload(callId) {
  await ensureHscoinCallTable();
  const [[row]] = await pool.query(
    `
    select payload, orderId, callerAddress
    from HscoinContractCall
    where callId = ?
    limit 1
    `,
    [callId]
  );
  if (!row) return null;
  const parsed = safeJsonParse(row.payload);
  if (!parsed) return null;
  return {
    ...parsed,
    orderId: parsed.orderId ?? row.orderId ?? null,
    callerAddress: parsed.callerAddress || row.callerAddress,
  };
}

async function markHscoinCallSuccess(callId, response, { orderId, payload: callPayloadOverride } = {}) {
  await pool.query(
    `
    update HscoinContractCall
    set status = 'SUCCESS',
        lastResponse = ?
    where callId = ?
    `,
    [response ? JSON.stringify(response) : null, callId]
  );

  let callPayload = callPayloadOverride || null;
  try {
    if (!callPayload) {
      callPayload = await getHscoinCallPayload(callId);
    }
    if (callPayload) {
      await recordTokenLedgerFromCall({
        callId,
        payload: callPayload,
        orderId,
      });
    }
  } catch (ledgerError) {
    console.warn('[HScoin] Kh�ng th? ghi s? ph? token:', ledgerError.message);
  }

  const resolvedOrderId = orderId || callPayload?.orderId || (await findOrderIdForCall(callId));
  if (resolvedOrderId) {
    await notifyHscoinParticipants(resolvedOrderId, 'SUCCESS', {
      callId,
    });
  }
}

function shouldRetryHscoinError(error) {
  if (!error) return true;
  const retryableStatus = new Set([0, 405, 408, 425, 429, 500, 502, 503, 504]);
  if (error.status == null) return true;
  return retryableStatus.has(Number(error.status));
}

function computeRetryDelayMs(attempt) {
  const capped = Math.min(Number(attempt) || 1, 5);
  return HSCOIN_RETRY_DELAY_MS * Math.pow(2, capped - 1);
}

async function markHscoinCallFailure(
  callId,
  error,
  { retryable, currentRetries, maxRetries = HSCOIN_MAX_RETRY, orderId } = {}
) {
  const message = error?.message || 'HScoin contract call failed';
  const nextRetryCount = (Number(currentRetries) || 0) + 1;
  const retryLimit = Math.max(1, Number(maxRetries) || HSCOIN_MAX_RETRY);
  const canRetry = retryable && nextRetryCount < retryLimit;
  const nextRunAt = canRetry ? new Date(Date.now() + computeRetryDelayMs(nextRetryCount)) : null;
  await pool.query(
    `
    update HscoinContractCall
    set status = ?,
        retries = ?,
        lastError = ?,
        nextRunAt = ?
    where callId = ?
    `,
    [canRetry ? 'QUEUED' : 'FAILED', nextRetryCount, message, nextRunAt, callId]
  );

  if (!canRetry) {
    await recordHscoinAlert({
      callId,
      severity: 'critical',
      message: `HScoin call #${callId} thất bại hoàn toàn: ${message}`,
      metadata: { retries: nextRetryCount, errorStatus: error?.status ?? null },
    });
    const resolvedOrderId = orderId || (await findOrderIdForCall(callId));
    if (resolvedOrderId) {
      await notifyHscoinParticipants(resolvedOrderId, 'FAILED', {
        callId,
        error: message,
      });
    }
  } else if (nextRetryCount === retryLimit - 1) {
    await recordHscoinAlert({
      callId,
      severity: 'warning',
      message: `HScoin call #${callId} sắp vượt ngưỡng retry (${nextRetryCount}/${retryLimit})`,
      metadata: { nextRunAt, error: message },
    });
  }
}

async function invokeHscoinContract({ contractAddress, body }) {
  // HScoin hỗ trợ 2 cách execute:
  // 1. /simple-token/execute với format { caller, method, args, value, contractAddress }
  // 2. /contracts/{address}/execute với format { caller, inputData, value } (inputData là calldata hex)
  
  // Nếu body có inputData (calldata hex), dùng endpoint /contracts/{address}/execute
  if (body.inputData && typeof body.inputData === 'string') {
    const normalizedContract = validateAddress(contractAddress, 'Địa chỉ contract');
    const executeBody = {
      caller: body.caller,
      inputData: body.inputData,
      value: body.value || 0,
    };
    return callHscoin(`/contracts/${normalizedContract}/execute`, {
      method: 'POST',
      body: executeBody,
      requireAuth: true,
    });
  }
  
  // Nếu không có inputData, dùng /simple-token/execute với format method + args
  const finalBody = body.contractAddress ? body : { ...body, contractAddress };
  return callHscoin('/simple-token/execute', {
    method: 'POST',
    body: finalBody,
    requireAuth: true,
  });
}

async function fetchPendingHscoinCalls(limit = 5) {
  await ensureHscoinCallTable();
  const [rows] = await pool.query(
    `
    select *
    from HscoinContractCall
    where status in ('PENDING','QUEUED')
      and retries < maxRetries
      and (nextRunAt is null or nextRunAt <= now())
    order by createdAt asc
    limit ?
    `,
    [limit]
  );
  return rows;
}

async function processHscoinQueueBatch() {
  const jobs = await fetchPendingHscoinCalls();
  for (const job of jobs) {
    const [lock] = await pool.query(
      `
      update HscoinContractCall
      set status = 'PROCESSING'
      where callId = ? and status in ('PENDING','QUEUED')
      `,
      [job.callId]
    );
    if (lock.affectedRows === 0) {
      continue;
    }

    let payload;
    try {
      payload = JSON.parse(job.payload);
    } catch {
      payload = null;
    }

    if (!payload || !payload.contractAddress || !payload.body) {
      await markHscoinCallFailure(job.callId, new Error('Payload không hợp lệ'), {
        retryable: false,
        currentRetries: job.retries,
        maxRetries: job.maxRetries,
      });
      continue;
    }

    try {
      const response = await invokeHscoinContract(payload);
      await markHscoinCallSuccess(job.callId, response, { orderId: job.orderId, payload });
    } catch (error) {
      const retryable = shouldRetryHscoinError(error);
      await markHscoinCallFailure(job.callId, error, {
        retryable,
        currentRetries: job.retries,
        maxRetries: job.maxRetries,
        orderId: job.orderId,
      });
    }
  }
}

function startHscoinQueueWorker() {
  if (hscoinWorkerTimer || HSCOIN_WORKER_INTERVAL_MS <= 0) {
    return;
  }
  const runner = async () => {
    try {
      await processHscoinQueueBatch();
    } catch (error) {
      console.error('[HScoin] Queue worker error:', error);
    }
  };
  hscoinWorkerTimer = setInterval(runner, HSCOIN_WORKER_INTERVAL_MS);
  if (typeof hscoinWorkerTimer.unref === 'function') {
    hscoinWorkerTimer.unref();
  }
  runner().catch((error) => console.error('[HScoin] Initial queue run error:', error));
}

startHscoinQueueWorker();
