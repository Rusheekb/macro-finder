import { describe, it, expect, vi, beforeEach } from 'vitest';
import { rankItems, type RankResult } from './rank';
import { supabase } from '@/integrations/supabase/client';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    functions: {
      invoke: vi.fn(),
    },
  },
}));

describe('rankItems', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return ranked items sorted by score ascending', async () => {
    const mockData: RankResult[] = [
      {
        rank: 1,
        restaurantId: 'r1',
        restaurantName: 'Restaurant A',
        brandKey: 'brand-a',
        itemId: 'i1',
        itemName: 'Chicken Bowl',
        calories: 500,
        protein: 40,
        price: 8.99,
        score: 1.5,
        lat: 40.7128,
        lng: -74.0060,
        distance: 2.3,
      },
      {
        rank: 2,
        restaurantId: 'r2',
        restaurantName: 'Restaurant B',
        brandKey: 'brand-b',
        itemId: 'i2',
        itemName: 'Protein Salad',
        calories: 400,
        protein: 35,
        price: 10.99,
        score: 2.8,
        lat: 40.7128,
        lng: -74.0060,
        distance: 1.5,
      },
    ];

    vi.mocked(supabase.functions.invoke).mockResolvedValue({
      data: mockData,
      error: null,
    });

    const results = await rankItems({
      mode: 'bulking',
      targetProtein: 30,
      targetCalories: 500,
      wP: 0.5,
      wC: 0.3,
      wR: 0.2,
      radiusKm: 5,
      priceCap: 20,
    });

    expect(results).toHaveLength(2);
    expect(results[0].score).toBeLessThan(results[1].score);
    expect(results[0].itemName).toBe('Chicken Bowl');
  });

  it('should respect minProtein filter', async () => {
    const mockData: RankResult[] = [
      {
        rank: 1,
        restaurantId: 'r1',
        restaurantName: 'Restaurant A',
        brandKey: 'brand-a',
        itemId: 'i1',
        itemName: 'High Protein Meal',
        calories: 500,
        protein: 50,
        price: 12.99,
        score: 1.2,
        lat: 40.7128,
        lng: -74.0060,
      },
    ];

    vi.mocked(supabase.functions.invoke).mockResolvedValue({
      data: mockData,
      error: null,
    });

    const results = await rankItems({
      mode: 'bulking',
      targetProtein: 40,
      targetCalories: 500,
      wP: 0.5,
      wC: 0.3,
      wR: 0.2,
      minProtein: 40,
      radiusKm: 5,
      priceCap: 20,
    });

    expect(supabase.functions.invoke).toHaveBeenCalledWith('rank', {
      body: expect.objectContaining({
        minProtein: 40,
      }),
    });

    // All returned items should have protein >= 40
    results.forEach(result => {
      expect(result.protein).toBeGreaterThanOrEqual(40);
    });
  });

  it('should respect priceCap filter', async () => {
    const mockData: RankResult[] = [
      {
        rank: 1,
        restaurantId: 'r1',
        restaurantName: 'Restaurant A',
        brandKey: 'brand-a',
        itemId: 'i1',
        itemName: 'Budget Meal',
        calories: 400,
        protein: 30,
        price: 7.99,
        score: 1.8,
        lat: 40.7128,
        lng: -74.0060,
      },
    ];

    vi.mocked(supabase.functions.invoke).mockResolvedValue({
      data: mockData,
      error: null,
    });

    const results = await rankItems({
      mode: 'bulking',
      targetProtein: 30,
      targetCalories: 400,
      wP: 0.5,
      wC: 0.3,
      wR: 0.2,
      radiusKm: 5,
      priceCap: 10,
    });

    expect(supabase.functions.invoke).toHaveBeenCalledWith('rank', {
      body: expect.objectContaining({
        priceCap: 10,
      }),
    });

    // All returned items should have price <= 10
    results.forEach(result => {
      expect(result.price).toBeLessThanOrEqual(10);
    });
  });

  it('should include priceUpdatedAt field when available', async () => {
    const mockData: RankResult[] = [
      {
        rank: 1,
        restaurantId: 'r1',
        restaurantName: 'Restaurant A',
        brandKey: 'brand-a',
        itemId: 'i1',
        itemName: 'Item with Updated Price',
        calories: 500,
        protein: 35,
        price: 9.99,
        score: 1.5,
        lat: 40.7128,
        lng: -74.0060,
        priceUpdatedAt: '2025-01-15T10:30:00Z',
      },
    ];

    vi.mocked(supabase.functions.invoke).mockResolvedValue({
      data: mockData,
      error: null,
    });

    const results = await rankItems({
      mode: 'bulking',
      targetProtein: 30,
      targetCalories: 500,
      wP: 0.5,
      wC: 0.3,
      wR: 0.2,
      radiusKm: 5,
      priceCap: 20,
    });

    expect(results[0].priceUpdatedAt).toBe('2025-01-15T10:30:00Z');
  });

  it('should handle errors gracefully', async () => {
    vi.mocked(supabase.functions.invoke).mockResolvedValue({
      data: null,
      error: new Error('Network error'),
    });

    await expect(rankItems({
      mode: 'bulking',
      targetProtein: 30,
      targetCalories: 500,
      wP: 0.5,
      wC: 0.3,
      wR: 0.2,
      radiusKm: 5,
      priceCap: 20,
    })).rejects.toThrow();
  });

  it('should exclude specified brands', async () => {
    const mockData: RankResult[] = [
      {
        rank: 1,
        restaurantId: 'r1',
        restaurantName: 'Restaurant A',
        brandKey: 'brand-c',
        itemId: 'i1',
        itemName: 'Allowed Brand Item',
        calories: 500,
        protein: 40,
        price: 8.99,
        score: 1.5,
        lat: 40.7128,
        lng: -74.0060,
      },
    ];

    vi.mocked(supabase.functions.invoke).mockResolvedValue({
      data: mockData,
      error: null,
    });

    const results = await rankItems({
      mode: 'bulking',
      targetProtein: 30,
      targetCalories: 500,
      wP: 0.5,
      wC: 0.3,
      wR: 0.2,
      excludeBrands: ['brand-a', 'brand-b'],
      radiusKm: 5,
      priceCap: 20,
    });

    expect(supabase.functions.invoke).toHaveBeenCalledWith('rank', {
      body: expect.objectContaining({
        excludeBrands: ['brand-a', 'brand-b'],
      }),
    });

    // Verify excluded brands are not in results
    results.forEach(result => {
      expect(result.brandKey).not.toBe('brand-a');
      expect(result.brandKey).not.toBe('brand-b');
    });
  });
});
