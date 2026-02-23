/**
 * Multiplayer Client
 * Socket.IO client wrapper for multiplayer functionality
 */

class MultiplayerClient {
  constructor() {
    this.socket = null
    this.roomCode = null
    this.playerId = null
    this.playerName = null
    this.isHost = false
    this.connected = false
    this.players = []

    // Event callbacks
    this.callbacks = {
      onRoomCreated: null,
      onRoomJoined: null,
      onPlayerJoined: null,
      onPlayerLeft: null,
      onPlayerReady: null,
      onGameStarted: null,
      onGameStateUpdate: null,
      onGameFinished: null,
      onError: null,
      onDisconnected: null,
      onLeftRoom: null
    }
  }

  /**
   * Connect to the server
   * @param {string} serverUrl - Server URL (default: current host)
   */
  connect(serverUrl) {
    if (this.socket && this.connected) {
      console.log('Already connected')
      return
    }

    // Use current host if no URL provided
    const url = serverUrl || window.location.origin

    this.socket = io(url, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5
    })

    this.setupEventHandlers()
    this.connected = true
    console.log('Connecting to multiplayer server...')
  }

  /**
   * Setup Socket.IO event handlers
   */
  setupEventHandlers() {
    this.socket.on('connect', () => {
      console.log('Connected to multiplayer server')
      this.playerId = this.socket.id
    })

    this.socket.on('room_created', (data) => {
      console.log('Room created:', data)
      this.roomCode = data.roomCode
      this.playerId = data.playerId
      this.isHost = true
      this.players = data.players
      if (this.callbacks.onRoomCreated) {
        this.callbacks.onRoomCreated(data)
      }
    })

    this.socket.on('room_joined', (data) => {
      console.log('Room joined:', data)
      this.roomCode = data.roomCode
      this.playerId = data.playerId
      this.players = data.players
      this.isHost = this.players.find(p => p.socketId === this.playerId)?.isHost || false
      if (this.callbacks.onRoomJoined) {
        this.callbacks.onRoomJoined(data)
      }
    })

    this.socket.on('player_joined', (data) => {
      console.log('Player joined:', data)
      this.players.push(data.player)
      if (this.callbacks.onPlayerJoined) {
        this.callbacks.onPlayerJoined(data)
      }
    })

    this.socket.on('player_left', (data) => {
      console.log('Player left:', data)
      this.players = data.players
      if (data.newHost && data.newHost === this.playerId) {
        this.isHost = true
      }
      if (this.callbacks.onPlayerLeft) {
        this.callbacks.onPlayerLeft(data)
      }
    })

    this.socket.on('player_ready', (data) => {
      console.log('Player ready status changed:', data)
      this.players = data.players
      if (this.callbacks.onPlayerReady) {
        this.callbacks.onPlayerReady(data)
      }
    })

    this.socket.on('game_started', (data) => {
      console.log('Game started:', data)
      if (this.callbacks.onGameStarted) {
        this.callbacks.onGameStarted(data)
      }
    })

    this.socket.on('game_state_update', (data) => {
      console.log('Game state update:', data)
      if (this.callbacks.onGameStateUpdate) {
        this.callbacks.onGameStateUpdate(data)
      }
    })

    this.socket.on('game_finished', (data) => {
      console.log('Game finished:', data)
      if (this.callbacks.onGameFinished) {
        this.callbacks.onGameFinished(data)
      }
    })

    this.socket.on('player_disconnected', (data) => {
      console.log('Player disconnected:', data)
      this.players = data.players
      if (data.newHost && data.newHost === this.playerId) {
        this.isHost = true
      }
      if (this.callbacks.onDisconnected) {
        this.callbacks.onDisconnected(data)
      }
    })

    this.socket.on('left_room', () => {
      console.log('Left room')
      this.roomCode = null
      this.isHost = false
      this.players = []
      if (this.callbacks.onLeftRoom) {
        this.callbacks.onLeftRoom()
      }
    })

    this.socket.on('error', (data) => {
      console.error('Server error:', data.message)
      if (this.callbacks.onError) {
        this.callbacks.onError(data)
      }
    })

    this.socket.on('disconnect', () => {
      console.log('Disconnected from server')
      this.connected = false
    })

    this.socket.on('reconnect', () => {
      console.log('Reconnected to server')
      this.connected = true
    })
  }

  /**
   * Create a new game room
   * @param {string} playerName - Player name
   */
  createRoom(playerName) {
    if (!this.socket || !this.connected) {
      console.error('Not connected to server')
      return
    }
    this.playerName = playerName
    this.socket.emit('create_room', { playerName })
  }

  /**
   * Join an existing room
   * @param {string} roomCode - Room code to join
   * @param {string} playerName - Player name
   */
  joinRoom(roomCode, playerName) {
    if (!this.socket || !this.connected) {
      console.error('Not connected to server')
      return
    }
    this.playerName = playerName
    this.socket.emit('join_room', { roomCode: roomCode.toUpperCase(), playerName })
  }

  /**
   * Leave current room
   */
  leaveRoom() {
    if (!this.socket || !this.roomCode) {
      console.error('Not in a room')
      return
    }
    this.socket.emit('leave_room')
  }

  /**
   * Set ready status
   * @param {boolean} ready - Ready status
   */
  setReady(ready) {
    if (!this.socket || !this.roomCode) {
      console.error('Not in a room')
      return
    }
    this.socket.emit('set_ready', { ready })
  }

  /**
   * Start the game (host only)
   * @param {number} trackId - Track ID to use
   * @param {object} tracks - All available tracks
   */
  startGame(trackId, tracks) {
    if (!this.socket || !this.roomCode) {
      console.error('Not in a room')
      return
    }
    if (!this.isHost) {
      console.error('Only host can start game')
      return
    }
    this.socket.emit('start_game', { trackId, tracks })
  }

  /**
   * Send a move
   * @param {number} direction - Direction (1-9)
   */
  sendMove(direction) {
    if (!this.socket || !this.roomCode) {
      console.error('Not in a room')
      return
    }
    this.socket.emit('player_move', { direction })
  }

  /**
   * Disconnect from server
   */
  disconnect() {
    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
      this.connected = false
      this.roomCode = null
      this.playerId = null
      this.isHost = false
      this.players = []
    }
  }

  /**
   * Set event callbacks
   */
  onRoomCreated(callback) { this.callbacks.onRoomCreated = callback }
  onRoomJoined(callback) { this.callbacks.onRoomJoined = callback }
  onPlayerJoined(callback) { this.callbacks.onPlayerJoined = callback }
  onPlayerLeft(callback) { this.callbacks.onPlayerLeft = callback }
  onPlayerReady(callback) { this.callbacks.onPlayerReady = callback }
  onGameStarted(callback) { this.callbacks.onGameStarted = callback }
  onGameStateUpdate(callback) { this.callbacks.onGameStateUpdate = callback }
  onGameFinished(callback) { this.callbacks.onGameFinished = callback }
  onError(callback) { this.callbacks.onError = callback }
  onDisconnected(callback) { this.callbacks.onDisconnected = callback }
  onLeftRoom(callback) { this.callbacks.onLeftRoom = callback }

  /**
   * Get current room info
   */
  getRoomInfo() {
    return {
      roomCode: this.roomCode,
      playerId: this.playerId,
      playerName: this.playerName,
      isHost: this.isHost,
      players: this.players,
      connected: this.connected
    }
  }
}
