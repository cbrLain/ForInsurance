// socket.js — Gestion centralisée de Socket.IO
const { Server } = require('socket.io');

let io = null;

function initSocket(httpServer) {
  io = new Server(httpServer, {
    cors: { origin: '*', methods: ['GET', 'POST'] },
    transports: ['websocket', 'polling'],
    pingTimeout: 60000,
    pingInterval: 25000,
  });
  io.on('connection', (socket) => {
    socket.on('join', (room) => socket.join(room));
    socket.on('leave', (room) => socket.leave(room));
  });
  return io;
}

function broadcast(event, data) {
  if (io) io.emit(event, data);
}

module.exports = { initSocket, broadcast };
