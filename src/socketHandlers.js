module.exports = (io, roomManager, gameEngine) => ({
  createRoom: (socket, { playerName }) => {
    try {
      const room = roomManager.createRoom(socket.id, playerName)
      socket.join(room.roomCode)
      socket.emit('room_created', { roomCode: room.roomCode, playerId: socket.id, players: room.players })
      console.log(`Room created: ${room.roomCode}`)
    } catch (error) {
      socket.emit('error', { message: error.message })
    }
  },

  joinRoom: (socket, { roomCode, playerName }) => {
    try {
      const room = roomManager.joinRoom(roomCode, socket.id, playerName)
      socket.join(roomCode)
      socket.emit('room_joined', {
        roomCode: room.roomCode,
        playerId: socket.id,
        players: room.players,
        gameState: room.gameState,
        selectedTrack: room.selectedTrack || null
      })
      socket.to(roomCode).emit('player_joined', { player: room.players.find(p => p.socketId === socket.id) })
      console.log(`Player ${playerName} joined room ${roomCode}`)
    } catch (error) {
      socket.emit('error', { message: error.message })
    }
  },

  leaveRoom: (socket) => {
    const room = roomManager.getRoomByPlayerId(socket.id)
    if (room) {
      const { roomCode } = room
      const player = room.players.find(p => p.socketId === socket.id)
      socket.leave(roomCode)
      const updatedRoom = roomManager.removePlayer(socket.id)
      if (updatedRoom) {
        io.to(roomCode).emit('player_left', {
          playerId: socket.id,
          playerName: player?.playerName,
          players: updatedRoom.players,
          newHost: updatedRoom.hostId !== room.hostId ? updatedRoom.hostId : null
        })
      }
      socket.emit('left_room')
    }
  },

  setReady: (socket, { ready }) => {
    const room = roomManager.setPlayerReady(socket.id, ready)
    if (room) {
      io.to(room.roomCode).emit('player_ready', { playerId: socket.id, ready, players: room.players })
    }
  },

  trackSelected: (socket, { trackId, trackName }) => {
    const room = roomManager.getRoomByPlayerId(socket.id)
    if (room && room.hostId === socket.id) {
      room.selectedTrack = { trackId, trackName }
      io.to(room.roomCode).emit('track_selected', { trackId, trackName })
      console.log(`Track selected in room ${room.roomCode}: ${trackName}`)
    } else if (room) {
      socket.emit('error', { message: 'Only host can select track' })
    }
  },

  startGame: (socket, { trackId, tracks }) => {
    const room = roomManager.getRoomByPlayerId(socket.id)
    if (!room || room.hostId !== socket.id) {
      return socket.emit('error', { message: 'Only host can start game' })
    }
    if (room.players.length === 0) {
      return socket.emit('error', { message: 'Need at least one player' })
    }
    try {
      const gameState = gameEngine.initializeGame(room.players, tracks[trackId])
      roomManager.updateGameState(room.roomCode, gameState)
      roomManager.setRoomStatus(room.roomCode, 'RACING')
      io.to(room.roomCode).emit('game_started', { gameState: gameEngine.serializeForClient(gameState) })
      console.log(`Game started in room ${room.roomCode}`)
    } catch (error) {
      socket.emit('error', { message: error.message })
    }
  },

  playerMove: (socket, { direction }) => {
    const room = roomManager.getRoomByPlayerId(socket.id)
    if (!room || !room.gameState) {
      return socket.emit('error', { message: 'Game not in progress' })
    }
    const result = gameEngine.processMove(room.gameState, socket.id, direction)
    if (!result.success) {
      return socket.emit('error', { message: result.error })
    }
    roomManager.updateGameState(room.roomCode, result.gameState)
    io.to(room.roomCode).emit('game_state_update', {
      gameState: gameEngine.serializeForClient(result.gameState),
      moveResult: result.moveResult
    })
    if (result.gameState.status === 'FINISHED') {
      roomManager.setRoomStatus(room.roomCode, 'FINISHED')
      const updatedRoom = roomManager.getRoom(room.roomCode)
      if (updatedRoom) {
        updatedRoom.players.forEach(p => p.ready = false)
        setTimeout(() => roomManager.setRoomStatus(room.roomCode, 'LOBBY'), 1000)
      }
      io.to(room.roomCode).emit('game_finished', {
        results: gameEngine.getGameResults(result.gameState),
        playersResetToLobby: updatedRoom?.players || []
      })
    }
  },

  disconnect: (socket) => {
    console.log(`Player disconnected: ${socket.id}`)
    setTimeout(() => {
      if (!io.sockets.sockets.get(socket.id)) {
        const room = roomManager.getRoomByPlayerId(socket.id)
        if (room) {
          const { roomCode } = room
          const player = room.players.find(p => p.socketId === socket.id)
          const updatedRoom = roomManager.removePlayer(socket.id)
          if (updatedRoom) {
            io.to(roomCode).emit('player_disconnected', {
              playerId: socket.id,
              playerName: player?.playerName,
              players: updatedRoom.players,
              newHost: updatedRoom.hostId !== room.hostId ? updatedRoom.hostId : null
            })
          }
        }
      }
    }, 30000)
  }
})
