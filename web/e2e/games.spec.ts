import { test, expect } from '@playwright/test';

test.describe('Games Page Navigation and Pagination', () => {
    
    test('should navigate to Schedule via nav bar', async ({ page }) => {
        await page.goto('/');
        const scheduleLink = page.getByRole('link', { name: 'Schedule' });
        await expect(scheduleLink).toBeVisible();
        await scheduleLink.click();
        
        await expect(page).toHaveURL(/.*\/games\?tab=upcoming/);
        await expect(page.getByRole('button', { name: 'Upcoming Schedule' })).toHaveClass(/border-primary/);
    });

    test('should navigate to Scores via nav bar', async ({ page }) => {
        await page.goto('/');
        const scoresLink = page.getByRole('link', { name: 'Scores' });
        await expect(scoresLink).toBeVisible();
        await scoresLink.click();
        
        await expect(page).toHaveURL(/.*\/games\?tab=results/);
        await expect(page.getByRole('button', { name: 'Recent Results' })).toHaveClass(/border-primary/);
    });

    test('should support deep linking to results tab', async ({ page }) => {
        await page.goto('/games?tab=results');
        await expect(page.getByRole('button', { name: 'Recent Results' })).toHaveClass(/border-primary/);
        // Ensure some results are loaded (assuming data exists)
        const cards = page.locator('div.space-y-4 >> .bg-white');
        const count = await cards.count();
        if (count > 0) {
            await expect(cards.first()).toBeVisible();
        }
    });

    test('should load more results when clicking Load More', async ({ page }) => {
        await page.goto('/games?tab=results');
        
        // Wait for initial load
        await page.waitForSelector('div.space-y-4 >> .bg-white');
        const initialCount = await page.locator('div.space-y-4 >> .bg-white').count();
        
        const loadMoreButton = page.getByRole('button', { name: /Load More Results/i });
        
        // Only proceed if Load More is visible (might not be if < 20 items)
        if (await loadMoreButton.isVisible()) {
            await loadMoreButton.click();
            
            // Wait for loading to finish (button becomes enabled again or new items appear)
            await page.waitForFunction((initial) => {
                return document.querySelectorAll('div.space-y-4 > .bg-white').length > initial;
            }, initialCount);
            
            const newCount = await page.locator('div.space-y-4 >> .bg-white').count();
            expect(newCount).toBeGreaterThan(initialCount);
        }
    });

    test('should switch tabs and update URL', async ({ page }) => {
        await page.goto('/games?tab=upcoming');
        
        const resultsTab = page.getByRole('button', { name: 'Recent Results' });
        await resultsTab.click();
        
        await expect(page).toHaveURL(/.*tab=results/);
        await expect(resultsTab).toHaveClass(/border-primary/);
        
        const upcomingTab = page.getByRole('button', { name: 'Upcoming Schedule' });
        await upcomingTab.click();
        
        await expect(page).toHaveURL(/.*tab=upcoming/);
        await expect(upcomingTab).toHaveClass(/border-primary/);
    });
});
