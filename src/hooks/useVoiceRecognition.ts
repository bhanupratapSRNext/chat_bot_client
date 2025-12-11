import { useState, useRef, useEffect } from "react";

interface UseVoiceRecognitionReturn {
  isRecording: boolean;
  capturedText: string;
  isMediaRecorderReady: boolean;
  isWaitingForFinalResults: boolean;
  startRecording: () => void;
  stopRecording: () => Promise<void>;
  deleteRecording: () => void;
  mediaRecorderRef: React.MutableRefObject<MediaRecorder | null>;
  streamRef: React.MutableRefObject<MediaStream | null>;
}

export const useVoiceRecognition = (): UseVoiceRecognitionReturn => {
  const [isRecording, setIsRecording] = useState(false);
  const [capturedText, setCapturedText] = useState("");
  const [isMediaRecorderReady, setIsMediaRecorderReady] = useState(false);
  const [isWaitingForFinalResults, setIsWaitingForFinalResults] = useState(false);
  
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const isRecordingRef = useRef(false);

  const cleanupMediaStream = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {
      }
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    mediaRecorderRef.current = null;
    setIsMediaRecorderReady(false);
  };

  const stopRecordingInternal = async () => {
    if (!recognitionRef.current || !isRecordingRef.current) return;
    
    try {
      isRecordingRef.current = false;
      setIsRecording(false);
      recognitionRef.current.stop();
      
      setIsWaitingForFinalResults(true);
      await new Promise(resolve => setTimeout(resolve, 600));
      setIsWaitingForFinalResults(false);
      
      cleanupMediaStream();
    } catch (error) {
      console.error('Error stopping recognition:', error);
      isRecordingRef.current = false;
      setIsRecording(false);
      setIsWaitingForFinalResults(false);
      cleanupMediaStream();
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      
      if (!SpeechRecognition) {
        console.warn('Web Speech API is not supported in this browser');
        return;
      }

      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            const transcript = event.results[i][0].transcript;
            finalTranscript += transcript + ' ';
          }
        }

        if (finalTranscript.trim()) {
          setCapturedText(prev => {
            const trimmedFinal = finalTranscript.trim();
            const newText = prev ? `${prev} ${trimmedFinal}`.trim() : trimmedFinal;
            return newText;
          });
        }
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.error('Speech recognition error:', event.error);
        if (event.error === 'aborted' || event.error === 'network') {
          isRecordingRef.current = false;
          setIsRecording(false);
          setIsWaitingForFinalResults(false);
          cleanupMediaStream();
        }
      };

      recognition.onend = () => {
        if (isRecordingRef.current) {
          try {
            recognition.start();
          } catch (e) {
            console.error('Error restarting recognition:', e);
            isRecordingRef.current = false;
            setIsRecording(false);
          }
        }
      };

      recognitionRef.current = recognition;
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
        }
        recognitionRef.current = null;
      }
      cleanupMediaStream();
    };
  }, []);

  const initializeAudioVisualization = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      const mediaRecorder = new MediaRecorder(stream);
      
      mediaRecorder.onstart = () => {
        setIsMediaRecorderReady(true);
      };
      
      mediaRecorder.onstop = () => {
        setIsMediaRecorderReady(false);
      };
      
      mediaRecorder.onerror = () => {
        setIsMediaRecorderReady(false);
      };
      
      mediaRecorder.start();
      mediaRecorderRef.current = mediaRecorder;
      
      if (mediaRecorder.state === 'recording') {
        setIsMediaRecorderReady(true);
      }
    } catch (error) {
      console.error('Error accessing microphone:', error);
      setIsMediaRecorderReady(false);
    }
  };

  useEffect(() => {
    if (isRecording) {
      initializeAudioVisualization();
    } else {
      cleanupMediaStream();
    }

    return () => {
      cleanupMediaStream();
    };
  }, [isRecording]);

  const startRecording = () => {
    if (!recognitionRef.current) return;
    
    try {
      isRecordingRef.current = true;
      setIsRecording(true);
      setCapturedText("");
      recognitionRef.current.start();
    } catch (error) {
      console.error('Error starting recognition:', error);
      isRecordingRef.current = false;
      setIsRecording(false);
    }
  };

  const stopRecording = async () => {
    await stopRecordingInternal();
  };

  const deleteRecording = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
      }
    }
    isRecordingRef.current = false;
    setIsRecording(false);
    setCapturedText("");
    cleanupMediaStream();
  };

  return {
    isRecording,
    capturedText,
    isMediaRecorderReady,
    isWaitingForFinalResults,
    startRecording,
    stopRecording,
    deleteRecording,
    mediaRecorderRef,
    streamRef,
  };
};