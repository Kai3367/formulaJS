let N = 1 // number of drivers
let dp = 10 // distance between positions in allowed next positions 3x3 grid
let whoseTurn // index of current driver

const trackColor = '#dddddd'
const borderColor = '#cccccc'
const colors = ['red', 'green', 'blue', 'purple']
const directions = { up: 'up', down: 'down', left: 'left', right: 'right' }
const minDist = 0.8 // minimum driven distance required to finish race (fraction of track distance)
const scaleT = 1.2 // time scale (s per tick)
const scaleD = 1 // distance scale (m per pixel)
const scaleV = 3.6 * scaleD / scaleT // velocity scale (km/h per pixel/tick)

// page elements
let trackCanvas
let racersCanvas
let trackText
let whoseTurnText
let statusTable

let hiScores = undefined
let track = {}
let drivers = []
let racers = []
let ranking = 1

class Racer {
  constructor (ctx, driver, color) {
    this.ctx = ctx
    this.driver = driver
    this.color = color

    this.x = 0 // the racer's current x-position
    this.y = 0 // the racer's current y-position
    this.dx = 0 // the racer's current delta-x
    this.dy = 0 // the racer's current delta-y
    this.x0 = 0 // the racer's previous x-position
    this.y0 = 0 // the racer's previous y-position

    this.dist = 0 // total distance driven
    this.topSpeed = 0 // top speed
    this.ticks = 0 // total number of time ticks
    this.active = true
    this.ranking = 0
  }

  // the current speed scaled to km/h
  get speed () { return Math.sqrt(this.dx ** 2 + this.dy ** 2) * scaleV }

  // the current distance driven scaled to m
  get distance () { return this.dist * scaleD }

  // average speed scaled to km/h
  get avgSpeed () { return (this.distance / (this.ticks > 0 ? this.ticks : 1)) * scaleV }

  // the set of possible next positions
  get headedAt () {
    return [{
      x: this.x + this.dx - dp,
      y: this.y + this.dy - dp
    }, {
      x: this.x + this.dx - dp,
      y: this.y + this.dy
    }, {
      x: this.x + this.dx - dp,
      y: this.y + this.dy + dp
    }, {
      x: this.x + this.dx,
      y: this.y + this.dy - dp
    }, {
      x: this.x + this.dx,
      y: this.y + this.dy
    }, {
      x: this.x + this.dx,
      y: this.y + this.dy + dp
    }, {
      x: this.x + this.dx + dp,
      y: this.y + this.dy - dp
    }, {
      x: this.x + this.dx + dp,
      y: this.y + this.dy
    }, {
      x: this.x + this.dx + dp,
      y: this.y + this.dy + dp
    }]
  }

  // the total time driven in [hh:]mm:ss.s format
  get totalTime () {
    const t = Math.floor(this.ticks * scaleT * 1000) // time ticks scaled to ms
    const d = new Date(0)
    d.setMilliseconds(t)
    const s0 = t >= 3600000 ? 11 : t >= 60000 ? 14 : 17
    const s1 = t >= 3600000 ? 10 : t >= 60000 ? 7 : 4
    return d.toISOString().substr(s0, s1)
  }

  // the time delta in [hh:[mm:]]ss.s format
  deltaTime (racer) {
    const t = Math.floor((this.ticks - racer.ticks) * scaleT * 1000) // delta ticks scaled to ms
    const d = new Date(0)
    d.setMilliseconds(t)
    const s0 = t >= 3600000 ? 11 : t >= 60000 ? 14 : 17
    const s1 = t >= 3600000 ? 10 : t >= 60000 ? 7 : 4
    return d.toISOString().substr(s0, s1)
  }

  // show the racer icon (colored square) at current position
  showIcon () {
    this.ctx.beginPath()
    this.ctx.fillStyle = this.color
    this.ctx.fillRect(this.x - 2, this.y - 2, 5, 5)
  }

  // delete the racer icon (colored square) at previous position
  hideIcon () {
    this.ctx.clearRect(this.x0 - 2, this.y0 - 2, 5, 5)
  }

  // move the racer icon from previous to current position
  moveIcon () {
    this.hideIcon()
    this.ctx.beginPath()
    this.ctx.moveTo(this.x0, this.y0)
    this.ctx.lineTo(this.x, this.y)
    this.ctx.strokeStyle = this.color
    this.ctx.stroke()
    this.showIcon()
  }

  // set the racer's start position and show its icon
  startAt (x, y) {
    this.x = x
    this.y = y
    this.x0 = x
    this.y0 = y
    this.showIcon()
  }

  // drive the racer in the given direction
  drive (where) {
    // determine delta-x & y from given direction
    switch (where) {
      case 1: this.dx -= dp; this.dy += dp; break
      case 2: this.dy += dp; break
      case 3: this.dx += dp; this.dy += dp; break
      case 4: this.dx -= dp; break
      case 5: break
      case 6: this.dx += dp; break
      case 7: this.dx -= dp; this.dy -= dp; break
      case 8: this.dy -= dp; break
      case 9: this.dx += dp; this.dy -= dp; break
      default: break
    }

    // update the racer's current & previous positions and deltas
    this.x0 = this.x
    this.y0 = this.y
    this.x += this.dx
    this.y += this.dy
    this.dx = this.x - this.x0
    this.dy = this.y - this.y0

    // update distance, top speed, and time ticks
    this.dist += Math.sqrt(this.dx ** 2 + this.dy ** 2)
    if (this.speed > this.topSpeed) { this.topSpeed = this.speed }
    this.ticks++

    // move the racer icon
    this.moveIcon()
  }

  show () {
    // show the racer icon
    this.showIcon()
    this.ctx.beginPath()
    this.ctx.fillStyle = this.color

    // show where the racer is heading
    this.headedAt.forEach(where => {
      this.ctx.fillRect(where.x - 1, where.y - 1, 3, 3)
    })
  }

  hide () {
    // hide the racer icon
    this.hideIcon()

    // hide where the racer is heading
    this.headedAt.forEach(where => {
      this.ctx.clearRect(where.x - 1, where.y - 1, 3, 3)
    })
  }
}

class Track {
  constructor (canvas, polygon, N) {
    // Number of racers
    this.N = N
    // polygon of the race track
    this.name = polygon.name
    this.polygon = { outer: polygon.outer, inner: polygon.inner }
    // duplicate last outer polygon point for distance computation
    const outerN = this.polygon.outer.length
    const outer = this.polygon.outer.concat([this.polygon.outer[outerN - 1]])
    const outerDist = this.polygon.outer.reduce((d, p, i) =>
      d + Math.sqrt((outer[i + 1].x - p.x) ** 2 + (outer[i + 1].y - p.y) ** 2), 0)
    // duplicate last inner polygon point for distance computation
    const innerN = this.polygon.inner.length
    const inner = this.polygon.inner.concat([this.polygon.inner[innerN - 1]])
    const innerDist = this.polygon.inner.reduce((d, p, i) =>
      d + Math.sqrt((inner[i + 1].x - p.x) ** 2 + (inner[i + 1].y - p.y) ** 2), 0)
    // track distance
    this.distance = Math.floor(scaleD * (outerDist + innerDist) / 2)
    // start/finish line
    this.startFinish = polygon.startFinish
    this.text = `${polygon.name} (${this.distance} m)`

    // direction to start race
    const sf0 = this.startFinish[0]
    const sf1 = this.startFinish[1]

    switch (true) {
      case sf0.x === sf1.x && sf0.y < sf1.y:
        this.direction = directions.right
        break
      case sf0.x === sf1.x && sf0.y > sf1.y:
        this.direction = directions.left
        break
      case sf0.x > sf1.x && sf0.y === sf1.y:
        this.direction = directions.down
        break
      case sf0.x < sf1.x && sf0.y === sf1.y:
        this.direction = directions.up
        break
      default:
        throw new Error(`Invalid start/finish line: ${JSON.stringify(this.startFinish)}`)
    }

    // get canvas properties
    this.ctx = canvas.getContext('2d')
    this.width = canvas.clientWidth
    this.heigth = canvas.clientHeight

    // starting positions for racers
    const dx = sf1.x - sf0.x
    const dy = sf1.y - sf0.y

    this.positions = new Array(N).fill(0).map((p, i) => ({
      x: Math.floor(sf0.x + (i + 1) * dx / (N + 1)),
      y: Math.floor(sf0.y + (i + 1) * dy / (N + 1))
    }))
  }

  // display the race track
  show () {
    // fill outside of race track with border color
    this.ctx.beginPath()
    this.ctx.fillStyle = borderColor
    this.ctx.rect(0, 0, this.width, this.heigth)
    this.ctx.fill()

    // fill outer polygon of race track with track color
    this.ctx.beginPath()
    this.ctx.moveTo(this.polygon.outer[0].x, this.polygon.outer[0].y)
    this.polygon.outer.forEach((p, i) => {
      if (i > 0) { this.ctx.lineTo(p.x, p.y) }
    })
    this.ctx.closePath()
    this.ctx.fillStyle = trackColor
    this.ctx.fill('evenodd')

    // fill inner polygon of race track with border color
    if (this.polygon.inner.length > 0) {
      this.ctx.beginPath()
      this.ctx.moveTo(this.polygon.inner[0].x, this.polygon.inner[0].y)
      this.polygon.inner.forEach((p, i) => {
        if (i > 0) { this.ctx.lineTo(p.x, p.y) }
      })
      this.ctx.closePath()
      this.ctx.fillStyle = borderColor
      this.ctx.fill('evenodd')
    }

    // display starting line
    this.ctx.beginPath()
    this.ctx.strokeStyle = 'black'
    this.ctx.moveTo(this.startFinish[0].x, this.startFinish[0].y)
    this.ctx.lineTo(this.startFinish[1].x, this.startFinish[1].y)
    this.ctx.stroke()
  }

  // check whether a racer is off the road
  offRoad (racer) {
    // cf. https://stackoverflow.com/questions/217578
    const p = { x: racer.x, y: racer.y }
    let inside = false
    let polygon = this.polygon.outer

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

    // consider outer polygon
    let i = 0
    let j = polygon.length - 1

    for (i, j; i < polygon.length; j = i++) {
      if ((polygon[i].y > p.y) !== (polygon[j].y > p.y) &&
      p.x < (polygon[j].x - polygon[i].x) * (p.y - polygon[i].y) / (polygon[j].y - polygon[i].y) + polygon[i].x) {
        inside = !inside
      }
    }

    if (this.polygon.inner.length > 0) {
      // consider inner polygon
      polygon = this.polygon.inner
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

  // check whether a racer has finished
  finish (racer) {
    // cf. https://stackoverflow.com/questions/9043805/test-if-two-lines-intersect-javascript-function/24392281#24392281
    const rx0 = racer.x0
    const ry0 = racer.y0
    const rx = racer.x
    const ry = racer.y

    const sx0 = this.startFinish[0].x
    const sy0 = this.startFinish[0].y
    const sx = this.startFinish[1].x
    const sy = this.startFinish[1].y

    const det = (rx - rx0) * (sy - sy0) - (sx - sx0) * (ry - ry0)

    if (det === 0) {
      return false
    } else {
      const lambda = ((sy - sy0) * (sx - rx0) + (sx0 - sx) * (sy - ry0)) / det
      const gamma = ((ry0 - ry) * (sx - rx0) + (rx - rx0) * (sy - ry0)) / det

      const dirOk =
        (this.direction === directions.up && ry < ry0) ||
        (this.direction === directions.down && ry > ry0) ||
        (this.direction === directions.left && rx < rx0) ||
        (this.direction === directions.right && rx > rx0)

      const distOk = racer.distance > minDist * this.distance

      return dirOk && distOk && lambda > 0 && lambda <= 1 && gamma > 0 && gamma < 1
    }
  }
}

class HiScores {
  constructor (hiScoresTable) {
    this.available = true
    this.hiScoresTable = hiScoresTable

    try {
      this.storage = window.localStorage
      this.storage.setItem('__storage_test__', '')
      this.storage.removeItem('__storage_test__')
    } catch(e) {
      // local storage not available
      this.available = false
      this.storage = undefined
      this.hiScores = undefined
    }

    if (this.available) {
      this.hiScores = JSON.parse(this.storage.getItem('__formulaJS_hiScores__')) || {}
    }
  }

  update (racers, trackName) {
    const finishers = racers.filter(r => r.ranking > 0)

    if (this.available && finishers.length > 0) {
      const hiScores = this.hiScores[trackName] || []

      finishers.forEach(racer => {
        // only store values (not objects) to minimize data volume in local storage
        const score = [racer.driver, racer.ticks, racer.totalTime, racer.avgSpeed, racer.topSpeed]
        hiScores.push(score)
      })
        
      // rank by ticks
      hiScores.sort((a, b) => a[1] - b[1])
      // keep top 10
      this.hiScores[trackName] = hiScores.slice(0, 10)
      this.storage.setItem('__formulaJS_hiScores__', JSON.stringify(this.hiScores))
    }
  }

  clear (trackName) {
    if (this.available) {
      delete this.hiScores[trackName]
      this.storage.setItem('__formulaJS_hiScores__', JSON.stringify(this.hiScores))
    }
  }

  show (trackName) {
    if (this.available && trackName && this.hiScores[trackName]) {
      this.hiScoresTable.innerHTML = `<table>
        <tr>
          <th>Ranking</th>
          <th>Driver</th>
          <th>Time (hh:mm:ss.s)</th>
          <th>Avg. Speed (km/h)</th>
          <th>Top Speed (km/h)</th>
        </tr>
        ${this.hiScores[trackName].reduce(
          (html, score, rank) => `${html}
            <tr>
              <td>${rank + 1}</td>
              <td>${score[0]}</td>
              <td>${score[2]}</td>
              <td>${Math.floor(score[3])}</td>
              <td>${Math.floor(score[4])}</td>
            </tr>`,
          ''
        )}
      </table>`
    } else {
      this.hiScoresTable.innerHTML = 'No ranking available'
    }
  }
}

// initialize the game (called on load of html)
const init = trackNames => {
  const playArea = document.getElementById('playArea')
  const width = playArea.clientWidth
  const height = playArea.clientHeight

  trackCanvas = document.getElementById('track')
  racersCanvas = document.getElementById('racers')

  // if resolution does not match change it
  if (trackCanvas.width !== width || trackCanvas.height !== height) {
    trackCanvas.width = width
    trackCanvas.height = height
    racersCanvas.width = width
    racersCanvas.height = height
  }

  trackText = document.getElementById('trackText')
  whoseTurnText = document.getElementById('whoseTurn')
  statusTable = document.getElementById('status')
  hiScores = new HiScores(document.getElementById('hiScores'))

  const target = document.getElementById('trackSelection')
  target.innerHTML = `<select id="selectedTrack">
    <option disabled selected value> -- select a race track -- </option>
    ${trackNames.reduce((html, name, i) => `${html}
      <option value="${i}">${name}</option>`,
      ''
    )}
  </select>`

  document.addEventListener('keypress', onKeypress)
  openInput()
}

// check whether a racer has crashed into another
const crash = racer => racers.reduce(
  (c, r) => c || (racer !== r && Math.abs(racer.x - r.x) < 5 && Math.abs(racer.y - r.y) < 5)
  , false
)

// start the race
const startRace = polygon => {
  racers = []
  ranking = 1

  // clear the racing grounds
  const width = trackCanvas.clientWidth
  const height = trackCanvas.clientHeight
  dp = Math.floor(height / 60)
  trackCanvas.getContext('2d').clearRect(0, 0, width, height)
  const ctx = racersCanvas.getContext('2d')
  ctx.clearRect(0, 0, width, height)

  // display the track and its text
  track = new Track(trackCanvas, polygon, N)
  track.show()
  trackText.innerHTML = track.text ? `${track.text}` : 'Formula JS'

  // create racer for each driver
  drivers.slice(0, N).forEach((driver, i) => {
    racers.push(new Racer(ctx, driver, colors[i]))
  })

  // set starting position for each racer
  racers.forEach((racer, i) => {
    racer.startAt(track.positions[i].x, track.positions[i].y)
  })

  // display whose turn it is
  whoseTurn = 0
  whoseTurnText.innerHTML = whoseNextText(racers[0]) + ` Go ${track.direction}!`
  racers[0].show()

  // display status table
  updateStatus()
}

// drive the current racer to the chosen position (called via number buttons in html)
const drive = where => {
  if (N === 0 || racers.length === 0) return // GAME OVER or not started, yet
  if ([1, 2, 3, 4, 5, 6, 7, 8, 9].indexOf(where) < 0) return // invalid direction

  // get current active racer and let them drive
  let racer = racers.filter(r => r.active)[whoseTurn]
  racer.hide()
  racer.drive(where)

  const finished = track.finish(racer)

  if (crash(racer) || track.offRoad(racer) || finished) {
    // racer crashed into another one or drove off the race course or has finished the race
    racer.active = false
    whoseTurn--
    N--

    if (finished) {
      // racer finished the race -> update their ranking
      racer.ranking = ranking++
      racer.active = false
    }

    if (N === 0) {
      // no more active racers -> race is over
      hiScores.update(racers, track.name)
      document.getElementById('gameOverPopup').style.display = 'block'
    }
  }

  // update status table
  updateStatus()

  if (N > 0) {
    // now it's the next racer's turn
    whoseTurn = (whoseTurn + 1) % N
    racer = racers.filter(r => r.active)[whoseTurn]
    racer.show()
    whoseTurnText.innerHTML = whoseNextText(racer)
  }
}

// update the status of all racers
const updateStatus = () => {
  const winner = racers.find(r => r.ranking === 1)

  statusTable.innerHTML = `<table>
    <tr>
      <th>Driver</th>
      <th>Position</th>
      <th>Speed (km/h)</th>
      <th>Distance (m)</th>
      <th>Avg. Speed (km/h)</th>
      <th>Top Speed (km/h)</th>
    </tr>
    ${racers.reduce(
      (html, racer) => `${html}
        <tr>
          <td>${racer.driver} (${racer.color})</td>
          <td>${racer.active
            ? ''
            : racer.ranking === 0
              ? 'DID NOT FINISH'
              : racer.ranking === 1
                ? `#1 time: ${racer.totalTime}`
                : `#${racer.ranking} gap: +${racer.deltaTime(winner)}`
          }</td>
          <td>${Math.floor(racer.speed)}</td>
          <td>${Math.floor(racer.distance)}</td>
          <td>${Math.floor(racer.avgSpeed)}</td>
          <td>${Math.floor(racer.topSpeed)}</td>
        </tr>`,
      ''
    )}
  </table>`
}

// start the game (called via "Go!" button in html)
const start = tracks => {
  // get and check input
  drivers = new Array(4).fill(0).map((d, i) => document.getElementById(`driver${i}`).value).filter(d => d)
  N = drivers.length

  if (N > 0) {
    const selectedTrack = document.getElementById('selectedTrack')
    const id = Math.floor(Number(selectedTrack.options[selectedTrack.selectedIndex].value))

    if (isNaN(id) || id < 0 || id > tracks.length - 1) {
      window.alert('Select a race track!')
    } else {
      // input ok -> let's go!
      document.getElementById('inputPopup').style.display = 'none'
      startRace(tracks[id])
    }
  } else {
    window.alert('Enter at least one driver!')
  }
}

// get the text about whose turn it is
const whoseNextText = racer => `It's ${racer.driver}${racer.driver.match(/[sz]$/gi) ? "'" : "'s"} (${racer.color}) turn!`

// react on key pressed (called via "keypress" event from browser)
const onKeypress = key => {
  const map = {
    Digit1: 1, KeyJ: 1,
    Digit2: 2, KeyK: 2,
    Digit3: 3, KeyL: 3,
    Digit4: 4, KeyU: 4,
    Digit5: 5, KeyI: 5,
    Digit6: 6, KeyO: 6,
    Digit7: 7,
    Digit8: 8,
    Digit9: 9
  }
  drive(map[key.code])
}

// show popup for selecting race track and entering driver names
const openInput = () => {
  document.getElementById('gameOverPopup').style.display = 'none'
  document.getElementById('inputPopup').style.display = 'block'
}

// close popup for selecting race track and entering driver names
const closeInput = () => {
  document.getElementById('inputPopup').style.display = 'none'
}

// show all time ranking for the currently selected race track
const showHiScores = () => {
  if (hiScores.available) {
    hiScores.show(track.name)
    document.getElementById('hiScoresPopup').style.display = 'block'
  } else {
    window.alert('Hi Scores not available. Check your browser settings!')
  }
}

// close all-time ranking popup
const closeHiScores = () => {
  document.getElementById('hiScoresPopup').style.display = 'none'
}  

// delete all time ranking for the currently selected race track
const clearHiScores = () => {
  if (
    hiScores.available && 
    track.name && 
    window.confirm(`Do you really want to clear the all time ranking for the "${track.name}" track?`)
  ) {
    hiScores.clear(track.name)
  }
}