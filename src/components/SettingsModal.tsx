import { useState, useRef, useEffect } from 'react';
import { Settings, X, Upload, Download, Save, Trash2, CheckCircle, AlertCircle } from 'lucide-react';
import AreaSelector, { AreaConfig } from './AreaSelector';

export interface SavedSettings {
    frameImage: string;
    areaConfig: AreaConfig;
}

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    savedSettings: SavedSettings | null;
    onSave: (settings: SavedSettings) => void;
}

const SETTINGS_KEY = 'qris-merger-settings';

function SettingsModal({ isOpen, onClose, savedSettings, onSave }: SettingsModalProps) {
    const [frameImage, setFrameImage] = useState<string | null>(null);
    const [areaConfig, setAreaConfig] = useState<AreaConfig | null>(null);
    const [saveSuccess, setSaveSuccess] = useState(false);
    const frameInputRef = useRef<HTMLInputElement>(null);
    const importInputRef = useRef<HTMLInputElement>(null);

    // Load current saved settings when modal opens
    useEffect(() => {
        if (isOpen && savedSettings) {
            setFrameImage(savedSettings.frameImage);
            setAreaConfig(savedSettings.areaConfig);
        } else if (isOpen && !savedSettings) {
            // Try loading from localStorage
            const saved = localStorage.getItem(SETTINGS_KEY);
            if (saved) {
                try {
                    const parsed = JSON.parse(saved) as SavedSettings;
                    setFrameImage(parsed.frameImage);
                    setAreaConfig(parsed.areaConfig);
                } catch {
                    // ignore
                }
            }
        }
        setSaveSuccess(false);
    }, [isOpen, savedSettings]);

    const handleFrameUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                setFrameImage(event.target?.result as string);
                // Reset area when frame changes
                setAreaConfig(null);
                setSaveSuccess(false);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSave = () => {
        if (!frameImage || !areaConfig) return;

        const settings: SavedSettings = {
            frameImage,
            areaConfig,
        };

        // Save to localStorage
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));

        // Notify parent
        onSave(settings);
        setSaveSuccess(true);

        // Auto-hide success message
        setTimeout(() => setSaveSuccess(false), 3000);
    };

    const handleExportConfig = () => {
        if (!areaConfig || !frameImage) return;

        const exportData = {
            areaConfig,
            exportedAt: new Date().toISOString(),
        };
        const data = JSON.stringify(exportData, null, 2);
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = 'qris-area-config.json';
        link.href = url;
        link.click();
        URL.revokeObjectURL(url);
    };

    const handleImportConfig = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const data = JSON.parse(event.target?.result as string);
                const config = data.areaConfig || data;
                if (
                    typeof config.x === 'number' &&
                    typeof config.y === 'number' &&
                    typeof config.width === 'number' &&
                    typeof config.height === 'number'
                ) {
                    setAreaConfig(config);
                    setSaveSuccess(false);
                } else {
                    alert('Format file tidak valid.');
                }
            } catch {
                alert('Gagal membaca file. Pastikan file adalah JSON yang valid.');
            }
        };
        reader.readAsText(file);

        if (importInputRef.current) {
            importInputRef.current.value = '';
        }
    };

    const handleRemoveFrame = () => {
        setFrameImage(null);
        setAreaConfig(null);
        setSaveSuccess(false);
    };

    const canSave = frameImage && areaConfig && areaConfig.width > 1 && areaConfig.height > 1;

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto">
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/50 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-3xl mx-4 my-8 z-10">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-200">
                    <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
                        <Settings className="w-6 h-6 text-slate-600" />
                        Pengaturan
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                    >
                        <X className="w-5 h-5 text-slate-500" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-6 max-h-[calc(100vh-200px)] overflow-y-auto">
                    {/* Section: Frame Template */}
                    <div>
                        <h3 className="text-lg font-semibold text-slate-700 mb-3">1. Frame Template</h3>
                        <p className="text-sm text-slate-500 mb-3">Upload gambar frame yang akan digunakan sebagai template QRIS.</p>

                        {!frameImage ? (
                            <button
                                onClick={() => frameInputRef.current?.click()}
                                className="w-full py-8 border-2 border-dashed border-slate-300 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all flex flex-col items-center justify-center gap-3 group"
                            >
                                <Upload className="w-10 h-10 text-slate-400 group-hover:text-blue-500" />
                                <span className="text-slate-600 group-hover:text-blue-600 font-medium">Upload Frame Template</span>
                                <span className="text-sm text-slate-400">JPG, PNG, atau WebP</span>
                            </button>
                        ) : (
                            <div className="relative w-48">
                                <img src={frameImage} alt="Frame" className="w-full rounded-lg shadow-md border border-slate-200" />
                                <button
                                    onClick={handleRemoveFrame}
                                    className="absolute top-2 right-2 bg-red-500 text-white p-1.5 rounded-full hover:bg-red-600 transition-colors shadow-md"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        )}

                        <input
                            ref={frameInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleFrameUpload}
                            className="hidden"
                        />
                    </div>

                    {/* Divider */}
                    <hr className="border-slate-200" />

                    {/* Section: Area QRIS */}
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <div>
                                <h3 className="text-lg font-semibold text-slate-700">2. Tandai Area QRIS</h3>
                                <p className="text-sm text-slate-500 mt-1">Klik dan drag pada frame untuk menentukan area penempatan QRIS.</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => importInputRef.current?.click()}
                                    className="px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors text-sm font-medium flex items-center gap-1.5"
                                    title="Import konfigurasi area"
                                >
                                    <Upload className="w-3.5 h-3.5" />
                                    Import
                                </button>
                                <input
                                    ref={importInputRef}
                                    type="file"
                                    accept=".json"
                                    onChange={handleImportConfig}
                                    className="hidden"
                                />
                                <button
                                    onClick={handleExportConfig}
                                    disabled={!areaConfig}
                                    className="px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 transition-colors text-sm font-medium flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
                                    title="Export konfigurasi area"
                                >
                                    <Download className="w-3.5 h-3.5" />
                                    Export
                                </button>
                            </div>
                        </div>

                        {frameImage ? (
                            <AreaSelector
                                frameImage={frameImage}
                                areaConfig={areaConfig}
                                onAreaChange={(area) => {
                                    setAreaConfig(area);
                                    setSaveSuccess(false);
                                }}
                            />
                        ) : (
                            <div className="py-8 border-2 border-dashed border-slate-200 rounded-xl text-center">
                                <p className="text-slate-400 text-sm">Upload frame template terlebih dahulu</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-slate-200 flex items-center justify-between">
                    <div>
                        {saveSuccess && (
                            <div className="flex items-center gap-2 text-emerald-600 text-sm font-medium animate-fade-in">
                                <CheckCircle className="w-4 h-4" />
                                Pengaturan berhasil disimpan!
                            </div>
                        )}
                        {!canSave && frameImage && !saveSuccess && (
                            <div className="flex items-center gap-2 text-amber-600 text-sm">
                                <AlertCircle className="w-4 h-4" />
                                Tandai area QRIS terlebih dahulu
                            </div>
                        )}
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={onClose}
                            className="px-5 py-2.5 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors font-medium"
                        >
                            Tutup
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={!canSave}
                            className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed shadow-md"
                        >
                            <Save className="w-4 h-4" />
                            Simpan
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default SettingsModal;
export { SETTINGS_KEY };
