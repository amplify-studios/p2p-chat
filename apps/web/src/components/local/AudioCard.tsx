import { useRef, useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Play, Pause } from "lucide-react";

interface AudioCardProps {
  base64: string;
  filename?: string;
}

export default function AudioCard({ base64, filename }: AudioCardProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);

  const togglePlay = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleTimeUpdate = () => {
    if (!audioRef.current) return;
    setProgress((audioRef.current.currentTime / audioRef.current.duration) * 100);
  };

  return (
    <Card className="max-w-sm p-4 hover:shadow-lg transition-shadow duration-200">
      <CardHeader>
        <CardTitle>{filename || "Audio File"}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        <audio
          ref={audioRef}
          src={`data:audio/*;base64,${base64}`}
          onTimeUpdate={handleTimeUpdate}
          onEnded={() => setIsPlaying(false)}
          className="hidden"
        />
        <button
          onClick={togglePlay}
          className="flex items-center gap-2 px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition"
        >
          {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
          {isPlaying ? "Pause" : "Play"}
        </button>
        <div className="h-2 w-full bg-gray-300 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-2 bg-blue-500 rounded-full"
            style={{ width: `${progress}%` }}
          />
        </div>
      </CardContent>
    </Card>
  );
}

