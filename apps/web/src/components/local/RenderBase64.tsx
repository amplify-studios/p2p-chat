import AudioCard from "./AudioCard";
import FileCard from "./FileCard";

interface RenderBase64Props {
  base64: string;
  type: "image" | "video" | "audio" | "file";
  filename?: string; // optional, useful for downloads
}

export default function RenderBase64({ base64, type, filename }: RenderBase64Props) {
  if (!base64) return null;

  switch (type) {
    case "image":
      return (
        <img
          src={`data:image/*;base64,${base64}`}
          alt={filename || "Image"}
          className="max-w-full rounded-lg shadow"
        />
      );

    case "video":
      return (
        <video
          controls
          className="max-w-full rounded-lg shadow"
          src={`data:video/*;base64,${base64}`}
        />
      );

    case "audio":
      return (
        <AudioCard base64={base64} filename={filename} />
      );

    default:
      return (
        <FileCard base64={base64} filename={filename} />
      );
  }
}
