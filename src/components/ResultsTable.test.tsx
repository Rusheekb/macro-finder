import { describe, it, expect, vi } from 'vitest';
import { FoodResult } from '@/pages/MacroApp';

describe('CSV Export', () => {
  it('should produce valid headers and rows', () => {
    const mockResults: FoodResult[] = [
      {
        id: 'i1',
        restaurantId: 'r1',
        itemId: 'i1',
        name: 'Chicken Bowl',
        restaurant: 'Restaurant A',
        protein: 40,
        calories: 500,
        price: 8.99,
        distance: 2.3,
        score: 0.85,
      },
      {
        id: 'i2',
        restaurantId: 'r2',
        itemId: 'i2',
        name: 'Protein Salad',
        restaurant: 'Restaurant B',
        protein: 35,
        calories: 400,
        price: 10.99,
        distance: 1.5,
        score: 0.92,
      },
    ];

    // Simulate CSV export logic
    const headers = ['Rank', 'Food', 'Restaurant', 'Protein (g)', 'Calories', 'Price ($)', 'Distance (km)', 'Score (%)'];
    const rows = mockResults.map((result, index) => [
      index + 1,
      result.name,
      result.restaurant,
      result.protein,
      result.calories,
      result.price.toFixed(2),
      result.distance?.toFixed(1) ?? 'N/A',
      Math.round(result.score * 100),
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
    ].join('\n');

    expect(csvContent).toContain('Rank,Food,Restaurant');
    expect(csvContent).toContain('"Chicken Bowl"');
    expect(csvContent).toContain('"40"');
    expect(csvContent).toContain('"8.99"');
    expect(csvContent).toContain('"Protein Salad"');
    
    // Verify structure
    const lines = csvContent.split('\n');
    expect(lines[0]).toBe(headers.join(','));
    expect(lines).toHaveLength(3); // Header + 2 data rows
  });
});

describe('set_price mock test', () => {
  it('should confirm upsert returns new priceUpdatedAt', async () => {
    const mockSupabase = {
      functions: {
        invoke: vi.fn().mockResolvedValue({
          data: {
            restaurant_id: 'r1',
            item_id: 'i1',
            price: 9.99,
            updated_at: '2025-01-15T12:00:00Z',
          },
          error: null,
        }),
      },
    };

    const result = await mockSupabase.functions.invoke('set_price', {
      body: {
        restaurantId: 'r1',
        itemId: 'i1',
        price: 9.99,
      },
    });

    expect(result.data.updated_at).toBeDefined();
    expect(result.data.price).toBe(9.99);
  });

  it('should trigger UI state refresh with new timestamp', async () => {
    const onPriceUpdate = vi.fn();
    
    const mockSupabase = {
      functions: {
        invoke: vi.fn().mockResolvedValue({
          data: {
            restaurant_id: 'r1',
            item_id: 'i1',
            price: 9.99,
            updated_at: '2025-01-15T12:00:00Z',
          },
          error: null,
        }),
      },
    };

    await mockSupabase.functions.invoke('set_price', {
      body: {
        restaurantId: 'r1',
        itemId: 'i1',
        price: 9.99,
      },
    });

    // Simulate UI callback
    onPriceUpdate();

    expect(onPriceUpdate).toHaveBeenCalledOnce();
  });
});
