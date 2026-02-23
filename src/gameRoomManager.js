/**
 * Game Room Manager
 * Manages multiplayer game rooms, player connections, and room lifecycle
 */

class GameRoomManager {
  constructor() {
    this.rooms = new Map() // roomCode -> Room object
    this.playerToRoom = new Map() // socketId -> roomCode
    this.maxRooms = process.env.MAX_ROOMS || 20
    this.roomTimeoutMs = process.env.ROOM_TIMEOUT_MS || 300000 // 5 minutes
  }

  /**
   * Generate a unique 6-character room code
   */
  generateRoomCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    let code
    let attempts = 0
    do {
      code = ''
      for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length))
      }
      attempts++
    } while (this.rooms.has(code) && attempts < 100)

    if (attempts >= 100) {
      throw new Error('Failed to generate unique room code')
    }
    return code
  }

  /**
   * Create a new game room
   * @param {string} hostSocketId - Socket ID of the host player
   * @param {string} hostName - Name of the host player
   * @returns {object} Room object with roomCode
   */
  createRoom(hostSocketId, hostName) {
    if (this.rooms.size >= this.maxRooms) {
      throw new Error('Maximum number of rooms reached')
    }

    const roomCode = this.generateRoomCode()
    const room = {
      roomCode,
      hostId: hostSocketId,
      status: 'LOBBY', // LOBBY, RACING, FINISHED
      createdAt: Date.now(),
      lastActivity: Date.now(),
      players: [
        {
          socketId: hostSocketId,
          playerName: hostName,
          color: 'red',
          ready: false,
          isHost: true
        }
      ],
      gameState: null
    }

    this.rooms.set(roomCode, room)
    this.playerToRoom.set(hostSocketId, roomCode)

    console.log(`Room created: ${roomCode} by ${hostName} (${hostSocketId})`)
    return room
  }

  /**
   * Join an existing room
   * @param {string} roomCode - Room code to join
   * @param {string} socketId - Socket ID of joining player
   * @param {string} playerName - Name of joining player
   * @returns {object} Room object
   */
  joinRoom(roomCode, socketId, playerName) {
    const room = this.rooms.get(roomCode)

    if (!room) {
      throw new Error('Room not found')
    }

    if (room.status !== 'LOBBY') {
      throw new Error('Room is not accepting new players')
    }

    if (room.players.length >= 4) {
      throw new Error('Room is full')
    }

    // Check if player name is already taken
    if (room.players.some(p => p.playerName === playerName)) {
      throw new Error('Player name already taken in this room')
    }

    const colors = ['red', 'green', 'blue', 'purple']
    const usedColors = room.players.map(p => p.color)
    const availableColor = colors.find(c => !usedColors.includes(c))

    const player = {
      socketId,
      playerName,
      color: availableColor,
      ready: false,
      isHost: false
    }

    room.players.push(player)
    room.lastActivity = Date.now()
    this.playerToRoom.set(socketId, roomCode)

    console.log(`Player ${playerName} (${socketId}) joined room ${roomCode}`)
    return room
  }

  /**
   * Get room by code
   * @param {string} roomCode - Room code
   * @returns {object|null} Room object or null
   */
  getRoom(roomCode) {
    return this.rooms.get(roomCode) || null
  }

  /**
   * Get room by player socket ID
   * @param {string} socketId - Player socket ID
   * @returns {object|null} Room object or null
   */
  getRoomByPlayerId(socketId) {
    const roomCode = this.playerToRoom.get(socketId)
    return roomCode ? this.rooms.get(roomCode) : null
  }

  /**
   * Remove player from their room
   * @param {string} socketId - Socket ID of player to remove
   * @returns {object|null} Updated room or null if room was deleted
   */
  removePlayer(socketId) {
    const roomCode = this.playerToRoom.get(socketId)
    if (!roomCode) {
      return null
    }

    const room = this.rooms.get(roomCode)
    if (!room) {
      this.playerToRoom.delete(socketId)
      return null
    }

    const playerIndex = room.players.findIndex(p => p.socketId === socketId)
    if (playerIndex === -1) {
      return null
    }

    const player = room.players[playerIndex]
    room.players.splice(playerIndex, 1)
    this.playerToRoom.delete(socketId)

    console.log(`Player ${player.playerName} (${socketId}) left room ${roomCode}`)

    // If room is empty, delete it
    if (room.players.length === 0) {
      this.rooms.delete(roomCode)
      console.log(`Room ${roomCode} deleted (empty)`)
      return null
    }

    // If host left, promote next player to host
    if (player.isHost && room.players.length > 0) {
      room.players[0].isHost = true
      room.hostId = room.players[0].socketId
      console.log(`New host for room ${roomCode}: ${room.players[0].playerName}`)
    }

    room.lastActivity = Date.now()
    return room
  }

  /**
   * Set player ready status
   * @param {string} socketId - Player socket ID
   * @param {boolean} ready - Ready status
   * @returns {object|null} Room object or null
   */
  setPlayerReady(socketId, ready) {
    const room = this.getRoomByPlayerId(socketId)
    if (!room) {
      return null
    }

    const player = room.players.find(p => p.socketId === socketId)
    if (!player) {
      return null
    }

    player.ready = ready
    room.lastActivity = Date.now()
    return room
  }

  /**
   * Check if all players in room are ready
   * @param {string} roomCode - Room code
   * @returns {boolean} True if all players ready
   */
  allPlayersReady(roomCode) {
    const room = this.rooms.get(roomCode)
    if (!room || room.players.length === 0) {
      return false
    }
    return room.players.every(p => p.ready)
  }

  /**
   * Update room status
   * @param {string} roomCode - Room code
   * @param {string} status - New status (LOBBY, RACING, FINISHED)
   */
  setRoomStatus(roomCode, status) {
    const room = this.rooms.get(roomCode)
    if (room) {
      room.status = status
      room.lastActivity = Date.now()
    }
  }

  /**
   * Update game state for a room
   * @param {string} roomCode - Room code
   * @param {object} gameState - New game state
   */
  updateGameState(roomCode, gameState) {
    const room = this.rooms.get(roomCode)
    if (room) {
      room.gameState = gameState
      room.lastActivity = Date.now()
    }
  }

  /**
   * Clean up old/inactive rooms
   */
  cleanupInactiveRooms() {
    const now = Date.now()
    const roomsToDelete = []

    this.rooms.forEach((room, roomCode) => {
      const inactive = now - room.lastActivity > this.roomTimeoutMs
      if (inactive) {
        roomsToDelete.push(roomCode)
      }
    })

    roomsToDelete.forEach(roomCode => {
      const room = this.rooms.get(roomCode)
      // Remove all players from playerToRoom map
      room.players.forEach(p => this.playerToRoom.delete(p.socketId))
      this.rooms.delete(roomCode)
      console.log(`Room ${roomCode} deleted (inactive)`)
    })

    return roomsToDelete.length
  }

  /**
   * Get count of active rooms
   * @returns {number} Number of rooms
   */
  getRoomCount() {
    return this.rooms.size
  }

  /**
   * Get total player count across all rooms
   * @returns {number} Number of players
   */
  getTotalPlayerCount() {
    let count = 0
    this.rooms.forEach(room => {
      count += room.players.length
    })
    return count
  }
}

module.exports = GameRoomManager
