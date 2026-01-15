import { test, expect } from '@playwright/test';

test('User can navigate from Dashboard to Team Detail', async ({ page }) => {
    // 1. Start at Dashboard
    await page.goto('/');
    await expect(page).toHaveTitle(/SKAHL Stats/);

    // Verify Dashboard elements
    await expect(page.getByText('SKAHL ANALYTICS')).toBeVisible();

    // 2. Click "View Teams"
    const viewTeamsButton = page.getByRole('link', { name: /View Teams/i });
    await expect(viewTeamsButton).toBeVisible();
    await viewTeamsButton.click();

    // 3. Verify navigation to /teams
    await expect(page).toHaveURL(/.*\/teams/);
    await expect(page.getByRole('heading', { name: 'Teams' })).toBeVisible();

    // 4. Check for teams presence
    // Note: This relies on data being present. If no teams, we expect "No teams found"
    const teamCards = page.locator('.space-y-8 .grid a');
    const count = await teamCards.count();

    if (count > 0) {
        // Click the first team
        const firstTeamName = await teamCards.first().locator('h3').textContent();
        await teamCards.first().click();

        // 5. Verify navigation to detail page
        await expect(page).toHaveURL(/.*\/teams\/.+/);
        await expect(page.getByRole('heading', { name: firstTeamName || '' })).toBeVisible();

        // Check for roster table
        await expect(page.getByText('Active Roster')).toBeVisible();
    } else {
        // If no data, ensure empty state message
        await expect(page.getByText('No teams found in database.')).toBeVisible();
    }
});
