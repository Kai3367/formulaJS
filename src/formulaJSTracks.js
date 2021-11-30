const tracks = {
  0: {
    name: 'Practising Ground',
    outer: [
      { x: 20, y: 40 },
      { x: 980, y: 40 },
      { x: 980, y: 960 },
      { x: 20, y: 960 },
      { x: 20, y: 40 }
    ],
    inner: [],
    startFinish: [
      { x: 500, y: 40 },
      { x: 500, y: 240 }
    ]
  },
  1: {
    name: 'Oblong',
    outer: [
      { x: 20, y: 40 },
      { x: 980, y: 40 },
      { x: 980, y: 960 },
      { x: 20, y: 960 },
      { x: 20, y: 40 }
    ],
    inner: [
      { x: 120, y: 140 },
      { x: 880, y: 140 },
      { x: 880, y: 860 },
      { x: 120, y: 860 },
      { x: 120, y: 140 }
    ],
    startFinish: [
      { x: 20, y: 500 },
      { x: 120, y: 500 }
    ]
  },
  2: {
    name: 'Simple Chicane',
    outer: [
      { x: 20, y: 40 },
      { x: 400, y: 40 },
      { x: 400, y: 400 },
      { x: 600, y: 400 },
      { x: 600, y: 40 },
      { x: 980, y: 40 },
      { x: 980, y: 960 },
      { x: 20, y: 960 },
      { x: 20, y: 40 }
    ],
    inner: [
      { x: 120, y: 140 },
      { x: 300, y: 140 },
      { x: 300, y: 500 },
      { x: 700, y: 500 },
      { x: 700, y: 140 },
      { x: 880, y: 140 },
      { x: 880, y: 860 },
      { x: 120, y: 860 },
      { x: 120, y: 140 }
    ],
    startFinish: [
      { x: 500, y: 960 },
      { x: 500, y: 860 }
    ]
  },
  3: {
    name: 'Crazy Twists',
    outer: [
      { x: 25, y: 25 },
      { x: 200, y: 25 },
      { x: 200, y: 725 },
      { x: 500, y: 725 },
      { x: 500, y: 700 },
      { x: 225, y: 700 },
      { x: 225, y: 25 },
      { x: 975, y: 25 },
      { x: 975, y: 975 },
      { x: 775, y: 975 },
      { x: 775, y: 225 },
      { x: 400, y: 225 },
      { x: 400, y: 525 },
      { x: 675, y: 525 },
      { x: 675, y: 975 },
      { x: 25, y: 975 },
      { x: 25, y: 25 }
    ],
    inner: [
      { x: 125, y: 800 },
      { x: 550, y: 800 },
      { x: 550, y: 625 },
      { x: 300, y: 625 },
      { x: 300, y: 125 },
      { x: 875, y: 125 },
      { x: 875, y: 900 },
      { x: 850, y: 900 },
      { x: 850, y: 150 },
      { x: 325, y: 150 },
      { x: 325, y: 600 },
      { x: 575, y: 600 },
      { x: 575, y: 825 },
      { x: 100, y: 825 },
      { x: 100, y: 100 },
      { x: 125, y: 100 },
      { x: 125, y: 800 }
    ],
    startFinish: [
      { x: 200, y: 200 },
      { x: 125, y: 200 }
    ]
  },
  4: {
    name: 'Turns & Dashes',
    outer: [
      { x: 120, y: 40 },
      { x: 260, y: 40 },
      { x: 340, y: 200 },
      { x: 370, y: 400 },
      { x: 500, y: 370 },
      { x: 660, y: 40 },
      { x: 820, y: 40 },
      { x: 900, y: 200 },
      { x: 980, y: 760 },
      { x: 920, y: 880 },
      { x: 600, y: 960 },
      { x: 540, y: 880 },
      { x: 550, y: 760 },
      { x: 750, y: 420 },
      { x: 740, y: 400 },
      { x: 180, y: 960 },
      { x: 20, y: 760 },
      { x: 20, y: 220 },
      { x: 120, y: 40 }
    ],
    inner: [
      { x: 140, y: 160 },
      { x: 240, y: 160 },
      { x: 290, y: 240 },
      { x: 330, y: 500 },
      { x: 520, y: 450 },
      { x: 670, y: 180 },
      { x: 800, y: 180 },
      { x: 850, y: 260 },
      { x: 920, y: 740 },
      { x: 890, y: 800 },
      { x: 620, y: 860 },
      { x: 600, y: 820 },
      { x: 800, y: 440 },
      { x: 800, y: 320 },
      { x: 740, y: 300 },
      { x: 190, y: 840 },
      { x: 100, y: 720 },
      { x: 100, y: 240 },
      { x: 140, y: 160 }
    ],
    startFinish: [
      { x: 20, y: 500 },
      { x: 100, y: 500 }
    ]
  }
}

// get all tracks scaled to current client size (called via "Go!" button in html)
const getTracks = () => {
  const canvas = document.getElementById('track')
  const scaleX = canvas.clientWidth / 1000
  const scaleY = canvas.clientHeight / 1000
  const invalidTracks = []

  // check start/finish lines: must be vertical or horizontal
  const startFinishOk = Object.keys(tracks).reduce((ok, id) => {
    const sf0 = tracks[id].startFinish[0]
    const sf1 = tracks[id].startFinish[1]
    const trackOk = ok && ((sf0.y === sf1.y && sf0.x !== sf1.x) || (sf0.x === sf1.x && sf0.y !== sf1.y))

    if (!trackOk) {
      invalidTracks.push(tracks[id].name)
    }

    return trackOk
  }, true)

  if (!startFinishOk) {
    window.alert(`Race track(s) "${invalidTracks.join(', ')}": Start/finish line must be horizontal or vertical!`)
    throw new Error('Invalid start/finish line found')
  }

  // scale track to actual canvas size
  return Object.keys(tracks).map(id => ({
    outer: tracks[id].outer.map(p => ({ x: Math.floor(p.x * scaleX), y: Math.floor(p.y * scaleY) })),
    inner: tracks[id].inner.map(p => ({ x: Math.floor(p.x * scaleX), y: Math.floor(p.y * scaleY) })),
    startFinish: tracks[id].startFinish.map(p => ({ x: Math.floor(p.x * scaleX), y: Math.floor(p.y * scaleY) })),
    name: tracks[id].name
  }))
}

// get all track names (called on load of html)
const trackNames = () => Object.keys(tracks).map(id => tracks[id].name)
