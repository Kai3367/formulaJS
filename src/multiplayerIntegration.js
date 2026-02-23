/**
 * Multiplayer Integration for Formula JS
 * Add this code to formulaJSRace.js or include it as a separate script
 */

// Multiplayer state
let gameMode = 'LOCAL' // 'LOCAL' or 'ONLINE_MP'
let multiplayerClient = null
let myPlayerName = ''
let serverGameState = null

/**
 * Check if multiplayer is available (requires server)
 * Returns false if opened via file:// protocol
 */
function isMultiplayerAvailable() {
  return window.location.protocol !== 'file:'
}

/**
 * Initialize multiplayer client
 */
function initMultiplayer() {
  if (!multiplayerClient) {
    multiplayerClient = new MultiplayerClient()
    // Note: setupMultiplayerCallbacks() is called after connect() in selectMode()
  }
}

/**
 * Setup multiplayer event callbacks
 */
function setupMultiplayerCallbacks() {
  multiplayerClient.onRoomCreated((data) => {
    console.log('Room created:', data)
    // Go directly to lobby
    document.getElementById('createRoomPopup').style.display = 'none'
    showLobby(data.roomCode, data.players)
  })

  multiplayerClient.onRoomJoined((data) => {
    console.log('Room joined:', data)
    document.getElementById('joinRoomPopup').style.display = 'none'
    showLobby(data.roomCode, data.players)

    // Update selected track if exists
    if (data.selectedTrack) {
      updateSelectedTrack(data.selectedTrack.trackId, data.selectedTrack.trackName)
    }
  })

  multiplayerClient.onPlayerJoined((data) => {
    console.log('Player joined:', data)
    updateLobbyPlayerList(multiplayerClient.players)
    updateStartButtonState()
  })

  multiplayerClient.onPlayerLeft((data) => {
    console.log('Player left:', data)
    updateLobbyPlayerList(multiplayerClient.players)
    updateStartButtonState()
    if (data.newHost === multiplayerClient.playerId) {
      document.getElementById('startMultiplayerButton').style.display = 'block'
    }
  })

  multiplayerClient.onPlayerReady((data) => {
    console.log('Player ready:', data)
    updateLobbyPlayerList(multiplayerClient.players)
    updateStartButtonState()
  })

  multiplayerClient.onGameStarted((data) => {
    console.log('Game started:', data)
    document.getElementById('lobbyPopup').style.display = 'none'
    document.getElementById('connectionStatus').style.display = 'block'
    startMultiplayerRace(data.gameState)
  })

  multiplayerClient.onGameStateUpdate((data) => {
    console.log('Game state update:', data)
    updateMultiplayerGameState(data.gameState, data.moveResult)
  })

  multiplayerClient.onGameFinished((data) => {
    console.log('Game finished:', data)
    showMultiplayerGameOver(data.results)

    // Reset ready checkbox for next game
    const readyCheckbox = document.getElementById('readyCheckbox')
    if (readyCheckbox) {
      readyCheckbox.checked = false
    }

    // Update player list if provided
    if (data.playersResetToLobby) {
      multiplayerClient.players = data.playersResetToLobby
    }
  })

  multiplayerClient.onError((data) => {
    console.error('Multiplayer error:', data.message)
    alert('Error: ' + data.message)
  })

  multiplayerClient.onDisconnected((data) => {
    console.log('Player disconnected:', data)
    showDisconnectionOverlay(data.playerName)
  })

  multiplayerClient.onLeftRoom(() => {
    console.log('Left room successfully')
    gameMode = 'LOCAL'

    // Hide all multiplayer popups
    document.getElementById('lobbyPopup').style.display = 'none'
    document.getElementById('createRoomPopup').style.display = 'none'
    document.getElementById('joinRoomPopup').style.display = 'none'
    document.getElementById('connectionStatus').style.display = 'none'

    // Reset ready checkbox
    const readyCheckbox = document.getElementById('readyCheckbox')
    if (readyCheckbox) {
      readyCheckbox.checked = false
    }

    // Return to mode selection
    openModeSelection()
  })

  // Listen for track selection updates
  multiplayerClient.socket.on('track_selected', (data) => {
    console.log('Track selected:', data)
    updateSelectedTrack(data.trackId, data.trackName)
  })
}

/**
 * Mode selection
 */
function selectMode(mode) {
  gameMode = mode
  document.getElementById('modeSelectionPopup').style.display = 'none'

  if (mode === 'LOCAL') {
    // Show traditional input popup
    document.getElementById('inputPopup').style.display = 'block'
  } else if (mode === 'ONLINE_MP') {
    // Initialize multiplayer and show options
    initMultiplayer()
    multiplayerClient.connect()
    setupMultiplayerCallbacks() // Setup callbacks after socket is created
    showMultiplayerOptions()
  }
}

function openModeSelection() {
  document.getElementById('gameOverPopup').style.display = 'none'
  document.getElementById('inputPopup').style.display = 'none'

  // Disable multiplayer button if opened via file:// protocol
  const multiplayerButton = document.querySelector('#modeSelectionPopup button[onclick*="ONLINE_MP"]')
  if (multiplayerButton) {
    if (isMultiplayerAvailable()) {
      multiplayerButton.disabled = false
      multiplayerButton.style.opacity = '1'
      multiplayerButton.title = ''
    } else {
      multiplayerButton.disabled = true
      multiplayerButton.style.opacity = '0.5'
      multiplayerButton.title = 'Multiplayer requires running the game server'
    }
  }

  document.getElementById('modeSelectionPopup').style.display = 'block'
}

function backToModeSelection() {
  document.getElementById('createRoomPopup').style.display = 'none'
  document.getElementById('joinRoomPopup').style.display = 'none'
  document.getElementById('modeSelectionPopup').style.display = 'block'
}

function showMultiplayerOptions() {
  // Ask user to create or join room
  const action = confirm('Create a new room? (Cancel to join existing room)')
  if (action) {
    document.getElementById('createRoomPopup').style.display = 'block'
  } else {
    document.getElementById('joinRoomPopup').style.display = 'block'
  }
}

/**
 * Create multiplayer room
 */
function createMultiplayerRoom() {
  const playerName = document.getElementById('hostPlayerName').value.trim()
  if (!playerName) {
    alert('Please enter your name')
    return
  }
  myPlayerName = playerName
  multiplayerClient.createRoom(playerName)
}

/**
 * Join multiplayer room
 */
function joinMultiplayerRoom() {
  const playerName = document.getElementById('joinPlayerName').value.trim()
  const roomCode = document.getElementById('joinRoomCode').value.trim().toUpperCase()

  if (!playerName || !roomCode) {
    alert('Please enter your name and room code')
    return
  }

  myPlayerName = playerName
  multiplayerClient.joinRoom(roomCode, playerName)
}

/**
 * Leave multiplayer room
 */
function leaveMultiplayerRoom() {
  if (confirm('Leave room?')) {
    multiplayerClient.leaveRoom()
  }
}

/**
 * Toggle ready status
 */
function toggleReady() {
  const ready = document.getElementById('readyCheckbox').checked
  multiplayerClient.setReady(ready)
}

/**
 * Start multiplayer game (host only)
 */
function startMultiplayerGame() {
  const tracks = getTracks()

  // Try to get track from lobby selection
  let trackId
  const lobbyTrackSelect = document.getElementById('lobbyTrackSelect')
  if (lobbyTrackSelect) {
    trackId = Math.floor(Number(lobbyTrackSelect.options[lobbyTrackSelect.selectedIndex].value))
  } else {
    // Fallback to main track selection if available
    const selectedTrack = document.getElementById('selectedTrack')
    if (selectedTrack) {
      trackId = Math.floor(Number(selectedTrack.options[selectedTrack.selectedIndex].value))
    } else {
      alert('Please select a track first')
      return
    }
  }

  multiplayerClient.startGame(trackId, tracks)
}

/**
 * Show lobby
 */
function showLobby(roomCode, players) {
  document.getElementById('lobbyRoomCode').textContent = roomCode
  document.getElementById('lobbyPopup').style.display = 'block'

  // Show start button only for host
  if (multiplayerClient.isHost) {
    document.getElementById('startMultiplayerButton').style.display = 'block'
  }

  // Add track selection/display for all players (host gets dropdown, guests get display)
  addTrackSelectionToLobby()

  updateLobbyPlayerList(players)
  updateStartButtonState()
}

/**
 * Add track selection to lobby (host only) or display (guests)
 */
function addTrackSelectionToLobby() {
  if (!document.getElementById('lobbyTrackSelection')) {
    const trackSelection = document.createElement('div')
    trackSelection.id = 'lobbyTrackSelection'

    if (multiplayerClient.isHost) {
      // Host: Show dropdown with change handler
      trackSelection.innerHTML = `
        <label for="lobbyTrackSelect"><strong>Select Track:</strong></label><br>
        <select id="lobbyTrackSelect" onchange="onTrackSelectionChange()">
          ${trackNames().map((name, i) =>
            `<option value="${i}">${name}</option>`
          ).join('')}
        </select>
      `
    } else {
      // Guest: Show read-only display
      trackSelection.innerHTML = `
        <div id="selectedTrackDisplay">
          <strong>Selected Track:</strong> <span id="selectedTrackName">Waiting for host...</span>
        </div>
      `
    }

    document.getElementById('playerListContainer').insertAdjacentElement('afterend', trackSelection)

    // If host, broadcast initial track selection
    if (multiplayerClient.isHost) {
      setTimeout(() => {
        const select = document.getElementById('lobbyTrackSelect')
        if (select) {
          const trackId = parseInt(select.value)
          const trackName = trackNames()[trackId]
          multiplayerClient.socket.emit('track_selected', { trackId, trackName })
        }
      }, 100)
    }
  }
}

/**
 * Handle track selection change (host only)
 */
function onTrackSelectionChange() {
  if (!multiplayerClient.isHost) return

  const select = document.getElementById('lobbyTrackSelect')
  const trackId = parseInt(select.value)
  const trackName = trackNames()[trackId]

  // Broadcast track selection to server
  multiplayerClient.socket.emit('track_selected', { trackId, trackName })
}

/**
 * Update displayed track for all players
 */
function updateSelectedTrack(trackId, trackName) {
  // Update host's dropdown if exists
  const select = document.getElementById('lobbyTrackSelect')
  if (select) {
    select.value = trackId
  }

  // Update guest's display if exists
  const display = document.getElementById('selectedTrackName')
  if (display) {
    display.textContent = trackName
  }
}

/**
 * Update player list in lobby
 */
function updateLobbyPlayerList(players) {
  const playerListDiv = document.getElementById('playerList')
  playerListDiv.innerHTML = players.map(p => `
    <div class="${p.ready ? 'ready' : ''}" style="border-left-color: ${p.color}">
      ${p.playerName} ${p.isHost ? '(Host)' : ''} - ${p.ready ? '✓ Ready' : 'Not Ready'}
    </div>
  `).join('')
}

/**
 * Update start button state based on ready status
 */
function updateStartButtonState() {
  const startButton = document.getElementById('startMultiplayerButton')
  if (!startButton || !multiplayerClient.isHost) {
    return
  }

  const allReady = multiplayerClient.players.length > 0 &&
                   multiplayerClient.players.every(p => p.ready)

  if (allReady) {
    startButton.disabled = false
    startButton.style.opacity = '1'
    startButton.textContent = 'Start Game'
  } else {
    startButton.disabled = true
    startButton.style.opacity = '0.5'
    startButton.textContent = 'Waiting for all players to be ready...'
  }
}

/**
 * Start multiplayer race
 */
function startMultiplayerRace(gameState) {
  serverGameState = gameState

  // Clear canvases
  const width = trackCanvas.clientWidth
  const height = trackCanvas.clientHeight
  trackCanvas.getContext('2d').clearRect(0, 0, width, height)
  const ctx = racersCanvas.getContext('2d')
  ctx.clearRect(0, 0, width, height)

  // Display track
  track = new Track(trackCanvas, gameState.track, gameState.racers.length)
  track.show()
  trackText.innerHTML = track.text || 'Formula JS'

  // Create racers from server state
  racers = gameState.racers.map(r => {
    const racer = new Racer(ctx, r.playerName, r.color)
    racer.x = r.x
    racer.y = r.y
    racer.x0 = r.x0
    racer.y0 = r.y0
    racer.dx = r.dx
    racer.dy = r.dy
    racer.dist = r.dist
    racer.topSpeed = r.topSpeed
    racer.ticks = r.ticks
    racer.active = r.active
    racer.ranking = r.ranking
    racer.showIcon()
    return racer
  })

  N = gameState.racers.filter(r => r.active).length
  whoseTurn = gameState.whoseTurn

  // Show whose turn
  const currentRacer = racers.find(r => r.driver === gameState.currentPlayerName)
  if (currentRacer) {
    whoseTurnText.innerHTML = whoseNextText(currentRacer)
    if (currentRacer.driver === myPlayerName) {
      currentRacer.show()
      enableDriveButtons(true)
    } else {
      whoseTurnText.innerHTML += ' (waiting...)'
      enableDriveButtons(false)
    }
  }

  updateStatus()
}

/**
 * Update multiplayer game state from server
 */
function updateMultiplayerGameState(gameState, moveResult) {
  serverGameState = gameState

  // Update racers from server state
  gameState.racers.forEach((serverRacer, i) => {
    const racer = racers[i]
    if (racer) {
      racer.hide()
      racer.x = serverRacer.x
      racer.y = serverRacer.y
      racer.x0 = serverRacer.x0
      racer.y0 = serverRacer.y0
      racer.dx = serverRacer.dx
      racer.dy = serverRacer.dy
      racer.dist = serverRacer.dist
      racer.topSpeed = serverRacer.topSpeed
      racer.ticks = serverRacer.ticks
      racer.active = serverRacer.active
      racer.ranking = serverRacer.ranking
      racer.moveIcon()

      // Show crash icon if this racer just crashed or went off-road
      if (moveResult && moveResult.racerUpdate &&
          moveResult.racerUpdate.playerName === racer.driver &&
          (moveResult.crashed || moveResult.offRoad)) {
        racer.showCrash()
      }
    }
  })

  N = gameState.racers.filter(r => r.active).length
  whoseTurn = gameState.whoseTurn

  // Update status
  updateStatus()

  // Check if it's my turn
  const currentRacer = racers.find(r => r.driver === gameState.currentPlayerName)
  if (currentRacer) {
    whoseTurnText.innerHTML = whoseNextText(currentRacer)
    if (currentRacer.driver === myPlayerName) {
      currentRacer.show()
      enableDriveButtons(true)
    } else {
      whoseTurnText.innerHTML += ' (waiting...)'
      enableDriveButtons(false)
    }
  }
}

/**
 * Enable/disable drive buttons
 */
function enableDriveButtons(enabled) {
  const buttons = document.querySelectorAll('button[onclick^="drive"]')
  buttons.forEach(btn => {
    btn.disabled = !enabled
    btn.style.opacity = enabled ? '1' : '0.5'
  })
}

/**
 * Show multiplayer game over
 */
function showMultiplayerGameOver(results) {
  document.getElementById('gameOverPopup').style.display = 'block'
  enableDriveButtons(false)
}

/**
 * Show disconnection overlay
 */
function showDisconnectionOverlay(playerName) {
  document.getElementById('disconnectPlayerName').textContent = `${playerName} disconnected`
  document.getElementById('disconnectionOverlay').style.display = 'flex'

  let countdown = 30
  const timer = setInterval(() => {
    countdown--
    document.getElementById('reconnectTimer').textContent = `Waiting for reconnection... ${countdown}s`
    if (countdown <= 0) {
      clearInterval(timer)
      document.getElementById('disconnectionOverlay').style.display = 'none'
    }
  }, 1000)
}

/**
 * Copy lobby room code to clipboard
 */
function copyLobbyRoomCode() {
  const roomCode = document.getElementById('lobbyRoomCode').textContent
  navigator.clipboard.writeText(roomCode).then(() => {
    alert('Room code copied to clipboard!')
  }).catch(err => {
    console.error('Failed to copy:', err)
    // Fallback for older browsers
    const textArea = document.createElement('textarea')
    textArea.value = roomCode
    document.body.appendChild(textArea)
    textArea.select()
    try {
      document.execCommand('copy')
      alert('Room code copied to clipboard!')
    } catch (err) {
      alert('Failed to copy room code. Please copy manually: ' + roomCode)
    }
    document.body.removeChild(textArea)
  })
}

// Update connection status
if (typeof window !== 'undefined') {
  setInterval(() => {
    if (multiplayerClient && gameMode === 'ONLINE_MP') {
      const indicator = document.getElementById('connectionIndicator')
      const text = document.getElementById('connectionText')
      if (multiplayerClient.connected) {
        indicator.className = 'connected'
        text.textContent = 'Connected'
      } else {
        indicator.className = 'disconnected'
        text.textContent = 'Disconnected'
      }
    }
  }, 1000)
}
