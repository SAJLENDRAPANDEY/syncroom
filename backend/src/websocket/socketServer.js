const { Server } = require('socket.io');
const { registerRoomEvents } = require('./roomEvents');
const config = require('../config');

function initSocketServer(httpServer) {
  const io = new Server(httpServer, {
    cors: { origin: config.clientUrl, methods: ['GET', 'POST'] },
  });

  io.on('connection', (socket) => {
    registerRoomEvents(io, socket);
  });

  return io;
}

module.exports = { initSocketServer };
