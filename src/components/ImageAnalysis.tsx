import { useState, useRef } from "react";
import { X, Camera, Upload, Volume2, BookmarkPlus, AlertTriangle, CheckCircle, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./ui/button";
import { Progress } from "./ui/progress";

type AnalysisState = "camera" | "uploading" | "result";

interface ImageAnalysisProps {
  isOpen: boolean;
  onClose: () => void;
  language: string;
}

interface DiseaseResult {
  name: string;
  nameLocal: string;
  confidence: number;
  severity: "low" | "medium" | "high";
  treatment: string[];
  treatmentLocal: string[];
}

const translations = {
  en: {
    takePhoto: "Take a photo of your crop",
    uploadPhoto: "Upload from gallery",
    analyzing: "Analyzing your crop...",
    confidence: "Confidence",
    severity: "Severity",
    low: "Low",
    medium: "Medium",
    high: "High",
    treatmentSteps: "Treatment Steps",
    hearAdvice: "Hear advice",
    saveToLibrary: "Save to library",
    scanAnother: "Scan another crop",
  },
  hi: {
    takePhoto: "अपनी फसल की फोटो लें",
    uploadPhoto: "गैलरी से अपलोड करें",
    analyzing: "आपकी फसल का विश्लेषण हो रहा है...",
    confidence: "विश्वास स्तर",
    severity: "गंभीरता",
    low: "कम",
    medium: "मध्यम",
    high: "अधिक",
    treatmentSteps: "उपचार के चरण",
    hearAdvice: "सलाह सुनें",
    saveToLibrary: "लाइब्रेरी में सहेजें",
    scanAnother: "दूसरी फसल स्कैन करें",
  },
};

const demoResult: DiseaseResult = {
  name: "Wheat Leaf Rust",
  nameLocal: "गेहूं का पत्ता जंग",
  confidence: 87,
  severity: "medium",
  treatment: [
    "Apply fungicide spray (Propiconazole)",
    "Remove infected leaves",
    "Improve air circulation",
    "Water at base, avoid wetting leaves",
  ],
  treatmentLocal: [
    "फफूंदनाशक स्प्रे करें (प्रोपिकोनाज़ोल)",
    "संक्रमित पत्तियां हटाएं",
    "हवा का प्रवाह बेहतर करें",
    "जड़ में पानी दें, पत्तियों को गीला न करें",
  ],
};

export function ImageAnalysis({ isOpen, onClose, language }: ImageAnalysisProps) {
  const [state, setState] = useState<AnalysisState>("camera");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const t = translations[language as keyof typeof translations] || translations.en;

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviewImage(e.target?.result as string);
        simulateUpload();
      };
      reader.readAsDataURL(file);
    }
  };

  const simulateUpload = () => {
    setState("uploading");
    setUploadProgress(0);
    
    const interval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(() => setState("result"), 500);
          return 100;
        }
        return prev + 10;
      });
    }, 200);
  };

  const handleCapture = () => {
    // Simulate camera capture with a demo image
    setPreviewImage("https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=400&h=300&fit=crop");
    simulateUpload();
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "low":
        return "text-success bg-success/10";
      case "medium":
        return "text-warning bg-warning/10";
      case "high":
        return "text-destructive bg-destructive/10";
      default:
        return "text-muted-foreground bg-muted";
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case "low":
        return CheckCircle;
      case "medium":
        return AlertTriangle;
      case "high":
        return AlertCircle;
      default:
        return AlertTriangle;
    }
  };

  const resetAnalysis = () => {
    setState("camera");
    setPreviewImage(null);
    setUploadProgress(0);
  };

  if (!isOpen) return null;

  const SeverityIcon = getSeverityIcon(demoResult.severity);

  return (
    <div className="fixed inset-0 z-50 bg-background animate-slide-in-right">
      {/* Header */}
      <div className="flex items-center justify-between p-4">
        <button
          onClick={onClose}
          className="p-3 rounded-full hover:bg-muted transition-colors focus:outline-none focus:ring-2 focus:ring-primary/30"
          aria-label="Close"
        >
          <X size={24} />
        </button>
        <h1 className="text-xl font-semibold">
          {language === "hi" ? "फसल स्कैनर" : "Crop Scanner"}
        </h1>
        <div className="w-12" />
      </div>

      {/* Camera State */}
      {state === "camera" && (
        <div className="flex flex-col items-center justify-center px-6 py-12 space-y-8 animate-fade-in">
          {/* Camera Preview Area */}
          <div className="relative w-full max-w-sm aspect-[4/3] bg-muted rounded-2xl border-2 border-dashed border-border flex items-center justify-center overflow-hidden">
            {/* Leaf outline guide */}
            <svg
              viewBox="0 0 100 100"
              className="w-32 h-32 text-primary/30"
              fill="none"
              stroke="currentColor"
              strokeWidth="1"
            >
              <path d="M50 10 C20 30 20 70 50 90 C80 70 80 30 50 10" />
              <path d="M50 10 L50 90" />
            </svg>
            <p className="absolute bottom-4 text-muted-foreground text-sm">
              {language === "hi" ? "पत्ती यहाँ रखें" : "Position leaf here"}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="w-full max-w-sm space-y-4">
            <Button
              onClick={handleCapture}
              className="w-full h-16 text-lg gap-3"
            >
              <Camera size={24} />
              {t.takePhoto}
            </Button>

            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              className="w-full h-16 text-lg gap-3"
            >
              <Upload size={24} />
              {t.uploadPhoto}
            </Button>
            
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>
        </div>
      )}

      {/* Uploading State */}
      {state === "uploading" && (
        <div className="flex flex-col items-center justify-center px-6 py-12 space-y-8 animate-fade-in">
          {previewImage && (
            <div className="w-full max-w-sm aspect-[4/3] rounded-2xl overflow-hidden">
              <img
                src={previewImage}
                alt="Crop preview"
                className="w-full h-full object-cover"
              />
            </div>
          )}
          
          <div className="w-full max-w-sm space-y-4">
            <Progress value={uploadProgress} className="h-3" />
            <p className="text-center text-lg text-muted-foreground">
              {t.analyzing}
            </p>
          </div>
        </div>
      )}

      {/* Result State */}
      {state === "result" && (
        <div className="px-6 py-4 pb-24 space-y-6 overflow-y-auto animate-fade-in" style={{ maxHeight: "calc(100vh - 80px)" }}>
          {/* Image Preview */}
          {previewImage && (
            <div className="w-full aspect-video rounded-2xl overflow-hidden">
              <img
                src={previewImage}
                alt="Analyzed crop"
                className="w-full h-full object-cover"
              />
            </div>
          )}

          {/* Disease Name */}
          <div className="text-center">
            <h2 className="text-2xl font-bold text-foreground">
              {language === "hi" ? demoResult.nameLocal : demoResult.name}
            </h2>
          </div>

          {/* Confidence & Severity */}
          <div className="flex gap-4">
            <div className="flex-1 bg-card rounded-xl p-4 border border-border">
              <p className="text-sm text-muted-foreground mb-1">{t.confidence}</p>
              <p className="text-2xl font-bold text-primary">{demoResult.confidence}%</p>
            </div>
            <div className={cn("flex-1 rounded-xl p-4", getSeverityColor(demoResult.severity))}>
              <p className="text-sm opacity-80 mb-1">{t.severity}</p>
              <div className="flex items-center gap-2">
                <SeverityIcon size={24} />
                <span className="text-xl font-bold">
                  {t[demoResult.severity as keyof typeof t]}
                </span>
              </div>
            </div>
          </div>

          {/* Voice Button */}
          <Button className="w-full h-16 text-lg gap-3">
            <Volume2 size={24} />
            {t.hearAdvice}
          </Button>

          {/* Treatment Steps */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold">{t.treatmentSteps}</h3>
            {(language === "hi" ? demoResult.treatmentLocal : demoResult.treatment).map((step, index) => (
              <div
                key={index}
                className="flex gap-4 bg-card rounded-xl p-4 border border-border"
              >
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                  {index + 1}
                </div>
                <p className="flex-1 pt-2">{step}</p>
              </div>
            ))}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              className="flex-1 h-14 gap-2"
              onClick={() => {}}
            >
              <BookmarkPlus size={20} />
              {t.saveToLibrary}
            </Button>
            <Button
              variant="secondary"
              className="flex-1 h-14"
              onClick={resetAnalysis}
            >
              {t.scanAnother}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
