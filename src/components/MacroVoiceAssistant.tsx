import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Loader2, MessageSquare, Sparkles, Send } from 'lucide-react';
import { GoogleGenAI, LiveServerMessage, Modality, Type, FunctionDeclaration } from '@google/genai';
import { AudioRecorder, AudioPlayer } from '../lib/audioUtils';

interface MacroStep {
  id: string;
  type: string;
  description: string;
}

interface MacroVoiceAssistantProps {
  onStepsGenerated: (steps: Omit<MacroStep, 'id'>[]) => void;
}

const addMacroStepsDeclaration: FunctionDeclaration = {
  name: "addMacroSteps",
  description: "Kullanıcı bir makro oluşturmak istediğinde ve adımlarını anlattığında bu fonksiyonu çağırarak adımları arayüze ekle.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      steps: {
        type: Type.ARRAY,
        description: "Makronun adımları",
        items: {
          type: Type.OBJECT,
          properties: {
            type: {
              type: Type.STRING,
              description: "Adımın türü. Sadece şu değerlerden biri olabilir: 'Veri Filtreleme', 'Veri Temizleme', 'Formatlama & Renklendirme', 'Hesaplama & Formül', 'Raporlama & Özet Tablo', 'Dosya & Sayfa İşlemleri', 'Diğer'",
            },
            description: {
              type: Type.STRING,
              description: "Adımın ne yapacağını anlatan detaylı açıklama",
            }
          },
          required: ["type", "description"]
        }
      }
    },
    required: ["steps"]
  }
};

interface ChatMessage {
  role: 'user' | 'assistant';
  text: string;
  isFinished: boolean;
}

export function MacroVoiceAssistant({ onStepsGenerated }: MacroVoiceAssistantProps) {
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [textInput, setTextInput] = useState('');

  const sessionRef = useRef<any>(null);
  const recorderRef = useRef<AudioRecorder | null>(null);
  const playerRef = useRef<AudioPlayer | null>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatHistory]);

  const connect = async (startMic = true, initialText?: string) => {
    if (isConnecting || isConnected) return;
    setIsConnecting(true);
    setChatHistory([]);
    setError(null);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      
      playerRef.current = new AudioPlayer();
      playerRef.current.init();

      const systemInstruction = `Sen bir Excel VBA ve Makro uzmanısın. Kullanıcı sana yapmak istediği makroyu anlatacak.
      
Görevin:
1. Kullanıcının anlattığı makro senaryosunu adım adım analiz et.
2. 'addMacroSteps' fonksiyonunu çağırarak bu adımları sisteme aktar.
3. Kullanıcıya "Adımlarınızı ekrana ekledim, isterseniz düzenleyebilir veya doğrudan makroyu oluşturabilirsiniz" şeklinde sesli ve doğal bir yanıt ver.
4. Eğer kullanıcının isteği belirsizse, ona sorular sorarak makro adımlarını netleştir.
5. KESİNLİKLE DİKKAT: Makro adımlarını oluştururken veya kullanıcıya VBA kodu hakkında bilgi verirken HER ZAMAN 'googleSearch' aracını kullanarak web araması yap ve en güncel, doğru VBA çözümünü bul.`;

      const sessionPromise = ai.live.connect({
        model: "gemini-3.1-flash-live-preview",
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: "Zephyr" } },
          },
          systemInstruction: { parts: [{ text: systemInstruction }] },
          tools: [
            { functionDeclarations: [addMacroStepsDeclaration] },
            { googleSearch: {} }
          ],
          toolConfig: { includeServerSideToolInvocations: true },
          inputAudioTranscription: {},
          outputAudioTranscription: {},
        } as any,
        callbacks: {
          onopen: () => {
            if (startMic) {
              recorderRef.current = new AudioRecorder((base64Data) => {
                sessionPromise.then((session) => {
                  session.sendRealtimeInput({
                    audio: { data: base64Data, mimeType: 'audio/pcm;rate=16000' }
                  });
                });
              });
              recorderRef.current.start().catch(err => {
                console.error("Mic error:", err);
                setError("Mikrofon başlatılamadı.");
              });
            }
            setIsConnected(true);
            setIsConnecting(false);
            
            if (initialText) {
              sessionPromise.then((session) => {
                session.sendRealtimeInput({ text: initialText });
              });
            }
          },
          onmessage: async (message: LiveServerMessage) => {
            if (message.serverContent?.interrupted) {
              playerRef.current?.clearQueue();
            }

            const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (base64Audio) {
              playerRef.current?.play(base64Audio);
            }

            const toolCalls = message.toolCall?.functionCalls;
            if (toolCalls) {
              for (const call of toolCalls) {
                if (call.name === 'addMacroSteps') {
                  const args = call.args as any;
                  if (args.steps && Array.isArray(args.steps)) {
                    onStepsGenerated(args.steps);
                  }
                  
                  sessionPromise.then(session => {
                    session.sendToolResponse({
                      functionResponses: [{
                        name: call.name,
                        id: call.id,
                        response: { result: "Steps added successfully" }
                      }]
                    });
                  });
                }
              }
            }

            if (message.serverContent?.inputTranscription) {
              const t = message.serverContent.inputTranscription;
              setChatHistory(prev => {
                const newHistory = [...prev];
                let lastUserIdx = -1;
                for (let i = newHistory.length - 1; i >= 0; i--) {
                  if (newHistory[i].role === 'user' && !newHistory[i].isFinished) {
                    lastUserIdx = i;
                    break;
                  }
                }
                if (lastUserIdx >= 0) {
                  if (t.text) newHistory[lastUserIdx].text += t.text;
                  if (t.finished) newHistory[lastUserIdx].isFinished = true;
                } else if (t.text) {
                  newHistory.push({ role: 'user', text: t.text, isFinished: !!t.finished });
                }
                return newHistory;
              });
            }

            if (message.serverContent?.outputTranscription) {
              const t = message.serverContent.outputTranscription;
              setChatHistory(prev => {
                const newHistory = [...prev];
                let lastAsstIdx = -1;
                for (let i = newHistory.length - 1; i >= 0; i--) {
                  if (newHistory[i].role === 'assistant' && !newHistory[i].isFinished) {
                    lastAsstIdx = i;
                    break;
                  }
                }
                if (lastAsstIdx >= 0) {
                  if (t.text) newHistory[lastAsstIdx].text += t.text;
                  if (t.finished) newHistory[lastAsstIdx].isFinished = true;
                } else if (t.text) {
                  newHistory.push({ role: 'assistant', text: t.text, isFinished: !!t.finished });
                }
                return newHistory;
              });
            }
          },
          onerror: (err) => {
            console.error("Live API Error:", err);
            setError("Bağlantı hatası oluştu.");
            disconnect();
          },
          onclose: () => {
            disconnect();
          }
        }
      });

      sessionPromise.catch((err) => {
        console.error("Live API Connection Error:", err);
        setError("Bağlantı kurulamadı: " + (err.message || "Bilinmeyen hata"));
        setIsConnecting(false);
      });

      sessionRef.current = sessionPromise;

    } catch (err) {
      console.error("Connection failed:", err);
      setError("Asistana bağlanılamadı.");
      setIsConnecting(false);
    }
  };

  const disconnect = () => {
    if (recorderRef.current) {
      recorderRef.current.stop();
      recorderRef.current = null;
    }
    if (playerRef.current) {
      playerRef.current.stop();
      playerRef.current = null;
    }
    if (sessionRef.current) {
      sessionRef.current.then((session: any) => session.close()).catch(console.error);
      sessionRef.current = null;
    }
    setIsConnected(false);
    setIsConnecting(false);
  };

  const handleSendText = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!textInput.trim() || isConnecting) return;
    
    const text = textInput.trim();
    setTextInput('');
    
    // Add to chat history immediately
    setChatHistory(prev => [...prev, { role: 'user', text, isFinished: true }]);
    
    if (!isConnected) {
      await connect(false, text);
    } else if (sessionRef.current) {
      sessionRef.current.then((session: any) => {
        session.sendRealtimeInput({ text });
      });
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-emerald-100 shadow-sm p-6 flex flex-col h-full">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isConnected ? 'bg-emerald-500 text-white' : 'bg-emerald-100 text-emerald-600'}`}>
              <Mic className="w-5 h-5" />
            </div>
            {isConnected && (
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 border-2 border-white"></span>
              </span>
            )}
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800">Sesli Makro Asistanı</h2>
            <p className="text-sm text-slate-500">
              {isConnected ? 'Sizi dinliyor...' : 'Makro adımlarını anlatın'}
            </p>
          </div>
        </div>
        
        <button
          onClick={() => isConnected ? disconnect() : connect(true)}
          disabled={isConnecting}
          className={`px-4 py-2 rounded-xl font-bold flex items-center gap-2 transition-all ${
            isConnected 
              ? 'bg-red-50 text-red-600 hover:bg-red-100' 
              : 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-md shadow-emerald-500/20'
          }`}
        >
          {isConnecting ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Bağlanıyor...</>
          ) : isConnected ? (
            <><Square className="w-4 h-4 fill-current" /> Durdur</>
          ) : (
            <><Mic className="w-4 h-4" /> Konuşmaya Başla</>
          )}
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100">
          {error}
        </div>
      )}

      <div 
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto space-y-4 pr-2 min-h-[200px] max-h-[300px] scrollbar-thin scrollbar-thumb-slate-200 mb-4"
      >
        {chatHistory.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-3">
            <MessageSquare className="w-8 h-8 opacity-20" />
            <p className="text-sm text-center max-w-[250px]">
              "A sütunundaki boşlukları silip, B sütununu toplayan bir makro istiyorum" diyerek veya yazarak başlayabilirsiniz.
            </p>
          </div>
        ) : (
          chatHistory.map((msg, idx) => (
            <div 
              key={idx} 
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div 
                className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm break-words ${
                  msg.role === 'user' 
                    ? 'bg-emerald-500 text-white rounded-tr-sm' 
                    : 'bg-slate-100 text-slate-700 rounded-tl-sm'
                }`}
              >
                {msg.role === 'assistant' && (
                  <div className="flex items-center gap-1.5 mb-1 opacity-60">
                    <Sparkles className="w-3 h-3" />
                    <span className="text-[10px] font-bold uppercase tracking-wider">Asistan</span>
                  </div>
                )}
                <p className="leading-relaxed">{msg.text}</p>
                {!msg.isFinished && msg.role === 'assistant' && (
                  <span className="inline-block w-1.5 h-1.5 bg-slate-400 rounded-full animate-pulse ml-1" />
                )}
              </div>
            </div>
          ))
        )}
      </div>

      <div className="p-3 sm:p-4 border-t border-slate-100 bg-slate-50/50">
        <form 
          onSubmit={handleSendText}
          className="flex gap-2 items-center"
        >
          <input
            type="text"
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            disabled={isConnecting}
            placeholder="Mesajınızı yazın..."
            className="flex-1 px-4 py-3 text-sm rounded-xl border border-slate-200 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 disabled:opacity-50 disabled:bg-slate-50 transition-all"
          />
          <button
            type="submit"
            disabled={isConnecting || !textInput.trim()}
            className="p-3 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 disabled:opacity-50 disabled:hover:bg-emerald-500 transition-all shadow-sm shrink-0"
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
      </div>
    </div>
  );
}
