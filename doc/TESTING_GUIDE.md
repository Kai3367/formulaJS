# Formula JS Multiplayer - Testing Guide

## Installation & Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Start Local Server
```bash
npm start
```

The server will start on `http://localhost:8080`

## Testing Multiplayer Locally

### Test Scenario 1: Create and Join Room

1. **Player 1 (Host)**:
   - Open `http://localhost:8080` in browser window 1
   - Click "Start new race" (or refresh to see mode selection)
   - Select "Online Multiplayer"
   - Click "Create a new room" (OK on confirmation dialog)
   - Enter your name (e.g., "Alice")
   - Click "Create Room"
   - Copy the 6-character room code displayed

2. **Player 2 (Guest)**:
   - Open `http://localhost:8080` in browser window 2 (or incognito)
   - Click "Start new race"
   - Select "Online Multiplayer"
   - Click "Join existing room" (Cancel on confirmation dialog)
   - Enter your name (e.g., "Bob")
   - Enter the room code from Player 1
   - Click "Join Room"

3. **Both players should now see the lobby** with both names listed

### Test Scenario 2: Ready Up and Start Game

1. Both players check the "Ready" checkbox in the lobby
2. Host (Player 1) should see a "Start Game" button appear
3. Host selects a track from the dropdown
4. Host clicks "Start Game"
5. Both players should see the race track and game start

### Test Scenario 3: Take Turns

1. The first player's turn will be indicated at the top
2. Only the active player should be able to click direction buttons (1-9)
3. After clicking a direction, the move should be visible to both players
4. Turn automatically switches to the next player
5. Continue until race finishes

### Test Scenario 4: Disconnection

1. One player closes their browser tab mid-game
2. Other player should see a "Player Disconnected" overlay
3. Wait 30 seconds (or reconnect within this time)
4. Game should handle the disconnection gracefully

### Test Scenario 5: Leave Room

1. In the lobby, click "Leave Room"
2. Confirm the action
3. Player should return to mode selection
4. Other players in the room should be notified

## Testing on BTP Cloud Foundry

### Deploy to BTP
```bash
# Login to CF
cf login -a <your-api-endpoint>

# Deploy
cf push

# Get app URL
cf apps
```

### Test with Multiple Devices

1. Open the BTP app URL on multiple devices (phone, tablet, computer)
2. Create room on one device
3. Join from other devices using room code
4. Play a full game
5. Verify all moves synchronize correctly

## Expected Behavior

### Success Criteria

- [ ] Room codes are unique and 6 characters
- [ ] Multiple players can join the same room
- [ ] Players see each other in the lobby
- [ ] Ready status updates in real-time
- [ ] Only host can start the game
- [ ] Game starts simultaneously for all players
- [ ] Moves synchronize across all clients within 1 second
- [ ] Only the active player can make moves
- [ ] Turn indicator updates correctly
- [ ] Game finishes when all players complete/crash
- [ ] Disconnection is handled with grace period
- [ ] Host migration works if host leaves

### Known Limitations

- Single BTP instance (no horizontal scaling yet)
- Maximum 20 concurrent rooms
- 30-second disconnection grace period
- Room timeout after 5 minutes of inactivity

## Debugging

### Browser Console

Open browser developer tools (F12) and check console for:
- Connection status messages
- Room events (created, joined, etc.)
- Game state updates
- Error messages

### Server Logs

If running locally:
```bash
# Server logs will show in the terminal
# Look for:
# - Player connected/disconnected
# - Room created/joined
# - Game started
# - Move processed
```

On BTP:
```bash
cf logs formulajs --recent
```

### Health Check

Visit `/health` endpoint to see server status:
```
http://localhost:8080/health
```

Returns:
```json
{
  "status": "healthy",
  "activeRooms": 2,
  "connectedPlayers": 5,
  "timestamp": "2026-02-20T..."
}
```

## Troubleshooting

### Problem: Can't connect to multiplayer
**Solution**: Check browser console for errors. Verify Socket.IO script is loaded.

### Problem: Room code not working
**Solution**: Ensure room code is uppercase and exactly 6 characters. Room may have expired (5 min timeout).

### Problem: Moves not synchronizing
**Solution**: Check network connection. Verify both players are in the same room. Check server logs.

### Problem: Game doesn't start
**Solution**: Ensure at least one player is ready. Only host can start. Track must be selected.

### Problem: Buttons disabled
**Solution**: Verify it's your turn. Check connection status indicator in top-right.

## Performance Testing

### Load Test (Optional)

Test with multiple concurrent games:
1. Open 8-12 browser tabs/windows
2. Create 2-3 rooms with 3-4 players each
3. Play simultaneously
4. Monitor memory usage at `/health`

Expected: Server should handle 20 rooms (80 players) comfortably with 256MB memory.

## Next Steps After Testing

1. Fix any bugs found during testing
2. Add more tracks for variety
3. Consider adding features:
   - Chat functionality
   - Spectator mode
   - Replay system
   - Tournament brackets
   - Custom track editor

## Support

For issues or questions:
- Check `MULTIPLAYER_IMPLEMENTATION.md` for architecture details
- Review server logs for errors
- Test in local environment first before BTP
- Ensure all browsers are modern (Chrome, Firefox, Edge)
