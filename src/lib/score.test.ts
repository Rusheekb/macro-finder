import { describe, it, expect } from 'vitest';
import { calculateScore, clamp } from './score';

describe('calculateScore', () => {
  it('should calculate score with no targets provided', () => {
    const score = calculateScore({
      protein: 30,
      calories: 500,
      price: 10,
      targetProtein: null,
      targetCalories: null,
      wP: 0.5,
      wC: 0.3,
      wR: 0.2,
      mode: 'bulking',
    });

    // With no targets, proteinDiff and calorieDiff are 0
    // Score = 0 + 0 + (0.2 * 10) + 0 = 2.0
    expect(score).toBe(2);
  });

  it('should calculate score with only protein target', () => {
    const score = calculateScore({
      protein: 40,
      calories: 600,
      price: 8,
      targetProtein: 30,
      targetCalories: null,
      wP: 0.5,
      wC: 0.3,
      wR: 0.2,
      mode: 'bulking',
    });

    // proteinDiff = |40 - 30| / 30 = 0.3333
    // calorieDiff = 0 (no target)
    // Score = (0.5 * 0.3333) + 0 + (0.2 * 8) + 0 = 0.1667 + 1.6 = 1.7667
    expect(score).toBeCloseTo(1.7667, 3);
  });

  it('should calculate score with both targets and price weighting', () => {
    const score = calculateScore({
      protein: 35,
      calories: 450,
      price: 12,
      targetProtein: 30,
      targetCalories: 500,
      wP: 2.0,
      wC: 0.8,
      wR: 0.2,
      mode: 'bulking',
    });

    // proteinDiff = |35 - 30| / 30 = 0.1667
    // calorieDiff = |450 - 500| / 500 = 0.1
    // Score = (2.0 * 0.1667) + (0.8 * 0.1) + (0.2 * 12) + 0
    // = 0.3334 + 0.08 + 2.4 = 2.8134
    expect(score).toBeCloseTo(2.8134, 3);
  });

  it('should handle extreme values (high price, low protein)', () => {
    const score = calculateScore({
      protein: 5,
      calories: 200,
      price: 25,
      targetProtein: 40,
      targetCalories: 600,
      wP: 2.5,
      wC: 0.3,
      wR: 0.4,
      mode: 'bulking',
    });

    // proteinDiff = |5 - 40| / 40 = 0.875
    // calorieDiff = |200 - 600| / 600 = 0.6667
    // Score = (2.5 * 0.875) + (0.3 * 0.6667) + (0.4 * 25) + 0
    // = 2.1875 + 0.2 + 10 = 12.3875
    expect(score).toBeCloseTo(12.3875, 3);
  });

  it('should apply cutting penalty in cutting mode', () => {
    const bulkingScore = calculateScore({
      protein: 30,
      calories: 800,
      price: 10,
      targetProtein: 30,
      targetCalories: 800,
      wP: 0.5,
      wC: 0.3,
      wR: 0.2,
      mode: 'bulking',
    });

    const cuttingScore = calculateScore({
      protein: 30,
      calories: 800,
      price: 10,
      targetProtein: 30,
      targetCalories: 800,
      wP: 0.5,
      wC: 0.3,
      wR: 0.2,
      mode: 'cutting',
    });

    // Cutting mode adds penalty: 0.15 * (800 / 1000) = 0.12
    expect(cuttingScore).toBeGreaterThan(bulkingScore);
    expect(cuttingScore - bulkingScore).toBeCloseTo(0.12, 2);
  });
});

describe('clamp', () => {
  it('should clamp values within range', () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(-5, 0, 10)).toBe(0);
    expect(clamp(15, 0, 10)).toBe(10);
    expect(clamp(2.5, 0, 5)).toBe(2.5);
  });
});
