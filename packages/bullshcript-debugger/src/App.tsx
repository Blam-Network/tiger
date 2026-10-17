import { useState } from "react";
import { BUILD_INFO } from "./build-info";
import { AboutDialog } from "./components/AboutDialog";
import { BottomPanel } from "./components/BottomPanel";
import { EditorPane } from "./components/EditorPane";
import { InspectPanel } from "./components/Inspect";
import { PreReleaseWatermark } from "./components/PreReleaseWatermark";
import { Sidebar } from "./components/Sidebar";
import { StatusBar, Toolbar } from "./components/Toolbar";
import { UpdateDialog } from "./components/UpdateDialog";
import { Overlays, Sized } from "./components/ui";
import { DESKTOP_BUILD, IN_TAURI } from "./desktop";
import { useSession } from "./session";
import { useUpdateCheck } from "./update-hook";

export function App() {
  // The source pane is only there while a source is open.
  const hasSource = useSession((s) => s.openTabs.length > 0);
  const [aboutOpen, setAboutOpen] = useState(false);
  const update = useUpdateCheck();
  const about = () => setAboutOpen(true);
  return (
    <div className="app">
      <Toolbar onAbout={about} />
      <div className="main-row">
        <Sized axis="x" initial={300} side="end" storageKey="bsdbg.left">
          <Sidebar />
        </Sized>
        <div className="center-col">
          {hasSource && (
            <div className="center-top">
              <EditorPane />
            </div>
          )}
          <Sized
            axis="y"
            fill={!hasSource}
            initial={240}
            side="start"
            storageKey="bsdbg.bottom"
          >
            <BottomPanel />
          </Sized>
        </div>
        <Sized axis="x" initial={320} side="start" storageKey="bsdbg.right">
          <InspectPanel />
        </Sized>
      </div>
      <StatusBar onAbout={about} />
      <Overlays />
      {BUILD_INFO.showWatermark && <PreReleaseWatermark />}
      {aboutOpen && (
        <AboutDialog
          onCheckUpdates={
            DESKTOP_BUILD && IN_TAURI
              ? async () => {
                  const outcome = await update.checkNow();
                  if (outcome.kind === "available") {
                    setAboutOpen(false);
                  }
                  return outcome;
                }
              : undefined
          }
          onClose={() => setAboutOpen(false)}
        />
      )}
      {DESKTOP_BUILD && update.release && (
        <UpdateDialog
          onDownload={update.download}
          onLater={update.later}
          onSkip={update.skip}
          release={update.release}
        />
      )}
    </div>
  );
}
