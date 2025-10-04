# Test Setup Instructions

This project now includes automated tests with Vitest (unit tests) and Playwright (e2e tests).

## Required Package.json Scripts

Add the following scripts to your `package.json`:

```json
{
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui"
  }
}
```

## Running Tests

### Unit Tests (Vitest)
```bash
npm run test           # Run tests in watch mode
npm run test:ui        # Run tests with UI
```

### End-to-End Tests (Playwright)
```bash
npm run test:e2e       # Run e2e tests
npm run test:e2e:ui    # Run e2e tests with UI
```

### Install Playwright Browsers (First Time Only)
```bash
npx playwright install
```

## Test Coverage

### Unit Tests
- **src/lib/score.test.ts**: Tests for ranking score calculation
  - No targets provided
  - Only protein target
  - Both targets + price weighting
  - Extreme values (high price, low protein)
  - Cutting mode penalty

- **src/api/rank.test.ts**: Tests for rank API
  - Correct sort order (by score ASC)
  - Respects minProtein filter
  - Respects priceCap filter
  - Includes priceUpdatedAt field
  - Handles excludeBrands filter

- **src/components/ResultsTable.test.tsx**: Tests for CSV export and price updates
  - CSV export produces valid headers and rows
  - set_price upsert returns new priceUpdatedAt
  - UI state refreshes with new timestamp

### End-to-End Tests
- **e2e/macro-app.spec.ts**: Full user flow tests
  - Load app and display controls
  - Apply Bulking preset and enter targets
  - Display ranked rows after search
  - Sort by price using sort controls
  - Apply minProtein filter
  - Export CSV file
  - Open and close price update modal

## Test Files Structure

```
├── vitest.config.ts          # Vitest configuration
├── playwright.config.ts       # Playwright configuration
├── src/
│   ├── test/
│   │   └── setup.ts          # Test setup utilities
│   ├── lib/
│   │   ├── score.ts          # Pure scoring function
│   │   └── score.test.ts     # Score tests
│   ├── api/
│   │   └── rank.test.ts      # Rank API tests
│   └── components/
│       └── ResultsTable.test.tsx  # CSV & price update tests
└── e2e/
    └── macro-app.spec.ts     # E2E tests
```

## Notes

- All unit tests use mocked Supabase client
- E2E tests run against local dev server (localhost:5173)
- Existing features (Report Local Price modal, filters, sorting) remain intact
- Tests verify both UI behavior and data integrity
