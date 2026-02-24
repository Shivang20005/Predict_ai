const db = require('../config/db');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const JWT_SECRET = process.env.JWT_SECRET || 'predict_ai_secret_key_2026';

// Medical Shop Registration
exports.register = async (req, res) => {
    try {
        const { shop_name, owner_name, email, password, phone, address, license_number } = req.body;

        if (!shop_name || !owner_name || !email || !password) {
            return res.status(400).json({ success: false, message: 'Required fields are missing' });
        }

        const { rows: existing } = await db.query('SELECT * FROM medical_shops WHERE email = $1', [email]);
        if (existing.length > 0) {
            return res.status(400).json({ success: false, message: 'Email already registered' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const { rows: [result] } = await db.query(
            'INSERT INTO medical_shops (shop_name, owner_name, email, password, phone, address, license_number) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING medical_id',
            [shop_name, owner_name, email, hashedPassword, phone, address, license_number]
        );

        res.status(201).json({
            success: true,
            message: 'Medical Shop registered successfully',
            medical_id: result.medical_id
        });
    } catch (error) {
        console.error('Medical registration error:', error);
        res.status(500).json({ success: false, message: 'Registration failed', error: error.message });
    }
};

// Medical Shop Login
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        const { rows: shops } = await db.query('SELECT * FROM medical_shops WHERE email = $1', [email]);
        if (shops.length === 0) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        const shop = shops[0];
        const isMatch = await bcrypt.compare(password, shop.password);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        const token = jwt.sign(
            { medical_id: shop.medical_id, role: 'medical', shop_name: shop.shop_name },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            success: true,
            message: 'Login successful',
            token,
            shop: {
                medical_id: shop.medical_id,
                shop_name: shop.shop_name,
                email: shop.email
            }
        });
    } catch (error) {
        console.error('Medical login error:', error);
        res.status(500).json({ success: false, message: 'Login failed', error: error.message });
    }
};

// Get List of All Medical Shops (for Patients)
exports.getAllMedicals = async (req, res) => {
    try {
        const { rows: medicals } = await db.query('SELECT medical_id, shop_name, owner_name, address, phone FROM medical_shops');
        res.json({ success: true, medicals });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch medical shops' });
    }
};

// Create Medicine Booking (Patient)
exports.bookMedicine = async (req, res) => {
    try {
        const { medical_id, patient_name, phone, address, prescription_id, report_id, notes } = req.body;

        console.log('Book Medicine Request:', {
            medical_id, patient_name, phone, address, prescription_id, report_id, notes,
            user_patient_id: req.patient ? req.patient.patient_id : 'undefined'
        });

        const patient_id = req.patient.patient_id;

        const { rows: [result] } = await db.query(
            'INSERT INTO medicine_bookings (medical_id, patient_id, patient_name, phone, address, prescription_id, report_id, notes) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING order_id',
            [medical_id, patient_id, patient_name, phone, address, prescription_id || null, report_id || null, notes]
        );

        console.log('Book Medicine Success. Order ID:', result.order_id);

        // Notify Medical Shop
        await db.query(
            'INSERT INTO notifications (user_type, user_id, message) VALUES ($1, $2, $3)',
            ['medical', medical_id, `New Medicine Booking from ${patient_name}`]
        );

        // Immediate confirmation message to patient
        const now = new Date();
        const nextDay = new Date(now);
        nextDay.setDate(now.getDate() + 1);

        const dateStr = nextDay.toLocaleDateString();
        const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        await db.query(
            'INSERT INTO notifications (user_type, user_id, message) VALUES ($1, $2, $3)',
            ['patient', patient_id, `Order Placed: Your medicine order has been received. Expected delivery by Tomorrow (${dateStr}) at ${timeStr}.`]
        );

        res.status(201).json({
            success: true,
            message: 'Medicine booking request sent successfully',
            order_id: result.order_id
        });
    } catch (error) {
        console.error('Medicine booking error:', error);
        res.status(500).json({ success: false, message: 'Booking failed', error: error.message });
    }
};

// Get Bookings for a Medical Shop
exports.getShopBookings = async (req, res) => {
    try {
        const medical_id = req.hospital.medical_id;
        console.log(`Fetching bookings for Medical Shop ID: ${medical_id}`);

        const { rows: bookings } = await db.query(
            `SELECT * 
             FROM medicine_bookings 
             WHERE medical_id = $1 
             ORDER BY created_at DESC`,
            [medical_id]
        );

        console.log(`Found ${bookings.length} bookings for shop ${medical_id}`);
        res.json({ success: true, bookings });
    } catch (error) {
        console.error('Fetch shop bookings error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch bookings' });
    }
};

// Update Booking Status (Accept/Reject/Deliver)
exports.updateBookingStatus = async (req, res) => {
    try {
        const { order_id } = req.params;
        const { status, delivery_date, cost } = req.body;
        const medical_id = req.hospital.medical_id;

        console.log(`Updating Order #${order_id} to ${status}. Date: ${delivery_date}, Cost: ${cost}`);

        const { rows: [bookingCheck] } = await db.query(
            'SELECT * FROM medicine_bookings WHERE order_id = $1 AND medical_id = $2',
            [order_id, medical_id]
        );

        if (bookingCheck.length === 0) {
            return res.status(404).json({ success: false, message: 'Booking not found or unauthorized' });
        }

        let query = 'UPDATE medicine_bookings SET status = $1';
        let params = [status];

        if (delivery_date) {
            query += ', delivery_date = $2';
            params.push(delivery_date);
        }

        if (cost) {
            query += `, cost = $${params.length + 1}`;
            params.push(cost);
        }

        query += ` WHERE order_id = $${params.length + 1}`;
        params.push(order_id);

        await db.query(query, params);

        const patient_id = bookingCheck[0].patient_id;

        let message = `Your medicine order #${order_id} status updated to: ${status}`;

        if (status === 'accepted') {
            // Logic for when Medical Shop Accepts
            const dateStr = delivery_date ? new Date(delivery_date).toLocaleString() : 'soon';
            const costStr = cost ? `₹${cost}` : 'To be confirmed';
            message = `Order Accepted: Your order #${order_id} is accepted. Cost: ${costStr}. Delivery by: ${dateStr}. Please confirm to proceed.`;
        } else if (status === 'out_for_delivery') {
            message = `Out for Delivery: Order #${order_id} is on its way!`;
        } else if (status === 'delivered') {
            message = `Delivered: Order #${order_id} has been delivered successfully.`;
        }

        // Send notification
        await db.query(
            'INSERT INTO notifications (user_type, user_id, message) VALUES ($1, $2, $3)',
            ['patient', patient_id, message]
        );

        res.json({ success: true, message: 'Booking updated successfully' });
    } catch (error) {
        console.error('Update booking status error:', error);
        res.status(500).json({ success: false, message: 'Update failed' });
    }
};

// Patient responses to delivery dates
exports.respondToDeliveryDate = async (req, res) => {
    try {
        const { order_id } = req.params;
        const { action } = req.body; // 'accept' or 'reject'
        const patient_id = req.patient.patient_id;

        const { rows: [bookingCheck] } = await db.query(
            'SELECT * FROM medicine_bookings WHERE order_id = $1 AND patient_id = $2',
            [order_id, patient_id]
        );

        if (bookingCheck.length === 0) {
            return res.status(404).json({ success: false, message: 'Booking not found' });
        }

        const newStatus = action === 'accept' ? 'confirmed' : 'rejected';
        await db.query('UPDATE medicine_bookings SET status = $1 WHERE order_id = $2', [newStatus, order_id]);

        // Notify Medical
        await db.query(
            'INSERT INTO notifications (user_type, user_id, message) VALUES ($1, $2, $3)',
            ['medical', bookingCheck.medical_id, `Patient has ${action}ed the delivery date for Order #${order_id}`]
        );

        res.json({ success: true, message: `Booking ${newStatus}` });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Response failed' });
    }
};

// Get Patient's Medicine Bookings
exports.getPatientBookings = async (req, res) => {
    try {
        const patient_id = req.patient.patient_id;
        const { rows: bookings } = await db.query(
            `SELECT mb.*, ms.shop_name 
             FROM medicine_bookings mb 
             JOIN medical_shops ms ON mb.medical_id = ms.medical_id 
             WHERE mb.patient_id = $1 
             ORDER BY mb.created_at DESC`,
            [patient_id]
        );
        res.json({ success: true, bookings });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch bookings' });
    }
};
