import { describe, it, expect } from 'vitest';

// A simple function to test
const add = (a: number, b: number) => a + b;

describe('Addition Function', () => {
  it('should add two numbers correctly', () => {
    const result = add(2, 3);
    expect(result).toBe(5);
  });

  it('should return a negative number if adding a negative number', () => {
    const result = add(2, -3);
    expect(result).toBe(-1);
  });
});
