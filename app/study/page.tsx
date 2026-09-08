"use client";

import { useEffect, useRef } from "react";

export default function StudyPage() {
  const frame = useRef<HTMLIFrameElement>(null);
  useEffect(() => {
    const source = "/study/content" + (window.location.hash || "#coursework");
    if (frame.current && frame.current.getAttribute("src") !== source) frame.current.src = source;
    const update = (event: MessageEvent) => {
      if (event.origin !== window.location.origin || event.source !== frame.current?.contentWindow || event.data?.type !== "life-study-route") return;
      const hash = event.data.hash;
      if (typeof hash === "string" && /^#[a-zA-Z0-9_-]*$/.test(hash)) window.history.replaceState(null, "", "/study" + hash);
    };
    window.addEventListener("message", update);
    return () => window.removeEventListener("message", update);
  }, []);
  return <iframe ref={frame} src="/study/content#coursework" className="life-study-frame" title="Study coursework and reading workspace" />;
}
