import { usePeerDropStore } from '../store/usePeerDropStore';
import type {
  FileTransferMessage,
  FileOffer,
  FileAccept,
  FileReject,
  ChunkMessage,
  ChunkAck,
  TransferComplete,
  TransferError,
} from '../types/fileTransfer';

const CHUNK_SIZE = 16 * 1024; // 16KB chunks
const MAX_CONCURRENT_CHUNKS = 3; // Send max 3 chunks concurrently
const CHUNK_TIMEOUT = 5000; // 5 seconds timeout for chunk ACK

export function useFileTransfer() {
  const {
    dataChannel,
    setCurrentFile,
    setTransferState,
    setTransferProgress,
    setTransferSpeed,
  } = usePeerDropStore();

  // File sending state
  const pendingChunks = new Map<number, { timeout: number; retries: number }>();
  const sentChunks = new Set<number>();
  const receivedAcks = new Set<number>();

  // File receiving state
  const receivingFiles = new Map<string, {
    metadata: FileOffer;
    chunks: Map<number, ArrayBuffer>;
    receivedCount: number;
  }>();

  const calculateFileHash = async (file: File): Promise<string> => {
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    return Array.from(new Uint8Array(hashBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  };

  const calculateChunkHash = async (chunk: ArrayBuffer): Promise<string> => {
    const hashBuffer = await crypto.subtle.digest('SHA-256', chunk);
    return Array.from(new Uint8Array(hashBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  };

  const sendMessage = (message: FileTransferMessage) => {
    if (dataChannel?.readyState === 'open') {
      dataChannel.send(JSON.stringify(message));
    }
  };

  const sendFileOffer = async (file: File) => {
    if (!dataChannel || dataChannel.readyState !== 'open') {
      throw new Error('Data channel not ready');
    }

    setTransferState('sending');
    setTransferProgress(0);

    const fileHash = await calculateFileHash(file);
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);

    const offer: FileOffer = {
      fileId: crypto.randomUUID(),
      name: file.name,
      size: file.size,
      type: file.type,
      totalChunks,
      hash: fileHash,
    };

    setCurrentFile({
      name: file.name,
      size: file.size,
      type: file.type,
      totalChunks,
    });

    sendMessage({
      type: 'file-offer',
      payload: offer,
    });

    // Start sending chunks after offer
    startFileSending(file, offer);
  };

  const startFileSending = async (file: File, offer: FileOffer) => {
    const startTime = Date.now();
    let sentBytes = 0;

    for (let chunkIndex = 0; chunkIndex < offer.totalChunks; chunkIndex++) {
      // Wait if we have too many pending chunks
      while (pendingChunks.size >= MAX_CONCURRENT_CHUNKS) {
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      const start = chunkIndex * CHUNK_SIZE;
      const end = Math.min(start + CHUNK_SIZE, file.size);
      const chunkData = file.slice(start, end);
      const chunkBuffer = await chunkData.arrayBuffer();
      const chunkHash = await calculateChunkHash(chunkBuffer);

      const chunkMessage: ChunkMessage = {
        fileId: offer.fileId,
        chunkIndex,
        data: chunkBuffer,
        hash: chunkHash,
      };

      sendMessage({
        type: 'chunk',
        payload: chunkMessage,
      });

      sentChunks.add(chunkIndex);
      sentBytes += chunkBuffer.byteLength;

      // Track pending chunk with timeout
      const timeout = window.setTimeout(() => {
        handleChunkTimeout(offer.fileId, chunkIndex);
      }, CHUNK_TIMEOUT);

      pendingChunks.set(chunkIndex, { timeout, retries: 0 });

      // Update progress
      const progress = (sentBytes / file.size) * 100;
      setTransferProgress(progress);

      // Update speed
      const elapsed = (Date.now() - startTime) / 1000;
      const speed = sentBytes / elapsed; // bytes per second
      setTransferSpeed(speed);
    }
  };

  const handleChunkTimeout = (fileId: string, chunkIndex: number) => {
    const pending = pendingChunks.get(chunkIndex);
    if (!pending) return;

    if (pending.retries < 2) {
      // Retry chunk
      pending.retries++;
      const timeout = window.setTimeout(() => {
        handleChunkTimeout(fileId, chunkIndex);
      }, CHUNK_TIMEOUT);

      pendingChunks.set(chunkIndex, { timeout, retries: pending.retries });

      // Resend chunk logic would go here
      console.warn(`Retrying chunk ${chunkIndex} (attempt ${pending.retries + 1})`);
    } else {
      // Give up on this chunk
      pendingChunks.delete(chunkIndex);
      sendMessage({
        type: 'transfer-error',
        payload: {
          fileId,
          error: `Chunk ${chunkIndex} failed after retries`,
          chunkIndex,
        } as TransferError,
      });
    }
  };

  const handleMessage = (event: MessageEvent) => {
    try {
      const message: FileTransferMessage = JSON.parse(event.data);

      switch (message.type) {
        case 'file-offer':
          handleFileOffer(message.payload as FileOffer);
          break;
        case 'file-accept':
          handleFileAccept(message.payload as FileAccept);
          break;
        case 'file-reject':
          handleFileReject(message.payload as FileReject);
          break;
        case 'chunk':
          handleChunk(message.payload as ChunkMessage);
          break;
        case 'chunk-ack':
          handleChunkAck(message.payload as ChunkAck);
          break;
        case 'transfer-complete':
          handleTransferComplete(message.payload as TransferComplete);
          break;
        case 'transfer-error':
          handleTransferError(message.payload as TransferError);
          break;
      }
    } catch (error) {
      console.error('Error handling file transfer message:', error);
    }
  };

  const handleFileOffer = (offer: FileOffer) => {
    setCurrentFile({
      name: offer.name,
      size: offer.size,
      type: offer.type,
      totalChunks: offer.totalChunks,
    });

    // Auto-accept for now (in real implementation, show user prompt)
    sendMessage({
      type: 'file-accept',
      payload: { fileId: offer.fileId } as FileAccept,
    });

    // Initialize receiving state
    receivingFiles.set(offer.fileId, {
      metadata: offer,
      chunks: new Map(),
      receivedCount: 0,
    });

    setTransferState('receiving');
    setTransferProgress(0);
  };

  const handleFileAccept = (accept: FileAccept) => {
    console.log('File offer accepted:', accept.fileId);
  };

  const handleFileReject = (reject: FileReject) => {
    console.log('File offer rejected:', reject.fileId, reject.reason);
    setTransferState('error');
  };

  const handleChunk = async (chunk: ChunkMessage) => {
    const receiving = receivingFiles.get(chunk.fileId);
    if (!receiving) return;

    // Verify chunk hash
    const calculatedHash = await calculateChunkHash(chunk.data);
    if (calculatedHash !== chunk.hash) {
      console.error('Chunk hash mismatch:', chunk.chunkIndex);
      return;
    }

    // Store chunk
    receiving.chunks.set(chunk.chunkIndex, chunk.data);
    receiving.receivedCount++;

    // Send ACK
    sendMessage({
      type: 'chunk-ack',
      payload: {
        fileId: chunk.fileId,
        chunkIndex: chunk.chunkIndex,
      } as ChunkAck,
    });

    // Update progress
    const progress = (receiving.receivedCount / receiving.metadata.totalChunks) * 100;
    setTransferProgress(progress);

    // Check if transfer complete
    if (receiving.receivedCount === receiving.metadata.totalChunks) {
      await completeFileReceiving(chunk.fileId);
    }
  };

  const handleChunkAck = (ack: ChunkAck) => {
    const pending = pendingChunks.get(ack.chunkIndex);
    if (pending) {
      window.clearTimeout(pending.timeout);
      pendingChunks.delete(ack.chunkIndex);
      receivedAcks.add(ack.chunkIndex);
    }
  };

  const handleTransferComplete = (complete: TransferComplete) => {
    console.log('Transfer completed:', complete);
    setTransferState('complete');
    setTransferProgress(100);
  };

  const handleTransferError = (error: TransferError) => {
    console.error('Transfer error:', error);
    setTransferState('error');
  };

  const completeFileReceiving = async (fileId: string) => {
    const receiving = receivingFiles.get(fileId);
    if (!receiving) return;

    // Reconstruct file from chunks
    const sortedChunks = Array.from(receiving.chunks.entries())
      .sort(([a], [b]) => a - b)
      .map(([, data]) => data);

    const totalSize = sortedChunks.reduce((sum, chunk) => sum + chunk.byteLength, 0);
    const fileBuffer = new Uint8Array(totalSize);

    let offset = 0;
    for (const chunk of sortedChunks) {
      fileBuffer.set(new Uint8Array(chunk), offset);
      offset += chunk.byteLength;
    }

    // Verify file hash
    const fileHash = await calculateFileHash(new File([fileBuffer], receiving.metadata.name));

    if (fileHash === receiving.metadata.hash) {
      // Create download link
      const blob = new Blob([fileBuffer], { type: receiving.metadata.type });
      const url = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      a.download = receiving.metadata.name;
      a.click();

      URL.revokeObjectURL(url);

      sendMessage({
        type: 'transfer-complete',
        payload: {
          fileId,
          receivedChunks: receiving.receivedCount,
          totalSize,
          finalHash: fileHash,
        } as TransferComplete,
      });

      setTransferState('complete');
    } else {
      sendMessage({
        type: 'transfer-error',
        payload: {
          fileId,
          error: 'File hash verification failed',
        } as TransferError,
      });
      setTransferState('error');
    }

    receivingFiles.delete(fileId);
  };

  return {
    sendFileOffer,
    handleMessage,
  };
}