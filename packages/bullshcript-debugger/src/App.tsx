import { BottomPanel } from "./components/BottomPanel";
import { EditorPane } from "./components/EditorPane";
import { InspectPanel } from "./components/Inspect";
import { Sidebar } from "./components/Sidebar";
import { StatusBar, Toolbar } from "./components/Toolbar";
import { Overlays, Sized } from "./components/ui";

export function App() {
  return (
    <div className="app">
      <Toolbar />
      <div className="main-row">
        <Sized axis="x" initial={300} side="end" storageKey="bsdbg.left">
          <Sidebar />
        </Sized>
        <div className="center-col">
          <div className="center-top">
            <EditorPane />
          </div>
          <Sized axis="y" initial={240} side="start" storageKey="bsdbg.bottom">
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
