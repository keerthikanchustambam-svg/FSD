const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = 3000;

// ===============================
// PATHS
// ===============================

const BACKEND_DIR = __dirname;
const FRONTEND_DIR = path.join(__dirname, '../frontend');
const DB_FILE = path.join(BACKEND_DIR, 'database.json');

// ===============================
// INITIALIZE DATABASE
// ===============================

if (!fs.existsSync(DB_FILE)) {
    const initialData = {
        users: [],
        medicines: [],
        appointments: [],
        symptoms: []
    };

    fs.writeFileSync(
        DB_FILE,
        JSON.stringify(initialData, null, 2)
    );

    console.log('database.json created successfully.');
}

// ===============================
// DATABASE FUNCTIONS
// ===============================

function readDB() {
    try {
        const data = fs.readFileSync(DB_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Database read error:', error);

        return {
            users: [],
            medicines: [],
            appointments: [],
            symptoms: []
        };
    }
}

function writeDB(data) {
    fs.writeFileSync(
        DB_FILE,
        JSON.stringify(data, null, 2)
    );
}

// ===============================
// MIME TYPES
// ===============================

const MIME_TYPES = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon'
};

// ===============================
// SEND JSON RESPONSE
// ===============================

function sendJSON(res, statusCode, data) {
    res.writeHead(statusCode, {
        'Content-Type': 'application/json'
    });

    res.end(JSON.stringify(data));
}

// ===============================
// READ REQUEST BODY
// ===============================

function getRequestBody(req) {
    return new Promise((resolve, reject) => {
        let body = '';

        req.on('data', chunk => {
            body += chunk.toString();
        });

        req.on('end', () => {
            if (!body) {
                resolve({});
                return;
            }

            try {
                resolve(JSON.parse(body));
            } catch (error) {
                reject(new Error('Invalid JSON data'));
            }
        });

        req.on('error', error => {
            reject(error);
        });
    });
}

// ===============================
// CREATE SERVER
// ===============================

const server = http.createServer(async (req, res) => {

    // ===============================
    // CORS
    // ===============================

    res.setHeader(
        'Access-Control-Allow-Origin',
        '*'
    );

    res.setHeader(
        'Access-Control-Allow-Methods',
        'GET, POST, DELETE, OPTIONS'
    );

    res.setHeader(
        'Access-Control-Allow-Headers',
        'Content-Type'
    );

    // Handle OPTIONS request
    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    const parsedURL = url.parse(req.url, true);
    const pathname = parsedURL.pathname;

    // ===============================
    // API ROUTES
    // ===============================

    if (pathname.startsWith('/api/')) {

        try {

            const db = readDB();

            // ===================================
            // REGISTER
            // POST /api/auth/register
            // ===================================

            if (
                pathname === '/api/auth/register' &&
                req.method === 'POST'
            ) {

                const data = await getRequestBody(req);

                // Check email
                const existingUser = db.users.find(
                    user => user.email === data.email
                );

                if (existingUser) {
                    sendJSON(res, 400, {
                        error: 'Email already registered.'
                    });
                    return;
                }

                // Create user
                const newUser = {
                    ...data,
                    id: Date.now(),
                    healthScore: 90
                };

                db.users.push(newUser);

                writeDB(db);

                sendJSON(res, 200, {
                    success: true,
                    user: newUser
                });

                return;
            }

            // ===================================
            // LOGIN
            // POST /api/auth/login
            // ===================================

            if (
                pathname === '/api/auth/login' &&
                req.method === 'POST'
            ) {

                const data = await getRequestBody(req);

                const user = db.users.find(
                    user =>
                        user.email === data.email &&
                        user.password === data.password
                );

                if (!user) {
                    sendJSON(res, 401, {
                        error: 'Invalid credentials.'
                    });
                    return;
                }

                sendJSON(res, 200, {
                    success: true,
                    user: user
                });

                return;
            }

            // ===================================
            // GET USER DATA
            // GET /api/data?email=...
            // ===================================

            if (
                pathname === '/api/data' &&
                req.method === 'GET'
            ) {

                const email = parsedURL.query.email;

                const user = db.users.find(
                    user => user.email === email
                );

                const medicines = db.medicines
                    .filter(medicine => medicine.userEmail === email)
                    .reverse();

                const appointments = db.appointments
                    .filter(appointment => appointment.userEmail === email)
                    .reverse();

                const symptoms = db.symptoms
                    .filter(symptom => symptom.userEmail === email)
                    .reverse();

                sendJSON(res, 200, {
                    healthScore: user
                        ? user.healthScore
                        : 90,

                    medicines: medicines,

                    appointments: appointments,

                    symptomsHistory: symptoms
                });

                return;
            }

            // ===================================
            // ADD MEDICINE
            // POST /api/medicine
            // ===================================

            if (
                pathname === '/api/medicine' &&
                req.method === 'POST'
            ) {

                const data = await getRequestBody(req);

                data.id = Date.now();

                db.medicines.push(data);

                writeDB(db);

                sendJSON(res, 200, {
                    success: true,
                    id: data.id
                });

                return;
            }

            // ===================================
            // DELETE MEDICINE
            // DELETE /api/medicine/:id
            // ===================================

            const medicineDeleteMatch =
                pathname.match(/^\/api\/medicine\/(\d+)$/);

            if (
                medicineDeleteMatch &&
                req.method === 'DELETE'
            ) {

                const id = Number(medicineDeleteMatch[1]);

                db.medicines = db.medicines.filter(
                    medicine => medicine.id !== id
                );

                writeDB(db);

                sendJSON(res, 200, {
                    success: true
                });

                return;
            }

            // ===================================
            // ADD APPOINTMENT
            // POST /api/appointments
            // ===================================

            if (
                pathname === '/api/appointments' &&
                req.method === 'POST'
            ) {

                const data = await getRequestBody(req);

                data.id = Date.now();

                db.appointments.push(data);

                writeDB(db);

                sendJSON(res, 200, {
                    success: true,
                    id: data.id
                });

                return;
            }

            // ===================================
            // DELETE APPOINTMENT
            // DELETE /api/appointments/:id
            // ===================================

            const appointmentDeleteMatch =
                pathname.match(/^\/api\/appointments\/(\d+)$/);

            if (
                appointmentDeleteMatch &&
                req.method === 'DELETE'
            ) {

                const id =
                    Number(appointmentDeleteMatch[1]);

                db.appointments = db.appointments.filter(
                    appointment => appointment.id !== id
                );

                writeDB(db);

                sendJSON(res, 200, {
                    success: true
                });

                return;
            }

            // ===================================
            // ADD SYMPTOM
            // POST /api/symptoms
            // ===================================

            if (
                pathname === '/api/symptoms' &&
                req.method === 'POST'
            ) {

                const data = await getRequestBody(req);

                data.id = Date.now();

                let scoreMod = 0;

                if (data.severity === 'danger') {
                    scoreMod = -10;
                } else if (data.severity === 'warning') {
                    scoreMod = -5;
                }

                const user = db.users.find(
                    user => user.email === data.userEmail
                );

                if (user) {

                    user.healthScore = Math.max(
                        0,
                        user.healthScore + scoreMod
                    );
                }

                db.symptoms.push(data);

                writeDB(db);

                sendJSON(res, 200, {
                    success: true,
                    id: data.id,
                    scoreMod: scoreMod
                });

                return;
            }

            // ===================================
            // API ROUTE NOT FOUND
            // ===================================

            sendJSON(res, 404, {
                error: 'API endpoint not found.'
            });

            return;

        } catch (error) {

            console.error('API Error:', error);

            sendJSON(res, 500, {
                error: error.message
            });

            return;
        }
    }

    // ===============================
    // FRONTEND STATIC FILES
    // ===============================

    let requestedPath = decodeURIComponent(pathname);

    // Home page
    if (
        requestedPath === '/' ||
        requestedPath === ''
    ) {
        requestedPath = '/index.html';
    }

    // Prevent path traversal
    const filePath = path.normalize(
        path.join(FRONTEND_DIR, requestedPath)
    );

    if (!filePath.startsWith(FRONTEND_DIR)) {

        res.writeHead(403, {
            'Content-Type': 'text/plain'
        });

        res.end('403 Forbidden');
        return;
    }

    // Read frontend file
    fs.readFile(filePath, (error, content) => {

        if (error) {

            console.error(
                'File not found:',
                filePath
            );

            res.writeHead(404, {
                'Content-Type': 'text/plain'
            });

            res.end('404 - File Not Found');

            return;
        }

        const extension =
            path.extname(filePath).toLowerCase();

        const contentType =
            MIME_TYPES[extension] ||
            'application/octet-stream';

        res.writeHead(200, {
            'Content-Type': contentType
        });

        res.end(content);
    });
});

// ===============================
// START SERVER
// ===============================

server.listen(
    PORT,
    '0.0.0.0',
    () => {

        console.log(
            `ZERO-DEPENDENCY Server is running at http://localhost:${PORT}`
        );

        console.log(
            `Frontend folder: ${FRONTEND_DIR}`
        );

        console.log(
            `Database file: ${DB_FILE}`
        );
    }
);