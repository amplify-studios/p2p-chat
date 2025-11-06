import { useRef } from "react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Plus, Image, File } from "lucide-react";

interface AssetUploaderProps {
  onImageUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onFileUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

export default function AssetUploader({ onImageUpload, onFileUpload }: AssetUploaderProps) {
  const imageInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const openImageDialog = () => imageInputRef.current?.click();
  const openFileDialog = () => fileInputRef.current?.click();

  return (
    <>
      {/* Hidden file inputs */}
      <input
        type="file"
        accept="image/*"
        ref={imageInputRef}
        className="hidden"
        onChange={onImageUpload}
      />
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        onChange={onFileUpload}
      />

      {/* Popover UI */}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full"
            aria-label="Upload asset"
          >
            <Plus className="w-5 h-5" />
          </Button>
        </PopoverTrigger>

        <PopoverContent className="w-40">
          <ul className="flex flex-col space-y-2">
            <li>
              <Button
                variant="ghost"
                className="w-full justify-start"
                onClick={openImageDialog}
              >
                <Image className="mr-2 w-4 h-4" /> Image
              </Button>
            </li>
            <li>
              <Button
                variant="ghost"
                className="w-full justify-start"
                onClick={openFileDialog}
              >
                <File className="mr-2 w-4 h-4" /> File
              </Button>
            </li>
          </ul>
        </PopoverContent>
      </Popover>
    </>
  );
}
