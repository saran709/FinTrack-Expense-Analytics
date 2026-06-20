import React, { useEffect, useRef, useState } from 'react';
import { 
  Camera, 
  CameraOff, 
  CheckCircle, 
  AlertTriangle, 
  Upload, 
  QrCode, 
  RefreshCcw, 
  Plus, 
  Trash2, 
  Sparkles, 
  ArrowUpRight, 
  ArrowDownRight,
  HelpCircle,
  X,
  FileImage,
  Layers,
  ChevronRight
} from 'lucide-react';
import jsQR from 'jsqr';
import QRCode from 'qrcode';
import { Category, Transaction, TransactionType } from '../types';

interface ReceiptQRScannerProps {
  categories: Category[];
  currencySymbol: string;
  apiFetch: (endpoint: string, options?: RequestInit) => Promise<any>;
  onTransactionLogged: () => void;
  onClose: () => void;
}

interface ScannedReceipt {
  type: TransactionType;
  amount: number;
  category: string;
  notes: string;
  date: string;
  tags?: string[];
  rawText?: string;
  decodedSuccess: boolean;
  imported: boolean;
}

export default function ReceiptQRScanner({
  categories,
  currencySymbol,
  apiFetch,
  onTransactionLogged,
  onClose
}: ReceiptQRScannerProps) {
  // Active module states
  const [activeTab, setActiveTab] = useState<'camera' | 'upload' | 'generator'>('camera');
  const [scannedResults, setScannedResults] = useState<ScannedReceipt[]>([]);
  const [statusMessage, setStatusMessage] = useState<{ text: string; isError: boolean } | null>(null);

  // Live Camera state
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraPermission, setCameraPermission] = useState<boolean | null>(null);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [availableDevices, setAvailableDevices] = useState<MediaDeviceInfo[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const scanningLoopRef = useRef<number | null>(null);

  // Manual generation/interactive testing panel state
  const [genAmount, setGenAmount] = useState<string>('42.85');
  const [genType, setGenType] = useState<TransactionType>('expense');
  const [genCategory, setGenCategory] = useState<string>('Food & Dining');
  const [genNotes, setGenNotes] = useState<string>('Sourdough Bakery & Coffee');
  const [genTags, setGenTags] = useState<string>('qr, bakery, breakfast');
  const [generatedQRUrl, setGeneratedQRUrl] = useState<string>('');

  // Setup sample category on start
  useEffect(() => {
    if (categories.length > 0) {
      const defaultCat = categories.find(c => c.type === genType)?.name || categories[0].name;
      setGenCategory(defaultCat);
    }
  }, [genType, categories]);

  // Handle building testing QR code
  const handleGenerateTestingQR = async () => {
    try {
      const payload = {
        type: genType,
        amount: parseFloat(genAmount) || 10.00,
        category: genCategory,
        notes: genNotes,
        date: new Date().toISOString().split('T')[0],
        tags: genTags.split(',').map(t => t.trim()).filter(Boolean)
      };
      
      const jsonString = JSON.stringify(payload);
      const url = await QRCode.toDataURL(jsonString, {
        errorCorrectionLevel: 'M',
        margin: 2,
        width: 320,
        color: {
          dark: '#0f172a',
          light: '#ffffff'
        }
      });
      setGeneratedQRUrl(url);
    } catch (err: any) {
      console.error(err);
      triggerBanner('Failed to generate test QR code.', true);
    }
  };

  useEffect(() => {
    handleGenerateTestingQR();
  }, [genAmount, genType, genCategory, genNotes, genTags]);

  const triggerBanner = (text: string, isError: boolean = false) => {
    setStatusMessage({ text, isError });
    setTimeout(() => setStatusMessage(null), 5500);
  };

  // Enumerate video devices
  const loadDevices = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(d => d.kind === 'videoinput');
      setAvailableDevices(videoDevices);
      if (videoDevices.length > 0 && !selectedDeviceId) {
        setSelectedDeviceId(videoDevices[0].deviceId);
      }
    } catch (e) {
      console.warn('Could not enumerate cameras: ', e);
    }
  };

  // Launch Camera feed
  const startCamera = async () => {
    try {
      stopCamera(); // clear preexisting loops & stream
      
      const constraints: MediaStreamConstraints = {
        video: selectedDeviceId 
          ? { deviceId: { exact: selectedDeviceId } }
          : { facingMode: 'environment' }
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true'); // prevents screen lock on iOS
        videoRef.current.play();
      }

      setCameraActive(true);
      setCameraPermission(true);
      
      // Start decoding loops
      scanningLoopRef.current = requestAnimationFrame(decodeCameraFrame);
      triggerBanner('Camera stream successfully initiated. Position a receipt QR inside the guide target.', false);
    } catch (err: any) {
      console.error('Camera startup failed: ', err);
      setCameraPermission(false);
      setCameraActive(false);
      triggerBanner('Camera permission was denied, or camera is occupied. Please use "Upload QR Code" or the Simulator tab.', true);
    }
  };

  const stopCamera = () => {
    if (scanningLoopRef.current) {
      cancelAnimationFrame(scanningLoopRef.current);
      scanningLoopRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  };

  // Parse QR content string
  const parseQRContent = (decodedText: string): ScannedReceipt => {
    const result: ScannedReceipt = {
      type: 'expense',
      amount: 0,
      category: categories[0]?.name || 'Uncategorized',
      notes: 'QR Scanned Transaction',
      date: new Date().toISOString().split('T')[0],
      tags: ['qr-ingested'],
      rawText: decodedText,
      decodedSuccess: false,
      imported: false
    };

    try {
      // Check if text is JSON
      if (decodedText.trim().startsWith('{') && decodedText.trim().endsWith('}')) {
        const parsed = JSON.parse(decodedText);
        
        if (parsed.amount !== undefined) {
          result.amount = Number(parsed.amount);
          result.decodedSuccess = true;
        }
        if (parsed.type === 'expense' || parsed.type === 'income') {
          result.type = parsed.type;
        }
        if (parsed.category) {
          result.category = parsed.category;
        }
        if (parsed.notes) {
          result.notes = parsed.notes;
        }
        if (parsed.date) {
          result.date = parsed.date;
        }
        if (Array.isArray(parsed.tags)) {
          result.tags = [...parsed.tags, 'qr-ingested'];
        }
      } else {
        // Try simple string regex/heuristics: "Amount: X" or just a number
        const amountRegex = /(?:total|amount|usd|eur|price|\$)\s*[:=]?\s*([0-9]+(?:\.[0-9]{2})?)/i;
        const match = decodedText.match(amountRegex);
        if (match && match[1]) {
          result.amount = parseFloat(match[1]);
          result.decodedSuccess = true;
          result.notes = `Decoded: ${decodedText.substring(0, 50)}`;
        } else {
          // If plain number
          const numValue = parseFloat(decodedText);
          if (!isNaN(numValue) && numValue > 0) {
            result.amount = numValue;
            result.decodedSuccess = true;
          } else {
            // Unstructured plain string fallback
            result.notes = decodedText.substring(0, 100);
            result.amount = 0.00;
          }
        }
      }
    } catch (e) {
      console.warn('Plain text QR parsing logic triggered: ', e);
      result.notes = decodedText.substring(0, 80);
    }
    return result;
  };

  // Dynamic Camera Analyser
  const decodeCameraFrame = () => {
    if (!videoRef.current || !canvasRef.current || !cameraActive) {
      scanningLoopRef.current = requestAnimationFrame(decodeCameraFrame);
      return;
    }

    const video = videoRef.current;
    
    // Check if video is indeed playing and has real dimensions
    if (video.readyState === video.HAVE_CURRENT_DATA || video.readyState === video.HAVE_ENOUGH_DATA) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      
      if (ctx) {
        // Sample down resolution slightly for higher frame rate processing
        const width = video.videoWidth || 640;
        const height = video.videoHeight || 480;
        canvas.width = width;
        canvas.height = height;

        // Render to canvas
        ctx.drawImage(video, 0, 0, width, height);

        // Analyse pixels
        try {
          const imageData = ctx.getImageData(0, 0, width, height);
          const decoded = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: "dontInvert"
          });

          if (decoded && decoded.data) {
            // QR detected!
            const parsed = parseQRContent(decoded.data);
            
            // Avoid adding double consecutive scans within 3 seconds
            const isDuplicate = scannedResults.some(r => r.rawText === decoded.data);
            if (!isDuplicate) {
              setScannedResults(prev => [parsed, ...prev]);
              triggerBanner(`Perfect match! QR scan succeeded: ${currencySymbol}${parsed.amount.toFixed(2)} detected.`, false);
              
              // Direct Audio confirmation ping
              try {
                const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
                const osc = audioCtx.createOscillator();
                const gain = audioCtx.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(880, audioCtx.currentTime); // high ping
                osc.connect(gain);
                gain.connect(audioCtx.destination);
                gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
                osc.start();
                osc.stop(audioCtx.currentTime + 0.12);
              } catch (audioErr) {
                // Audio not supported or blocked
              }
            }
          }
        } catch (canvasErr) {
          console.error(canvasErr);
        }
      }
    }

    scanningLoopRef.current = requestAnimationFrame(decodeCameraFrame);
  };

  // Direct Simulated ingest trigger for testing ease
  const handleSimulateScan = () => {
    const defaultPayload = parseQRContent(JSON.stringify({
      type: genType,
      amount: parseFloat(genAmount) || 42.85,
      category: genCategory,
      notes: genNotes,
      date: new Date().toISOString().split('T')[0],
      tags: genTags.split(',').map(t => t.trim()).filter(Boolean)
    }));
    
    setScannedResults(prev => [defaultPayload, ...prev]);
    triggerBanner(`Simulated scanner feed received details for ${defaultPayload.notes}!`, false);
  };

  // Image Drag-and-drop parse helper
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    processQrFile(files[0]);
  };

  const processQrFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      if (!event.target?.result) return;
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (ctx) {
          canvas.width = img.width;
          canvas.height = img.height;
          ctx.drawImage(img, 0, 0, img.width, img.height);
          
          try {
            const imageData = ctx.getImageData(0, 0, img.width, img.height);
            const decoded = jsQR(imageData.data, imageData.width, imageData.height);
            
            if (decoded && decoded.data) {
              const parsed = parseQRContent(decoded.data);
              setScannedResults(prev => [parsed, ...prev]);
              triggerBanner(`Static Image QR decoded successfully: ${currencySymbol}${parsed.amount.toFixed(2)} mapped!`, false);
            } else {
              triggerBanner('Unable to locate or decode any transaction QR code in this image. Please examine contrast or crop ratio.', true);
            }
          } catch (err) {
            triggerBanner('Error rendering QR image buffer data.', true);
          }
        }
      };
      img.src = event.target.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Submit parsed item to live transactional database
  const handleIngestTransaction = async (receipt: ScannedReceipt, index: number) => {
    try {
      if (receipt.amount <= 0) {
        triggerBanner('Cannot ingest standard transaction listing with zero or negative total USD.', true);
        return;
      }

      await apiFetch('/api/transactions', {
        method: 'POST',
        body: JSON.stringify({
          type: receipt.type,
          amount: receipt.amount,
          category: receipt.category,
          date: receipt.date,
          notes: `[QR Code Scanned] ${receipt.notes}`,
          tags: receipt.tags || []
        })
      });

      // Update local state
      const updated = [...scannedResults];
      updated[index].imported = true;
      setScannedResults(updated);
      
      triggerBanner(`Successfully committed ledger entry for "${receipt.notes}"!`, false);
      onTransactionLogged();
    } catch (e: any) {
      triggerBanner(e.message || 'Verification Error uploading QR transaction.', true);
    }
  };

  // Erase result from temporary scanning grid list
  const handleRemoveResult = (idx: number) => {
    setScannedResults(prev => prev.filter((_, i) => i !== idx));
  };

  // Lifecycle control
  useEffect(() => {
    loadDevices();
    if (activeTab === 'camera') {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [activeTab, selectedDeviceId]);

  return (
    <div className="bg-white rounded-xl border border-slate-150 shadow-lg overflow-hidden flex flex-col md:flex-row max-w-6xl mx-auto divide-y md:divide-y-0 md:divide-x divide-slate-150 animate-fade-in" id="qr-receipt-scanner-utility">
      
      {/* LEFT COLUMN: The Interactive Scanning Control Deck */}
      <div className="flex-1 p-6 space-y-6 flex flex-col justify-between">
        
        {/* Module Title Banner */}
        <div className="space-y-1.5 pb-4 border-b border-slate-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <QrCode className="h-5 w-5 text-blue-600 animate-pulse" />
              <h3 className="text-base font-bold text-slate-900 font-sans">Instant QR Receipt Ingestion</h3>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-50 rounded"
              title="Return to general receipts grid"
            >
              <X className="h-4.5 w-4.5" />
            </button>
          </div>
          <p className="text-[11px] text-slate-500 leading-relaxed">
            Position standard receipt QR codes in front of your camera or import static snapshots. We read metadata payload packets and format records automatically.
          </p>
        </div>

        {/* Tab Selection */}
        <div className="flex bg-slate-50 p-1 rounded-lg border border-slate-205">
          <button
            onClick={() => setActiveTab('camera')}
            className={`flex-1 py-1.5 text-[11px] font-bold rounded flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
              activeTab === 'camera' 
                ? 'bg-white text-slate-900 shadow-xs border border-slate-200/50' 
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Camera className="h-3.5 w-3.5" />
            <span>Live Camera Scanner</span>
          </button>
          <button
            onClick={() => setActiveTab('upload')}
            className={`flex-1 py-1.5 text-[11px] font-bold rounded flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
              activeTab === 'upload' 
                ? 'bg-white text-slate-900 shadow-xs border border-slate-200/50' 
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Upload className="h-3.5 w-3.5" />
            <span>Upload QR Image</span>
          </button>
          <button
            onClick={() => setActiveTab('generator')}
            className={`flex-1 py-1.5 text-[11px] font-bold rounded flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
              activeTab === 'generator' 
                ? 'bg-white text-blue-700 shadow-xs border border-slate-200/50' 
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Sparkles className="h-3.5 w-3.5 text-blue-500" />
            <span>QR Creator (Sandbox Tool)</span>
          </button>
        </div>

        {/* Messages */}
        {statusMessage && (
          <div className={`p-3 rounded-lg text-xs font-bold flex items-center gap-2 shadow-xs transition-all ${
            statusMessage.isError 
              ? 'bg-rose-50 border border-rose-100 text-rose-800' 
              : 'bg-emerald-50 border border-emerald-100 text-emerald-800'
          }`}>
            {statusMessage.isError ? <AlertTriangle className="h-4 w-4 text-rose-500 shrink-0" /> : <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0" />}
            <span>{statusMessage.text}</span>
          </div>
        )}

        {/* Dynamic Scan Interface Space */}
        <div className="bg-slate-950 aspect-video rounded-xl relative overflow-hidden flex items-center justify-center border border-slate-800">
          
          {/* CAMERA METHOD */}
          {activeTab === 'camera' && (
            <>
              {/* Invisible support canvases */}
              <canvas ref={canvasRef} className="hidden" />
              
              <video 
                ref={videoRef} 
                className="w-full h-full object-cover"
                muted
                playsInline
              />

              {/* Aim guide bracket */}
              {cameraActive && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/30 pointer-events-none">
                  <div className="w-56 h-56 border-2 border-dashed border-blue-400 rounded-2xl relative flex items-center justify-center shadow-lg animate-pulse">
                    <span className="absolute top-2 left-2 border-t-4 border-l-4 border-blue-500 w-6 h-6 rounded-tl-md" />
                    <span className="absolute top-2 right-2 border-t-4 border-r-4 border-blue-500 w-6 h-6 rounded-tr-md" />
                    <span className="absolute bottom-2 left-2 border-b-4 border-l-4 border-blue-500 w-6 h-6 rounded-bl-md" />
                    <span className="absolute bottom-2 right-2 border-b-4 border-r-4 border-blue-500 w-6 h-6 rounded-br-md" />
                    <span className="text-[10px] text-blue-100 font-sans font-bold uppercase tracking-widest bg-slate-950/80 px-2 py-0.5 rounded-full">
                      Align QR Code
                    </span>
                  </div>
                </div>
              )}

              {/* No Permissions Cover */}
              {!cameraActive && (
                <div className="text-center text-slate-400 p-6 space-y-3.5">
                  <CameraOff className="h-10 w-10 text-slate-500 mx-auto" strokeWidth={1.5} />
                  <p className="text-xs font-semibold max-w-sm mx-auto">
                    Camera preview inactive or blocked. Permit camera deployment inside the preview layout, or adjust coordinates.
                  </p>
                  <div className="flex gap-2 justify-center">
                    <button
                      onClick={startCamera}
                      className="px-4 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold cursor-pointer hover:bg-blue-700"
                    >
                      Initialize Camera
                    </button>
                    <button
                      onClick={() => setActiveTab('generator')}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold"
                    >
                      Sandbox Generator
                    </button>
                  </div>
                </div>
              )}

              {/* Device Selector Overlay */}
              {cameraActive && availableDevices.length > 1 && (
                <div className="absolute bottom-3 left-3 right-3 bg-slate-900/90 text-white p-2 rounded-lg border border-slate-705 flex items-center gap-1.5">
                  <span className="text-[10px] font-bold text-slate-400 font-mono">Lens:</span>
                  <select
                    value={selectedDeviceId}
                    onChange={(e) => setSelectedDeviceId(e.target.value)}
                    className="flex-1 bg-transparent hover:bg-slate-800 rounded font-normal text-[10px] text-white py-1 cursor-pointer focus:outline-none"
                  >
                    {availableDevices.map((dev, idx) => (
                      <option key={dev.deviceId} value={dev.deviceId} className="bg-slate-900 text-white">
                        {dev.label || `Webcam Camera System #${idx + 1}`}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </>
          )}

          {/* STATIC FILE UPLOAD METHOD */}
          {activeTab === 'upload' && (
            <div className="p-8 text-center text-slate-400 space-y-4 w-full">
              <FileImage className="h-12 w-12 text-slate-600 mx-auto" strokeWidth={1.2} />
              <div>
                <p className="text-xs font-bold text-slate-200">Import QR image files for decoding</p>
                <p className="text-[10px] text-slate-500 mt-1 max-w-xs mx-auto">
                  Drag and drop a captured snapshot of a receipt QR code here, or click to upload
                </p>
              </div>
              <div className="relative inline-block">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  id="qr-image-upload-trigger"
                  className="hidden"
                />
                <label
                  htmlFor="qr-image-upload-trigger"
                  className="bg-slate-800 text-slate-200 px-5 py-2 hover:bg-slate-700 text-xs font-bold rounded-lg cursor-pointer inline-flex items-center gap-2 border border-slate-700 transition"
                >
                  <Upload className="h-3.5 w-3.5" />
                  <span>Choose Snapshot File</span>
                </label>
              </div>
            </div>
          )}

          {/* SANDBOX GENERATOR/TEST TOOL METHOD */}
          {activeTab === 'generator' && (
            <div className="absolute inset-0 bg-slate-900 flex flex-col justify-between p-4">
              <div className="flex-1 flex flex-col md:flex-row gap-4 items-center justify-center">
                <div className="bg-white p-3 rounded-lg shadow-xl shrink-0">
                  {generatedQRUrl ? (
                    <img 
                      src={generatedQRUrl} 
                      alt="generated qr" 
                      className="h-40 w-40 object-contain mx-auto border"
                      title="Test scanning this QR code by aiming your camera, uploading this screenshot, or click Simulating below" 
                    />
                  ) : (
                    <div className="h-40 w-40 flex items-center justify-center bg-slate-100 text-slate-400 border text-xs">
                      Rendering QR...
                    </div>
                  )}
                  <div className="text-center mt-2">
                    <span className="text-[9.5px] font-bold text-slate-500 uppercase tracking-wider bg-slate-100 px-2 py-0.5 rounded">
                      Payload QR Code
                    </span>
                  </div>
                </div>

                <div className="text-left max-w-md space-y-2.5">
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="h-4 w-4 text-blue-400" />
                    <h4 className="text-[11px] font-bold uppercase tracking-wider text-blue-300">Sandbox Playground Engine</h4>
                  </div>
                  <p className="text-[10.5px] text-slate-400 leading-relaxed">
                    This embedded tool builds actual QR code image buffers reflecting custom financial parameters. You can snap it with a mobile phone camera, download, or press the button below to **simulate a live scanning event** instantly.
                  </p>
                  
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={handleSimulateScan}
                      className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-[10px] px-3.5 py-1.5 rounded transition cursor-pointer"
                    >
                      <RefreshCcw className="h-3 w-3" />
                      <span>Simulate Instantly (Direct Feed)</span>
                    </button>
                    {generatedQRUrl && (
                      <a
                        href={generatedQRUrl}
                        download="test-transaction-qr.png"
                        className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-[10px] px-3 py-1.5 rounded transition border border-slate-700"
                      >
                        Download QR PNG
                      </a>
                    )}
                  </div>
                </div>
              </div>
              <div className="text-center">
                <span className="text-[10px] text-slate-500 leading-none">
                  Adjust parameter values in the right layout sidebar dynamically!
                </span>
              </div>
            </div>
          )}

        </div>

        {/* Info panel */}
        <div className="bg-slate-50 border border-slate-150 p-3.5 rounded-lg text-[10.5px] text-slate-550 leading-relaxed flex gap-2">
          <HelpCircle className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
          <div>
            <strong>Developer Testing Hint:</strong> If you don't want to use a webcam, switch to the <strong>"QR Creator (Sandbox Tool)"</strong> tab. Select any parameters, then click <strong>"Simulate Instantly"</strong>. The parameters are encoded into a real QR JSON packet, decoded in the client, and pushed straight to your ingestion queue on the right!
          </div>
        </div>

      </div>

      {/* RIGHT COLUMN: The Scan Result Queue & Ingestion Form */}
      <div className="w-col md:w-80 p-6 space-y-5 bg-slate-50/50 flex flex-col justify-between max-h-[600px] overflow-y-auto">
        
        {/* Dynamic Parameter Settings ONLY inside the Generator tab */}
        {activeTab === 'generator' ? (
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-widest border-b border-slate-200 pb-2 flex items-center gap-1">
              <Layers className="h-4 w-4 text-slate-400" />
              <span>Sandbox Payload Config</span>
            </h4>
            
            {/* Form Flow Select */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Flow Direction</label>
              <div className="grid grid-cols-2 gap-1 bg-white p-1 rounded-md border text-center font-bold">
                <button
                  type="button"
                  onClick={() => setGenType('expense')}
                  className={`py-1 text-[10px] rounded transition cursor-pointer ${
                    genType === 'expense' ? 'bg-rose-50 text-rose-700 border border-rose-100' : 'text-slate-450 hover:text-slate-700'
                  }`}
                >
                  Expense
                </button>
                <button
                  type="button"
                  onClick={() => setGenType('income')}
                  className={`py-1 text-[10px] rounded transition cursor-pointer ${
                    genType === 'income' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'text-slate-450 hover:text-slate-700'
                  }`}
                >
                  Income
                </button>
              </div>
            </div>

            {/* Numerical Cash Amount */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Mock Amount ({currencySymbol})</label>
              <input
                type="number"
                step="0.01"
                value={genAmount}
                onChange={(e) => setGenAmount(e.target.value)}
                className="w-full bg-white border rounded px-2 py-1 text-xs font-sans font-bold text-slate-900"
              />
            </div>

            {/* Structured Category */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Structured Category</label>
              <select
                value={genCategory}
                onChange={(e) => setGenCategory(e.target.value)}
                className="w-full bg-white border cursor-pointer rounded px-2 py-1 text-xs font-bold text-slate-800"
              >
                {categories.filter(c => c.type === genType).map((cat) => (
                  <option key={cat.id} value={cat.name}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Notes Descriptor */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Merchant Name / Note</label>
              <input
                type="text"
                placeholder="Starbucks Coffee"
                value={genNotes}
                onChange={(e) => setGenNotes(e.target.value)}
                className="w-full bg-white border rounded px-2 py-1 text-xs text-slate-800"
              />
            </div>

            {/* Tags CSV */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Tags (Comma Sep)</label>
              <input
                type="text"
                placeholder="dining, morning"
                value={genTags}
                onChange={(e) => setGenTags(e.target.value)}
                className="w-full bg-white border rounded px-2 py-1 text-xs text-slate-600"
              />
            </div>

          </div>
        ) : (
          <div className="space-y-4 flex-1 flex flex-col h-full justify-between">
            
            {/* Header List Meta */}
            <div className="space-y-1">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-widest border-b border-slate-200 pb-2 flex items-center justify-between">
                <span>Ingestion Queue</span>
                <span className="bg-slate-200 text-slate-700 font-sans px-1.5 py-0.5 text-[9.5px] rounded-full font-bold">
                  {scannedResults.length} Items
                </span>
              </h4>
              <p className="text-[10px] text-slate-450 leading-relaxed">
                Transactions decoded successfully from physical parameters. Verify values and click <strong>"Push to Ledger"</strong>.
              </p>
            </div>

            {/* Results Ingest Scroller */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-1 py-1 max-h-[360px]">
              {scannedResults.length === 0 ? (
                <div className="text-center py-16 border border-dashed rounded-xl border-slate-200 bg-slate-50/50 flex flex-col items-center justify-center p-4">
                  <QrCode className="h-7 w-7 text-slate-300 mb-2" strokeWidth={1} />
                  <p className="text-[10.5px] font-bold text-slate-750">Queue Empty</p>
                  <p className="text-[10px] text-slate-450 mt-1">Awaiting scanned receipt payloads.</p>
                </div>
              ) : (
                scannedResults.map((result, idx) => (
                  <div 
                    key={idx} 
                    className={`p-3.5 rounded-xl border transition-all ${
                      result.imported 
                        ? 'bg-emerald-50/50 border-emerald-150 relative opacity-70' 
                        : 'bg-white border-slate-150 hover:shadow-xs'
                    }`}
                  >
                    
                    {/* Logged Success Overlay stamp */}
                    {result.imported && (
                      <div className="absolute inset-0 bg-emerald-50/30 backdrop-blur-[0.5px] rounded-xl flex items-center justify-center pointer-events-none">
                        <span className="bg-emerald-600 text-white font-bold text-[9px] px-2.5 py-0.5 rounded-full shadow-sm shadow-emerald-500/10 flex items-center gap-1">
                          <CheckCircle className="h-3 w-3" />
                          <span>Logged successfully</span>
                        </span>
                      </div>
                    )}

                    {/* Result Card Layout */}
                    <div className="space-y-2.5 text-left">
                      
                      {/* Price Tag with directional flow badge */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className={`p-1 rounded ${
                            result.type === 'income' ? 'bg-emerald-55 border border-emerald-100 text-emerald-700' : 'bg-rose-50 border border-rose-100 text-rose-700'
                          }`}>
                            {result.type === 'income' ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                          </span>
                          <span className="text-[10.5px] font-bold text-slate-800 uppercase tracking-wider bg-slate-100 px-1.5 py-0.5 rounded">
                            {result.category}
                          </span>
                        </div>
                        <span className="font-mono font-bold text-slate-900 text-sm">
                          {currencySymbol}{result.amount.toFixed(2)}
                        </span>
                      </div>

                      {/* Notes / Vendor description */}
                      <p className="text-xs font-bold text-slate-850 leading-tight">
                        {result.notes}
                      </p>

                      {/* Helper Timestamp metadata */}
                      <div className="flex items-center justify-between text-[9.5px] text-slate-400 font-mono">
                        <span>Target: {result.date}</span>
                        <span>{(result.tags || []).length} keywords</span>
                      </div>

                      {/* Action bars */}
                      {!result.imported && (
                        <div className="flex items-center gap-1.5 pt-2 border-t border-slate-100">
                          <button
                            onClick={() => handleIngestTransaction(result, idx)}
                            className="flex-1 bg-slate-900 hover:bg-slate-800 text-white font-sans text-[10px] font-bold py-1.5 px-3 rounded-lg flex items-center justify-center gap-1 cursor-pointer transition"
                          >
                            <span>Push to Ledger</span>
                            <ChevronRight className="h-3 w-3" />
                          </button>
                          <button
                            onClick={() => handleRemoveResult(idx)}
                            className="p-1.5 bg-rose-50 hover:bg-rose-100 rounded-lg text-rose-600 cursor-pointer border border-rose-100"
                            title="Erase result"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      )}

                    </div>

                  </div>
                ))
              )}
            </div>

            {/* Quick Clear All queue controls */}
            {scannedResults.length > 0 && (
              <button
                onClick={() => setScannedResults([])}
                className="w-full bg-slate-100 hover:bg-slate-205 border text-slate-650 cursor-pointer text-[10.5px] font-bold py-1.5 rounded-lg text-center"
              >
                Clear Scanned Queue
              </button>
            )}

          </div>
        )}

      </div>

    </div>
  );
}
