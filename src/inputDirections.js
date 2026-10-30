const directions = new Set(["w", "a", "s", "d"]);
// One finger leaving must not release a direction still held by another finger.
export class HeldDirections {
  constructor() {
    this.pointers = new Map();
    this.keys = new Set();
  }
  press(pointer, key) {
    if (!directions.has(key)) return false;
    this.pointers.set(pointer, key);
    this.sync();
    return true;
  }
  release(pointer) {
    this.pointers.delete(pointer);
    this.sync();
  }
  clear() {
    this.pointers.clear();
    this.keys.clear();
  }
  sync() {
    this.keys.clear();
    for (const key of this.pointers.values()) this.keys.add(key);
  }
}
export function movementKeys(keyboard, touch = []) {
  return new Set([...keyboard, ...touch]);
}
