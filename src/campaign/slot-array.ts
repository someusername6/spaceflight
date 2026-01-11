/**
 * SlotArray - Opaque type for weapon slot arrays that enforces null-safe access.
 *
 * This module provides a type-safe wrapper around (T | null)[] arrays used for
 * weapon slots. The internal array is not directly accessible - all operations
 * must go through the provided helper functions, eliminating null-checking
 * boilerplate throughout the codebase.
 *
 * @example
 * // Creating
 * const slots = createSlotArray<Weapon>([weapon1, null, weapon2]);
 *
 * // Safe access (returns undefined for empty slots)
 * const w = getSlot(slots, 1);  // undefined
 *
 * // Safe iteration (skips empty slots)
 * forEachSlot(slots, (weapon, index) => {
 *   console.log(weapon.type);  // weapon is always defined
 * });
 *
 * // Immutable updates
 * const updated = setSlot(slots, 1, newWeapon);
 */

/** Brand symbol for type safety - prevents treating raw arrays as SlotArrays */
const slotArrayBrand: unique symbol = Symbol('slotArrayBrand');

/**
 * Opaque type representing a fixed-length array of weapon slots.
 * Internal structure is not directly accessible - use helper functions.
 */
export interface SlotArray<T> {
  readonly [slotArrayBrand]: true;
  /** Number of slots (including empty ones) */
  readonly slotCount: number;
  /** @internal Type-level only, never accessed at runtime */
  readonly __type?: T;
  /** @internal Custom JSON serialization for save system */
  toJSON(): (T | null)[];
}

/** Internal storage - maps SlotArray to its underlying data */
const storage = new WeakMap<SlotArray<unknown>, readonly (unknown | null)[]>();

/**
 * Create a SlotArray from a raw array.
 * The input array is copied - mutations won't affect the SlotArray.
 */
export function createSlotArray<T>(slots: (T | null)[]): SlotArray<T> {
  const data = Object.freeze([...slots]);
  const arr: SlotArray<T> = {
    [slotArrayBrand]: true,
    slotCount: slots.length,
    // Custom JSON serialization - returns raw array for save system
    toJSON(): (T | null)[] {
      return [...data];
    },
  };
  storage.set(arr, data);
  return arr;
}

/**
 * Create an empty SlotArray with the specified number of slots.
 */
export function emptySlotArray<T>(count: number): SlotArray<T> {
  return createSlotArray<T>(Array(count).fill(null));
}

/** Get the internal array (private helper) */
function getInternal<T>(arr: SlotArray<T>): readonly (T | null)[] {
  const data = storage.get(arr);
  if (!data) {
    throw new Error('Invalid SlotArray - storage not found');
  }
  return data as readonly (T | null)[];
}

/**
 * Get a weapon from a specific slot.
 * Returns undefined if the slot is empty.
 * @throws RangeError if index is out of bounds
 */
export function getSlot<T>(arr: SlotArray<T>, index: number): T | undefined {
  const slots = getInternal(arr);
  if (index < 0 || index >= slots.length) {
    throw new RangeError(
      `Slot index ${index} out of bounds (0-${slots.length - 1})`,
    );
  }
  return slots[index] ?? undefined;
}

/**
 * Check if a slot contains a weapon.
 * @throws RangeError if index is out of bounds
 */
export function hasWeapon<T>(arr: SlotArray<T>, index: number): boolean {
  return getSlot(arr, index) !== undefined;
}

/**
 * Count the number of occupied (non-empty) slots.
 */
export function countOccupied<T>(arr: SlotArray<T>): number {
  const slots = getInternal(arr);
  return slots.filter((s) => s !== null).length;
}

/**
 * Count the number of empty slots.
 */
export function countEmpty<T>(arr: SlotArray<T>): number {
  return arr.slotCount - countOccupied(arr);
}

/**
 * Set a weapon in a specific slot (immutable - returns new SlotArray).
 * Pass null to clear a slot.
 * @throws RangeError if index is out of bounds
 */
export function setSlot<T>(
  arr: SlotArray<T>,
  index: number,
  value: T | null,
): SlotArray<T> {
  const slots = getInternal(arr);
  if (index < 0 || index >= slots.length) {
    throw new RangeError(
      `Slot index ${index} out of bounds (0-${slots.length - 1})`,
    );
  }
  const newSlots = [...slots];
  newSlots[index] = value;
  return createSlotArray(newSlots);
}

/**
 * Clear a slot (set to null). Immutable - returns new SlotArray.
 */
export function clearSlot<T>(arr: SlotArray<T>, index: number): SlotArray<T> {
  return setSlot(arr, index, null);
}

/**
 * Iterate over occupied slots only. Empty slots are skipped.
 * Callback receives the weapon and its slot index.
 */
export function forEachSlot<T>(
  arr: SlotArray<T>,
  fn: (weapon: T, index: number) => void,
): void {
  const slots = getInternal(arr);
  for (let i = 0; i < slots.length; i++) {
    const slot = slots[i];
    // Use != null to cover both null and undefined (array bounds)
    if (slot != null) {
      fn(slot, i);
    }
  }
}

/**
 * Map over all slots, transforming occupied ones and preserving nulls.
 * The callback is only called for occupied slots.
 */
export function mapSlots<T, R>(
  arr: SlotArray<T>,
  fn: (weapon: T, index: number) => R,
): SlotArray<R> {
  const slots = getInternal(arr);
  const mapped = slots.map((slot, i) => (slot === null ? null : fn(slot, i)));
  return createSlotArray(mapped);
}

/**
 * Get all occupied weapons as an array (loses slot index information).
 */
export function getOccupiedWeapons<T>(arr: SlotArray<T>): T[] {
  const slots = getInternal(arr);
  return slots.filter((s): s is T => s !== null);
}

/**
 * Get occupied weapons with their slot indices.
 */
export function getOccupiedWithIndices<T>(
  arr: SlotArray<T>,
): Array<{ index: number; weapon: T }> {
  const result: Array<{ index: number; weapon: T }> = [];
  forEachSlot(arr, (weapon, index) => {
    result.push({ index, weapon });
  });
  return result;
}

/**
 * Find the first slot matching a predicate.
 * Returns undefined if no match found.
 */
export function findSlot<T>(
  arr: SlotArray<T>,
  predicate: (weapon: T, index: number) => boolean,
): { index: number; weapon: T } | undefined {
  const slots = getInternal(arr);
  for (let i = 0; i < slots.length; i++) {
    const slot = slots[i];
    // Use != null to cover both null and undefined (array bounds)
    if (slot != null && predicate(slot, i)) {
      return { index: i, weapon: slot };
    }
  }
  return undefined;
}

/**
 * Check if any occupied slot matches the predicate.
 */
export function someSlot<T>(
  arr: SlotArray<T>,
  predicate: (weapon: T, index: number) => boolean,
): boolean {
  return findSlot(arr, predicate) !== undefined;
}

/**
 * Check if all occupied slots match the predicate.
 * Returns true for empty arrays.
 */
export function everySlot<T>(
  arr: SlotArray<T>,
  predicate: (weapon: T, index: number) => boolean,
): boolean {
  const slots = getInternal(arr);
  for (let i = 0; i < slots.length; i++) {
    const slot = slots[i];
    // Use != null to cover both null and undefined (array bounds)
    if (slot != null && !predicate(slot, i)) {
      return false;
    }
  }
  return true;
}

// ============ Serialization ============

/**
 * Convert SlotArray to a plain array for JSON serialization.
 * Used by the save system.
 */
export function slotArrayToJSON<T>(arr: SlotArray<T>): (T | null)[] {
  return [...getInternal(arr)];
}

/**
 * Create a SlotArray from JSON data.
 * Used when loading saves.
 */
export function slotArrayFromJSON<T>(slots: (T | null)[]): SlotArray<T> {
  return createSlotArray(slots);
}
