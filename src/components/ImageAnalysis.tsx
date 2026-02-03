import { useState, useRef } from "react";
import { X, Camera, Upload, Volume2, CheckCircle, AlertCircle, Loader2, Sparkles, Leaf, RotateCcw, BookmarkPlus, Share2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./ui/button";
import { analyzeImage, DiseaseAnalysis } from "@/lib/visionAnalysis";
import { useLibrary } from "@/hooks/useLibrary";
import { toast } from "sonner";

type AnalysisState = "camera" | "uploading" | "analyzing" | "result";

interface ImageAnalysisProps {
  isOpen: boolean;
  onClose: () => void;
  language: string;
}

const translations = {
  en: {
    title: "Plant Scanner",
    subtitle: "AI-Powered Analysis",
    takePhoto: "Take Photo",
    uploadPhoto: "Upload from Gallery",
    uploading: "Uploading...",
    analyzing: "Analyzing Plant...",
    analyzingNote: "Using advanced AI detection",
    confidence: "Confidence",
    severity: "Severity",
    low: "Mild",
    medium: "Moderate",
    high: "Critical",
    symptoms: "Symptoms",
    treatment: "Treatment Plan",
    organic: "Organic Options",
    prevention: "Prevention Tips",
    hearAdvice: "Listen to Advice",
    scanAnother: "Scan Another Plant",
    tryAgain: "Try Again",
    errorTitle: "Analysis Failed",
    detectingCrop: "Identifying Plant...",
    identifyingDisease: "Analyzing Health...",
    healthy: "Plant is Healthy",
    diseaseDetected: "Issue Detected",
    save: "Save",
    share: "Share",
    positionLeaf: "Position a leaf in the frame",
  },
  hi: {
    title: "पौधा स्कैनर",
    subtitle: "AI विश्लेषण",
    takePhoto: "फोटो लें",
    uploadPhoto: "गैलरी से अपलोड करें",
    uploading: "अपलोड हो रहा है...",
    analyzing: "विश्लेषण हो रहा है...",
    analyzingNote: "उन्नत AI का उपयोग",
    confidence: "विश्वास",
    severity: "गंभीरता",
    low: "हल्का",
    medium: "मध्यम",
    high: "गंभीर",
    symptoms: "लक्षण",
    treatment: "उपचार योजना",
    organic: "जैविक विकल्प",
    prevention: "रोकथाम",
    hearAdvice: "सलाह सुनें",
    scanAnother: "नया स्कैन करें",
    tryAgain: "पुनः प्रयास करें",
    errorTitle: "विश्लेषण विफल",
    detectingCrop: "पौधा पहचान...",
    identifyingDisease: "स्वास्थ्य विश्लेषण...",
    healthy: "पौधा स्वस्थ है",
    diseaseDetected: "समस्या मिली",
    save: "सहेजें",
    share: "साझा करें",
    positionLeaf: "पत्ती को फ्रेम में रखें",
  },
};

export function ImageAnalysis({ isOpen, onClose, language }: ImageAnalysisProps) {
  const [state, setState] = useState<AnalysisState>("camera");
  const [analysisStep, setAnalysisStep] = useState<"crop" | "disease">("crop");
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<DiseaseAnalysis | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [isSaved, setIsSaved] = useState(false);
  const { addItem } = useLibrary();
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
    setErrorMessage("");
    setAnalysisResult(null);
    setAnalysisStep("crop");

    try {
      await new Promise(r => setTimeout(r, 400));
      setState("analyzing");

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

      // Auto-save to library
      const newItem = {
        diseaseName: visionResult.analysis.disease_name,
        diseaseNameHi: visionResult.analysis.disease_name_hindi,
        cropType: visionResult.analysis.crop_identified || "Unknown",
        cropTypeHi: visionResult.analysis.crop_identified || "अज्ञात",
        confidence: visionResult.analysis.confidence,
        severity: visionResult.analysis.severity,
        thumbnail: visionResult.processed_image || previewImage || "",
        summary: visionResult.analysis.description,
        summaryHi: visionResult.analysis.description_hindi,
        description: visionResult.analysis.description,
        descriptionHi: visionResult.analysis.description_hindi,
        symptoms: visionResult.analysis.symptoms,
        symptomsHi: visionResult.analysis.symptoms_hindi,
        treatment: visionResult.analysis.treatment_steps,
        treatmentHi: visionResult.analysis.treatment_steps_hindi,
      };
      const { item: savedItem, isDuplicate } = addItem(newItem);
      setIsSaved(true);
      if (isDuplicate) {
        toast.info(isHindi ? "इतिहास में पहले से मौजूद, समय अपडेट किया गया" : "Already in history, time updated");
      } else {
        toast.success(isHindi ? "इतिहास में सहेजा गया" : "Saved to history");
      }

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
    setIsSaved(false);
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
    <div className="fixed inset-0 z-50 bg-background animate-slide-in-right flex flex-col overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between px-5 py-4 border-b border-border bg-background/95 backdrop-blur-apple">
        <button
          onClick={() => { resetAnalysis(); onClose(); }}
          className="w-10 h-10 flex items-center justify-center rounded-xl border border-border hover:bg-muted transition-colors active:scale-95"
        >
          <X size={20} />
        </button>
        <div className="text-center">
          <h1 className="text-headline font-bold text-foreground">{t.title}</h1>
          <p className="text-caption text-muted-foreground">{t.subtitle}</p>
        </div>
        <div className="w-10 h-10 flex items-center justify-center rounded-xl bg-green-wash">
          <Sparkles className="w-5 h-5 text-primary" />
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
        {/* Camera State */}
        {state === "camera" && (
          <div className="flex flex-col items-center justify-center p-6 flex-1 animate-fade-in">
            {/* Upload Area */}
            <div className="relative w-full max-w-sm aspect-[4/3] rounded-apple-lg border-2 border-dashed border-primary bg-background flex flex-col items-center justify-center p-8 hover:bg-green-wash hover:border-primary/70 transition-all cursor-pointer"
              onClick={() => fileInputRef.current?.click()}>
              <div className="w-16 h-16 rounded-full bg-green-wash flex items-center justify-center mb-4">
                <Camera className="w-8 h-8 text-primary" />
              </div>
              <p className="text-body font-medium text-muted-foreground text-center">
                {t.positionLeaf}
              </p>
              <p className="text-caption text-muted-foreground mt-2">
                JPG, PNG (max 10MB)
              </p>
            </div>

            <div className="w-full max-w-sm mt-8 space-y-3">
              <Button
                onClick={() => fileInputRef.current?.click()}
                className="w-full h-14 text-body font-semibold rounded-apple bg-primary hover:bg-primary/90 shadow-green active:scale-[0.98] transition-all"
              >
                <Camera className="mr-2 h-5 w-5" /> {t.takePhoto}
              </Button>
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                className="w-full h-14 text-body font-semibold rounded-apple border-2 border-border hover:bg-green-wash hover:border-primary/50 active:scale-[0.98] transition-all"
              >
                <Upload className="mr-2 h-5 w-5 text-primary" /> {t.uploadPhoto}
              </Button>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />
            </div>
          </div>
        )}

        {/* Loading State */}
        {(state === "uploading" || state === "analyzing") && (
          <div className="flex flex-col items-center justify-center p-8 flex-1 animate-fade-in">
            <div className="relative w-64 h-64 rounded-apple-lg overflow-hidden shadow-apple-lg">
              {previewImage && (
                <img src={previewImage} alt="Scanning" className="w-full h-full object-cover" />
              )}
              <div className="absolute inset-0 border-2 border-primary/50 rounded-apple-lg" />
              <div className="absolute top-0 left-0 w-full h-1 bg-primary shadow-[0_0_15px_rgba(16,185,129,0.8)] animate-scan-line" />
            </div>

            <div className="mt-8 text-center space-y-3">
              <div className="inline-flex items-center gap-2">
                <Loader2 className="w-5 h-5 text-primary animate-spin-smooth" />
                <p className="text-title font-bold text-foreground">
                  {state === "uploading" ? t.uploading : (analysisStep === "crop" ? t.detectingCrop : t.identifyingDisease)}
                </p>
              </div>
              <p className="text-subhead text-muted-foreground">{t.analyzingNote}</p>

              {/* Progress Bar */}
              <div className="w-64 h-1.5 bg-muted rounded-full overflow-hidden mt-4">
                <div
                  className={cn(
                    "h-full bg-primary rounded-full transition-all duration-700",
                    state === "uploading" ? "w-1/3" : (analysisStep === "crop" ? "w-2/3" : "w-[95%]")
                  )}
                />
              </div>
            </div>
          </div>
        )}

        {/* Result State */}
        {state === "result" && (
          <div className="p-5 pb-10 animate-slide-up">
            {/* Image Preview */}
            {previewImage && (
              <div className="relative rounded-apple-lg overflow-hidden shadow-apple-lg bg-muted mb-6">
                <img src={previewImage} alt="Result" className="w-full h-auto object-contain max-h-72" />
                {analysisResult?.crop_identified && (
                  <div className="absolute top-3 right-3 px-3 py-1.5 bg-background/90 backdrop-blur-sm rounded-full text-caption font-bold uppercase tracking-wide text-primary shadow-sm border border-border">
                    {analysisResult.crop_identified}
                  </div>
                )}
              </div>
            )}

            {errorMessage ? (
              <div className="p-8 bg-destructive/5 rounded-apple-lg border border-destructive/20 text-center">
                <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
                <h3 className="text-headline font-bold text-destructive mb-2">{t.errorTitle}</h3>
                <p className="text-subhead text-muted-foreground mb-4">{errorMessage}</p>
                <Button variant="outline" onClick={resetAnalysis} className="text-destructive border-destructive/30">
                  <RotateCcw className="mr-2 h-4 w-4" /> {t.tryAgain}
                </Button>
              </div>
            ) : analysisResult && (
              <div className="space-y-6">
                {/* Status Banner */}
                <div className={cn(
                  "p-4 rounded-apple-lg flex items-center gap-3",
                  analysisResult.severity === 'high'
                    ? "bg-destructive/10 border border-destructive/20"
                    : "bg-green-wash border border-primary/20"
                )}>
                  {analysisResult.severity === 'high' ? (
                    <AlertCircle className="w-6 h-6 text-destructive flex-shrink-0" />
                  ) : (
                    <CheckCircle className="w-6 h-6 text-primary flex-shrink-0" />
                  )}
                  <div>
                    <p className={cn(
                      "text-headline font-bold",
                      analysisResult.severity === 'high' ? "text-destructive" : "text-primary"
                    )}>
                      {analysisResult.severity === 'high' ? t.diseaseDetected : t.healthy}
                    </p>
                    <p className="text-subhead text-muted-foreground">
                      {isHindi ? analysisResult.disease_name_hindi : analysisResult.disease_name}
                    </p>
                  </div>
                </div>

                {/* Confidence & Severity */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-4 bg-muted rounded-apple border border-border text-center">
                    <p className="text-caption font-bold text-muted-foreground uppercase tracking-wide mb-1">{t.confidence}</p>
                    <p className="text-title font-bold text-foreground">{analysisResult.confidence}%</p>
                  </div>
                  <div className={cn(
                    "p-4 rounded-apple border text-center",
                    analysisResult.severity === 'high'
                      ? "bg-destructive/5 border-destructive/20"
                      : "bg-green-wash border-primary/20"
                  )}>
                    <p className="text-caption font-bold text-muted-foreground uppercase tracking-wide mb-1">{t.severity}</p>
                    <p className={cn(
                      "text-title font-bold",
                      analysisResult.severity === 'high' ? "text-destructive" : "text-primary"
                    )}>
                      {analysisResult.severity === 'high' ? t.high : (analysisResult.severity === 'medium' ? t.medium : t.low)}
                    </p>
                  </div>
                </div>

                {/* Description */}
                <div className="p-4 bg-green-wash rounded-apple border-l-4 border-primary">
                  <p className="text-body text-foreground leading-relaxed">
                    {isHindi ? analysisResult.description_hindi : analysisResult.description}
                  </p>
                </div>

                {/* Listen Button */}
                <Button
                  className="w-full h-14 text-body font-semibold rounded-apple bg-primary hover:bg-primary/90 shadow-green active:scale-[0.98] transition-all"
                  onClick={speakAdvice}
                >
                  <Volume2 className="mr-2 h-5 w-5" /> {t.hearAdvice}
                </Button>

                {/* Symptoms */}
                {analysisResult.symptoms && analysisResult.symptoms.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-caption font-bold uppercase tracking-widest text-muted-foreground">{t.symptoms}</h3>
                    <div className="space-y-2">
                      {(isHindi ? analysisResult.symptoms_hindi : analysisResult.symptoms).map((s, i) => (
                        <div key={i} className="flex items-start gap-3 p-3 bg-muted rounded-apple border border-border">
                          <span className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-caption font-bold text-primary flex-shrink-0">
                            {i + 1}
                          </span>
                          <p className="text-subhead text-foreground">{s}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Treatment */}
                {analysisResult.treatment_steps && analysisResult.treatment_steps.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-caption font-bold uppercase tracking-widest text-muted-foreground">{t.treatment}</h3>
                    <div className="bg-foreground text-background p-5 rounded-apple-lg space-y-4">
                      {(isHindi ? analysisResult.treatment_steps_hindi : analysisResult.treatment_steps).map((step, i) => (
                        <div key={i} className="flex gap-4">
                          <span className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-subhead font-bold text-primary-foreground flex-shrink-0">
                            {i + 1}
                          </span>
                          <p className="text-subhead opacity-90 pt-1">{step}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Organic Options */}
                {analysisResult.organic_options && analysisResult.organic_options.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-caption font-bold uppercase tracking-widest text-primary">{t.organic}</h3>
                    <div className="space-y-2">
                      {(isHindi ? analysisResult.organic_options_hindi : analysisResult.organic_options).map((opt, i) => (
                        <div key={i} className="flex items-center gap-3 p-3 bg-green-wash border border-primary/20 rounded-apple">
                          <CheckCircle className="w-5 h-5 text-primary flex-shrink-0" />
                          <p className="text-subhead font-medium text-foreground">{opt}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Prevention */}
                {analysisResult.prevention_tips && analysisResult.prevention_tips.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-caption font-bold uppercase tracking-widest text-muted-foreground">{t.prevention}</h3>
                    <div className="space-y-2">
                      {(isHindi ? analysisResult.prevention_tips_hindi : analysisResult.prevention_tips).map((tip, i) => (
                        <div key={i} className="flex items-start gap-3 p-3 bg-muted rounded-apple border border-border">
                          <div className="w-2 h-2 rounded-full bg-muted-foreground mt-2 flex-shrink-0" />
                          <p className="text-subhead text-muted-foreground">{tip}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-3">
                  <Button
                    variant={isSaved ? "default" : "outline"}
                    className={cn(
                      "flex-1 h-12 rounded-apple border-2 transition-all",
                      isSaved && "bg-primary/10 text-primary border-primary/20 hover:bg-primary/20"
                    )}
                    disabled={isSaved}
                  >
                    {isSaved ? <CheckCircle className="mr-2 h-4 w-4" /> : <BookmarkPlus className="mr-2 h-4 w-4" />}
                    {isSaved ? (isHindi ? "सहेजा गया" : "Saved") : t.save}
                  </Button>
                  <Button variant="outline" className="flex-1 h-12 rounded-apple border-2 active:scale-[0.98]">
                    <Share2 className="mr-2 h-4 w-4" /> {t.share}
                  </Button>
                </div>

                {/* Scan Another */}
                <Button
                  variant="ghost"
                  className="w-full h-12 rounded-apple text-muted-foreground hover:text-foreground active:scale-[0.98]"
                  onClick={resetAnalysis}
                >
                  <RotateCcw className="mr-2 h-4 w-4" /> {t.scanAnother}
                </Button>
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
