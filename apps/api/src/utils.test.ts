import { describe, expect, test } from 'bun:test';
import { AtLeastTwice, ConstrainedExactlyTwice, ExactlyTwice } from './utils';

describe('AtLeastTwice', () => {
  test('returns false when there are fewer than two users', () => {
    expect(AtLeastTwice([])).toBe(false);
    expect(AtLeastTwice([{ age: 25 }])).toBe(false);
  });

  test('returns true when one user is at least twice as old as another user', () => {
    expect(AtLeastTwice([{ age: 20 }, { age: 41 }, { age: 30 }])).toBe(true);
  });

  test('returns false when no user is at least twice as old as another user', () => {
    expect(AtLeastTwice([{ age: 20 }, { age: 39 }, { age: 30 }])).toBe(false);
  });
});

describe('ExactlyTwice', () => {
  test('returns false when there are fewer than two users', () => {
    expect(ExactlyTwice([])).toBe(false);
    expect(ExactlyTwice([{ age: 30 }])).toBe(false);
  });

  test('returns true when one user is exactly twice as old as another user', () => {
    expect(ExactlyTwice([{ age: 40 }, { age: 18 }, { age: 20 }])).toBe(true);
  });

  test('returns true regardless of which matching age appears first', () => {
    expect(ExactlyTwice([{ age: 21 }, { age: 42 }])).toBe(true);
    expect(ExactlyTwice([{ age: 42 }, { age: 21 }])).toBe(true);
  });

  test('returns false when no user is exactly twice as old as another user', () => {
    expect(ExactlyTwice([{ age: 19 }, { age: 37 }, { age: 40 }])).toBe(false);
  });
});

describe('ConstrainedExactlyTwice', () => {
  test('returns true when one in-range age is exactly twice another in-range age', () => {
    expect(ConstrainedExactlyTwice([{ age: 80 }, { age: 40 }])).toBe(true);
    expect(ConstrainedExactlyTwice([{ age: 20 }, { age: 40 }])).toBe(true);
  });

  test('returns false when no in-range ages are exactly twice each other', () => {
    expect(ConstrainedExactlyTwice([{ age: 18 }, { age: 35 }, { age: 80 }])).toBe(false);
  });

  test('ignores ages outside the constrained range', () => {
    expect(ConstrainedExactlyTwice([{ age: 17 }, { age: 34 }])).toBe(false);
    expect(ConstrainedExactlyTwice([{ age: 41 }, { age: 82 }])).toBe(false);
  });
});
