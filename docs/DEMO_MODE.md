# Demo Mode - Mock Erg Data for Development

Demo Mode allows you to test the live erg competition feature without needing the Python client or actual Concept2 ergs connected.

## How It Works

Demo Mode runs entirely in the browser and simulates a realistic erg race:

1. **Creates mock erg metrics** - Pace, distance, power, heart rate, stroke rate, calories
2. **Calculates scores** - Uses the same scoring algorithm as the real Python client
3. **Streams via Socket.IO** - Sends data through the same channel as real erg data
4. **Updates every second** - Simulates real-time competition
5. **Auto-stops at 2000m** - Completes after approximately 7-8 minutes

## Usage

### Starting Demo Mode

1. **Create a session**:
   - Go to `/admin/erg/head-to-head`
   - Select two competitors
   - Click "Create Session & Start"

2. **Start demo data**:
   - On the control panel, click **🧪 Start Demo Mode**
   - You'll see "Demo data streaming..." indicator

3. **Watch the race**:
   - Open the public display URL
   - Bar charts will update in real-time
   - Scores increase as "distance" grows

4. **Stop when done**:
   - Click **⏸️ Stop Demo Mode** on control panel
   - Or wait for auto-stop at 2000m

## Demo Data Characteristics

### Competitor 1 (Slightly Faster)
- **Pace**: 105-125 seconds/500m (varies over time)
- **Distance**: ~4.5 meters per second
- **Power**: 250-300 watts
- **Heart Rate**: 160-170 bpm
- **Stroke Rate**: 25-31 spm

### Competitor 2 (Slightly Slower)
- **Pace**: 108-128 seconds/500m
- **Distance**: ~4.3 meters per second
- **Power**: 240-290 watts
- **Heart Rate**: 165-175 bpm
- **Stroke Rate**: 23-29 spm

### Race Duration
- **2000m race** completes in approximately **7-8 minutes**
- Updates every **1 second**
- Competitor 1 typically finishes slightly ahead

## Availability

Demo Mode is **only available in development**:
- ✅ `NODE_ENV=development` - Button visible
- ❌ `NODE_ENV=production` - Button hidden

This ensures demo mode isn't accidentally used in production competitions.

## Technical Details

### Implementation

```typescript
// hooks/useMockErgData.ts
export function useMockErgData(config: MockErgConfig | null) {
  const startMockData = () => {
    // Creates interval that sends data every second
    intervalRef.current = setInterval(() => {
      socket.emit('erg:data', {
        sessionId,
        competitorIndex: 0 or 1,
        metrics: { pace, distance, power, ... },
        calculatedScore
      });
    }, 1000);
  };
}
```

### Data Flow

```
useMockErgData Hook (Browser)
    ↓
Socket.IO Client
    ↓
server.js (Socket.IO Server)
    ↓
Broadcast to session room
    ↓
Public Display (useErgSocket)
    ↓
Bar charts update
```

## Differences from Real Python Client

| Feature | Demo Mode | Python Client |
|---------|-----------|---------------|
| **Location** | Browser | Separate process |
| **Data Source** | Simulated | Real Concept2 ergs |
| **Accuracy** | Random variation | Actual athlete data |
| **Authentication** | None needed | Requires API secret |
| **Session Detection** | Manual start | Auto-detects new sessions |
| **Connection** | Via web socket | Via Socket.IO from Python |

## Use Cases

### ✅ Good For:
- **Development testing** - Test UI without hardware
- **Demos** - Show the feature to stakeholders
- **UI development** - Work on display without ergs
- **Integration testing** - Verify Socket.IO flow
- **Performance testing** - Test with simulated load

### ❌ Not Good For:
- **Production competitions** - Use real Python client
- **Actual scoring** - Not real athlete data
- **Testing accuracy** - Random data, not realistic
- **Hardware debugging** - Can't test erg connections

## Troubleshooting

### Button Not Visible
**Problem**: Demo Mode button doesn't appear

**Solution**: 
- Check `NODE_ENV=development` in your environment
- Restart dev server
- Clear browser cache

### Data Not Updating
**Problem**: Click button but charts don't update

**Solutions**:
- Check Socket.IO is connected (green indicator)
- Open browser console for errors
- Verify session ID matches
- Refresh public display page

### Multiple Demo Sessions
**Problem**: Running demo on multiple sessions

**Note**: Each session has independent demo mode. You can run multiple demos simultaneously.

## Best Practices

1. **Use for development only** - Never in production
2. **Stop before switching to real client** - Avoid mixed data
3. **Test public display** - Verify charts update smoothly
4. **Check performance** - Monitor browser/server load
5. **Verify scoring** - Ensure calculation matches Python client

## Extending Demo Mode

Want to customize the mock data?

Edit `hooks/useMockErgData.ts`:

```typescript
// Change pace range
const comp1Metrics = {
  pace: Math.floor(100 + (elapsed % 10) * 3), // Faster pace
  // ...
};

// Change update frequency
setInterval(() => {
  // Send data
}, 500); // Update every 500ms instead of 1000ms

// Add randomness
const comp1Metrics = {
  pace: Math.floor(105 + Math.random() * 20), // More random
  // ...
};
```

## Production Transition

When ready for production:

1. **Deploy Python client** to separate repo
2. **Remove demo mode** (automatically hidden in production)
3. **Test with real ergs**
4. **Verify scoring accuracy**
5. **Monitor Socket.IO connections**

Demo Mode makes development smooth, but remember to use the real Python client for actual competitions!

## Related Documentation

- `PYTHON_CLIENT.md` - Python client integration
- `QUICK_START_ERG.md` - Quick start guide
- `docs/ERG_LIVE_SETUP.md` - Complete setup guide
- `docs/ERG_TROUBLESHOOTING.md` - Troubleshooting help

