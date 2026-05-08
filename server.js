require('dotenv').config(); 
const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');



// ... other imports
const app = express();

app.use(cors());
app.use(express.json());

// ─── DATABASE CONNECTION ───
const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME
});

db.connect((err) => {
    if (err) { console.error('DB connection failed:', err.stack); return; }
    console.log('Connected to MySQL.');

    // ══════════════════════════════════════════════
    //  AUTO-MIGRATIONS — run on every server start
    //  Duplicate column/table errors are ignored.
    // ══════════════════════════════════════════════
    const migrations = [
        // Fee columns on students table
        "ALTER TABLE students ADD COLUMN fee_status ENUM('paid','pending') NOT NULL DEFAULT 'pending'",
        "ALTER TABLE students ADD COLUMN fee_amount DECIMAL(10,2) DEFAULT 0",
        "ALTER TABLE students ADD COLUMN fee_due_date DATE DEFAULT NULL",

        // Leave / Outpass table
        `CREATE TABLE IF NOT EXISTS leave_requests (
            id             INT AUTO_INCREMENT PRIMARY KEY,
            roll_number    VARCHAR(50)  NOT NULL,
            student_name   VARCHAR(100) NOT NULL,
            hostel_name    VARCHAR(100) NOT NULL,
            room_number    VARCHAR(20)  NOT NULL,
            leave_from     DATETIME     NOT NULL,
            leave_to       DATETIME     NOT NULL,
            destination    VARCHAR(255) NOT NULL,
            reason         TEXT,
            contact_number VARCHAR(20),
            status         ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
            warden_remark  TEXT,
            applied_at     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at     DATETIME     ON UPDATE CURRENT_TIMESTAMP
        )`,

        // Guest Entry Log table
        `CREATE TABLE IF NOT EXISTS guest_entries (
            id              INT AUTO_INCREMENT PRIMARY KEY,
            visitor_name    VARCHAR(100) NOT NULL,
            visitor_phone   VARCHAR(20),
            visitor_relation VARCHAR(50),
            student_roll    VARCHAR(50)  NOT NULL,
            student_name    VARCHAR(100) NOT NULL,
            hostel_name     VARCHAR(100) NOT NULL,
            room_number     VARCHAR(20)  NOT NULL,
            purpose         VARCHAR(255),
            entry_time      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
            exit_time       DATETIME     DEFAULT NULL,
            status          ENUM('in','out') NOT NULL DEFAULT 'in'
        )`
    ];

    migrations.forEach(function(sql) {
        db.query(sql, function(err) {
            if (err && err.code !== 'ER_DUP_FIELDNAME' && err.code !== 'ER_TABLE_EXISTS_ERROR') {
                console.warn('Migration warning:', err.message);
            }
        });
    });
});

// ════════════════════════════════════════════
//  GET  /api/rooms
// ════════════════════════════════════════════
app.get('/api/rooms', (req, res) => {
    const sql = `
        SELECT rooms.*, hostels.name AS hostel_name
        FROM rooms
        JOIN hostels ON rooms.hostel_id = hostels.id
        ORDER BY hostels.name, rooms.room_number
    `;
    db.query(sql, (err, results) => {
        if (err) return res.status(500).json({ error: err.sqlMessage });
        res.json(results);
    });
});

// ════════════════════════════════════════════
//  GET  /api/rooms/:id/students
//  Room detail modal
// ════════════════════════════════════════════
app.get('/api/rooms/:id/students', (req, res) => {
    const sql = `
        SELECT s.name, s.roll_number, s.fee_status, s.fee_amount, s.fee_due_date,
               r.room_number, h.name AS hostel_name
        FROM students s
        JOIN rooms r   ON s.room_id   = r.id
        JOIN hostels h ON r.hostel_id = h.id
        WHERE s.room_id = ?
        ORDER BY s.name
    `;
    db.query(sql, [req.params.id], (err, results) => {
        if (err) return res.status(500).json({ error: err.sqlMessage });
        res.json(results);
    });
});

// ════════════════════════════════════════════
//  GET  /api/mess
// ════════════════════════════════════════════
app.get('/api/mess', (req, res) => {
    db.query("SELECT * FROM mess_menu", (err, results) => {
        if (err) return res.status(500).json({ error: err.sqlMessage });
        res.json(results);
    });
});

// ════════════════════════════════════════════
//  GET  /api/students
// ════════════════════════════════════════════
app.get('/api/students', (req, res) => {
    const sql = `
        SELECT s.name, s.roll_number, s.fee_status, s.fee_amount, s.fee_due_date,
               r.room_number, h.name AS hostel_name
        FROM students s
        JOIN rooms r   ON s.room_id   = r.id
        JOIN hostels h ON r.hostel_id = h.id
        ORDER BY h.name, r.room_number, s.name
    `;
    db.query(sql, (err, results) => {
        if (err) return res.status(500).json({ error: err.sqlMessage });
        res.json(results);
    });
});

// ════════════════════════════════════════════
//  POST  /api/allot
// ════════════════════════════════════════════
app.post('/api/allot', (req, res) => {
    const { name, roll_number, room_id, fee_amount, fee_due_date } = req.body;
    if (!name || !roll_number || !room_id)
        return res.status(400).json({ error: "Missing required fields." });

    db.query("SELECT occupied_seats, total_seats FROM rooms WHERE id = ?", [room_id], (err, results) => {
        if (err) return res.status(500).json({ error: err.sqlMessage });
        if (!results.length) return res.status(404).json({ error: "Room not found." });
        const { occupied_seats, total_seats } = results[0];
        if (occupied_seats >= total_seats) return res.status(400).json({ error: "Room is full!" });

        db.query("SELECT id FROM students WHERE roll_number = ?", [roll_number], (err2, existing) => {
            if (err2) return res.status(500).json({ error: err2.sqlMessage });
            if (existing.length) return res.status(400).json({ error: "Roll number already allotted." });

            const sql = `INSERT INTO students (name, roll_number, room_id, fee_status, fee_amount, fee_due_date)
                         VALUES (?, ?, ?, 'pending', ?, ?)`;
            db.query(sql, [name, roll_number, room_id, parseFloat(fee_amount) || 0, fee_due_date || null], (err3) => {
                if (err3) return res.status(500).json({ error: err3.sqlMessage });
                db.query("UPDATE rooms SET occupied_seats = occupied_seats + 1 WHERE id = ?", [room_id], (err4) => {
                    if (err4) return res.status(500).json({ error: err4.sqlMessage });
                    res.json({ message: "Allotted successfully." });
                });
            });
        });
    });
});

// ════════════════════════════════════════════
//  PATCH  /api/students/:roll_number/fee
// ════════════════════════════════════════════
app.patch('/api/students/:roll_number/fee', (req, res) => {
    const { fee_status, fee_amount, fee_due_date } = req.body;
    if (fee_status && !['paid','pending'].includes(fee_status))
        return res.status(400).json({ error: "Invalid fee_status." });

    const fields = [], values = [];
    if (fee_status   !== undefined) { fields.push('fee_status = ?');   values.push(fee_status); }
    if (fee_amount   !== undefined) { fields.push('fee_amount = ?');   values.push(parseFloat(fee_amount) || 0); }
    if (fee_due_date !== undefined) { fields.push('fee_due_date = ?'); values.push(fee_due_date || null); }
    if (!fields.length) return res.status(400).json({ error: "No fields to update." });

    values.push(req.params.roll_number);
    db.query(`UPDATE students SET ${fields.join(', ')} WHERE roll_number = ?`, values, (err, result) => {
        if (err) return res.status(500).json({ error: err.sqlMessage });
        if (!result.affectedRows) return res.status(404).json({ error: "Student not found." });
        res.json({ message: "Fee updated." });
    });
});

// ════════════════════════════════════════════
//  DELETE  /api/checkout/:roll_number
// ════════════════════════════════════════════
app.delete('/api/checkout/:roll_number', (req, res) => {
    db.query("SELECT room_id FROM students WHERE roll_number = ?", [req.params.roll_number], (err, results) => {
        if (err) return res.status(500).json({ error: err.sqlMessage });
        if (!results.length) return res.status(404).json({ error: "Student not found." });
        const roomId = results[0].room_id;

        db.query("DELETE FROM students WHERE roll_number = ?", [req.params.roll_number], (err2) => {
            if (err2) return res.status(500).json({ error: err2.sqlMessage });
            db.query("UPDATE rooms SET occupied_seats = occupied_seats - 1 WHERE id = ?", [roomId], (err3) => {
                if (err3) return res.status(500).json({ error: err3.sqlMessage });
                res.json({ message: "Student removed." });
            });
        });
    });
});

// ════════════════════════════════════════════
//  LEAVE / OUTPASS  ENDPOINTS
// ════════════════════════════════════════════

// GET all leave requests (optionally filter by status or hostel)
app.get('/api/leaves', (req, res) => {
    let sql = "SELECT * FROM leave_requests";
    const conditions = [];
    const values = [];

    if (req.query.status) { conditions.push("status = ?"); values.push(req.query.status); }
    if (req.query.hostel) { conditions.push("hostel_name = ?"); values.push(req.query.hostel); }
    if (conditions.length) sql += " WHERE " + conditions.join(" AND ");
    sql += " ORDER BY applied_at DESC";

    db.query(sql, values, (err, results) => {
        if (err) return res.status(500).json({ error: err.sqlMessage });
        res.json(results);
    });
});

// POST — student submits a new leave request
// Front-end sends roll_number; server looks up name/hostel/room automatically
app.post('/api/leaves', (req, res) => {
    const { roll_number, leave_from, leave_to, destination, reason, contact_number } = req.body;
    if (!roll_number || !leave_from || !leave_to || !destination)
        return res.status(400).json({ error: "roll_number, leave_from, leave_to, destination are required." });

    // Look up student details
    const lookupSql = `
        SELECT s.name, r.room_number, h.name AS hostel_name
        FROM students s
        JOIN rooms r   ON s.room_id   = r.id
        JOIN hostels h ON r.hostel_id = h.id
        WHERE s.roll_number = ?
    `;
    db.query(lookupSql, [roll_number], (err, results) => {
        if (err) return res.status(500).json({ error: err.sqlMessage });
        if (!results.length) return res.status(404).json({ error: "Student not found. Make sure the roll number is correct." });

        const { name, room_number, hostel_name } = results[0];
        const sql = `
            INSERT INTO leave_requests
                (roll_number, student_name, hostel_name, room_number, leave_from, leave_to, destination, reason, contact_number)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        db.query(sql, [roll_number, name, hostel_name, room_number, leave_from, leave_to, destination, reason || null, contact_number || null], (err2, result) => {
            if (err2) return res.status(500).json({ error: err2.sqlMessage });
            res.json({ message: "Leave request submitted.", id: result.insertId });
        });
    });
});

// PATCH — warden approves or rejects a leave request
app.patch('/api/leaves/:id/status', (req, res) => {
    const { status, warden_remark } = req.body;
    if (!['approved','rejected','pending'].includes(status))
        return res.status(400).json({ error: "status must be approved, rejected, or pending." });

    db.query(
        "UPDATE leave_requests SET status = ?, warden_remark = ?, updated_at = NOW() WHERE id = ?",
        [status, warden_remark || null, req.params.id],
        (err, result) => {
            if (err) return res.status(500).json({ error: err.sqlMessage });
            if (!result.affectedRows) return res.status(404).json({ error: "Leave request not found." });
            res.json({ message: "Leave status updated to " + status + "." });
        }
    );
});

// DELETE — remove a leave request
app.delete('/api/leaves/:id', (req, res) => {
    db.query("DELETE FROM leave_requests WHERE id = ?", [req.params.id], (err, result) => {
        if (err) return res.status(500).json({ error: err.sqlMessage });
        if (!result.affectedRows) return res.status(404).json({ error: "Leave request not found." });
        res.json({ message: "Leave request deleted." });
    });
});

// ════════════════════════════════════════════
//  GUEST ENTRY  ENDPOINTS
// ════════════════════════════════════════════

// GET all guest entries (optionally filter by status or hostel)
app.get('/api/guests', (req, res) => {
    let sql = "SELECT * FROM guest_entries";
    const conditions = [];
    const values = [];

    if (req.query.status) { conditions.push("status = ?"); values.push(req.query.status); }
    if (req.query.hostel) { conditions.push("hostel_name = ?"); values.push(req.query.hostel); }
    if (conditions.length) sql += " WHERE " + conditions.join(" AND ");
    sql += " ORDER BY entry_time DESC";

    db.query(sql, values, (err, results) => {
        if (err) return res.status(500).json({ error: err.sqlMessage });
        res.json(results);
    });
});

// POST — log a new guest entry
// Front-end sends student_roll; server looks up student info automatically
app.post('/api/guests', (req, res) => {
    const { visitor_name, visitor_phone, visitor_relation, student_roll, purpose } = req.body;
    if (!visitor_name || !student_roll)
        return res.status(400).json({ error: "visitor_name and student_roll are required." });

    // Look up student details
    const lookupSql = `
        SELECT s.name, r.room_number, h.name AS hostel_name
        FROM students s
        JOIN rooms r   ON s.room_id   = r.id
        JOIN hostels h ON r.hostel_id = h.id
        WHERE s.roll_number = ?
    `;
    db.query(lookupSql, [student_roll], (err, results) => {
        if (err) return res.status(500).json({ error: err.sqlMessage });
        if (!results.length) return res.status(404).json({ error: "Student not found. Check the roll number." });

        const { name: student_name, room_number, hostel_name } = results[0];
        const sql = `
            INSERT INTO guest_entries
                (visitor_name, visitor_phone, visitor_relation, student_roll, student_name, hostel_name, room_number, purpose)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `;
        db.query(sql, [visitor_name, visitor_phone || null, visitor_relation || null, student_roll, student_name, hostel_name, room_number, purpose || null], (err2, result) => {
            if (err2) return res.status(500).json({ error: err2.sqlMessage });
            res.json({ message: "Guest entry logged.", id: result.insertId });
        });
    });
});

// PATCH — mark a guest as exited
app.patch('/api/guests/:id/exit', (req, res) => {
    db.query(
        "UPDATE guest_entries SET status = 'out', exit_time = NOW() WHERE id = ? AND status = 'in'",
        [req.params.id],
        (err, result) => {
            if (err) return res.status(500).json({ error: err.sqlMessage });
            if (!result.affectedRows) return res.status(404).json({ error: "Entry not found or guest already exited." });
            res.json({ message: "Guest marked as exited." });
        }
    );
});

// DELETE — remove a guest entry record
app.delete('/api/guests/:id', (req, res) => {
    db.query("DELETE FROM guest_entries WHERE id = ?", [req.params.id], (err, result) => {
        if (err) return res.status(500).json({ error: err.sqlMessage });
        if (!result.affectedRows) return res.status(404).json({ error: "Guest entry not found." });
        res.json({ message: "Guest entry deleted." });
    });
});

// ════════════════════════════════════════════
const PORT = 5000;
app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));