// The packed `type << 24 | index` word a row reference carries. The engine
// reads it as {u8 type, pad, i16 index} (sub_8361CCA0), so the index is 16
// bits and signed: -1 is none.
export function row_reference_type(packed: number): number {
  return packed >>> 24;
}

export function row_reference_index(packed: number): number {
  return (packed << 16) >> 16;
}
