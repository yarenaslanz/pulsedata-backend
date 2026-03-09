const express = require('express');
const bcrypt = require('bcryptjs');
const pool = require('./db');
const jwt = require('jsonwebtoken');
const auth = require('./auth');
const rateLimit = require('express-rate-limit');

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: { error: 'Too many requests, please try again later.' }
});
app.use(generalLimiter);

const quotaLimiter = rateLimit({
    windowMs: 1 * 60 * 1000,
    max: 5,
    message: { error: 'Quota usage limit reached for this minute.' }
});

app.get('/', (req, res) => res.send('PulseData API Server is Running!'));
app.get('/users', async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT id, email, plan_gb, remaining_mb, created_at FROM users ORDER BY created_at DESC'
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: "Database error." });
    }
});

app.post('/users', async (req, res) => {
    try {
        const { email, password, plan_gb } = req.body;
        const passwordHash = await bcrypt.hash(password, 10);
        const remainingMb = Number(plan_gb) * 1024;

        const result = await pool.query(
            'INSERT INTO users (email, password_hash, plan_gb, remaining_mb) VALUES ($1, $2, $3, $4) RETURNING id, email',
            [email, passwordHash, plan_gb, remainingMb]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        if (err.code === '23505') return res.status(409).json({ error: 'Email already registered.' });
        res.status(500).json({ error: 'Registration failed.' });
    }
});

app.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const userRes = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        
        if (userRes.rows.length === 0) return res.status(401).json({ error: 'Invalid credentials.' });
        
        const isMatch = await bcrypt.compare(password, userRes.rows[0].password_hash);
        if (!isMatch) return res.status(401).json({ error: 'Invalid credentials.' });

        const token = jwt.sign({ userId: userRes.rows[0].id }, process.env.JWT_SECRET, { expiresIn: '1h' });
        res.json({ token });
    } catch (err) {
        res.status(500).json({ error: 'Login error.' });
    }
});

app.post('/use-data', auth, quotaLimiter, async (req, res) => {
    try {
        const { amount_mb } = req.body;
        const userId = req.user.userId;

        const userRes = await pool.query('SELECT remaining_mb FROM users WHERE id = $1', [userId]);
        if (userRes.rows[0].remaining_mb < amount_mb) {
            return res.status(403).json({ error: 'Insufficient quota!' });
        }

        const result = await pool.query(
            'UPDATE users SET remaining_mb = remaining_mb - $1 WHERE id = $2 RETURNING remaining_mb',
            [amount_mb, userId]
        );
        res.json({ message: 'Data used successfully', remaining: result.rows[0].remaining_mb });
    } catch (err) {
        res.status(500).json({ error: 'Transaction error.' });
    }
});

app.put('/reset-quota', auth, async (req, res) => {
    try {
        const userId = req.user.userId;
        const userRes = await pool.query('SELECT plan_gb FROM users WHERE id = $1', [userId]);
        
        if (userRes.rows.length === 0) {
            return res.status(404).json({ error: 'User not found.' });
        }

        const resetMb = userRes.rows[0].plan_gb * 1024;

        const updateRes = await pool.query(
            'UPDATE users SET remaining_mb = $1 WHERE id = $2 RETURNING remaining_mb',
            [resetMb, userId]
        );

        res.json({ 
            message: 'Quota refilled successfully!', 
            new_quota: updateRes.rows[0].remaining_mb 
        });
    } catch (err) {
        res.status(500).json({ error: 'Quota reset error.' });
    }
});

app.listen(port, () => console.log(`Server is ready on port ${port}!`));