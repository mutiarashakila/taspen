const express = require('express');
const router = express.Router();
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });
const db = require('../db.js');
//const { /*requireLogin*/ } = require('../middleware/auth');

function generateLogId() {
    return 'LOG' + Date.now() + Math.random().toString(36).substr(2, 5);
}

async function logAdminActivity(id_admin, jenis_aktivitas, detail_perubahan) {
    const id_log = generateLogId();
    try {
        const sql = 'INSERT INTO Log_Aktivitas_Admin (id_log, timestamp, id_admin, jenis_aktivitas, detail_perubahan) VALUES (?, NOW(), ?, ?, ?)';
        const [result] = await db.query(sql, [id_log, id_admin, jenis_aktivitas, detail_perubahan]);
        return result;
    } catch (error) {
        console.error('Error logging admin activity:', error);
        throw error;
    }
}

router.get('/' /*requireLogin*/, async (req, res) => {
    try {
        const [adminRows] = await db.query('SELECT * FROM Admin WHERE email = ?', [req.session.email]);

        if (!adminRows.length) {
            return res.status(404).send('Admin not found');
        }

        const activitySql = `
            SELECT * FROM Log_Aktivitas_Admin 
            WHERE id_admin = ? 
            ORDER BY timestamp DESC 
            LIMIT 10
        `;
        const [activities] = await db.query(activitySql, [adminRows[0].id_admin]);

        res.render('profil', {
            title: 'Profil',
            admin: adminRows[0],
            activities: activities
        });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).send('Server error');
    }
});

router.post('/update-photo'/*requireLogin*/, upload.single('photo'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        const [updateResult] = await db.query(
            'UPDATE Admin SET foto = ? WHERE email = ?',
            [req.file.buffer, req.session.email]
        );

        const [adminRows] = await db.query(
            'SELECT id_admin FROM Admin WHERE email = ?',
            [req.session.email]
        );

        await logAdminActivity(
            adminRows[0].id_admin,
            'UPDATE_PHOTO',
            'Updated profile photo'
        );

        res.json({ message: 'Photo updated successfully' });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

router.get('/photo/:id', async (req, res) => {
    try {
        const [rows] = await db.query(
            'SELECT foto FROM Admin WHERE id_admin = ?',
            [req.params.id]
        );

        if (rows[0] && rows[0].foto) {
            res.set('Content-Type', 'image/jpeg');
            res.send(rows[0].foto);
        } else {
            res.sendFile('default-profile.jpg', { root: './public/img' });
        }
    } catch (error) {
        console.error('Error:', error);
        res.status(500).send('Server error');
    }
});

router.post('/update-profile' /*requireLogin*/, async (req, res) => {
    try {
        const { username, email } = req.body;
        const [updateResult] = await db.query(
            'UPDATE Admin SET username = ?, email = ? WHERE email = ?',
            [username, email, req.session.email]
        );
        const [adminRows] = await db.query(
            'SELECT id_admin FROM Admin WHERE email = ?',
            [req.session.email]
        );
        await logAdminActivity(
            adminRows[0].id_admin,
            'UPDATE_PROFILE',
            `Updated profile information: username=${username}, email=${email}`
        );
        if (email !== req.session.email) {
            req.session.email = email;
        }

        res.json({ message: 'Profile updated successfully' });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;