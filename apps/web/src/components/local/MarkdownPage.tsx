"use client";

import MarkdownViewer from "@/components/local/MarkdownViewer";
import { useEffect, useState } from "react";

interface MarkdownPageProps {
  src: string;
};

export default function MarkdownPage({src}: MarkdownPageProps) {
  const [document, setDocument] = useState("## Loading...");

  useEffect(() => {
    (async () => {
      const res = await fetch(src);
      const text = await res.text();
      setDocument(text);
    })();
  }, []);


  return (<>
    <div className="m-4">
      <MarkdownViewer content={document} inline />
    </div>
  </>);
}

