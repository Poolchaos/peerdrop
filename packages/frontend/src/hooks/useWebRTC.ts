import { useEffect, useRef } from 'react';
import { usePeerDropStore } from '../store/usePeerDropStore';
import { signalingClient } from '../services/SignalingClient';
import type { SignalingMessage } from '../types';

const STUN_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];

const RTC_CONFIG: RTCConfiguration = {
  iceServers: STUN_SERVERS,
};

export function useWebRTC() {
  const {
    setPeerConnection,
    setDataChannel,
    setConnectionState,
    setRoomCode,
  } = usePeerDropStore();

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const remotePeerIdRef = useRef<string | null>(null);

  useEffect(() => {
    signalingClient.connect();

    signalingClient.onRoomCreated((roomCode) => {
      setRoomCode(roomCode);
    });

    signalingClient.onRoomJoined((roomCode) => {
      setRoomCode(roomCode);
      // Joiner creates offer
      createOffer();
    });

    signalingClient.onSignal((message) => {
      handleSignal(message as SignalingMessage & { from: string });
    });

    signalingClient.onError((error) => {
      console.error('Signaling error:', error);
    });

    return () => {
      cleanup();
    };
  }, [setRoomCode]);

  const initializePeerConnection = () => {
    if (pcRef.current) return pcRef.current;

    const pc = new RTCPeerConnection(RTC_CONFIG);
    pcRef.current = pc;
    setPeerConnection(pc);

    // ICE candidate handling
    pc.onicecandidate = (event) => {
      if (event.candidate && remotePeerIdRef.current) {
        signalingClient.sendSignal(remotePeerIdRef.current, {
          type: 'ice-candidate',
          payload: event.candidate.toJSON(),
        });
      }
    };

    // Connection state monitoring
    pc.onconnectionstatechange = () => {
      setConnectionState(pc.connectionState);
      
      if (pc.connectionState === 'failed') {
        cleanup();
      }
    };

    // Data channel from remote peer
    pc.ondatachannel = (event) => {
      const dc = event.channel;
      setupDataChannel(dc);
    };

    return pc;
  };

  const setupDataChannel = (dc: RTCDataChannel) => {
    dc.binaryType = 'arraybuffer';
    setDataChannel(dc);

    dc.onopen = () => {
      console.log('Data channel opened');
    };

    dc.onclose = () => {
      console.log('Data channel closed');
    };

    dc.onerror = (error) => {
      console.error('Data channel error:', error);
    };
  };

  const createOffer = async () => {
    const pc = initializePeerConnection();

    // Create data channel (offerer creates it)
    const dc = pc.createDataChannel('file-transfer', {
      ordered: true,
    });
    setupDataChannel(dc);

    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      if (remotePeerIdRef.current) {
        signalingClient.sendSignal(remotePeerIdRef.current, {
          type: 'offer',
          payload: offer,
        });
      }
    } catch (error) {
      console.error('Error creating offer:', error);
    }
  };

  const handleSignal = async (message: SignalingMessage & { from: string }) => {
    remotePeerIdRef.current = message.from;

    const pc = initializePeerConnection();

    try {
      if (message.type === 'offer') {
        const offer = message.payload as RTCSessionDescriptionInit;
        await pc.setRemoteDescription(new RTCSessionDescription(offer));

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        signalingClient.sendSignal(message.from, {
          type: 'answer',
          payload: answer,
        });
      } else if (message.type === 'answer') {
        const answer = message.payload as RTCSessionDescriptionInit;
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
      } else if (message.type === 'ice-candidate') {
        const candidate = message.payload as RTCIceCandidateInit;
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      }
    } catch (error) {
      console.error('Error handling signal:', error);
    }
  };

  const cleanup = () => {
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    setPeerConnection(null);
    setDataChannel(null);
    setConnectionState('disconnected');
    remotePeerIdRef.current = null;
  };

  const createRoom = () => {
    signalingClient.createRoom();
  };

  const joinRoom = (roomCode: string) => {
    signalingClient.joinRoom(roomCode);
  };

  return {
    createRoom,
    joinRoom,
    cleanup,
    isSignalingConnected: signalingClient.isConnected,
  };
}
