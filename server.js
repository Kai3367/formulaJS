const express = require('express')
const { createServer } = require('http')
const { Server } = require('socket.io')
const path = require('path')
const GameRoomManager = require('./src/gameRoomManager')
const GameEngine = require('./src/gameEngine')

const app = express()
const server = createServer(app)
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
  pingTimeout: 60000,
  pingInterval: 25000,
  transports: ['websocket', 'polling']
})

const roomManager = new GameRoomManager()
const gameEngine = new GameEngine()
const PORT = process.env.PORT || 8080

// Static files and routes
app.use(express.static(path.join(__dirname, 'src')))
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'src', 'FormulaJS.html')))
app.get('/health', (req, res) => res.json({
  status: 'healthy',
  activeRooms: roomManager.getRoomCount(),
  connectedPlayers: roomManager.getTotalPlayerCount(),
  timestamp: new Date().toISOString()
}))

// Socket.IO handlers
const socketHandlers = require('./src/socketHandlers')(io, roomManager, gameEngine)
io.on('connection', (socket) => {
  socket.on('create_room', (data) => socketHandlers.createRoom(socket, data))
  socket.on('join_room', (data) => socketHandlers.joinRoom(socket, data))
  socket.on('leave_room', () => socketHandlers.leaveRoom(socket))
  socket.on('set_ready', (data) => socketHandlers.setReady(socket, data))
  socket.on('track_selected', (data) => socketHandlers.trackSelected(socket, data))
  socket.on('start_game', (data) => socketHandlers.startGame(socket, data))
  socket.on('player_move', (data) => socketHandlers.playerMove(socket, data))
  socket.on('disconnect', () => socketHandlers.disconnect(socket))
})

// Cleanup inactive rooms every 5 minutes
setInterval(() => {
  const cleaned = roomManager.cleanupInactiveRooms()
  if (cleaned > 0) console.log(`Cleaned up ${cleaned} inactive room(s)`)
}, 300000)

server.listen(PORT, () => console.log(`Formula JS running on port ${PORT}`))
