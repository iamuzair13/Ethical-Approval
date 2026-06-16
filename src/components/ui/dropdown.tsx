"use client";

import { useClickOutside } from "@/hooks/use-click-outside";
import { cn } from "@/lib/utils";
import { SetStateActionType } from "@/types/set-state-action-type";
import {
  createContext,
  type CSSProperties,
  type PropsWithChildren,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";

type DropdownContextType = {
  isOpen: boolean;
  handleOpen: () => void;
  handleClose: () => void;
  containerRef: React.RefObject<HTMLDivElement | null>;
};

const DropdownContext = createContext<DropdownContextType | null>(null);

function useDropdownContext() {
  const context = useContext(DropdownContext);
  if (!context) {
    throw new Error("useDropdownContext must be used within a Dropdown");
  }
  return context;
}

type DropdownProps = {
  children: React.ReactNode;
  isOpen: boolean;
  setIsOpen: SetStateActionType<boolean>;
};

export function Dropdown({ children, isOpen, setIsOpen }: DropdownProps) {
  const triggerRef = useRef<HTMLElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "Escape") {
      handleClose();
    }
  };

  useEffect(() => {
    if (isOpen) {
      triggerRef.current = document.activeElement as HTMLElement;

      document.body.style.pointerEvents = "none";
    } else {
      document.body.style.removeProperty("pointer-events");

      setTimeout(() => {
        triggerRef.current?.focus();
      }, 0);
    }
  }, [isOpen]);

  function handleClose() {
    setIsOpen(false);
  }

  function handleOpen() {
    setIsOpen(true);
  }

  return (
    <DropdownContext.Provider
      value={{ isOpen, handleOpen, handleClose, containerRef }}
    >
      <div ref={containerRef} className="relative" onKeyDown={handleKeyDown}>
        {children}
      </div>
    </DropdownContext.Provider>
  );
}

type DropdownContentProps = {
  align?: "start" | "end" | "center";
  className?: string;
  children: React.ReactNode;
  /** Render in a portal with fixed positioning (avoids overflow clipping). */
  portalled?: boolean;
  placement?: "top" | "bottom";
};

function getPortalledStyle(
  anchor: DOMRect,
  align: "start" | "end" | "center",
  placement: "top" | "bottom",
  menuWidth: number,
): CSSProperties {
  let left = anchor.left;
  if (align === "end") {
    left = anchor.right - menuWidth;
  } else if (align === "center") {
    left = anchor.left + anchor.width / 2 - menuWidth / 2;
  }

  const maxLeft = window.innerWidth - menuWidth - 8;
  left = Math.max(8, Math.min(left, maxLeft));

  if (placement === "bottom") {
    return {
      position: "fixed",
      top: anchor.bottom + 4,
      left,
      zIndex: 9999,
    };
  }

  return {
    position: "fixed",
    bottom: window.innerHeight - anchor.top + 4,
    left,
    zIndex: 9999,
  };
}

export function DropdownContent({
  children,
  align = "center",
  className,
  portalled = false,
  placement = "bottom",
}: DropdownContentProps) {
  const { isOpen, handleClose, containerRef } = useDropdownContext();
  const [portalledStyle, setPortalledStyle] = useState<CSSProperties | null>(
    null,
  );

  const contentRef = useClickOutside<HTMLDivElement>(() => {
    if (isOpen) handleClose();
  });

  const updatePortalledPosition = () => {
    const anchor = containerRef.current?.getBoundingClientRect();
    const menuWidth = contentRef.current?.offsetWidth ?? 152;
    if (!anchor) return;
    setPortalledStyle(getPortalledStyle(anchor, align, placement, menuWidth));
  };

  useLayoutEffect(() => {
    if (!isOpen || !portalled) {
      setPortalledStyle(null);
      return;
    }

    updatePortalledPosition();

    const onScrollOrResize = () => updatePortalledPosition();
    window.addEventListener("resize", onScrollOrResize);
    window.addEventListener("scroll", onScrollOrResize, true);

    return () => {
      window.removeEventListener("resize", onScrollOrResize);
      window.removeEventListener("scroll", onScrollOrResize, true);
    };
  }, [isOpen, portalled, placement, align, containerRef]);

  if (!isOpen) return null;

  const menuClassName = cn(
    "fade-in-0 zoom-in-95 pointer-events-auto min-w-[8rem] origin-top-right rounded-lg border border-stroke bg-white text-dark shadow-md dark:border-dark-3 dark:bg-dark-2 dark:text-white",
    !portalled && [
      "absolute z-99 mt-2 animate-in",
      {
        "right-0": align === "end",
        "left-0": align === "start",
        "left-1/2 -translate-x-1/2": align === "center",
      },
    ],
    portalled && "animate-in",
    className,
  );

  const menu = (
    <div
      ref={contentRef}
      role="menu"
      aria-orientation="vertical"
      className={menuClassName}
      style={portalled ? portalledStyle ?? { visibility: "hidden" } : undefined}
    >
      {children}
    </div>
  );

  if (portalled) {
    return createPortal(menu, document.body);
  }

  return menu;
}

type DropdownTriggerProps = React.HTMLAttributes<HTMLButtonElement> & {
  children: React.ReactNode;
};

export function DropdownTrigger({ children, className }: DropdownTriggerProps) {
  const { handleOpen, isOpen } = useDropdownContext();

  return (
    <button
      className={className}
      onClick={handleOpen}
      aria-expanded={isOpen}
      aria-haspopup="menu"
      data-state={isOpen ? "open" : "closed"}
    >
      {children}
    </button>
  );
}

export function DropdownClose({ children }: PropsWithChildren) {
  const { handleClose } = useDropdownContext();

  return <div onClick={handleClose}>{children}</div>;
}
