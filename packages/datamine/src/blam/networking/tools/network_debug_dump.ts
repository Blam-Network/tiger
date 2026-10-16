import { arch, hostname, platform } from "node:os";
import { csstrnzcpy } from "../../cseries/cseries_strings.ts";
import {
  k_weekday_abbreviations,
  two_digits,
} from "../../cseries/cseries_time.ts";

// The session id lives in a char[128], the system id in a char[160], the machine name in a char[32].
const k_sessionid_length = 128;
const k_system_id_length = 160;
const k_machine_name_length = 32;
const k_unknown_system = "unknown_system";

export interface s_netdebug_system_id_parts {
  arch: string;
  // Replaces the computer name when set, like a faked user name.
  machine?: string;
  os: string;
  vendor: string;
}

// <arch>@<vendor>@<os>@<machine>, e.g. x64@pc@win@<computer name>.
export function netdebug_build_system_id(
  parts: s_netdebug_system_id_parts
): string {
  const machine = csstrnzcpy(parts.machine ?? "", k_machine_name_length);
  if (machine.length === 0) {
    return k_unknown_system;
  }
  return csstrnzcpy(
    `${parts.arch}@${parts.vendor}@${parts.os}@${machine}`,
    k_system_id_length
  );
}

const k_system_id_architectures: Record<string, string> = {
  ia32: "x86",
  x64: "x64",
};

const k_system_id_operating_systems: Record<string, string> = {
  darwin: "mac",
  linux: "linux",
  win32: "win",
};

// Identifier for this machine.
export function netdebug_default_system_id(): string {
  return netdebug_build_system_id({
    arch: k_system_id_architectures[arch()] ?? arch(),
    vendor: "pc",
    os: k_system_id_operating_systems[platform()] ?? platform(),
    machine: hostname(),
  });
}

// Www_MMDDYYYY_HHMMSS[_NNNNNN]@<system id>. The time segment comes from ctime, so it is local
// time. The sequence number is left off when none is given.
export function netdebug_build_sessionid(
  date: Date,
  system_id: string,
  sequence?: number
): string {
  const weekday = k_weekday_abbreviations[date.getDay()];
  const day = `${two_digits(date.getMonth() + 1)}${two_digits(date.getDate())}${String(date.getFullYear()).padStart(4, "0")}`;
  const time = `${two_digits(date.getHours())}${two_digits(date.getMinutes())}${two_digits(date.getSeconds())}`;
  let segment = `${weekday}_${day}_${time}`;
  if (sequence !== undefined) {
    segment += `_${String(sequence).padStart(6, "0")}`;
  }
  return csstrnzcpy(`${segment}@${system_id}`, k_sessionid_length);
}
