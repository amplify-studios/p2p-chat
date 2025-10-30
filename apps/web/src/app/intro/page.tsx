"use client";

import MarkdownViewer from "@/components/local/MarkdownViewer";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function Intro() {
  const router = useRouter();

  const [document, setDocument] = useState("## Loading...");

  useEffect(() => {
    (async () => {
      const res = await fetch("/Intro.md");
      const text = await res.text();
      setDocument(text);
    })();
  }, []);


  return (<>
    <Button 
      variant="ghost" 
      onClick={() => router.push('/login')}
      className="absolute top-4 left-4"
    >
      <ChevronLeft />
    </Button>

    <div className="m-4">
      <MarkdownViewer content={document} inline />
    </div>
  </>);
}
