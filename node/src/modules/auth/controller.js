const bcrypt = require('bcryptjs');
const User = require('./model');
const { signToken, signRefreshToken, verifyRefreshToken } = require('../../middleware/auth');
const subscribersModel = require('../subscribers/model');

const SALT_ROUNDS = 12;

/** Fire-and-forget: promote newsletter subscriber to 'warm' on signup/login.
 *  Never block or fail the auth flow if this errors. */
function _promoteWarm(user) {
  if (!user?.email) return;
  subscribersModel
    .promoteByEmail(user.email, 'warm', user.id || null)
    .catch(err => console.warn('[subscribers] promote warm failed:', err.message));
}

/* ── Cookie options ──────────────────────────────────────────── */
function cookieOpts() {
  return {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge:   30 * 24 * 60 * 60 * 1000  // 30 days
  };
}

const AuthController = {

  /* ── POST /v1/auth/register ────────────────────────────────── */
  async register(req, res) {
    try {
      const { email, password, name } = req.body;

      if (!password || password.length < 8) {
        return res.status(400).json({
          ok: false, error: { code: 'VALIDATION', message: 'La contraseña debe tener al menos 8 caracteres' }
        });
      }
      if (!/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
        return res.status(400).json({
          ok: false, error: { code: 'VALIDATION', message: 'La contraseña debe incluir al menos una mayúscula y un número' }
        });
      }
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({
          ok: false, error: { code: 'VALIDATION', message: 'Email no válido' }
        });
      }

      const existing = await User.findByEmail(email);
      if (existing) {
        return res.status(409).json({
          ok: false, error: { code: 'CONFLICT', message: 'An account with this email already exists' }
        });
      }

      const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
      const user = await User.create({ email, passwordHash, name });

      const accessToken  = signToken(user);
      const refreshToken = signRefreshToken(user);

      res.cookie('refresh_token', refreshToken, cookieOpts());
      _promoteWarm(user);
      res.status(201).json({
        ok: true,
        data: { user, access_token: accessToken }
      });
    } catch (err) {
      console.error('[AUTH] Register error:', err.message);
      res.status(500).json({ ok: false, error: { code: 'INTERNAL_ERROR', message: 'Registration failed' } });
    }
  },

  /* ── POST /v1/auth/login ───────────────────────────────────── */
  async login(req, res) {
    try {
      const { email, password } = req.body;

      const user = await User.findByEmail(email);
      if (!user) {
        return res.status(401).json({
          ok: false, error: { code: 'UNAUTHORIZED', message: 'Invalid email or password' }
        });
      }

      const valid = await bcrypt.compare(password, user.password_hash);
      if (!valid) {
        return res.status(401).json({
          ok: false, error: { code: 'UNAUTHORIZED', message: 'Invalid email or password' }
        });
      }

      const safeUser = { id: user.id, email: user.email, name: user.name, role: user.role, subscription: user.subscription };
      const accessToken  = signToken(safeUser);
      const refreshToken = signRefreshToken(safeUser);

      res.cookie('refresh_token', refreshToken, cookieOpts());
      _promoteWarm(safeUser);
      res.json({
        ok: true,
        data: { user: safeUser, access_token: accessToken }
      });
    } catch (err) {
      console.error('[AUTH] Login error:', err.message);
      res.status(500).json({ ok: false, error: { code: 'INTERNAL_ERROR', message: 'Login failed' } });
    }
  },

  /* ── POST /v1/auth/google ──────────────────────────────────── */
  async google(req, res) {
    try {
      const { credential } = req.body;
      if (!credential) {
        return res.status(400).json({
          ok: false, error: { code: 'BAD_REQUEST', message: 'Google credential is required' }
        });
      }

      const { OAuth2Client } = require('google-auth-library');
      const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

      const ticket = await client.verifyIdToken({
        idToken:  credential,
        audience: process.env.GOOGLE_CLIENT_ID
      });

      const payload = ticket.getPayload();
      const user = await User.findOrCreateFromGoogle({
        email: payload.email,
        name:  payload.name || payload.email.split('@')[0]
      });

      const accessToken  = signToken(user);
      const refreshToken = signRefreshToken(user);

      res.cookie('refresh_token', refreshToken, cookieOpts());
      _promoteWarm(user);
      res.json({
        ok: true,
        data: { user, access_token: accessToken }
      });
    } catch (err) {
      console.error('[AUTH] Google login error:', err.message);
      res.status(401).json({
        ok: false, error: { code: 'UNAUTHORIZED', message: 'Invalid Google credential' }
      });
    }
  },

  /* ── POST /v1/auth/refresh ─────────────────────────────────── */
  async refresh(req, res) {
    try {
      const token = req.cookies?.refresh_token;
      if (!token) {
        return res.status(401).json({
          ok: false, error: { code: 'UNAUTHORIZED', message: 'No refresh token' }
        });
      }

      let payload;
      try {
        payload = verifyRefreshToken(token);
      } catch {
        return res.status(401).json({
          ok: false, error: { code: 'UNAUTHORIZED', message: 'Invalid refresh token' }
        });
      }

      const user = await User.findById(payload.sub);
      if (!user) {
        return res.status(401).json({
          ok: false, error: { code: 'UNAUTHORIZED', message: 'User not found' }
        });
      }

      const accessToken = signToken(user);
      res.json({ ok: true, data: { access_token: accessToken } });
    } catch (err) {
      console.error('[AUTH] Refresh error:', err.message);
      res.status(500).json({ ok: false, error: { code: 'INTERNAL_ERROR', message: 'Token refresh failed' } });
    }
  },

  /* ── GET /v1/auth/me ───────────────────────────────────────── */
  async me(req, res) {
    try {
      const user = await User.findById(req.user.id);
      if (!user) {
        return res.status(404).json({
          ok: false, error: { code: 'NOT_FOUND', message: 'User not found' }
        });
      }
      res.json({ ok: true, data: user });
    } catch (err) {
      console.error('[AUTH] Me error:', err.message);
      res.status(500).json({ ok: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to get user' } });
    }
  },

  /* ── GET /v1/auth/session-status ───────────────────────────── */
  /* Public, cookie-only check used by eufundingschool.com (WP) to
   * decide whether to render "Iniciar sesión" or "Mi cuenta · Name"
   * in the menu. Never throws auth errors — always 200 with data. */
  async sessionStatus(req, res) {
    try {
      const token = req.cookies?.refresh_token;
      if (!token) return res.json({ ok: true, data: { logged_in: false } });

      let payload;
      try { payload = verifyRefreshToken(token); }
      catch { return res.json({ ok: true, data: { logged_in: false } }); }

      const user = await User.findById(payload.sub);
      if (!user) return res.json({ ok: true, data: { logged_in: false } });

      const firstName = (user.name || '').trim().split(/\s+/)[0] || null;
      return res.json({ ok: true, data: { logged_in: true, first_name: firstName } });
    } catch (err) {
      console.error('[AUTH] Session status error:', err.message);
      return res.json({ ok: true, data: { logged_in: false } });
    }
  },

  /* ── POST /v1/auth/logout ──────────────────────────────────── */
  logout(_req, res) {
    res.clearCookie('refresh_token', {
      httpOnly: true,
      secure:   process.env.NODE_ENV === 'production',
      sameSite: 'strict'
    });
    res.json({ ok: true, data: { message: 'Logged out' } });
  }
};

module.exports = AuthController;
