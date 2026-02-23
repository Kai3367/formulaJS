# Ready Checkbox Functionality

## Purpose

The "Ready" checkbox in the multiplayer lobby serves as a **ready-check system** to ensure all players are prepared before the race starts.

## How It Works

### For Regular Players:
1. **Check the box** when you're ready to start racing
2. **Your status** updates in real-time for all players in the lobby
3. **Visual indicator**: Your name gets a green border when ready

### For the Host:
1. The **"Start Game" button is disabled** until ALL players are ready
2. Button shows: "Waiting for all players to be ready..."
3. When everyone checks ready, button becomes enabled and shows: "Start Game"
4. Only then can the host click it to begin the race

## Visual Feedback

```
Player List Display:
┌─────────────────────────────────────┐
│ Alice (Host) - ✓ Ready     [green]  │
│ Bob - Not Ready            [gray]   │
│ Carol - ✓ Ready            [green]  │
└─────────────────────────────────────┘

Start Button: [Disabled]
"Waiting for all players to be ready..."
```

Once Bob checks ready:
```
Player List Display:
┌─────────────────────────────────────┐
│ Alice (Host) - ✓ Ready     [green]  │
│ Bob - ✓ Ready              [green]  │
│ Carol - ✓ Ready            [green]  │
└─────────────────────────────────────┘

Start Button: [ENABLED] 🟢
"Start Game"
```

## Benefits

1. **Prevents premature starts** - Host can't rush and start before everyone is ready
2. **Clear communication** - Everyone knows who's ready and who's not
3. **Fair start** - All players have confirmed they're prepared
4. **Time to prepare** - Players can:
   - Review the selected track
   - Check their controls
   - Get snacks/drinks
   - Focus their attention

## Technical Implementation

### Client-side:
- Checkbox triggers `toggleReady()` function
- Sends `set_ready` event to server with boolean value
- Receives `player_ready` event when any player's status changes
- Updates UI and button state accordingly

### Server-side:
- Stores ready status in room's player objects
- Broadcasts ready status changes to all players in room
- Ready status is per-room, per-player

### Start Button Logic:
```javascript
// Button is enabled only if:
- multiplayerClient.isHost === true
- multiplayerClient.players.length > 0
- ALL players have ready === true

// Otherwise button is disabled
```

## User Experience Flow

1. **Players join lobby** → All start as "Not Ready"
2. **Players prepare** → Review track, check settings
3. **Players check ready** → One by one, players mark themselves ready
4. **Host waits** → Start button remains disabled
5. **Last player ready** → Start button enables automatically
6. **Host starts** → Race begins for everyone simultaneously

## Edge Cases Handled

- **New player joins**: Start button disables again (new player needs to ready up)
- **Player leaves**: Button state recalculates (may become enabled if all remaining are ready)
- **Host leaves**: New host inherits the start button with same rules
- **Player unchecks ready**: Start button disables immediately

## Why This Matters

In multiplayer racing games, timing is everything. The ready system ensures:
- **No one is caught off guard** when the race starts
- **Fair competition** - everyone starts with equal preparation
- **Better experience** - reduces complaints about "I wasn't ready!"
- **Social coordination** - encourages communication ("Are you ready?")

## Comparison to Other Systems

**Without Ready Check** (bad):
- Host can start anytime → Some players unprepared
- Leads to false starts and restarts
- Frustrating experience

**With Ready Check** (good):
- Explicit confirmation from everyone
- Clear visual feedback
- Forced wait ensures fairness
- Professional esports-style readiness
