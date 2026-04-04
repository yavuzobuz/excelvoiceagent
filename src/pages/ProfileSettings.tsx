import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, User, Settings, Mic, Volume2, Shield, Bell, CheckCircle2, AlertCircle, LogOut, Code, FileSpreadsheet, Copy, Trash2, Search, Filter, Edit2, Save, X, AlertTriangle, Globe, Download } from 'lucide-react';
import { Footer } from '../components/Footer';
import { Logo } from '../components/Logo';
import { useAuth } from '../contexts/AuthContext';
import { logout, signInWithGoogle, signInWithMicrosoft, db } from '../firebase';
import { collection, query, onSnapshot, orderBy, deleteDoc, doc, updateDoc, setDoc, getDoc } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../utils/firestoreErrors';

export function ProfileSettings() {
  const { user, isAuthReady } = useAuth();
  const [activeTab, setActiveTab] = useState<'profile' | 'settings' | 'saved' | 'privacy' | 'notifications'>('profile');
  const [micStatus, setMicStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [audioLevel, setAudioLevel] = useState(0);
  const [savedItems, setSavedItems] = useState<any[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  
  // New States for Advanced Management
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'formula' | 'macro'>('all');
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: '', explanation: '' });

  // Profile States
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileData, setProfileData] = useState({ company: '', title: '' });

  // Settings & Privacy States
  const [settings, setSettings] = useState({
    language: 'tr',
    exportFormat: 'xlsx',
    theme: 'light',
    autoRead: true,
    voiceFeedback: true
  });

  const [privacy, setPrivacy] = useState({
    aiTraining: false,
    analytics: true,
    publicProfile: false
  });
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, `users/${user.uid}/saved_items`),
      orderBy('createdAt', 'desc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setSavedItems(items);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `users/${user.uid}/saved_items`);
    });
    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const fetchProfile = async () => {
      try {
        const docRef = doc(db, 'users', user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data() as any;
          setProfileData({
            company: data.company || '',
            title: data.title || ''
          });
        }
      } catch (error) {
        console.error("Error fetching profile:", error);
      }
    };
    fetchProfile();
  }, [user]);

  const handleSaveProfile = async () => {
    if (!user) return;
    try {
      await setDoc(doc(db, 'users', user.uid), profileData, { merge: true });
      setIsEditingProfile(false);
    } catch (error) {
      console.error("Error saving profile:", error);
    }
  };

  const handleUpdateItem = async (id: string) => {
    if (!user) return;
    try {
      await updateDoc(doc(db, `users/${user.uid}/saved_items`, id), {
        name: editForm.name,
        explanation: editForm.explanation,
        updatedAt: new Date()
      });
      setEditingItemId(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}/saved_items/${id}`);
    }
  };

  const filteredItems = savedItems.filter(item => {
    const matchesSearch = (item.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (item.explanation || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || item.type === filterType;
    return matchesSearch && matchesType;
  });

  const handleDelete = async (itemId: string) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, `users/${user.uid}/saved_items`, itemId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `users/${user.uid}/saved_items/${itemId}`);
    }
  };

  const handleCopy = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const startMicTest = async () => {
    try {
      setMicStatus('testing');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = audioContext;
      
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      analyserRef.current = analyser;
      
      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);
      
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      
      const updateLevel = () => {
        analyser.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((acc, val) => acc + val, 0) / dataArray.length;
        setAudioLevel(average);
        animationFrameRef.current = requestAnimationFrame(updateLevel);
      };
      
      updateLevel();
      
      // Test for 5 seconds
      setTimeout(() => {
        stopMicTest();
        setMicStatus('success');
      }, 5000);
      
    } catch (err) {
      console.error("Microphone access denied or error:", err);
      setMicStatus('error');
    }
  };

  const stopMicTest = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
    }
    setAudioLevel(0);
  };

  useEffect(() => {
    return () => {
      stopMicTest();
    };
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-[#f4f9f5] text-slate-800 font-sans">
      <header className="bg-white/70 backdrop-blur-xl border-b border-slate-200/50 sticky top-0 z-50 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center gap-4">
          <Link to="/app" className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-500 hover:text-emerald-600">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <Link to="/" className="hover:opacity-80 transition-opacity">
            <Logo />
          </Link>
        </div>
      </header>

      <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12 w-full">
        <div className="bg-white rounded-3xl shadow-sm border border-emerald-100/50 overflow-hidden flex flex-col md:flex-row min-h-[500px] lg:min-h-[600px]">
          
          {/* Sidebar */}
          <div className="w-full md:w-64 bg-slate-50 border-b md:border-b-0 md:border-r border-emerald-50 p-4 sm:p-6 flex md:flex-col gap-2 overflow-x-auto md:overflow-x-visible custom-scrollbar">
            <button 
              onClick={() => setActiveTab('profile')}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors whitespace-nowrap ${activeTab === 'profile' ? 'bg-emerald-100 text-emerald-700' : 'text-slate-600 hover:bg-slate-100'}`}
            >
              <User className="w-4 h-4" />
              Profil Bilgileri
            </button>
            <button 
              onClick={() => setActiveTab('saved')}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors whitespace-nowrap ${activeTab === 'saved' ? 'bg-emerald-100 text-emerald-700' : 'text-slate-600 hover:bg-slate-100'}`}
            >
              <FileSpreadsheet className="w-4 h-4" />
              Kaydedilenler
            </button>
            <button 
              onClick={() => setActiveTab('settings')}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors whitespace-nowrap ${activeTab === 'settings' ? 'bg-emerald-100 text-emerald-700' : 'text-slate-600 hover:bg-slate-100'}`}
            >
              <Settings className="w-4 h-4" />
              Uygulama Ayarları
            </button>
            <button 
              onClick={() => setActiveTab('privacy')}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors whitespace-nowrap md:mt-auto ${activeTab === 'privacy' ? 'bg-emerald-100 text-emerald-700' : 'text-slate-600 hover:bg-slate-100'}`}
            >
              <Shield className="w-4 h-4" />
              Gizlilik
            </button>
            <button 
              onClick={() => setActiveTab('notifications')}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors whitespace-nowrap ${activeTab === 'notifications' ? 'bg-emerald-100 text-emerald-700' : 'text-slate-600 hover:bg-slate-100'}`}
            >
              <Bell className="w-4 h-4" />
              Bildirimler
            </button>
          </div>

          {/* Content Area */}
          <div className="flex-1 p-6 sm:p-8 lg:p-12">
            {activeTab === 'profile' && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex justify-between items-center mb-8">
                  <h2 className="text-2xl font-bold text-slate-800">Profil Bilgileri</h2>
                  {isAuthReady && user && (
                    !isEditingProfile ? (
                      <button onClick={() => setIsEditingProfile(true)} className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition-colors text-sm font-medium">
                        <Edit2 className="w-4 h-4" /> Düzenle
                      </button>
                    ) : (
                      <div className="flex items-center gap-2">
                        <button onClick={() => setIsEditingProfile(false)} className="px-4 py-2 text-slate-500 hover:bg-slate-100 rounded-xl transition-colors text-sm font-medium">
                          İptal
                        </button>
                        <button onClick={handleSaveProfile} className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-colors text-sm font-medium">
                          <Save className="w-4 h-4" /> Kaydet
                        </button>
                      </div>
                    )
                  )}
                </div>
                
                {!isAuthReady ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                ) : user ? (
                  <>
                    <div className="flex items-center gap-6 mb-10">
                      {user.photoURL ? (
                        <img src={user.photoURL} alt={user.displayName || 'Kullanıcı'} className="w-24 h-24 rounded-full object-cover border-4 border-emerald-50" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="w-24 h-24 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 text-3xl font-bold">
                          {user.displayName ? user.displayName.charAt(0).toUpperCase() : 'U'}
                        </div>
                      )}
                      <div>
                        <h3 className="text-xl font-bold text-slate-800">{user.displayName || 'İsimsiz Kullanıcı'}</h3>
                        <p className="text-slate-500">{user.email}</p>
                      </div>
                    </div>

                    <div className="space-y-6 max-w-2xl">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-2">Ad Soyad</label>
                          <input type="text" defaultValue={user.displayName || ''} readOnly className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-500 focus:outline-none" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-2">E-posta Adresi</label>
                          <input type="email" defaultValue={user.email || ''} readOnly className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-500 focus:outline-none" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-2">Şirket / Kurum</label>
                          <input 
                            type="text" 
                            value={profileData.company} 
                            onChange={e => setProfileData({...profileData, company: e.target.value})} 
                            readOnly={!isEditingProfile} 
                            className={`w-full px-4 py-3 rounded-xl border ${isEditingProfile ? 'border-emerald-300 bg-white focus:ring-2 focus:ring-emerald-500/20' : 'border-slate-200 bg-slate-50 text-slate-500'} focus:outline-none transition-colors`} 
                            placeholder="Şirket adını girin" 
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-2">Unvan</label>
                          <input 
                            type="text" 
                            value={profileData.title} 
                            onChange={e => setProfileData({...profileData, title: e.target.value})} 
                            readOnly={!isEditingProfile} 
                            className={`w-full px-4 py-3 rounded-xl border ${isEditingProfile ? 'border-emerald-300 bg-white focus:ring-2 focus:ring-emerald-500/20' : 'border-slate-200 bg-slate-50 text-slate-500'} focus:outline-none transition-colors`} 
                            placeholder="Unvanınızı girin" 
                          />
                        </div>
                      </div>
                      <div className="pt-8 mt-8 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div className="text-sm text-slate-500">
                          Hesap Oluşturma: {user.metadata.creationTime ? new Date(user.metadata.creationTime).toLocaleDateString('tr-TR') : '-'}
                        </div>
                        <button 
                          onClick={logout}
                          className="flex items-center gap-2 px-6 py-3 bg-red-50 text-red-600 rounded-xl font-medium hover:bg-red-100 transition-colors w-full sm:w-auto justify-center"
                        >
                          <LogOut className="w-5 h-5" />
                          Çıkış Yap
                        </button>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <User className="w-8 h-8 text-slate-400" />
                    </div>
                    <h3 className="text-lg font-medium text-slate-800 mb-2">Giriş Yapmadınız</h3>
                    <p className="text-slate-500 mb-6">Profil bilgilerinizi görmek için giriş yapmalısınız.</p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                      <button 
                        onClick={signInWithGoogle}
                        className="w-full sm:w-auto px-6 py-3 bg-white border border-slate-200 text-slate-700 rounded-xl font-medium hover:bg-slate-50 transition-colors flex items-center justify-center gap-2"
                      >
                        <svg className="w-5 h-5" viewBox="0 0 24 24">
                          <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                        </svg>
                        Google ile Giriş Yap
                      </button>
                      <button 
                        onClick={signInWithMicrosoft}
                        className="w-full sm:w-auto px-6 py-3 bg-[#00a4ef] text-white rounded-xl font-medium hover:bg-[#008bc2] transition-colors flex items-center justify-center gap-2"
                      >
                        <svg className="w-5 h-5" viewBox="0 0 21 21">
                          <path fill="#f3f3f3" d="M0 0h10v10H0z"/>
                          <path fill="#f3f3f3" d="M11 0h10v10H11z"/>
                          <path fill="#f3f3f3" d="M0 11h10v10H0z"/>
                          <path fill="#f3f3f3" d="M11 11h10v10H11z"/>
                        </svg>
                        Microsoft ile Giriş Yap
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'saved' && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <h2 className="text-2xl font-bold text-slate-800 mb-8">Kaydedilen Formül ve Makrolar</h2>
                
                {!isAuthReady ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                ) : !user ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <FileSpreadsheet className="w-8 h-8 text-slate-400" />
                    </div>
                    <h3 className="text-lg font-medium text-slate-800 mb-2">Giriş Yapmadınız</h3>
                    <p className="text-slate-500 mb-6">Kaydettiğiniz öğeleri görmek için giriş yapmalısınız.</p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                      <button 
                        onClick={signInWithGoogle}
                        className="w-full sm:w-auto px-6 py-3 bg-white border border-slate-200 text-slate-700 rounded-xl font-medium hover:bg-slate-50 transition-colors flex items-center justify-center gap-2"
                      >
                        <svg className="w-5 h-5" viewBox="0 0 24 24">
                          <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                        </svg>
                        Google ile Giriş Yap
                      </button>
                      <button 
                        onClick={signInWithMicrosoft}
                        className="w-full sm:w-auto px-6 py-3 bg-[#00a4ef] text-white rounded-xl font-medium hover:bg-[#008bc2] transition-colors flex items-center justify-center gap-2"
                      >
                        <svg className="w-5 h-5" viewBox="0 0 21 21">
                          <path fill="#f3f3f3" d="M0 0h10v10H0z"/>
                          <path fill="#f3f3f3" d="M11 0h10v10H11z"/>
                          <path fill="#f3f3f3" d="M0 11h10v10H0z"/>
                          <path fill="#f3f3f3" d="M11 11h10v10H11z"/>
                        </svg>
                        Microsoft ile Giriş Yap
                      </button>
                    </div>
                  </div>
                ) : savedItems.length === 0 && searchTerm === '' ? (
                  <div className="text-center py-12 bg-slate-50 rounded-2xl border border-slate-100">
                    <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                      <FileSpreadsheet className="w-8 h-8 text-slate-400" />
                    </div>
                    <h3 className="text-lg font-medium text-slate-800 mb-2">Henüz Kayıtlı Öğeniz Yok</h3>
                    <p className="text-slate-500 mb-6 max-w-md mx-auto">
                      Oluşturduğunuz formül ve makroları kaydederek daha sonra buradan kolayca erişebilirsiniz.
                    </p>
                    <div className="flex justify-center gap-4">
                      <Link to="/app" className="px-6 py-2.5 bg-emerald-500 text-white rounded-xl font-medium hover:bg-emerald-600 transition-colors">
                        Asistan'a Git
                      </Link>
                    </div>
                  </div>
                ) : (
                  <div>
                    {/* Search and Filter Bar */}
                    <div className="flex flex-col sm:flex-row gap-4 mb-8">
                      <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <input 
                          type="text" 
                          placeholder="Formül veya makro ara..." 
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <Filter className="w-5 h-5 text-slate-400" />
                        <select 
                          value={filterType}
                          onChange={(e) => setFilterType(e.target.value as any)}
                          className="px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white text-slate-700"
                        >
                          <option value="all">Tümü</option>
                          <option value="formula">Sadece Formüller</option>
                          <option value="macro">Sadece Makrolar</option>
                        </select>
                      </div>
                    </div>

                    {filteredItems.length === 0 ? (
                      <div className="text-center py-12">
                        <p className="text-slate-500">Arama kriterlerinize uygun öğe bulunamadı.</p>
                      </div>
                    ) : (
                      <div className="grid gap-6">
                        {filteredItems.map((item) => (
                          <div key={item.id} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
                            {editingItemId === item.id ? (
                              <div className="animate-in fade-in duration-200">
                                <div className="mb-4">
                                  <label className="block text-sm font-medium text-slate-700 mb-1">Başlık</label>
                                  <input 
                                    type="text" 
                                    value={editForm.name} 
                                    onChange={e => setEditForm({...editForm, name: e.target.value})}
                                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                                  />
                                </div>
                                <div className="mb-4">
                                  <label className="block text-sm font-medium text-slate-700 mb-1">Açıklama</label>
                                  <textarea 
                                    value={editForm.explanation} 
                                    onChange={e => setEditForm({...editForm, explanation: e.target.value})}
                                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 min-h-[80px]"
                                  />
                                </div>
                                <div className="flex justify-end gap-2">
                                  <button onClick={() => setEditingItemId(null)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors text-sm font-medium">İptal</button>
                                  <button onClick={() => handleUpdateItem(item.id)} className="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors text-sm font-medium flex items-center gap-2">
                                    <Save className="w-4 h-4" /> Kaydet
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <>
                                <div className="flex items-start justify-between mb-4">
                                  <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-lg ${item.type === 'formula' ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600'}`}>
                                      {item.type === 'formula' ? <FileSpreadsheet className="w-5 h-5" /> : <Code className="w-5 h-5" />}
                                    </div>
                                    <div>
                                      <h3 className="font-bold text-slate-800">{item.name || (item.type === 'formula' ? 'İsimsiz Formül' : 'İsimsiz Makro')}</h3>
                                      <p className="text-xs text-slate-500">
                                        {item.createdAt?.toDate ? new Date(item.createdAt.toDate()).toLocaleDateString('tr-TR') : 'Tarih yok'}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-1 sm:gap-2">
                                    <button
                                      onClick={() => {
                                        setEditingItemId(item.id);
                                        setEditForm({ name: item.name || '', explanation: item.explanation || '' });
                                      }}
                                      className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                      title="Düzenle"
                                    >
                                      <Edit2 className="w-5 h-5" />
                                    </button>
                                    <button
                                      onClick={() => handleCopy(item.code, item.id)}
                                      className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                                      title="Kodu Kopyala"
                                    >
                                      {copiedId === item.id ? <CheckCircle2 className="w-5 h-5 text-emerald-500" /> : <Copy className="w-5 h-5" />}
                                    </button>
                                    <button
                                      onClick={() => handleDelete(item.id)}
                                      className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                      title="Sil"
                                    >
                                      <Trash2 className="w-5 h-5" />
                                    </button>
                                  </div>
                                </div>
                                
                                <div className="bg-slate-50 rounded-xl p-4 font-mono text-sm text-slate-800 overflow-x-auto mb-4 border border-slate-100">
                                  <pre className="whitespace-pre-wrap break-words">{item.code}</pre>
                                </div>
                                
                                {item.explanation && (
                                  <div className="text-sm text-slate-600 mb-4">
                                    <strong>Açıklama:</strong> {item.explanation}
                                  </div>
                                )}

                                {item.parameters && item.parameters.length > 0 && (
                                  <div className="mt-4 pt-4 border-t border-slate-100">
                                    <h4 className="text-sm font-semibold text-slate-700 mb-2">Parametreler:</h4>
                                    <ul className="space-y-1">
                                      {item.parameters.map((param: any, index: number) => (
                                        <li key={index} className="text-sm text-slate-600 flex items-start gap-2">
                                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 flex-shrink-0" />
                                          <span className="font-medium text-slate-700">{param.name}:</span> {param.description}
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'settings' && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <h2 className="text-2xl font-bold text-slate-800 mb-8">Uygulama Ayarları</h2>
                
                {/* Microphone Settings */}
                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-6 mb-8">
                  <div className="flex items-start gap-4 mb-6">
                    <div className="p-3 bg-white rounded-xl shadow-sm border border-slate-100 text-emerald-600">
                      <Mic className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-slate-800">Mikrofon Testi</h3>
                      <p className="text-sm text-slate-500 mt-1">Sesli asistanı kullanmadan önce mikrofonunuzun düzgün çalıştığından emin olun.</p>
                    </div>
                  </div>

                  <div className="bg-white p-6 rounded-xl border border-slate-200">
                    <div className="flex flex-col sm:flex-row items-center gap-6">
                      <button 
                        onClick={micStatus === 'testing' ? stopMicTest : startMicTest}
                        className={`px-6 py-3 rounded-xl font-medium transition-all flex items-center gap-2 ${
                          micStatus === 'testing' 
                            ? 'bg-red-50 text-red-600 hover:bg-red-100' 
                            : 'bg-emerald-500 text-white hover:bg-emerald-600'
                        }`}
                      >
                        {micStatus === 'testing' ? (
                          <>Testi Durdur</>
                        ) : (
                          <>Testi Başlat</>
                        )}
                      </button>

                      <div className="flex-1 w-full">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Ses Seviyesi</span>
                          {micStatus === 'success' && <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Başarılı</span>}
                          {micStatus === 'error' && <span className="text-xs font-semibold text-red-600 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Hata</span>}
                        </div>
                        <div className="h-3 bg-slate-100 rounded-full overflow-hidden flex">
                          <div 
                            className="h-full bg-emerald-500 transition-all duration-75"
                            style={{ width: `${Math.min(100, (audioLevel / 128) * 100)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                    
                    {micStatus === 'testing' && (
                      <p className="text-sm text-slate-500 mt-4 text-center animate-pulse">
                        Lütfen konuşun, ses seviyesi çubuğunun hareket ettiğini görmelisiniz...
                      </p>
                    )}
                  </div>
                </div>

                {/* Other Settings */}
                <div className="space-y-8">
                  <div>
                    <h3 className="text-lg font-bold text-slate-800 mb-4 border-b border-slate-100 pb-2">Genel Ayarlar</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                        <div className="flex items-center gap-3 mb-3">
                          <Globe className="w-5 h-5 text-emerald-600" />
                          <h4 className="font-semibold text-slate-800">Dil Seçeneği</h4>
                        </div>
                        <select 
                          value={settings.language}
                          onChange={e => setSettings({...settings, language: e.target.value})}
                          className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-slate-50"
                        >
                          <option value="tr">Türkçe</option>
                          <option value="en">English</option>
                        </select>
                      </div>

                      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                        <div className="flex items-center gap-3 mb-3">
                          <Download className="w-5 h-5 text-emerald-600" />
                          <h4 className="font-semibold text-slate-800">Varsayılan İndirme</h4>
                        </div>
                        <select 
                          value={settings.exportFormat}
                          onChange={e => setSettings({...settings, exportFormat: e.target.value})}
                          className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-slate-50"
                        >
                          <option value="xlsx">Excel (.xlsx)</option>
                          <option value="csv">CSV (.csv)</option>
                        </select>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-bold text-slate-800 mb-4 border-b border-slate-100 pb-2">Asistan Ayarları</h3>
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm divide-y divide-slate-100">
                      <div className="flex items-center justify-between p-5">
                        <div className="pr-4">
                          <h4 className="font-semibold text-slate-800">Otomatik Okuma</h4>
                          <p className="text-sm text-slate-500 mt-1">Dosya yüklendiğinde asistan otomatik olarak verileri okumaya başlasın.</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                          <input type="checkbox" checked={settings.autoRead} onChange={e => setSettings({...settings, autoRead: e.target.checked})} className="sr-only peer" />
                          <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                        </label>
                      </div>
                      
                      <div className="flex items-center justify-between p-5">
                        <div className="pr-4">
                          <h4 className="font-semibold text-slate-800">Sesli Geri Bildirim</h4>
                          <p className="text-sm text-slate-500 mt-1">Grafik oluşturulduğunda veya işlem tamamlandığında sesli onay ver.</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                          <input type="checkbox" checked={settings.voiceFeedback} onChange={e => setSettings({...settings, voiceFeedback: e.target.checked})} className="sr-only peer" />
                          <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'privacy' && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <h2 className="text-2xl font-bold text-slate-800 mb-8">Gizlilik ve Güvenlik</h2>
                
                <div className="space-y-8">
                  <div className="bg-white rounded-xl border border-slate-200 shadow-sm divide-y divide-slate-100">
                    <div className="flex items-center justify-between p-5">
                      <div className="pr-8">
                        <h4 className="font-semibold text-slate-800">Yapay Zeka Eğitimi İçin Veri Paylaşımı</h4>
                        <p className="text-sm text-slate-500 mt-1">Anonimleştirilmiş kullanım verilerinizin yapay zeka modellerimizi geliştirmek için kullanılmasına izin verin. Excel verileriniz ASLA paylaşılmaz.</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                        <input type="checkbox" checked={privacy.aiTraining} onChange={e => setPrivacy({...privacy, aiTraining: e.target.checked})} className="sr-only peer" />
                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                      </label>
                    </div>
                    
                    <div className="flex items-center justify-between p-5">
                      <div className="pr-8">
                        <h4 className="font-semibold text-slate-800">Kullanım Analitikleri</h4>
                        <p className="text-sm text-slate-500 mt-1">Uygulama deneyimini iyileştirmemize yardımcı olmak için anonim kullanım istatistikleri gönderin.</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                        <input type="checkbox" checked={privacy.analytics} onChange={e => setPrivacy({...privacy, analytics: e.target.checked})} className="sr-only peer" />
                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                      </label>
                    </div>
                  </div>

                  <div className="mt-12">
                    <h3 className="text-lg font-bold text-red-600 mb-4 flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5" /> Tehlikeli Bölge
                    </h3>
                    <div className="bg-red-50 border border-red-100 rounded-xl p-6">
                      <h4 className="font-semibold text-slate-800 mb-2">Hesabınızı Silin</h4>
                      <p className="text-sm text-slate-600 mb-4">Hesabınızı sildiğinizde tüm kaydedilmiş formülleriniz, makrolarınız ve profil bilgileriniz kalıcı olarak silinir. Bu işlem geri alınamaz.</p>
                      <button className="px-4 py-2.5 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 transition-colors text-sm shadow-sm">
                        Hesabımı Kalıcı Olarak Sil
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'notifications' && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <h2 className="text-2xl font-bold text-slate-800 mb-8">Bildirimler</h2>
                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-6">
                  <p className="text-slate-600">Bildirim ayarlarınız yakında burada olacak.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
