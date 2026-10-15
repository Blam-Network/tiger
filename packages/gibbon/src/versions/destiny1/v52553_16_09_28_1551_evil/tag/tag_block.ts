import { CFieldType, c } from "@craftycodie/cstruct";

// The live 360 build's marker: this build's type table keeps the live
// build's class hashes.
export const k_tag_block_marker = 0x80800184;

// A block's header: the count again (u64), the element class, then 4 bytes
// of zero. The elements follow it back to back.
export const k_tag_block_header_size = 16;

// The PS4's tags are 64-bit: a block field is {u64 count, i64 offset}, and
// a struct or string pointer an i64, each relative to its own address.
export const k_tag_block_field_size = 16;
export const k_tag_pointer_size = 8;

export class tag_format_error extends Error {}

type fields = c.StructFields;
type struct_value<F extends fields> = c.StructSchemaToTS<F>;

function read_u32(buffer: Buffer, offset: number, endian: c.Endian): number {
  return endian === "big"
    ? buffer.readUInt32BE(offset)
    : buffer.readUInt32LE(offset);
}

// Counts and offsets stay well inside a tag, so a Number holds them.
function read_i64(buffer: Buffer, offset: number, endian: c.Endian): number {
  return Number(
    endian === "big"
      ? buffer.readBigInt64BE(offset)
      : buffer.readBigInt64LE(offset)
  );
}

export function read_tag_block_at<F extends fields>(
  buffer: Buffer,
  header: number,
  element: c.Struct<F>,
  element_class?: number,
  endian: c.Endian = "little"
): struct_value<F>[] {
  if (read_u32(buffer, header - 4, endian) !== k_tag_block_marker) {
    throw new tag_format_error(
      `no tag block marker before 0x${header.toString(16)}`
    );
  }
  const actual_class = read_u32(buffer, header + 8, endian);
  if (element_class !== undefined && actual_class !== element_class) {
    throw new tag_format_error(
      `tag block at 0x${header.toString(16)} holds ${actual_class.toString(16)}, not ${element_class.toString(16)}`
    );
  }
  const count = read_i64(buffer, header, endian);
  const stride = c.sizeof(element);
  const elements: struct_value<F>[] = [];
  for (let i = 0; i < count; i++) {
    elements.push(
      c.read(
        element,
        buffer,
        header + k_tag_block_header_size + i * stride,
        endian
      )
    );
  }
  return elements;
}

// The header offset of the `{u64 count, i64 offset}` tag block field at
// `offset`, or undefined when the count is zero. The offset is relative to
// its own address, and the marker must sit just before the header.
export function tag_block_header(
  buffer: Buffer,
  offset: number,
  endian: c.Endian = "little"
): number | undefined {
  if (read_i64(buffer, offset, endian) === 0) {
    return;
  }
  const header = offset + 8 + read_i64(buffer, offset + 8, endian);
  if (read_u32(buffer, header - 4, endian) !== k_tag_block_marker) {
    throw new tag_format_error(
      `no tag block marker before 0x${header.toString(16)}`
    );
  }
  return header;
}

// A `{u64 count, i64 offset}` field whose elements are structs.
export class c_tag_block<
  F extends fields,
  const O extends c.FieldOptions = Record<string, never>,
> extends CFieldType<struct_value<F>[], O> {
  readonly element: c.Struct<F>;
  readonly element_class: number | undefined;

  constructor(element: c.Struct<F>, element_class?: number, options?: O) {
    super(options);
    this.element = element;
    this.element_class = element_class;
  }

  getSize(): number {
    return k_tag_block_field_size;
  }

  read(buffer: Buffer, offset: number, endian: c.Endian): struct_value<F>[] {
    const header = tag_block_header(buffer, offset, endian);
    if (header === undefined) {
      return [];
    }
    const elements = read_tag_block_at(
      buffer,
      header,
      this.element,
      this.element_class,
      endian
    );
    const count = read_i64(buffer, offset, endian);
    if (elements.length !== count) {
      throw new tag_format_error(
        `tag block at 0x${offset.toString(16)} says ${count} elements, its header ${elements.length}`
      );
    }
    return elements;
  }

  write(): void {
    throw new tag_format_error("tag blocks are read-only");
  }
}

export function tag_block<
  F extends fields,
  const O extends c.FieldOptions = Record<string, never>,
>(
  element: c.Struct<F>,
  element_class?: number,
  options?: O
): c_tag_block<F, O> {
  return new c_tag_block(element, element_class, options);
}

// `{i64 offset}` relative to its own address, landing on one struct with
// its class hash just before it. Zero means there is none.
export class c_tag_struct<F extends fields> extends CFieldType<
  struct_value<F> | undefined
> {
  readonly element: c.Struct<F>;
  readonly element_class: number | undefined;

  constructor(element: c.Struct<F>, element_class?: number) {
    super();
    this.element = element;
    this.element_class = element_class;
  }

  getSize(): number {
    return k_tag_pointer_size;
  }

  read(
    buffer: Buffer,
    offset: number,
    endian: c.Endian
  ): struct_value<F> | undefined {
    const relative = read_i64(buffer, offset, endian);
    if (relative === 0) {
      return;
    }
    const target = offset + relative;
    const actual_class = read_u32(buffer, target - 4, endian);
    if (
      this.element_class !== undefined &&
      actual_class !== this.element_class
    ) {
      throw new tag_format_error(
        `tag struct at 0x${target.toString(16)} is ${actual_class.toString(16)}, not ${this.element_class.toString(16)}`
      );
    }
    return c.read(this.element, buffer, target, endian);
  }

  write(): void {
    throw new tag_format_error("tag structs are read-only");
  }
}

export function tag_struct<F extends fields>(
  element: c.Struct<F>,
  element_class?: number
): c_tag_struct<F> {
  return new c_tag_struct(element, element_class);
}

// Header offsets of every tag block in `buffer` holding `element_class`,
// found by marker rather than through a field that points at them.
export function find_tag_blocks(
  buffer: Buffer,
  element_class: number,
  endian: c.Endian = "little"
): number[] {
  const headers: number[] = [];
  for (let at = 4; at + k_tag_block_header_size <= buffer.length; at += 4) {
    if (
      read_u32(buffer, at - 4, endian) === k_tag_block_marker &&
      read_u32(buffer, at + 8, endian) === element_class
    ) {
      headers.push(at);
    }
  }
  return headers;
}

// A whole tag, or a struct at a known offset in one.
export function read_definition<F extends fields>(
  buffer: Buffer,
  definition: c.Struct<F>,
  offset = 0
): struct_value<F> {
  return c.read(definition, buffer, offset, "little");
}
