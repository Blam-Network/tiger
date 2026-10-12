// The per-activity option arrays a script reads through the
// get_activity_option_* family.
export interface ActivityOptionSet {
  // 808018B1 option data keyed by the option's FNV-1 name hash; a string_hash
  // option's value is itself fnv1 of the string.
  readonly byHash?: Readonly<
    Record<number, boolean | number | readonly number[]>
  >;
  // Integer arrays keyed by the script's field name for the option (action_mock's
  // hand-authored options).
  readonly integerArrays: Readonly<Record<string, readonly number[]>>;
  readonly integers?: Readonly<Record<string, number>>;
  readonly stringHashes?: Readonly<Record<string, string>>;
}
