/**
 * Game Engine
 * Server-side game state management and move validation
 */

const GameLogic = require('./gameLogic')

class GameEngine {
  constructor() {
    this.GAME_CONSTANTS = GameLogic.GAME_CONSTANTS
  }

  /**
   * Initialize game state for a new race
   * @param {array} players - Array of player objects {socketId, playerName, color}
   * @param {object} trackPolygon - Track definition from formulaJSTracks.js
   * @param {number} canvasWidth - Canvas width in pixels
   * @param {number} canvasHeight - Canvas height in pixels
   * @returns {object} Initial game state
   */
  initializeGame(players, trackPolygon, canvasWidth = 1000, canvasHeight = 750) {
    const N = players.length
    const dp = Math.floor(canvasHeight / 60)

    // Calculate track distance
    const outerDist = this.calculatePolygonDistance(trackPolygon.outer)
    const innerDist = trackPolygon.inner ? this.calculatePolygonDistance(trackPolygon.inner) : 0
    const trackDistance = Math.floor(this.GAME_CONSTANTS.scaleD * (outerDist + innerDist) / 2)

    // Determine race direction
    const direction = this.determineRaceDirection(trackPolygon.startFinish)

    // Calculate starting positions
    const startPositions = this.calculateStartPositions(trackPolygon.startFinish, N)

    // Create racers
    const racers = players.map((player, i) => ({
      socketId: player.socketId,
      playerName: player.playerName,
      color: player.color,
      x: startPositions[i].x,
      y: startPositions[i].y,
      x0: startPositions[i].x,
      y0: startPositions[i].y,
      dx: 0,
      dy: 0,
      dist: 0,
      topSpeed: 0,
      ticks: 0,
      active: true,
      ranking: 0
    }))

    return {
      track: {
        name: trackPolygon.name,
        outer: trackPolygon.outer,
        inner: trackPolygon.inner || [],
        startFinish: trackPolygon.startFinish,
        distance: trackDistance,
        direction
      },
      racers,
      whoseTurn: 0,
      ranking: 1,
      dp,
      canvasWidth,
      canvasHeight,
      status: 'RACING'
    }
  }

  /**
   * Calculate distance around a polygon
   * @param {array} polygon - Array of {x, y} points
   * @returns {number} Total distance
   */
  calculatePolygonDistance(polygon) {
    let dist = 0
    for (let i = 0; i < polygon.length; i++) {
      const p1 = polygon[i]
      const p2 = polygon[(i + 1) % polygon.length]
      dist += Math.sqrt((p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2)
    }
    return dist
  }

  /**
   * Determine race direction from start/finish line
   * @param {array} startFinish - Array of 2 points [{x, y}, {x, y}]
   * @returns {string} Direction: 'up', 'down', 'left', or 'right'
   */
  determineRaceDirection(startFinish) {
    const sf0 = startFinish[0]
    const sf1 = startFinish[1]

    if (sf0.x === sf1.x && sf0.y < sf1.y) return 'right'
    if (sf0.x === sf1.x && sf0.y > sf1.y) return 'left'
    if (sf0.x > sf1.x && sf0.y === sf1.y) return 'down'
    if (sf0.x < sf1.x && sf0.y === sf1.y) return 'up'

    throw new Error('Invalid start/finish line')
  }

  /**
   * Calculate starting positions for racers
   * @param {array} startFinish - Start/finish line points
   * @param {number} N - Number of racers
   * @returns {array} Array of starting positions {x, y}
   */
  calculateStartPositions(startFinish, N) {
    const sf0 = startFinish[0]
    const sf1 = startFinish[1]
    const dx = sf1.x - sf0.x
    const dy = sf1.y - sf0.y

    return new Array(N).fill(0).map((_, i) => ({
      x: Math.floor(sf0.x + (i + 1) * dx / (N + 1)),
      y: Math.floor(sf0.y + (i + 1) * dy / (N + 1))
    }))
  }

  /**
   * Validate and execute a move
   * @param {object} gameState - Current game state
   * @param {string} socketId - Socket ID of player making move
   * @param {number} direction - Direction (1-9)
   * @returns {object} {success, gameState, error}
   */
  processMove(gameState, socketId, direction) {
    // Validate it's this player's turn
    const activeRacers = gameState.racers.filter(r => r.active)
    if (activeRacers.length === 0) {
      return { success: false, error: 'Game over' }
    }

    const currentRacer = activeRacers[gameState.whoseTurn]
    if (currentRacer.socketId !== socketId) {
      return { success: false, error: 'Not your turn' }
    }

    // Validate direction
    if (![1, 2, 3, 4, 5, 6, 7, 8, 9].includes(direction)) {
      return { success: false, error: 'Invalid direction' }
    }

    // Execute the move
    const updatedRacer = GameLogic.executeMove(currentRacer, direction, gameState.dp)

    // Check for crashes and finish
    const otherRacers = gameState.racers.filter(r => r.socketId !== socketId && r.active)
    const crashed = GameLogic.hasAnyCrash(updatedRacer, otherRacers)
    const offRoad = GameLogic.isOffRoad(updatedRacer, gameState.track)
    const finished = GameLogic.hasFinished(updatedRacer, gameState.track)

    // Update racer status
    if (crashed || offRoad || finished) {
      updatedRacer.active = false
      if (finished) {
        updatedRacer.ranking = gameState.ranking
        gameState.ranking++
      }
    }

    // Update racer in game state
    const racerIndex = gameState.racers.findIndex(r => r.socketId === socketId)
    gameState.racers[racerIndex] = updatedRacer

    // Determine next turn
    const stillActiveRacers = gameState.racers.filter(r => r.active)
    if (stillActiveRacers.length === 0) {
      gameState.status = 'FINISHED'
      gameState.whoseTurn = -1
    } else {
      // Move to next active racer
      let nextTurn = (gameState.whoseTurn + 1) % stillActiveRacers.length
      gameState.whoseTurn = nextTurn
    }

    return {
      success: true,
      gameState,
      moveResult: {
        crashed,
        offRoad,
        finished,
        racerUpdate: updatedRacer
      }
    }
  }

  /**
   * Get current racer whose turn it is
   * @param {object} gameState - Current game state
   * @returns {object|null} Current racer or null
   */
  getCurrentRacer(gameState) {
    const activeRacers = gameState.racers.filter(r => r.active)
    if (activeRacers.length === 0 || gameState.whoseTurn < 0) {
      return null
    }
    return activeRacers[gameState.whoseTurn]
  }

  /**
   * Get game results (for finished games)
   * @param {object} gameState - Game state
   * @returns {array} Array of results sorted by ranking
   */
  getGameResults(gameState) {
    return gameState.racers
      .map(racer => ({
        playerName: racer.playerName,
        color: racer.color,
        ranking: racer.ranking,
        finished: racer.ranking > 0,
        stats: GameLogic.calculateRacerStats(racer)
      }))
      .sort((a, b) => {
        if (a.ranking === 0 && b.ranking === 0) return 0
        if (a.ranking === 0) return 1
        if (b.ranking === 0) return -1
        return a.ranking - b.ranking
      })
  }

  /**
   * Serialize game state for client (remove sensitive server data)
   * @param {object} gameState - Full game state
   * @returns {object} Client-safe game state
   */
  serializeForClient(gameState) {
    return {
      track: gameState.track,
      racers: gameState.racers.map(r => ({
        playerName: r.playerName,
        color: r.color,
        x: r.x,
        y: r.y,
        x0: r.x0,
        y0: r.y0,
        dx: r.dx,
        dy: r.dy,
        dist: r.dist,
        topSpeed: r.topSpeed,
        ticks: r.ticks,
        active: r.active,
        ranking: r.ranking
      })),
      whoseTurn: gameState.whoseTurn,
      currentPlayerName: this.getCurrentRacer(gameState)?.playerName || null,
      dp: gameState.dp,
      status: gameState.status
    }
  }
}

module.exports = GameEngine
