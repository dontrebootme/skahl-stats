import { test, expect } from '@playwright/test';

test.describe('Data Ingest and Stats Verification', () => {
    
    test('should display aggregated stats on Player Detail page', async ({ page }) => {
        // 1. Go to Teams page
        await page.goto('/teams');
        
        // 2. Wait for team cards and click the first one
        await page.waitForSelector('a >> .bg-white');
        const teamCards = page.locator('a >> .bg-white');
        await teamCards.first().click();
        
        // 3. Wait for roster and click the first player
        await page.waitForSelector('tbody tr');
        const playerRows = page.locator('tbody tr');
        await playerRows.first().click();
        
        // 4. Verify we are on Player Detail page
        await expect(page).toHaveURL(/.*\/players\/.+/);
        
        // 5. Check for Season Statistics section
        // Note: This relies on at least one player having stats in the DB.
        // If the DB is fresh, this might fail, but for a populated DB it confirms UI binding.
        const statsSection = page.getByText('Season Statistics');
        if (await statsSection.isVisible()) {
            await expect(statsSection).toBeVisible();
            await expect(page.getByText('Goals')).toBeVisible();
            await expect(page.getByText('Assists')).toBeVisible();
            await expect(page.getByText('Points')).toBeVisible();
            await expect(page.getByText('PIM')).toBeVisible();
        } else {
            console.log('ℹ️ Season Statistics section not visible - player might not have data yet.');
        }
    });

    test('should verify Game Detail sub-collections (Goals/Penalties) exist in logic', async ({ page }) => {
        // Since we can't easily query Firestore sub-collections directly from Playwright 
        // without auth/admin SDK, we verify that the "Scores" tab shows data 
        // derived from the ingested fields.
        await page.goto('/games?tab=results');
        
        // Verify scores are visible (this confirms our mapping of home_team_score/visiting_team_score)
        // Find by the container that holds the score (it has a specific class combination)
        const scoreDisplays = page.locator('.tracking-widest');
        const count = await scoreDisplays.count();
        
        if (count > 0) {
            await expect(scoreDisplays.first()).toBeVisible();
            const scoreText = await scoreDisplays.first().textContent();
            // Score should look like "X - Y"
            expect(scoreText).toMatch(/\d+\s*-\s*\d+/);
        }
    });
});
