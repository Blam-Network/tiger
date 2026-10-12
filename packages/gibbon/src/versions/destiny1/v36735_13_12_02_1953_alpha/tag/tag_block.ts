import { CFieldType, c } from "@craftycodie/cstruct";

export const k_tag_block_marker = 0x80800142;

// A block's header: the count again, the element class, then 8 bytes of
// zero. The elements follow it back to back.
export const k_tag_block_header_size = 16;

export class tag_format_error extends Error {}

type fields = c.StructFields;
type struct_value<F extends fields> = c.StructSchemaToTS<F>;

function read_u32(buffer: Buffer, offset: number, endian: c.Endian): number {
  return endian === "big"
    ? buffer.readUInt32BE(offset)
    : buffer.readUInt32LE(offset);
}

function read_i32(buffer: Buffer, offset: number, endian: c.Endian): number {
  return endian === "big"
    ? buffer.readInt32BE(offset)
    : buffer.readInt32LE(offset);
}

export function read_tag_block_at<F extends fields>(
  buffer: Buffer,
  header: number,
  element: c.Struct<F>,
  element_class?: number,
  endian: c.Endian = "big"
): struct_value<F>[] {
  if (read_u32(buffer, header - 4, endian) !== k_tag_block_marker) {
    throw new tag_format_error(
      `no tag block marker before 0x${header.toString(16)}`
    );
  }
  const actual_class = read_u32(buffer, header + 4, endian);
  if (element_class !== undefined && actual_class !== element_class) {
    throw new tag_format_error(
      `tag block at 0x${header.toString(16)} holds ${actual_class.toString(16)}, not ${element_class.toString(16)}`
    );
  }
  const count = read_u32(buffer, header, endian);
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

// The header offset of the `{u32 count, i32 offset}` tag block field at
// `offset`, or undefined when the count is zero. The offset is relative to
// its own address, and the marker must sit just before the header.
export function tag_block_header(
  buffer: Buffer,
  offset: number,
  endian: c.Endian = "big"
): number | undefined {
  if (read_u32(buffer, offset, endian) === 0) {
    return;
  }
  const header = offset + 4 + read_i32(buffer, offset + 4, endian);
  if (read_u32(buffer, header - 4, endian) !== k_tag_block_marker) {
    throw new tag_format_error(
      `no tag block marker before 0x${header.toString(16)}`
    );
  }
  return header;
}

// A `{u32 count, i32 offset}` field whose elements are structs.
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
    return 8;
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
    const count = read_u32(buffer, offset, endian);
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

// `{i32 offset}` relative to its own address, landing on one struct with
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
    return 4;
  }

  read(
    buffer: Buffer,
    offset: number,
    endian: c.Endian
  ): struct_value<F> | undefined {
    const relative = read_i32(buffer, offset, endian);
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

// Anything c.read can read: a struct, in practice.
interface struct_reader<T = unknown> {
  read(buffer: Buffer, offset?: number, endian?: c.Endian): T;
}

type read_value<R> = R extends struct_reader<infer T> ? T : never;

export interface tag_variant_value<T> {
  class: number;
  value: T;
}

// A tag struct whose type is picked by the class hash before it: one of
// `variants`, else `fallback`. Zero means there is none.
export class c_tag_variant<T> extends CFieldType<
  tag_variant_value<T> | undefined
> {
  readonly variants: Record<number, struct_reader<T>>;
  readonly fallback: struct_reader<T> | undefined;

  constructor(
    variants: Record<number, struct_reader<T>>,
    fallback?: struct_reader<T>
  ) {
    super();
    this.variants = variants;
    this.fallback = fallback;
  }

  getSize(): number {
    return 4;
  }

  read(
    buffer: Buffer,
    offset: number,
    endian: c.Endian
  ): tag_variant_value<T> | undefined {
    const relative = read_i32(buffer, offset, endian);
    if (relative === 0) {
      return;
    }
    const target = offset + relative;
    const element_class = read_u32(buffer, target - 4, endian);
    const element = this.variants[element_class] ?? this.fallback;
    if (element === undefined) {
      throw new tag_format_error(
        `tag variant at 0x${target.toString(16)} has unknown class ${element_class.toString(16)}`
      );
    }
    return {
      class: element_class,
      value: element.read(buffer, target, endian),
    };
  }

  write(): void {
    throw new tag_format_error("tag variants are read-only");
  }
}

export function tag_variant<
  V extends Record<number, struct_reader>,
  D extends struct_reader = V[number],
>(
  variants: V,
  fallback?: D
): c_tag_variant<read_value<V[number]> | read_value<D>> {
  return new c_tag_variant<read_value<V[number]> | read_value<D>>(
    variants as Record<number, struct_reader<read_value<V[number]>>>,
    fallback as struct_reader<read_value<D>> | undefined
  );
}

export interface tag_pointer_value {
  class: number;
  offset: number;
}

// A tag struct pointer left unread: where it lands and the class hash before
// it, for callers that read the target themselves. Zero means there is none.
export class c_tag_pointer extends CFieldType<tag_pointer_value | undefined> {
  getSize(): number {
    return 4;
  }

  read(
    buffer: Buffer,
    offset: number,
    endian: c.Endian
  ): tag_pointer_value | undefined {
    const relative = read_i32(buffer, offset, endian);
    if (relative === 0) {
      return;
    }
    const target = offset + relative;
    return { class: read_u32(buffer, target - 4, endian), offset: target };
  }

  write(): void {
    throw new tag_format_error("tag pointers are read-only");
  }
}

export function tag_pointer(): c_tag_pointer {
  return new c_tag_pointer();
}

// Where a byte block's bytes sit in the tag. A span rather than a Buffer:
// c.infer flattens class instances into plain objects.
export interface tag_span {
  length: number;
  offset: number;
}

export function tag_span_bytes(buffer: Buffer, span: tag_span): Buffer {
  return buffer.subarray(span.offset, span.offset + span.length);
}

// A tag block of raw bytes: its count is a byte length.
export class c_tag_bytes extends CFieldType<tag_span> {
  readonly element_class: number | undefined;

  constructor(element_class?: number) {
    super();
    this.element_class = element_class;
  }

  getSize(): number {
    return 8;
  }

  read(buffer: Buffer, offset: number, endian: c.Endian): tag_span {
    const header = tag_block_header(buffer, offset, endian);
    if (header === undefined) {
      return { offset: 0, length: 0 };
    }
    const actual_class = read_u32(buffer, header + 4, endian);
    if (
      this.element_class !== undefined &&
      actual_class !== this.element_class
    ) {
      throw new tag_format_error(
        `byte block at 0x${header.toString(16)} holds ${actual_class.toString(16)}, not ${this.element_class.toString(16)}`
      );
    }
    return {
      offset: header + k_tag_block_header_size,
      length: read_u32(buffer, offset, endian),
    };
  }

  write(): void {
    throw new tag_format_error("tag blocks are read-only");
  }
}

export function tag_bytes(element_class?: number): c_tag_bytes {
  return new c_tag_bytes(element_class);
}

// Header offsets of every tag block in `buffer` holding `element_class`,
// found by marker rather than through a field that points at them. Some
// blocks (the 8080047B lookup tables' field bindings, for one) are only
// reachable this way.
export function find_tag_blocks(
  buffer: Buffer,
  element_class: number,
  endian: c.Endian = "big"
): number[] {
  const headers: number[] = [];
  for (let at = 4; at + k_tag_block_header_size <= buffer.length; at += 4) {
    if (
      read_u32(buffer, at - 4, endian) === k_tag_block_marker &&
      read_u32(buffer, at + 4, endian) === element_class
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
  return c.read(definition, buffer, offset, "big");
}
