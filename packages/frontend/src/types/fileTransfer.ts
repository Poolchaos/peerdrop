export interface FileChunk {
  id: string;
  chunkIndex: number;
  totalChunks: number;
  data: ArrayBuffer;
  hash: string;
}

export interface FileTransferMessage {
  type: 'file-offer' | 'file-accept' | 'file-reject' | 'chunk' | 'chunk-ack' | 'transfer-complete' | 'transfer-error';
  payload: unknown;
}

export interface FileOffer {
  fileId: string;
  name: string;
  size: number;
  type: string;
  totalChunks: number;
  hash: string;
}

export interface FileAccept {
  fileId: string;
}

export interface FileReject {
  fileId: string;
  reason: string;
}

export interface ChunkMessage {
  fileId: string;
  chunkIndex: number;
  data: ArrayBuffer;
  hash: string;
}

export interface ChunkAck {
  fileId: string;
  chunkIndex: number;
}

export interface TransferComplete {
  fileId: string;
  receivedChunks: number;
  totalSize: number;
  finalHash: string;
}

export interface TransferError {
  fileId: string;
  error: string;
  chunkIndex?: number;
}