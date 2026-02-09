import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Volume2, VolumeX, Bird, Activity, Camera, Search, Upload, ScanLine } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useApp } from '@/contexts/AppContext';

type Mode = 'bird' | 'plant' | 'live_plant';
type SubMode = 'camera' | 'search';

export default function BirdDetectorPage() {
    const { setIsImageOpen } = useApp();
    const [mode, setMode] = useState<Mode>('bird');
    const [subMode, setSubMode] = useState<SubMode>('camera');
    const [isMuted, setIsMuted] = useState(false);

    // Status for Bird/Plant detection
    const [status, setStatus] = useState<'safe' | 'detected'>('safe');
    const [plantStatus, setPlantStatus] = useState<any>(null); // For live plant data

    const [lastDetected, setLastDetected] = useState<string | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [videoFile, setVideoFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);

    interface Alert {
        id: string;
        timestamp: string;
        thumbnail: string;
        details: string;
        confidence: number;
        type?: 'bird' | 'plant';
    }
    const [alerts, setAlerts] = useState<Alert[]>([]);

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setVideoFile(file);
        setIsUploading(true);

        try {
            const formData = new FormData();
            formData.append('file', file);

            const response = await fetch('http://localhost:8000/api/bird/upload', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || 'Upload failed');
            }

            setIsConnected(true);
        } catch (error) {
            console.error('Upload error:', error);
            setVideoFile(null);
            alert('Failed to upload video. Make sure the backend is running.');
        } finally {
            setIsUploading(false);
        }
    };

    // Connection Check
    useEffect(() => {
        const checkConnection = async () => {
            try {
                // Check based on mode
                const endpoint = mode === 'live_plant' ? 'plant' : 'bird';
                const res = await fetch(`http://localhost:8000/api/${endpoint}/health`);
                if (res.ok) setIsConnected(true);
            } catch (e) {
                console.log("Backend not reachable yet");
                setIsConnected(false);
            }
        };
        const interval = setInterval(checkConnection, 2000);
        checkConnection();
        return () => clearInterval(interval);
    }, [mode]);

    // Polling for status
    useEffect(() => {
        if ((mode !== 'bird' && mode !== 'live_plant') || !isConnected) return;

        const pollStatus = async () => {
            try {
                const endpoint = mode === 'live_plant' ? 'plant/status' : 'bird/status';
                const res = await fetch(`http://localhost:8000/api/${endpoint}`);
                const data = await res.json();

                if (mode === 'live_plant') {
                    setPlantStatus(data);
                }

                if (data.detected) {
                    setStatus('detected');
                    setLastDetected(new Date().toLocaleTimeString());

                    // Add detection to alerts if new matching criteria
                    // Simple throttle by checking recent alerts or status change
                    const isNewEvent = status !== 'detected' || (mode === 'live_plant' && data.status !== plantStatus?.status);

                    if (isNewEvent && (Date.now() - (parseInt(alerts[0]?.id) || 0) > 2000)) {
                        const thumbnailSrc = data.thumbnail
                            ? `data:image/jpeg;base64,${data.thumbnail}`
                            : (mode === 'bird'
                                ? "https://images.unsplash.com/photo-1552728089-57bdde30ebd1?q=80&w=200&auto=format&fit=crop"
                                : "https://images.unsplash.com/photo-1518977676651-71fa272b4052?q=80&w=200&auto=format&fit=crop"); // Plant placeholder

                        const details = mode === 'bird' ? "Bird Detected" : `${data.crop}: ${data.status}`;

                        setAlerts(prev => [
                            {
                                id: Date.now().toString(),
                                timestamp: new Date().toLocaleTimeString(),
                                thumbnail: thumbnailSrc,
                                details: details,
                                confidence: data.confidence || 0.95,
                                type: (mode === 'bird' ? 'bird' : 'plant') as 'bird' | 'plant'
                            },
                            ...prev
                        ].slice(0, 50));
                    }

                    if (mode === 'bird' && !isMuted && data.alert_active) {
                        playBuzzer();
                    }
                } else {
                    setStatus('safe');
                }
            } catch (e) {
                // Ignore poll errors
            }
        };

        const interval = setInterval(pollStatus, 500);
        return () => clearInterval(interval);
    }, [isConnected, isMuted, mode, status, plantStatus]);

    // Cleanup live stream when switching away
    useEffect(() => {
        return () => {
            // Optional: Stop stream if needed, but keeping it warm might be better for UX
            // fetch('http://localhost:8000/api/plant/stop', { method: 'POST' }).catch(e => console.error(e));
        };
    }, [mode]);

    // Advanced bird-scaring siren using AudioContext
    const playBuzzer = () => {
        if (!audioContextRef.current) {
            audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
        const ctx = audioContextRef.current;
        const currentTime = ctx.currentTime;

        const osc1 = ctx.createOscillator();
        const gain1 = ctx.createGain();
        osc1.type = 'sawtooth';
        osc1.frequency.setValueAtTime(2000, currentTime);
        osc1.frequency.exponentialRampToValueAtTime(4000, currentTime + 0.15);
        gain1.gain.setValueAtTime(0.4, currentTime);
        gain1.gain.exponentialRampToValueAtTime(0.01, currentTime + 0.55);
        osc1.connect(gain1);
        gain1.connect(ctx.destination);
        osc1.start(currentTime);
        osc1.stop(currentTime + 0.6);
    };

    return (
        <div className="flex flex-col min-h-screen bg-background">
            {/* Header */}
            <header className="px-5 py-4 bg-background/80 backdrop-blur-xl border-b border-border/50 sticky top-0 z-50">
                <div className="flex items-center justify-between mb-4">
                    <Link to="/" className="w-10 h-10 flex items-center justify-center rounded-xl bg-muted/50 hover:bg-muted transition-colors">
                        <ArrowLeft size={20} className="text-foreground" />
                    </Link>

                    <div className="flex flex-col items-center">
                        <h1 className="text-xl font-bold text-foreground">
                            {mode === 'bird' ? 'Scarecrow' : (mode === 'live_plant' ? 'Live Analysis' : 'Photo Check')}
                        </h1>
                    </div>

                    <button
                        onClick={() => setIsMuted(!isMuted)}
                        className={cn(
                            "w-10 h-10 flex items-center justify-center rounded-xl transition-all",
                            mode === 'bird' ? "" : "invisible",
                            isMuted ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"
                        )}
                        disabled={mode !== 'bird'}
                    >
                        {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
                    </button>
                </div>

                {/* Mode Toggle */}
                <div className="flex justify-center mb-2">
                    <div className="bg-muted/50 p-1 rounded-full flex gap-1">
                        <button
                            onClick={() => setMode('plant')}
                            className={cn(
                                "h-10 px-4 rounded-full flex items-center justify-center gap-2 transition-all font-medium text-sm",
                                mode === 'plant' ? "bg-white shadow-sm text-primary" : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            <Camera size={18} />
                            Photo
                        </button>
                        <button
                            onClick={() => setMode('live_plant')}
                            className={cn(
                                "h-10 px-4 rounded-full flex items-center justify-center gap-2 transition-all font-medium text-sm",
                                mode === 'live_plant' ? "bg-white shadow-sm text-primary" : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            <ScanLine size={18} />
                            Live
                        </button>
                        <button
                            onClick={() => setMode('bird')}
                            className={cn(
                                "h-10 px-4 rounded-full flex items-center justify-center gap-2 transition-all font-medium text-sm",
                                mode === 'bird' ? "bg-white shadow-sm text-primary" : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            <Bird size={18} />
                            Bird
                        </button>
                    </div>
                </div>

                {/* Secondary Toggle (Only in Photo/Plant Mode) */}
                {mode === 'plant' && (
                    <div className="flex justify-center animate-in fade-in slide-in-from-top-2 duration-300">
                        <div className="bg-muted/30 p-1 rounded-full flex gap-1 scale-90">
                            <button
                                onClick={() => setSubMode('camera')}
                                className={cn(
                                    "w-10 h-8 rounded-full flex items-center justify-center transition-all",
                                    subMode === 'camera' ? "bg-white shadow-sm text-primary" : "text-muted-foreground hover:text-foreground"
                                )}
                            >
                                <Camera size={16} />
                            </button>
                            <button
                                onClick={() => setSubMode('search')}
                                className={cn(
                                    "w-10 h-8 rounded-full flex items-center justify-center transition-all",
                                    subMode === 'search' ? "bg-white shadow-sm text-primary" : "text-muted-foreground hover:text-foreground"
                                )}
                            >
                                <Search size={16} />
                            </button>
                        </div>
                    </div>
                )}
            </header>

            <main className="flex-1 px-5 pt-5 pb-24 w-full max-w-[1600px] mx-auto">
                {mode === 'bird' || mode === 'live_plant' ? (
                    <div className="grid grid-cols-1 lg:grid-cols-[70fr_30fr] gap-8 items-start">
                        {/* Left Column: Video & Controls */}
                        <div className="space-y-6">

                            {/* Video Feed */}
                            <div className={cn(
                                "rounded-2xl overflow-hidden bg-black aspect-video relative shadow-lg group transition-all duration-300",
                                status === 'detected'
                                    ? (mode === 'bird' ? "border-4 border-red-500 shadow-red-500/20" : "border-4 border-yellow-500 shadow-yellow-500/20")
                                    : "border border-border/50"
                            )}>
                                {mode === 'bird' && !videoFile ? (
                                    <div className="absolute inset-0 flex flex-col items-center justify-center text-white/50 gap-4 bg-muted/10">
                                        <div className="p-4 rounded-full bg-white/5 border border-white/10">
                                            <Upload size={32} className="text-white/70" />
                                        </div>
                                        <div className="text-center">
                                            <h3 className="text-lg font-semibold text-white/90">Upload Video for Analysis</h3>
                                            <p className="text-sm text-white/50 mt-1 max-w-[200px]">Select a video file to detect birds</p>
                                        </div>
                                        <label className="cursor-pointer px-6 py-2.5 rounded-xl bg-primary text-white font-semibold hover:bg-primary/90 transition-all active:scale-95 shadow-lg shadow-primary/20">
                                            <span>Select Video</span>
                                            <input
                                                type="file"
                                                className="hidden"
                                                accept="video/*"
                                                onChange={handleFileUpload}
                                            />
                                        </label>
                                    </div>
                                ) : (
                                    (mode === 'bird' && isUploading) ? (
                                        <div className="absolute inset-0 flex flex-col items-center justify-center text-white/50 gap-3">
                                            <Activity size={32} className="animate-pulse text-primary" />
                                            <p className="text-sm font-medium">Processing Video...</p>
                                        </div>
                                    ) : (
                                        <img
                                            src={mode === 'live_plant' ? 'http://localhost:8000/api/plant/feed' : 'http://localhost:8000/api/bird/feed'}
                                            alt="Processed Video Feed"
                                            className="w-full h-full object-cover"
                                            onError={(e) => {
                                                // Handle broken image link (stream retry)
                                                (e.target as HTMLImageElement).src = `http://localhost:8000/api/${mode === 'live_plant' ? 'plant' : 'bird'}/feed?t=${Date.now()}`;
                                            }}
                                        />
                                    )
                                )}

                                {/* Overlay Badges */}
                                <div className="absolute top-4 left-4 flex gap-2">
                                    <div className="px-2 py-1 rounded-md bg-black/60 backdrop-blur-md flex items-center gap-2">
                                        <div className={cn("w-2 h-2 rounded-full animate-pulse", mode === 'bird' ? 'bg-red-500' : 'bg-[#76b900]')} />
                                        <span className="text-xs font-bold text-white uppercase tracking-wider">{mode === 'bird' ? 'Bird Watch' : 'Live Analysis'}</span>
                                    </div>
                                    <div className="px-2 py-1 rounded-md bg-black/60 backdrop-blur-md">
                                        <span className="text-xs font-mono text-white/80">YOLOv8n</span>
                                    </div>
                                </div>

                                {/* Plant Mode Overlay Status */}
                                {mode === 'live_plant' && status === 'detected' && plantStatus && (
                                    <div className="absolute bottom-4 left-4 right-4 bg-black/70 backdrop-blur-md rounded-xl p-3 border border-white/10 flex items-center justify-between animate-in slide-in-from-bottom-2">
                                        <div>
                                            <div className="text-xs text-white/60 mb-0.5">{plantStatus?.crop || "Detecting..."}</div>
                                            <div className={cn("text-lg font-bold", plantStatus?.is_healthy ? "text-green-400" : "text-yellow-400")}>
                                                {plantStatus?.status || "Analyzing..."}
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-xs text-white/60 mb-0.5">Confidence</div>
                                            <div className="text-lg font-mono text-white">{plantStatus?.confidence ? plantStatus.confidence.toFixed(0) : 0}%</div>
                                        </div>
                                    </div>
                                )}

                                {videoFile && !isUploading && mode === 'bird' && (
                                    <button
                                        onClick={async () => {
                                            try { await fetch('http://localhost:8000/api/bird/reset', { method: 'POST' }); } catch (e) { }
                                            setVideoFile(null);
                                            setIsConnected(false);
                                            setStatus('safe');
                                            setAlerts([]);
                                        }}
                                        className="absolute top-4 right-4 p-2 rounded-full bg-black/60 text-white/70 hover:text-white hover:bg-black/80 backdrop-blur-md transition-all z-10"
                                    >
                                        <Search size={16} className="rotate-45" />
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Right Column: Recent Alerts Panel */}
                        <div className="h-[calc(100vh-180px)] sticky top-24 min-h-[400px]">
                            <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden h-full flex flex-col">
                                <div className="px-5 py-4 border-b border-border/50 flex items-center justify-between bg-muted/30 flex-shrink-0">
                                    <h3 className="font-bold text-foreground flex items-center gap-2">
                                        <Activity size={18} className="text-primary" />
                                        Activity Log
                                    </h3>
                                    <span className="text-xs font-mono text-muted-foreground bg-background px-2 py-1 rounded-md border border-border/50">
                                        {alerts.length} Events
                                    </span>
                                </div>

                                <div className="flex-1 overflow-y-auto p-2 space-y-2 scrollbar-thin scrollbar-thumb-border hover:scrollbar-thumb-muted-foreground/50">
                                    {alerts.length > 0 ? (
                                        alerts.map((alert) => (
                                            <div key={alert.id} className="flex gap-3 p-2 rounded-xl hover:bg-muted/50 transition-colors group">
                                                <div className="w-20 h-14 rounded-lg bg-black/10 overflow-hidden flex-shrink-0 relative">
                                                    <img src={alert.thumbnail} alt="Alert" className="w-full h-full object-cover" />
                                                    <div className={cn("absolute inset-0 mix-blend-overlay", alert.type === 'bird' ? 'bg-red-500/10' : 'bg-green-500/10')} />
                                                </div>

                                                <div className="flex-1 min-w-0 flex flex-col justify-center">
                                                    <div className="flex items-center justify-between mb-1">
                                                        <span className={cn("text-xs font-bold px-1.5 py-0.5 rounded flex items-center gap-1", alert.type === 'bird' ? 'text-red-600 bg-red-50 dark:bg-red-900/20' : 'text-green-600 bg-green-50 dark:bg-green-900/20')}>
                                                            {(alert.confidence * 100).toFixed(0)}%
                                                        </span>
                                                        <span className="text-[10px] text-muted-foreground font-mono">
                                                            {alert.timestamp}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-1.5">
                                                        <div className={cn("w-1.5 h-1.5 rounded-full animate-pulse", alert.type === 'bird' ? 'bg-red-500' : 'bg-green-500')} />
                                                        <span className="text-sm font-medium text-foreground truncate">{alert.details}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="h-full flex flex-col items-center justify-center text-muted-foreground text-sm gap-2 opacity-60">
                                            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                                                <Activity size={24} />
                                            </div>
                                            No activity detected yet
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    /* Plant Photo Scanner UI (EXISTING) */
                    <div className="max-w-lg mx-auto flex flex-col items-center justify-center gap-8 py-10 animate-in fade-in zoom-in-95 duration-300">
                        {/* Frame Area */}
                        <div className="w-full aspect-[4/3] rounded-3xl border-2 border-dashed border-primary/30 bg-muted/20 flex flex-col items-center justify-center gap-4 relative overflow-hidden group hover:border-primary/50 transition-colors">
                            <div className="w-16 h-16 rounded-full bg-white shadow-sm flex items-center justify-center text-primary mb-2">
                                <Camera size={32} strokeWidth={1.5} />
                            </div>
                            <div className="text-center">
                                <h3 className="text-lg font-semibold text-foreground">Position leaf in frame</h3>
                                <p className="text-sm text-muted-foreground mt-1">JPG, PNG (max 10MB)</p>
                            </div>

                            {/* Scanning Animation (Cosmetic) */}
                            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/5 to-transparent -translate-y-full group-hover:translate-y-full transition-transform duration-1000 ease-in-out" />
                        </div>

                        {/* Actions */}
                        <div className="w-full space-y-3">
                            <button
                                onClick={() => setIsImageOpen(true)}
                                className="w-full py-4 rounded-xl bg-[#76b900] hover:bg-[#5da600] text-white font-semibold shadow-lg shadow-green-500/20 active:scale-95 transition-all flex items-center justify-center gap-2"
                            >
                                <Camera size={20} />
                                Take Photo
                            </button>
                            <button
                                onClick={() => setIsImageOpen(true)}
                                className="w-full py-4 rounded-xl bg-white border border-border hover:bg-muted font-semibold text-foreground shadow-sm active:scale-95 transition-all flex items-center justify-center gap-2"
                            >
                                <Upload size={20} className="text-muted-foreground" />
                                Upload from Gallery
                            </button>
                        </div>
                    </div>
                )}

            </main>
        </div>
    );
}
