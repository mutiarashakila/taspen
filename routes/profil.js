const express = require('express');
const router = express.Router();
const multer = require('multer');
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    }
});
const db = require('../db.js');
const bcrypt = require('bcrypt');
const { requireLogin } = require('../routes/auth.js');

// Helper function untuk generate log ID
function generateLogId() {
    return 'LOG' + Date.now() + Math.random().toString(36).substr(2, 5);
}

// Helper function untuk logging aktivitas
async function logAdminActivity(id_admin, jenis_aktivitas, detail_perubahan) {
    const id_log = generateLogId();
    try {
        const sql = 'INSERT INTO Log_Aktivitas(id_log, timestamp, id_admin, jenis_aktivitas, detail_perubahan) VALUES (?, NOW(), ?, ?, ?)';
        await db.query(sql, [id_log, id_admin, jenis_aktivitas, detail_perubahan]);
    } catch (error) {
        console.error('Error logging admin activity:', error);
    }
}

// GET profile page
router.get('/', requireLogin, async (req, res) => {
    try {
        const [adminRows] = await db.query(
            'SELECT id_admin, username, email, foto FROM Admin WHERE email = ?', 
            [req.session.email]
        );

        if (!adminRows.length) {
            return res.status(404).send('Admin not found');
        }

        const [activities] = await db.query(
            `SELECT * FROM Log_Aktivitas 
             WHERE id_admin = ? 
             ORDER BY timestamp DESC 
             LIMIT 10`,
            [adminRows[0].id_admin]
        );

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

// POST update profile
router.post('/update-profil', requireLogin, async (req, res) => {
    const conn = await db.getConnection();
    try {
        await conn.beginTransaction();

        const { username, email, currentPassword, newPassword } = req.body;

        // Get current admin data
        const [adminRows] = await conn.query(
            'SELECT id_admin, password FROM Admin WHERE email = ?',
            [req.session.email]
        );

        if (!adminRows.length) {
            await conn.rollback();
            return res.status(404).json({ message: 'Admin not found' });
        }

        // If changing password, verify current password
        if (newPassword) {
            if (!currentPassword) {
                await conn.rollback();
                return res.status(400).json({ message: 'Current password is required to change password' });
            }

            const isValidPassword = await bcrypt.compare(currentPassword, adminRows[0].password);
            if (!isValidPassword) {
                await conn.rollback();
                return res.status(401).json({ message: 'Current password is incorrect' });
            }
        }

        // Prepare update query
        let updateQuery = 'UPDATE Admin SET username = ?, email = ?';
        let queryParams = [username, email];

        // Add password to update if provided
        if (newPassword) {
            const hashedPassword = await bcrypt.hash(newPassword, 10);
            updateQuery += ', password = ?';
            queryParams.push(hashedPassword);
        }

        // Add where clause
        queryParams.push(req.session.email);
        updateQuery += ' WHERE email = ?';

        // Execute update
        const [updateResult] = await conn.query(updateQuery, queryParams);

        if (updateResult.affectedRows === 0) {
            await conn.rollback();
            return res.status(400).json({ message: 'No changes were made' });
        }

        // Log the activity
        await logAdminActivity(
            adminRows[0].id_admin,
            'UPDATE_PROFILE',
            `Updated profile information: username=${username}, email=${email}${newPassword ? ', password changed' : ''}`
        );

        // Update session if email changed
        if (email !== req.session.email) {
            req.session.email = email;
        }

        await conn.commit();
        res.json({ message: 'Profile updated successfully' });

    } catch (error) {
        await conn.rollback();
        console.error('Error updating profile:', error);
        res.status(500).json({ 
            message: 'Server error while updating profile',
            error: error.message 
        });
    } finally {
        conn.release();
    }
});

// POST update photo
router.post('/update-photo', requireLogin, upload.single('photo'), async (req, res) => {
    const conn = await db.getConnection();
    try {
        await conn.beginTransaction();

        if (!req.file) {
            await conn.rollback();
            return res.status(400).json({ message: 'No file uploaded' });
        }

        if (!req.file.mimetype.startsWith('image/')) {
            await conn.rollback();
            return res.status(400).json({ message: 'Only image files are allowed' });
        }

        // Get admin ID first
        const [adminRows] = await conn.query(
            'SELECT id_admin FROM Admin WHERE email = ?',
            [req.session.email]
        );

        if (!adminRows.length) {
            await conn.rollback();
            return res.status(404).json({ message: 'Admin not found' });
        }

        // Update photo
        const [updateResult] = await conn.query(
            'UPDATE Admin SET foto = ? WHERE id_admin = ?',
            [req.file.buffer, adminRows[0].id_admin]
        );

        if (updateResult.affectedRows === 0) {
            await conn.rollback();
            return res.status(400).json({ message: 'Failed to update photo' });
        }

        // Log activity
        await logAdminActivity(
            adminRows[0].id_admin,
            'UPDATE_PHOTO',
            'Updated profile photo'
        );

        await conn.commit();
        res.json({ message: 'Photo updated successfully' });

    } catch (error) {
        await conn.rollback();
        console.error('Error updating photo:', error);
        res.status(500).json({ 
            message: 'Server error while updating photo',
            error: error.message 
        });
    } finally {
        conn.release();
    }
});

// GET photo
router.get('/photo/:id', requireLogin, async (req, res) => {
    try {
        const [rows] = await db.query(
            'SELECT foto FROM Admin WHERE id_admin = ?', 
            [req.params.id]
        );

        if (rows[0] && rows[0].foto) {
            res.set('Content-Type', 'image/jpeg');
            res.send(rows[0].foto);
        } else {
            res.status(404).send('Photo not found');
        }
    } catch (error) {
        console.error('Error fetching photo:', error);
        res.status(500).send('Error fetching photo');
    }
});

module.exports = router;