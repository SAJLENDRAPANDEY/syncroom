const express = require('express');
const cors = require('cors');
const http = require('http');
const config = require('./config');
const { initSocketServer } = require('./websocket/socketServer');

const app = express();
app.use(cors({ origin: config.clientUrl }));
app.use(express.json());

app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'SyncRoom backend is running' });
});

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', uptime: process.uptime() });
});

const httpServer = http.createServer(app);
initSocketServer(httpServer);

httpServer.listen(config.port, () => {
  console.log(`SyncRoom backend listening on port ${config.port}`);
  console.log(`Allowed client origin: ${config.clientUrl}`);
});
