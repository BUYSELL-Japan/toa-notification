import { useState, useEffect } from 'react';
import NotificationList from './components/NotificationList';
import { Settings, Save, BellRing } from 'lucide-react';

function App() {
  const [apiUrl, setApiUrl] = useState<string>('');
  const [tempUrl, setTempUrl] = useState<string>('');
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('api_url');
    if (saved) {
      setApiUrl(saved);
      setTempUrl(saved);
    } else {
      setShowSettings(true);
    }
  }, []);

  const handleSave = () => {
    // Basic cleanup of URL (remove trailing slash)
    const clean = tempUrl.replace(/\/$/, '');
    localStorage.setItem('api_url', clean);
    setApiUrl(clean);
    setShowSettings(false);
  };

  const handleLogout = () => {
    localStorage.removeItem('api_url');
    setApiUrl('');
    setTempUrl('');
    setShowSettings(true);
  };

  if (!apiUrl || showSettings) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white max-w-md w-full p-6 rounded-2xl shadow-lg">
          <div className="flex justify-center mb-6">
            <div className="bg-blue-100 p-3 rounded-full">
              <BellRing className="w-8 h-8 text-blue-600" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-center mb-2">初期設定</h1>
          <p className="text-gray-500 text-center mb-6 text-sm">
            Cloudflare WorkerのURLを入力してください。
            <br />
            (例: https://xxx.workers.dev)
          </p>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                API URL
              </label>
              <input
                type="url"
                value={tempUrl}
                onChange={(e) => setTempUrl(e.target.value)}
                placeholder="https://..."
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <button
              onClick={handleSave}
              disabled={!tempUrl}
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 flex justify-center items-center gap-2"
            >
              <Save className="w-5 h-5" />
              保存して開始
            </button>

            {apiUrl && (
              <button
                onClick={() => setShowSettings(false)}
                className="w-full text-gray-500 py-2 text-sm"
              >
                キャンセル
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 max-w-md mx-auto shadow-2xl min-h-[100dvh]">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-10 px-4 py-3 flex justify-between items-center shadow-sm">
        <h1 className="font-bold text-lg flex items-center gap-2">
          <BellRing className="w-5 h-5 text-blue-600" />
          Notification Center
        </h1>
        <button
          onClick={() => setShowSettings(true)}
          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full"
        >
          <Settings className="w-5 h-5" />
        </button>
      </header>

      {/* Main Content */}
      <main className="p-4">
        <NotificationList apiUrl={apiUrl} />
      </main>
    </div>
  );
}

export default App;
