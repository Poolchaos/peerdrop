import { useState } from 'react';
import { usePeerDropStore } from './store/usePeerDropStore';
import { useWebRTC } from './hooks/useWebRTC';
import { FileDrop } from './components/FileDrop';

function App() {
  const { roomCode, connectionState, isConnected } = usePeerDropStore();
  const { createRoom, joinRoom, isSignalingConnected } = useWebRTC();
  const [inputRoomCode, setInputRoomCode] = useState('');

  const handleCreateRoom = () => {
    createRoom();
  };

  const handleJoinRoom = () => {
    if (inputRoomCode.trim()) {
      joinRoom(inputRoomCode.trim().toUpperCase());
    }
  };

  const getConnectionStatus = () => {
    if (!isSignalingConnected) return 'Connecting to signaling server...';
    if (!roomCode) return 'Ready';
    if (connectionState === 'connecting') return 'Establishing P2P connection...';
    if (connectionState === 'connected') return 'Connected';
    if (connectionState === 'failed') return 'Connection failed';
    return 'Waiting for peer...';
  };

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
          {/* Connection Status */}
          <div className="mb-6 p-4 bg-white dark:bg-gray-700 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Status:</span>
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {getConnectionStatus()}
              </span>
            </div>
            {isConnected && (
              <div className="mt-2 flex items-center text-sm">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                <span className="text-gray-600 dark:text-gray-400">P2P connection active</span>
              </div>
            )}
          </div>

          {/* Room Management */}
          {!roomCode ? (
            <div className="space-y-6">
              <div className="bg-white dark:bg-gray-700 rounded-lg p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                  Create a Room
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  Generate a room code to share with your peer
                </p>
                <button
                  onClick={handleCreateRoom}
                  disabled={!isSignalingConnected}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-3 px-4 rounded-lg transition-colors"
                >
                  Create Room
                </button>
              </div>

              <div className="text-center text-gray-500 dark:text-gray-400">
                <span>or</span>
              </div>

              <div className="bg-white dark:bg-gray-700 rounded-lg p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                  Join a Room
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  Enter the room code shared by your peer
                </p>
                <div className="space-y-3">
                  <input
                    type="text"
                    value={inputRoomCode}
                    onChange={(e) => setInputRoomCode(e.target.value.toUpperCase())}
                    placeholder="Enter room code"
                    maxLength={6}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={handleJoinRoom}
                    disabled={!isSignalingConnected || !inputRoomCode.trim()}
                    className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-medium py-3 px-4 rounded-lg transition-colors"
                  >
                    Join Room
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="bg-white dark:bg-gray-700 rounded-lg p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Room Code
                </h2>
                <div className="bg-gray-100 dark:bg-gray-900 rounded-lg p-4 mb-4">
                  <div className="text-3xl font-mono font-bold text-center text-gray-900 dark:text-white tracking-wider">
                    {roomCode}
                  </div>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
                  Share this code with your peer
                </p>
              </div>

              {isConnected && (
                <FileDrop className="w-full" />
              )}
            </div>
          )}
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

export { App };
