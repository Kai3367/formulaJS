# Formula JS - Multiplayer BTP Application

### Backend (Server-Side)
1. **server.js** - Express + Socket.IO server with full multiplayer support
2. **gameRoomManager.js** - Room lifecycle management (create, join, leave)
3. **gameEngine.js** - Server-authoritative game state management
4. **gameLogic.js** - Shared game logic (client & server)
5. **Health endpoint** at `/health` for BTP monitoring

### Frontend (Client-Side)
1. **multiplayerClient.js** - Socket.IO wrapper for easy client usage
2. **multiplayerIntegration.js** - UI and event handling for multiplayer
3. **Modified formulaJSRace.js** - Support for both LOCAL and ONLINE_MP modes
4. **New UI components**:
   - Mode selection popup (Local vs Online)
   - Room creation popup with code display
   - Room joining popup
   - Lobby with player list and ready status
   - Disconnection overlay
   - Connection status indicator

### Configuration
1. **package.json** - Updated with Socket.IO dependency
2. **manifest.yml** - BTP CF config with health checks and env vars
3. **.cfignore** - Optimized deployment exclusions

## Quick Start

### Local Testing
```bash
# Install dependencies
npm install

# Start server
npm start

# Open multiple browser windows
http://localhost:8080
```

### Deploy to BTP
```bash
# Login
cf login -a <your-api-endpoint>

# Deploy
cf push

# Check status
cf apps
cf logs formulajs --recent
```

## How It Works

### Game Modes

**LOCAL MODE** (Hot-Seat):
- Original gameplay preserved
- Multiple players on same computer
- Take turns using same browser

**ONLINE MULTIPLAYER MODE**:
- Real-time multiplayer via WebSocket
- Players on different devices/locations
- Room-based system with unique codes
- Host creates room, others join with code
- Server-authoritative game state

### Multiplayer Flow

1. **Start** → Select "Online Multiplayer"
2. **Create or Join** → Host creates room, gets code; others join with code
3. **Lobby** → Players mark ready, host selects track
4. **Race** → Takes turns, moves sync across all clients
5. **Finish** → Results shown to all players

### Architecture

```
┌─────────────────────────────────────────────┐
│         BTP Cloud Foundry (256MB)          │
│  ┌──────────────────────────────────────┐  │
│  │  Express.js + Socket.IO Server       │  │
│  │  - HTTP routes (/,/health)           │  │
│  │  - WebSocket events                  │  │
│  │  - Room Manager                      │  │
│  │  - Game Engine                       │  │
│  └──────────────────────────────────────┘  │
└─────────────────────────────────────────────┘
           ↕ WebSocket (Socket.IO)
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│   Browser 1  │  │   Browser 2  │  │   Browser 3  │
│   (Player 1) │  │   (Player 2) │  │   (Player 3) │
│              │  │              │  │              │
│  Multiplayer │  │  Multiplayer │  │  Multiplayer │
│    Client    │  │    Client    │  │    Client    │
└──────────────┘  └──────────────┘  └──────────────┘
```

## Key Features

✅ Real-time multiplayer synchronization<br>
✅ Room-based matchmaking with unique codes<br>
✅ Server-authoritative game state (anti-cheat)<br>
✅ Graceful disconnection handling (30s grace period)<br>
✅ Host migration when host leaves<br>
✅ Connection status monitoring<br>
✅ Supports 1-4 players per game<br>
✅ Up to 20 concurrent rooms<br>
✅ BTP Cloud Foundry optimized<br>
✅ Health check endpoint for monitoring<br>
✅ Backward compatible (Local mode still works)<br>

## Project Structure

```
formulaJS/
├── server.js                      # Main server (Express + Socket.IO)
├── gameRoomManager.js             # Room management
├── gameEngine.js                  # Server-side game logic
├── gameLogic.js                   # Shared logic (client & server)
├── package.json                   # Dependencies
├── manifest.yml                   # BTP CF configuration
├── .cfignore                      # Deployment exclusions
├── MULTIPLAYER_IMPLEMENTATION.md  # Architecture & implementation details
├── TESTING_GUIDE.md               # Testing instructions
└── src/
    ├── FormulaJS.html            # Main HTML (updated)
    ├── FormulaJS.css             # Styles (updated)
    ├── formulaJSRace.js          # Game logic (updated for MP)
    ├── formulaJSTracks.js        # Track definitions
    ├── multiplayerClient.js      # Socket.IO client wrapper
    ├── multiplayerIntegration.js # MP UI and event handling
    ├── favicon.ico               # Icon
    └── (other assets)
```

## Testing Checklist

Follow the `TESTING_GUIDE.md` for detailed instructions.

**Quick Test:**
1. Open two browser windows to `http://localhost:8080`
2. Window 1: Start → Online Multiplayer → Create Room → Enter name → Copy code
3. Window 2: Start → Online Multiplayer → Join Room → Enter name + code
4. Both should see lobby → Check ready → Host starts → Play!

## Technical Highlights

**WebSocket Server:**
- Socket.IO v4.6.1 with automatic fallback to polling
- Custom room management system
- Server-side move validation
- State synchronization on every turn

**BTP Optimization:**
- 256MB memory allocation (doubled for multiplayer)
- Health check endpoint for CF monitoring
- Environment-based configuration
- Automatic cleanup of inactive rooms
- Single-instance deployment (sticky sessions ready for scaling)

**Code Quality:**
- Modular architecture
- Separation of concerns (client/server/shared logic)
- Backward compatible with local mode
- Graceful error handling
- Real-time connection monitoring

## Known Limitations

- Single instance (horizontal scaling requires sticky sessions)
- Maximum 20 concurrent rooms (configurable)
- Room timeout: 5 minutes of inactivity
- Disconnection grace period: 30 seconds
- No persistent storage (rooms exist in memory only)

## Future Enhancements (Optional)

- [ ] Persistent lobbies (Redis integration)
- [ ] Spectator mode
- [ ] In-game chat
- [ ] Replay system
- [ ] Tournament brackets
- [ ] Custom track editor
- [ ] Mobile-optimized UI
- [ ] OAuth/login system
- [ ] Leaderboards across all games
- [ ] Private rooms with passwords

## Metrics & Monitoring

**Health Endpoint:** `GET /health`
```json
{
  "status": "healthy",
  "activeRooms": 5,
  "connectedPlayers": 12,
  "timestamp": "2026-02-20T..."
}
```

**BTP Monitoring:**
```bash
cf logs formulajs --recent  # View logs
cf apps                     # Check status
cf ssh formulajs            # SSH into container (if needed)
```

## Contributing

To add new features:
1. Backend changes → Modify `server.js`, `gameEngine.js`, or `gameRoomManager.js`
2. Client changes → Update `multiplayerClient.js` or `multiplayerIntegration.js`
3. Shared logic → Edit `gameLogic.js`
4. UI changes → Modify `FormulaJS.html` and `FormulaJS.css`

## Documentation

- `MULTIPLAYER_IMPLEMENTATION.md` - Full architecture and implementation details
- `TESTING_GUIDE.md` - Comprehensive testing instructions
- `README.md` - Original game documentation
