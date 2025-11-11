function App() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full">
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
            PeerDrop
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Privacy-first peer-to-peer file transfer
          </p>
        </header>

        <main className="bg-gray-50 dark:bg-gray-800 rounded-lg shadow-lg p-8">
          <div className="text-center">
            <p className="text-gray-700 dark:text-gray-300">
              Initializing application...
            </p>
          </div>
        </main>

        <footer className="text-center mt-8 text-sm text-gray-500 dark:text-gray-400">
          <p>
            Files are transferred directly between browsers. Nothing stored on servers.
          </p>
        </footer>
      </div>
    </div>
  );
}

export default App;
