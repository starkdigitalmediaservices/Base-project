import { describe, expect, it } from 'vitest';

import { getPageRange, getPageWindow } from './pagination';

describe('getPageRange', () => {
  it('returns every page when they fit', () => {
    expect(getPageRange(1, 5)).toEqual([1, 2, 3, 4, 5]);
  });

  it('adds ellipses around the current page', () => {
    expect(getPageRange(10, 20)).toEqual([1, 'ellipsis', 9, 10, 11, 'ellipsis', 20]);
    expect(getPageRange(1, 20)).toEqual([1, 2, 3, 4, 5, 'ellipsis', 20]);
    expect(getPageRange(20, 20)).toEqual([1, 'ellipsis', 16, 17, 18, 19, 20]);
  });
});

describe('getPageWindow', () => {
  it('computes the visible row range', () => {
    expect(getPageWindow(2, 10, 45)).toEqual({ from: 11, to: 20 });
    expect(getPageWindow(5, 10, 45)).toEqual({ from: 41, to: 45 });
    expect(getPageWindow(1, 10, 0)).toEqual({ from: 0, to: 0 });
  });
});
