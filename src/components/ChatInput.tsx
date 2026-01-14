import { useState, useRef, useEffect } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Send, Loader2, Mic, Square, Trash2 } from "lucide-react";
import { LiveAudioVisualizer } from "react-audio-visualize";
import { useVoiceRecognition } from "@/hooks/useVoiceRecognition";
import { StaticWaveform } from "./StaticWaveform";

interface ChatInputProps {
  onSendMessage: (message: string) => Promise<void>;
  isLoading: boolean;
}

export const ChatInput = ({ onSendMessage, isLoading }: ChatInputProps) => {
  const [message, setMessage] = useState("");
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const [visualizerDimensions, setVisualizerDimensions] = useState({ width: 0, height: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const {
    isRecording,
    capturedText,
    isMediaRecorderReady,
    isWaitingForFinalResults,
    startRecording,
    stopRecording,
    deleteRecording,
    mediaRecorderRef,
  } = useVoiceRecognition();

  const isSpeechSupported = typeof window !== 'undefined' && ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
  const isStopped = !isRecording && isVoiceMode;

  useEffect(() => {
    if (isVoiceMode && containerRef.current) {
      const updateDimensions = () => {
        if (containerRef.current) {
          const rect = containerRef.current.getBoundingClientRect();
          setVisualizerDimensions({
            width: rect.width - 32,
            height: rect.height - 24
          });
        }
      };

      updateDimensions();
      window.addEventListener('resize', updateDimensions);
      return () => window.removeEventListener('resize', updateDimensions);
    }
  }, [isVoiceMode]);

  const startVoiceMode = () => {
    setIsVoiceMode(true);
    startRecording();
  };

  const handleDeleteRecording = () => {
    deleteRecording();
    setIsVoiceMode(false);
  };

  const sendVoiceMessage = async () => {
    if (capturedText.trim() && !isLoading) {
      await stopRecording();
      setIsVoiceMode(false);
      await onSendMessage(capturedText.trim());
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && !isLoading) {
      await onSendMessage(message.trim());
      setMessage("");
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="bg-chat-input-bg border-t border-border p-4 rounded-b-2xl">
      {!isVoiceMode ? (
        <form onSubmit={handleSubmit} className="flex space-x-2">
          <Input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type your message..."
            disabled={isLoading}
            maxLength={200}
            className="flex-1 border-border focus:ring- focus:ring-primary focus:border-transparent rounded-xl px-4 py-3 text-sm placeholder:text-muted-foreground transition-all duration-200"
          />
          {isSpeechSupported && (
            <Button
              type="button"
              onClick={startVoiceMode}
              disabled={isLoading}
              className="bg-secondary hover:bg-secondary/80 text-foreground rounded-xl px-4 py-3 transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Mic className="w-5 h-5" />
            </Button>
          )}
          <Button
            type="submit"
            disabled={!message.trim() || isLoading}
            className="bg-send-button hover:opacity-90 text-white rounded-xl px-6 py-3 shadow-message transition-all duration-200 hover:shadow-lg hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100"
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </Button>
        </form>
      ) : (
        <form className="flex space-x-2">
          <div 
            ref={containerRef}
            className="flex-1 bg-input border border-border rounded-xl px-4 py-3 h-10 flex items-center justify-center overflow-hidden"
          >
            {isStopped ? (
              <div className="w-full h-full flex items-center justify-center">
                <StaticWaveform width={visualizerDimensions.width || 600} height={visualizerDimensions.height || 40} />
              </div>
            ) : isMediaRecorderReady && mediaRecorderRef.current && visualizerDimensions.width > 0 ? (
              <LiveAudioVisualizer
                mediaRecorder={mediaRecorderRef.current}
                width={visualizerDimensions.width}
                height={visualizerDimensions.height}
                barWidth={3}
                gap={2}
                barColor="#3b82f6"
              />
            ) : (
              <div className="text-xs text-muted-foreground">
                {isWaitingForFinalResults ? 'Processing...' :
                 !isMediaRecorderReady ? 'Initializing...' : 
                 visualizerDimensions.width === 0 ? 'Calculating dimensions...' : 
                 'Ready'}
              </div>
            )}
          </div>
          {isRecording ? (
            <>
              <Button
                type="button"
                onClick={stopRecording}
                className="bg-yellow-500 hover:bg-yellow-600 text-white rounded-xl px-4 py-3 transition-all duration-200 hover:scale-105"
              >
                <Square className="w-5 h-5" />
              </Button>
              <Button
                type="button"
                onClick={handleDeleteRecording}
                className="bg-red-500 hover:bg-red-600 text-white rounded-xl px-4 py-3 transition-all duration-200 hover:scale-105"
              >
                <Trash2 className="w-5 h-5" />
              </Button>
            </>
          ) : (
            <>
              <Button
                type="button"
                onClick={handleDeleteRecording}
                className="bg-red-500 hover:bg-red-600 text-white rounded-xl px-4 py-3 transition-all duration-200 hover:scale-105"
              >
                <Trash2 className="w-5 h-5" />
              </Button>
              <Button
                type="button"
                onClick={sendVoiceMessage}
                disabled={!capturedText.trim() || isLoading || isWaitingForFinalResults}
                className="bg-send-button hover:opacity-90 text-white rounded-xl px-6 py-3 shadow-message transition-all duration-200 hover:shadow-lg hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </Button>
            </>
          )}
        </form>
      )}
    </div>
  );
};