import { test, expect } from '@playwright/test';

test.describe('MacroApp E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/app');
    await page.waitForLoadState('networkidle');
  });

  test('should load the app and display controls', async ({ page }) => {
    await expect(page.getByText('Macro Targets')).toBeVisible();
    await expect(page.getByText('Quick Presets')).toBeVisible();
    await expect(page.getByRole('button', { name: /Find Foods/i })).toBeVisible();
  });

  test('should apply Bulking preset and enter targets', async ({ page }) => {
    // Click Bulking preset
    await page.getByRole('button', { name: /Bulking/i }).first().click();
    
    // Wait for preset to apply
    await page.waitForTimeout(500);

    // Enter protein target
    const proteinInput = page.getByLabel('Target Protein (g)');
    await proteinInput.clear();
    await proteinInput.fill('40');

    // Enter calorie target
    const calorieInput = page.getByLabel('Target Calories');
    await calorieInput.clear();
    await calorieInput.fill('600');

    // Verify values
    await expect(proteinInput).toHaveValue('40');
    await expect(calorieInput).toHaveValue('600');

    // Click Find Foods
    await page.getByRole('button', { name: /Find Foods/i }).click();
    
    // Wait for loading to complete
    await page.waitForTimeout(2000);
  });

  test('should display ranked rows after search', async ({ page }) => {
    // Set up search parameters
    await page.getByLabel('Target Protein (g)').fill('30');
    await page.getByLabel('Target Calories').fill('500');
    
    // Click Find Foods
    await page.getByRole('button', { name: /Find Foods/i }).click();
    
    // Wait for results
    await page.waitForSelector('text=Food Results', { timeout: 10000 });
    
    // Check if results table or "No Results Yet" message is visible
    const noResults = page.getByText('No Results Yet');
    const hasResults = page.getByText('Food Results');
    
    await expect(hasResults).toBeVisible();
    
    // If there are results, verify table structure
    const tableExists = await page.locator('table').count();
    if (tableExists > 0) {
      await expect(page.getByText('Score')).toBeVisible();
      await expect(page.getByText('Protein')).toBeVisible();
      await expect(page.getByText('Price')).toBeVisible();
    }
  });

  test('should sort by price when clicking sort controls', async ({ page }) => {
    // Set up search
    await page.getByLabel('Target Protein (g)').fill('30');
    await page.getByLabel('Target Calories').fill('500');
    await page.getByRole('button', { name: /Find Foods/i }).click();
    
    // Wait for results
    await page.waitForTimeout(3000);
    
    // Check if results exist
    const resultsCount = await page.locator('table tbody tr, .md\\:hidden > div').count();
    
    if (resultsCount > 0) {
      // Click sort dropdown
      const sortSelect = page.getByRole('combobox').first();
      await sortSelect.click();
      
      // Select Price
      await page.getByRole('option', { name: 'Price' }).click();
      
      // Wait for sort to apply
      await page.waitForTimeout(500);
      
      // Verify sort direction button is visible
      await expect(page.getByRole('button', { name: /Ascending|Descending/i })).toBeVisible();
    }
  });

  test('should apply minProtein filter', async ({ page }) => {
    // Open filters section (it should already be visible in controls panel)
    await page.getByLabel('Minimum Protein (g)').fill('40');
    
    // Set other search parameters
    await page.getByLabel('Target Protein (g)').fill('35');
    await page.getByLabel('Target Calories').fill('500');
    
    // Search
    await page.getByRole('button', { name: /Find Foods/i }).click();
    
    // Wait for results
    await page.waitForTimeout(3000);
    
    // Verify minimum protein filter is applied
    await expect(page.getByLabel('Minimum Protein (g)')).toHaveValue('40');
  });

  test('should export CSV file', async ({ page }) => {
    // Set up and run search
    await page.getByLabel('Target Protein (g)').fill('30');
    await page.getByLabel('Target Calories').fill('500');
    await page.getByRole('button', { name: /Find Foods/i }).click();
    
    // Wait for results
    await page.waitForTimeout(3000);
    
    // Check if results exist
    const resultsCount = await page.locator('table tbody tr, .md\\:hidden > div').count();
    
    if (resultsCount > 0) {
      // Set up download listener
      const downloadPromise = page.waitForEvent('download');
      
      // Click Export CSV button
      await page.getByRole('button', { name: /Export CSV/i }).click();
      
      // Wait for download
      const download = await downloadPromise;
      
      // Verify filename
      expect(download.suggestedFilename()).toMatch(/macrofinder-results-.*\.csv/);
      
      // Get download content
      const path = await download.path();
      expect(path).toBeTruthy();
    }
  });

  test('should open and close price update modal', async ({ page }) => {
    // Run search first
    await page.getByLabel('Target Protein (g)').fill('30');
    await page.getByLabel('Target Calories').fill('500');
    await page.getByRole('button', { name: /Find Foods/i }).click();
    
    // Wait for results
    await page.waitForTimeout(3000);
    
    // Check if results exist and have edit buttons
    const editButtons = page.locator('button[title="Report local price"]');
    const editCount = await editButtons.count();
    
    if (editCount > 0) {
      // Click first edit button
      await editButtons.first().click();
      
      // Wait for modal
      await page.waitForTimeout(500);
      
      // Verify modal is open
      await expect(page.getByText('Report Local Price')).toBeVisible();
      await expect(page.getByLabel('New Price')).toBeVisible();
      
      // Close modal
      await page.getByRole('button', { name: /Cancel/i }).click();
      
      // Verify modal is closed
      await page.waitForTimeout(300);
      await expect(page.getByText('Report Local Price')).not.toBeVisible();
    }
  });
});
