/* =====================================================================
 * ระบบฐานข้อมูลทะเบียนประวัติลูกค้า | บริษัท นวนคร เคเบิลทีวี จำกัด
 * ไฟล์ : Code.gs — ตอนที่ 1/3
 * เวอร์ชัน : Performance Edition (แคช 3 ชั้น + ลดการเขียนชีต)
 * ===================================================================*/

/* =====================================================================
 * 1) ค่าคงที่ระบบ
 * ===================================================================*/
const CONFIG = {
  SHEET_ID: '1YObxoOSn3hc15yHsWMAKGuSuwEfbxRm7tTdo_Kj9Uis',   // ⚠️ ตรวจสอบ
  WEB_APP_URL: '',
  TZ: 'Asia/Bangkok',
  BACKUP_FOLDER: 'NNC_CATV_BACKUP',
  LOGO_FOLDER: 'NNC_CATV_LOGO',
  DEFAULT_SESSION_MINUTES: 180,
  MAX_LOGIN_FAIL: 5,
  LOCK_MINUTES: 15,
  AUDIT_KEEP_DAYS: 180,
  MAX_IMPORT_ROWS: 2000
};

const SHEETS = {
  SETTINGS: 'Settings',
  USERS: 'Users',
  CUSTOMERS: 'Customers',
  AUDIT: 'AuditLog',
  SESSIONS: 'Sessions',
  WORKORDERS: 'WorkOrders',
  ZONES: 'Zones'          // ⚡ เพิ่มบรรทัดนี้
};


const HEADERS = {
  Settings: ['Key', 'Value', 'UpdatedAt', 'UpdatedBy'],

  Users: ['UserID', 'Username', 'PasswordHash', 'Salt', 'FullName', 'Role',
          'Status', 'LastLogin', 'FailCount', 'LockUntil',
          'CreatedAt', 'CreatedBy', 'UpdatedAt', 'UpdatedBy'],

  Customers: ['CustomerID', 'Zone', 'Seq', 'Address', 'CustomerCode', 'CustomerName',
              'Rooms', 'OwnerName', 'Status', 'PricePerMonth', 'Phone', 'Package',
              'CustomerType', 'CardNo', 'SalesPerson', 'ContractDate', 'CancelDate',
              'Note', 'IsDeleted', 'CreatedAt', 'CreatedBy', 'UpdatedAt', 'UpdatedBy'],

  AuditLog: ['LogID', 'Timestamp', 'UserID', 'Username', 'FullName', 'Role',
             'Action', 'Module', 'TargetID', 'Detail', 'Status'],

  Sessions: ['Token', 'UserID', 'Username', 'Role', 'FullName',
             'CreatedAt', 'LastActive', 'ExpiresAt', 'Status'],

  WorkOrders: ['WorkOrderID', 'DocNo', 'ReportDate', 'CancelDate', 'DoneDate',
               'Zone', 'CustomerCode', 'CustomerType', 'CustomerName', 'Address',
               'Phone', 'Cause', 'CauseDetail', 'Result', 'Reporter', 'Technician',
               'Status', 'IsDeleted', 'CreatedAt', 'CreatedBy', 'UpdatedAt',
               'UpdatedBy', 'JobType']
};
/* ZONES ย้ายไปเป็นข้อมูลในชีต Zones แล้ว — ดูโมดูลโซนพื้นที่ท้ายไฟล์ */

const STATUSES = ['ใช้บริการ', 'ระงับสัญญาณ', 'ยกเลิกใช้บริการ'];

/* ---- ใบงานแจ้งช่าง 5 ประเภท ---- */
const WO_JOB_TYPES = ['ซ่อมสัญญาณ', 'ยกเลิกสัญญาณ', 'ต่อสัญญาณ',
                      'ระงับสัญญาณ', 'เปลี่ยนแปลงข้อมูลลูกค้า'];

const WO_TYPE_META = {
  'ซ่อมสัญญาณ':            { code: 'RP', dateLabel: 'วันที่ซ่อม',        causeLabel: 'สาเหตุที่ซ่อม',      doc: 'ใบงานแจ้งซ่อมสัญญาณ' },
  'ยกเลิกสัญญาณ':          { code: 'CN', dateLabel: 'วันที่ยกเลิก',      causeLabel: 'สาเหตุที่ยกเลิก',    doc: 'ใบงานแจ้งยกเลิกสัญญาณ' },
  'ต่อสัญญาณ':             { code: 'RC', dateLabel: 'วันที่ต่อสัญญาณ',   causeLabel: 'สาเหตุที่ต่อสัญญาณ', doc: 'ใบงานแจ้งต่อสัญญาณ' },
  'ระงับสัญญาณ':           { code: 'SP', dateLabel: 'วันที่ระงับสัญญาณ', causeLabel: 'สาเหตุที่ระงับ',     doc: 'ใบงานแจ้งระงับสัญญาณ' },
  'เปลี่ยนแปลงข้อมูลลูกค้า': { code: 'CH', dateLabel: 'วันที่เปลี่ยนแปลง', causeLabel: 'เรื่องที่เปลี่ยนแปลง', doc: 'ใบงานแจ้งเปลี่ยนแปลงข้อมูลลูกค้า' }
};

const WO_STATUS = ['รอดำเนินการ', 'กำลังดำเนินการ', 'เสร็จสิ้น', 'ยกเลิกใบงาน'];

const WO_CUSTOMER_TYPES = ['หอพัก/อพาร์ทเมนท์', 'บ้าน/ทาวน์เฮ้าส์', 'ร้านค้า/สำนักงาน', 'อื่น ๆ'];

/* ⚠️ ตรวจสอบรายการสาเหตุให้ตรงกับของเดิม */
const WO_CAUSES_BY_TYPE = {
  'ซ่อมสัญญาณ': ['ทีวีไม่มีสัญญาณ', 'สัญญาณอ่อน/ภาพไม่ชัด', 'สายขาด/สายหลุด',
                'จูนทีวีไม่เป็น', 'บูสเตอร์/ตัวแยกสัญญาณชำรุด',
                'ไฟดับ/ไฟตก', 'ลูกหอย้ายเข้ามาอยู่ใหม่','เจ้าของเดิมขายตึก', 'อื่น ๆ'],
  'ยกเลิกสัญญาณ': ['เจ้าของขายตึกแล้ว', 'ไม่ได้ใช้บริการ', 'ค้างชำระค่าบริการ',
                  'ย้ายที่อยู่', 'รื้อถอนอาคาร', 'เปลี่ยนผู้ให้บริการ', 'อื่น ๆ'],
  'ต่อสัญญาณ': ['ชำระค่าบริการแล้ว', 'ลูกค้าขอต่อสัญญาณใหม่',
               'ติดตั้งจุดเพิ่ม', 'ย้ายจุดติดตั้ง', 'อื่น ๆ'],
  'ระงับสัญญาณ': ['ค้างชำระค่าบริการ', 'ลูกค้าขอระงับชั่วคราว',
                 'ปิดปรับปรุงอาคาร', 'ผิดเงื่อนไขสัญญา', 'อื่น ๆ'],
  'เปลี่ยนแปลงข้อมูลลูกค้า': ['เปลี่ยนชื่อผู้ใช้บริการ', 'เปลี่ยนเบอร์โทรศัพท์',
                            'เปลี่ยนที่อยู่', 'เปลี่ยนแพ็กเกจ', 'เปลี่ยนราคา',
                            'เปลี่ยนเจ้าของ', 'อื่น ๆ']
};

/* ---- สิทธิ์การใช้งาน ---- */
const ROLES = { ADMIN: 'ผู้ดูแลระบบ', STAFF: 'เจ้าหน้าที่', VIEWER: 'ผู้ดูข้อมูล' };

const PERMS = {
  ADMIN: ['dashboard', 'customer.view', 'customer.create', 'customer.edit', 'customer.delete',
          'customer.import', 'customer.export', 'workorder.view', 'workorder.create',
          'workorder.edit', 'workorder.delete', 'workorder.export',
          'report', 'users', 'audit', 'trash', 'settings'],
  STAFF: ['dashboard', 'customer.view', 'customer.create', 'customer.edit',
          'customer.import', 'customer.export', 'workorder.view', 'workorder.create',
          'workorder.edit', 'workorder.export', 'report'],
  VIEWER: ['dashboard', 'customer.view']
};

const DEFAULT_SETTINGS = {
  orgName: 'บริษัท นวนคร เคเบิลทีวี จำกัด',
  orgShortName: 'นวนคร เคเบิลทีวี',
  systemName: 'ระบบฐานข้อมูลทะเบียนประวัติลูกค้า',
  orgAddress: '-',
  orgPhone: '-',
  orgEmail: '-',
  adminName: '-',
  adminPosition: 'ผู้จัดการ',
  docHeader: 'บริษัท นวนคร เคเบิลทีวี จำกัด',
  docFooter: 'ผู้พัฒนาระบบ สุทธิพงศ์ เบญจะมังคละ',
  fiscalYear: '2569',
  rowsPerPage: '25',
  sessionMinutes: '180',
  logoUrl: ''
};

/* =====================================================================
 * 2) ⚡ ชั้นแคชประสิทธิภาพสูง
 * ===================================================================*/
var CACHE_ = null;
function cacheSrv_() { if (!CACHE_) CACHE_ = CacheService.getScriptCache(); return CACHE_; }

var TTL = { SETTINGS: 1800, SESSION: 900, LIST: 180, DASH: 60 };

function cacheGet_(key) {
  try { var v = cacheSrv_().get(key); return v ? JSON.parse(v) : null; } catch (e) { return null; }
}
function cachePut_(key, obj, ttl) {
  try { var s = JSON.stringify(obj); if (s.length < 95000) cacheSrv_().put(key, s, ttl || 300); } catch (e) {}
}
function cacheDel_(keys) {
  try { cacheSrv_().removeAll([].concat(keys)); } catch (e) {}
}

/** แคชข้อมูลก้อนใหญ่ หั่นชิ้นละ 90 KB (รองรับ ~800 KB) */
function cachePutBig_(key, obj, ttl) {
  try {
    var s = JSON.stringify(obj), CH = 90000, n = Math.ceil(s.length / CH);
    if (n > 9) return false;
    var map = {};
    for (var i = 0; i < n; i++) map[key + '_' + i] = s.substr(i * CH, CH);
    map[key + '_n'] = String(n);
    cacheSrv_().putAll(map, ttl || TTL.LIST);
    return true;
  } catch (e) { return false; }
}
function cacheGetBig_(key) {
  try {
    var n = cacheSrv_().get(key + '_n'); if (!n) return null;
    n = parseInt(n, 10);
    var keys = [];
    for (var i = 0; i < n; i++) keys.push(key + '_' + i);
    var m = cacheSrv_().getAll(keys), s = '';
    for (var j = 0; j < n; j++) {
      var p = m[key + '_' + j];
      if (p === undefined || p === null) return null;
      s += p;
    }
    return JSON.parse(s);
  } catch (e) { return null; }
}
function cacheDelBig_(key) {
  try {
    var n = cacheSrv_().get(key + '_n'); if (!n) return;
    n = parseInt(n, 10);
    var keys = [key + '_n'];
    for (var i = 0; i < n; i++) keys.push(key + '_' + i);
    cacheSrv_().removeAll(keys);
  } catch (e) {}
}

function bustCustomerCache_(zone) {
  cacheDelBig_('CUS_' + String(zone).toUpperCase());
  cacheDel_(['DASH_V1', 'TRASH_V1']);
}
function bustWoCache_() {
  cacheDelBig_('WO_ALL');
  cacheDel_(['DASH_V1', 'TRASH_V1']);
}
function bustAllCache_() {
  cacheDelBig_('WO_ALL');
  var codes = [];
  try { codes = Object.keys(ZONES || {}); } catch (e) {}
  ['A', 'B', 'C', 'D'].forEach(function (z) { if (codes.indexOf(z) === -1) codes.push(z); });
  codes.forEach(function (z) { cacheDelBig_('CUS_' + z); });
  cacheDel_(['DASH_V1', 'TRASH_V1', 'SETTINGS_V1', 'USERS_V1']);
}



/* =====================================================================
 * 3) เครื่องมือพื้นฐาน
 * ===================================================================*/
function ok_(data, message)      { return { ok: true,  data: data === undefined ? null : data, message: message || '' }; }
function fail_(message, code)    { return { ok: false, data: null, message: message || 'เกิดข้อผิดพลาด', code: code || 'ERROR' }; }

function logError_(where, err) {
  try { console.error('[' + where + '] ' + (err && err.stack ? err.stack : err)); } catch (e) {}
}
function handleErr_(where, err) {
  var m = String(err && err.message ? err.message : err);
  if (m === 'SESSION_EXPIRED') return fail_('เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่', 'SESSION_EXPIRED');
  if (m === 'NO_PERMISSION')   return fail_('คุณไม่มีสิทธิ์ใช้งานส่วนนี้', 'NO_PERMISSION');
  logError_(where, err);
  return fail_('เกิดข้อผิดพลาดในระบบ : ' + m, 'ERROR');
}

function nowStr_()   { return Utilities.formatDate(new Date(), CONFIG.TZ, 'yyyy-MM-dd HH:mm:ss'); }
function todayStr_() { return Utilities.formatDate(new Date(), CONFIG.TZ, 'yyyy-MM-dd'); }

function toDateStr_(v) {
  if (v === null || v === undefined || v === '') return '';
  if (Object.prototype.toString.call(v) === '[object Date]') {
    return Utilities.formatDate(v, CONFIG.TZ, 'yyyy-MM-dd');
  }
  var s = String(v).trim();
  var m = s.match(/^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})/);
  if (m) return m[1] + '-' + ('0' + m[2]).slice(-2) + '-' + ('0' + m[3]).slice(-2);
  var d = s.match(/^(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})/);
  if (d) {
    var y = parseInt(d[3], 10); if (y > 2400) y -= 543;
    return y + '-' + ('0' + d[2]).slice(-2) + '-' + ('0' + d[1]).slice(-2);
  }
  return '';
}

function sanitize_(v, max) {
  var s = String(v === null || v === undefined ? '' : v)
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').trim();
  if (max && s.length > max) s = s.substring(0, max);
  return s;
}

function isDeleted_(v) { return String(v).toUpperCase() === 'TRUE'; }

function uid_(prefix) {
  return (prefix || 'ID') + '-' + Utilities.formatDate(new Date(), CONFIG.TZ, 'yyyyMMddHHmmss') +
         '-' + Math.floor(Math.random() * 9000 + 1000);
}

function nfSrv_(n) {
  var x = Number(n); if (isNaN(x)) x = 0;
  return String(Math.round(x * 100) / 100).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function objToRow_(sheetName, obj) {
  return HEADERS[sheetName].map(function (h) {
    var v = obj[h];
    return (v === undefined || v === null) ? '' : v;
  });
}

function hashPassword_(password, salt) {
  var raw = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,
    String(salt) + '::' + String(password), Utilities.Charset.UTF_8);
  return raw.map(function (b) { return ('0' + (b & 0xFF).toString(16)).slice(-2); }).join('');
}

function getSS_() { return SpreadsheetApp.openById(CONFIG.SHEET_ID); }

function getOrCreateFolder_(name) {
  var it = DriveApp.getFoldersByName(name);
  return it.hasNext() ? it.next() : DriveApp.createFolder(name);
}

/* =====================================================================
 * 4) ⚡ เครื่องยนต์อ่าน/เขียนชีต (แคชภายใน execution)
 * ===================================================================*/
var __shCache   = {};
var __rowsCache = {};

/** ใช้ตอนติดตั้งระบบเท่านั้น — จัดรูปแบบหัวตาราง */
function ensureSheet_(ss, name) {
  var sh = ss.getSheetByName(name);
  var headers = HEADERS[name];
  if (!sh) {
    sh = ss.insertSheet(name);
    sh.getRange(1, 1, 1, headers.length).setValues([headers]);
  } else {
    var lastCol = Math.max(1, sh.getLastColumn());
    var cur = sh.getRange(1, 1, 1, lastCol).getValues()[0].map(String);
    var need = false;
    for (var i = 0; i < headers.length; i++) { if (cur[i] !== headers[i]) { need = true; break; } }
    if (need) sh.getRange(1, 1, 1, headers.length).setValues([headers]);
  }
  sh.getRange(1, 1, 1, headers.length)
    .setFontWeight('bold').setBackground('#0C7C82').setFontColor('#FFFFFF')
    .setVerticalAlignment('middle').setFontFamily('Sarabun').setFontSize(11);
  sh.setFrozenRows(1);
  return sh;
}

/** ⚡ ดึงชีตโดยไม่แตะการจัดรูปแบบ */
function getSheetFast_(name) {
  if (__shCache[name]) return __shCache[name];
  var ss = getSS_();
  var sh = ss.getSheetByName(name);
  if (!sh) sh = ensureSheet_(ss, name);
  __shCache[name] = sh;
  return sh;
}

/** ⚡ อ่านชีตครั้งเดียวต่อ 1 คำสั่ง */
function readSheet_(name) {
  if (__rowsCache[name]) return __rowsCache[name];

  var sheet = getSheetFast_(name);
  var headers = HEADERS[name];
  var lastRow = sheet.getLastRow();
  var rows = [];

  if (lastRow >= 2) {
    var values = sheet.getRange(2, 1, lastRow - 1, headers.length).getValues();
    var hlen = headers.length;
    for (var i = 0; i < values.length; i++) {
      var raw = values[i], blank = true;
      for (var b = 0; b < hlen; b++) {
        if (raw[b] !== '' && raw[b] !== null) { blank = false; break; }
      }
      if (blank) continue;
      var o = { _row: i + 2 };
      for (var j = 0; j < hlen; j++) o[headers[j]] = raw[j];
      rows.push(o);
    }
  }
  var res = { sheet: sheet, headers: headers, rows: rows };
  __rowsCache[name] = res;
  return res;
}

function invalidateSheet_(name) { delete __rowsCache[name]; }

/* =====================================================================
 * 5) ⚡ การตั้งค่าระบบ (แคช 30 นาที)
 * ===================================================================*/
var __settingsCache = null;

function clearSettingsCache_() {
  __settingsCache = null;
  cacheDel_('SETTINGS_V1');
}

function getSettingsMap_() {
  if (__settingsCache) return __settingsCache;

  var c = cacheGet_('SETTINGS_V1');
  if (c) { __settingsCache = c; return c; }

  var st = readSheet_(SHEETS.SETTINGS);
  var map = {};
  Object.keys(DEFAULT_SETTINGS).forEach(function (k) { map[k] = DEFAULT_SETTINGS[k]; });
  st.rows.forEach(function (r) {
    var k = String(r.Key).trim();
    if (k) map[k] = String(r.Value);
  });
  __settingsCache = map;
  cachePut_('SETTINGS_V1', map, TTL.SETTINGS);
  return map;
}

function publicSettings_() {
  var m = getSettingsMap_();
  return {
    orgName: m.orgName, orgShortName: m.orgShortName, systemName: m.systemName,
    orgAddress: m.orgAddress, orgPhone: m.orgPhone, orgEmail: m.orgEmail,
    adminName: m.adminName, adminPosition: m.adminPosition,
    docHeader: m.docHeader, docFooter: m.docFooter,
    fiscalYear: m.fiscalYear, rowsPerPage: m.rowsPerPage,
    sessionMinutes: m.sessionMinutes, logoUrl: m.logoUrl
  };
}

function setSetting_(key, value, username) {
  var st = readSheet_(SHEETS.SETTINGS);
  for (var i = 0; i < st.rows.length; i++) {
    if (String(st.rows[i].Key).trim() === key) {
      st.sheet.getRange(st.rows[i]._row, 2, 1, 3)
        .setValues([[value, nowStr_(), username || '-']]);
      invalidateSheet_(SHEETS.SETTINGS);
      clearSettingsCache_();
      return;
    }
  }
  st.sheet.appendRow([key, value, nowStr_(), username || '-']);
  invalidateSheet_(SHEETS.SETTINGS);
  clearSettingsCache_();
}

/* =====================================================================
 * 6) ⚡ ผู้ใช้งานและเซสชัน
 * ===================================================================*/
function findUserByName_(username) {
  var u = String(username || '').trim().toLowerCase();
  if (!u) return null;
  var us = readSheet_(SHEETS.USERS);
  for (var i = 0; i < us.rows.length; i++) {
    if (String(us.rows[i].Username).trim().toLowerCase() === u) return us.rows[i];
  }
  return null;
}
function findUserById_(userId) {
  var id = String(userId || '').trim();
  if (!id) return null;
  var us = readSheet_(SHEETS.USERS);
  for (var i = 0; i < us.rows.length; i++) {
    if (String(us.rows[i].UserID) === id) return us.rows[i];
  }
  return null;
}

function sessionMinutes_() {
  var n = parseInt(getSettingsMap_().sessionMinutes, 10);
  return (isNaN(n) || n < 10) ? CONFIG.DEFAULT_SESSION_MINUTES : n;
}

/** ⚡ ล้างเซสชันเก่าแบบช่วงติดกัน และทำงาน 10% ของการล็อกอิน */
function cleanupSessions_(ses) {
  try {
    if (Math.random() > 0.1) return;
    var now = nowStr_(), del = [];
    ses.rows.forEach(function (r) {
      if (String(r.Status) !== 'ACTIVE' || String(r.ExpiresAt) < now) del.push(r._row);
    });
    if (del.length < 25) return;
    del.sort(function (a, b) { return b - a; });
    var i = 0;
    while (i < del.length) {
      var end = del[i], start = end;
      while (i + 1 < del.length && del[i + 1] === start - 1) { i++; start = del[i]; }
      ses.sheet.deleteRows(start, end - start + 1);
      i++;
    }
    invalidateSheet_(SHEETS.SESSIONS);
  } catch (e) { logError_('cleanupSessions_', e); }
}

function persistSession_(s) {
  try {
    var exp = Utilities.formatDate(new Date(Date.now() + sessionMinutes_() * 60000),
      CONFIG.TZ, 'yyyy-MM-dd HH:mm:ss');
    s.ExpiresAt = exp;
    if (s._row) getSheetFast_(SHEETS.SESSIONS).getRange(s._row, 7, 1, 2).setValues([[nowStr_(), exp]]);
  } catch (e) {}
}

/** ⚡ ตรวจเซสชันจากแคชก่อน — ไม่แตะชีตในกรณีปกติ */
function getSession_(token) {
  var t = String(token || '').trim();
  if (!t) return null;

  var key = 'SESS_' + t, now = nowStr_(), nowMs = Date.now();
  var c = cacheGet_(key);

  if (c) {
    if (String(c.ExpiresAt) < now) { cacheDel_(key); return null; }
    if (nowMs - (c._t || 0) > 300000) {
      persistSession_(c); c._t = nowMs;
      cachePut_(key, c, TTL.SESSION);
    }
    return c;
  }

  var ses = readSheet_(SHEETS.SESSIONS);
  for (var i = 0; i < ses.rows.length; i++) {
    var r = ses.rows[i];
    if (String(r.Token) !== t) continue;
    if (String(r.Status) !== 'ACTIVE') return null;
    if (String(r.ExpiresAt) < now) {
      ses.sheet.getRange(r._row, 9).setValue('EXPIRED');
      return null;
    }
    var s = {
      Token: t, UserID: String(r.UserID), Username: String(r.Username),
      Role: String(r.Role), FullName: String(r.FullName),
      ExpiresAt: String(r.ExpiresAt), _row: r._row, _t: nowMs
    };
    persistSession_(s);
    cachePut_(key, s, TTL.SESSION);
    return s;
  }
  return null;
}

/* =====================================================================
 * 7) ⚡ ประวัติการใช้งาน
 * ===================================================================*/
var AUDIT_SKIP = { 'VIEW': 1 };

function writeAuditRaw_(userId, username, fullName, role, action, module, targetId, detail, status) {
  try {
    if (AUDIT_SKIP[action]) return;
    var sh = getSheetFast_(SHEETS.AUDIT);
    sh.appendRow(objToRow_(SHEETS.AUDIT, {
      LogID: uid_('LOG'), Timestamp: nowStr_(),
      UserID: userId || '-', Username: username || '-',
      FullName: fullName || '-', Role: role || '-',
      Action: action, Module: module, TargetID: targetId || '-',
      Detail: sanitize_(detail, 1200), Status: status || 'SUCCESS'
    }));
    invalidateSheet_(SHEETS.AUDIT);
  } catch (e) { logError_('writeAuditRaw_', e); }
}

function writeAudit_(sess, action, module, targetId, detail, status) {
  writeAuditRaw_(sess.UserID, sess.Username, sess.FullName, sess.Role,
    action, module, targetId, detail, status);
}

/* =====================================================================
 * 8) แปลงแถวลูกค้าเป็นอ็อบเจ็กต์
 * ===================================================================*/
function rowToCustomer_(r) {
  var zone = String(r.Zone || '').toUpperCase();
  return {
    id: String(r.CustomerID),
    zone: zone,
    zoneName: ZONES[zone] ? ZONES[zone].name : (zone || '-'),
    seq: Number(r.Seq) || 0,
    address: String(r.Address || ''),
    customerCode: String(r.CustomerCode || ''),
    customerName: String(r.CustomerName || ''),
    rooms: String(r.Rooms || ''),
    ownerName: String(r.OwnerName || ''),
    status: String(r.Status || ''),
    pricePerMonth: Number(r.PricePerMonth) || 0,
    phone: String(r.Phone || ''),
    pkg: String(r.Package || ''),
    customerType: String(r.CustomerType || ''),
    cardNo: String(r.CardNo || ''),
    salesPerson: String(r.SalesPerson || ''),
    contractDate: toDateStr_(r.ContractDate),
    cancelDate: toDateStr_(r.CancelDate),
    note: String(r.Note || ''),
    createdAt: String(r.CreatedAt || ''), createdBy: String(r.CreatedBy || ''),
    updatedAt: String(r.UpdatedAt || ''), updatedBy: String(r.UpdatedBy || '')
  };
}

/* =====================================================================
 * 9) จุดเข้าเว็บแอป
 * ===================================================================*/
function doGet() {
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('ระบบฐานข้อมูลทะเบียนประวัติลูกค้า | นวนคร เคเบิลทีวี')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function apiGetPublicInfo() {
  try { return ok_(publicSettings_()); }
  catch (err) { return handleErr_('apiGetPublicInfo', err); }
}

function buildMeta_() {
  return {
    zones: ZONES,
    statuses: STATUSES,
    woJobTypes: WO_JOB_TYPES,
    woStatuses: WO_STATUS,
    woTypes: WO_CUSTOMER_TYPES,
    woCausesByType: WO_CAUSES_BY_TYPE,
    woTypeMeta: WO_TYPE_META,
    roles: ROLES,
    perms: PERMS
  };
}

function buildUser_(sess) {
  return {
    userId: sess.UserID, username: sess.Username, fullName: sess.FullName,
    role: sess.Role, roleName: ROLES[sess.Role] || sess.Role,
    perms: PERMS[sess.Role] || []
  };
}

/* =====================================================================
 * 10) เข้าสู่ระบบ / ออกจากระบบ
 * ===================================================================*/
function apiLoginCore_(payload) {
  var lock = LockService.getScriptLock();
  try {
    var p = payload || {};
    var username = sanitize_(p.username, 50);
    var password = String(p.password || '');
    if (!username || !password) return fail_('กรุณากรอกชื่อผู้ใช้และรหัสผ่าน', 'VALIDATION');

    lock.waitLock(8000);

    var us = readSheet_(SHEETS.USERS);
    var u = findUserByName_(username);
    if (!u) {
      writeAuditRaw_('-', username, '-', '-', 'LOGIN', 'เข้าสู่ระบบ', '-',
        'พยายามเข้าสู่ระบบด้วยชื่อผู้ใช้ที่ไม่มีอยู่: ' + username, 'FAILED');
      return fail_('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง', 'AUTH');
    }

    if (String(u.Status) !== 'ACTIVE') {
      writeAuditRaw_(u.UserID, u.Username, u.FullName, u.Role, 'LOGIN', 'เข้าสู่ระบบ', '-',
        'บัญชีถูกระงับการใช้งาน', 'FAILED');
      return fail_('บัญชีนี้ถูกระงับการใช้งาน กรุณาติดต่อผู้ดูแลระบบ', 'AUTH');
    }

    var lockUntil = String(u.LockUntil || '');
    if (lockUntil && lockUntil > nowStr_()) {
      return fail_('บัญชีถูกล็อกชั่วคราวจากการกรอกรหัสผ่านผิดหลายครั้ง\nกรุณาลองใหม่หลัง ' +
        lockUntil.substring(11, 16) + ' น.', 'AUTH');
    }

    var hash = hashPassword_(password, u.Salt);
    if (hash !== String(u.PasswordHash)) {
      var fail = (parseInt(u.FailCount, 10) || 0) + 1;
      var until = '';
      if (fail >= CONFIG.MAX_LOGIN_FAIL) {
        until = Utilities.formatDate(new Date(Date.now() + CONFIG.LOCK_MINUTES * 60000),
          CONFIG.TZ, 'yyyy-MM-dd HH:mm:ss');
        fail = 0;
      }
      us.sheet.getRange(u._row, 9, 1, 2).setValues([[fail, until]]);
      invalidateSheet_(SHEETS.USERS);
      writeAuditRaw_(u.UserID, u.Username, u.FullName, u.Role, 'LOGIN', 'เข้าสู่ระบบ', '-',
        'รหัสผ่านไม่ถูกต้อง (ครั้งที่ ' + fail + ')', 'FAILED');
      return fail_(until
        ? ('กรอกรหัสผ่านผิดเกินกำหนด บัญชีถูกล็อก ' + CONFIG.LOCK_MINUTES + ' นาที')
        : 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง', 'AUTH');
    }

    var ses = readSheet_(SHEETS.SESSIONS);
    cleanupSessions_(ses);

    var token = Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, '').substring(0, 8);
    var exp = Utilities.formatDate(new Date(Date.now() + sessionMinutes_() * 60000),
      CONFIG.TZ, 'yyyy-MM-dd HH:mm:ss');

    getSheetFast_(SHEETS.SESSIONS).appendRow(objToRow_(SHEETS.SESSIONS, {
      Token: token, UserID: String(u.UserID), Username: String(u.Username),
      Role: String(u.Role), FullName: String(u.FullName),
      CreatedAt: nowStr_(), LastActive: nowStr_(), ExpiresAt: exp, Status: 'ACTIVE'
    }));
    invalidateSheet_(SHEETS.SESSIONS);

    us.sheet.getRange(u._row, 8).setValue(nowStr_());
    us.sheet.getRange(u._row, 9, 1, 2).setValues([[0, '']]);
    invalidateSheet_(SHEETS.USERS);

    var sess = {
      Token: token, UserID: String(u.UserID), Username: String(u.Username),
      Role: String(u.Role), FullName: String(u.FullName),
      ExpiresAt: exp, _row: 0, _t: Date.now()
    };
    cachePut_('SESS_' + token, sess, TTL.SESSION);

    writeAudit_(sess, 'LOGIN', 'เข้าสู่ระบบ', '-', 'เข้าสู่ระบบสำเร็จ', 'SUCCESS');

    return ok_({
      token: token, user: buildUser_(sess),
      settings: publicSettings_(), meta: buildMeta_()
    }, 'เข้าสู่ระบบสำเร็จ');
  } catch (err) {
    return handleErr_('apiLogin', err);
  } finally {
    try { lock.releaseLock(); } catch (e) {}
  }
}

function apiLogoutCore_(token) {
  try {
    var t = String(token || '').trim();
    var sess = getSession_(t);
    if (sess) writeAudit_(sess, 'LOGOUT', 'ออกจากระบบ', '-', 'ออกจากระบบ', 'SUCCESS');

    cacheDel_('SESS_' + t);                                  // ⚡ ตัดเซสชันทันที

    var ses = readSheet_(SHEETS.SESSIONS);
    for (var i = 0; i < ses.rows.length; i++) {
      if (String(ses.rows[i].Token) === t) {
        ses.sheet.getRange(ses.rows[i]._row, 9).setValue('LOGOUT');
        invalidateSheet_(SHEETS.SESSIONS);
        break;
      }
    }
    return ok_(null, 'ออกจากระบบเรียบร้อย');
  } catch (err) {
    return handleErr_('apiLogout', err);
  }
}

function apiBootstrap(token) {
  try {
    var sess = requireAuth_(token);
    return ok_({
      user: buildUser_(sess), settings: publicSettings_(),
      meta: buildMeta_(), serverTime: nowStr_()
    });
  } catch (err) {
    return handleErr_('apiBootstrap', err);
  }
}

function apiChangeMyPassword(token, payload) {
  var lock = LockService.getScriptLock();
  try {
    var sess = requireAuth_(token);
    var p = payload || {};
    var oldPw = String(p.oldPassword || '');
    var newPw = String(p.newPassword || '');
    if (!oldPw) return fail_('กรุณากรอกรหัสผ่านเดิม', 'VALIDATION');
    if (newPw.length < 6) return fail_('รหัสผ่านใหม่ต้องมีอย่างน้อย 6 ตัวอักษร', 'VALIDATION');

    lock.waitLock(8000);

    var us = readSheet_(SHEETS.USERS);
    var u = findUserById_(sess.UserID);
    if (!u) return fail_('ไม่พบบัญชีผู้ใช้', 'NOT_FOUND');

    if (hashPassword_(oldPw, u.Salt) !== String(u.PasswordHash)) {
      writeAudit_(sess, 'UPDATE', 'บัญชีผู้ใช้', sess.UserID, 'เปลี่ยนรหัสผ่านไม่สำเร็จ (รหัสผ่านเดิมไม่ถูกต้อง)', 'FAILED');
      return fail_('รหัสผ่านเดิมไม่ถูกต้อง', 'AUTH');
    }

    var salt = Utilities.getUuid().replace(/-/g, '');
    us.sheet.getRange(u._row, 3, 1, 2).setValues([[hashPassword_(newPw, salt), salt]]);
    us.sheet.getRange(u._row, 13, 1, 2).setValues([[nowStr_(), sess.Username]]);
    invalidateSheet_(SHEETS.USERS);

    writeAudit_(sess, 'UPDATE', 'บัญชีผู้ใช้', sess.UserID, 'เปลี่ยนรหัสผ่านของตนเอง', 'SUCCESS');
    return ok_(null, 'เปลี่ยนรหัสผ่านเรียบร้อยแล้ว');
  } catch (err) {
    return handleErr_('apiChangeMyPassword', err);
  } finally {
    try { lock.releaseLock(); } catch (e) {}
  }
}

/* =====================================================================
 * 11) โมดูลตั้งค่าระบบ
 * ===================================================================*/
function apiGetSettings(token) {
  try {
    requireAuth_(token, 'settings');
    return ok_(publicSettings_());
  } catch (err) {
    return handleErr_('apiGetSettings', err);
  }
}

var SETTING_FIELDS = ['orgName', 'orgShortName', 'systemName', 'orgAddress', 'orgPhone',
  'orgEmail', 'adminName', 'adminPosition', 'docHeader', 'docFooter',
  'fiscalYear', 'rowsPerPage', 'sessionMinutes'];

function apiSaveSettings(token, payload) {
  var lock = LockService.getScriptLock();
  try {
    var sess = requireAuth_(token, 'settings');
    var p = payload || {};
    lock.waitLock(10000);

    var orgName = sanitize_(p.orgName, 200);
    var sysName = sanitize_(p.systemName, 200);
    if (!orgName) return fail_('กรุณากรอกชื่อหน่วยงาน', 'VALIDATION');
    if (!sysName) return fail_('กรุณากรอกชื่อระบบ', 'VALIDATION');

    var rpp = parseInt(p.rowsPerPage, 10);
    if (isNaN(rpp) || [25, 50, 100, 200].indexOf(rpp) === -1) rpp = 25;
    var sm = parseInt(p.sessionMinutes, 10);
    if (isNaN(sm) || sm < 10) sm = CONFIG.DEFAULT_SESSION_MINUTES;
    if (sm > 1440) sm = 1440;

    var clean = {
      orgName: orgName,
      orgShortName: sanitize_(p.orgShortName, 120),
      systemName: sysName,
      orgAddress: sanitize_(p.orgAddress, 300),
      orgPhone: sanitize_(p.orgPhone, 60),
      orgEmail: sanitize_(p.orgEmail, 120),
      adminName: sanitize_(p.adminName, 120),
      adminPosition: sanitize_(p.adminPosition, 120),
      docHeader: sanitize_(p.docHeader, 200),
      docFooter: sanitize_(p.docFooter, 200),
      fiscalYear: sanitize_(p.fiscalYear, 20),
      rowsPerPage: String(rpp),
      sessionMinutes: String(sm)
    };

    SETTING_FIELDS.forEach(function (k) { setSetting_(k, clean[k], sess.Username); });

    writeAudit_(sess, 'UPDATE', 'ตั้งค่าระบบ', '-', 'บันทึกการตั้งค่าระบบ', 'SUCCESS');
    return ok_(publicSettings_(), 'บันทึกการตั้งค่าเรียบร้อย');
  } catch (err) {
    return handleErr_('apiSaveSettings', err);
  } finally {
    try { lock.releaseLock(); } catch (e) {}
  }
}

function apiUploadLogo(token, payload) {
  try {
    var sess = requireAuth_(token, 'settings');
    var p = payload || {};
    var b64 = String(p.base64 || '');
    var mime = String(p.mimeType || 'image/png');
    var name = sanitize_(p.fileName, 120) || 'logo.png';

    if (!b64) return fail_('ไม่พบข้อมูลไฟล์', 'VALIDATION');
    if (mime.indexOf('image/') !== 0) return fail_('กรุณาเลือกไฟล์รูปภาพเท่านั้น', 'VALIDATION');
    if (b64.length > 2900000) return fail_('ไฟล์มีขนาดใหญ่เกิน 2 MB', 'VALIDATION');

    var folder = getOrCreateFolder_(CONFIG.LOGO_FOLDER);
    var blob = Utilities.newBlob(Utilities.base64Decode(b64), mime,
      'LOGO_' + Utilities.formatDate(new Date(), CONFIG.TZ, 'yyyyMMdd_HHmmss') + '_' + name);
    var file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    var url = 'https://drive.google.com/uc?export=view&id=' + file.getId();
    setSetting_('logoUrl', url, sess.Username);

    writeAudit_(sess, 'UPDATE', 'ตั้งค่าระบบ', file.getId(), 'อัปโหลดโลโก้หน่วยงาน', 'SUCCESS');
    return ok_({ logoUrl: url }, 'อัปโหลดโลโก้เรียบร้อย');
  } catch (err) {
    return handleErr_('apiUploadLogo', err);
  }
}

function apiRemoveLogo(token) {
  try {
    var sess = requireAuth_(token, 'settings');
    setSetting_('logoUrl', '', sess.Username);
    writeAudit_(sess, 'DELETE', 'ตั้งค่าระบบ', '-', 'ลบโลโก้หน่วยงาน', 'SUCCESS');
    return ok_(null, 'ลบโลโก้เรียบร้อย');
  } catch (err) {
    return handleErr_('apiRemoveLogo', err);
  }
}

/* =====================================================================
 * 12) ติดตั้งระบบ / ย้ายข้อมูล / ทริกเกอร์
 * ===================================================================*/
function setupSystem() {
  var ss = getSS_();
  Object.keys(SHEETS).forEach(function (k) { ensureSheet_(ss, SHEETS[k]); });

  // ค่าตั้งต้น
  var st = readSheet_(SHEETS.SETTINGS);
  var has = {};
  st.rows.forEach(function (r) { has[String(r.Key).trim()] = true; });
  var add = [];
  Object.keys(DEFAULT_SETTINGS).forEach(function (k) {
    if (!has[k]) add.push([k, DEFAULT_SETTINGS[k], nowStr_(), 'SYSTEM']);
  });
  if (add.length) {
    st.sheet.getRange(st.sheet.getLastRow() + 1, 1, add.length, 4).setValues(add);
  }
  invalidateSheet_(SHEETS.SETTINGS);
  clearSettingsCache_();

  // บัญชีผู้ดูแลระบบเริ่มต้น
  var us = readSheet_(SHEETS.USERS);
  if (!us.rows.length) {
    var salt = Utilities.getUuid().replace(/-/g, '');
    getSheetFast_(SHEETS.USERS).appendRow(objToRow_(SHEETS.USERS, {
      UserID: uid_('USR'), Username: 'admin',
      PasswordHash: hashPassword_('0988275533', salt), Salt: salt,
      FullName: 'ผู้ดูแลระบบ', Role: 'ADMIN', Status: 'ACTIVE',
      LastLogin: '', FailCount: 0, LockUntil: '',
      CreatedAt: nowStr_(), CreatedBy: 'SYSTEM',
      UpdatedAt: nowStr_(), UpdatedBy: 'SYSTEM'
    }));
    invalidateSheet_(SHEETS.USERS);
    Logger.log('สร้างบัญชีผู้ดูแลระบบ : nnc / cable025292000');
  }

  getOrCreateFolder_(CONFIG.BACKUP_FOLDER);
  getOrCreateFolder_(CONFIG.LOGO_FOLDER);
  bustAllCache_();
  SpreadsheetApp.flush();
  Logger.log('ติดตั้งระบบเรียบร้อย');
  return 'ติดตั้งระบบเรียบร้อย';
}

/** เติมคอลัมน์ JobType ให้ใบงานเดิมที่ยังว่าง */
function migrateWorkOrderJobType() {
  var ws = readSheet_(SHEETS.WORKORDERS);
  var col = HEADERS.WorkOrders.indexOf('JobType') + 1;
  var n = 0;
  ws.rows.forEach(function (r) {
    if (String(r.JobType || '').trim()) return;
    ws.sheet.getRange(r._row, col).setValue('ซ่อมสัญญาณ');
    n++;
  });
  invalidateSheet_(SHEETS.WORKORDERS);
  bustWoCache_();
  SpreadsheetApp.flush();
  Logger.log('ปรับปรุงใบงานเดิม ' + n + ' รายการ');
  return 'ปรับปรุงใบงานเดิม ' + n + ' รายการ';
}

function installDailyBackupTrigger() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'dailyBackup') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('dailyBackup').timeBased().atHour(1).everyDays(1).create();
  Logger.log('ติดตั้งทริกเกอร์สำรองข้อมูลอัตโนมัติ 01:00 น. เรียบร้อย');
  return 'ติดตั้งทริกเกอร์เรียบร้อย';
}

function dailyBackup() {
  try {
    var folder = getOrCreateFolder_(CONFIG.BACKUP_FOLDER);
    var cur = DriveApp.getFileById(CONFIG.SHEET_ID);
    var name = 'BACKUP_' + Utilities.formatDate(new Date(), CONFIG.TZ, 'yyyyMMdd_HHmmss') +
               '_' + cur.getName();
    cur.makeCopy(name, folder);

    // เก็บไฟล์สำรองอัตโนมัติไม่เกิน 30 ไฟล์
    var list = [], it = folder.getFiles(), guard = 0;
    while (it.hasNext() && guard < 300) {
      guard++;
      var f = it.next();
      if (f.getName().indexOf('BACKUP_') === 0) list.push(f);
    }
    list.sort(function (a, b) { return b.getDateCreated() - a.getDateCreated(); });
    for (var i = 30; i < list.length; i++) list[i].setTrashed(true);

    writeAuditRaw_('-', 'SYSTEM', 'ระบบอัตโนมัติ', 'ADMIN', 'BACKUP', 'ตั้งค่าระบบ', '-',
      'สำรองข้อมูลอัตโนมัติ: ' + name, 'SUCCESS');
    Logger.log('สำรองข้อมูลอัตโนมัติเรียบร้อย: ' + name);
  } catch (e) {
    logError_('dailyBackup', e);
  }
}

/* ============ จบตอนที่ 1/3 — ต่อด้วยตอนที่ 2/3 ได้ทันที ============ */
/* =====================================================================
 * 13) ⚡ ตัวโหลดข้อมูลแบบแคช (ใช้ร่วมกันทุกโมดูล)
 * ===================================================================*/

/** ⚡ ดึงลูกค้าทั้งโซนจากแคช — อ่านชีตเฉพาะเมื่อแคชหมดอายุ */
function loadCustomersAll_(zone) {
  var z = String(zone || '').toUpperCase();
  var key = 'CUS_' + z;
  var c = cacheGetBig_(key);
  if (c) return c;

  var cs = readSheet_(SHEETS.CUSTOMERS);
  var all = [];
  cs.rows.forEach(function (r) {
    if (isDeleted_(r.IsDeleted)) return;
    if (String(r.Zone).toUpperCase() !== z) return;
    all.push(rowToCustomer_(r));
  });
  all.sort(function (a, b) { return a.seq - b.seq; });
  cachePutBig_(key, all, TTL.LIST);
  return all;
}

/** ⚡ ดึงใบงานทั้งหมดจากแคช */
function loadWoAll_() {
  var c = cacheGetBig_('WO_ALL');
  if (c) return c;

  var ws = readSheet_(SHEETS.WORKORDERS);
  var all = [];
  ws.rows.forEach(function (r) {
    if (isDeleted_(r.IsDeleted)) return;
    all.push(rowToWo_(r));
  });
  cachePutBig_('WO_ALL', all, TTL.LIST);
  return all;
}

function sumCustomers_(list) {
  var s = { total: list.length, active: 0, suspended: 0, cancelled: 0, revenue: 0, rooms: 0 };
  for (var i = 0; i < list.length; i++) {
    var c = list[i];
    if (c.status === 'ใช้บริการ') { s.active++; s.revenue += (c.pricePerMonth || 0); }
    else if (c.status === 'ระงับสัญญาณ') s.suspended++;
    else if (c.status === 'ยกเลิกใช้บริการ') s.cancelled++;
    s.rooms += (parseFloat(c.rooms) || 0);
  }
  return s;
}

function filterCustomers_(all, q) {
  var kw = sanitize_(q.keyword, 120).toLowerCase();
  var status = sanitize_(q.status, 60);
  var ctype = sanitize_(q.customerType, 80);
  var pkg = sanitize_(q.pkg, 60);
  var from = toDateStr_(q.dateFrom);
  var to = toDateStr_(q.dateTo);

  return all.filter(function (c) {
    if (status && c.status !== status) return false;
    if (ctype && c.customerType !== ctype) return false;
    if (pkg && c.pkg !== pkg) return false;
    if (from && (!c.contractDate || c.contractDate < from)) return false;
    if (to && (!c.contractDate || c.contractDate > to)) return false;
    if (kw) {
      var hay = (c.address + ' ' + c.customerCode + ' ' + c.customerName + ' ' +
                 c.ownerName + ' ' + c.phone + ' ' + c.cardNo + ' ' + c.salesPerson + ' ' +
                 c.pkg + ' ' + c.customerType + ' ' + c.note).toLowerCase();
      if (hay.indexOf(kw) === -1) return false;
    }
    return true;
  });
}

function sortList_(list, key, dir) {
  var d = String(dir) === 'desc' ? -1 : 1;
  var k = key || 'seq';
  return list.sort(function (a, b) {
    var x = a[k], y = b[k];
    if (typeof x === 'number' && typeof y === 'number') return (x - y) * d;
    var r = String(x === null || x === undefined ? '' : x)
      .localeCompare(String(y === null || y === undefined ? '' : y), 'th', { numeric: true });
    return r * d;
  });
}

/* =====================================================================
 * 14) โมดูลทะเบียนประวัติลูกค้า
 * ===================================================================*/
function apiListCustomers(token, query) {
  try {
    requireAuth_(token, 'customer.view');
    var q = query || {};
    var zone = String(q.zone || 'A').toUpperCase();
    if (!ZONES[zone]) return fail_('ไม่พบโซนพื้นที่ที่ระบุ', 'VALIDATION');

    var all = loadCustomersAll_(zone);
    var summary = sumCustomers_(all);

    var list = filterCustomers_(all, q);
    sortList_(list, sanitize_(q.sortBy, 40) || 'seq', q.sortDir);

    var filtered = sumCustomers_(list);

    var pageSize = parseInt(q.pageSize, 10) || 25;
    if (pageSize < 1) pageSize = 25;
    if (pageSize > 500000) pageSize = 500000;
    var total = list.length;
    var pages = Math.max(1, Math.ceil(total / pageSize));
    var page = parseInt(q.page, 10) || 1;
    if (page < 1) page = 1;
    if (page > pages) page = pages;

    var items = list.slice((page - 1) * pageSize, (page - 1) * pageSize + pageSize);
    items.forEach(function (c, i) { c.no = (page - 1) * pageSize + i + 1; });

    return ok_({
      zone: zone,
      zoneName: ZONES[zone].name,
      zoneArea: ZONES[zone].area,
      items: items, total: total, page: page, pages: pages, pageSize: pageSize,
      summary: summary, filtered: filtered
    });
  } catch (err) {
    return handleErr_('apiListCustomers', err);
  }
}

function apiGetCustomer(token, customerId) {
  try {
    requireAuth_(token, 'customer.view');
    var id = String(customerId || '').trim();
    var cs = readSheet_(SHEETS.CUSTOMERS);
    for (var i = 0; i < cs.rows.length; i++) {
      if (String(cs.rows[i].CustomerID) === id && !isDeleted_(cs.rows[i].IsDeleted)) {
        return ok_(rowToCustomer_(cs.rows[i]));
      }
    }
    return fail_('ไม่พบข้อมูลลูกค้า', 'NOT_FOUND');
  } catch (err) {
    return handleErr_('apiGetCustomer', err);
  }
}

function validateCustomer_(p) {
  var errs = [];
  if (!sanitize_(p.address, 300)) errs.push('เลขที่');
  if (!sanitize_(p.customerCode, 60)) errs.push('รหัสลูกค้า');
  if (!sanitize_(p.customerName, 200)) errs.push('ชื่อตึก/ซอย');
  if (STATUSES.indexOf(String(p.status)) === -1) errs.push('สถานะ');
  var price = Number(p.pricePerMonth);
  if (isNaN(price) || price < 0) errs.push('ราคา/เดือน');
  var phone = sanitize_(p.phone, 40);
  if (phone && !/^[0-9+\-() ]{6,25}$/.test(phone)) errs.push('เบอร์โทรศัพท์');
  var cd = toDateStr_(p.contractDate), xd = toDateStr_(p.cancelDate);
  if (cd && xd && xd < cd) errs.push('วันที่ยกเลิกต้องไม่ก่อนวันที่ทำสัญญา');
  if (String(p.status) === 'ยกเลิกใช้บริการ' && !xd) errs.push('วันที่ยกเลิก (บังคับกรอก)');
  return errs;
}

function apiSaveCustomer(token, payload) {
  var lock = LockService.getScriptLock();
  try {
    var p = payload || {};
    var isNew = !String(p.id || '').trim();
    var sess = requireAuth_(token, isNew ? 'customer.create' : 'customer.edit');

    var zone = String(p.zone || '').toUpperCase();
    if (!ZONES[zone]) return fail_('ไม่พบโซนพื้นที่ที่ระบุ', 'VALIDATION');

    var errs = validateCustomer_(p);
    if (errs.length) return fail_('กรุณาตรวจสอบข้อมูล : ' + errs.join(', '), 'VALIDATION');

    lock.waitLock(10000);

    var cs = readSheet_(SHEETS.CUSTOMERS);
    var code = sanitize_(p.customerCode, 60);
    var curId = String(p.id || '').trim();

    // รหัสลูกค้าห้ามซ้ำภายในโซนเดียวกัน
    for (var i = 0; i < cs.rows.length; i++) {
      var r = cs.rows[i];
      if (isDeleted_(r.IsDeleted)) continue;
      if (String(r.Zone).toUpperCase() !== zone) continue;
      if (String(r.CustomerCode).trim() !== code) continue;
      if (String(r.CustomerID) !== curId) {
        return fail_('รหัสลูกค้า "' + code + '" มีอยู่แล้วใน' + ZONES[zone].name, 'DUPLICATE');
      }
    }

    var data = {
      Zone: zone,
      Address: sanitize_(p.address, 300),
      CustomerCode: code,
      CustomerName: sanitize_(p.customerName, 200),
      Rooms: sanitize_(p.rooms, 40),
      OwnerName: sanitize_(p.ownerName, 200),
      Status: String(p.status),
      PricePerMonth: Number(p.pricePerMonth) || 0,
      Phone: sanitize_(p.phone, 40),
      Package: sanitize_(p.pkg, 60),
      CustomerType: sanitize_(p.customerType, 80),
      CardNo: sanitize_(p.cardNo, 80),
      SalesPerson: sanitize_(p.salesPerson, 120),
      ContractDate: toDateStr_(p.contractDate),
      CancelDate: toDateStr_(p.cancelDate),
      Note: sanitize_(p.note, 600)
    };

    if (isNew) {
      var maxSeq = 0;
      cs.rows.forEach(function (r2) {
        if (String(r2.Zone).toUpperCase() === zone) {
          var s = Number(r2.Seq) || 0;
          if (s > maxSeq) maxSeq = s;
        }
      });
      var newId = uid_('CUS');
      data.CustomerID = newId;
      data.Seq = maxSeq + 1;
      data.IsDeleted = 'FALSE';
      data.CreatedAt = nowStr_(); data.CreatedBy = sess.Username;
      data.UpdatedAt = nowStr_(); data.UpdatedBy = sess.Username;

      getSheetFast_(SHEETS.CUSTOMERS).appendRow(objToRow_(SHEETS.CUSTOMERS, data));
      invalidateSheet_(SHEETS.CUSTOMERS);
      bustCustomerCache_(zone);

      writeAudit_(sess, 'CREATE', 'ทะเบียนลูกค้า', newId,
        'เพิ่มลูกค้า ' + code + ' - ' + data.CustomerName + ' (' + ZONES[zone].name + ')', 'SUCCESS');
      return ok_({ id: newId }, 'เพิ่มข้อมูลลูกค้าเรียบร้อยแล้ว');
    }

    var target = null;
    for (var j = 0; j < cs.rows.length; j++) {
      if (String(cs.rows[j].CustomerID) === curId && !isDeleted_(cs.rows[j].IsDeleted)) {
        target = cs.rows[j]; break;
      }
    }
    if (!target) return fail_('ไม่พบข้อมูลลูกค้าที่ต้องการแก้ไข', 'NOT_FOUND');

    var oldZone = String(target.Zone).toUpperCase();
    data.CustomerID = curId;
    data.Seq = Number(target.Seq) || 0;
    data.IsDeleted = 'FALSE';
    data.CreatedAt = target.CreatedAt; data.CreatedBy = target.CreatedBy;
    data.UpdatedAt = nowStr_();        data.UpdatedBy = sess.Username;

    cs.sheet.getRange(target._row, 1, 1, HEADERS.Customers.length)
      .setValues([objToRow_(SHEETS.CUSTOMERS, data)]);
    invalidateSheet_(SHEETS.CUSTOMERS);
    bustCustomerCache_(zone);
    if (oldZone !== zone) bustCustomerCache_(oldZone);

    writeAudit_(sess, 'UPDATE', 'ทะเบียนลูกค้า', curId,
      'แก้ไขลูกค้า ' + code + ' - ' + data.CustomerName, 'SUCCESS');
    return ok_({ id: curId }, 'บันทึกการแก้ไขเรียบร้อยแล้ว');
  } catch (err) {
    return handleErr_('apiSaveCustomer', err);
  } finally {
    try { lock.releaseLock(); } catch (e) {}
  }
}

function apiDeleteCustomer(token, customerId) {
  var lock = LockService.getScriptLock();
  try {
    var sess = requireAuth_(token, 'customer.delete');
    var id = String(customerId || '').trim();
    if (!id) return fail_('ไม่พบรหัสข้อมูลที่ต้องการลบ', 'VALIDATION');

    lock.waitLock(8000);

    var cs = readSheet_(SHEETS.CUSTOMERS);
    var target = null;
    for (var i = 0; i < cs.rows.length; i++) {
      if (String(cs.rows[i].CustomerID) === id && !isDeleted_(cs.rows[i].IsDeleted)) {
        target = cs.rows[i]; break;
      }
    }
    if (!target) return fail_('ไม่พบข้อมูลลูกค้า', 'NOT_FOUND');

    var colDel = HEADERS.Customers.indexOf('IsDeleted') + 1;
    cs.sheet.getRange(target._row, colDel).setValue('TRUE');
    cs.sheet.getRange(target._row, colDel + 3, 1, 2).setValues([[nowStr_(), sess.Username]]);
    invalidateSheet_(SHEETS.CUSTOMERS);
    bustCustomerCache_(target.Zone);

    writeAudit_(sess, 'DELETE', 'ทะเบียนลูกค้า', id,
      'ลบลูกค้า ' + target.CustomerCode + ' - ' + target.CustomerName + ' (ย้ายไปถังขยะ)', 'SUCCESS');
    return ok_(null, 'ย้ายข้อมูลไปถังขยะเรียบร้อยแล้ว');
  } catch (err) {
    return handleErr_('apiDeleteCustomer', err);
  } finally {
    try { lock.releaseLock(); } catch (e) {}
  }
}

function apiLookupCustomer(token, code) {
  try {
    requireAuth_(token, 'workorder.view');
    var c = sanitize_(code, 60).toLowerCase();
    if (!c) return ok_({ found: false });

    var cs = readSheet_(SHEETS.CUSTOMERS);
    for (var i = 0; i < cs.rows.length; i++) {
      var r = cs.rows[i];
      if (isDeleted_(r.IsDeleted)) continue;
      if (String(r.CustomerCode).trim().toLowerCase() !== c) continue;
      var o = rowToCustomer_(r);
      o.found = true;
      return ok_(o);
    }
    return ok_({ found: false }, 'ไม่พบรหัสลูกค้านี้ในทะเบียน');
  } catch (err) {
    return handleErr_('apiLookupCustomer', err);
  }
}

/* =====================================================================
 * 15) ส่งออก / นำเข้า / พิมพ์ ทะเบียนลูกค้า
 * ===================================================================*/
var CUS_EXPORT_HEADERS = ['ลำดับ', 'เลขที่', 'รหัสลูกค้า', 'ชื่อตึก/ซอย', 'จำนวนห้อง',
  'ชื่อเจ้าของ/คนดูแล', 'สถานะ', 'ราคา/เดือน', 'เบอร์โทรศัพท์', 'แพ็กเกจ', 'ประเภทลูกค้า',
  'เลขที่การ์ด', 'พนักงานขาย', 'วันที่ทำสัญญา', 'วันที่ยกเลิก', 'หมายเหตุ'];

function apiExportCustomers(token, query) {
  try {
    var sess = requireAuth_(token, 'customer.export');
    var q = query || {};
    var zone = String(q.zone || 'A').toUpperCase();
    if (!ZONES[zone]) return fail_('ไม่พบโซนพื้นที่ที่ระบุ', 'VALIDATION');

    var list = filterCustomers_(loadCustomersAll_(zone), q);
    sortList_(list, sanitize_(q.sortBy, 40) || 'seq', q.sortDir);

    var rows = list.map(function (c, i) {
      return [i + 1, c.address, c.customerCode, c.customerName, c.rooms, c.ownerName,
        c.status, c.pricePerMonth, c.phone, c.pkg, c.customerType, c.cardNo,
        c.salesPerson, c.contractDate, c.cancelDate, c.note];
    });

    writeAudit_(sess, 'EXPORT', 'ทะเบียนลูกค้า', zone,
      'ส่งออกข้อมูลลูกค้า ' + ZONES[zone].name + ' จำนวน ' + rows.length + ' รายการ', 'SUCCESS');
    return ok_({ headers: CUS_EXPORT_HEADERS, rows: rows });
  } catch (err) {
    return handleErr_('apiExportCustomers', err);
  }
}

function apiGetZonePrint(token, query) {
  try {
    var sess = requireAuth_(token, 'customer.view');
    var q = query || {};
    var zone = String(q.zone || 'A').toUpperCase();
    if (!ZONES[zone]) return fail_('ไม่พบโซนพื้นที่ที่ระบุ', 'VALIDATION');

    var list = filterCustomers_(loadCustomersAll_(zone), q);
    sortList_(list, sanitize_(q.sortBy, 40) || 'seq', q.sortDir);

    return ok_({
      zone: zone, zoneName: ZONES[zone].name, zoneArea: ZONES[zone].area,
      items: list, summary: sumCustomers_(list),
      settings: publicSettings_(),
      printedBy: sess.FullName, printedAt: nowStr_()
    });
  } catch (err) {
    return handleErr_('apiGetZonePrint', err);
  }
}

function apiImportCustomers(token, payload) {
  var lock = LockService.getScriptLock();
  try {
    var sess = requireAuth_(token, 'customer.import');
    var p = payload || {};
    var zone = String(p.zone || '').toUpperCase();
    if (!ZONES[zone]) return fail_('ไม่พบโซนพื้นที่ที่ระบุ', 'VALIDATION');

    var mode = String(p.mode || 'append');
    var rows = p.rows || [];
    if (!rows.length) return fail_('ไม่พบข้อมูลในไฟล์', 'VALIDATION');
    if (rows.length > CONFIG.MAX_IMPORT_ROWS) {
      return fail_('นำเข้าได้ครั้งละไม่เกิน ' + nfSrv_(CONFIG.MAX_IMPORT_ROWS) + ' แถว', 'VALIDATION');
    }

    lock.waitLock(120000);

    var cs = readSheet_(SHEETS.CUSTOMERS);
    var byCode = {}, maxSeq = 0;
    cs.rows.forEach(function (r) {
      if (String(r.Zone).toUpperCase() !== zone) return;
      var s = Number(r.Seq) || 0;
      if (s > maxSeq) maxSeq = s;
      if (isDeleted_(r.IsDeleted)) return;
      byCode[String(r.CustomerCode).trim().toLowerCase()] = r;
    });

    var inserted = 0, updated = 0, skipped = 0, errors = [];
    var appendRows = [];

    for (var i = 0; i < rows.length; i++) {
      var o = rows[i] || {};
      var line = i + 2;
      var code = sanitize_(o.customerCode, 60);
      var name = sanitize_(o.customerName, 200);

      if (!code || !name) { errors.push('แถว ' + line + ' : ไม่มีรหัสลูกค้าหรือชื่อตึก/ซอย'); skipped++; continue; }

      var status = sanitize_(o.status, 60) || 'ใช้บริการ';
      if (STATUSES.indexOf(status) === -1) status = 'ใช้บริการ';

      var price = Number(String(o.pricePerMonth || '0').replace(/,/g, ''));
      if (isNaN(price) || price < 0) price = 0;

      var phone = sanitize_(o.phone, 40);
      if (phone && !/^[0-9+\-() ]{6,25}$/.test(phone)) {
        errors.push('แถว ' + line + ' : เบอร์โทรศัพท์ไม่ถูกต้อง (' + phone + ')');
        phone = '';
      }

      var data = {
        Zone: zone, Address: sanitize_(o.address, 300), CustomerCode: code,
        CustomerName: name, Rooms: sanitize_(o.rooms, 40),
        OwnerName: sanitize_(o.ownerName, 200), Status: status,
        PricePerMonth: price, Phone: phone,
        Package: sanitize_(o.pkg, 60), CustomerType: sanitize_(o.customerType, 80),
        CardNo: sanitize_(o.cardNo, 80), SalesPerson: sanitize_(o.salesPerson, 120),
        ContractDate: toDateStr_(o.contractDate), CancelDate: toDateStr_(o.cancelDate),
        Note: sanitize_(o.note, 600), IsDeleted: 'FALSE'
      };

      var exist = byCode[code.toLowerCase()];
      if (exist) {
        if (mode !== 'upsert') { skipped++; continue; }
        data.CustomerID = String(exist.CustomerID);
        data.Seq = Number(exist.Seq) || 0;
        data.CreatedAt = exist.CreatedAt; data.CreatedBy = exist.CreatedBy;
        data.UpdatedAt = nowStr_();       data.UpdatedBy = sess.Username;
        cs.sheet.getRange(exist._row, 1, 1, HEADERS.Customers.length)
          .setValues([objToRow_(SHEETS.CUSTOMERS, data)]);
        updated++;
      } else {
        maxSeq++;
        data.CustomerID = uid_('CUS');
        data.Seq = maxSeq;
        data.CreatedAt = nowStr_(); data.CreatedBy = sess.Username;
        data.UpdatedAt = nowStr_(); data.UpdatedBy = sess.Username;
        appendRows.push(objToRow_(SHEETS.CUSTOMERS, data));
        byCode[code.toLowerCase()] = { CustomerID: data.CustomerID };
        inserted++;
      }
    }

    if (appendRows.length) {
      cs.sheet.getRange(cs.sheet.getLastRow() + 1, 1, appendRows.length, HEADERS.Customers.length)
        .setValues(appendRows);
    }

    invalidateSheet_(SHEETS.CUSTOMERS);
    bustCustomerCache_(zone);
    SpreadsheetApp.flush();

    var msg = 'นำเข้าสำเร็จ : เพิ่ม ' + inserted + ' • อัปเดต ' + updated + ' • ข้าม ' + skipped;
    writeAudit_(sess, 'IMPORT', 'ทะเบียนลูกค้า', zone,
      'นำเข้าข้อมูล ' + ZONES[zone].name + ' — ' + msg, errors.length ? 'PARTIAL' : 'SUCCESS');

    return ok_({
      inserted: inserted, updated: updated, skipped: skipped,
      errorCount: errors.length, errors: errors.slice(0, 60)
    }, msg);
  } catch (err) {
    return handleErr_('apiImportCustomers', err);
  } finally {
    try { lock.releaseLock(); } catch (e) {}
  }
}

/* =====================================================================
 * 16) โมดูลถังขยะ
 * ===================================================================*/
function apiListTrash(token, query) {
  try {
    requireAuth_(token, 'trash');
    var q = query || {};
    var kw = sanitize_(q.keyword, 120).toLowerCase();
    var zone = String(q.zone || '').toUpperCase();
    var items = [];

    readSheet_(SHEETS.CUSTOMERS).rows.forEach(function (r) {
      if (!isDeleted_(r.IsDeleted)) return;
      var z = String(r.Zone).toUpperCase();
      if (zone && z !== zone) return;
      items.push({
        kind: 'CUSTOMER', kindName: 'ทะเบียนลูกค้า',
        id: String(r.CustomerID),
        title: String(r.CustomerCode || '') + ' - ' + String(r.CustomerName || ''),
        address: String(r.Address || ''),
        zone: z, zoneName: ZONES[z] ? ZONES[z].name : z,
        updatedAt: String(r.UpdatedAt || ''), updatedBy: String(r.UpdatedBy || '')
      });
    });

    readSheet_(SHEETS.WORKORDERS).rows.forEach(function (r) {
      if (!isDeleted_(r.IsDeleted)) return;
      var z = String(r.Zone).toUpperCase();
      if (zone && z !== zone) return;
      items.push({
        kind: 'WORKORDER', kindName: 'ใบงานแจ้งช่าง',
        id: String(r.WorkOrderID),
        title: String(r.DocNo || '') + ' - ' + String(r.CustomerName || ''),
        address: String(r.Address || ''),
        zone: z, zoneName: ZONES[z] ? ZONES[z].name : (z || '-'),
        updatedAt: String(r.UpdatedAt || ''), updatedBy: String(r.UpdatedBy || '')
      });
    });

    if (kw) {
      items = items.filter(function (x) {
        return (x.title + ' ' + x.address + ' ' + x.zoneName).toLowerCase().indexOf(kw) !== -1;
      });
    }
    items.sort(function (a, b) { return String(b.updatedAt).localeCompare(String(a.updatedAt)); });
    items.forEach(function (x, i) { x.no = i + 1; });

    return ok_({ items: items, total: items.length });
  } catch (err) {
    return handleErr_('apiListTrash', err);
  }
}

function trashSetFlag_(kind, id, flag, username) {
  var isCus = String(kind).toUpperCase() === 'CUSTOMER';
  var name = isCus ? SHEETS.CUSTOMERS : SHEETS.WORKORDERS;
  var idCol = isCus ? 'CustomerID' : 'WorkOrderID';
  var hdr = isCus ? HEADERS.Customers : HEADERS.WorkOrders;
  var st = readSheet_(name);
  var colDel = hdr.indexOf('IsDeleted') + 1;

  for (var i = 0; i < st.rows.length; i++) {
    if (String(st.rows[i][idCol]) !== String(id)) continue;
    st.sheet.getRange(st.rows[i]._row, colDel).setValue(flag);
    st.sheet.getRange(st.rows[i]._row, colDel + 3, 1, 2).setValues([[nowStr_(), username]]);
    invalidateSheet_(name);
    return st.rows[i];
  }
  return null;
}

function apiRestoreTrash(token, kind, id) {
  var lock = LockService.getScriptLock();
  try {
    var sess = requireAuth_(token, 'trash');
    lock.waitLock(8000);

    var row = trashSetFlag_(kind, id, 'FALSE', sess.Username);
    if (!row) return fail_('ไม่พบรายการในถังขยะ', 'NOT_FOUND');

    bustAllCache_();
    writeAudit_(sess, 'RESTORE', 'ถังขยะ', String(id),
      'กู้คืนข้อมูล (' + kind + ')', 'SUCCESS');
    return ok_(null, 'กู้คืนข้อมูลเรียบร้อยแล้ว');
  } catch (err) {
    return handleErr_('apiRestoreTrash', err);
  } finally {
    try { lock.releaseLock(); } catch (e) {}
  }
}

function apiPurgeTrash(token, kind, id) {
  var lock = LockService.getScriptLock();
  try {
    var sess = requireAuth_(token, 'trash');
    lock.waitLock(8000);

    var isCus = String(kind).toUpperCase() === 'CUSTOMER';
    var name = isCus ? SHEETS.CUSTOMERS : SHEETS.WORKORDERS;
    var idCol = isCus ? 'CustomerID' : 'WorkOrderID';
    var st = readSheet_(name);

    for (var i = 0; i < st.rows.length; i++) {
      var r = st.rows[i];
      if (String(r[idCol]) !== String(id)) continue;
      if (!isDeleted_(r.IsDeleted)) return fail_('รายการนี้ไม่ได้อยู่ในถังขยะ', 'VALIDATION');
      st.sheet.deleteRow(r._row);
      invalidateSheet_(name);
      bustAllCache_();
      writeAudit_(sess, 'PURGE', 'ถังขยะ', String(id), 'ลบถาวร (' + kind + ')', 'SUCCESS');
      return ok_(null, 'ลบข้อมูลถาวรเรียบร้อยแล้ว');
    }
    return fail_('ไม่พบรายการในถังขยะ', 'NOT_FOUND');
  } catch (err) {
    return handleErr_('apiPurgeTrash', err);
  } finally {
    try { lock.releaseLock(); } catch (e) {}
  }
}

function apiEmptyTrash(token) {
  var lock = LockService.getScriptLock();
  try {
    var sess = requireAuth_(token, 'trash');
    lock.waitLock(60000);

    var total = 0;
    [SHEETS.CUSTOMERS, SHEETS.WORKORDERS].forEach(function (name) {
      var st = readSheet_(name);
      var del = [];
      st.rows.forEach(function (r) { if (isDeleted_(r.IsDeleted)) del.push(r._row); });
      if (!del.length) return;
      del.sort(function (a, b) { return b - a; });
      var i = 0;
      while (i < del.length) {
        var end = del[i], start = end;
        while (i + 1 < del.length && del[i + 1] === start - 1) { i++; start = del[i]; }
        st.sheet.deleteRows(start, end - start + 1);
        i++;
      }
      total += del.length;
      invalidateSheet_(name);
    });

    bustAllCache_();
    SpreadsheetApp.flush();
    writeAudit_(sess, 'PURGE', 'ถังขยะ', '-', 'ล้างถังขยะทั้งหมด ' + total + ' รายการ', 'SUCCESS');
    return ok_({ deleted: total }, 'ล้างถังขยะเรียบร้อย ' + nfSrv_(total) + ' รายการ');
  } catch (err) {
    return handleErr_('apiEmptyTrash', err);
  } finally {
    try { lock.releaseLock(); } catch (e) {}
  }
}

/* =====================================================================
 * 17) โมดูลผู้ใช้งาน
 * ===================================================================*/
function apiListUsers(token, query) {
  try {
    requireAuth_(token, 'users');
    var q = query || {};
    var kw = sanitize_(q.keyword, 80).toLowerCase();
    var role = sanitize_(q.role, 20);
    var status = sanitize_(q.status, 20);
    var now = nowStr_();

    var items = [];
    readSheet_(SHEETS.USERS).rows.forEach(function (r) {
      var lockUntil = String(r.LockUntil || '');
      var o = {
        userId: String(r.UserID), username: String(r.Username),
        fullName: String(r.FullName), role: String(r.Role),
        roleName: ROLES[String(r.Role)] || String(r.Role),
        status: String(r.Status), lastLogin: String(r.LastLogin || ''),
        failCount: Number(r.FailCount) || 0,
        lockUntil: (lockUntil && lockUntil > now) ? lockUntil : ''
      };
      if (role && o.role !== role) return;
      if (status && o.status !== status) return;
      if (kw && (o.username + ' ' + o.fullName).toLowerCase().indexOf(kw) === -1) return;
      items.push(o);
    });

    items.sort(function (a, b) { return a.username.localeCompare(b.username); });
    items.forEach(function (u, i) { u.no = i + 1; });

    var summary = { total: items.length, active: 0, inactive: 0, admin: 0 };
    items.forEach(function (u) {
      if (u.status === 'ACTIVE') summary.active++; else summary.inactive++;
      if (u.role === 'ADMIN') summary.admin++;
    });

    return ok_({ items: items, summary: summary });
  } catch (err) {
    return handleErr_('apiListUsers', err);
  }
}

function apiSaveUser(token, payload) {
  var lock = LockService.getScriptLock();
  try {
    var sess = requireAuth_(token, 'users');
    var p = payload || {};
    var userId = String(p.userId || '').trim();
    var isNew = !userId;

    var username = sanitize_(p.username, 50);
    var fullName = sanitize_(p.fullName, 150);
    var role = String(p.role || '');
    var status = String(p.status || 'ACTIVE');
    var password = String(p.password || '');

    if (!/^[a-zA-Z0-9._-]{3,50}$/.test(username)) {
      return fail_('ชื่อผู้ใช้ต้องเป็นภาษาอังกฤษ ตัวเลข . _ - ความยาว 3-50 ตัวอักษร', 'VALIDATION');
    }
    if (!fullName) return fail_('กรุณากรอกชื่อ-สกุล', 'VALIDATION');
    if (!ROLES[role]) return fail_('กรุณาเลือกสิทธิ์การใช้งาน', 'VALIDATION');
    if (['ACTIVE', 'INACTIVE'].indexOf(status) === -1) status = 'ACTIVE';
    if ((isNew || password) && password.length < 6) {
      return fail_('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร', 'VALIDATION');
    }

    lock.waitLock(10000);

    var us = readSheet_(SHEETS.USERS);
    for (var i = 0; i < us.rows.length; i++) {
      if (String(us.rows[i].Username).trim().toLowerCase() === username.toLowerCase() &&
          String(us.rows[i].UserID) !== userId) {
        return fail_('ชื่อผู้ใช้ "' + username + '" มีอยู่แล้วในระบบ', 'DUPLICATE');
      }
    }

    if (isNew) {
      var salt = Utilities.getUuid().replace(/-/g, '');
      var newId = uid_('USR');
      getSheetFast_(SHEETS.USERS).appendRow(objToRow_(SHEETS.USERS, {
        UserID: newId, Username: username,
        PasswordHash: hashPassword_(password, salt), Salt: salt,
        FullName: fullName, Role: role, Status: status,
        LastLogin: '', FailCount: 0, LockUntil: '',
        CreatedAt: nowStr_(), CreatedBy: sess.Username,
        UpdatedAt: nowStr_(), UpdatedBy: sess.Username
      }));
      invalidateSheet_(SHEETS.USERS);
      writeAudit_(sess, 'CREATE', 'ผู้ใช้งาน', newId,
        'เพิ่มบัญชี ' + username + ' (' + ROLES[role] + ')', 'SUCCESS');
      return ok_({ userId: newId }, 'เพิ่มบัญชีผู้ใช้เรียบร้อยแล้ว');
    }

    var u = findUserById_(userId);
    if (!u) return fail_('ไม่พบบัญชีผู้ใช้', 'NOT_FOUND');

    // ป้องกันปิดผู้ดูแลระบบคนสุดท้าย
    if (String(u.Role) === 'ADMIN' && (role !== 'ADMIN' || status !== 'ACTIVE')) {
      var admins = 0;
      us.rows.forEach(function (r) {
        if (String(r.Role) === 'ADMIN' && String(r.Status) === 'ACTIVE') admins++;
      });
      if (admins <= 1) return fail_('ไม่สามารถเปลี่ยนสิทธิ์หรือระงับผู้ดูแลระบบคนสุดท้ายได้', 'VALIDATION');
    }

    us.sheet.getRange(u._row, 2).setValue(username);
    us.sheet.getRange(u._row, 5, 1, 3).setValues([[fullName, role, status]]);
    us.sheet.getRange(u._row, 13, 1, 2).setValues([[nowStr_(), sess.Username]]);

    if (password) {
      var s2 = Utilities.getUuid().replace(/-/g, '');
      us.sheet.getRange(u._row, 3, 1, 2).setValues([[hashPassword_(password, s2), s2]]);
    }
    invalidateSheet_(SHEETS.USERS);

    writeAudit_(sess, 'UPDATE', 'ผู้ใช้งาน', userId,
      'แก้ไขบัญชี ' + username + (password ? ' (เปลี่ยนรหัสผ่าน)' : ''), 'SUCCESS');
    return ok_({ userId: userId }, 'บันทึกบัญชีผู้ใช้เรียบร้อยแล้ว');
  } catch (err) {
    return handleErr_('apiSaveUser', err);
  } finally {
    try { lock.releaseLock(); } catch (e) {}
  }
}

function apiResetUserPassword(token, payload) {
  var lock = LockService.getScriptLock();
  try {
    var sess = requireAuth_(token, 'users');
    var p = payload || {};
    var userId = String(p.userId || '').trim();
    var pw = String(p.password || '');
    if (pw.length < 6) return fail_('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร', 'VALIDATION');

    lock.waitLock(8000);

    var us = readSheet_(SHEETS.USERS);
    var u = findUserById_(userId);
    if (!u) return fail_('ไม่พบบัญชีผู้ใช้', 'NOT_FOUND');

    var salt = Utilities.getUuid().replace(/-/g, '');
    us.sheet.getRange(u._row, 3, 1, 2).setValues([[hashPassword_(pw, salt), salt]]);
    us.sheet.getRange(u._row, 9, 1, 2).setValues([[0, '']]);
    us.sheet.getRange(u._row, 13, 1, 2).setValues([[nowStr_(), sess.Username]]);
    invalidateSheet_(SHEETS.USERS);

    writeAudit_(sess, 'UPDATE', 'ผู้ใช้งาน', userId,
      'รีเซ็ตรหัสผ่านบัญชี ' + u.Username, 'SUCCESS');
    return ok_(null, 'รีเซ็ตรหัสผ่านเรียบร้อยแล้ว');
  } catch (err) {
    return handleErr_('apiResetUserPassword', err);
  } finally {
    try { lock.releaseLock(); } catch (e) {}
  }
}

function apiUnlockUser(token, userId) {
  try {
    var sess = requireAuth_(token, 'users');
    var us = readSheet_(SHEETS.USERS);
    var u = findUserById_(userId);
    if (!u) return fail_('ไม่พบบัญชีผู้ใช้', 'NOT_FOUND');

    us.sheet.getRange(u._row, 9, 1, 2).setValues([[0, '']]);
    invalidateSheet_(SHEETS.USERS);
    writeAudit_(sess, 'UPDATE', 'ผู้ใช้งาน', String(userId),
      'ปลดล็อกบัญชี ' + u.Username, 'SUCCESS');
    return ok_(null, 'ปลดล็อกบัญชีเรียบร้อยแล้ว');
  } catch (err) {
    return handleErr_('apiUnlockUser', err);
  }
}

function apiDeleteUser(token, userId) {
  var lock = LockService.getScriptLock();
  try {
    var sess = requireAuth_(token, 'users');
    var id = String(userId || '').trim();
    if (id === String(sess.UserID)) return fail_('ไม่สามารถลบบัญชีของตนเองได้', 'VALIDATION');

    lock.waitLock(8000);

    var us = readSheet_(SHEETS.USERS);
    var u = findUserById_(id);
    if (!u) return fail_('ไม่พบบัญชีผู้ใช้', 'NOT_FOUND');

    if (String(u.Role) === 'ADMIN') {
      var admins = 0;
      us.rows.forEach(function (r) {
        if (String(r.Role) === 'ADMIN' && String(r.Status) === 'ACTIVE') admins++;
      });
      if (admins <= 1) return fail_('ไม่สามารถลบผู้ดูแลระบบคนสุดท้ายได้', 'VALIDATION');
    }

    var uname = String(u.Username);
    us.sheet.deleteRow(u._row);
    invalidateSheet_(SHEETS.USERS);

    writeAudit_(sess, 'DELETE', 'ผู้ใช้งาน', id, 'ลบบัญชี ' + uname, 'SUCCESS');
    return ok_(null, 'ลบบัญชีผู้ใช้เรียบร้อยแล้ว');
  } catch (err) {
    return handleErr_('apiDeleteUser', err);
  } finally {
    try { lock.releaseLock(); } catch (e) {}
  }
}

/* =====================================================================
 * 18) โมดูลประวัติการใช้งาน
 * ===================================================================*/
function filterAudit_(q) {
  var kw = sanitize_(q.keyword, 120).toLowerCase();
  var action = sanitize_(q.action, 40);
  var username = sanitize_(q.username, 60);
  var status = sanitize_(q.status, 20);
  var from = toDateStr_(q.dateFrom);
  var to = toDateStr_(q.dateTo);

  var actions = {}, users = {}, list = [];

  readSheet_(SHEETS.AUDIT).rows.forEach(function (r) {
    var o = {
      logId: String(r.LogID), timestamp: String(r.Timestamp || ''),
      userId: String(r.UserID || ''), username: String(r.Username || ''),
      fullName: String(r.FullName || ''), role: String(r.Role || ''),
      roleName: ROLES[String(r.Role)] || String(r.Role || '-'),
      action: String(r.Action || ''), module: String(r.Module || ''),
      targetId: String(r.TargetID || ''), detail: String(r.Detail || ''),
      status: String(r.Status || '')
    };
    actions[o.action] = 1;
    if (o.username) users[o.username] = 1;

    if (action && o.action !== action) return;
    if (username && o.username !== username) return;
    if (status && o.status !== status) return;
    var d = o.timestamp.substring(0, 10);
    if (from && d < from) return;
    if (to && d > to) return;
    if (kw && (o.username + ' ' + o.fullName + ' ' + o.module + ' ' + o.detail)
      .toLowerCase().indexOf(kw) === -1) return;

    list.push(o);
  });

  list.sort(function (a, b) { return String(b.timestamp).localeCompare(String(a.timestamp)); });
  return { list: list, actions: Object.keys(actions).sort(), users: Object.keys(users).sort() };
}

function apiListAudit(token, query) {
  try {
    requireAuth_(token, 'audit');
    var q = query || {};
    var f = filterAudit_(q);

    var pageSize = parseInt(q.pageSize, 10) || 50;
    if (pageSize < 1) pageSize = 50;
    var total = f.list.length;
    var pages = Math.max(1, Math.ceil(total / pageSize));
    var page = parseInt(q.page, 10) || 1;
    if (page < 1) page = 1;
    if (page > pages) page = pages;

    var items = f.list.slice((page - 1) * pageSize, (page - 1) * pageSize + pageSize);
    items.forEach(function (x, i) { x.no = (page - 1) * pageSize + i + 1; });

    return ok_({
      items: items, total: total, page: page, pages: pages, pageSize: pageSize,
      actions: f.actions, users: f.users
    });
  } catch (err) {
    return handleErr_('apiListAudit', err);
  }
}

function apiExportAudit(token, query) {
  try {
    var sess = requireAuth_(token, 'audit');
    var f = filterAudit_(query || {});
    var rows = f.list.map(function (a, i) {
      return [i + 1, a.timestamp, a.username, a.fullName, a.roleName,
        a.action, a.module, a.targetId, a.detail, a.status];
    });
    writeAudit_(sess, 'EXPORT', 'ประวัติการใช้งาน', '-',
      'ส่งออกประวัติ ' + rows.length + ' รายการ', 'SUCCESS');
    return ok_({
      headers: ['ลำดับ', 'วันเวลา', 'ชื่อผู้ใช้', 'ชื่อ-สกุล', 'สิทธิ์',
        'การกระทำ', 'หมวด', 'รหัสอ้างอิง', 'รายละเอียด', 'ผลลัพธ์'],
      rows: rows
    });
  } catch (err) {
    return handleErr_('apiExportAudit', err);
  }
}

function apiClearAudit(token, days) {
  var lock = LockService.getScriptLock();
  try {
    var sess = requireAuth_(token, 'audit');
    var all = String(days).toUpperCase() === 'ALL';
    var d = all ? 0 : (parseInt(days, 10) || CONFIG.AUDIT_KEEP_DAYS);
    if (!all && d < 7) d = 7;

    lock.waitLock(60000);

    var cut = Utilities.formatDate(new Date(Date.now() - d * 86400000),
      CONFIG.TZ, 'yyyy-MM-dd HH:mm:ss');
    var au = readSheet_(SHEETS.AUDIT);
    var del = [];
    au.rows.forEach(function (r) {
      if (all) { del.push(r._row); return; }
      var ts = auditTs_(r.Timestamp);
      if (/^\d{4}-\d{2}-\d{2}/.test(ts) && ts < cut) del.push(r._row);
    });

    if (del.length) {
      del.sort(function (a, b) { return b - a; });
      var i = 0;
      while (i < del.length) {
        var end = del[i], start = end;
        while (i + 1 < del.length && del[i + 1] === start - 1) { i++; start = del[i]; }
        au.sheet.deleteRows(start, end - start + 1);
        i++;
      }
      invalidateSheet_(SHEETS.AUDIT);
      SpreadsheetApp.flush();
    }

    writeAudit_(sess, 'PURGE', 'ประวัติการใช้งาน', '-',
      (all ? 'ล้างประวัติทั้งหมด' : 'ล้างประวัติที่เก่ากว่า ' + d + ' วัน') +
      ' จำนวน ' + del.length + ' รายการ', 'SUCCESS');
    return ok_({ deleted: del.length }, 'ล้างประวัติเรียบร้อย ' + nfSrv_(del.length) + ' รายการ');
  } catch (err) {
    return handleErr_('apiClearAudit', err);
  } finally {
    try { lock.releaseLock(); } catch (e) {}
  }
}

/* =====================================================================
 * 19) ⚡ แดชบอร์ด (แคช 60 วินาที)
 * ===================================================================*/
function apiGetDashboard(token) {
  try {
    requireAuth_(token, 'dashboard');

    var cached = cacheGet_('DASH_V1');
    if (cached) return ok_(cached);

    var zones = {}, overall = { total: 0, active: 0, suspended: 0, cancelled: 0, revenue: 0 };
    var typeCount = {}, pkgCount = {};

    Object.keys(ZONES).forEach(function (z) {
      var list = loadCustomersAll_(z);
      var s = sumCustomers_(list);
      zones[z] = {
        zone: z, name: ZONES[z].name, area: ZONES[z].area,
        total: s.total, active: s.active, suspended: s.suspended,
        cancelled: s.cancelled, revenue: s.revenue
      };
      overall.total += s.total; overall.active += s.active;
      overall.suspended += s.suspended; overall.cancelled += s.cancelled;
      overall.revenue += s.revenue;

      list.forEach(function (c) {
        if (c.customerType) typeCount[c.customerType] = (typeCount[c.customerType] || 0) + 1;
        if (c.pkg) pkgCount[c.pkg] = (pkgCount[c.pkg] || 0) + 1;
      });
    });

    var wos = loadWoAll_();
    var woSummary = { total: wos.length, pending: 0, progress: 0, done: 0, cancelled: 0 };
    var woByType = {};
    WO_JOB_TYPES.forEach(function (t) { woByType[t] = 0; });

    wos.forEach(function (w) {
      if (w.status === 'รอดำเนินการ') woSummary.pending++;
      else if (w.status === 'กำลังดำเนินการ') woSummary.progress++;
      else if (w.status === 'เสร็จสิ้น') woSummary.done++;
      else if (w.status === 'ยกเลิกใบงาน') woSummary.cancelled++;
      if (w.jobType) woByType[w.jobType] = (woByType[w.jobType] || 0) + 1;
    });

    var recentWo = wos.slice().sort(function (a, b) {
      return String(b.createdAt).localeCompare(String(a.createdAt));
    }).slice(0, 8);

    var recent = [];
    var au = readSheet_(SHEETS.AUDIT).rows;
    for (var i = au.length - 1; i >= 0 && recent.length < 12; i--) {
      var r = au[i];
      recent.push({
        timestamp: String(r.Timestamp || ''), fullName: String(r.FullName || '-'),
        action: String(r.Action || ''), module: String(r.Module || ''),
        detail: String(r.Detail || ''), status: String(r.Status || '')
      });
    }

    var out = {
      zones: Object.keys(zones).map(function (k) { return zones[k]; }),
      overall: overall, typeCount: typeCount, pkgCount: pkgCount,
      wo: woSummary, woByType: woByType,
      recentWorkOrders: recentWo, recent: recent, serverTime: nowStr_()
    };
    cachePut_('DASH_V1', out, TTL.DASH);
    return ok_(out);
  } catch (err) {
    return handleErr_('apiGetDashboard', err);
  }
}

/* =====================================================================
 * 20) โมดูลรายงานและสถิติ
 * ===================================================================*/
function apiGetReport(token, query) {
  try {
    var sess = requireAuth_(token, 'report');
    var q = query || {};
    var zoneF = String(q.zone || '').toUpperCase();
    var statusF = sanitize_(q.status, 60);
    var from = toDateStr_(q.dateFrom);
    var to = toDateStr_(q.dateTo);

    var byZone = [], all = [];
    Object.keys(ZONES).forEach(function (z) {
      if (zoneF && z !== zoneF) return;
      var list = loadCustomersAll_(z).filter(function (c) {
        if (statusF && c.status !== statusF) return false;
        if (from && (!c.contractDate || c.contractDate < from)) return false;
        if (to && (!c.contractDate || c.contractDate > to)) return false;
        return true;
      });
      var s = sumCustomers_(list);
      byZone.push({
        zone: z, name: ZONES[z].name, total: s.total, active: s.active,
        suspended: s.suspended, cancelled: s.cancelled, revenue: s.revenue
      });
      all = all.concat(list);
    });

    var summary = sumCustomers_(all);

    var monthMap = {};
    all.forEach(function (c) {
      if (!c.contractDate) return;
      var m = c.contractDate.substring(0, 7);
      if (!monthMap[m]) monthMap[m] = { month: m, count: 0, revenue: 0 };
      monthMap[m].count++;
      if (c.status === 'ใช้บริการ') monthMap[m].revenue += (c.pricePerMonth || 0);
    });
    var byMonth = Object.keys(monthMap).sort().map(function (k) { return monthMap[k]; });

    var wos = loadWoAll_().filter(function (w) {
      if (zoneF && w.zone !== zoneF) return false;
      if (from && (!w.reportDate || w.reportDate < from)) return false;
      if (to && (!w.reportDate || w.reportDate > to)) return false;
      return true;
    });

    var woMap = {};
    WO_JOB_TYPES.forEach(function (t) { woMap[t] = { jobType: t, total: 0, done: 0 }; });
    wos.forEach(function (w) {
      if (!woMap[w.jobType]) woMap[w.jobType] = { jobType: w.jobType, total: 0, done: 0 };
      woMap[w.jobType].total++;
      if (w.status === 'เสร็จสิ้น') woMap[w.jobType].done++;
    });

    return ok_({
      summary: summary, byZone: byZone, byMonth: byMonth,
      woByType: Object.keys(woMap).map(function (k) { return woMap[k]; }),
      woTotal: wos.length,
      filters: { zone: zoneF ? ZONES[zoneF].name : '', status: statusF, dateFrom: from, dateTo: to },
      settings: publicSettings_(),
      printedBy: sess.FullName, printedAt: nowStr_()
    });
  } catch (err) {
    return handleErr_('apiGetReport', err);
  }
}

/* =====================================================================
 * 21) โมดูลสำรองข้อมูล
 * ===================================================================*/
function apiListBackups(token) {
  try {
    requireAuth_(token, 'settings');
    var folder = getOrCreateFolder_(CONFIG.BACKUP_FOLDER);
    var items = [], it = folder.getFiles(), guard = 0;

    while (it.hasNext() && guard < 300) {
      guard++;
      var f = it.next();
      var name = f.getName();
      items.push({
        fileId: f.getId(), name: name,
        kind: name.indexOf('PRE-RESTORE') !== -1 ? 'PRE' : 'NORMAL',
        createdAt: Utilities.formatDate(f.getDateCreated(), CONFIG.TZ, 'yyyy-MM-dd HH:mm:ss'),
        url: f.getUrl()
      });
    }
    items.sort(function (a, b) { return b.createdAt.localeCompare(a.createdAt); });

    return ok_({ folderName: CONFIG.BACKUP_FOLDER, total: items.length, items: items });
  } catch (err) {
    return handleErr_('apiListBackups', err);
  }
}

function apiBackupNow(token) {
  var lock = LockService.getScriptLock();
  try {
    var sess = requireAuth_(token, 'settings');
    lock.waitLock(120000);

    var folder = getOrCreateFolder_(CONFIG.BACKUP_FOLDER);
    var cur = DriveApp.getFileById(CONFIG.SHEET_ID);
    var name = 'BACKUP_' + Utilities.formatDate(new Date(), CONFIG.TZ, 'yyyyMMdd_HHmmss') +
               '_' + cur.getName();
    var copy = cur.makeCopy(name, folder);

    writeAudit_(sess, 'BACKUP', 'ตั้งค่าระบบ', copy.getId(),
      'สำรองข้อมูลด้วยตนเอง: ' + name, 'SUCCESS');
    return ok_({ fileId: copy.getId(), name: name }, 'สำรองข้อมูลเรียบร้อยแล้ว');
  } catch (err) {
    return handleErr_('apiBackupNow', err);
  } finally {
    try { lock.releaseLock(); } catch (e) {}
  }
}

function apiDeleteBackup(token, fileId) {
  try {
    var sess = requireAuth_(token, 'settings');
    var f = DriveApp.getFileById(String(fileId));
    var name = f.getName();
    f.setTrashed(true);
    writeAudit_(sess, 'DELETE', 'ตั้งค่าระบบ', String(fileId),
      'ลบไฟล์สำรอง: ' + name, 'SUCCESS');
    return ok_(null, 'ลบไฟล์สำรองเรียบร้อยแล้ว');
  } catch (err) {
    return handleErr_('apiDeleteBackup', err);
  }
}

/* ============ จบตอนที่ 2/3 — ต่อด้วยตอนที่ 3/3 ได้ทันที ============ */
/* =====================================================================
 * 22) แปลงแถวใบงานเป็นอ็อบเจ็กต์
 * ===================================================================*/
function rowToWo_(r) {
  var zone = String(r.Zone || '').toUpperCase();
  var jobType = String(r.JobType || '').trim() || 'ซ่อมสัญญาณ';
  var meta = WO_TYPE_META[jobType] || WO_TYPE_META['ซ่อมสัญญาณ'];

  var done = toDateStr_(r.DoneDate);
  var cancel = toDateStr_(r.CancelDate);

  return {
    id: String(r.WorkOrderID),
    docNo: String(r.DocNo || ''),
    jobType: jobType,
    docTitle: meta.doc,
    dateLabel: meta.dateLabel,
    causeLabel: meta.causeLabel,
    reportDate: toDateStr_(r.ReportDate),
    targetDate: done || cancel,
    zone: zone,
    zoneName: ZONES[zone] ? ZONES[zone].name : (zone || '-'),
    customerCode: String(r.CustomerCode || ''),
    customerType: String(r.CustomerType || ''),
    customerName: String(r.CustomerName || ''),
    address: String(r.Address || ''),
    phone: String(r.Phone || ''),
    cause: String(r.Cause || ''),
    causeDetail: String(r.CauseDetail || ''),
    result: String(r.Result || ''),
    reporter: String(r.Reporter || ''),
    technician: String(r.Technician || ''),
    status: String(r.Status || ''),
    createdAt: String(r.CreatedAt || ''), createdBy: String(r.CreatedBy || ''),
    updatedAt: String(r.UpdatedAt || ''), updatedBy: String(r.UpdatedBy || '')
  };
}

function sumWorkOrders_(list) {
  var s = { total: list.length, pending: 0, progress: 0, done: 0, cancelled: 0, noTech: 0 };
  for (var i = 0; i < list.length; i++) {
    var w = list[i];
    if (w.status === 'รอดำเนินการ') s.pending++;
    else if (w.status === 'กำลังดำเนินการ') s.progress++;
    else if (w.status === 'เสร็จสิ้น') s.done++;
    else if (w.status === 'ยกเลิกใบงาน') s.cancelled++;
    if (!w.technician) s.noTech++;
  }
  return s;
}

function filterWorkOrders_(all, q) {
  var kw = sanitize_(q.keyword, 120).toLowerCase();
  var jobType = sanitize_(q.jobType, 60);
  var zone = String(q.zone || '').toUpperCase();
  var status = sanitize_(q.status, 40);
  var cause = sanitize_(q.cause, 120);
  var tech = sanitize_(q.technician, 120).toLowerCase();
  var from = toDateStr_(q.dateFrom);
  var to = toDateStr_(q.dateTo);

  return all.filter(function (w) {
    if (jobType && w.jobType !== jobType) return false;
    if (zone && w.zone !== zone) return false;
    if (status && w.status !== status) return false;
    if (cause && w.cause !== cause) return false;
    if (tech && w.technician.toLowerCase().indexOf(tech) === -1) return false;
    if (from && (!w.reportDate || w.reportDate < from)) return false;
    if (to && (!w.reportDate || w.reportDate > to)) return false;
    if (kw) {
      var hay = (w.docNo + ' ' + w.jobType + ' ' + w.customerCode + ' ' + w.customerName + ' ' +
                 w.customerType + ' ' + w.address + ' ' + w.phone + ' ' + w.cause + ' ' +
                 w.causeDetail + ' ' + w.result + ' ' + w.reporter + ' ' + w.technician + ' ' +
                 w.status).toLowerCase();
      if (hay.indexOf(kw) === -1) return false;
    }
    return true;
  });
}

/** สร้างเลขที่ใบงานตามประเภท : RP-2568-0001 */
function nextDocNo_(jobType, rows) {
  var meta = WO_TYPE_META[jobType] || WO_TYPE_META['ซ่อมสัญญาณ'];
  var yearBE = new Date().getFullYear() + 543;
  var prefix = meta.code + '-' + yearBE + '-';
  var max = 0;

  rows.forEach(function (r) {
    var no = String(r.DocNo || '');
    if (no.indexOf(prefix) !== 0) return;
    var n = parseInt(no.substring(prefix.length), 10);
    if (!isNaN(n) && n > max) max = n;
  });
  return prefix + ('0000' + (max + 1)).slice(-4);
}

/* =====================================================================
 * 23) โมดูลใบงานแจ้งช่าง
 * ===================================================================*/
function apiListWorkOrders(token, query) {
  try {
    requireAuth_(token, 'workorder.view');
    var q = query || {};

    var all = loadWoAll_();
    var summary = sumWorkOrders_(all);

    var techSet = {};
    all.forEach(function (w) { if (w.technician) techSet[w.technician] = 1; });

    var list = filterWorkOrders_(all, q);
    sortList_(list, sanitize_(q.sortBy, 40) || 'reportDate', q.sortDir || 'desc');

    var filtered = sumWorkOrders_(list);

    var pageSize = parseInt(q.pageSize, 10) || 25;
    if (pageSize < 1) pageSize = 25;
    if (pageSize > 500000) pageSize = 500000;
    var total = list.length;
    var pages = Math.max(1, Math.ceil(total / pageSize));
    var page = parseInt(q.page, 10) || 1;
    if (page < 1) page = 1;
    if (page > pages) page = pages;

    var items = list.slice((page - 1) * pageSize, (page - 1) * pageSize + pageSize);
    items.forEach(function (w, i) { w.seq = (page - 1) * pageSize + i + 1; });

    return ok_({
      items: items, total: total, page: page, pages: pages, pageSize: pageSize,
      summary: summary, filtered: filtered,
      technicians: Object.keys(techSet).sort()
    });
  } catch (err) {
    return handleErr_('apiListWorkOrders', err);
  }
}

function apiGetWorkOrder(token, workOrderId) {
  try {
    requireAuth_(token, 'workorder.view');
    var id = String(workOrderId || '').trim();
    var ws = readSheet_(SHEETS.WORKORDERS);
    for (var i = 0; i < ws.rows.length; i++) {
      if (String(ws.rows[i].WorkOrderID) === id && !isDeleted_(ws.rows[i].IsDeleted)) {
        return ok_(rowToWo_(ws.rows[i]));
      }
    }
    return fail_('ไม่พบใบงานที่ระบุ', 'NOT_FOUND');
  } catch (err) {
    return handleErr_('apiGetWorkOrder', err);
  }
}

function validateWorkOrder_(p) {
  var errs = [];
  if (WO_JOB_TYPES.indexOf(String(p.jobType)) === -1) errs.push('ประเภทใบงาน');
  if (!toDateStr_(p.reportDate)) errs.push('วันที่รับแจ้ง');
  if (!sanitize_(p.customerCode, 60)) errs.push('รหัสลูกค้า');
  if (!sanitize_(p.customerType, 80)) errs.push('ประเภทลูกค้า');
  if (!sanitize_(p.customerName, 200)) errs.push('ชื่อตึก/ซอย');
  if (!sanitize_(p.address, 300)) errs.push('เลขที่');

  var phone = sanitize_(p.phone, 40);
  if (!phone) errs.push('เบอร์โทรศัพท์');
  else if (!/^[0-9+\-() ]{6,25}$/.test(phone)) errs.push('รูปแบบเบอร์โทรศัพท์');

  if (!sanitize_(p.reporter, 150)) errs.push('ผู้แจ้ง');
  if (WO_STATUS.indexOf(String(p.status)) === -1) errs.push('สถานะใบงาน');

  var rd = toDateStr_(p.reportDate), td = toDateStr_(p.targetDate);
  if (rd && td && td < rd) errs.push('วันที่ดำเนินการต้องไม่ก่อนวันที่รับแจ้ง');

  return errs;
}

function apiSaveWorkOrder(token, payload) {
  var lock = LockService.getScriptLock();
  try {
    var p = payload || {};
    var isNew = !String(p.id || '').trim();
    var sess = requireAuth_(token, isNew ? 'workorder.create' : 'workorder.edit');

    var errs = validateWorkOrder_(p);
    if (errs.length) return fail_('กรุณาตรวจสอบข้อมูล : ' + errs.join(', '), 'VALIDATION');

    lock.waitLock(10000);

    var ws = readSheet_(SHEETS.WORKORDERS);
    var jobType = String(p.jobType);
    var targetDate = toDateStr_(p.targetDate);

    // วันที่ยกเลิกใช้เฉพาะใบงานยกเลิก/ระงับสัญญาณ
    var isCancelKind = (jobType === 'ยกเลิกสัญญาณ' || jobType === 'ระงับสัญญาณ');

    var data = {
      JobType: jobType,
      ReportDate: toDateStr_(p.reportDate),
      DoneDate: targetDate,
      CancelDate: isCancelKind ? targetDate : '',
      Zone: String(p.zone || '').toUpperCase(),
      CustomerCode: sanitize_(p.customerCode, 60),
      CustomerType: sanitize_(p.customerType, 80),
      CustomerName: sanitize_(p.customerName, 200),
      Address: sanitize_(p.address, 300),
      Phone: sanitize_(p.phone, 40),
      Cause: sanitize_(p.cause, 150),
      CauseDetail: sanitize_(p.causeDetail, 500),
      Result: sanitize_(p.result, 800),
      Reporter: sanitize_(p.reporter, 150),
      Technician: sanitize_(p.technician, 150),
      Status: String(p.status)
    };

    if (isNew) {
      var newId = uid_('WO');
      data.WorkOrderID = newId;
      data.DocNo = nextDocNo_(jobType, ws.rows);
      data.IsDeleted = 'FALSE';
      data.CreatedAt = nowStr_(); data.CreatedBy = sess.Username;
      data.UpdatedAt = nowStr_(); data.UpdatedBy = sess.Username;

      getSheetFast_(SHEETS.WORKORDERS).appendRow(objToRow_(SHEETS.WORKORDERS, data));
      invalidateSheet_(SHEETS.WORKORDERS);
      bustWoCache_();

      writeAudit_(sess, 'CREATE', 'ใบงานแจ้งช่าง', newId,
        'เปิดใบงาน ' + data.DocNo + ' (' + jobType + ') ลูกค้า ' + data.CustomerName, 'SUCCESS');
      return ok_({ id: newId, docNo: data.DocNo }, 'เปิดใบงาน ' + data.DocNo + ' เรียบร้อยแล้ว');
    }

    var curId = String(p.id).trim();
    var target = null;
    for (var i = 0; i < ws.rows.length; i++) {
      if (String(ws.rows[i].WorkOrderID) === curId && !isDeleted_(ws.rows[i].IsDeleted)) {
        target = ws.rows[i]; break;
      }
    }
    if (!target) return fail_('ไม่พบใบงานที่ต้องการแก้ไข', 'NOT_FOUND');

    var oldType = String(target.JobType || '').trim() || 'ซ่อมสัญญาณ';
    data.WorkOrderID = curId;
    // เปลี่ยนประเภทใบงาน → ออกเลขที่ใหม่ให้ตรงหมวด
    data.DocNo = (oldType === jobType) ? String(target.DocNo || '') : nextDocNo_(jobType, ws.rows);
    data.IsDeleted = 'FALSE';
    data.CreatedAt = target.CreatedAt; data.CreatedBy = target.CreatedBy;
    data.UpdatedAt = nowStr_();        data.UpdatedBy = sess.Username;

    ws.sheet.getRange(target._row, 1, 1, HEADERS.WorkOrders.length)
      .setValues([objToRow_(SHEETS.WORKORDERS, data)]);
    invalidateSheet_(SHEETS.WORKORDERS);
    bustWoCache_();

    writeAudit_(sess, 'UPDATE', 'ใบงานแจ้งช่าง', curId,
      'แก้ไขใบงาน ' + data.DocNo + ' (' + jobType + ')' +
      (oldType !== jobType ? ' เปลี่ยนประเภทจาก ' + oldType : ''), 'SUCCESS');
    return ok_({ id: curId, docNo: data.DocNo }, 'บันทึกใบงานเรียบร้อยแล้ว');
  } catch (err) {
    return handleErr_('apiSaveWorkOrder', err);
  } finally {
    try { lock.releaseLock(); } catch (e) {}
  }
}

function apiDeleteWorkOrder(token, workOrderId) {
  var lock = LockService.getScriptLock();
  try {
    var sess = requireAuth_(token, 'workorder.delete');
    var id = String(workOrderId || '').trim();
    if (!id) return fail_('ไม่พบรหัสใบงานที่ต้องการลบ', 'VALIDATION');

    lock.waitLock(8000);

    var ws = readSheet_(SHEETS.WORKORDERS);
    var target = null;
    for (var i = 0; i < ws.rows.length; i++) {
      if (String(ws.rows[i].WorkOrderID) === id && !isDeleted_(ws.rows[i].IsDeleted)) {
        target = ws.rows[i]; break;
      }
    }
    if (!target) return fail_('ไม่พบใบงานที่ระบุ', 'NOT_FOUND');

    var colDel = HEADERS.WorkOrders.indexOf('IsDeleted') + 1;
    ws.sheet.getRange(target._row, colDel).setValue('TRUE');
    ws.sheet.getRange(target._row, colDel + 3, 1, 2).setValues([[nowStr_(), sess.Username]]);
    invalidateSheet_(SHEETS.WORKORDERS);
    bustWoCache_();

    writeAudit_(sess, 'DELETE', 'ใบงานแจ้งช่าง', id,
      'ลบใบงาน ' + target.DocNo + ' (ย้ายไปถังขยะ)', 'SUCCESS');
    return ok_(null, 'ย้ายใบงานไปถังขยะเรียบร้อยแล้ว');
  } catch (err) {
    return handleErr_('apiDeleteWorkOrder', err);
  } finally {
    try { lock.releaseLock(); } catch (e) {}
  }
}

/* =====================================================================
 * 24) ส่งออก / พิมพ์ ใบงาน
 * ===================================================================*/
var WO_EXPORT_HEADERS = ['ลำดับ', 'เลขที่ใบงาน', 'ประเภทใบงาน', 'วันที่รับแจ้ง',
  'วันที่ดำเนินการ', 'โซนพื้นที่', 'รหัสลูกค้า', 'ประเภทลูกค้า', 'ชื่อตึก/ซอย', 'เลขที่',
  'เบอร์โทรศัพท์', 'สาเหตุ', 'รายละเอียดเพิ่มเติม', 'ผลการปฏิบัติงาน',
  'ผู้แจ้ง', 'ช่างผู้ทำ', 'สถานะ'];

function apiExportWorkOrders(token, query) {
  try {
    var sess = requireAuth_(token, 'workorder.export');
    var q = query || {};
    var list = filterWorkOrders_(loadWoAll_(), q);
    sortList_(list, sanitize_(q.sortBy, 40) || 'reportDate', q.sortDir || 'desc');

    var rows = list.map(function (w, i) {
      return [i + 1, w.docNo, w.jobType, w.reportDate, w.targetDate, w.zoneName,
        w.customerCode, w.customerType, w.customerName, w.address, w.phone,
        w.cause, w.causeDetail, w.result, w.reporter, w.technician, w.status];
    });

    writeAudit_(sess, 'EXPORT', 'ใบงานแจ้งช่าง', '-',
      'ส่งออกใบงาน ' + rows.length + ' รายการ', 'SUCCESS');
    return ok_({ headers: WO_EXPORT_HEADERS, rows: rows });
  } catch (err) {
    return handleErr_('apiExportWorkOrders', err);
  }
}

/** ใบงานรายฉบับ สำหรับพิมพ์กระดาษ 9 × 5.5 นิ้ว */
function apiGetWorkOrderDoc(token, workOrderId) {
  try {
    var sess = requireAuth_(token, 'workorder.view');
    var id = String(workOrderId || '').trim();
    var ws = readSheet_(SHEETS.WORKORDERS);

    for (var i = 0; i < ws.rows.length; i++) {
      if (String(ws.rows[i].WorkOrderID) !== id) continue;
      if (isDeleted_(ws.rows[i].IsDeleted)) break;
      var wo = rowToWo_(ws.rows[i]);
      writeAudit_(sess, 'PRINT', 'ใบงานแจ้งช่าง', id,
        'พิมพ์ใบงาน ' + wo.docNo + ' (' + wo.jobType + ')', 'SUCCESS');
      return ok_({
        wo: wo, settings: publicSettings_(),
        printedBy: sess.FullName, printedAt: nowStr_()
      });
    }
    return fail_('ไม่พบใบงานที่ระบุ', 'NOT_FOUND');
  } catch (err) {
    return handleErr_('apiGetWorkOrderDoc', err);
  }
}

/** รายงานรวมใบงาน สำหรับพิมพ์ A4 แนวนอน */
function apiGetWorkOrderPrintList(token, query) {
  try {
    var sess = requireAuth_(token, 'workorder.view');
    var q = query || {};
    var list = filterWorkOrders_(loadWoAll_(), q);
    sortList_(list, sanitize_(q.sortBy, 40) || 'reportDate', q.sortDir || 'desc');

    var zoneF = String(q.zone || '').toUpperCase();
    return ok_({
      items: list, summary: sumWorkOrders_(list),
      filters: {
        jobType: sanitize_(q.jobType, 60),
        status: sanitize_(q.status, 40),
        zone: zoneF ? (ZONES[zoneF] ? ZONES[zoneF].name : zoneF) : '',
        cause: sanitize_(q.cause, 120),
        technician: sanitize_(q.technician, 120),
        keyword: sanitize_(q.keyword, 120),
        dateFrom: toDateStr_(q.dateFrom), dateTo: toDateStr_(q.dateTo)
      },
      settings: publicSettings_(),
      printedBy: sess.FullName, printedAt: nowStr_()
    });
  } catch (err) {
    return handleErr_('apiGetWorkOrderPrintList', err);
  }
}

/* =====================================================================
 * 25) ตรวจสอบและกู้คืนไฟล์สำรอง
 * ===================================================================*/
var RESTORE_SETS = [
  { key: 'customers',  sheet: SHEETS.CUSTOMERS,  label: 'ทะเบียนประวัติลูกค้า' },
  { key: 'workorders', sheet: SHEETS.WORKORDERS, label: 'ใบงานแจ้งช่าง' },
  { key: 'users',      sheet: SHEETS.USERS,      label: 'บัญชีผู้ใช้งาน' },
  { key: 'settings',   sheet: SHEETS.SETTINGS,   label: 'การตั้งค่าระบบ' },
  { key: 'audit',      sheet: SHEETS.AUDIT,      label: 'ประวัติการใช้งาน' }
];

function countRows_(sheet) {
  if (!sheet) return 0;
  var n = sheet.getLastRow() - 1;
  return n > 0 ? n : 0;
}

function apiInspectBackup(token, fileId) {
  try {
    requireAuth_(token, 'settings');
    var id = String(fileId || '').trim();
    if (!id) return fail_('ไม่พบไฟล์สำรองที่ระบุ', 'VALIDATION');

    var file = DriveApp.getFileById(id);
    var bk = SpreadsheetApp.openById(id);
    var cur = getSS_();

    var sheets = RESTORE_SETS.map(function (s) {
      var bs = bk.getSheetByName(s.sheet);
      var cs = cur.getSheetByName(s.sheet);
      var b = countRows_(bs), c = countRows_(cs);
      return {
        key: s.key, label: s.label, exists: !!bs,
        backupRows: b, currentRows: c, diff: b - c
      };
    });

    return ok_({
      fileId: id, fileName: file.getName(),
      createdAt: Utilities.formatDate(file.getDateCreated(), CONFIG.TZ, 'yyyy-MM-dd HH:mm:ss'),
      sheets: sheets
    });
  } catch (err) {
    return handleErr_('apiInspectBackup', err);
  }
}

function apiRestoreBackup(token, payload) {
  var lock = LockService.getScriptLock();
  try {
    var sess = requireAuth_(token, 'settings');
    var p = payload || {};
    var fileId = String(p.fileId || '').trim();
    var picks = p.sheets || [];
    var confirmText = String(p.confirmText || '').trim();

    if (!fileId) return fail_('ไม่พบไฟล์สำรองที่ระบุ', 'VALIDATION');
    if (!picks.length) return fail_('กรุณาเลือกชุดข้อมูลที่ต้องการกู้คืน', 'VALIDATION');
    if (confirmText !== 'กู้คืนข้อมูล') return fail_('ข้อความยืนยันไม่ถูกต้อง', 'VALIDATION');

    lock.waitLock(120000);

    // 1) สร้างจุดกู้คืนอัตโนมัติก่อนเสมอ
    var folder = getOrCreateFolder_(CONFIG.BACKUP_FOLDER);
    var safeName = 'PRE-RESTORE_' +
      Utilities.formatDate(new Date(), CONFIG.TZ, 'yyyyMMdd_HHmmss') + '_' +
      DriveApp.getFileById(CONFIG.SHEET_ID).getName();
    DriveApp.getFileById(CONFIG.SHEET_ID).makeCopy(safeName, folder);

    // 2) เขียนทับชุดข้อมูลที่เลือก
    var bk = SpreadsheetApp.openById(fileId);
    var cur = getSS_();
    var done = [], skipped = [], needRelogin = false;

    RESTORE_SETS.forEach(function (s) {
      if (picks.indexOf(s.key) === -1) return;

      var bs = bk.getSheetByName(s.sheet);
      if (!bs) { skipped.push(s.label); return; }

      var cs = cur.getSheetByName(s.sheet);
      if (!cs) cs = ensureSheet_(cur, s.sheet);

      var headers = HEADERS[s.sheet];
      var lastRow = bs.getLastRow();
      var data = (lastRow >= 2)
        ? bs.getRange(2, 1, lastRow - 1, headers.length).getValues()
        : [];

      if (cs.getLastRow() > 1) {
        cs.getRange(2, 1, cs.getLastRow() - 1, cs.getLastColumn()).clearContent();
      }
      if (data.length) {
        cs.getRange(2, 1, data.length, headers.length).setValues(data);
      }

      invalidateSheet_(s.sheet);
      done.push(s.label + ' (' + nfSrv_(data.length) + ' แถว)');
      if (s.key === 'users' || s.key === 'settings') needRelogin = true;
    });

    // 3) ล้างเซสชันทั้งหมดเมื่อกู้คืนบัญชีผู้ใช้
    if (needRelogin) {
      try {
        var ses = getSheetFast_(SHEETS.SESSIONS);
        if (ses.getLastRow() > 1) {
          ses.getRange(2, 1, ses.getLastRow() - 1, ses.getLastColumn()).clearContent();
        }
        invalidateSheet_(SHEETS.SESSIONS);
      } catch (e) { logError_('apiRestoreBackup.sessions', e); }
    }

    clearSettingsCache_();
    bustAllCache_();
    zonesBust_();                 // ⚡ เพิ่มบรรทัดนี้ — โหลดโซนใหม่หลังกู้คืน
    SpreadsheetApp.flush();


    writeAudit_(sess, 'RESTORE', 'ตั้งค่าระบบ', fileId,
      'กู้คืนข้อมูลจากไฟล์สำรอง — ' + done.join(' · ') +
      (skipped.length ? ' | ข้าม: ' + skipped.join(' · ') : ''),
      skipped.length ? 'PARTIAL' : 'SUCCESS');

    return ok_({
      restored: done, skipped: skipped,
      safetyBackup: safeName, needRelogin: needRelogin
    }, 'กู้คืนข้อมูลเรียบร้อย ' + done.length + ' ชุด');
  } catch (err) {
    return handleErr_('apiRestoreBackup', err);
  } finally {
    try { lock.releaseLock(); } catch (e) {}
  }
}

/* =====================================================================
 * 26) เครื่องมือผู้ดูแลระบบ (รันจาก Apps Script Editor เท่านั้น)
 * ===================================================================*/

/** รีเซ็ตรหัสผ่านผู้ดูแลระบบ เมื่อเข้าระบบไม่ได้ */
function adminResetPassword() {
  var USERNAME = 'nnc';                 // ⚠️ แก้ชื่อผู้ใช้ที่ต้องการ
  var NEW_PASSWORD = 'cable025292000';  // ⚠️ แก้รหัสผ่านใหม่

  var us = readSheet_(SHEETS.USERS);
  var u = findUserByName_(USERNAME);
  if (!u) { Logger.log('ไม่พบบัญชี ' + USERNAME); return 'ไม่พบบัญชี'; }

  var salt = Utilities.getUuid().replace(/-/g, '');
  us.sheet.getRange(u._row, 3, 1, 2).setValues([[hashPassword_(NEW_PASSWORD, salt), salt]]);
  us.sheet.getRange(u._row, 7).setValue('ACTIVE');
  us.sheet.getRange(u._row, 9, 1, 2).setValues([[0, '']]);
  invalidateSheet_(SHEETS.USERS);
  SpreadsheetApp.flush();

  Logger.log('รีเซ็ตรหัสผ่าน ' + USERNAME + ' เรียบร้อย');
  return 'รีเซ็ตรหัสผ่านเรียบร้อย';
}

/** ล้างแคชทั้งระบบ (ใช้เมื่อข้อมูลบนหน้าจอไม่อัปเดต) */
function adminClearCache() {
  bustAllCache_();
  clearSettingsCache_();
  Logger.log('ล้างแคชทั้งระบบเรียบร้อย');
  return 'ล้างแคชเรียบร้อย';
}

/** ล้างเซสชันทั้งหมด (บังคับให้ทุกคนเข้าสู่ระบบใหม่) */
function adminClearSessions() {
  var sh = getSheetFast_(SHEETS.SESSIONS);
  var n = Math.max(0, sh.getLastRow() - 1);
  if (n > 0) sh.getRange(2, 1, n, sh.getLastColumn()).clearContent();
  invalidateSheet_(SHEETS.SESSIONS);
  SpreadsheetApp.flush();
  Logger.log('ล้างเซสชัน ' + n + ' รายการ');
  return 'ล้างเซสชัน ' + n + ' รายการ';
}

/** จัดลำดับ Seq ของลูกค้าใหม่ทุกโซน */
function adminRebuildSeq() {
  var cs = readSheet_(SHEETS.CUSTOMERS);
  var col = HEADERS.Customers.indexOf('Seq') + 1;
  var counter = {}, n = 0;

  cs.rows.forEach(function (r) {
    if (isDeleted_(r.IsDeleted)) return;
    var z = String(r.Zone).toUpperCase();
    counter[z] = (counter[z] || 0) + 1;
    if (Number(r.Seq) !== counter[z]) {
      cs.sheet.getRange(r._row, col).setValue(counter[z]);
      n++;
    }
  });

  invalidateSheet_(SHEETS.CUSTOMERS);
  bustAllCache_();
  SpreadsheetApp.flush();
  Logger.log('จัดลำดับใหม่ ' + n + ' รายการ');
  return 'จัดลำดับใหม่ ' + n + ' รายการ';
}

/** ตรวจสุขภาพระบบ */
function adminHealthCheck() {
  var out = [];
  out.push('=== ตรวจสุขภาพระบบ ' + nowStr_() + ' ===');

  try {
    var ss = getSS_();
    out.push('ไฟล์ข้อมูล : ' + ss.getName());
  } catch (e) {
    out.push('❌ เปิดไฟล์ข้อมูลไม่ได้ — ตรวจสอบ CONFIG.SHEET_ID');
    Logger.log(out.join('\n'));
    return out.join('\n');
  }

  Object.keys(SHEETS).forEach(function (k) {
    var name = SHEETS[k];
    var st = readSheet_(name);
    var active = 0, deleted = 0;
    st.rows.forEach(function (r) {
      if (r.IsDeleted !== undefined) { if (isDeleted_(r.IsDeleted)) deleted++; else active++; }
      else active++;
    });
    out.push('• ' + name + ' : ทั้งหมด ' + st.rows.length +
             ' แถว | ใช้งาน ' + active + (deleted ? ' | ถังขยะ ' + deleted : ''));
  });

  var admins = 0;
  readSheet_(SHEETS.USERS).rows.forEach(function (r) {
    if (String(r.Role) === 'ADMIN' && String(r.Status) === 'ACTIVE') admins++;
  });
  out.push(admins > 0 ? '• ผู้ดูแลระบบที่ใช้งานได้ : ' + admins + ' บัญชี'
                      : '⚠️ ไม่มีผู้ดูแลระบบที่ใช้งานได้ — รัน adminResetPassword()');

  var noType = 0;
  readSheet_(SHEETS.WORKORDERS).rows.forEach(function (r) {
    if (!String(r.JobType || '').trim()) noType++;
  });
  out.push(noType ? '⚠️ ใบงานที่ยังไม่มีประเภท : ' + noType + ' — รัน migrateWorkOrderJobType()'
                  : '• ใบงานมีประเภทครบทุกรายการ');

  try {
    var f = getOrCreateFolder_(CONFIG.BACKUP_FOLDER);
    var c = 0, it = f.getFiles();
    while (it.hasNext() && c < 200) { it.next(); c++; }
    out.push('• ไฟล์สำรองในระบบ : ' + c + ' ไฟล์');
  } catch (e) {
    out.push('⚠️ เข้าถึงโฟลเดอร์สำรองไม่ได้');
  }

  var trig = 0;
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'dailyBackup') trig++;
  });
  out.push(trig ? '• ทริกเกอร์สำรองอัตโนมัติ : ติดตั้งแล้ว'
                : '⚠️ ยังไม่ได้ติดตั้งทริกเกอร์ — รัน installDailyBackupTrigger()');

  var msg = out.join('\n');
  Logger.log(msg);
  return msg;
}

/* =====================================================================
 * จบไฟล์ Code.gs — เวอร์ชัน Performance Edition
 * ===================================================================*/
 /* =====================================================================
/* =====================================================================
 * ===================  โมดูลโซนพื้นที่ (Dynamic Zones)  ===================
 * เวอร์ชัน 4.0.1 — วางบล็อกนี้ไว้ท้ายไฟล์เสมอ
 * ===================================================================*/

var ZONE_SHEET_NAME = SHEETS.ZONES;   // ⚡ เดิมคือ 'Zones'
var ZONE_CACHE_KEY  = 'ZONES_META_V1';
var ZONE_HEAD = ['ZoneID', 'Code', 'Name', 'Area', 'Types', 'Packages',
                 'SortOrder', 'Status', 'CreatedAt', 'CreatedBy', 'UpdatedAt', 'UpdatedBy'];

var ZONE_TYPE_DEF = ['หอพัก/อพาร์ทเมนท์', 'บ้าน/ทาวน์เฮ้าส์', 'ร้านค้า/สำนักงาน', 'อื่น ๆ'];
var ZONE_PKG_DEF  = ['รายเดือน', 'รายปี', 'ฟรี'];

var ZONE_SEED = [
  { code: 'A', name: 'โซน A หมู่บ้านนครชัย',   area: 'อ.คลองหลวง จ.ปทุมธานี' },
  { code: 'B', name: 'โซน B ประตูน้ำพระอินทร์', area: 'อ.วังน้อย จ.พระนครศรีอยุธยา' },
  { code: 'C', name: 'โซน C หมู่บ้านรณชัย',     area: 'อ.คลองหลวง จ.ปทุมธานี' },
  { code: 'D', name: 'โซน D วัดคุณหญิงส้มจีน',  area: 'อ.คลองหลวง จ.ปทุมธานี' }
];

/* ---------------------------------------------------------------------
 * ลงทะเบียนชีต Zones เข้าระบบสำรอง/กู้คืน (ข้อ 3)
 * -------------------------------------------------------------------*/
(function registerZonesSheet_() {
  try { SHEETS.ZONES = ZONE_SHEET_NAME; } catch (e) {}
  try { HEADERS[ZONE_SHEET_NAME] = ZONE_HEAD; } catch (e) {}
  try {
    var has = RESTORE_SETS.some(function (s) { return s.key === 'zones'; });
    if (!has) RESTORE_SETS.splice(2, 0,
      { key: 'zones', sheet: ZONE_SHEET_NAME, label: 'โซนพื้นที่' });
  } catch (e) {}
})();

/* ---------------------------------------------------------------------
 * ชีตและการอ่านข้อมูล
 * -------------------------------------------------------------------*/
function zonesSheet_() {
  var ss = getSS_();
  var sh = ss.getSheetByName(ZONE_SHEET_NAME);
  if (!sh) {
    sh = ss.insertSheet(ZONE_SHEET_NAME);
    sh.getRange(1, 1, 1, ZONE_HEAD.length).setValues([ZONE_HEAD])
      .setFontWeight('bold').setBackground('#E6F4F5');
    sh.setFrozenRows(1);
    sh.setColumnWidth(1, 120); sh.setColumnWidth(3, 230); sh.setColumnWidth(4, 200);
  }
  if (sh.getLastRow() < 2) {
    var now = new Date(), rows = [];
    ZONE_SEED.forEach(function (z, i) {
      rows.push(['ZN' + Utilities.getUuid().substring(0, 8).toUpperCase(),
        z.code, z.name, z.area, ZONE_TYPE_DEF.join('|'), ZONE_PKG_DEF.join('|'),
        i + 1, 'ACTIVE', now, 'SYSTEM', now, 'SYSTEM']);
    });
    sh.getRange(2, 1, rows.length, ZONE_HEAD.length).setValues(rows);
  }
  return sh;
}

function zonesReadRaw_() {
  var sh = zonesSheet_();
  if (sh.getLastRow() < 2) return [];
  var v = sh.getRange(2, 1, sh.getLastRow() - 1, ZONE_HEAD.length).getValues();
  var out = [];
  v.forEach(function (r, i) {
    if (!String(r[0]).trim() || !String(r[1]).trim()) return;
    out.push({
      row: i + 2,
      zoneId: String(r[0]).trim(),
      code: String(r[1]).trim().toUpperCase(),
      name: String(r[2]).trim(),
      area: String(r[3]).trim(),
      types: String(r[4] || '').split('|').map(function (x) { return String(x).trim(); })
                                .filter(function (x) { return x; }),
      packages: String(r[5] || '').split('|').map(function (x) { return String(x).trim(); })
                                   .filter(function (x) { return x; }),
      sortOrder: Number(r[6]) || 999,
      status: String(r[7] || 'ACTIVE').trim().toUpperCase()
    });
  });
  out.sort(function (a, b) { return a.sortOrder - b.sortOrder; });
  return out;
}

function zonesToMeta_(list) {
  var m = {};
  (list || []).forEach(function (z) {
    if (z.status !== 'ACTIVE') return;
    m[z.code] = {
      code: z.code, name: z.name, area: z.area,
      types: z.types.length ? z.types : ZONE_TYPE_DEF,
      packages: z.packages.length ? z.packages : ZONE_PKG_DEF,
      order: z.sortOrder
    };
  });
  return m;
}

function zonesFallback_() {
  var m = {};
  ZONE_SEED.forEach(function (z, i) {
    m[z.code] = { code: z.code, name: z.name, area: z.area,
                  types: ZONE_TYPE_DEF, packages: ZONE_PKG_DEF, order: i + 1 };
  });
  return m;
}

/** โหลด ZONES พร้อมแคช 6 ชั่วโมง — ถ้าอ่านไม่ได้จะใช้โซนตั้งต้นแทน ระบบไม่ล่ม */
function zonesLoad_() {
  try {
    var c = cacheSrv_().get(ZONE_CACHE_KEY);
    if (c) return JSON.parse(c);
  } catch (e) {}
  try {
    var meta = zonesToMeta_(zonesReadRaw_());
    if (!Object.keys(meta).length) meta = zonesFallback_();
    try { cacheSrv_().put(ZONE_CACHE_KEY, JSON.stringify(meta), 21600); } catch (e2) {}
    return meta;
  } catch (e3) {
    return zonesFallback_();
  }
}

/** ล้างแคชโซน + แคชข้อมูลลูกค้า/ใบงาน ทั้งรหัสเก่าและรหัสใหม่ */
function zonesBust_() {
  try { bustAllCache_(); } catch (e) {}
  try { cacheSrv_().remove(ZONE_CACHE_KEY); } catch (e) {}
  ZONES = zonesLoad_();
  try { bustAllCache_(); } catch (e) {}
  [SHEETS.CUSTOMERS, SHEETS.WORKORDERS, ZONE_SHEET_NAME].forEach(function (n) {
    try { invalidateSheet_(n); } catch (e) {}
  });
}

/* ---------------------------------------------------------------------
 * นับข้อมูลที่ผูกกับโซน — อ่านครั้งเดียวได้ทุกโซน (ข้อ 6 + 14)
 * -------------------------------------------------------------------*/
function zoneUsageEmpty_() {
  return { customers: 0, workOrders: 0, trashed: 0, totalRows: 0 };
}

function zoneUsageAll_() {
  var res = {};
  function scan_(sheetName, field) {
    try {
      var sh = getSheetFast_(sheetName);
      if (!sh || sh.getLastRow() < 2) return;
      var last = sh.getLastColumn();
      var head = sh.getRange(1, 1, 1, last).getValues()[0]
                   .map(function (h) { return String(h).trim().toLowerCase(); });
      var zi = head.indexOf('zone'), di = head.indexOf('isdeleted');
      if (zi < 0) return;
      var v = sh.getRange(2, 1, sh.getLastRow() - 1, last).getValues();
      for (var i = 0; i < v.length; i++) {
        var code = String(v[i][zi]).trim().toUpperCase();
        if (!code) continue;
        var o = res[code] || (res[code] = zoneUsageEmpty_());
        o.totalRows++;
        var del = di >= 0 && String(v[i][di]).trim().toUpperCase() === 'TRUE';
        if (del) o.trashed++; else o[field]++;
      }
    } catch (e) { try { logError_('zoneUsageAll_', e); } catch (x) {} }
  }
  scan_(SHEETS.CUSTOMERS, 'customers');
  scan_(SHEETS.WORKORDERS, 'workOrders');
  return res;
}

function zoneUsage_(code) {
  function count_(sheetName) {
    try {
      var sh = getSheetFast_(sheetName);
      if (!sh || sh.getLastRow() < 2) return { live: 0, all: 0 };
      var last = sh.getLastColumn();
      var head = sh.getRange(1, 1, 1, last).getValues()[0];
      var zi = -1, si = -1;
      for (var k = 0; k < head.length; k++) {
        var h = String(head[k]).trim().toLowerCase();
        if (h === 'zone') zi = k;
        if (h === 'status' || h === 'recordstatus') si = k;
      }
      if (zi < 0) return { live: 0, all: 0 };
      var v = sh.getRange(2, 1, sh.getLastRow() - 1, last).getValues();
      var live = 0, all = 0;
      for (var i = 0; i < v.length; i++) {
        if (String(v[i][zi]).trim() !== code) continue;
        all++;
        if (si < 0 || String(v[i][si]).trim().toUpperCase() !== 'DELETED') live++;
      }
      return { live: live, all: all };
    } catch (e) { return { live: 0, all: 0 }; }
  }
  var c = count_(SHEETS.CUSTOMERS), w = count_(SHEETS.WORKORDERS);
  return {
    customers: c.live, workOrders: w.live,
    totalRows: c.all + w.all        // ใช้ตัดสินใจตอนลบ
  };
}

/** เปลี่ยนรหัสโซนในทุกแถว รวมรายการในถังขยะ */
function zoneCascade_(oldCode, newCode) {
  var moved = 0;
  [SHEETS.CUSTOMERS, SHEETS.WORKORDERS].forEach(function (name) {
    try {
      var sh = getSheetFast_(name);
      if (!sh || sh.getLastRow() < 2) return;
      var head = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0]
                   .map(function (h) { return String(h).trim().toLowerCase(); });
      var zi = head.indexOf('zone'); if (zi < 0) return;
      var rg = sh.getRange(2, zi + 1, sh.getLastRow() - 1, 1);
      var v = rg.getValues(), hit = false;
      for (var i = 0; i < v.length; i++) {
        if (String(v[i][0]).trim().toUpperCase() === oldCode) {
          v[i][0] = newCode; hit = true; moved++;
        }
      }
      if (hit) rg.setValues(v);
    } catch (e) { try { logError_('zoneCascade_', e); } catch (x) {} }
  });
  return moved;
}

/* ---------------------------------------------------------------------
 * API
 * -------------------------------------------------------------------*/
function apiListZones(token) {
  try {
    requireAuth_(token, 'settings');
    var usage = zoneUsageAll_();
    var items = zonesReadRaw_().map(function (z) {
      var u = usage[z.code] || zoneUsageEmpty_();
      z.customers = u.customers;
      z.workOrders = u.workOrders;
      z.trashed = u.trashed;
      z.totalRows = u.totalRows;
      return z;
    });
    return ok_({ items: items, total: items.length });
  } catch (e) { return handleErr_('apiListZones', e); }
}

function apiSaveZone(token, p) {
  var lock = LockService.getScriptLock();
  try {
    var sess = requireAuth_(token, 'settings');
    p = p || {};
    var code = String(p.code || '').trim().toUpperCase();
    var name = String(p.name || '').trim();

    if (!code) return fail_('กรุณากรอกรหัสโซน', 'VALIDATION');
    if (!/^[A-Z0-9_-]{1,10}$/.test(code))
      return fail_('รหัสโซนใช้ได้เฉพาะ A-Z 0-9 _ - และยาวไม่เกิน 10 ตัวอักษร', 'VALIDATION');
    if (!name) return fail_('กรุณากรอกชื่อโซน', 'VALIDATION');

    lock.waitLock(30000);
    var sh = zonesSheet_(), all = zonesReadRaw_();
    var dup = all.filter(function (z) { return z.code === code && z.zoneId !== p.zoneId; });
    if (dup.length) return fail_('รหัสโซน "' + code + '" ถูกใช้ไปแล้ว', 'DUPLICATE');

    var now = new Date();
    var clean = function (arr) {
      return (arr || []).map(function (x) { return String(x).trim(); })
                        .filter(function (x) { return x; });
    };
    var types = clean(p.types), pkgs = clean(p.packages);
    var status = String(p.status || 'ACTIVE').toUpperCase() === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE';

    if (p.zoneId) {
      var cur = all.filter(function (z) { return z.zoneId === p.zoneId; })[0];
      if (!cur) return fail_('ไม่พบโซนที่ต้องการแก้ไข', 'NOT_FOUND');

      if (status === 'INACTIVE' && cur.status === 'ACTIVE') {
        var act = all.filter(function (z) { return z.status === 'ACTIVE'; });
        if (act.length <= 1) return fail_('ต้องมีโซนที่เปิดใช้งานอย่างน้อย 1 โซน', 'VALIDATION');
      }

      var moved = (cur.code !== code) ? zoneCascade_(cur.code, code) : 0;

      sh.getRange(cur.row, 2, 1, 7).setValues([[
        code, name, String(p.area || '').trim(),
        (types.length ? types : ZONE_TYPE_DEF).join('|'),
        (pkgs.length ? pkgs : ZONE_PKG_DEF).join('|'),
        Number(p.sortOrder) || cur.sortOrder, status
      ]]);
      sh.getRange(cur.row, 11, 1, 2).setValues([[now, sess.Username]]);

      zonesBust_();
      writeAudit_(sess, 'UPDATE', 'โซนพื้นที่', code,
        'แก้ไขโซน ' + code + ' : ' + name +
        (moved ? (' • ย้ายข้อมูล ' + moved + ' รายการจากรหัส ' + cur.code) : ''), 'SUCCESS');
      return ok_({ zoneId: p.zoneId, moved: moved }, 'แก้ไขโซน ' + name + ' เรียบร้อย');
    }

    var id = 'ZN' + Utilities.getUuid().substring(0, 8).toUpperCase();
    var order = all.length
      ? Math.max.apply(null, all.map(function (z) { return z.sortOrder; })) + 1 : 1;

    sh.appendRow([id, code, name, String(p.area || '').trim(),
      (types.length ? types : ZONE_TYPE_DEF).join('|'),
      (pkgs.length ? pkgs : ZONE_PKG_DEF).join('|'),
      order, status, now, sess.Username, now, sess.Username]);

    zonesBust_();
    writeAudit_(sess, 'CREATE', 'โซนพื้นที่', code, 'เพิ่มโซน ' + code + ' : ' + name, 'SUCCESS');
    return ok_({ zoneId: id }, 'เพิ่มโซน ' + name + ' เรียบร้อย');

  } catch (e) { return handleErr_('apiSaveZone', e); }
  finally { try { lock.releaseLock(); } catch (x) {} }
}

function apiDeleteZone(token, zoneId, moveToCode) {
  var total = u.totalRows;
  try {
    var sess = requireAuth_(token, 'settings');
    lock.waitLock(60000);

    var all = zonesReadRaw_();
    if (all.length <= 1) return fail_('ต้องมีโซนอย่างน้อย 1 โซนในระบบ', 'VALIDATION');

    var z = all.filter(function (x) { return x.zoneId === zoneId; })[0];
    if (!z) return fail_('ไม่พบโซนที่ต้องการลบ', 'NOT_FOUND');

    var u = zoneUsage_(z.code), moved = 0;
    var t = String(moveToCode || '').trim().toUpperCase();

    if (u.totalRows > 0) {
      if (!t) return fail_('โซนนี้มีข้อมูลผูกอยู่ ' + u.totalRows +
        ' รายการ (รวมในถังขยะ ' + u.trashed + ') กรุณาเลือกโซนปลายทางก่อนลบ', 'VALIDATION');
      if (t === z.code) return fail_('โซนปลายทางต้องไม่ใช่โซนเดียวกัน', 'VALIDATION');
      if (!all.filter(function (x) { return x.code === t; }).length)
        return fail_('ไม่พบโซนปลายทางที่เลือก', 'VALIDATION');
      moved = zoneCascade_(z.code, t);
    }

    zonesSheet_().deleteRow(z.row);
    zonesBust_();

    writeAudit_(sess, 'DELETE', 'โซนพื้นที่', z.code,
      'ลบโซน ' + z.code + ' : ' + z.name +
      (moved ? (' • ย้ายข้อมูล ' + moved + ' รายการไปโซน ' + t) : ''), 'SUCCESS');

    return ok_({ moved: moved }, 'ลบโซน ' + z.name + ' เรียบร้อย' +
      (moved ? (' และย้ายข้อมูล ' + moved + ' รายการแล้ว') : ''));

  } catch (e) { return handleErr_('apiDeleteZone', e); }
  finally { try { lock.releaseLock(); } catch (x) {} }
}

function apiReorderZones(token, ids) {
  var lock = LockService.getScriptLock();
  try {
    var sess = requireAuth_(token, 'settings');
    lock.waitLock(30000);
    var sh = zonesSheet_(), all = zonesReadRaw_();
    var map = {};
    all.forEach(function (z) { map[z.zoneId] = z; });
    (ids || []).forEach(function (id, i) {
      if (map[id]) sh.getRange(map[id].row, 7).setValue(i + 1);
    });
    zonesBust_();
    writeAudit_(sess, 'UPDATE', 'โซนพื้นที่', '', 'จัดลำดับโซนใหม่', 'SUCCESS');
    return ok_({}, 'จัดลำดับโซนเรียบร้อย');
  } catch (e) { return handleErr_('apiReorderZones', e); }
  finally { try { lock.releaseLock(); } catch (x) {} }
}

/** ข้อ 5 — ตรวจแค่เซสชัน ไม่ผูกกับสิทธิ์ dashboard */
function apiRefreshMeta(token) {
  try {
    requireAuth_(token);          // ⚡ ตรวจแค่เซสชัน ไม่ต้องขอสิทธิ์เฉพาะ
    ZONES = zonesLoad_();
    return ok_(buildMeta_());
  } catch (e) { return handleErr_('apiRefreshMeta', e); }
}
/** แปลงค่าเวลาทุกรูปแบบให้เป็น 'yyyy-MM-dd HH:mm:ss' */
function auditTs_(v) {
  if (v === null || v === undefined || v === '') return '';
  if (Object.prototype.toString.call(v) === '[object Date]') {
    return isNaN(v.getTime()) ? '' : Utilities.formatDate(v, CONFIG.TZ, 'yyyy-MM-dd HH:mm:ss');
  }
  var s = String(v).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s;
  var d = new Date(s.replace(/\s*\(.*\)\s*$/, ''));
  return isNaN(d.getTime()) ? s : Utilities.formatDate(d, CONFIG.TZ, 'yyyy-MM-dd HH:mm:ss');
}

/** รันครั้งเดียว : แปลงเวลาเดิมในชีตเป็นข้อความ และล็อกคอลัมน์ไม่ให้ Sheets แปลงอีก */
function fixAuditTimestamps() {
  var sh = getSS_().getSheetByName(SHEETS.AUDIT);
  sh.getRange('B:B').setNumberFormat('@');
  var n = sh.getLastRow() - 1;
  if (n < 1) { Logger.log('ไม่มีข้อมูล'); return; }
  var rg = sh.getRange(2, 2, n, 1);
  var v = rg.getValues().map(function (r) { return [auditTs_(r[0])]; });
  rg.setValues(v);
  invalidateSheet_(SHEETS.AUDIT);
  SpreadsheetApp.flush();
  Logger.log('แปลงเวลาเรียบร้อย ' + n + ' แถว');
}
/* ---------------------------------------------------------------------
 * ประกาศ ZONES — ต้องเป็นบรรทัดสุดท้ายของไฟล์เสมอ
 * -------------------------------------------------------------------*/
/* =====================================================================
 * ===========  โมดูลจำกัด 1 บัญชี = 1 เครื่อง (Single Session)  ===========
 * เวอร์ชัน 4.0.4 — วางเหนือบรรทัด var ZONES = zonesLoad_();
 * ===================================================================*/
var SINGLE_SESSION_ON = true;            // ตั้งเป็น false เพื่อปิดฟีเจอร์นี้ชั่วคราว
var LIVE_TTL_MS   = 3 * 60 * 1000;       // ไม่มีสัญญาณเกิน 3 นาที ถือว่าเครื่องเดิมปิดไปแล้ว
var LIVE_TOUCH_MS = 30 * 1000;           // อัปเดตเวลาใช้งานล่าสุดทุก 30 วินาที

/* ---------- ที่เก็บ "เครื่องที่ถือสิทธิ์อยู่" ของแต่ละบัญชี ---------- */
function liveUid_(s) { return String((s && s.Username) || '').trim().toLowerCase(); }
function liveKey_(uid) { return 'LIVE_' + uid; }

function liveGet_(uid) {
  if (!uid) return null;
  try {
    var v = PropertiesService.getScriptProperties().getProperty(liveKey_(uid));
    return v ? JSON.parse(v) : null;
  } catch (e) { return null; }
}
function liveSet_(uid, o) {
  if (!uid) return;
  try { PropertiesService.getScriptProperties().setProperty(liveKey_(uid), JSON.stringify(o)); } catch (e) {}
}
function liveDel_(uid, token) {
  var l = liveGet_(uid);
  if (l && (!token || l.t === token)) {
    try { PropertiesService.getScriptProperties().deleteProperty(liveKey_(uid)); } catch (e) {}
  }
}

/* ---------- จดจำว่าโทเคนนี้ถูกเตะออกเพราะอะไร (ใช้แสดงข้อความ) ---------- */
function markKicked_(token, dev) {
  try {
    CacheService.getScriptCache().put('KICK_' + token,
      JSON.stringify({ dev: dev || '', at: Date.now() }), 21600);
  } catch (e) {}
}
function getKicked_(token) {
  try {
    var v = CacheService.getScriptCache().get('KICK_' + token);
    return v ? JSON.parse(v) : null;
  } catch (e) { return null; }
}

/* ---------- ยกเลิกโทเคน : ลบแคช + เปลี่ยนสถานะในชีต Sessions ---------- */
function revokeToken_(token, status) {
  var t = String(token || '').trim();
  if (!t) return;
  try { cacheDel_('SESS_' + t); } catch (e) {}
  try {
    var sh = getSS_().getSheetByName(SHEETS.SESSIONS);
    var n = sh.getLastRow() - 1;
    if (n < 1) return;
    var head = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0]
                 .map(function (h) { return String(h).trim(); });
    var ti = head.indexOf('Token'), si = head.indexOf('Status');
    if (ti < 0 || si < 0) return;
    var col = sh.getRange(2, ti + 1, n, 1).getValues();
    for (var i = col.length - 1; i >= 0; i--) {
      if (String(col[i][0]).trim() === t) {
        sh.getRange(i + 2, si + 1).setValue(status || 'REVOKED');
        break;
      }
    }
    try { invalidateSheet_(SHEETS.SESSIONS); } catch (e) {}
  } catch (e) { try { logError_('revokeToken_', e); } catch (x) {} }
}

function fmtTime_(ms) {
  try { return Utilities.formatDate(new Date(ms), CONFIG.TZ, 'd/M/yyyy HH:mm') + ' น.'; }
  catch (e) { return ''; }
}

/* ---------- ตรวจว่าโทเคนนี้ยังเป็นเจ้าของบัญชีอยู่หรือไม่ ---------- */
function liveCheck_(s, t) {
  if (!SINGLE_SESSION_ON) return true;
  var uid = liveUid_(s);
  if (!uid) return true;
  var l = liveGet_(uid), now = Date.now();
  if (l && l.t && l.t !== t) return false;                 // มีเครื่องอื่นถือสิทธิ์อยู่
  if (!l || now - (l.at || 0) > LIVE_TOUCH_MS) {
    liveSet_(uid, { t: t, at: now, dev: (l && l.dev) || '', since: (l && l.since) || now });
  }
  return true;
}

/* =====================================================================
 * API ที่ครอบของเดิม
 * ===================================================================*/
function requireAuth_(token, perm) {
  var t = String(token || '').trim();
  if (getAdminKick_(t)) throw new Error('SESSION_EXPIRED');   // โทเคนที่ถูกผู้ดูแลเตะ ใช้ไม่ได้ทันที
  var s = getSession_(t);
  if (!s) throw new Error('SESSION_EXPIRED');
  if (!liveCheck_(s, t)) throw new Error('SESSION_EXPIRED');
  if (perm) {
    var list = PERMS[String(s.Role)] || [];
    if (list.indexOf(perm) === -1) throw new Error('NO_PERMISSION');
  }
  return s;
}

function apiLogin(p) {
  p = p || {};
  if (!SINGLE_SESSION_ON) return apiLoginCore_(p);

  var lock = LockService.getScriptLock();
  try { lock.waitLock(20000); }
  catch (e) { return fail_('ระบบกำลังมีผู้ใช้งานหนาแน่น กรุณาลองใหม่อีกครั้ง', 'BUSY'); }

  try {
    var res = apiLoginCore_(p);
    if (!res || res.ok === false || !res.data || !res.data.token) return res;

    var t = res.data.token;
    var s = getSession_(t);
    if (!s) return res;

    var uid = liveUid_(s), now = Date.now();
    var dev = String(p.device || '').substring(0, 80) || 'ไม่ทราบอุปกรณ์';
    var l = liveGet_(uid);
    var hasOther = !!(l && l.t && l.t !== t);
    var oldAlive = hasOther && (now - (l.at || 0)) < LIVE_TTL_MS && !!getSession_(l.t);

    /* ---- เครื่องเดิมยังใช้งานอยู่ และไม่ได้กดบังคับ : ปฏิเสธ ---- */
    if (oldAlive && !p.force) {
      revokeToken_(t, 'BLOCKED');
      try {
        writeAudit_(s, 'LOGIN', 'เข้าสู่ระบบ', s.Username,
          'ถูกปฏิเสธ : บัญชีกำลังใช้งานอยู่ที่ ' + (l.dev || 'อุปกรณ์อื่น') + ' (พยายามเข้าจาก ' + dev + ')', 'FAILED');
      } catch (e) {}
      return {
        ok: false, code: 'SESSION_IN_USE',
        message: 'บัญชีนี้กำลังใช้งานอยู่ที่อุปกรณ์อื่น',
        data: { device: l.dev || '', since: fmtTime_(l.since || l.at), lastActive: fmtTime_(l.at) }
      };
    }

    /* ---- ยกเลิกเซสชันเก่า (ทั้งที่ยังใช้งานและที่ค้างอยู่) ---- */
    if (hasOther) {
      revokeToken_(l.t, 'KICKED');
      markKicked_(l.t, dev);
      if (oldAlive) {
        try {
          writeAudit_(s, 'LOGIN', 'เข้าสู่ระบบ', s.Username,
            'บังคับเข้าสู่ระบบจาก ' + dev + ' • ตัดการเชื่อมต่อจาก ' + (l.dev || 'อุปกรณ์เดิม'), 'SUCCESS');
        } catch (e) {}
      }
    }
    liveSet_(uid, { t: t, at: now, dev: dev, since: now });
    return res;

  } catch (err) {
    return handleErr_('apiLogin', err);
  } finally {
    try { lock.releaseLock(); } catch (e) {}
  }
}

function apiLogout(token) {
  var t = String(token || '').trim();
  try {
    var s = getSession_(t);
    if (s) liveDel_(liveUid_(s), t);
  } catch (e) {}
  return apiLogoutCore_(token);
}

function apiPing(token) {
  var t = String(token || '').trim();

  var ka = getAdminKick_(t);
  if (ka) return fail_('ผู้ดูแลระบบ (' + ka.by + ') ให้บัญชีนี้ออกจากระบบเมื่อ ' + fmtTime_(ka.at) +
    (ka.suspend ? ' และระงับการใช้งานบัญชีแล้ว กรุณาติดต่อผู้ดูแลระบบ' : ''), 'SESSION_EXPIRED');

  var s = getSession_(t);
  if (!s) {
    var k = getKicked_(t);
    if (k) return fail_('บัญชีนี้ถูกเข้าสู่ระบบจากอุปกรณ์อื่น (' + (k.dev || 'ไม่ทราบอุปกรณ์') +
      ') เมื่อ ' + fmtTime_(k.at) + ' เครื่องนี้จึงถูกออกจากระบบ', 'SESSION_EXPIRED');
    return fail_('เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่', 'SESSION_EXPIRED');
  }

  if (SINGLE_SESSION_ON) {
    var uid = liveUid_(s), l = liveGet_(uid);
    if (l && l.t && l.t !== t) {
      revokeToken_(t, 'KICKED');
      return fail_('บัญชีนี้ถูกเข้าสู่ระบบจากอุปกรณ์อื่น (' + (l.dev || 'ไม่ทราบอุปกรณ์') +
        ') เครื่องนี้จึงถูกออกจากระบบ', 'SESSION_EXPIRED');
    }
    liveSet_(uid, { t: t, at: Date.now(), dev: (l && l.dev) || '', since: (l && l.since) || Date.now() });
  }
  return ok_({ alive: true, serverTime: nowStr_() });
}
/* =====================================================================
 * ===========  โมดูลผู้ดูแลเตะผู้ใช้ออกจากระบบ (Admin Kick)  ===========
 * เวอร์ชัน 4.0.5 — ต้องมีโมดูล Single Session (v4.0.4) อยู่ก่อน
 * วางเหนือบรรทัด var ZONES = zonesLoad_();
 * ===================================================================*/
function headLower_(sh) {
  return sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0]
           .map(function (h) { return String(h).trim().toLowerCase(); });
}

/* ---------- จดจำว่าโทเคนนี้ถูกผู้ดูแลเตะออก (ใช้แสดงข้อความฝั่งผู้ใช้) ---------- */
function markAdminKick_(token, by, suspend) {
  try {
    CacheService.getScriptCache().put('KICKADM_' + token,
      JSON.stringify({ by: by || 'ผู้ดูแลระบบ', at: Date.now(), suspend: !!suspend }), 21600);
  } catch (e) {}
}
function getAdminKick_(token) {
  try {
    var v = CacheService.getScriptCache().get('KICKADM_' + token);
    return v ? JSON.parse(v) : null;
  } catch (e) { return null; }
}

/* ---------- หาแถวผู้ใช้ในชีต Users ---------- */
function findUserRow_(userId, username) {
  var sh = getSS_().getSheetByName(SHEETS.USERS);
  var n = sh.getLastRow() - 1;
  if (n < 1) return null;
  var head = headLower_(sh);
  var ii = head.indexOf('userid'); if (ii < 0) ii = head.indexOf('id');
  var ui = head.indexOf('username'), fi = head.indexOf('fullname');
  if (ui < 0) return null;
  var v = sh.getRange(2, 1, n, head.length).getValues();
  var id = String(userId || '').trim(), un = String(username || '').trim().toLowerCase();
  for (var i = 0; i < v.length; i++) {
    var hitId = ii >= 0 && id && String(v[i][ii]).trim() === id;
    var hitUn = un && String(v[i][ui]).trim().toLowerCase() === un;
    if (hitId || hitUn) {
      return { sheet: sh, row: i + 2, head: head,
               username: String(v[i][ui]).trim(),
               fullName: fi >= 0 ? String(v[i][fi]).trim() : '' };
    }
  }
  return null;
}

/* ---------- ยกเลิกทุกเซสชันที่ยังใช้งานของบัญชีนี้ ---------- */
function revokeAllSessionsOf_(username, by, suspend) {
  var count = 0, un = String(username || '').trim().toLowerCase();
  try {
    var sh = getSS_().getSheetByName(SHEETS.SESSIONS);
    var n = sh.getLastRow() - 1;
    if (n < 1) return 0;
    var head = headLower_(sh);
    var ti = head.indexOf('token'), ui = head.indexOf('username'), si = head.indexOf('status');
    if (ti < 0 || ui < 0 || si < 0) return 0;
    var v = sh.getRange(2, 1, n, head.length).getValues();
    for (var i = 0; i < v.length; i++) {
      if (String(v[i][ui]).trim().toLowerCase() !== un) continue;
      var st = String(v[i][si]).trim().toUpperCase();
      if (st && st !== 'ACTIVE') continue;
      var tk = String(v[i][ti]).trim();
      sh.getRange(i + 2, si + 1).setValue('KICKED');
      try { cacheDel_('SESS_' + tk); } catch (e) {}
      markAdminKick_(tk, by, suspend);
      count++;
    }
    try { invalidateSheet_(SHEETS.SESSIONS); } catch (e) {}
  } catch (e) { try { logError_('revokeAllSessionsOf_', e); } catch (x) {} }
  return count;
}

/* =====================================================================
 * API
 * ===================================================================*/

/** สถานะออนไลน์ของทุกบัญชี : { username(ตัวเล็ก) : {online, device, since, lastActive} } */
function apiUserOnlineMap(token) {
  try {
    var sess = requireAuth_(token, 'users');
    var props = PropertiesService.getScriptProperties().getProperties();
    var now = Date.now(), out = {};
    Object.keys(props).forEach(function (k) {
      if (k.indexOf('LIVE_') !== 0) return;
      var l; try { l = JSON.parse(props[k]); } catch (e) { return; }
      if (!l || !l.t || !l.at) return;
      if (now - l.at >= LIVE_TTL_MS || getAdminKick_(l.t) || !getSession_(l.t)) return;
      out[k.substring(5)] = {
        online: true, device: l.dev || '',
        since: fmtTime_(l.since || l.at), lastActive: fmtTime_(l.at)
      };
    });
    return ok_({ map: out, me: String(sess.Username || '').trim().toLowerCase() });
  } catch (e) { return handleErr_('apiUserOnlineMap', e); }
}

/** ผู้ดูแลเตะผู้ใช้ออก (เลือกระงับบัญชีไปพร้อมกันได้) */
function apiKickUser(token, p) {
  var lock = LockService.getScriptLock();
  try {
    var sess = requireAuth_(token, 'users');
    p = p || {};
    lock.waitLock(20000);

    var u = findUserRow_(p.userId, p.username);
    if (!u) return fail_('ไม่พบบัญชีผู้ใช้', 'NOT_FOUND');
    if (u.username.toLowerCase() === String(sess.Username).trim().toLowerCase())
      return fail_('ไม่สามารถเตะบัญชีของตัวเองออกจากระบบได้', 'VALIDATION');

    var by = sess.FullName || sess.Username;
    var uid = u.username.toLowerCase();
    var live = liveGet_(uid);
    var dev = (live && live.dev) || '';

    var n = revokeAllSessionsOf_(u.username, by, p.suspend);

    /* สำรอง : ถ้าชีต Sessions ไม่มีคอลัมน์ที่ต้องใช้ ให้ยกเลิกโทเคนที่ถือสิทธิ์อยู่โดยตรง */
    if (live && live.t) {
      revokeToken_(live.t, 'KICKED');
      markAdminKick_(live.t, by, p.suspend);
      if (!n) n = 1;
    }
        /* ใส่ค่าที่ใช้ไม่ได้แทนการลบ เครื่องที่ถูกเตะจึงยึดสิทธิ์คืนไม่ได้
       ผู้ใช้ล็อกอินใหม่ได้ตามปกติ เพราะค่านี้ถือว่าหมดอายุแล้ว (at = 0) */
    liveSet_(uid, { t: 'KICKED_' + Date.now(), at: 0, dev: '', since: 0 });


    /* ระงับบัญชี */
    var suspended = false;
    if (p.suspend) {
      var si = u.head.indexOf('status');
      if (si >= 0) {
        u.sheet.getRange(u.row, si + 1).setValue('INACTIVE');
        try { cacheDel_(['USERS_V1']); } catch (e) {}
        try { invalidateSheet_(SHEETS.USERS); } catch (e) {}
        suspended = true;
      }
    }
    SpreadsheetApp.flush();

    writeAudit_(sess, 'KICK', 'บัญชีผู้ใช้งาน', u.username,
      'เตะ ' + u.username + (u.fullName ? ' (' + u.fullName + ')' : '') + ' ออกจากระบบ' +
      (dev ? ' • อุปกรณ์ ' + dev : '') + ' • ยกเลิก ' + n + ' เซสชัน' +
      (suspended ? ' • ระงับบัญชีแล้ว' : ''), 'SUCCESS');

    return ok_({ revoked: n, suspended: suspended },
      'เตะ ' + (u.fullName || u.username) + ' ออกจากระบบเรียบร้อย' +
      (suspended ? ' และระงับบัญชีแล้ว' : ''));
  } catch (e) {
    return handleErr_('apiKickUser', e);
  } finally {
    try { lock.releaseLock(); } catch (x) {}
  }
}
/* =====================================================================
 * ===================  ข้อมูลกราฟแดชบอร์ด (v4.1)  ===================
 * วางเหนือบรรทัด var ZONES = zonesLoad_();
 * ===================================================================*/

/** แปลงวันที่ทุกรูปแบบเป็น 'yyyy-MM' (รองรับปี พ.ศ.) */
function dcYm_(v) {
  if (v === null || v === undefined || v === '') return '';
  var d;
  if (Object.prototype.toString.call(v) === '[object Date]') {
    d = v;
  } else {
    var s = String(v).trim(), m, y;
    m = s.match(/^(\d{4})-(\d{1,2})/);
    if (m) { y = +m[1]; if (y > 2400) y -= 543; return y + '-' + ('0' + m[2]).slice(-2); }
    m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (m) { y = +m[3]; if (y > 2400) y -= 543; return y + '-' + ('0' + m[2]).slice(-2); }
    d = new Date(s.replace(/\s*\(.*\)\s*$/, ''));
  }
  if (isNaN(d.getTime())) return '';
  var out = Utilities.formatDate(d, CONFIG.TZ, 'yyyy-MM');
  var yy = +out.substring(0, 4);
  return yy > 2400 ? (yy - 543) + out.substring(4) : out;
}

function dcDeleted_(v) { return v === true || String(v).trim().toUpperCase() === 'TRUE'; }

function apiDashboardCharts(token, months, force) {
  try {
    requireAuth_(token, 'dashboard');
    var N = parseInt(months, 10);
    if ([6, 12, 24].indexOf(N) < 0) N = 12;
    var key = 'DCHART_V1_' + N;

    if (!force) {
      try { var c = cacheSrv_().get(key); if (c) return ok_(JSON.parse(c)); } catch (e) {}
    }

    /* ---- เดือนย้อนหลัง N เดือน รวมเดือนปัจจุบัน ---- */
    var cur = Utilities.formatDate(new Date(), CONFIG.TZ, 'yyyy-MM');
    var cy = +cur.substring(0, 4), cm = +cur.substring(5, 7), keys = [], idx = {};
    for (var i = N - 1; i >= 0; i--) {
      var mm = cm - i, yy = cy;
      while (mm < 1) { mm += 12; yy--; }
      keys.push(yy + '-' + ('0' + mm).slice(-2));
    }
    keys.forEach(function (k, i) { idx[k] = i; });
    function zeros() { return keys.map(function () { return 0; }); }

    /* ---- โซน : เรียงตามลำดับที่ตั้งไว้ ---- */
    var Z = ZONES || {}, zList = [], zMap = {};
    function zNew(code, name) {
      var o = { code: code, name: name, active: 0, suspended: 0, cancelled: 0, other: 0, revenue: 0 };
      zList.push(o); zMap[code] = o; return o;
    }
    Object.keys(Z).sort(function (a, b) { return (Z[a].order || 999) - (Z[b].order || 999); })
      .forEach(function (c) { zNew(c, Z[c].name || ('โซน ' + c)); });
    function zGet(code) {
      code = code || '(ไม่ระบุ)';
      return zMap[code] || zNew(code, 'โซน ' + code + ' (ไม่อยู่ในระบบ)');
    }

    /* ---- ลูกค้า ---- */
    var newC = zeros(), canC = zeros(), act = 0, rev = 0;
    readSheet_(SHEETS.CUSTOMERS).rows.forEach(function (r) {
      if (!String(r.CustomerID || '').trim() && !String(r.CustomerCode || '').trim()) return;
      if (dcDeleted_(r.IsDeleted)) return;
      var z = zGet(String(r.Zone || '').trim().toUpperCase());
      var st = String(r.Status || '').trim();
      var price = Number(String(r.PricePerMonth || '').replace(/[^0-9.\-]/g, '')) || 0;
      if (st === 'ใช้บริการ') { z.active++; z.revenue += price; act++; rev += price; }
      else if (st === 'ระงับสัญญาณ') z.suspended++;
      else if (st === 'ยกเลิกใช้บริการ') z.cancelled++;
      else z.other++;
      var a = idx[dcYm_(r.ContractDate)]; if (a !== undefined) newC[a]++;
      var b = idx[dcYm_(r.CancelDate)];   if (b !== undefined) canC[b]++;
    });

    /* ---- ใบงาน ---- */
    var wDone = zeros(), wOpen = zeros(), wCan = zeros();
    var wStatus = {}, wType = {}, cause = {}, wOpenAll = 0;
    readSheet_(SHEETS.WORKORDERS).rows.forEach(function (r) {
      if (!String(r.WorkOrderID || '').trim() && !String(r.DocNo || '').trim()) return;
      if (dcDeleted_(r.IsDeleted)) return;
      var st = String(r.Status || '').trim() || 'ไม่ระบุ';
      var jt = String(r.JobType || '').trim() || 'ไม่ระบุ';
      var ca = String(r.Cause || '').trim();
      wStatus[st] = (wStatus[st] || 0) + 1;
      wType[jt] = (wType[jt] || 0) + 1;
      if (ca) cause[ca] = (cause[ca] || 0) + 1;
      if (st === 'รอดำเนินการ' || st === 'กำลังดำเนินการ') wOpenAll++;
      var k = idx[dcYm_(r.ReportDate)];
      if (k === undefined) return;
      if (st === 'เสร็จสิ้น') wDone[k]++;
      else if (st === 'ยกเลิกใบงาน') wCan[k]++;
      else wOpen[k]++;
    });

    var top = Object.keys(cause).map(function (c) { return [c, cause[c]]; })
      .sort(function (a, b) { return b[1] - a[1]; }).slice(0, 8);
    var L = keys.length - 1;

    var out = {
      months: keys,
      zones: zList.filter(function (z) {
        return Z[z.code] || (z.active + z.suspended + z.cancelled + z.other) > 0;
      }),
      cusMonthly: { newC: newC, cancel: canC },
      woMonthly: { done: wDone, open: wOpen, cancelled: wCan },
      woStatus: wStatus, woType: wType, causes: top,
      kpi: { active: act, revenue: rev, newThisMonth: newC[L], cancelThisMonth: canC[L],
             woOpen: wOpenAll, woDoneThisMonth: wDone[L] },
      at: nowStr_()
    };
    try { cacheSrv_().put(key, JSON.stringify(out), 120); } catch (e) {}
    return ok_(out);
  } catch (e) { return handleErr_('apiDashboardCharts', e); }
}
var ZONES = zonesLoad_();