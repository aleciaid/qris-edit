import { useState, useRef, useEffect } from 'react';
import { Upload, Settings, Trash2, Plus } from 'lucide-react';
import ImageMerger from './components/ImageMerger';
import PrintLayout from './components/PrintLayout';
import SettingsModal, { SavedSettings, SETTINGS_KEY } from './components/SettingsModal';

interface QRISImage {
  id: string;
  file: File;
  preview: string;
}

function App() {
  const [qrisImages, setQrisImages] = useState<QRISImage[]>([]);
  const [mergedImages, setMergedImages] = useState<string[]>([]);
  const [imagesPerPage, setImagesPerPage] = useState<number>(2);
  const [savedSettings, setSavedSettings] = useState<SavedSettings | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const qrisInputRef = useRef<HTMLInputElement>(null);

  // Load saved settings from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(SETTINGS_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as SavedSettings;
        if (parsed.frameImage && parsed.areaConfig) {
          setSavedSettings(parsed);
        }
      } catch {
        // ignore
      }
    }
  }, []);

  const handleQrisUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const newQrisImages: QRISImage[] = files.map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      file,
      preview: URL.createObjectURL(file)
    }));
    setQrisImages(prev => [...prev, ...newQrisImages]);
  };

  const removeQrisImage = (id: string) => {
    setQrisImages(prev => {
      const image = prev.find(img => img.id === id);
      if (image) {
        URL.revokeObjectURL(image.preview);
      }
      return prev.filter(img => img.id !== id);
    });
  };

  const handleMergedImagesReady = (images: string[]) => {
    setMergedImages(images);
  };

  const handleSettingsSave = (settings: SavedSettings) => {
    setSavedSettings(settings);
    // Re-merge if we already have QRIS images
    setMergedImages([]);
  };

  const clearAll = () => {
    qrisImages.forEach(img => URL.revokeObjectURL(img.preview));
    setQrisImages([]);
    setMergedImages([]);
  };

  const hasSettings = savedSettings && savedSettings.frameImage && savedSettings.areaConfig;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-4xl font-bold text-slate-800 mb-1">QRIS Frame Merger</h1>
              <p className="text-slate-600">Gabungkan gambar QRIS ke dalam frame dan atur layout cetak</p>
            </div>
            <button
              onClick={() => setShowSettings(true)}
              className="px-5 py-2.5 bg-white text-slate-700 rounded-xl hover:bg-slate-50 transition-colors font-medium flex items-center gap-2 shadow-md border border-slate-200"
            >
              <Settings className="w-5 h-5" />
              Pengaturan
            </button>
          </div>

          {/* Settings status */}
          {!hasSettings && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 mb-8">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-amber-800 mb-1">⚠️ Pengaturan Belum Dikonfigurasi</h3>
                  <p className="text-amber-700 text-sm">
                    Silakan buka Pengaturan untuk upload frame template dan tandai area penempatan QRIS terlebih dahulu.
                  </p>
                </div>
                <button
                  onClick={() => setShowSettings(true)}
                  className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors font-medium text-sm whitespace-nowrap"
                >
                  Buka Pengaturan
                </button>
              </div>
            </div>
          )}

          {/* Settings summary when configured */}
          {hasSettings && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 mb-8">
              <div className="flex items-center gap-4">
                <img
                  src={savedSettings.frameImage}
                  alt="Frame"
                  className="w-16 h-20 object-cover rounded-lg border border-emerald-200 shadow-sm"
                />
                <div className="flex-1">
                  <h3 className="font-semibold text-emerald-800 text-sm">✅ Pengaturan Tersimpan</h3>
                  <p className="text-emerald-700 text-xs mt-0.5">
                    Frame & area QRIS sudah dikonfigurasi. Area: X:{savedSettings.areaConfig.x.toFixed(1)}% Y:{savedSettings.areaConfig.y.toFixed(1)}% W:{savedSettings.areaConfig.width.toFixed(1)}% H:{savedSettings.areaConfig.height.toFixed(1)}%
                  </p>
                </div>
                <button
                  onClick={() => setShowSettings(true)}
                  className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm font-medium"
                >
                  Ubah
                </button>
              </div>
            </div>
          )}

          {/* QRIS Upload */}
          <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
            <h2 className="text-xl font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <Plus className="w-5 h-5" />
              Upload QRIS Images ({qrisImages.length})
            </h2>

            <button
              onClick={() => qrisInputRef.current?.click()}
              className="w-full py-6 border-2 border-dashed border-slate-300 rounded-xl hover:border-green-500 hover:bg-green-50 transition-all flex flex-col items-center justify-center gap-2 mb-4 group"
            >
              <Upload className="w-10 h-10 text-slate-400 group-hover:text-green-500" />
              <span className="text-slate-600 group-hover:text-green-600 font-medium">Upload QRIS Images</span>
              <span className="text-sm text-slate-400">Bisa multiple files sekaligus</span>
            </button>

            <input
              ref={qrisInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleQrisUpload}
              className="hidden"
            />

            {qrisImages.length > 0 && (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3 max-h-80 overflow-y-auto">
                {qrisImages.map((img) => (
                  <div key={img.id} className="relative group">
                    <img
                      src={img.preview}
                      alt="QRIS"
                      className="w-full rounded-lg shadow border border-slate-200"
                    />
                    <button
                      onClick={() => removeQrisImage(img.id)}
                      className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Merge & Print */}
          {hasSettings && qrisImages.length > 0 && (
            <>
              <ImageMerger
                frameImage={savedSettings!.frameImage}
                qrisImages={qrisImages}
                areaConfig={savedSettings!.areaConfig}
                onMergedImagesReady={handleMergedImagesReady}
              />

              <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-slate-800">Layout Cetak</h2>
                  <div className="flex items-center gap-4">
                    <label className="text-slate-700 font-medium">Gambar per halaman:</label>
                    <select
                      value={imagesPerPage}
                      onChange={(e) => setImagesPerPage(Number(e.target.value))}
                      className="px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value={1}>1</option>
                      <option value={2}>2</option>
                      <option value={4}>4</option>
                      <option value={6}>6</option>
                    </select>
                  </div>
                </div>

                {mergedImages.length > 0 && (
                  <PrintLayout
                    mergedImages={mergedImages}
                    imagesPerPage={imagesPerPage}
                  />
                )}
              </div>

              <div className="flex justify-center gap-4 mb-8">
                <button
                  onClick={clearAll}
                  className="px-6 py-3 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors font-medium flex items-center gap-2"
                >
                  <Trash2 className="w-5 h-5" />
                  Clear All
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        savedSettings={savedSettings}
        onSave={handleSettingsSave}
      />
    </div>
  );
}

export default App;
