'use strict';
const crypto = require('node:crypto');
const { all, get, run } = require('./db');
const { forbidden, HttpError } = require('./util');

const SESSION_DAYS = 30;

function hashPassword(pw) {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(String(pw), salt, 64);
  return `scrypt$${salt.toString('hex')}$${hash.toString('hex')}`;
}
function verifyPassword(pw, stored) {
  const [alg, saltHex, hashHex] = String(stored).split('$');
  if (alg !== 'scrypt') return false;
  const hash = crypto.scryptSync(String(pw), Buffer.from(saltHex, 'hex'), 64);
  return crypto.timingSafeEqual(hash, Buffer.from(hashHex, 'hex'));
}
function checkNewPassword(pw) {
  if (String(pw || '').length < 6) throw new HttpError(400, 'رمز عبور باید حداقل ۶ کاراکتر باشد.');
}

function createSession(userId) {
  const token = crypto.randomBytes(32).toString('base64url');
  run(`INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, datetime('now', '+${SESSION_DAYS} days'))`, token, userId);
  return token;
}
function destroySession(token) {
  run('DELETE FROM sessions WHERE token = ?', token);
}
function userFromToken(token) {
  if (!token) return null;
  const u = get(`SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id
                 WHERE s.token = ? AND s.expires_at > datetime('now') AND u.active = 1`, token);
  if (!u) return null;
  u.managed = all('SELECT warehouse_id FROM warehouse_managers WHERE user_id = ?', u.id).map((r) => r.warehouse_id);
  return u;
}

// Simple in-memory brute-force guard: 10 failures per IP+username → 15 minute lock.
const failures = new Map();
function loginAllowed(key) {
  const f = failures.get(key);
  return !(f && f.count >= 10 && Date.now() - f.at < 15 * 60 * 1000);
}
function loginFailed(key) {
  const f = failures.get(key) || { count: 0, at: 0 };
  if (Date.now() - f.at > 15 * 60 * 1000) f.count = 0;
  f.count += 1;
  f.at = Date.now();
  failures.set(key, f);
}
const loginSucceeded = (key) => failures.delete(key);

const isAdmin = (u) => u.role === 'admin';
const canEdit = (u, warehouseId) => isAdmin(u) || u.managed.includes(Number(warehouseId));
function requireEdit(u, warehouseId) {
  if (!canEdit(u, warehouseId)) throw forbidden('فقط مدیر همین انبار یا مدیر کل می‌تواند این تغییر را ثبت کند.');
}
function requireAdmin(u) {
  if (!isAdmin(u)) throw forbidden('این بخش فقط برای مدیران کل است.');
}

function publicUser(u) {
  return {
    id: u.id, username: u.username, full_name: u.full_name, role: u.role, phone: u.phone, chat_id: u.chat_id,
    active: !!u.active, must_change_pw: !!u.must_change_pw, managed: u.managed || [],
  };
}

module.exports = {
  hashPassword, verifyPassword, checkNewPassword, createSession, destroySession, userFromToken,
  loginAllowed, loginFailed, loginSucceeded, isAdmin, canEdit, requireEdit, requireAdmin, publicUser,
};
