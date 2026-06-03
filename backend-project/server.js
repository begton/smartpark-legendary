// ============================================
// EPMS BACKEND SERVER - server.js
// Employee Payroll Management System API
// ============================================

const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Create Express app
const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ============================================
// Database Connection
// ============================================
const db = mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'EPMS'
});

// Connect to database
db.connect((err) => {
    if (err) {
        console.error('Database connection failed:', err);
        return;
    }
    console.log('Connected to EPMS database successfully!');
});

// ============================================
// AUTHENTICATION APIs
// ============================================

// Login endpoint
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    
    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password required' });
    }
    
    const query = 'SELECT userId, username, fullName, email FROM Users WHERE username = ? AND password = ?';
    db.query(query, [username, password], (err, results) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        if (results.length === 0) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        res.json({ 
            success: true, 
            user: results[0],
            message: 'Login successful' 
        });
    });
});

// Register endpoint
app.post('/api/register', (req, res) => {
    const { username, password, email, fullName } = req.body;
    
    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password required' });
    }
    
    const query = 'INSERT INTO Users (username, password, email, fullName) VALUES (?, ?, ?, ?)';
    db.query(query, [username, password, email || null, fullName || null], (err, result) => {
        if (err) {
            if (err.code === 'ER_DUP_ENTRY') {
                return res.status(409).json({ error: 'Username already exists' });
            }
            return res.status(500).json({ error: 'Database error' });
        }
        res.json({ 
            success: true, 
            userId: result.insertId,
            message: 'Registration successful' 
        });
    });
});

// ============================================
// DEPARTMENT APIs (CRUD)
// ============================================

// GET all departments
app.get('/api/departments', (req, res) => {
    const query = 'SELECT * FROM Department ORDER BY departmentCode';
    db.query(query, (err, results) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(results);
    });
});

// GET single department
app.get('/api/departments/:code', (req, res) => {
    const query = 'SELECT * FROM Department WHERE departmentCode = ?';
    db.query(query, [req.params.code], (err, results) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (results.length === 0) {
            return res.status(404).json({ error: 'Department not found' });
        }
        res.json(results[0]);
    });
});

// POST - Create department
app.post('/api/departments', (req, res) => {
    const { departmentCode, departmentName, grossSalary } = req.body;
    
    if (!departmentCode || !departmentName || !grossSalary) {
        return res.status(400).json({ error: 'All fields are required' });
    }
    
    const query = 'INSERT INTO Department (departmentCode, departmentName, grossSalary) VALUES (?, ?, ?)';
    db.query(query, [departmentCode, departmentName, grossSalary], (err, result) => {
        if (err) {
            if (err.code === 'ER_DUP_ENTRY') {
                return res.status(409).json({ error: 'Department code already exists' });
            }
            return res.status(500).json({ error: err.message });
        }
        res.json({ 
            success: true, 
            message: 'Department created successfully',
            departmentCode: departmentCode 
        });
    });
});

// PUT - Update department
app.put('/api/departments/:code', (req, res) => {
    const { departmentName, grossSalary } = req.body;
    const query = 'UPDATE Department SET departmentName = ?, grossSalary = ? WHERE departmentCode = ?';
    db.query(query, [departmentName, grossSalary, req.params.code], (err, result) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Department not found' });
        }
        res.json({ success: true, message: 'Department updated successfully' });
    });
});

// DELETE - Delete department
app.delete('/api/departments/:code', (req, res) => {
    const query = 'DELETE FROM Department WHERE departmentCode = ?';
    db.query(query, [req.params.code], (err, result) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Department not found' });
        }
        res.json({ success: true, message: 'Department deleted successfully' });
    });
});

// ============================================
// EMPLOYEE APIs (CRUD)
// ============================================

// GET all employees with department info
app.get('/api/employees', (req, res) => {
    const query = `
        SELECT e.*, d.departmentName, d.grossSalary as departmentGrossSalary 
        FROM Employee e
        LEFT JOIN Department d ON e.departmentCode = d.departmentCode
        ORDER BY e.employeeNumber
    `;
    db.query(query, (err, results) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(results);
    });
});

// GET single employee
app.get('/api/employees/:number', (req, res) => {
    const query = `
        SELECT e.*, d.departmentName 
        FROM Employee e
        LEFT JOIN Department d ON e.departmentCode = d.departmentCode
        WHERE e.employeeNumber = ?
    `;
    db.query(query, [req.params.number], (err, results) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (results.length === 0) {
            return res.status(404).json({ error: 'Employee not found' });
        }
        res.json(results[0]);
    });
});

// POST - Create employee
app.post('/api/employees', (req, res) => {
    const { employeeNumber, firstName, lastName, address, position, telephone, gender, hiredDate, departmentCode } = req.body;
    
    if (!employeeNumber || !firstName || !lastName || !position || !gender || !hiredDate) {
        return res.status(400).json({ error: 'Required fields missing' });
    }
    
    const query = `INSERT INTO Employee 
        (employeeNumber, firstName, lastName, address, position, telephone, gender, hiredDate, departmentCode) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    
    db.query(query, [employeeNumber, firstName, lastName, address, position, telephone, gender, hiredDate, departmentCode], 
        (err, result) => {
            if (err) {
                if (err.code === 'ER_DUP_ENTRY') {
                    return res.status(409).json({ error: 'Employee number already exists' });
                }
                return res.status(500).json({ error: err.message });
            }
            res.json({ success: true, message: 'Employee created successfully' });
        });
});

// PUT - Update employee
app.put('/api/employees/:number', (req, res) => {
    const { firstName, lastName, address, position, telephone, gender, hiredDate, departmentCode } = req.body;
    const query = `UPDATE Employee SET 
        firstName = ?, lastName = ?, address = ?, position = ?, 
        telephone = ?, gender = ?, hiredDate = ?, departmentCode = ? 
        WHERE employeeNumber = ?`;
    
    db.query(query, [firstName, lastName, address, position, telephone, gender, hiredDate, departmentCode, req.params.number], 
        (err, result) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            if (result.affectedRows === 0) {
                return res.status(404).json({ error: 'Employee not found' });
            }
            res.json({ success: true, message: 'Employee updated successfully' });
        });
});

// DELETE - Delete employee
app.delete('/api/employees/:number', (req, res) => {
    const query = 'DELETE FROM Employee WHERE employeeNumber = ?';
    db.query(query, [req.params.number], (err, result) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Employee not found' });
        }
        res.json({ success: true, message: 'Employee deleted successfully' });
    });
});

// ============================================
// SALARY APIs (Full CRUD)
// ============================================

// GET all salary records with employee details
app.get('/api/salaries', (req, res) => {
    const query = `
        SELECT s.*, e.firstName, e.lastName, e.position, d.departmentName
        FROM Salary s
        JOIN Employee e ON s.employeeNumber = e.employeeNumber
        LEFT JOIN Department d ON e.departmentCode = d.departmentCode
        ORDER BY s.month DESC, s.salaryId DESC
    `;
    db.query(query, (err, results) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(results);
    });
});

// GET salary by ID
app.get('/api/salaries/:id', (req, res) => {
    const query = `
        SELECT s.*, e.firstName, e.lastName, e.position
        FROM Salary s
        JOIN Employee e ON s.employeeNumber = e.employeeNumber
        WHERE s.salaryId = ?
    `;
    db.query(query, [req.params.id], (err, results) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (results.length === 0) {
            return res.status(404).json({ error: 'Salary record not found' });
        }
        res.json(results[0]);
    });
});

// POST - Create salary record
app.post('/api/salaries', (req, res) => {
    const { employeeNumber, grossSalary, totalDeduction, netSalary, month } = req.body;
    
    if (!employeeNumber || !grossSalary || !month) {
        return res.status(400).json({ error: 'Required fields missing' });
    }
    
    const finalNetSalary = netSalary || (grossSalary - (totalDeduction || 0));
    
    const query = `INSERT INTO Salary 
        (employeeNumber, grossSalary, totalDeduction, netSalary, month) 
        VALUES (?, ?, ?, ?, ?)`;
    
    db.query(query, [employeeNumber, grossSalary, totalDeduction || 0, finalNetSalary, month], 
        (err, result) => {
            if (err) {
                if (err.code === 'ER_DUP_ENTRY') {
                    return res.status(409).json({ error: 'Salary record already exists for this employee and month' });
                }
                return res.status(500).json({ error: err.message });
            }
            res.json({ 
                success: true, 
                message: 'Salary record created successfully',
                salaryId: result.insertId 
            });
        });
});

// PUT - Update salary record
app.put('/api/salaries/:id', (req, res) => {
    const { grossSalary, totalDeduction, netSalary, month } = req.body;
    const finalNetSalary = netSalary || (grossSalary - (totalDeduction || 0));
    
    const query = `UPDATE Salary SET 
        grossSalary = ?, totalDeduction = ?, netSalary = ?, month = ? 
        WHERE salaryId = ?`;
    
    db.query(query, [grossSalary, totalDeduction || 0, finalNetSalary, month, req.params.id], 
        (err, result) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            if (result.affectedRows === 0) {
                return res.status(404).json({ error: 'Salary record not found' });
            }
            res.json({ success: true, message: 'Salary record updated successfully' });
        });
});

// DELETE - Delete salary record
app.delete('/api/salaries/:id', (req, res) => {
    const query = 'DELETE FROM Salary WHERE salaryId = ?';
    db.query(query, [req.params.id], (err, result) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Salary record not found' });
        }
        res.json({ success: true, message: 'Salary record deleted successfully' });
    });
});

// ============================================
// REPORT APIs
// ============================================

// Monthly payroll report
app.get('/api/reports/monthly-payroll', (req, res) => {
    const { month } = req.query;
    
    if (!month) {
        return res.status(400).json({ error: 'Month parameter required (YYYY-MM-DD format)' });
    }
    
    const query = `
        SELECT 
            e.employeeNumber,
            e.firstName,
            e.lastName,
            e.position,
            d.departmentName,
            s.grossSalary,
            s.totalDeduction,
            s.netSalary,
            DATE_FORMAT(s.month, '%Y-%m') as payrollMonth
        FROM Salary s
        JOIN Employee e ON s.employeeNumber = e.employeeNumber
        LEFT JOIN Department d ON e.departmentCode = d.departmentCode
        WHERE DATE_FORMAT(s.month, '%Y-%m') = DATE_FORMAT(?, '%Y-%m')
        ORDER BY d.departmentName, e.lastName
    `;
    
    db.query(query, [month], (err, results) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        
        // Calculate summary
        const summary = {
            totalEmployees: results.length,
            totalGrossSalary: results.reduce((sum, r) => sum + parseFloat(r.grossSalary), 0),
            totalDeductions: results.reduce((sum, r) => sum + parseFloat(r.totalDeduction), 0),
            totalNetSalary: results.reduce((sum, r) => sum + parseFloat(r.netSalary), 0)
        };
        
        res.json({ data: results, summary });
    });
});

// Department payroll summary
app.get('/api/reports/department-summary', (req, res) => {
    const { month } = req.query;
    
    const query = `
        SELECT 
            d.departmentCode,
            d.departmentName,
            COUNT(e.employeeNumber) as employeeCount,
            COALESCE(SUM(s.netSalary), 0) as totalPayroll,
            COALESCE(AVG(s.netSalary), 0) as averageSalary
        FROM Department d
        LEFT JOIN Employee e ON d.departmentCode = e.departmentCode
        LEFT JOIN Salary s ON e.employeeNumber = s.employeeNumber 
            AND (DATE_FORMAT(s.month, '%Y-%m') = DATE_FORMAT(?, '%Y-%m') OR ? IS NULL)
        GROUP BY d.departmentCode, d.departmentName
        ORDER BY d.departmentName
    `;
    
    db.query(query, [month || '2024-01-01', month], (err, results) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(results);
    });
});

// Employee salary history
app.get('/api/reports/employee-history/:employeeNumber', (req, res) => {
    const query = `
        SELECT 
            s.salaryId,
            s.month,
            s.grossSalary,
            s.totalDeduction,
            s.netSalary,
            e.firstName,
            e.lastName
        FROM Salary s
        JOIN Employee e ON s.employeeNumber = e.employeeNumber
        WHERE s.employeeNumber = ?
        ORDER BY s.month DESC
    `;
    
    db.query(query, [req.params.employeeNumber], (err, results) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(results);
    });
});

// ============================================
// DASHBOARD STATISTICS API
// ============================================

app.get('/api/dashboard/stats', (req, res) => {
    const queries = {
        employeeCount: 'SELECT COUNT(*) as count FROM Employee',
        departmentCount: 'SELECT COUNT(*) as count FROM Department',
        salaryCount: 'SELECT COUNT(*) as count FROM Salary',
        totalPayroll: 'SELECT COALESCE(SUM(netSalary), 0) as total FROM Salary WHERE MONTH(month) = MONTH(CURDATE()) AND YEAR(month) = YEAR(CURDATE())'
    };
    
    Promise.all([
        new Promise((resolve, reject) => {
            db.query(queries.employeeCount, (err, result) => err ? reject(err) : resolve(result[0].count));
        }),
        new Promise((resolve, reject) => {
            db.query(queries.departmentCount, (err, result) => err ? reject(err) : resolve(result[0].count));
        }),
        new Promise((resolve, reject) => {
            db.query(queries.salaryCount, (err, result) => err ? reject(err) : resolve(result[0].count));
        }),
        new Promise((resolve, reject) => {
            db.query(queries.totalPayroll, (err, result) => err ? reject(err) : resolve(result[0].total));
        })
    ]).then(([employeeCount, departmentCount, salaryCount, totalPayroll]) => {
        res.json({ employeeCount, departmentCount, salaryCount, totalPayroll });
    }).catch(err => {
        res.status(500).json({ error: err.message });
    });
});

// ============================================
// Start Server
// ============================================
app.listen(PORT, () => {
    console.log(`EPMS Backend Server running on port ${PORT}`);
    console.log(`API URL: http://localhost:${PORT}`);
    console.log('\nAvailable Endpoints:');
    console.log('  POST   /api/login');
    console.log('  POST   /api/register');
    console.log('  GET    /api/departments');
    console.log('  POST   /api/departments');
    console.log('  PUT    /api/departments/:code');
    console.log('  DELETE /api/departments/:code');
    console.log('  GET    /api/employees');
    console.log('  POST   /api/employees');
    console.log('  PUT    /api/employees/:number')
    console.log('  DELETE /api/employees/:number');
    console.log('  GET    /api/salaries');
    console.log('  POST   /api/salaries');
    console.log('  PUT    /api/salaries/:id');
    console.log('  DELETE /api/salaries/:id');
    console.log('  GET    /api/reports/monthly-payroll');
    console.log('  GET    /api/dashboard/stats');
});