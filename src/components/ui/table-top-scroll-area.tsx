"use client";

import { cn } from "@/lib/utils";
import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

type TableTopScrollAreaProps = {
  children: ReactNode;
  maxHeight?: string;
  className?: string;
};

export function TableTopScrollArea({
  children,
  maxHeight = "560px",
  className,
}: TableTopScrollAreaProps) {
  const topScrollRef = useRef<HTMLDivElement>(null);
  const bodyScrollRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const isSyncingRef = useRef(false);
  const [contentWidth, setContentWidth] = useState(0);

  useEffect(() => {
    const content = contentRef.current;
    if (!content) return;

    const updateWidth = () => {
      setContentWidth(content.scrollWidth);
    };

    updateWidth();

    const observer = new ResizeObserver(updateWidth);
    observer.observe(content);

    return () => observer.disconnect();
  }, [children]);

  useEffect(() => {
    const top = topScrollRef.current;
    const body = bodyScrollRef.current;
    if (!top || !body) return;

    const syncScroll = (
      source: HTMLDivElement,
      target: HTMLDivElement,
    ) => {
      if (isSyncingRef.current) return;
      isSyncingRef.current = true;
      target.scrollLeft = source.scrollLeft;
      requestAnimationFrame(() => {
        isSyncingRef.current = false;
      });
    };

    const onTopScroll = () => syncScroll(top, body);
    const onBodyScroll = () => syncScroll(body, top);

    top.addEventListener("scroll", onTopScroll);
    body.addEventListener("scroll", onBodyScroll);

    return () => {
      top.removeEventListener("scroll", onTopScroll);
      body.removeEventListener("scroll", onBodyScroll);
    };
  }, []);

  return (
    <div className={cn("flex flex-col", className)}>
      <div
        ref={topScrollRef}
        aria-hidden
        className="table-scroll-prominent shrink-0 overflow-x-auto overflow-y-hidden"
        style={{ height: "14px" }}
      >
        <div style={{ width: contentWidth, height: 1 }} />
      </div>
      <div
        ref={bodyScrollRef}
        className="table-scroll-prominent hide-x-scrollbar overflow-auto"
        style={{ maxHeight }}
      >
        <div ref={contentRef} className="min-w-max">
          {children}
        </div>
      </div>
    </div>
  );
}
