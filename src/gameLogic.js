/**
 * Shared Game Logic
 * Functions that can be used on both client and server
 * for consistent game mechanics
 */

// Game constants
const GAME_CONSTANTS = {
  dp: 10, // distance between positions in 3x3 grid (will be scaled)
  minDist: 0.8, // minimum driven distance required to finish race
  scaleT: 1.2, // time scale (s per tick)
  scaleD: 1, // distance scale (m per pixel)
  colors: ['red', 'green', 'blue', 'purple']
}

// Calculate velocity scale
GAME_CONSTANTS.scaleV = 3.6 * GAME_CONSTANTS.scaleD / GAME_CONSTANTS.scaleT

/**
 * Calculate new position deltas based on direction
 * @param {number} currentDx - Current delta x
 * @param {number} currentDy - Current delta y
 * @param {number} direction - Direction (1-9)
 * @param {number} dp - Distance between positions
 * @returns {object} New deltas {dx, dy}
 */
function calculateNewDeltas(currentDx, currentDy, direction, dp) {
  let dx = currentDx
  let dy = currentDy

  switch (direction) {
    case 1: dx -= dp; dy += dp; break
    case 2: dy += dp; break
    case 3: dx += dp; dy += dp; break
    case 4: dx -= dp; break
    case 5: break // no change
    case 6: dx += dp; break
    case 7: dx -= dp; dy -= dp; break
    case 8: dy -= dp; break
    case 9: dx += dp; dy -= dp; break
    default: break
  }

  return { dx, dy }
}

/**
 * Calculate new position based on deltas
 * @param {number} x - Current x
 * @param {number} y - Current y
 * @param {number} dx - Delta x
 * @param {number} dy - Delta y
 * @returns {object} New position {x, y}
 */
function calculateNewPosition(x, y, dx, dy) {
  return {
    x: x + dx,
    y: y + dy
  }
}

/**
 * Check if racer position is off the road
 * @param {object} racer - Racer with x, y coordinates
 * @param {object} track - Track with outer and inner polygons
 * @returns {boolean} True if off road
 */
function isOffRoad(racer, track) {
  const p = { x: racer.x, y: racer.y }
  let inside = false
  let polygon = track.outer

  let minX = polygon[0].x
  let maxX = polygon[0].x
  let minY = polygon[0].y
  let maxY = polygon[0].y

  for (let i = 1; i < polygon.length; i++) {
    const q = polygon[i]
    minX = Math.min(q.x, minX)
    maxX = Math.max(q.x, maxX)
    minY = Math.min(q.y, minY)
    maxY = Math.max(q.y, maxY)
  }

  if (p.x < minX || p.x > maxX || p.y < minY || p.y > maxY) {
    return true
  }

  // Check outer polygon
  let i = 0
  let j = polygon.length - 1

  for (i, j; i < polygon.length; j = i++) {
    if ((polygon[i].y > p.y) !== (polygon[j].y > p.y) &&
      p.x < (polygon[j].x - polygon[i].x) * (p.y - polygon[i].y) / (polygon[j].y - polygon[i].y) + polygon[i].x) {
      inside = !inside
    }
  }

  if (track.inner && track.inner.length > 0) {
    // Check inner polygon
    polygon = track.inner
    i = 0
    j = polygon.length - 1

    for (i, j; i < polygon.length; j = i++) {
      if ((polygon[i].y > p.y) !== (polygon[j].y > p.y) &&
        p.x < (polygon[j].x - polygon[i].x) * (p.y - polygon[i].y) / (polygon[j].y - polygon[i].y) + polygon[i].x) {
        inside = !inside
      }
    }
  }

  return !inside
}

/**
 * Check if two racers have crashed into each other
 * @param {object} racer1 - First racer
 * @param {object} racer2 - Second racer
 * @returns {boolean} True if crashed
 */
function checkCrash(racer1, racer2) {
  return Math.abs(racer1.x - racer2.x) < 5 && Math.abs(racer1.y - racer2.y) < 5
}

/**
 * Check if racer has any crash with other racers
 * @param {object} racer - Racer to check
 * @param {array} otherRacers - Array of other racers
 * @returns {boolean} True if crashed
 */
function hasAnyCrash(racer, otherRacers) {
  return otherRacers.some(other => checkCrash(racer, other))
}

/**
 * Check if racer crossed the finish line
 * @param {object} racer - Racer with x, y, x0, y0, dist
 * @param {object} track - Track with startFinish line and distance
 * @returns {boolean} True if finished
 */
function hasFinished(racer, track) {
  // Check minimum distance requirement
  if (racer.dist < GAME_CONSTANTS.minDist * track.distance / GAME_CONSTANTS.scaleD) {
    return false
  }

  // Check line intersection
  const rx0 = racer.x0
  const ry0 = racer.y0
  const rx1 = racer.x
  const ry1 = racer.y
  const sx0 = track.startFinish[0].x
  const sy0 = track.startFinish[0].y
  const sx1 = track.startFinish[1].x
  const sy1 = track.startFinish[1].y

  const det = (rx1 - rx0) * (sy1 - sy0) - (sx1 - sx0) * (ry1 - ry0)

  if (det === 0) {
    return false
  }

  const lambda = ((sy1 - sy0) * (sx1 - rx0) + (sx0 - sx1) * (sy1 - ry0)) / det
  const gamma = ((ry0 - ry1) * (sx1 - rx0) + (rx1 - rx0) * (sy1 - ry0)) / det

  return (lambda > 0 && lambda < 1) && (gamma > 0 && gamma < 1)
}

/**
 * Calculate racer statistics
 * @param {object} racer - Racer object
 * @returns {object} Stats {speed, distance, avgSpeed, totalTime}
 */
function calculateRacerStats(racer) {
  const speed = Math.sqrt(racer.dx ** 2 + racer.dy ** 2) * GAME_CONSTANTS.scaleV
  const distance = racer.dist * GAME_CONSTANTS.scaleD
  const avgSpeed = (distance / (racer.ticks > 0 ? racer.ticks : 1)) * GAME_CONSTANTS.scaleV

  // Total time in [hh:]mm:ss.s format
  const t = Math.floor(racer.ticks * GAME_CONSTANTS.scaleT * 1000)
  const d = new Date(0)
  d.setMilliseconds(t)
  const s0 = t >= 3600000 ? 11 : t >= 60000 ? 14 : 17
  const s1 = t >= 3600000 ? 10 : t >= 60000 ? 7 : 4
  const totalTime = d.toISOString().substr(s0, s1)

  return {
    speed: Math.floor(speed),
    distance: Math.floor(distance),
    avgSpeed: Math.floor(avgSpeed),
    totalTime
  }
}

/**
 * Get the 9 possible next positions for a racer
 * @param {object} racer - Racer with x, y, dx, dy
 * @param {number} dp - Distance between positions
 * @returns {array} Array of 9 position objects {x, y}
 */
function getPossibleNextPositions(racer, dp) {
  return [
    { x: racer.x + racer.dx - dp, y: racer.y + racer.dy - dp },
    { x: racer.x + racer.dx - dp, y: racer.y + racer.dy },
    { x: racer.x + racer.dx - dp, y: racer.y + racer.dy + dp },
    { x: racer.x + racer.dx, y: racer.y + racer.dy - dp },
    { x: racer.x + racer.dx, y: racer.y + racer.dy },
    { x: racer.x + racer.dx, y: racer.y + racer.dy + dp },
    { x: racer.x + racer.dx + dp, y: racer.y + racer.dy - dp },
    { x: racer.x + racer.dx + dp, y: racer.y + racer.dy },
    { x: racer.x + racer.dx + dp, y: racer.y + racer.dy + dp }
  ]
}

/**
 * Execute a move for a racer
 * @param {object} racer - Racer object to move
 * @param {number} direction - Direction (1-9)
 * @param {number} dp - Distance between positions
 * @returns {object} Updated racer state
 */
function executeMove(racer, direction, dp) {
  // Calculate new deltas
  const newDeltas = calculateNewDeltas(racer.dx, racer.dy, direction, dp)

  // Store old position
  const x0 = racer.x
  const y0 = racer.y

  // Calculate new position
  const newPos = calculateNewPosition(racer.x, racer.y, newDeltas.dx, newDeltas.dy)

  // Update distance
  const moveDist = Math.sqrt(newDeltas.dx ** 2 + newDeltas.dy ** 2)
  const newDist = racer.dist + moveDist

  // Calculate speed and update top speed
  const speed = Math.sqrt(newDeltas.dx ** 2 + newDeltas.dy ** 2) * GAME_CONSTANTS.scaleV
  const newTopSpeed = speed > racer.topSpeed ? speed : racer.topSpeed

  // Update ticks
  const newTicks = racer.ticks + 1

  return {
    ...racer,
    x: newPos.x,
    y: newPos.y,
    x0,
    y0,
    dx: newDeltas.dx,
    dy: newDeltas.dy,
    dist: newDist,
    topSpeed: newTopSpeed,
    ticks: newTicks
  }
}

// Export for both Node.js and browser
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    GAME_CONSTANTS,
    calculateNewDeltas,
    calculateNewPosition,
    isOffRoad,
    checkCrash,
    hasAnyCrash,
    hasFinished,
    calculateRacerStats,
    getPossibleNextPositions,
    executeMove
  }
}

// For browser usage
if (typeof window !== 'undefined') {
  window.GameLogic = {
    GAME_CONSTANTS,
    calculateNewDeltas,
    calculateNewPosition,
    isOffRoad,
    checkCrash,
    hasAnyCrash,
    hasFinished,
    calculateRacerStats,
    getPossibleNextPositions,
    executeMove
  }
}
