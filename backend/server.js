const app = require('./app');

const PORT = process.env.BACKEND_PORT || 3000;
const server = app.listen(PORT, '0.0.0.0', () => console.log(`Backend running on port ${PORT}`));
server.timeout = 30000;
