import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, Terminal, Play, CheckCircle2, Copy, Sparkles, Settings, FileSpreadsheet, Loader2, Save, User, LogIn } from 'lucide-react';
import { Logo } from './LandingPage';
import { GoogleGenAI } from '@google/genai';
import { MacroVoiceAssistant } from '../components/MacroVoiceAssistant';
import { useAuth } from '../contexts/AuthContext';
import { db, signInWithGoogle } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../utils/firestoreErrors';

interface MacroStep {
  id: string;
  type: string;
  description: string;
}

const STEP_TYPES = [
  'Veri Filtreleme',
  'Veri Temizleme',
  'Formatlama & Renklendirme',
  'Hesaplama & Formül',
  'Raporlama & Özet Tablo',
  'Dosya & Sayfa İşlemleri',
  'Diğer'
];

export function MacroBuilder() {
  const { user, isAuthReady } = useAuth();
  const [steps, setSteps] = useState<MacroStep[]>([
    { id: '1', type: 'Veri Filtreleme', description: '' }
  ]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedMacro, setGeneratedMacro] = useState<{ code: string; explanation: string; formulaName?: string; parameters?: any[] } | null>(null);
  const [copied, setCopied] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addStep = () => {
    setSteps([...steps, { id: Math.random().toString(36).substring(7), type: 'Diğer', description: '' }]);
  };

  const removeStep = (id: string) => {
    if (steps.length > 1) {
      setSteps(steps.filter(s => s.id !== id));
    }
  };

  const updateStep = (id: string, field: keyof MacroStep, value: string) => {
    setSteps(steps.map(s => s.id === id ? { ...s, [field]: value } : s));
  };

  const handleCopy = () => {
    if (generatedMacro) {
      navigator.clipboard.writeText(generatedMacro.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSave = async () => {
    if (!user || !generatedMacro || isSaving) return;
    
    setIsSaving(true);
    setSaveSuccess(false);
    
    try {
      await addDoc(collection(db, `users/${user.uid}/saved_items`), {
        userId: user.uid,
        type: 'macro',
        name: generatedMacro.formulaName || 'İsimsiz Makro',
        code: generatedMacro.code,
        explanation: generatedMacro.explanation,
        parameters: generatedMacro.parameters || [],
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

  const generateMacro = async () => {
    // Validate steps
    if (steps.some(s => !s.description.trim())) {
      setError('Lütfen tüm adımların açıklamasını doldurun.');
      return;
    }
    
    setError(null);
    setIsGenerating(true);
    setGeneratedMacro(null);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      
      const prompt = `Sen uzman bir Excel VBA geliştiricisisin. Kullanıcı adım adım bir makro oluşturmak istiyor.

Aşağıdaki adımları sırasıyla gerçekleştiren, optimize edilmiş, hatasız ve Türkçe açıklamalı bir VBA makrosu yaz.

Adımlar:
${steps.map((s, i) => `${i + 1}. [${s.type}] ${s.description}`).join('\n')}

Lütfen yanıtını aşağıdaki JSON formatında döndür:
{
  "formulaName": "Makronun kısa adı (örneğin: 'Veri Temizleme Makrosu')",
  "code": "VBA kodu buraya gelecek (sadece kod, markdown işaretleri olmadan)",
  "explanation": "Makronun ne yaptığını ve Excel'de nasıl kullanılacağını anlatan kısa bir Türkçe açıklama",
  "parameters": [
    {
      "name": "Parametre Adı",
      "description": "Parametre Açıklaması"
    }
  ]
}`;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          temperature: 0.2
        }
      });

      if (response.text) {
        const result = JSON.parse(response.text);
        setGeneratedMacro(result);
      } else {
        throw new Error('Yanıt alınamadı.');
      }
    } catch (err: any) {
      console.error('Macro generation error:', err);
      setError('Makro oluşturulurken bir hata oluştu. Lütfen tekrar deneyin.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleStepsGenerated = (newSteps: Omit<MacroStep, 'id'>[]) => {
    const stepsWithIds = newSteps.map(step => ({
      ...step,
      id: Math.random().toString(36).substring(7)
    }));
    setSteps(stepsWithIds);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#f4f9f5] text-slate-800 font-sans selection:bg-emerald-200">
      <header className="bg-white/70 backdrop-blur-xl border-b border-slate-200/50 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link to="/" className="hover:opacity-80 transition-opacity">
            <Logo />
          </Link>
          <div className="flex items-center gap-1 sm:gap-2">
            <Link to="/app" className="flex items-center gap-2 p-2 sm:px-3 sm:py-2 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-emerald-600 transition-all">
              <FileSpreadsheet className="w-5 h-5 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline text-sm font-medium">Veri Analizi</span>
            </Link>
            <Link to="/formulas" className="flex items-center gap-2 p-2 sm:px-3 sm:py-2 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-emerald-600 transition-all">
              <ArrowLeft className="w-5 h-5 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline text-sm font-medium">Formüllere Dön</span>
            </Link>
            <div className="w-px h-5 bg-slate-200 mx-1 hidden sm:block"></div>
            {isAuthReady ? (
              user ? (
                <Link to="/profile" className="flex items-center gap-2 p-2 sm:px-3 sm:py-2 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-emerald-600 transition-all">
                  {user.photoURL ? (
                    <img src={user.photoURL} alt="Profil" className="w-6 h-6 rounded-full border border-slate-200" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-xs font-bold">
                      {user.displayName ? user.displayName.charAt(0).toUpperCase() : 'U'}
                    </div>
                  )}
                  <span className="hidden sm:inline text-sm font-medium">Profil</span>
                </Link>
              ) : (
                <Link to="/profile" className="flex items-center gap-2 p-2 sm:px-4 sm:py-2 rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 transition-all text-sm font-medium shadow-sm sm:ml-1">
                  <LogIn className="w-5 h-5 sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">Giriş Yap</span>
                </Link>
              )
            ) : (
              <div className="flex items-center justify-center p-2 sm:px-4 sm:py-2 w-10 sm:w-[100px]">
                <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12 w-full">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-100/50 text-emerald-700 text-sm font-medium mb-6 border border-emerald-200/50">
            <Terminal className="w-4 h-4" />
            <span>Gelişmiş Makro Oluşturucu</span>
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-slate-900 mb-4">
            Adım Adım <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 to-teal-600">VBA Makrosu</span> Yazın
          </h1>
          <p className="text-slate-600 max-w-2xl mx-auto text-lg">
            Yapmak istediğiniz işlemleri sırasıyla tanımlayın, yapay zeka sizin için en optimize VBA kodunu saniyeler içinde oluştursun.
          </p>
        </div>

        <div className="grid lg:grid-cols-12 gap-8">
          {/* Steps Builder */}
          <div className="lg:col-span-7 space-y-6">
            <MacroVoiceAssistant onStepsGenerated={handleStepsGenerated} />
            
            <div className="bg-white rounded-2xl border border-emerald-100 shadow-sm p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                  <Settings className="w-5 h-5 text-emerald-500" />
                  Makro Adımları
                </h2>
                <span className="text-sm font-medium text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
                  {steps.length} Adım
                </span>
              </div>

              <div className="space-y-4">
                {steps.map((step, index) => (
                  <div key={step.id} className="relative bg-slate-50 rounded-xl border border-slate-200 p-4 transition-all focus-within:border-emerald-300 focus-within:ring-2 focus-within:ring-emerald-100">
                    <div className="flex items-start gap-4">
                      <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 font-bold flex items-center justify-center shrink-0 mt-1">
                        {index + 1}
                      </div>
                      <div className="flex-1 space-y-3">
                        <div className="flex items-center justify-between gap-4">
                          <select
                            value={step.type}
                            onChange={(e) => updateStep(step.id, 'type', e.target.value)}
                            className="bg-white border border-slate-200 text-slate-700 text-sm rounded-lg focus:ring-emerald-500 focus:border-emerald-500 block w-full p-2.5"
                          >
                            {STEP_TYPES.map(type => (
                              <option key={type} value={type}>{type}</option>
                            ))}
                          </select>
                          {steps.length > 1 && (
                            <button
                              onClick={() => removeStep(step.id)}
                              className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                              title="Adımı Sil"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                        <textarea
                          value={step.description}
                          onChange={(e) => updateStep(step.id, 'description', e.target.value)}
                          placeholder="Örn: A sütunundaki boş satırları sil..."
                          className="w-full bg-white border border-slate-200 rounded-lg p-3 text-sm text-slate-700 focus:ring-2 focus:ring-emerald-100 focus:border-emerald-400 resize-none min-h-[80px]"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 flex flex-col sm:flex-row items-center gap-4">
                <button
                  onClick={addStep}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-xl border-2 border-dashed border-emerald-200 text-emerald-600 font-bold hover:bg-emerald-50 hover:border-emerald-300 transition-all"
                >
                  <Plus className="w-5 h-5" />
                  Yeni Adım Ekle
                </button>
                
                <button
                  onClick={generateMacro}
                  disabled={isGenerating}
                  className="w-full sm:w-auto flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-emerald-500 text-white font-bold hover:bg-emerald-600 transition-all disabled:opacity-70 disabled:cursor-not-allowed shadow-lg shadow-emerald-500/20"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Makro Oluşturuluyor...
                    </>
                  ) : (
                    <>
                      <Play className="w-5 h-5" />
                      Makroyu Oluştur
                    </>
                  )}
                </button>
              </div>
              
              {error && (
                <div className="mt-4 p-4 bg-red-50 text-red-600 text-sm rounded-xl border border-red-100">
                  {error}
                </div>
              )}
            </div>
          </div>

          {/* Result Panel */}
          <div className="lg:col-span-5">
            <div className="bg-slate-900 rounded-2xl border border-slate-800 shadow-xl overflow-hidden sticky top-28 flex flex-col h-[600px]">
              <div className="bg-slate-800/50 px-6 py-4 border-b border-slate-700/50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Terminal className="w-5 h-5 text-emerald-400" />
                  <h3 className="text-white font-bold">VBA Kodu</h3>
                </div>
                {generatedMacro && (
                  <div className="flex items-center gap-2">
                    {user && (
                      <button 
                        onClick={handleSave}
                        disabled={isSaving || saveSuccess}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors text-sm font-medium ${
                          saveSuccess 
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                            : 'bg-slate-700 text-slate-300 hover:text-white hover:bg-slate-600 border border-transparent'
                        }`}
                        title="Kaydet"
                      >
                        {isSaving ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : saveSuccess ? (
                          <>
                            <CheckCircle2 className="w-4 h-4" />
                            Kaydedildi
                          </>
                        ) : (
                          <>
                            <Save className="w-4 h-4" />
                            Kaydet
                          </>
                        )}
                      </button>
                    )}
                    <button
                      onClick={handleCopy}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-700 text-slate-300 hover:text-white hover:bg-slate-600 transition-colors text-sm font-medium"
                    >
                      {copied ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                      {copied ? 'Kopyalandı' : 'Kopyala'}
                    </button>
                  </div>
                )}
              </div>
              
              <div className="flex-1 overflow-auto p-6">
                {generatedMacro ? (
                  <div className="space-y-6">
                    <pre className="text-emerald-300 font-mono text-sm leading-relaxed whitespace-pre-wrap">
                      {generatedMacro.code}
                    </pre>
                    <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
                      <h4 className="text-emerald-400 font-bold mb-2 flex items-center gap-2 text-sm">
                        <Sparkles className="w-4 h-4" />
                        Nasıl Kullanılır?
                      </h4>
                      <p className="text-slate-300 text-sm leading-relaxed">
                        {generatedMacro.explanation}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-slate-500 space-y-4">
                    <Terminal className="w-12 h-12 opacity-20" />
                    <p className="text-center text-sm max-w-[250px]">
                      Adımları tanımlayıp "Makroyu Oluştur" butonuna tıkladığınızda VBA kodunuz burada görünecektir.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
