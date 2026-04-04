import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Loader2, MessageSquare, Copy, CheckCircle2, Sparkles, Code, Send, Save } from 'lucide-react';
import { GoogleGenAI, LiveServerMessage, Modality, Type, FunctionDeclaration } from '@google/genai';
import { AudioRecorder, AudioPlayer } from '../lib/audioUtils';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../utils/firestoreErrors';

const generateExcelFormulaDeclaration: FunctionDeclaration = {
  name: "generateExcelFormula",
  description: "Kullanıcı Excel formülü veya Makro/VBA kodu istediğinde bu fonksiyonu çağır. Ayrıca kullanıcı hatalı veya belirsiz bir komut verirse 'didYouMean' alanını doldur.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      formulaName: {
        type: Type.STRING,
        description: "Formülün veya makronun kısa adı (örneğin: 'Düşeyara Formülü', 'Satır Renklendirme Makrosu')"
      },
      formula: {
        type: Type.STRING,
        description: "Oluşturulan Excel formülü (örneğin: =XLOOKUP(...)) veya VBA/Makro kodu.",
      },
      explanation: {
        type: Type.STRING,
        description: "Formülün veya makronun ne işe yaradığının ve nasıl kullanılacağının kısa, anlaşılır açıklaması",
      },
      parameters: {
        type: Type.ARRAY,
        description: "Formülün veya makronun aldığı parametreler ve açıklamaları",
        items: {
          type: Type.OBJECT,
          properties: {
            name: {
              type: Type.STRING,
              description: "Parametre adı (örneğin: 'Aranan Değer', 'Tablo Dizisi')"
            },
            description: {
              type: Type.STRING,
              description: "Parametrenin ne işe yaradığı"
            }
          },
          required: ["name", "description"]
        }
      },
      type: {
        type: Type.STRING,
        description: "Üretilen kodun türü: 'formula' veya 'macro'",
      },
      didYouMean: {
        type: Type.STRING,
        description: "Eğer kullanıcının isteği tam anlaşılamadıysa ona önerilen doğru soru veya formül",
      }
    },
    required: ["formulaName", "formula", "explanation", "parameters", "type"]
  }
};

interface ChatMessage {
  role: 'user' | 'assistant';
  text: string;
  isFinished: boolean;
}

export function FormulaVoiceAssistant() {
  const { user } = useAuth();
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [formulaConfig, setFormulaConfig] = useState<any>(null);
  const [copied, setCopied] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [textInput, setTextInput] = useState('');
  const [textInputRows, setTextInputRows] = useState(1);

  const sessionRef = useRef<any>(null);
  const recorderRef = useRef<AudioRecorder | null>(null);
  const playerRef = useRef<AudioPlayer | null>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatHistory]);

  const handleSave = async () => {
    if (!user || !formulaConfig || isSaving) return;
    
    setIsSaving(true);
    setSaveSuccess(false);
    
    try {
      await addDoc(collection(db, `users/${user.uid}/saved_items`), {
        userId: user.uid,
        type: formulaConfig.type || 'formula',
        name: formulaConfig.formulaName || 'İsimsiz Formül',
        code: formulaConfig.formula,
        explanation: formulaConfig.explanation,
        parameters: formulaConfig.parameters || [],
        createdAt: serverTimestamp()
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `users/${user.uid}/saved_items`);
    } finally {
      setIsSaving(false);
    }
  };

  const connect = async (startMic = true, initialText?: string) => {
    if (isConnecting || isConnected) return;
    setIsConnecting(true);
    setChatHistory([]);
    setError(null);
    setFormulaConfig(null);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      
      playerRef.current = new AudioPlayer();
      playerRef.current.init();

      const systemInstruction = `Sen bir Excel ve VBA uzmanısın. Görevin, kullanıcının sorduğu Excel formülleri veya makroları hakkında sesli olarak yanıt vermek ve kod üretmektir.
      
ÇOK ÖNEMLİ KURALLAR:
1. Kullanıcı Excel formülü veya Makro/VBA kodu istediğinde 'generateExcelFormula' fonksiyonunu çağır.
2. Fonksiyonu çağırırken formülün adını (formulaName), formülün kendisini (formula), ne işe yaradığını (explanation) ve aldığı parametreleri (parameters) mutlaka detaylı bir şekilde doldur.
3. Daha karmaşık makro senaryoları için Google Search (web araması) yeteneğini kullanarak en güncel çözümleri bul.
4. Makro/VBA kodu ürettiğinde, kullanıcının bunu Excel'de NASIL çalıştıracağına dair açıklayıcı bir geri dönüş yap.
5. Eğer kullanıcı hatalı, eksik veya mantıksız bir formül komutu verirse 'didYouMean' parametresini doldur.
6. Cevapların doğal ve akıcı olsun.`;

      const sessionPromise = ai.live.connect({
        model: "gemini-3.1-flash-live-preview",
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: "Zephyr" } },
          },
          systemInstruction: { parts: [{ text: systemInstruction }] },
          tools: [
            { functionDeclarations: [generateExcelFormulaDeclaration] },
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
          onmessage: (message: LiveServerMessage) => {
            if (message.serverContent?.interrupted) {
              playerRef.current?.clearQueue();
            }
            const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (base64Audio) {
              playerRef.current?.play(base64Audio);
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

            if (message.toolCall) {
              const functionCalls = message.toolCall.functionCalls;
              if (functionCalls) {
                for (const call of functionCalls) {
                  if (call.name === 'generateExcelFormula') {
                    const args = call.args as any;
                    setFormulaConfig({
                      formulaName: args.formulaName,
                      formula: args.formula,
                      explanation: args.explanation,
                      parameters: args.parameters,
                      type: args.type || 'formula',
                      didYouMean: args.didYouMean
                    });
                    
                    sessionPromise.then((session) => {
                      session.sendToolResponse({
                        functionResponses: [{
                          id: call.id,
                          name: call.name,
                          response: { 
                            result: "Formül başarıyla ekranda gösterildi."
                          }
                        }]
                      });
                    });
                  }
                }
              }
            }
          },
          onclose: () => {
            disconnect();
          },
          onerror: (err: any) => {
            console.error("Live API Error:", err);
            setError("Bağlantı hatası oluştu. Lütfen tekrar deneyin.");
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

    } catch (err: any) {
      console.error("Connection failed:", err);
      setError("Bağlantı kurulamadı.");
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

  const handleTextInputChange = (value: string) => {
    setTextInput(value);
    setTextInputRows(Math.min(Math.max(value.split('\n').length, 1), 4));
  };

  const handleTextInputKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSendText(event);
    }
  };

  const handleCopyFormula = () => {
    if (formulaConfig?.formula) {
      navigator.clipboard.writeText(formulaConfig.formula);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const displayHistory = chatHistory.filter(msg => msg.text.trim() !== '');

  return (
    <div className="bg-white rounded-[2rem] p-6 sm:p-8 shadow-xl shadow-emerald-900/5 border border-emerald-100 flex flex-col gap-6 w-full mb-16">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-emerald-500" />
            Canlı Formül Asistanı
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            "Düşeyara nasıl yapılır?", "Satırı kırmızı yapan makro yaz" gibi sorular sorun.
          </p>
        </div>
        
        <button
          onClick={() => isConnected ? disconnect() : connect(true)}
          disabled={isConnecting}
          className={`relative flex items-center justify-center gap-3 px-6 py-4 sm:px-8 sm:py-5 rounded-full text-white font-bold text-base sm:text-lg transition-all duration-300 shadow-lg group overflow-hidden ${
            isConnecting 
              ? 'bg-emerald-400 cursor-not-allowed' 
              : isConnected 
                ? 'bg-red-500 hover:bg-red-600 hover:shadow-red-500/25' 
                : 'bg-emerald-500 hover:bg-emerald-600 hover:shadow-emerald-500/25'
          }`}
        >
          {isConnected && (
            <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
          )}
          
          {isConnecting ? (
            <>
              <Loader2 className="w-6 h-6 animate-spin" />
              <span>Bağlanıyor...</span>
            </>
          ) : isConnected ? (
            <>
              <Square className="w-6 h-6 fill-current" />
              <span>Görüşmeyi Bitir</span>
            </>
          ) : (
            <>
              <Mic className="w-6 h-6 group-hover:scale-110 transition-transform" />
              <span>Sohbeti Başlat</span>
            </>
          )}
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-red-600 text-sm text-center w-full animate-in fade-in slide-in-from-bottom-2">
          <p className="font-bold mb-1">Bağlantı Hatası</p>
          <p className="opacity-90">{error}</p>
        </div>
      )}

      {(isConnected || displayHistory.length > 0 || formulaConfig) && (
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Chat History Sidebar */}
          <div className="flex flex-col w-full bg-slate-50 rounded-3xl border border-slate-200 overflow-hidden h-[400px]">
            <div className="p-4 border-b border-slate-200 bg-white flex items-center gap-3">
              <div className="p-2 bg-emerald-100 text-emerald-600 rounded-xl">
                <MessageSquare className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-sm text-slate-800">Sohbet Geçmişi</h3>
            </div>
            
            <div 
              ref={chatContainerRef}
              className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar"
            >
              {displayHistory.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-3">
                  <MessageSquare className="w-8 h-8 opacity-20" />
                  <p className="text-xs text-center">Henüz bir konuşma yok.<br/>Mikrofona tıklayarak veya yazarak başlayın.</p>
                </div>
              ) : (
                displayHistory.map((msg, idx) => (
                  <div 
                    key={idx} 
                    className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} animate-in fade-in slide-in-from-bottom-2`}
                  >
                    <span className="text-[9px] font-semibold uppercase tracking-wider text-slate-400 mb-1 px-1">
                      {msg.role === 'user' ? 'Siz' : 'Asistan'}
                    </span>
                    <div 
                      className={`px-3 py-2 rounded-2xl max-w-[90%] text-xs leading-relaxed break-words ${
                        msg.role === 'user' 
                          ? 'bg-emerald-500 text-white rounded-tr-sm' 
                          : 'bg-white border border-slate-200 text-slate-700 rounded-tl-sm shadow-sm'
                      }`}
                    >
                      {msg.text}
                      {!msg.isFinished && (
                        <span className="inline-flex ml-1 animate-pulse">...</span>
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
                <textarea
                  value={textInput}
                  onChange={(e) => handleTextInputChange(e.target.value)}
                  onKeyDown={handleTextInputKeyDown}
                  disabled={isConnecting}
                  placeholder="Mesajınızı yazın..."
                  rows={textInputRows}
                  className="flex-1 resize-none overflow-y-auto px-4 py-3 text-sm leading-6 rounded-xl border border-slate-200 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 disabled:opacity-50 disabled:bg-slate-50 transition-all"
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

          {/* Formula Result Area */}
          <div className="flex flex-col w-full h-[400px]">
            {formulaConfig ? (
              <div className="w-full bg-slate-900 p-5 rounded-3xl border border-slate-800 shadow-lg animate-in fade-in slide-in-from-bottom-4 duration-500 h-full flex flex-col">
                {formulaConfig.didYouMean && (
                  <div className="mb-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-400 text-sm shrink-0">
                    <span className="font-bold flex items-center gap-2 mb-1">
                      <MessageSquare className="w-4 h-4" />
                      Bunu mu demek istediniz?
                    </span>
                    <p className="text-amber-200/80">{formulaConfig.didYouMean}</p>
                  </div>
                )}
                <div className="flex items-center justify-between mb-3 shrink-0">
                  <h3 className="text-sm font-bold text-emerald-400">
                    {formulaConfig.formulaName || (formulaConfig.type === 'macro' ? 'Excel Makrosu (VBA)' : 'Excel Formülü')}
                  </h3>
                  <div className="flex items-center gap-2">
                    {user && (
                      <button 
                        onClick={handleSave}
                        disabled={isSaving || saveSuccess}
                        className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${
                          saveSuccess 
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                            : 'text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-transparent'
                        }`}
                        title="Kaydet"
                      >
                        {isSaving ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : saveSuccess ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Kaydedildi
                          </>
                        ) : (
                          <>
                            <Save className="w-3.5 h-3.5" />
                            Kaydet
                          </>
                        )}
                      </button>
                    )}
                    <button 
                      onClick={handleCopyFormula}
                      className="flex items-center gap-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-lg transition-colors"
                    >
                      {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      {copied ? 'Kopyalandı' : 'Kopyala'}
                    </button>
                  </div>
                </div>
                <div className="bg-black/50 p-4 rounded-xl font-mono text-sm text-emerald-300 overflow-auto custom-scrollbar mb-3 border border-slate-800/50 whitespace-pre flex-1">
                  {formulaConfig.formula}
                </div>
                {formulaConfig.parameters && formulaConfig.parameters.length > 0 && (
                  <div className="mb-3 shrink-0">
                    <h4 className="text-[10px] font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">Parametreler</h4>
                    <ul className="space-y-1.5">
                      {formulaConfig.parameters.map((param: any, idx: number) => (
                        <li key={idx} className="text-xs text-slate-300 flex gap-2">
                          <span className="text-emerald-400 font-medium shrink-0">{param.name}:</span>
                          <span>{param.description}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <p className="text-sm text-slate-400 leading-relaxed shrink-0 max-h-24 overflow-y-auto custom-scrollbar">
                  {formulaConfig.explanation}
                </p>
              </div>
            ) : (
              <div className="w-full h-full bg-slate-50 border border-slate-200 border-dashed rounded-3xl flex flex-col items-center justify-center text-slate-400 p-6 text-center">
                <Code className="w-12 h-12 mb-4 opacity-20" />
                <p className="text-sm font-medium text-slate-500 mb-1">Formül veya Makro Bekleniyor</p>
                <p className="text-xs">Asistandan bir formül veya makro istediğinizde sonuç burada görüntülenecektir.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
