"use client";
import { useEffect, useRef } from "react";

interface Props {
  html: string;
  isGlobal?: boolean;
  position?: string;
}

export function AdRenderer({ html, isGlobal = false, position = "" }: Props) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (!iframeRef.current) return;
    
    const iframe = iframeRef.current;
    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!doc) return;

    // Standardize protocol-relative URLs inside script tags (e.g. src="//xxx" to src="https://xxx")
    let processedHtml = html;
    processedHtml = processedHtml.replace(/src="\/\//g, 'src="https://');
    processedHtml = processedHtml.replace(/src='\/\//g, "src='https://");

    const content = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            html, body {
              margin: 0;
              padding: 0;
              width: 100%;
              height: 100%;
              overflow: hidden;
              background: transparent;
              display: flex;
              justify-content: center;
              align-items: center;
            }
          </style>
        </head>
        <body>
          ${processedHtml}
        </body>
      </html>
    `;

    doc.open();
    doc.write(content);
    doc.close();
  }, [html]);

  if (isGlobal) {
    return (
      <iframe
        ref={iframeRef}
        title="Global Ad Link"
        className="w-0 h-0 absolute opacity-0 pointer-events-none border-0"
        sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-forms"
      />
    );
  }

  // Set appropriate height based on the slot position name
  let heightClass = "h-[250px]";
  if (position.includes("top") || position.includes("middle") || position.includes("footer")) {
    heightClass = "h-[95px]";
  }

  return (
    <div className="w-full flex justify-center items-center overflow-hidden">
      <iframe
        ref={iframeRef}
        title="Advertisement"
        className={`w-full ${heightClass} border-0 bg-transparent overflow-hidden`}
        sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-forms"
      />
    </div>
  );
}
