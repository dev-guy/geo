// These tests assume the Geo service is running locally

const { test } = require('@playwright/test');

test.describe('There are no real tests yet', () => {
  test('I can log in', async ({ browser }) => {
    // Create a fresh browser context and page for complete isolation
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto('http://localhost:4000');
  });
});
