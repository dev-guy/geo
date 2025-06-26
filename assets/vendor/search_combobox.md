## Implementation Detail

⏺ The issue is clear: when the header is more than ~6000 pixels
  from its position, it stops rendering properly. This is a
  known limitation with CSS sticky positioning in browsers.

  Let me implement a different approach - we'll use absolute
  positioning for headers when they need to stick and are far
  from their original position: