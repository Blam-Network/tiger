export class c_block_cache {
  private readonly blocks = new Map<string, Buffer>();
  private readonly capacity: number;

  constructor(capacity = 32) {
    this.capacity = capacity;
  }

  get(key: string, load: () => Buffer): Buffer {
    const hit = this.blocks.get(key);
    if (hit) {
      // Re-inserting moves it to the back of the Map's order, i.e. most recent.
      this.blocks.delete(key);
      this.blocks.set(key, hit);
      return hit;
    }
    const block = load();
    this.blocks.set(key, block);
    if (this.blocks.size > this.capacity) {
      const oldest = this.blocks.keys().next().value;
      if (oldest !== undefined) {
        this.blocks.delete(oldest);
      }
    }
    return block;
  }
}
