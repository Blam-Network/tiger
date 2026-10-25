import { CFieldType, type c } from "@craftycodie/cstruct";
import {
  k_tag_pointer_size,
  tag_format_error,
} from "../../v52553_16_09_28_1551_evil/tag/tag_block.ts";

// The 01.29 reader's tag layer lacks variants; this is the live build's,
// with the PS4's i64 pointer.

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
    return k_tag_pointer_size;
  }

  read(
    buffer: Buffer,
    offset: number,
    endian: c.Endian
  ): tag_variant_value<T> | undefined {
    const relative = Number(buffer.readBigInt64LE(offset));
    if (relative === 0) {
      return;
    }
    const target = offset + relative;
    const element_class = buffer.readUInt32LE(target - 4);
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
