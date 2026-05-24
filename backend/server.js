const app = require('./app');

const PORT = process.env.BACKEND_PORT || 3000;
const server = app.listen(PORT, () => console.log(`Backend running on port ${PORT}`));
server.timeout = 30000;
