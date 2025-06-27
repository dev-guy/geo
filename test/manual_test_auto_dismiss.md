# Manual Test Instructions for Auto-Dismiss Flash Message

## Issue #47: "no internet" flash message should disappear after 5 seconds

### Test Steps:

1. **Start the Phoenix server** (should already be running according to project rules)
   ```bash
   mix phx.server
   ```

2. **Open the application** in your browser at `http://localhost:4000`

3. **Simulate a network disconnection**:
   - Open browser Developer Tools (F12)
   - Go to the Network tab
   - Click on the "Offline" checkbox or use the network throttling dropdown to select "Offline"
   - Alternatively, you can disconnect your internet connection temporarily

4. **Observe the flash message**:
   - A red flash message should appear with the title "We can't find the internet"
   - The message should show "Attempting to reconnect" with a spinning arrow icon

5. **Wait for auto-dismiss**:
   - The message should remain visible for 5 seconds
   - After 5 seconds, it should start a dissolving animation
   - The animation should last 2 seconds (opacity fades and slight scale reduction)
   - After the animation completes (total 7 seconds), the message should be completely hidden

6. **Verify reconnection behavior**:
   - If you reconnect before the 5 seconds are up, the message should disappear immediately
   - If you disconnect again, the timer should restart from 5 seconds

### Implementation Details:

- **Alert Component** (`lib/geo_web/components/alert.ex`):
  - Added `dissolve_alert/2` function for the 2-second dissolving animation
  - Updated `flash_group` component to include `phx-hook="AutoDismiss"` and `data-dismiss-after="5000"`

- **JavaScript Hook** (`assets/js/app.js`):
  - Created `AutoDismiss` hook that monitors when the element becomes visible
  - Starts a 5-second timer when the flash appears
  - Applies a 2-second CSS transition for the dissolving effect
  - Hides the element completely after the animation

### Expected Behavior:

1. Flash message appears when internet connection is lost
2. Message stays visible for 5 seconds
3. After 5 seconds, message starts fading out with a subtle scale animation
4. Fade animation takes 2 seconds to complete
5. Message is completely hidden after total of 7 seconds