
import './App.css';

function App() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-white font-bold text-xl">V</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  Voxora Chat Simulation
                </h1>
                <p className="text-slate-600">Test environment for developers</p>
              </div>
            </div>
            <div className="flex items-center space-x-2 bg-green-50 px-3 py-2 rounded-full">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm text-green-700 font-medium">Environment Active</span>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-16 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-6 leading-tight">
            This is Voxora Widget Simulator
            <span className="block bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Code. Test. Deploy. Contribute.
            </span>
          </h2>
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-8 shadow-lg border border-slate-200 max-w-2xl mx-auto">
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold mt-0.5">
                  1
                </div>
                <div>
                  <p className="text-slate-700">
                    <span className="font-semibold">Getting Started:</span> Modify{' '}
                    <code className="bg-slate-100 px-2 py-1 rounded text-sm">apps/chat-simulation/index.html</code>{' '}
                    and put your script tag here
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-sm font-bold mt-0.5">
                  2
                </div>
                <div>
                  <p className="text-slate-700">
                    <span className="font-semibold text-red-600">Important:</span> Do not push <b>chat-simulation</b> changes to github
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>




      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-8 px-6">
        <div className="max-w-6xl mx-auto text-center">
          <div className="flex items-center justify-center space-x-4 mb-4">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">V</span>
            </div>
            <span className="text-lg font-semibold text-slate-900">Voxora</span>
          </div>
          <p className="text-slate-600 mb-2">Chat Widget Test Environment</p>
          <p className="text-sm text-slate-500">
            Perfect your chat widget before deploying to production
          </p>
        </div>
      </footer>
    </div>
  );
}

export default App;