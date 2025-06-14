const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = socketIO(server, { cors: { origin: '*' } });
const frontendBaseUrl = process.env.FRONTEND_BASE_URL;
const rooms = {}; // roomId -> [socketId]

app.post('/create-room', (req, res) => {
  const roomId = uuidv4();
  res.json({ roomId, url: `${frontendBaseUrl}/room/${roomId}` });
});

io.on('connection', socket => {
  socket.on('join-room', ({ roomId, userName }) => {
    socket.join(roomId);
    if (!rooms[roomId]) rooms[roomId] = [];
    rooms[roomId].push(socket.id);
    io.to(roomId).emit('user-list', rooms[roomId]);

    socket.to(roomId).emit('user-connected', socket.id);

    socket.on('disconnect', () => {
      rooms[roomId] = rooms[roomId].filter(id => id !== socket.id);
      io.to(roomId).emit('user-disconnected', socket.id);
    });
  });

  socket.on('send-offer', data => {
    io.to(data.target).emit('receive-offer', {
      sdp: data.sdp,
      caller: socket.id
    });
  });

  socket.on('send-answer', data => {
    io.to(data.target).emit('receive-answer', {
      sdp: data.sdp,
      callee: socket.id
    });
  });

  socket.on('send-ice', data => {
    io.to(data.target).emit('receive-ice', {
      candidate: data.candidate,
      from: socket.id
    });
  });

  socket.on('send-chat', ({ roomId, message, sender }) => {
    io.to(roomId).emit('receive-chat', { sender, message });
  });
});

server.listen(5000, () => console.log('Server running on port 5000'));