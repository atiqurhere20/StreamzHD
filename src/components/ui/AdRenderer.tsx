"use client";
import { useEffect, useRef } from "react";

interface Props {
  html: string;
  isGlobal?: boolean;
  position?: string;
}

export function AdRenderer({ html, isGlobal = false, position = "" }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    
    // Clear previous children
    containerRef.current.innerHTML = "";

    // Parse the HTML snippet safely
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");

    // 1. Copy over non-script elements (styles, placeholders, divs)
    const bodyNodes = Array.from(doc.body.childNodes);
    bodyNodes.forEach((node) => {
      if (node.nodeName !== "SCRIPT") {
        containerRef.current?.appendChild(node.cloneNode(true));
      }
    });

    // 2. Safely create and append script tags to trigger execution in the main document
    const scripts = doc.querySelectorAll("script");
    scripts.forEach((oldScript) => {
      const newScript = document.createElement("script");
      
      // Copy all attributes (src, async, type, etc.)
      Array.from(oldScript.attributes).forEach((attr) => {
        newScript.setAttribute(attr.name, attr.value);
      });

      // Ensure protocol-relative URLs are resolved to https
      const src = oldScript.getAttribute("src");
      if (src && src.startsWith("//")) {
        newScript.setAttribute("src", `https:${src}`);
      }

      // Copy inner script content if any
      if (oldScript.innerHTML) {
        newScript.innerHTML = oldScript.innerHTML;
      }

      // Append to the container in the main document
      containerRef.current?.appendChild(newScript);
    });
  }, [html]);

  // For global scripts (popunders, push, vignette), we don't want to show any layout box
  if (isGlobal) {
    return <div ref={containerRef} className="hidden w-0 h-0 pointer-events-none opacity-0" />;
  }

  // Set appropriate min-height based on the position name to avoid Cumulative Layout Shift (CLS)
  let minHeightClass = "min-h-[250px]";
  if (position.includes("top") || position.includes("middle") || position.includes("footer")) {
    minHeightClass = "min-h-[90px]";
  }

  return (
    <div 
      ref={containerRef} 
      className={`w-full flex justify-center items-center overflow-hidden ${minHeightClass}`} 
    />
  );
}
