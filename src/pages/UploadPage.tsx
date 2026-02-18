import { useState, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { Upload as UploadIcon, Camera, FileImage, Loader2, CheckCircle2, AlertCircle, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

export default function UploadPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [results, setResults] = useState<any[] | null>(null);
  const [recordDate, setRecordDate] = useState(new Date().toISOString().split("T")[0]);

  const handleFile = (f: File) => {
    setFile(f);
    setResults(null);
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target?.result as string);
    reader.readAsDataURL(f);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f && f.type.startsWith("image/")) handleFile(f);
  };

  const processOCR = async () => {
    if (!file || !user || !preview) return;
    setProcessing(true);

    try {
      // Upload image to storage
      const filePath = `${user.id}/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from("medical-records")
        .upload(filePath, file);
      if (uploadError) throw uploadError;

      // Call OCR edge function
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ocr-process`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          imageBase64: preview.split(",")[1],
          userId: user.id,
          recordDate,
          filePath,
        }),
      });

      if (!resp.ok) {
        const err = await resp.json();
        throw new Error(err.error || "OCR processing failed");
      }

      const data = await resp.json();
      setResults(data.results || []);
      toast({
        title: "Records processed!",
        description: `Found ${data.results?.length || 0} test results.`,
      });
    } catch (err: any) {
      console.error(err);
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setProcessing(false);
    }
  };

  const clearFile = () => {
    setFile(null);
    setPreview(null);
    setResults(null);
  };

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto space-y-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="font-display text-3xl font-bold text-foreground">Upload Record</h1>
        <p className="text-muted-foreground mt-1">Take a photo or upload an image of your medical record</p>
      </motion.div>

      {/* Date Picker */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <label className="text-sm font-medium text-foreground block mb-2">Record Date</label>
        <input
          type="date"
          value={recordDate}
          onChange={(e) => setRecordDate(e.target.value)}
          className="px-4 py-2.5 rounded-xl bg-muted border border-border text-foreground text-sm outline-none focus:ring-2 focus:ring-primary/30 transition-all"
        />
      </motion.div>

      {/* Upload Area */}
      {!file ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-card rounded-2xl p-12"
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
        >
          <div className="text-center">
            <div className="w-20 h-20 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
              <UploadIcon className="w-10 h-10 text-primary" />
            </div>
            <h2 className="font-display text-xl font-semibold text-foreground mb-2">
              Drop your medical record here
            </h2>
            <p className="text-muted-foreground text-sm mb-8">
              Supports JPG, PNG, HEIC images of lab reports, blood work, etc.
            </p>
            <div className="flex gap-4 justify-center">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 px-6 py-3 rounded-xl gradient-primary text-primary-foreground font-medium text-sm hover:opacity-90 transition-opacity"
              >
                <FileImage className="w-4 h-4" />
                Choose File
              </button>
              <button
                onClick={() => cameraInputRef.current?.click()}
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-secondary text-secondary-foreground font-medium text-sm hover:bg-secondary/80 transition-colors"
              >
                <Camera className="w-4 h-4" />
                Take Photo
              </button>
            </div>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          />
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          />
        </motion.div>
      ) : (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-6">
          {/* Preview */}
          <div className="glass-card rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display font-semibold text-foreground">Preview</h2>
              <button onClick={clearFile} className="text-muted-foreground hover:text-destructive transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="relative rounded-xl overflow-hidden bg-muted">
              <img
                src={preview!}
                alt="Medical record"
                className="w-full max-h-[400px] object-contain"
              />
            </div>
            <div className="mt-4 flex items-center justify-between">
              <p className="text-sm text-muted-foreground">{file.name}</p>
              <button
                onClick={processOCR}
                disabled={processing}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl gradient-primary text-primary-foreground font-medium text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {processing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <UploadIcon className="w-4 h-4" />
                    Process with AI
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Results */}
          {results && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card rounded-2xl p-6">
              <h2 className="font-display font-semibold text-foreground mb-4">
                Extracted Results ({results.length})
              </h2>
              {results.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No test results could be extracted. Try a clearer image.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {results.map((r: any, i: number) => (
                    <div
                      key={i}
                      className={`flex items-center gap-4 p-4 rounded-xl border ${
                        r.is_normal === false
                          ? "border-warning/30 bg-warning/5"
                          : "border-border bg-muted/30"
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        r.is_normal === false ? "bg-warning/20 text-warning" : "bg-success/20 text-success"
                      }`}>
                        {r.is_normal === false ? <AlertCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground">{r.test_name}</p>
                        <p className="text-xs text-muted-foreground">{r.test_category}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-foreground">
                          {r.value} {r.unit}
                        </p>
                        {(r.normal_range_min != null || r.normal_range_max != null) && (
                          <p className="text-xs text-muted-foreground">
                            Range: {r.normal_range_min ?? "—"} – {r.normal_range_max ?? "—"}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => navigate("/dashboard")}
                  className="px-6 py-2.5 rounded-xl gradient-primary text-primary-foreground font-medium text-sm"
                >
                  Go to Dashboard
                </button>
              </div>
            </motion.div>
          )}
        </motion.div>
      )}
    </div>
  );
}
