import { useState, useRef } from "react";
import { X, Camera, Upload, Volume2, CheckCircle, AlertTriangle, AlertCircle, Loader2, Sparkles, Leaf } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./ui/button";
import { Progress } from "./ui/progress";
import { analyzeImage, DiseaseAnalysis } from "@/lib/visionAnalysis";

type AnalysisState = "camera" | "uploading" | "analyzing" | "result";

interface ImageAnalysisProps {
  isOpen: boolean;
  onClose: () => void;
  language: string;
}

const translations = {
  en: {
    takePhoto: "Take Crop Photo",
    uploadPhoto: "Upload from Gallery",
    uploading: "Uploading image...",
    analyzing: "Scanning Plant...",
    analyzingNote: "Using dual-stage YOLO detection",
    confidence: "Confidence",
    severity: "Severity",
    low: "Mild",
    medium: "Moderate",
    high: "Critical",
    symptoms: "Key Symptoms",
    treatment: "Action Plan",
    organic: "Organic Remedies",
    prevention: "Future Prevention",
    hearAdvice: "Listen to Advice",
    scanAnother: "Scan New Crop",
    tryAgain: "Try Again",
    errorTitle: "Analysis Failed",
    detectingCrop: "Detecting Crop Type...",
    identifyingDisease: "Analyzing Symptoms...",
  },
  hi: {
    takePhoto: "फसल की फोटो लें",
    uploadPhoto: "गैलरी से अपलोड करें",
    uploading: "अपलोड हो रहा है...",
    analyzing: "स्कैनिंग चालू है...",
    analyzingNote: "उन्नत एआई विश्लेषण",
    confidence: "विश्वास स्तर",
    severity: "गंभीरता",
    low: "हल्का",
    medium: "मध्यम",
    high: "गंभीर",
    symptoms: "मुख्य लक्षण",
    treatment: "उपचार योजना",
    organic: "जैविक उपचार",
    prevention: "बचाव के उपाय",
    hearAdvice: "सलाह सुनें",
    scanAnother: "नई फसल स्कैन करें",
    tryAgain: "पुनः प्रयास करें",
    errorTitle: "विश्लेषण विफल",
    detectingCrop: "फसल की पहचान...",
    identifyingDisease: "रोग का विश्लेषण...",
  },
};

export function ImageAnalysis({ isOpen, onClose, language }: ImageAnalysisProps) {
  const [state, setState] = useState<AnalysisState>("camera");
  const [analysisStep, setAnalysisStep] = useState<"crop" | "disease">("crop");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<DiseaseAnalysis | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const t = translations[language as keyof typeof translations] || translations.en;
  const isHindi = language === "hi";

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviewImage(e.target?.result as string);
        performAnalysis(file);
      };
      reader.readAsDataURL(file);
    }
  };

  const performAnalysis = async (file: File) => {
    setState("uploading");
    setUploadProgress(10);
    setErrorMessage("");
    setAnalysisResult(null);
    setAnalysisStep("crop");

    try {
      // Small artificial delay for "Uploading" feel
      await new Promise(r => setTimeout(r, 400));
      setUploadProgress(100);

      setState("analyzing");

      // Toggle step indicator for UI depth
      const stepTimer = setTimeout(() => setAnalysisStep("disease"), 1200);

      const visionResult = await analyzeImage(file);
      clearTimeout(stepTimer);

      if (!visionResult.success || !visionResult.analysis) {
        setErrorMessage(visionResult.error || "Analysis failed");
        setState("result");
        return;
      }

      setAnalysisResult(visionResult.analysis);
      if (visionResult.processed_image) {
        setPreviewImage(visionResult.processed_image);
      }
      setState("result");

    } catch (error) {
      setErrorMessage("Connection issue. Ensure backend is running.");
      setState("result");
    }
  };

  const resetAnalysis = () => {
    setState("camera");
    setPreviewImage(null);
    setAnalysisResult(null);
    setErrorMessage("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const speakAdvice = () => {
    if (analysisResult && "speechSynthesis" in window) {
      const name = isHindi ? analysisResult.disease_name_hindi : analysisResult.disease_name;
      const desc = isHindi ? analysisResult.description_hindi : analysisResult.description;
      const text = `${name}. ${desc}`;
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = isHindi ? "hi-IN" : "en-US";
      window.speechSynthesis.speak(utterance);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-xl animate-fade-in flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b bg-background/50 backdrop-blur-md">
        <button onClick={() => { resetAnalysis(); onClose(); }} className="p-2 hover:bg-muted rounded-full transition-colors">
          <X size={24} />
        </button>
        <div className="flex flex-col items-center">
          <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
            AgroScan AI Pro
          </h1>
          <span className="text-[10px] uppercase tracking-widest opacity-50 font-bold">Dual-Stage Detection</span>
        </div>
        <div className="w-10 h-10 bg-emerald-50 rounded-full flex items-center justify-center">
          <Sparkles className="text-emerald-600 w-5 h-5" />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {state === "camera" && (
          <div className="flex flex-col items-center justify-center p-8 space-y-10 min-h-[70vh]">
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-emerald-600 to-teal-600 rounded-3xl blur opacity-20 group-hover:opacity-40 transition duration-1000"></div>
              <div className="relative w-72 h-72 bg-card rounded-3xl border border-border flex flex-col items-center justify-center overflow-hidden shadow-sm">
                <Leaf className="w-20 h-20 text-emerald-500/20 mb-4 animate-pulse" />
                <p className="text-muted-foreground text-sm font-medium px-10 text-center">
                  {isHindi ? "पत्ती को फ्रेम में रखें" : "Position a leaf in the frame for real-time analysis"}
                </p>
              </div>
            </div>

            <div className="w-full max-w-sm grid grid-cols-1 gap-4">
              <Button onClick={() => fileInputRef.current?.click()} className="group h-16 text-lg relative overflow-hidden bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-600/20">
                <Camera className="mr-2 h-6 w-6" /> {t.takePhoto}
              </Button>
              <Button variant="outline" onClick={() => fileInputRef.current?.click()} className="h-16 text-lg border-2 hover:bg-muted/50 transition-all">
                <Upload className="mr-2 h-6 w-6 text-emerald-600" /> {t.uploadPhoto}
              </Button>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />
            </div>
          </div>
        )}

        {(state === "uploading" || state === "analyzing") && (
          <div className="flex flex-col items-center justify-center p-8 space-y-12 animate-in fade-in zoom-in duration-300 min-h-[70vh]">
            <div className="relative w-64 h-64">
              {previewImage && <img src={previewImage} alt="Scanning" className="w-full h-full object-cover rounded-3xl shadow-2xl grayscale-[0.3]" />}
              <div className="absolute inset-0 border-2 border-emerald-500/50 rounded-3xl animate-pulse" />
              <div className="absolute top-0 left-0 w-full h-1 bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.8)] animate-scan-line" />
            </div>
            <div className="text-center space-y-6 w-full max-w-xs">
              <div className="space-y-2">
                <p className="text-xl font-bold text-emerald-900">
                  {state === "uploading" ? t.uploading : (analysisStep === "crop" ? t.detectingCrop : t.identifyingDisease)}
                </p>
                <p className="text-sm text-muted-foreground font-medium animate-pulse">{t.analyzingNote}</p>
              </div>
              <div className="h-2 w-full bg-emerald-100 rounded-full overflow-hidden">
                <div className={cn("h-full bg-emerald-600 transition-all duration-700", state === "uploading" ? "w-1/3" : (analysisStep === "crop" ? "w-2/3" : "w-[95%]"))} />
              </div>
            </div>
          </div>
        )}

        {state === "result" && (
          <div className="p-6 space-y-8 animate-in slide-in-from-bottom duration-500 max-w-2xl mx-auto pb-32">
            {previewImage && (
              <div className="relative rounded-3xl overflow-hidden shadow-2xl bg-black/5 ring-1 ring-border">
                <img src={previewImage} alt="Result" className="w-full h-auto object-contain max-h-[400px]" />
                {analysisResult?.crop_identified && (
                  <div className="absolute top-4 right-4 px-3 py-1.5 bg-background/90 backdrop-blur-md rounded-full text-[10px] font-black uppercase tracking-widest text-emerald-700 shadow-sm border border-emerald-100">
                    CROP: {analysisResult.crop_identified}
                  </div>
                )}
              </div>
            )}

            {errorMessage ? (
              <div className="p-8 bg-destructive/5 rounded-3xl border-2 border-dashed border-destructive/20 text-center">
                <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
                <h3 className="text-lg font-bold text-destructive">{errorMessage}</h3>
                <Button variant="ghost" onClick={resetAnalysis} className="mt-4 hover:bg-destructive/10 text-destructive underline">Try a different image</Button>
              </div>
            ) : analysisResult && (
              <div className="space-y-10">
                <div className="text-center space-y-3">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-bold uppercase tracking-tighter mb-2">
                    <Sparkles size={12} /> AI Analysis Verified
                  </div>
                  <h2 className="text-3xl font-black tracking-tight text-slate-900 leading-tight">
                    {isHindi ? analysisResult.disease_name_hindi : analysisResult.disease_name}
                  </h2>
                  <p className="text-slate-600 text-lg leading-relaxed px-4">
                    {isHindi ? analysisResult.description_hindi : analysisResult.description}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col items-center">
                    <span className="text-[10px] uppercase font-bold text-slate-400 mb-1">{t.confidence}</span>
                    <span className="text-xl font-black text-slate-800">{analysisResult.confidence}%</span>
                  </div>
                  <div className={cn("p-4 rounded-2xl border flex flex-col items-center",
                    analysisResult.severity === 'high' ? "bg-red-50 border-red-100" : "bg-emerald-50 border-emerald-100")}>
                    <span className="text-[10px] uppercase font-bold opacity-50 mb-1">{t.severity}</span>
                    <span className={cn("text-xl font-black",
                      analysisResult.severity === 'high' ? "text-red-600" : "text-emerald-600")}>
                      {analysisResult.severity === 'high' ? t.high : (analysisResult.severity === 'medium' ? t.medium : t.low)}
                    </span>
                  </div>
                </div>

                <Button className="w-full h-16 text-lg font-bold rounded-2xl bg-emerald-600 hover:bg-emerald-700 shadow-xl shadow-emerald-600/20 gap-3" onClick={speakAdvice}>
                  <Volume2 /> {t.hearAdvice}
                </Button>

                <div className="space-y-8">
                  {/* Symptoms */}
                  <div className="space-y-3">
                    <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">{t.symptoms}</h3>
                    <div className="space-y-2">
                      {(isHindi ? analysisResult.symptoms_hindi : analysisResult.symptoms).map((s, i) => (
                        <div key={i} className="flex items-start gap-3 p-4 bg-slate-50 rounded-xl border border-slate-100">
                          <AlertCircle className="w-5 h-5 text-emerald-500/50 shrink-0 mt-0.5" />
                          <p className="text-slate-700 font-medium">{s}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Action Plan */}
                  <div className="space-y-3">
                    <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">{t.treatment}</h3>
                    <div className="bg-slate-900 text-slate-50 p-6 rounded-3xl space-y-4 shadow-xl">
                      {(isHindi ? analysisResult.treatment_steps_hindi : analysisResult.treatment_steps).map((step, i) => (
                        <div key={i} className="flex gap-4">
                          <span className="bg-emerald-600 w-8 h-8 rounded-full flex items-center justify-center text-sm font-black shrink-0">{i + 1}</span>
                          <p className="font-medium opacity-90">{step}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Organic Remedies */}
                  {analysisResult.organic_options?.length > 0 && (
                    <div className="space-y-3">
                      <h3 className="text-xs font-black uppercase tracking-widest text-emerald-600/50">{t.organic}</h3>
                      <div className="grid grid-cols-1 gap-2">
                        {(isHindi ? analysisResult.organic_options_hindi : analysisResult.organic_options).map((opt, i) => (
                          <div key={i} className="flex items-center gap-3 p-4 bg-emerald-50/50 border border-emerald-100 rounded-2xl text-emerald-800 font-bold">
                            <CheckCircle className="text-emerald-500 w-5 h-5 shrink-0" />
                            {opt}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Prevention Tips */}
                  {analysisResult.prevention_tips?.length > 0 && (
                    <div className="space-y-3">
                      <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">{t.prevention}</h3>
                      <div className="grid grid-cols-1 gap-3">
                        {(isHindi ? analysisResult.prevention_tips_hindi : analysisResult.prevention_tips).map((tip, i) => (
                          <div key={i} className="flex items-start gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100 italic text-slate-600 text-sm">
                            <div className="w-2 h-2 rounded-full bg-slate-300 mt-1.5 shrink-0" />
                            {tip}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="pt-6">
                  <Button variant="outline" className="w-full h-14 rounded-2xl border-2 hover:bg-slate-50 transition-all font-bold text-slate-500" onClick={resetAnalysis}>
                    {t.scanAnother}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      <style>{`
        @keyframes scan {
          0% { top: 0% }
          100% { top: 100% }
        }
        .animate-scan-line {
          animation: scan 2.5s linear infinite;
        }
      `}</style>
    </div>
  );
}
