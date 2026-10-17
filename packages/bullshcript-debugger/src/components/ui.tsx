// Shared bits: the context menu, the form dialog, toasts, a JSON tree and
// draggable splitters.
import {
  type KeyboardEvent,
  type ReactNode,
  useEffect,
  useLayoutEffect,
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
  // a section's title (DE's menu headings), not an item
  heading?: boolean;
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
  // `id` is new for each menu opened, so one never inherits another's state
  // `owner` is the menu-bar button it drops from, if any
  menu:
    | {
        id: number;
        items: MenuItem[];
        owner?: HTMLElement;
        x: number;
        y: number;
      }
    | undefined;
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

let menuSerial = 0;

export function openMenu(
  event: { clientX: number; clientY: number },
  items: MenuItem[],
  owner?: HTMLElement
): void {
  menuSerial += 1;
  setOverlay({
    menu: { id: menuSerial, items, owner, x: event.clientX, y: event.clientY },
  });
}

const closeMenu = () => setOverlay({ menu: undefined });

// The menu at the element's bottom left, for opening it from a click or key
// on the element instead of a right-click.
export function openMenuBelow(
  element: HTMLElement,
  items: MenuItem[],
  owner?: HTMLElement
): void {
  const box = element.getBoundingClientRect();
  openMenu({ clientX: box.left, clientY: box.bottom }, items, owner);
}

// A menu-bar button, after Datamine Explorer's File and View menus: a click
// or Down drops `items()` below it, and a click while it is open closes it.
export function MenuButton({
  items,
  label,
}: {
  items: () => MenuItem[];
  label: string;
}) {
  const button = useRef<HTMLButtonElement>(null);
  const open = useSyncExternalStore(
    subscribeOverlay,
    () => overlay.menu !== undefined && overlay.menu.owner === button.current
  );
  // The window's mousedown has closed the menu by the time the click lands.
  const wasOpen = useRef(false);
  const drop = () => {
    if (button.current) {
      openMenuBelow(button.current, items(), button.current);
    }
  };
  return (
    <button
      aria-expanded={open}
      aria-haspopup="menu"
      className={cx("menu-button", open && "open")}
      onClick={() => {
        if (!wasOpen.current) {
          drop();
        }
      }}
      onKeyDown={(e) => {
        if (e.key === "ArrowDown" && !open) {
          e.preventDefault();
          drop();
        }
      }}
      onMouseDown={() => {
        wasOpen.current = open;
      }}
      ref={button}
      type="button"
    >
      {label}
    </button>
  );
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
    window.addEventListener("mousedown", closeMenu);
    window.addEventListener("blur", closeMenu);
    window.addEventListener("resize", closeMenu);
    return () => {
      window.removeEventListener("mousedown", closeMenu);
      window.removeEventListener("blur", closeMenu);
      window.removeEventListener("resize", closeMenu);
    };
  }, [menu]);
  return (
    <>
      {menu && (
        <ContextMenu items={menu.items} key={menu.id} x={menu.x} y={menu.y} />
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
    const label = item.separator
      ? "-"
      : `${item.heading ? "#" : ""}${item.label}`;
    const n = seen.get(label) ?? 0;
    seen.set(label, n + 1);
    return [item, `${label}#${n}`] as const;
  });
}

// The menu at the mouse, after Datamine Explorer's context menu. Focus goes
// back to where it came from when it closes; a layout effect, so a dialog
// the chosen item opens can still take it.
function ContextMenu({
  items,
  x,
  y,
}: {
  items: MenuItem[];
  x: number;
  y: number;
}) {
  useLayoutEffect(() => {
    const from = document.activeElement as HTMLElement | null;
    return () => from?.focus?.();
  }, []);
  return <MenuList at={{ x, y }} focus items={items} onBack={closeMenu} />;
}

const selectable = (item: MenuItem | undefined) =>
  item !== undefined && !(item.separator || item.heading);

// The next selectable entry from `from` in direction `step`, wrapping.
function stepIndex(items: MenuItem[], from: number, step: 1 | -1): number {
  for (let n = 1; n <= items.length; n++) {
    const i =
      (((from + step * n) % items.length) + items.length) % items.length;
    if (selectable(items[i])) {
      return i;
    }
  }
  return from;
}

// One level of a menu: the arrow keys move, Enter or Space chooses, Right
// opens a submenu and Left or Escape leaves it, Tab closes the lot. A
// hovered item with items opens the next level beside it. Every level is
// fixed and kept inside the window: the root at its point, a submenu to its
// item's right, or left when there is no room.
function MenuList({
  at,
  focus,
  items,
  onBack,
}: {
  // the root's point, or the box of the item a submenu hangs off
  at: { x: number; y: number } | DOMRect;
  // take the keyboard on opening (the root, or a submenu opened by key)
  focus: boolean;
  items: MenuItem[];
  // leaves this level: closes the menu at the root, else back to the parent
  onBack: () => void;
}) {
  const list = useRef<HTMLDivElement>(null);
  const rows = useRef<(HTMLButtonElement | null)[]>([]);
  const [active, setActive] = useState(() =>
    focus ? stepIndex(items, -1, 1) : -1
  );
  // the open submenu: its item, and that item's box when it opened
  const [open, setOpen] = useState<{
    at: DOMRect;
    focus: boolean;
    index: number;
  }>();
  const [place, setPlace] = useState({ left: 0, top: 0 });

  useLayoutEffect(() => {
    const element = list.current;
    if (!element) {
      return;
    }
    const width = element.offsetWidth;
    const height = element.offsetHeight;
    let left: number;
    let top: number;
    if (at instanceof DOMRect) {
      left = at.right - 2;
      if (left + width > window.innerWidth - 4) {
        left = at.left - width + 2;
      }
      // the first item lines up with the parent item
      top = at.top - 5;
    } else {
      left = at.x;
      top = at.y;
    }
    setPlace({
      left: Math.max(0, Math.min(left, window.innerWidth - width - 4)),
      top: Math.max(0, Math.min(top, window.innerHeight - height - 4)),
    });
    if (focus) {
      element.focus();
    }
  }, [at, focus]);

  useEffect(() => {
    rows.current[active]?.scrollIntoView({ block: "nearest" });
  }, [active]);

  const submenu = (index: number, withFocus: boolean) => {
    const item = items[index];
    const at = rows.current[index]?.getBoundingClientRect();
    setOpen(
      item?.items && !item.disabled && at
        ? { at, focus: withFocus, index }
        : undefined
    );
  };

  // Close first: the action may open a dialog of its own.
  const choose = (index: number, byKey: boolean) => {
    const item = items[index];
    if (!item || item.separator || item.heading || item.disabled) {
      return;
    }
    if (item.items && !item.run) {
      submenu(index, byKey);
      return;
    }
    closeMenu();
    item.run?.();
  };

  const onKeyDown = (event: KeyboardEvent) => {
    switch (event.key) {
      case "ArrowDown":
        setActive(stepIndex(items, active, 1));
        break;
      case "ArrowUp":
        setActive(stepIndex(items, Math.max(active, 0), -1));
        break;
      case "Home":
        setActive(stepIndex(items, -1, 1));
        break;
      case "End":
        setActive(stepIndex(items, items.length, -1));
        break;
      case "ArrowRight":
        submenu(active, true);
        break;
      case "ArrowLeft":
        if (at instanceof DOMRect) {
          onBack();
        }
        break;
      case "Escape":
        onBack();
        break;
      case "Enter":
      case " ":
        choose(active, true);
        break;
      case "Tab":
        closeMenu();
        return;
      default:
        return;
    }
    event.preventDefault();
    event.stopPropagation();
  };

  const opened = open && items[open.index];
  return (
    <>
      <div
        className="menu"
        onKeyDown={onKeyDown}
        onMouseDown={(e) => e.stopPropagation()}
        ref={list}
        role="menu"
        style={place}
        tabIndex={-1}
      >
        {itemKeys(items).map(([item, key], i) => {
          if (item.separator) {
            return <hr className="menu-sep" key={key} />;
          }
          if (item.heading) {
            return (
              <div className="menu-heading" key={key}>
                {item.label}
              </div>
            );
          }
          return (
            <button
              aria-disabled={item.disabled || undefined}
              aria-expanded={item.items ? open?.index === i : undefined}
              aria-haspopup={item.items ? "menu" : undefined}
              className={cx(
                "bare menu-item",
                i === active && "active",
                item.disabled && "disabled"
              )}
              key={key}
              onClick={() => choose(i, false)}
              onMouseEnter={() => {
                list.current?.focus();
                setActive(i);
                submenu(i, false);
              }}
              ref={(row) => {
                rows.current[i] = row;
              }}
              role="menuitem"
              tabIndex={-1}
              type="button"
            >
              <span className="menu-icon-slot">{item.checked ? "✓" : ""}</span>
              <span className="menu-label">{item.label}</span>
              {item.badge && (
                <span className="badge world-public">{item.badge}</span>
              )}
              {item.items && <span className="menu-arrow">▸</span>}
            </button>
          );
        })}
      </div>
      {open && opened?.items && (
        <MenuList
          at={open.at}
          focus={open.focus}
          items={opened.items}
          key={open.index}
          onBack={() => {
            setOpen(undefined);
            list.current?.focus();
          }}
        />
      )}
    </>
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
