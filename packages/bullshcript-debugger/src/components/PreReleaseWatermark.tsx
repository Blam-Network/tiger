import { useEffect, useState } from "react";
import { BUILD_INFO } from "../build-info";

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

function timestampText(date: Date): string {
  return `${pad(date.getMonth() + 1)}/${pad(date.getDate())}/${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

// A faint note in the bottom right corner, above the status bar, of every
// build that is not a release: which build it is and the local time, so a
// screenshot says where it came from. It takes no clicks. Ported from
// Datamine Explorer.
export function PreReleaseWatermark() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);
  return (
    <div aria-hidden="true" className="pre-release-watermark">
      <div className="pre-release-watermark-title">PRE-RELEASE BUILD</div>
      <div className="pre-release-watermark-meta">{BUILD_INFO.buildString}</div>
      <div className="pre-release-watermark-meta">{timestampText(now)}</div>
    </div>
  );
}
