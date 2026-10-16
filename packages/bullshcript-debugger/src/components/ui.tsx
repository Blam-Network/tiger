// Shared bits: the context menu, the form dialog, toasts, a JSON tree and
// draggable splitters.
import {
  type KeyboardEvent,
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

// A class list from the names that are set. (Template literals with a
// conditional class inside lose their space to the class sorter.)
export const cx = (...names: (string | false | undefined)[]) =>
  names.filter(Boolean).join(" ");

// For a row with role, tabIndex and onClick: Enter or Space on the focused
// row does what a click does. (Not a key meant for a button or input in it.)
export function activateOnKey(activate: () => void) {
  return (e: KeyboardEvent) => {
    if (e.target === e.currentTarget && (e.key === "Enter" || e.key === " ")) {
      e.preventDefault();
      activate();
    }
  };
}

export function openMenu(
  event: { clientX: number; clientY: number },
  items: MenuItem[]
): void {
  setOverlay({ menu: { items, x: event.clientX, y: event.clientY } });
}

// The menu at the element's bottom left, for opening it from a click or key
// on the element instead of a right-click.
export function openMenuBelow(element: HTMLElement, items: MenuItem[]): void {
  const box = element.getBoundingClientRect();
  openMenu({ clientX: box.left, clientY: box.bottom }, items);
}

export function openDialog(
  title: string,
  fields: DialogField[],
  submit: (values: Record<string, string>) => void
): void {
  setOverlay({ dialog: { fields, submit, title }, menu: undefined });
}

export function Overlays() {
  const { dialog, menu } = useSyncExternalStore(
    subscribeOverlay,
    () => overlay
  );
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
            top: Math.max(
              0,
              Math.min(menu.y, window.innerHeight - menu.items.length * 24 - 8)
            ),
          }}
        />
      )}
      {dialog && <FormDialog {...dialog} />}
      <Toasts />
    </>
  );
}

// Keys for a level's entries from their labels, the nth repeat of a label
// getting its own.
function itemKeys(items: MenuItem[]): (readonly [MenuItem, string])[] {
  const seen = new Map<string, number>();
  return items.map((item) => {
    const label = item.separator ? "-" : item.label;
    const n = seen.get(label) ?? 0;
    seen.set(label, n + 1);
    return [item, `${label}#${n}`] as const;
  });
}

// One level of a menu; a hovered item with items opens the next to its right.
// A level with no submenus scrolls when it's taller than the window.
function MenuList({
  items,
  style,
}: {
  items: MenuItem[];
  style: React.CSSProperties;
}) {
  const [open, setOpen] = useState<number>();
  const leaf = items.every((item) => !item.items);
  return (
    <div
      className={leaf ? "menu scroll" : "menu"}
      onMouseDown={(e) => e.stopPropagation()}
      role="menu"
      style={style}
    >
      {itemKeys(items).map(([item, key], i) =>
        item.separator ? (
          <div className="menu-separator" key={key} />
        ) : (
          <div className="menu-entry" key={key}>
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
              onFocus={() => setOpen(i)}
              onMouseEnter={() => setOpen(i)}
              role="menuitem"
              type="button"
            >
              <span className="menu-check">{item.checked ? "●" : ""}</span>
              <span className="menu-label">{item.label}</span>
              {item.badge && (
                <span className="badge world-public">{item.badge}</span>
              )}
              {item.items && <span className="menu-arrow">▸</span>}
            </button>
            {item.items && open === i && !item.disabled && (
              <MenuList
                items={item.items}
                style={{ left: "100%", position: "absolute", top: -4 }}
              />
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
    <div
      className="backdrop"
      onMouseDown={(e) => e.target === e.currentTarget && close()}
      role="none"
    >
      <form
        aria-label={props.title}
        aria-modal="true"
        className="dialog"
        onSubmit={(e) => {
          e.preventDefault();
          close();
          props.submit(values);
        }}
        role="dialog"
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
  const label = name !== undefined && (
    <span className="var-name">{name}: </span>
  );
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
  const summary = Array.isArray(value)
    ? `[${value.length}]`
    : `{${entries.length}}`;
  return (
    <>
      <div
        aria-expanded={expanded}
        className="tree-row clickable"
        onClick={() => setExpanded(!expanded)}
        onKeyDown={activateOnKey(() => setExpanded(!expanded))}
        role="treeitem"
        style={{ paddingLeft: depth * 12 }}
        tabIndex={0}
      >
        <span className="twisty">{expanded ? "▾" : "▸"}</span>
        {label}
        <span className="dim">{summary}</span>
      </div>
      {expanded &&
        entries.map(([key, child]) => (
          <JsonTree
            depth={depth + 1}
            key={key}
            name={key}
            open={open}
            value={child}
          />
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

const DIVIDER_STEP = 16;
const DIVIDER_KEYS: Record<"x" | "y", Record<string, number>> = {
  x: { ArrowLeft: -DIVIDER_STEP, ArrowRight: DIVIDER_STEP },
  y: { ArrowDown: DIVIDER_STEP, ArrowUp: -DIVIDER_STEP },
};

// A pane whose size (px, along `axis`) the divider beside it drags. `side`
// says which edge of the pane the divider is on. `fill` takes the whole
// space instead (no divider), for when the pane it shared with is gone.
export function Sized({
  axis,
  children,
  fill,
  initial,
  side,
  storageKey,
}: {
  axis: "x" | "y";
  children: ReactNode;
  fill?: boolean;
  initial: number;
  side: "end" | "start";
  storageKey: string;
}) {
  const [size, setSize] = useState(() => stored(storageKey, initial));
  const drag = useRef<{ from: number; size: number } | undefined>(undefined);
  const max = () =>
    (axis === "x" ? window.innerWidth : window.innerHeight) - 120;
  const resize = (from: number, delta: number) =>
    setSize(
      Math.max(80, Math.min(from + (side === "end" ? delta : -delta), max()))
    );
  const onDown = (e: React.MouseEvent) => {
    e.preventDefault();
    drag.current = { from: axis === "x" ? e.clientX : e.clientY, size };
    const move = (m: MouseEvent) => {
      if (!drag.current) {
        return;
      }
      const delta = (axis === "x" ? m.clientX : m.clientY) - drag.current.from;
      resize(drag.current.size, delta);
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
  // Arrow keys move the divider like a drag would.
  const onKey = (e: React.KeyboardEvent) => {
    const delta = DIVIDER_KEYS[axis][e.key];
    if (delta !== undefined) {
      e.preventDefault();
      resize(size, delta);
    }
  };
  const divider = (
    <div
      aria-orientation={axis === "x" ? "vertical" : "horizontal"}
      aria-valuemax={max()}
      aria-valuemin={80}
      aria-valuenow={size}
      className={`divider divider-${axis}`}
      onKeyDown={onKey}
      onMouseDown={onDown}
      role="slider"
      tabIndex={0}
    />
  );
  const sized = axis === "x" ? { width: size } : { height: size };
  return (
    <>
      {side === "start" && !fill && divider}
      <div
        className={fill ? "sized fill" : "sized"}
        style={fill ? undefined : sized}
      >
        {children}
      </div>
      {side === "end" && !fill && divider}
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
