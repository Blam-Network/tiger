// Shared bits: the context menu, the form dialog, toasts, a JSON tree and
// draggable splitters.
import {
  type ReactNode,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { useSession } from "../session";

export interface MenuItem {
  // a small tag after the label ("public")
  badge?: string;
  // the current choice
  checked?: boolean;
  disabled?: boolean;
  // a submenu, opened on hover; with `run` too, clicking the item runs it
  items?: MenuItem[];
  label: string;
  run?: () => void;
  // a rule instead of an item; its label is unused
  separator?: boolean;
}

export interface DialogField {
  hint?: string;
  initial?: string;
  label: string;
  name: string;
}

interface Overlay {
  dialog:
    | {
        fields: DialogField[];
        submit: (values: Record<string, string>) => void;
        title: string;
      }
    | undefined;
  menu: { items: MenuItem[]; x: number; y: number } | undefined;
}

let overlay: Overlay = { dialog: undefined, menu: undefined };
const overlayListeners = new Set<() => void>();
function setOverlay(patch: Partial<Overlay>): void {
  overlay = { ...overlay, ...patch };
  for (const listener of overlayListeners) {
    listener();
  }
}
const subscribeOverlay = (listener: () => void) => {
  overlayListeners.add(listener);
  return () => overlayListeners.delete(listener);
};

export function openMenu(event: { clientX: number; clientY: number }, items: MenuItem[]): void {
  setOverlay({ menu: { items, x: event.clientX, y: event.clientY } });
}

export function openDialog(
  title: string,
  fields: DialogField[],
  submit: (values: Record<string, string>) => void
): void {
  setOverlay({ dialog: { fields, submit, title }, menu: undefined });
}

export function Overlays() {
  const { dialog, menu } = useSyncExternalStore(subscribeOverlay, () => overlay);
  useEffect(() => {
    if (!menu) {
      return;
    }
    const close = () => setOverlay({ menu: undefined });
    window.addEventListener("mousedown", close);
    window.addEventListener("blur", close);
    return () => {
      window.removeEventListener("mousedown", close);
      window.removeEventListener("blur", close);
    };
  }, [menu]);
  return (
    <>
      {menu && (
        <MenuList
          items={menu.items}
          style={{
            left: Math.min(menu.x, window.innerWidth - 220),
            top: Math.max(0, Math.min(menu.y, window.innerHeight - menu.items.length * 24 - 8)),
          }}
        />
      )}
      {dialog && <FormDialog {...dialog} />}
      <Toasts />
    </>
  );
}

// One level of a menu; a hovered item with items opens the next to its right.
// A level with no submenus scrolls when it's taller than the window.
function MenuList({ items, style }: { items: MenuItem[]; style: React.CSSProperties }) {
  const [open, setOpen] = useState<number>();
  const leaf = items.every((item) => !item.items);
  return (
    <div className={leaf ? "menu scroll" : "menu"} onMouseDown={(e) => e.stopPropagation()} style={style}>
      {items.map((item, i) =>
        item.separator ? (
          <div className="menu-separator" key={`${i}-separator`} />
        ) : (
        <div className="menu-entry" key={`${i}-${item.label}`} onMouseEnter={() => setOpen(i)}>
          <button
            className={item.items ? "menu-item parent" : "menu-item"}
            disabled={item.disabled}
            onClick={() => {
              if (item.items && !item.run) {
                setOpen(i);
                return;
              }
              setOverlay({ menu: undefined });
              item.run?.();
            }}
            type="button"
          >
            <span className="menu-check">{item.checked ? "●" : ""}</span>
            <span className="menu-label">{item.label}</span>
            {item.badge && <span className="badge world-public">{item.badge}</span>}
            {item.items && <span className="menu-arrow">▸</span>}
          </button>
          {item.items && open === i && !item.disabled && (
            <MenuList items={item.items} style={{ left: "100%", position: "absolute", top: -4 }} />
          )}
        </div>
        )
      )}
    </div>
  );
}

function FormDialog(props: NonNullable<Overlay["dialog"]>) {
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(props.fields.map((f) => [f.name, f.initial ?? ""]))
  );
  const close = () => setOverlay({ dialog: undefined });
  return (
    <div className="backdrop" onMouseDown={close}>
      <form
        className="dialog"
        onMouseDown={(e) => e.stopPropagation()}
        onSubmit={(e) => {
          e.preventDefault();
          close();
          props.submit(values);
        }}
      >
        <div className="dialog-title">{props.title}</div>
        {props.fields.map((field, i) => (
          <label className="field" key={field.name}>
            <span>{field.label}</span>
            <input
              autoFocus={i === 0}
              onChange={(e) =>
                setValues({ ...values, [field.name]: e.target.value })
              }
              onKeyDown={(e) => e.key === "Escape" && close()}
              placeholder={field.hint}
              value={values[field.name]}
            />
            {field.hint && <small>{field.hint}</small>}
          </label>
        ))}
        <div className="dialog-buttons">
          <button onClick={close} type="button">
            Cancel
          </button>
          <button className="primary" type="submit">
            OK
          </button>
        </div>
      </form>
    </div>
  );
}

function Toasts() {
  const toasts = useSession((s) => s.toasts);
  return (
    <div className="toasts">
      {toasts.map((toast) => (
        <div className={toast.error ? "toast error" : "toast"} key={toast.id}>
          {toast.text}
        </div>
      ))}
    </div>
  );
}

export function JsonTree({
  value,
  name,
  depth = 0,
  open = 1,
}: {
  depth?: number;
  name?: string;
  open?: number;
  value: unknown;
}) {
  const [expanded, setExpanded] = useState(depth < open);
  const label = name !== undefined && <span className="var-name">{name}: </span>;
  if (value === null || typeof value !== "object") {
    return (
      <div className="tree-row" style={{ paddingLeft: depth * 12 + 14 }}>
        {label}
        <span className={`json-${value === null ? "null" : typeof value}`}>
          {value === undefined ? "undefined" : JSON.stringify(value)}
        </span>
      </div>
    );
  }
  const entries = Array.isArray(value)
    ? value.map((v, i) => [String(i), v] as const)
    : Object.entries(value);
  const summary = Array.isArray(value) ? `[${value.length}]` : `{${entries.length}}`;
  return (
    <>
      <div
        className="tree-row clickable"
        onClick={() => setExpanded(!expanded)}
        style={{ paddingLeft: depth * 12 }}
      >
        <span className="twisty">{expanded ? "▾" : "▸"}</span>
        {label}
        <span className="dim">{summary}</span>
      </div>
      {expanded &&
        entries.map(([key, child]) => (
          <JsonTree depth={depth + 1} key={key} name={key} open={open} value={child} />
        ))}
    </>
  );
}

function stored(key: string, fallback: number): number {
  try {
    const n = Number(localStorage.getItem(key));
    return n > 0 ? n : fallback;
  } catch {
    return fallback;
  }
}

// A pane whose size (px, along `axis`) the divider beside it drags. `side`
// says which edge of the pane the divider is on.
export function Sized({
  axis,
  children,
  initial,
  side,
  storageKey,
}: {
  axis: "x" | "y";
  children: ReactNode;
  initial: number;
  side: "end" | "start";
  storageKey: string;
}) {
  const [size, setSize] = useState(() => stored(storageKey, initial));
  const drag = useRef<{ from: number; size: number } | undefined>(undefined);
  const onDown = (e: React.MouseEvent) => {
    e.preventDefault();
    drag.current = { from: axis === "x" ? e.clientX : e.clientY, size };
    const move = (m: MouseEvent) => {
      if (!drag.current) {
        return;
      }
      const delta = (axis === "x" ? m.clientX : m.clientY) - drag.current.from;
      const next = drag.current.size + (side === "end" ? delta : -delta);
      setSize(Math.max(80, Math.min(next, (axis === "x" ? window.innerWidth : window.innerHeight) - 120)));
    };
    const up = () => {
      drag.current = undefined;
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
      document.body.classList.remove("dragging");
    };
    document.body.classList.add("dragging");
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
  };
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, String(size));
    } catch {
      // not kept
    }
  }, [size, storageKey]);
  const divider = <div className={`divider divider-${axis}`} onMouseDown={onDown} />;
  return (
    <>
      {side === "start" && divider}
      <div
        className="sized"
        style={axis === "x" ? { width: size } : { height: size }}
      >
        {children}
      </div>
      {side === "end" && divider}
    </>
  );
}

export function TabBar<T extends string>({
  active,
  onSelect,
  tabs,
  extra,
}: {
  active: T;
  extra?: ReactNode;
  onSelect: (tab: T) => void;
  tabs: readonly T[];
}) {
  return (
    <div className="tabbar">
      {tabs.map((tab) => (
        <button
          className={tab === active ? "tab active" : "tab"}
          key={tab}
          onClick={() => onSelect(tab)}
          type="button"
        >
          {tab}
        </button>
      ))}
      <div className="tabbar-extra">{extra}</div>
    </div>
  );
}
