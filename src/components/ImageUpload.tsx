import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Loader2, Upload, X, ImageIcon } from "lucide-react";

const BUCKET = "truck-photos";

type ImageUploadProps = {
  /** Stored storage path (not a signed URL). */
  value: string | null;
  onChange: (path: string | null) => void;
  userId: string;
  label: string;
  hint?: string;
};

export function ImageUpload({ value, onChange, userId, label, hint }: ImageUploadProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Generate a signed preview URL whenever the stored path changes.
  useEffect(() => {
    let active = true;
    if (!value) {
      setPreview(null);
      return;
    }
    supabase.storage
      .from(BUCKET)
      .createSignedUrl(value, 3600)
      .then(({ data }) => {
        if (active) setPreview(data?.signedUrl ?? null);
      });
    return () => {
      active = false;
    };
  }, [value]);

  const handleFile = async (file: File) => {
    setError(null);
    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Image must be under 5MB.");
      return;
    }
    setUploading(true);
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${userId}/${crypto.randomUUID()}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(path, file, { upsert: true, contentType: file.type });
    setUploading(false);
    if (uploadError) {
      setError(uploadError.message);
      return;
    }
    onChange(path);
  };

  return (
    <div>
      <p className="nb-label">{label}</p>
      {hint && <p className="muted" style={{ fontSize: "0.8rem", marginBottom: 6 }}>{hint}</p>}

      <div className="nb-upload">
        <div className="nb-upload__preview">
          {preview ? (
            <img src={preview} alt={label} />
          ) : (
            <ImageIcon size={28} className="muted" />
          )}
        </div>

        <div className="flex items-center gap-1" style={{ flexWrap: "wrap" }}>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
              e.target.value = "";
            }}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? <Loader2 size={14} className="spin" /> : <Upload size={14} />}
            {value ? "Replace" : "Upload"}
          </Button>
          {value && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="nb-btn--danger"
              onClick={() => onChange(null)}
              disabled={uploading}
            >
              <X size={14} /> Remove
            </Button>
          )}
        </div>
      </div>

      {error && <p style={{ color: "var(--danger, #c0392b)", fontSize: "0.8rem", marginTop: 4 }}>{error}</p>}
    </div>
  );
}
