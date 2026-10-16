import { BottomPanel } from "./components/BottomPanel";
import { EditorPane } from "./components/EditorPane";
import { InspectPanel } from "./components/Inspect";
import { Sidebar } from "./components/Sidebar";
import { StatusBar, Toolbar } from "./components/Toolbar";
import { Overlays, Sized } from "./components/ui";
import { useSession } from "./session";

export function App() {
  // The source pane is only there while a source is open.
  const hasSource = useSession((s) => s.openTabs.length > 0);
  return (
    <div className="app">
      <Toolbar />
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
      <StatusBar />
      <Overlays />
    </div>
  );
}
