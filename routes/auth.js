/* ═══════════════════════════════════════════════════════════════
   SOVEREIGN — Auth Routes
   Register, Login, JWT middleware
   ═══════════════════════════════════════════════════════════════ */

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

if (!process.env.JWT_SECRET) {
    console.error('⚠️  FATAL: JWT_SECRET environment variable is required. Set it in .env');
    process.exit(1);
}
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES = '7d';

// ─── Auth Rate Limiter (per IP) ───
const authRateLimitMap = new Map();
function authRateLimit(req, res, next) {
    const ip = req.ip || req.connection.remoteAddress;
    const now = Date.now();
    const windowMs = 15 * 60 * 1000; // 15 minutes
    const max = 10;
    let entry = authRateLimitMap.get(ip);
    if (!entry || now - entry.start > windowMs) {
        entry = { start: now, count: 0 };
        authRateLimitMap.set(ip, entry);
    }
    entry.count++;
    if (entry.count > max) {
        return res.status(429).json({ error: 'Too many attempts. Try again in 15 minutes.' });
    }
    next();
}

// ─── Register ───
router.post('/register', authRateLimit, async (req, res) => {
    try {
        const { username, email, password } = req.body;

        if (!username || !email || !password) {
            return res.status(400).json({ error: 'Username, email, and password are required.' });
        }
        if (username.length < 3 || username.length > 30) {
            return res.status(400).json({ error: 'Username must be 3-30 characters.' });
        }
        if (password.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters.' });
        }

        // Check if username or email exists
        const existing = db.prepare('SELECT id FROM users WHERE username = ? OR email = ?').get(username, email);
        if (existing) {
            return res.status(409).json({ error: 'Username or email already taken.' });
        }

        // Hash password
        const passwordHash = bcrypt.hashSync(password, 10);

        // Make the very first user an admin automatically
        const userCount = db.prepare('SELECT COUNT(*) as c FROM users').get().c;
        const isAdmin = userCount === 0 ? 1 : 0;

        // Create user
        const result = db.prepare('INSERT INTO users (username, email, password_hash, is_admin) VALUES (?, ?, ?, ?)').run(username, email, passwordHash, isAdmin);
        const userId = result.lastInsertRowid;

        // Generate Verification PIN
        const pin = Math.floor(100000 + Math.random() * 900000).toString(); // 6 digit string
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24 hours

        db.prepare('INSERT INTO tokens (user_id, token, type, expires_at) VALUES (?, ?, ?, ?)').run(userId, pin, 'verify_email', expiresAt);

        // Send Email or show PIN directly
        let emailSent = false;
        if (global.isSmtpConfigured()) {
            try {
                const mailer = global.getMailer();
                await mailer.sendMail({
                    from: global.getSmtpFrom(),
                    to: email,
                    subject: 'Verify your SOVEREIGN account',
                    text: `Welcome to SOVEREIGN, ${username}. Your verification PIN is: ${pin}`
                });
                console.log(`[MAILER] Sent verify PIN to ${email}`);
                emailSent = true;
            } catch (mailErr) {
                console.error('[MAILER] Failed to send email:', mailErr.message);
                console.log(`[MAILER FALLBACK] PIN for ${username}: ${pin}`);
                // Ensure emailSent remains false
            }
        } else {
            console.log(`[MAILER] SMTP not configured. PIN for ${username}: ${pin}`);
        }

        // Generate token
        const token = jwt.sign({ userId, username }, JWT_SECRET, { expiresIn: JWT_EXPIRES });

        const response = {
            token,
            user: { id: userId, username, email, hasNation: false, isVerified: 0 }
        };

        // If email wasn't sent, include PIN in response so the user can see it
        if (!emailSent) {
            response.manualPin = pin;
        }

        res.status(201).json(response);
    } catch (err) {
        console.error('[AUTH] Register error:', err);
        res.status(500).json({ error: 'Server error.' });
    }
});

// ─── Login ───
router.post('/login', authRateLimit, (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password are required.' });
        }

        const user = db.prepare('SELECT * FROM users WHERE username = ? COLLATE NOCASE').get(username);
        if (!user) {
            return res.status(401).json({ error: 'Invalid username or password.' });
        }

        if (user.is_banned) {
            return res.status(403).json({ error: 'Account has been banned.' });
        }

        if (!bcrypt.compareSync(password, user.password_hash)) {
            return res.status(401).json({ error: 'Invalid username or password.' });
        }

        // Update last login
        db.prepare('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?').run(user.id);

        // Check if user has a nation
        const nation = db.prepare('SELECT id FROM nations WHERE user_id = ?').get(user.id);

        // Generate token
        const token = jwt.sign({ userId: user.id, username: user.username }, JWT_SECRET, { expiresIn: JWT_EXPIRES });

        res.json({
            token,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                isVerified: !!user.is_verified,
                isAdmin: !!user.is_admin,
                hasNation: !!nation
            }
        });
    } catch (err) {
        console.error('[AUTH] Login error:', err);
        res.status(500).json({ error: 'Server error.' });
    }
});

// ─── Auth Middleware ───
function authMiddleware(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Authentication required.' });
    }

    try {
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, JWT_SECRET);
        req.userId = decoded.userId;
        req.username = decoded.username;
        next();
    } catch (err) {
        return res.status(401).json({ error: 'Invalid or expired token.' });
    }
}

// ─── Get Current User ───
router.get('/me', authMiddleware, (req, res) => {
    try {
        const user = db.prepare('SELECT id, username, email, is_verified, is_admin FROM users WHERE id = ?').get(req.userId);
        if (!user) return res.status(404).json({ error: 'User not found.' });

        const nation = db.prepare('SELECT id, name FROM nations WHERE user_id = ?').get(req.userId);

        res.json({
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                isVerified: !!user.is_verified,
                isAdmin: !!user.is_admin,
                hasNation: !!nation,
                nationId: nation?.id,
                nationName: nation?.name
            }
        });
    } catch (err) {
        console.error('[AUTH] /me error:', err);
        res.status(500).json({ error: 'Server error.' });
    }
});

// ─── Verify Email ───
router.post('/verify-email', authMiddleware, (req, res) => {
    try {
        let { pin } = req.body;
        if (!pin) return res.status(400).json({ error: 'PIN is required.' });

        // Strip all whitespace from the PIN
        pin = pin.toString().replace(/\s/g, '');

        const tokenRow = db.prepare("SELECT id, expires_at FROM tokens WHERE user_id = ? AND token = ? AND type = 'verify_email'").get(req.userId, pin);

        if (!tokenRow) return res.status(400).json({ error: 'Invalid or expired PIN.' });
        if (new Date(tokenRow.expires_at) < new Date()) {
            return res.status(400).json({ error: 'PIN has expired.' });
        }

        // Mark user verified
        db.prepare('UPDATE users SET is_verified = 1 WHERE id = ?').run(req.userId);

        // Delete token
        db.prepare('DELETE FROM tokens WHERE id = ?').run(tokenRow.id);

        res.json({ message: 'Email verified successfully.' });
    } catch (err) {
        console.error('[AUTH] Verify error:', err);
        res.status(500).json({ error: 'Server error.' });
    }
});

// ─── Forgot Password ───
router.post('/forgot-password', (req, res) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ error: 'Email is required.' });

        const user = db.prepare('SELECT id, username FROM users WHERE email = ?').get(email);

        if (user) {
            // Delete old reset tokens for this user
            db.prepare("DELETE FROM tokens WHERE user_id = ? AND type = 'reset_password'").run(user.id);

            const resetToken = crypto.randomBytes(32).toString('hex');
            const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour

            db.prepare('INSERT INTO tokens (user_id, token, type, expires_at) VALUES (?, ?, ?, ?)').run(user.id, resetToken, 'reset_password', expiresAt);

            try {
                const mailer = global.getMailer();
                mailer.sendMail({
                    from: global.getSmtpFrom(),
                    to: email,
                    subject: 'Password Reset Request',
                    text: `Hello ${user.username},\n\nUse this token to reset your password: ${resetToken}\n(Valid for 1 hour)`
                }).then(() => {
                    console.log(`[MAILER] Sent reset token ${resetToken} to ${email}`);
                }).catch(mailErr => {
                    console.error('[MAILER] Failed to send reset email (Check SMTP Settings):', mailErr.message);
                    console.log(`[MAILER FALLBACK] Reset token for ${email}: ${resetToken}`);
                });
            } catch (mailErr) {
                console.error('[MAILER] Initialization failed:', mailErr.message);
            }
        }

        // Always return success to prevent email enumeration
        res.json({ message: 'If that email exists, a reset link has been sent.' });
    } catch (err) {
        console.error('[AUTH] Forgot password error:', err);
        res.status(500).json({ error: 'Server error.' });
    }
});

// ─── Reset Password ───
router.post('/reset-password', (req, res) => {
    try {
        const { token, newPassword } = req.body;
        if (!token || !newPassword) return res.status(400).json({ error: 'Token and new password required.' });
        if (newPassword.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters.' });

        const tokenRow = db.prepare("SELECT id, user_id, expires_at FROM tokens WHERE token = ? AND type = 'reset_password'").get(token);

        if (!tokenRow) return res.status(400).json({ error: 'Invalid or expired token.' });
        if (new Date(tokenRow.expires_at) < new Date()) {
            return res.status(400).json({ error: 'Token has expired.' });
        }

        const passwordHash = bcrypt.hashSync(newPassword, 10);

        // Update password
        db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(passwordHash, tokenRow.user_id);

        // Delete token
        db.prepare('DELETE FROM tokens WHERE id = ?').run(tokenRow.id);

        res.json({ message: 'Password reset successfully. You may now login.' });
    } catch (err) {
        console.error('[AUTH] Reset password error:', err);
        res.status(500).json({ error: 'Server error.' });
    }
});


// ─── Change Password ───
router.post('/change-password', authMiddleware, (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        if (!currentPassword || !newPassword) return res.status(400).json({ error: 'Current and new password required.' });
        if (newPassword.length < 6) return res.status(400).json({ error: 'New password must be at least 6 characters.' });

        const user = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(req.userId);
        if (!user) return res.status(404).json({ error: 'User not found.' });

        if (!bcrypt.compareSync(currentPassword, user.password_hash)) {
            return res.status(401).json({ error: 'Current password is incorrect.' });
        }

        const newHash = bcrypt.hashSync(newPassword, 10);
        db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(newHash, req.userId);
        res.json({ message: 'Password changed successfully.' });
    } catch (err) {
        console.error('[AUTH] Change password error:', err);
        res.status(500).json({ error: 'Server error.' });
    }
});

// ─── Change Email ───
router.post('/change-email', authMiddleware, async (req, res) => {
    try {
        const { newEmail, password } = req.body;
        if (!newEmail || !password) return res.status(400).json({ error: 'New email and password required.' });

        const user = db.prepare('SELECT password_hash, email FROM users WHERE id = ?').get(req.userId);
        if (!user) return res.status(404).json({ error: 'User not found.' });

        if (!bcrypt.compareSync(password, user.password_hash)) {
            return res.status(401).json({ error: 'Password is incorrect.' });
        }

        // Check if email is already taken
        const existing = db.prepare('SELECT id FROM users WHERE email = ? AND id != ?').get(newEmail, req.userId);
        if (existing) return res.status(409).json({ error: 'Email already in use by another account.' });

        // Update email and mark as unverified
        db.prepare('UPDATE users SET email = ?, is_verified = 0 WHERE id = ?').run(newEmail, req.userId);

        // Delete old verify tokens and create new one
        db.prepare("DELETE FROM tokens WHERE user_id = ? AND type = 'verify_email'").run(req.userId);
        const pin = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
        db.prepare('INSERT INTO tokens (user_id, token, type, expires_at) VALUES (?, ?, ?, ?)').run(req.userId, pin, 'verify_email', expiresAt);

        // Send verification email
        let emailSent = false;
        if (global.isSmtpConfigured()) {
            try {
                const mailer = global.getMailer();
                await mailer.sendMail({
                    from: global.getSmtpFrom(),
                    to: newEmail,
                    subject: 'Verify your new SOVEREIGN email',
                    text: `Your verification PIN is: ${pin}`
                });
                emailSent = true;
            } catch (mailErr) {
                console.error('[MAILER] Failed:', mailErr.message);
            }
        }

        const response = { message: 'Email updated. Please verify your new email.' };
        if (!emailSent) response.manualPin = pin;
        res.json(response);
    } catch (err) {
        console.error('[AUTH] Change email error:', err);
        res.status(500).json({ error: 'Server error.' });
    }
});

// ─── Delete Account ───
router.delete('/delete-account', authMiddleware, (req, res) => {
    try {
        const { password } = req.body;
        if (!password) return res.status(400).json({ error: 'Password required to delete account.' });

        const user = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(req.userId);
        if (!user) return res.status(404).json({ error: 'User not found.' });

        if (!bcrypt.compareSync(password, user.password_hash)) {
            return res.status(401).json({ error: 'Password is incorrect.' });
        }

        // Get nation
        const nation = db.prepare('SELECT id FROM nations WHERE user_id = ?').get(req.userId);

        db.transaction(() => {
            if (nation) {
                db.prepare('DELETE FROM city_improvements WHERE city_id IN (SELECT id FROM cities WHERE nation_id = ?)').run(nation.id);
                db.prepare('DELETE FROM cities WHERE nation_id = ?').run(nation.id);
                db.prepare('DELETE FROM military WHERE nation_id = ?').run(nation.id);
                db.prepare('DELETE FROM trade_offers WHERE nation_id = ?').run(nation.id);
                db.prepare('DELETE FROM treaties WHERE nation_a_id = ? OR nation_b_id = ?').run(nation.id, nation.id);
                db.prepare('DELETE FROM wars WHERE attacker_id = ? OR defender_id = ?').run(nation.id, nation.id);
                db.prepare('DELETE FROM spy_missions WHERE nation_id = ? OR target_nation_id = ?').run(nation.id, nation.id);
                db.prepare('DELETE FROM nations WHERE id = ?').run(nation.id);
            }
            db.prepare('DELETE FROM tokens WHERE user_id = ?').run(req.userId);
            db.prepare('DELETE FROM messages WHERE sender_id = ? OR recipient_id = ?').run(req.userId, req.userId);
            db.prepare('DELETE FROM users WHERE id = ?').run(req.userId);
        })();

        res.json({ message: 'Account permanently deleted.' });
    } catch (err) {
        console.error('[AUTH] Delete account error:', err);
        res.status(500).json({ error: 'Server error.' });
    }
});

module.exports = router;
module.exports.authMiddleware = authMiddleware;
module.exports.JWT_SECRET = JWT_SECRET;
