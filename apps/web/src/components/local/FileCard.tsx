import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Download } from "lucide-react";

interface FileCardProps {
  base64: string;
  filename?: string;
}

export default function FileCard({ base64, filename }: FileCardProps) {
  return (
    <Card className="max-w-m hover:shadow-lg transition-shadow duration-200 cursor-pointer">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Download className="w-5 h-5" />
          {filename || "Download file"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <a
          href={`data:application/octet-stream;base64,${base64}`}
          download={filename || "file"}
          className="block text-blue-600 hover:underline"
        >
          Click to download
        </a>
      </CardContent>
    </Card>
  );
}

