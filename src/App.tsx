import { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import {
  getFirestore, collection, addDoc, getDocs, query, orderBy,
  serverTimestamp, doc, updateDoc, deleteDoc,
} from 'firebase/firestore';
import {
  getStorage, ref, uploadBytes, getDownloadURL, deleteObject,
} from 'firebase/storage';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import {
  Plus, ChevronLeft, ChevronRight, User, Ruler, Zap,
  Target, Brain, Save, X, TrendingUp, Search,
  Activity, Award, Check, ArrowRight, Camera, Wind,
  Users, Loader2, AlertCircle, Pencil, Trash2,
  ImagePlus, BarChart3, Image as ImageIcon, FileDown,
} from 'lucide-react';
import logoSrc from './assets/logo.png';

/* =========================================================
   SCOUT BALL — App auto-contenida
   ========================================================= */

// =========================================================
// FIREBASE
// =========================================================
const firebaseConfig = {
  apiKey: 'AIzaSyCgqeJEq40NtwIUzEcClVw9LOiq66F-up8',
  authDomain: 'serviciosph-panama.firebaseapp.com',
  projectId: 'serviciosph-panama',
  storageBucket: 'serviciosph-panama.firebasestorage.app',
  messagingSenderId: '96060125590',
  appId: '1:96060125590:web:ad58104f3c1929ca646db7',
};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);

// =========================================================
// CONSTANTES
// =========================================================
const POSITIONS = ['Base', 'Escolta', 'Alero', 'Ala-Pívot', 'Pívot'];

const SEX_OPTIONS = [
  { id: 'M', label: 'Masculino' },
  { id: 'F', label: 'Femenino' },
];

const CATEGORIES = [
  { id: 'mini',  label: 'Mini Basket', short: 'MINI'  },
  { id: 'u13',   label: 'Sub-13',       short: 'U13'   },
  { id: 'u14',   label: 'Sub-14',       short: 'U14'   },
  { id: 'u15',   label: 'Sub-15',       short: 'U15'   },
  { id: 'u16',   label: 'Sub-16',       short: 'U16'   },
  { id: 'u17',   label: 'Sub-17',       short: 'U17'   },
  { id: 'u18',   label: 'Sub-18',       short: 'U18'   },
  { id: 'u19',   label: 'Sub-19',       short: 'U19'   },
  { id: 'u20',   label: 'Sub-20',       short: 'U20'   },
  { id: 'mayor', label: 'Mayor',        short: 'MAYOR' },
];

const PHOTO_CATEGORIES = [
  { id: 'frontal',    label: 'Frontal' },
  { id: 'posterior',  label: 'Posterior' },
  { id: 'lateral_d',  label: 'Lateral Der.' },
  { id: 'lateral_i',  label: 'Lateral Izq.' },
  { id: 'brazo_d',    label: 'Brazo Der.' },
  { id: 'brazo_i',    label: 'Brazo Izq.' },
  { id: 'pierna_d',   label: 'Pierna Der.' },
  { id: 'pierna_i',   label: 'Pierna Izq.' },
  { id: 'mano',       label: 'Manos' },
  { id: 'pie',        label: 'Pies' },
  { id: 'otro',       label: 'Otro' },
];

const labelOfCategory = (id: string) => PHOTO_CATEGORIES.find((c) => c.id === id)?.label || 'Sin categoría';
const labelOfBasketCategory = (id: string) => CATEGORIES.find((c) => c.id === id)?.label || '—';
const labelOfSex = (id: string) => SEX_OPTIONS.find((s) => s.id === id)?.label || '—';

// =========================================================
// HELPERS
// =========================================================
const getScoreTier = (score: number) => {
  if (score >= 80) return { tier: 'high', label: 'ALTO POTENCIAL', dot: 'bg-lime-400', text: 'text-lime-400', bar: 'bg-lime-400', color: '#84cc16' };
  if (score >= 65) return { tier: 'medium', label: 'EN OBSERVACIÓN', dot: 'bg-amber-400', text: 'text-amber-400', bar: 'bg-amber-400', color: '#f59e0b' };
  return { tier: 'low', label: 'BAJO POTENCIAL', dot: 'bg-red-500', text: 'text-red-500', bar: 'bg-red-500', color: '#ef4444' };
};

const mapFirestoreDoc = (d: any) => {
  const data = d.data();
  const today = new Date();
  return {
    id: d.id,
    ...data,
    name: data.name || 'Sin nombre',
    position: data.position || 'N/A',
    sex: data.sex || '',
    basketCategory: data.basketCategory || '',
    age: data.birthDate ? today.getFullYear() - new Date(data.birthDate).getFullYear() : 0,
    score: data.generalScore || 0,
    height: data.height ? (parseFloat(data.height) / 100).toFixed(2) : '—',
    heightCm: data.height || '',
    club: data.club || 'Por asignar',
    photo: data.photoURL || null,
    measurementPhotos: data.measurementPhotos || [],
  };
};

const prospectToFormData = (p: any) => ({
  photo: p.photo || p.photoURL || null,
  name: p.name || '',
  birthDate: p.birthDate || '',
  club: p.club || '',
  position: p.position || '',
  sex: p.sex || '',
  basketCategory: p.basketCategory || '',
  height: p.heightCm || '',
  weight: p.weight || '',
  bodyFat: p.bodyFat || '',
  wingspan: p.wingspan || '',
  waist: p.waist || '',
  hips: p.hips || '',
  enduranceTest: p.enduranceTest || '',
  sprint20m: p.sprint20m || ['', ''],
  flexibility: p.flexibility || ['', ''],
  verticalReach: p.verticalReach || '',
  verticalJump: p.verticalJump || ['', ''],
  pushups: p.pushups || '',
  agility: p.agility || ['', ''],
  shooting: p.shooting || 0,
  ballHandling: p.ballHandling || 0,
  decisionMaking: p.decisionMaking || 0,
  defense: p.defense || 0,
  leadership: p.leadership || 0,
  workEthic: p.workEthic || 0,
  frustrationTolerance: p.frustrationTolerance || 0,
});

const EMPTY_FORM = {
  photo: null, name: '', birthDate: '', club: '', position: '', sex: '', basketCategory: '',
  height: '', weight: '', bodyFat: '', wingspan: '', waist: '', hips: '',
  enduranceTest: '', sprint20m: ['', ''], flexibility: ['', ''],
  verticalReach: '', verticalJump: ['', ''], pushups: '', agility: ['', ''],
  shooting: 0, ballHandling: 0, decisionMaking: 0, defense: 0,
  leadership: 0, workEthic: 0, frustrationTolerance: 0,
};

const bestOf = (arr: any[], lowerIsBetter = false): number | null => {
  const nums = arr.map((v: any) => parseFloat(v)).filter((v: number) => !isNaN(v));
  if (nums.length === 0) return null;
  return lowerIsBetter ? Math.min(...nums) : Math.max(...nums);
};

const uploadBase64Photo = async (base64: string, path: string): Promise<string> => {
  const blob = await (await fetch(base64)).blob();
  const photoRef = ref(storage, path);
  await uploadBytes(photoRef, blob);
  return await getDownloadURL(photoRef);
};

// Convierte URL a base64 (resuelve CORS para PDF)
const urlToBase64 = async (url: string): Promise<string> => {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (e) {
    console.warn('No se pudo cargar imagen:', url);
    return '';
  }
};

// =========================================================
// FONTS + ANIMACIONES
// =========================================================
function FontStyles() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Manrope:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;700&display=swap');
      .f-display { font-family: 'Bebas Neue', sans-serif; letter-spacing: 0.02em; }
      .f-body    { font-family: 'Manrope', sans-serif; }
      .f-mono    { font-family: 'JetBrains Mono', monospace; font-feature-settings: 'tnum'; }
      .scrollbar-hide::-webkit-scrollbar { display: none; }
      .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
      @keyframes pulse-ring { 0% { box-shadow: 0 0 0 0 rgba(163,230,53, 0.5);} 70% { box-shadow: 0 0 0 12px rgba(163,230,53, 0);} 100% { box-shadow: 0 0 0 0 rgba(163,230,53, 0);} }
      @keyframes spin { to { transform: rotate(360deg); } }
      @keyframes shimmer { 0% { background-position: -200px 0; } 100% { background-position: 200px 0; } }
      .animate-slide-up { animation: slideUp 0.4s ease-out forwards; }
      .pulse-fab { animation: pulse-ring 2s infinite; }
      .spin { animation: spin 1s linear infinite; }
      .skeleton { background: linear-gradient(90deg, #1a1a1a 0%, #232323 50%, #1a1a1a 100%); background-size: 400px 100%; animation: shimmer 1.5s infinite; }
    `}</style>
  );
}

// =========================================================
// LOGO (con fallback elegante si no carga la imagen)
// =========================================================
function Logo({ size = 40, withText = false }: any) {
  const [imgError, setImgError] = useState(false);
  return (
    <div className="flex items-center gap-2">
      {imgError ? (
        // Fallback: monograma SB en cuadro lima si la imagen falla
        <div
          style={{ width: size, height: size }}
          className="bg-lime-400 text-neutral-950 rounded-lg flex items-center justify-center f-display flex-shrink-0"
        >
          <span style={{ fontSize: size * 0.45 }}>SB</span>
        </div>
      ) : (
        <img
          src={logoSrc}
          alt="Scout Ball"
          style={{ width: size, height: size }}
          className="object-contain flex-shrink-0"
          onError={() => setImgError(true)}
        />
      )}
      {withText && (
        <div className="leading-none">
          <div className="f-display text-white tracking-wide" style={{ fontSize: size * 0.4 }}>SCOUT BALL</div>
          <div className="f-mono text-neutral-500 tracking-widest mt-0.5" style={{ fontSize: size * 0.18 }}>CAPTACIÓN DE TALENTO</div>
        </div>
      )}
    </div>
  );
}

// =========================================================
// INPUTS
// =========================================================
function FieldLabel({ children, hint }: any) {
  return (
    <div className="flex items-baseline justify-between mb-2">
      <label className="f-body text-xs font-semibold text-neutral-300 uppercase tracking-wider">{children}</label>
      {hint && <span className="f-mono text-[10px] text-neutral-600">{hint}</span>}
    </div>
  );
}

function TextField({ label, hint, value, onChange, type = 'text', placeholder, suffix }: any) {
  return (
    <div>
      <FieldLabel hint={hint}>{label}</FieldLabel>
      <div className="relative">
        <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
          className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-3.5 f-body text-white placeholder-neutral-600 focus:border-lime-400 focus:outline-none transition-colors" />
        {suffix && <span className="absolute right-4 top-1/2 -translate-y-1/2 f-mono text-xs text-neutral-500 pointer-events-none">{suffix}</span>}
      </div>
    </div>
  );
}

function PillSelector({ label, hint, options, value, onChange, cols = 3, useShort = false }: any) {
  return (
    <div>
      <FieldLabel hint={hint}>{label}</FieldLabel>
      <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
        {options.map((o: any) => (
          <button key={o.id} type="button" onClick={() => onChange(o.id)}
            className={`py-2.5 rounded-lg text-xs f-body font-semibold transition-all active:scale-95 ${
              value === o.id ? 'bg-lime-400 text-neutral-950 border border-lime-400' : 'bg-neutral-900 text-neutral-400 border border-neutral-800'
            }`}>
            {useShort && o.short ? o.short : o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function PhotoUploader({ value, onChange }: any) {
  const handleFile = (e: any) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt: any) => onChange(evt.target.result);
    reader.readAsDataURL(file);
  };
  return (
    <div>
      <FieldLabel hint="opcional">Foto Principal</FieldLabel>
      <label className="block relative cursor-pointer">
        <input type="file" accept="image/*" onChange={handleFile} className="hidden" />
        <div className="aspect-[4/3] bg-neutral-900 border-2 border-dashed border-neutral-800 rounded-2xl flex items-center justify-center overflow-hidden hover:border-lime-400 transition-colors">
          {value ? (
            <div className="relative w-full h-full">
              <img src={value} alt="Prospecto" className="w-full h-full object-cover" />
              <div className="absolute bottom-2 right-2 bg-neutral-950/80 backdrop-blur rounded-full px-3 py-1.5 flex items-center gap-1.5">
                <Camera size={12} className="text-lime-400" />
                <span className="f-mono text-[9px] text-white uppercase tracking-wider">Cambiar</span>
              </div>
            </div>
          ) : (
            <div className="text-center">
              <div className="w-14 h-14 rounded-full bg-neutral-800 flex items-center justify-center mx-auto mb-3">
                <Camera size={22} className="text-neutral-400" />
              </div>
              <p className="f-body text-xs text-neutral-400">Toca para subir foto</p>
              <p className="f-mono text-[9px] text-neutral-600 mt-1 tracking-wider">JPG / PNG · MAX 5MB</p>
            </div>
          )}
        </div>
      </label>
    </div>
  );
}

function MultiAttemptField({ label, hint, attempts, onChange, suffix, lowerIsBetter = false }: any) {
  const numericVals = attempts.map((a: any) => parseFloat(a)).filter((v: number) => !isNaN(v));
  const best = numericVals.length > 0 ? (lowerIsBetter ? Math.min(...numericVals) : Math.max(...numericVals)) : null;
  const handleChange = (i: number, val: string) => {
    const next = [...attempts];
    next[i] = val;
    onChange(next);
  };
  return (
    <div>
      <FieldLabel hint={hint}>{label}</FieldLabel>
      <div className="grid grid-cols-2 gap-2">
        {attempts.map((val: any, i: number) => (
          <div key={i} className="relative">
            <span className="absolute -top-1.5 left-3 z-10 bg-neutral-950 px-1.5 f-mono text-[9px] text-neutral-500 uppercase tracking-wider">Int. {i + 1}</span>
            <input type="number" step="0.01" value={val} onChange={(e) => handleChange(i, e.target.value)} placeholder="0"
              className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-3.5 f-body text-white placeholder-neutral-600 focus:border-lime-400 focus:outline-none transition-colors" />
            {suffix && <span className="absolute right-3 top-1/2 -translate-y-1/2 f-mono text-[10px] text-neutral-500 pointer-events-none">{suffix}</span>}
          </div>
        ))}
      </div>
      {best !== null && (
        <div className="mt-2 flex items-center gap-1.5">
          <Award size={11} className="text-lime-400" strokeWidth={2.5} />
          <span className="f-mono text-[10px] tracking-widest uppercase text-lime-400">Mejor registro: {best}{suffix ? ` ${suffix}` : ''}</span>
        </div>
      )}
    </div>
  );
}

function RatingScale({ value, onChange, labels = ['Muy bajo', 'Bajo', 'Medio', 'Alto', 'Élite'] }: any) {
  return (
    <div>
      <div className="flex gap-1.5">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" onClick={() => onChange(n)}
            className={`flex-1 h-12 rounded-lg border f-display text-xl transition-all active:scale-95 ${
              value >= n ? 'bg-lime-400 border-lime-400 text-neutral-950' : 'bg-neutral-900 border-neutral-800 text-neutral-600'
            }`}>{n}</button>
        ))}
      </div>
      <div className="flex justify-between mt-2 px-0.5">
        <span className="f-mono text-[9px] text-neutral-600 uppercase tracking-wider">{labels[0]}</span>
        <span className="f-mono text-[9px] text-lime-400 uppercase tracking-wider">{value > 0 ? labels[value - 1] : '—'}</span>
        <span className="f-mono text-[9px] text-neutral-600 uppercase tracking-wider">{labels[4]}</span>
      </div>
    </div>
  );
}

function SectionHeader({ icon, title, subtitle, step, total }: any) {
  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <div className="w-12 h-12 rounded-xl bg-lime-400 text-neutral-950 flex items-center justify-center">{icon}</div>
        <span className="f-mono text-[10px] text-neutral-500 tracking-widest">PASO {step} / {total}</span>
      </div>
      <h2 className="f-display text-3xl text-white leading-tight">{title}</h2>
      <p className="f-body text-sm text-neutral-500 mt-1">{subtitle}</p>
    </div>
  );
}

// =========================================================
// PROSPECT CARD
// =========================================================
function ProspectCard({ prospect, index, onClick }: any) {
  const tier = getScoreTier(prospect.score);
  return (
    <button onClick={onClick}
      className="w-full text-left relative bg-neutral-900 border border-neutral-800 rounded-2xl p-4 active:scale-[0.98] transition-transform animate-slide-up"
      style={{ animationDelay: `${index * 60}ms`, animationFillMode: 'both', opacity: 0 }}>
      <div className={`absolute left-0 top-4 bottom-4 w-1 rounded-r-full ${tier.bar}`}></div>
      <div className="flex items-start gap-4 pl-2">
        <div className="relative flex-shrink-0">
          {prospect.photo ? (
            <img src={prospect.photo} alt={prospect.name} className="w-14 h-14 rounded-xl object-cover" />
          ) : (
            <div className="w-14 h-14 rounded-xl bg-neutral-800 flex items-center justify-center f-display text-2xl text-white">
              {prospect.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
            </div>
          )}
          <div className={`absolute -top-1 -right-1 w-3 h-3 rounded-full ${tier.dot} ring-2 ring-neutral-900`}></div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="f-body font-bold text-white text-base truncate leading-tight">{prospect.name}</h3>
              <p className="f-body text-xs text-neutral-500 truncate mt-0.5">{prospect.club}</p>
            </div>
            <ChevronRight className="text-neutral-600 flex-shrink-0 mt-1" size={18} />
          </div>
          <div className="flex items-center gap-2 mt-3 f-body text-xs text-neutral-400 flex-wrap">
            <span className="inline-flex items-center gap-1"><span className="w-1 h-1 rounded-full bg-neutral-600"></span>{prospect.position}</span>
            {prospect.basketCategory && (
              <span className="inline-flex items-center gap-1 bg-neutral-800 px-1.5 py-0.5 rounded f-mono text-[10px] text-lime-400">
                {prospect.basketCategory.toUpperCase()}
              </span>
            )}
            <span className="inline-flex items-center gap-1"><span className="w-1 h-1 rounded-full bg-neutral-600"></span>{prospect.age} años</span>
            <span className="inline-flex items-center gap-1 f-mono"><span className="w-1 h-1 rounded-full bg-neutral-600"></span>{prospect.height}m</span>
          </div>
        </div>
      </div>
      <div className="mt-3 pt-3 border-t border-neutral-800 flex items-center justify-between pl-2">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${tier.dot}`}></span>
          <span className={`f-display text-xs tracking-widest ${tier.text}`}>{tier.label}</span>
        </div>
        <div className="flex items-baseline gap-1">
          <span className={`f-display text-3xl leading-none ${tier.text}`}>{prospect.score}</span>
          <span className="f-mono text-[10px] text-neutral-600">/100</span>
        </div>
      </div>
    </button>
  );
}

function CardSkeleton() {
  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4">
      <div className="flex items-start gap-4">
        <div className="w-14 h-14 rounded-xl skeleton"></div>
        <div className="flex-1 space-y-2">
          <div className="h-4 w-2/3 rounded skeleton"></div>
          <div className="h-3 w-1/2 rounded skeleton"></div>
        </div>
      </div>
    </div>
  );
}

// =========================================================
// DASHBOARD
// =========================================================
function StatBlock({ label, value, icon, accent }: any) {
  return (
    <div className={`rounded-xl p-3 border ${accent ? 'bg-lime-400 border-lime-400 text-neutral-950' : 'bg-neutral-900 border-neutral-800 text-white'}`}>
      <div className={`flex items-center gap-1 mb-1.5 ${accent ? 'text-neutral-950' : 'text-neutral-500'}`}>
        {icon}
        <span className="f-mono text-[9px] tracking-widest uppercase">{label}</span>
      </div>
      <div className="f-display text-3xl leading-none">{value}</div>
    </div>
  );
}

function Dashboard({ prospects, loading, onAddNew, onSelect }: any) {
  const [filter, setFilter] = useState('all');
  const filtered = prospects.filter((p: any) => {
    if (filter === 'high') return p.score >= 80;
    if (filter === 'medium') return p.score >= 65 && p.score < 80;
    return true;
  });
  const stats = {
    total: prospects.length,
    high: prospects.filter((p: any) => p.score >= 80).length,
    avg: prospects.length > 0 ? Math.round(prospects.reduce((a: number, b: any) => a + b.score, 0) / prospects.length) : 0,
  };

  return (
    <div className="min-h-full pb-32">
      <header className="px-5 pt-8 pb-6">
        <div className="flex items-center justify-between mb-5">
          <Logo size={40} withText />
          <button className="w-10 h-10 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center text-neutral-400">
            <Search size={18} />
          </button>
        </div>
        <div>
          <p className="f-mono text-[10px] tracking-[0.2em] text-lime-400 uppercase mb-2">// Scouting Module</p>
          <h1 className="f-display text-5xl text-white leading-[0.9]">Cancha<br/>Abierta.</h1>
        </div>
      </header>

      <div className="px-5 mb-6">
        <div className="grid grid-cols-3 gap-2">
          <StatBlock label="Prospectos" value={stats.total} icon={<Users size={14} />} />
          <StatBlock label="Top Tier" value={stats.high} icon={<Award size={14} />} accent />
          <StatBlock label="Media" value={stats.avg} icon={<TrendingUp size={14} />} />
        </div>
      </div>

      <div className="px-5 mb-4">
        <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-1 px-1">
          {[{ key: 'all', label: 'Todos' }, { key: 'high', label: 'Alto Potencial' }, { key: 'medium', label: 'En Observación' }].map((f) => (
            <button key={f.key} onClick={() => setFilter(f.key)}
              className={`flex-shrink-0 px-4 py-2 rounded-full text-xs f-body font-semibold transition-colors ${
                filter === f.key ? 'bg-lime-400 text-neutral-950' : 'bg-neutral-900 text-neutral-400 border border-neutral-800'
              }`}>{f.label}</button>
          ))}
        </div>
      </div>

      <div className="px-5 space-y-3">
        <div className="flex items-center justify-between mb-1">
          <h2 className="f-display text-2xl text-white">EVALUADOS RECIENTES</h2>
          <span className="f-mono text-xs text-neutral-500">{loading ? '···' : `${filtered.length} items`}</span>
        </div>
        {loading ? (<><CardSkeleton /><CardSkeleton /><CardSkeleton /></>)
          : filtered.length === 0 ? (
            <div className="text-center py-16 px-6">
              <div className="w-14 h-14 mx-auto rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center mb-3">
                <Users size={20} className="text-neutral-500" />
              </div>
              <p className="f-display text-xl text-white mb-1">SIN PROSPECTOS</p>
              <p className="f-body text-xs text-neutral-500">
                {prospects.length === 0 ? 'Toca el botón para crear tu primera evaluación.' : 'No hay resultados en esta categoría.'}
              </p>
            </div>
          ) : filtered.map((p: any, i: number) => <ProspectCard key={p.id} prospect={p} index={i} onClick={() => onSelect(p)} />)
        }
      </div>

      <button onClick={onAddNew}
        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 pulse-fab bg-lime-400 text-neutral-950 rounded-full pl-5 pr-6 py-4 flex items-center gap-2 shadow-2xl active:scale-95 transition-transform"
        style={{ maxWidth: 'calc(100% - 40px)' }}>
        <div className="w-7 h-7 rounded-full bg-neutral-950 flex items-center justify-center">
          <Plus size={18} className="text-lime-400" strokeWidth={3} />
        </div>
        <span className="f-display text-lg tracking-wide">NUEVO PROSPECTO</span>
      </button>
    </div>
  );
}

// =========================================================
// EVALUATION FORM
// =========================================================
const TOTAL_STEPS = 6;
const POSITION_OPTIONS = POSITIONS.map((p) => ({ id: p, label: p }));

function RatioRow({ label, value, note }: any) {
  return (
    <div className="flex items-center justify-between f-body text-sm">
      <span className="text-neutral-400">{label}</span>
      <div className="flex items-baseline gap-2">
        <span className="f-mono text-lime-400 font-semibold">{value}</span>
        <span className="f-mono text-[9px] text-neutral-600 uppercase tracking-wider">{note}</span>
      </div>
    </div>
  );
}

function SummaryRow({ k, v }: any) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-neutral-800 last:border-0">
      <span className="text-neutral-500 f-mono text-[11px] uppercase tracking-wider">{k}</span>
      <span className="text-white f-body font-semibold text-sm">{v}</span>
    </div>
  );
}

function EvaluationForm({ onClose, onSave, saving, initialData, isEditing }: any) {
  const [step, setStep] = useState(1);
  const [data, setData] = useState<any>(initialData || EMPTY_FORM);

  const update = (field: string) => (value: any) => setData((prev: any) => ({ ...prev, [field]: value }));
  const handleNext = () => { if (step < TOTAL_STEPS) setStep(step + 1); };
  const handleBack = () => { if (step > 1) setStep(step - 1); else onClose(); };

  const handleSubmit = () => {
    const consolidated = {
      ...data,
      bestSprint20m: bestOf(data.sprint20m, true),
      bestFlexibility: bestOf(data.flexibility),
      bestVerticalJump: bestOf(data.verticalJump),
      bestAgility: bestOf(data.agility, true),
      generalScore: Math.round(((data.shooting + data.ballHandling + data.decisionMaking + data.defense + data.leadership + data.workEthic + data.frustrationTolerance) / 7) * 20),
    };
    onSave(consolidated);
  };

  return (
    <div className="fixed inset-0 bg-neutral-950 z-50 flex flex-col" style={{ maxWidth: '480px', margin: '0 auto' }}>
      <div className="flex-shrink-0 px-5 pt-6 pb-4 border-b border-neutral-900">
        <div className="flex items-center justify-between mb-4">
          <button onClick={handleBack} disabled={saving} className="w-9 h-9 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center text-white active:scale-90 transition-transform disabled:opacity-50"><ChevronLeft size={18} /></button>
          <div className="flex items-center gap-2">
            <Logo size={20} />
            <span className="f-display text-sm tracking-widest text-neutral-400">{isEditing ? 'EDITAR' : 'NUEVA EVAL.'}</span>
          </div>
          <button onClick={onClose} disabled={saving} className="w-9 h-9 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center text-white active:scale-90 transition-transform disabled:opacity-50"><X size={18} /></button>
        </div>
        <div className="flex gap-1">
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <div key={i} className={`flex-1 h-1 rounded-full transition-colors ${i < step ? 'bg-lime-400' : 'bg-neutral-800'}`} />
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-6 scrollbar-hide">
        {step === 1 && (
          <div className="space-y-5 animate-slide-up">
            <SectionHeader icon={<User size={22} strokeWidth={2.5} />} title="DATOS GENERALES" subtitle="Información básica del prospecto." step={1} total={TOTAL_STEPS} />
            <PhotoUploader value={data.photo} onChange={update('photo')} />
            <TextField label="Nombre y Apellidos" value={data.name} onChange={update('name')} placeholder="Ej. Juan Pérez García" />
            <TextField label="Fecha de Nacimiento" type="date" value={data.birthDate} onChange={update('birthDate')} />
            <TextField label="Club" value={data.club} onChange={update('club')} placeholder="Ej. Halcones SUB-18" />
            <PillSelector label="Sexo" options={SEX_OPTIONS} value={data.sex} onChange={update('sex')} cols={2} />
            <PillSelector label="Categoría" options={CATEGORIES} value={data.basketCategory} onChange={update('basketCategory')} cols={5} useShort />
            <PillSelector label="Posición" options={POSITION_OPTIONS} value={data.position} onChange={update('position')} cols={3} />
          </div>
        )}

        {step === 2 && (
          <div className="space-y-5 animate-slide-up">
            <SectionHeader icon={<Ruler size={22} strokeWidth={2.5} />} title="ANTROPOMETRÍA" subtitle="Medidas físicas estructurales." step={2} total={TOTAL_STEPS} />
            <div className="grid grid-cols-2 gap-3">
              <TextField label="Estatura" type="number" value={data.height} onChange={update('height')} placeholder="0" suffix="cm" />
              <TextField label="Peso" type="number" value={data.weight} onChange={update('weight')} placeholder="0" suffix="kg" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <TextField label="% Grasa" type="number" value={data.bodyFat} onChange={update('bodyFat')} placeholder="0" suffix="%" />
              <TextField label="Envergadura" type="number" value={data.wingspan} onChange={update('wingspan')} placeholder="0" suffix="cm" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <TextField label="Cintura" type="number" value={data.waist} onChange={update('waist')} placeholder="0" suffix="cm" />
              <TextField label="Caderas" type="number" value={data.hips} onChange={update('hips')} placeholder="0" suffix="cm" />
            </div>
            {((data.height && data.wingspan) || (data.waist && data.hips)) && (
              <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 space-y-2">
                <div className="flex items-center gap-2 text-lime-400 mb-1">
                  <TrendingUp size={14} />
                  <span className="f-mono text-[10px] tracking-widest uppercase">Ratios Calculados</span>
                </div>
                {data.height && data.wingspan && <RatioRow label="Envergadura / Altura" value={(parseFloat(data.wingspan) / parseFloat(data.height)).toFixed(2)} note="> 1.05 ventaja" />}
                {data.waist && data.hips && <RatioRow label="Cintura / Cadera" value={(parseFloat(data.waist) / parseFloat(data.hips)).toFixed(2)} note="ICC" />}
              </div>
            )}
          </div>
        )}

        {step === 3 && (
          <div className="space-y-5 animate-slide-up">
            <SectionHeader icon={<Wind size={22} strokeWidth={2.5} />} title="RESISTENCIA & VELOCIDAD" subtitle="Capacidad aeróbica y aceleración." step={3} total={TOTAL_STEPS} />
            <TextField label="Test de 6 minutos" hint="distancia recorrida" type="number" value={data.enduranceTest} onChange={update('enduranceTest')} placeholder="0" suffix="m" />
            <MultiAttemptField label="Velocidad 20 metros" hint="cronometrado" attempts={data.sprint20m} onChange={update('sprint20m')} suffix="seg" lowerIsBetter />
            <MultiAttemptField label="Flexibilidad" hint="sit & reach" attempts={data.flexibility} onChange={update('flexibility')} suffix="cm" />
          </div>
        )}

        {step === 4 && (
          <div className="space-y-5 animate-slide-up">
            <SectionHeader icon={<Zap size={22} strokeWidth={2.5} />} title="POTENCIA & AGILIDAD" subtitle="Salto, fuerza y cambio de dirección." step={4} total={TOTAL_STEPS} />
            <TextField label="Alcance Vertical" hint="brazo extendido" type="number" value={data.verticalReach} onChange={update('verticalReach')} placeholder="0" suffix="cm" />
            <MultiAttemptField label="Saltabilidad" hint="salto vertical" attempts={data.verticalJump} onChange={update('verticalJump')} suffix="cm" />
            <TextField label="Fuerza Resistencia" hint="flex. ext. de codo" type="number" value={data.pushups} onChange={update('pushups')} placeholder="0" suffix="reps" />
            <MultiAttemptField label="Agilidad" hint="circuito cronometrado" attempts={data.agility} onChange={update('agility')} suffix="seg" lowerIsBetter />
          </div>
        )}

        {step === 5 && (
          <div className="space-y-6 animate-slide-up">
            <SectionHeader icon={<Target size={22} strokeWidth={2.5} />} title="TÉCNICA & TÁCTICA" subtitle="Evaluación cualitativa en juego." step={5} total={TOTAL_STEPS} />
            <div><FieldLabel>Mecánica de Tiro</FieldLabel><RatingScale value={data.shooting} onChange={update('shooting')} /></div>
            <div><FieldLabel>Manejo de Balón</FieldLabel><RatingScale value={data.ballHandling} onChange={update('ballHandling')} /></div>
            <div><FieldLabel>Toma de Decisiones</FieldLabel><RatingScale value={data.decisionMaking} onChange={update('decisionMaking')} /></div>
            <div><FieldLabel>Defensa</FieldLabel><RatingScale value={data.defense} onChange={update('defense')} /></div>
          </div>
        )}

        {step === 6 && (
          <div className="space-y-6 animate-slide-up">
            <SectionHeader icon={<Brain size={22} strokeWidth={2.5} />} title="PERFIL PSICOLÓGICO" subtitle="Atributos mentales y de carácter." step={6} total={TOTAL_STEPS} />
            <div><FieldLabel>Liderazgo</FieldLabel><RatingScale value={data.leadership} onChange={update('leadership')} /></div>
            <div><FieldLabel>Ética de Trabajo</FieldLabel><RatingScale value={data.workEthic} onChange={update('workEthic')} /></div>
            <div><FieldLabel>Tolerancia a la Frustración</FieldLabel><RatingScale value={data.frustrationTolerance} onChange={update('frustrationTolerance')} /></div>
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5">
              <div className="flex items-center gap-2 text-lime-400 mb-3">
                <Activity size={14} />
                <span className="f-mono text-[10px] tracking-widest uppercase">Resumen Final</span>
              </div>
              <div className="space-y-1">
                <SummaryRow k="Prospecto" v={data.name || '—'} />
                <SummaryRow k="Club" v={data.club || '—'} />
                <SummaryRow k="Categoría" v={data.basketCategory ? data.basketCategory.toUpperCase() : '—'} />
                <SummaryRow k="Posición" v={data.position || '—'} />
                <SummaryRow k="Estatura" v={data.height ? `${data.height} cm` : '—'} />
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex-shrink-0 px-5 py-4 border-t border-neutral-900 bg-neutral-950">
        {step < TOTAL_STEPS ? (
          <button onClick={handleNext} className="w-full bg-white text-neutral-950 rounded-xl py-4 flex items-center justify-center gap-2 active:scale-[0.98] transition-transform">
            <span className="f-display text-lg tracking-wide">CONTINUAR</span>
            <ArrowRight size={18} strokeWidth={2.5} />
          </button>
        ) : (
          <button onClick={handleSubmit} disabled={saving}
            className="w-full bg-lime-400 text-neutral-950 rounded-xl py-4 flex items-center justify-center gap-2 active:scale-[0.98] transition-transform disabled:opacity-70 disabled:cursor-not-allowed">
            {saving ? (<><Loader2 size={18} strokeWidth={2.5} className="spin" /><span className="f-display text-lg tracking-wide">{isEditing ? 'ACTUALIZANDO...' : 'GUARDANDO...'}</span></>)
              : (<><Save size={18} strokeWidth={2.5} /><span className="f-display text-lg tracking-wide">{isEditing ? 'ACTUALIZAR' : 'GUARDAR EVALUACIÓN'}</span></>)}
          </button>
        )}
      </div>
    </div>
  );
}

// =========================================================
// ADD PHOTO MODAL
// =========================================================
function AddPhotoModal({ onClose, onSubmit, uploading }: any) {
  const [photo, setPhoto] = useState<string | null>(null);
  const [category, setCategory] = useState('frontal');
  const [notes, setNotes] = useState('');

  const handleFile = (e: any) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt: any) => setPhoto(evt.target.result);
    reader.readAsDataURL(file);
  };

  const handleSubmit = () => { if (!photo) return; onSubmit({ photo, category, notes }); };

  return (
    <div className="fixed inset-0 bg-neutral-950/90 backdrop-blur z-[70] flex items-end justify-center" onClick={onClose}>
      <div className="bg-neutral-900 border-t border-neutral-800 rounded-t-3xl w-full max-h-[90vh] overflow-y-auto scrollbar-hide animate-slide-up" style={{ maxWidth: '480px' }} onClick={(e) => e.stopPropagation()}>
        <div className="px-5 pt-5 pb-3 border-b border-neutral-800 flex items-center justify-between sticky top-0 bg-neutral-900 z-10">
          <h3 className="f-display text-2xl text-white">NUEVA FOTO</h3>
          <button onClick={onClose} className="w-9 h-9 rounded-full bg-neutral-800 flex items-center justify-center text-white"><X size={18} /></button>
        </div>
        <div className="px-5 py-5 space-y-5">
          <div>
            <FieldLabel hint="requerido">Foto</FieldLabel>
            <label className="block relative cursor-pointer">
              <input type="file" accept="image/*" onChange={handleFile} className="hidden" />
              <div className="aspect-square bg-neutral-950 border-2 border-dashed border-neutral-800 rounded-2xl flex items-center justify-center overflow-hidden hover:border-lime-400 transition-colors">
                {photo ? <img src={photo} alt="Preview" className="w-full h-full object-cover" />
                  : <div className="text-center"><ImagePlus size={28} className="text-neutral-500 mx-auto mb-2" /><p className="f-body text-xs text-neutral-400">Toca para seleccionar</p></div>}
              </div>
            </label>
          </div>
          <div>
            <FieldLabel>Categoría / Ángulo</FieldLabel>
            <div className="grid grid-cols-3 gap-2">
              {PHOTO_CATEGORIES.map((c) => (
                <button key={c.id} type="button" onClick={() => setCategory(c.id)}
                  className={`py-2.5 rounded-lg text-[11px] f-body font-semibold transition-all active:scale-95 ${
                    category === c.id ? 'bg-lime-400 text-neutral-950 border border-lime-400' : 'bg-neutral-950 text-neutral-400 border border-neutral-800'
                  }`}>{c.label}</button>
              ))}
            </div>
          </div>
          <div>
            <FieldLabel hint="opcional">Notas</FieldLabel>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Ej. Antes de pretemporada..."
              className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 f-body text-sm text-white placeholder-neutral-600 focus:border-lime-400 focus:outline-none resize-none" />
          </div>
        </div>
        <div className="px-5 py-4 border-t border-neutral-800 bg-neutral-900 sticky bottom-0">
          <button onClick={handleSubmit} disabled={!photo || uploading}
            className="w-full bg-lime-400 text-neutral-950 rounded-xl py-3.5 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] transition-transform">
            {uploading ? (<><Loader2 size={18} strokeWidth={2.5} className="spin" /><span className="f-display text-lg tracking-wide">SUBIENDO...</span></>)
              : (<><Save size={18} strokeWidth={2.5} /><span className="f-display text-lg tracking-wide">AÑADIR FOTO</span></>)}
          </button>
        </div>
      </div>
    </div>
  );
}

// =========================================================
// LIGHTBOX
// =========================================================
function Lightbox({ photo, onClose, onDelete }: any) {
  if (!photo) return null;
  const formattedDate = photo.uploadedAt ? new Date(photo.uploadedAt).toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' }) : '—';
  return (
    <div className="fixed inset-0 bg-neutral-950 z-[80] flex flex-col" onClick={onClose}>
      <div className="flex-shrink-0 px-5 pt-6 pb-4 flex items-center justify-between" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="w-10 h-10 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center text-white"><X size={18} /></button>
        <button onClick={() => { if (confirm('¿Borrar esta foto?')) onDelete(); }} className="w-10 h-10 rounded-full bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-400"><Trash2 size={16} /></button>
      </div>
      <div className="flex-1 flex items-center justify-center px-5">
        <img src={photo.url} alt={photo.category} className="max-w-full max-h-full object-contain rounded-xl" onClick={(e) => e.stopPropagation()} />
      </div>
      <div className="flex-shrink-0 px-5 py-5 border-t border-neutral-900" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 mb-1">
          <span className="bg-lime-400 text-neutral-950 f-display text-xs px-2.5 py-1 rounded-full tracking-widest">{labelOfCategory(photo.category)}</span>
          <span className="f-mono text-[10px] text-neutral-500">{formattedDate}</span>
        </div>
        {photo.notes && <p className="f-body text-sm text-neutral-300 mt-2">{photo.notes}</p>}
      </div>
    </div>
  );
}

// =========================================================
// PRINTABLE PROSPECT (oculto, alimenta el PDF)
// =========================================================
function PrintableProspect({ prospect, logoBase64 }: any) {
  if (!prospect) return null;
  const tier = getScoreTier(prospect.score);
  const today = new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });

  const SkillBar = ({ name, value, max = 5 }: any) => (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: 11, color: '#333' }}>{name}</span>
        <span style={{ fontSize: 11, color: '#000', fontWeight: 700 }}>{value}/{max}</span>
      </div>
      <div style={{ background: '#e5e5e5', height: 6, borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ background: '#84cc16', height: '100%', width: `${(value / max) * 100}%` }} />
      </div>
    </div>
  );

  const Row = ({ label, value }: any) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #eee' }}>
      <span style={{ color: '#888', fontSize: 10, textTransform: 'uppercase', letterSpacing: 1 }}>{label}</span>
      <span style={{ color: '#000', fontSize: 13, fontWeight: 600 }}>{value || '—'}</span>
    </div>
  );

  const h2Style: React.CSSProperties = { fontSize: 12, fontWeight: 800, letterSpacing: 2, color: '#000', margin: 0, marginBottom: 10, paddingBottom: 6, borderBottom: '2px solid #84cc16' };

  return (
    <div id="printable-area" style={{ position: 'fixed', left: '-9999px', top: 0, width: '210mm', minHeight: '297mm', background: 'white', color: 'black', padding: '15mm', fontFamily: 'system-ui, sans-serif', boxSizing: 'border-box' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '3px solid #000', paddingBottom: 10, marginBottom: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {logoBase64 ? (
            <img src={logoBase64} alt="Logo" style={{ width: 48, height: 48, objectFit: 'contain' }} />
          ) : (
            <div style={{ width: 48, height: 48, background: '#84cc16', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 900, color: '#000' }}>SB</div>
          )}
          <div>
            <div style={{ fontSize: 9, letterSpacing: 3, color: '#84cc16', marginBottom: 2, fontWeight: 700 }}>// SCOUTING REPORT</div>
            <div style={{ fontSize: 22, fontWeight: 900, color: '#000', letterSpacing: -0.5, lineHeight: 1 }}>SCOUT BALL</div>
            <div style={{ fontSize: 9, color: '#666', marginTop: 2 }}>Captación de Talento</div>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 8, color: '#888', letterSpacing: 1 }}>EMITIDO</div>
          <div style={{ fontSize: 11, color: '#000', fontWeight: 600 }}>{today}</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
        {prospect.photo ? <img src={prospect.photo} alt="" style={{ width: 110, height: 140, objectFit: 'cover', borderRadius: 6, flexShrink: 0 }} />
          : <div style={{ width: 110, height: 140, background: '#f0f0f0', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36, fontWeight: 800, color: '#aaa', flexShrink: 0 }}>{prospect.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}</div>}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ fontSize: 24, margin: 0, lineHeight: 1.1, color: '#000', fontWeight: 800 }}>{prospect.name}</h1>
            <div style={{ fontSize: 12, color: '#666', marginTop: 6 }}>{prospect.club} · {prospect.position} · {prospect.age} años</div>
            <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
              {prospect.basketCategory && <span style={{ background: '#000', color: 'white', padding: '3px 8px', borderRadius: 3, fontSize: 9, fontWeight: 800, letterSpacing: 1 }}>{prospect.basketCategory.toUpperCase()} · {labelOfBasketCategory(prospect.basketCategory)}</span>}
              {prospect.sex && <span style={{ background: '#84cc16', color: '#000', padding: '3px 8px', borderRadius: 3, fontSize: 9, fontWeight: 800, letterSpacing: 1 }}>{labelOfSex(prospect.sex)}</span>}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, marginTop: 12, fontSize: 11 }}>
              <div><span style={{ color: '#888' }}>Estatura: </span><span style={{ fontWeight: 600 }}>{prospect.heightCm || '—'} cm</span></div>
              <div><span style={{ color: '#888' }}>Peso: </span><span style={{ fontWeight: 600 }}>{prospect.weight || '—'} kg</span></div>
              <div><span style={{ color: '#888' }}>Envergadura: </span><span style={{ fontWeight: 600 }}>{prospect.wingspan || '—'} cm</span></div>
              <div><span style={{ color: '#888' }}>% Grasa: </span><span style={{ fontWeight: 600 }}>{prospect.bodyFat || '—'}%</span></div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8 }}>
            <div style={{ background: tier.color, color: 'white', padding: '6px 14px', borderRadius: 6, fontSize: 28, fontWeight: 900, lineHeight: 1 }}>
              {prospect.score}<span style={{ fontSize: 12, opacity: 0.7 }}>/100</span>
            </div>
            <div style={{ textTransform: 'uppercase', fontSize: 10, fontWeight: 800, color: tier.color, letterSpacing: 2 }}>{tier.label}</div>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 18 }}>
        <div style={{ flex: 1, marginTop: 18 }}>
          <h2 style={h2Style}>ANTROPOMETRÍA</h2>
          <Row label="Estatura" value={prospect.heightCm ? `${prospect.heightCm} cm` : null} />
          <Row label="Peso" value={prospect.weight ? `${prospect.weight} kg` : null} />
          <Row label="% Grasa" value={prospect.bodyFat ? `${prospect.bodyFat}%` : null} />
          <Row label="Envergadura" value={prospect.wingspan ? `${prospect.wingspan} cm` : null} />
          <Row label="Cintura" value={prospect.waist ? `${prospect.waist} cm` : null} />
          <Row label="Caderas" value={prospect.hips ? `${prospect.hips} cm` : null} />
        </div>
        <div style={{ flex: 1, marginTop: 18 }}>
          <h2 style={h2Style}>PRUEBAS FÍSICAS</h2>
          <Row label="Test 6 min" value={prospect.enduranceTest ? `${prospect.enduranceTest} m` : null} />
          <Row label="Sprint 20m" value={prospect.bestSprint20m ? `${prospect.bestSprint20m} s` : null} />
          <Row label="Flexibilidad" value={prospect.bestFlexibility ? `${prospect.bestFlexibility} cm` : null} />
          <Row label="Alcance Vert." value={prospect.verticalReach ? `${prospect.verticalReach} cm` : null} />
          <Row label="Saltabilidad" value={prospect.bestVerticalJump ? `${prospect.bestVerticalJump} cm` : null} />
          <Row label="Flexiones" value={prospect.pushups ? `${prospect.pushups} reps` : null} />
          <Row label="Agilidad" value={prospect.bestAgility ? `${prospect.bestAgility} s` : null} />
        </div>
      </div>

      <div style={{ display: 'flex', gap: 18, marginTop: 4 }}>
        <div style={{ flex: 1, marginTop: 18 }}>
          <h2 style={h2Style}>TÉCNICA & TÁCTICA</h2>
          <SkillBar name="Mecánica de Tiro" value={prospect.shooting || 0} />
          <SkillBar name="Manejo de Balón" value={prospect.ballHandling || 0} />
          <SkillBar name="Toma de Decisiones" value={prospect.decisionMaking || 0} />
          <SkillBar name="Defensa" value={prospect.defense || 0} />
        </div>
        <div style={{ flex: 1, marginTop: 18 }}>
          <h2 style={h2Style}>PERFIL PSICOLÓGICO</h2>
          <SkillBar name="Liderazgo" value={prospect.leadership || 0} />
          <SkillBar name="Ética de Trabajo" value={prospect.workEthic || 0} />
          <SkillBar name="Tolerancia Frust." value={prospect.frustrationTolerance || 0} />
        </div>
      </div>

      {prospect.measurementPhotos && prospect.measurementPhotos.length > 0 && (
        <div style={{ marginTop: 18 }}>
          <h2 style={h2Style}>GALERÍA · {prospect.measurementPhotos.length} fotos</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6 }}>
            {prospect.measurementPhotos.slice(0, 20).map((p: any, i: number) => (
              <div key={i} style={{ aspectRatio: '1', overflow: 'hidden', borderRadius: 4, position: 'relative' }}>
                <img src={p.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(0,0,0,0.75)', color: 'white', fontSize: 7, padding: '2px 3px', textAlign: 'center', fontWeight: 600 }}>
                  {labelOfCategory(p.category)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ marginTop: 24, paddingTop: 10, borderTop: '1px solid #ddd', display: 'flex', justifyContent: 'space-between', fontSize: 8, color: '#999' }}>
        <span>SCOUT BALL · Módulo de Captación de Talento</span>
        <span>Documento confidencial · {today}</span>
      </div>
    </div>
  );
}

// =========================================================
// PROSPECT DETAIL
// =========================================================
function DetailGroup({ title, children }: any) {
  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden">
      <div className="px-4 py-3 border-b border-neutral-800 bg-neutral-950/50">
        <span className="f-mono text-[10px] tracking-widest uppercase text-lime-400">{title}</span>
      </div>
      <div className="divide-y divide-neutral-800">{children}</div>
    </div>
  );
}

function DetailRow({ label, value, unit }: any) {
  const display = value === null || value === undefined || value === '' || value === 0 ? '—' : value;
  return (
    <div className="px-4 py-3 flex items-center justify-between">
      <span className="f-body text-sm text-neutral-400">{label}</span>
      <span className="f-mono text-sm text-white">
        {display}{display !== '—' && unit ? <span className="text-neutral-500 ml-1 text-xs">{unit}</span> : ''}
      </span>
    </div>
  );
}

function ProspectDetail({ prospect, onBack, onEdit, onDelete, onAddPhoto, onDeletePhoto, onExportPDF, addingPhoto, exporting }: any) {
  const [tab, setTab] = useState<'medidas' | 'pruebas' | 'galeria'>('medidas');
  const [showAddPhoto, setShowAddPhoto] = useState(false);
  const [lightboxPhoto, setLightboxPhoto] = useState<any>(null);
  const tier = getScoreTier(prospect.score);

  const photosByCategory: Record<string, any[]> = {};
  (prospect.measurementPhotos || []).forEach((p: any) => {
    if (!photosByCategory[p.category]) photosByCategory[p.category] = [];
    photosByCategory[p.category].push(p);
  });
  Object.keys(photosByCategory).forEach((cat) => {
    photosByCategory[cat].sort((a, b) => b.uploadedAt - a.uploadedAt);
  });

  return (
    <div className="min-h-full pb-32 bg-neutral-950">
      <div className="relative">
        {prospect.photo ? (
          <div className="aspect-[4/3] relative overflow-hidden">
            <img src={prospect.photo} alt={prospect.name} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/40 to-transparent"></div>
          </div>
        ) : (
          <div className="aspect-[4/3] bg-gradient-to-br from-neutral-800 to-neutral-900 flex items-center justify-center">
            <span className="f-display text-7xl text-neutral-700">{prospect.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}</span>
          </div>
        )}

        <div className="absolute top-5 left-5 right-5 flex justify-between">
          <button onClick={onBack} className="w-10 h-10 rounded-full bg-neutral-950/70 backdrop-blur border border-neutral-800 flex items-center justify-center text-white"><ChevronLeft size={20} /></button>
          <div className="flex gap-2">
            <button onClick={() => { if (confirm(`¿Borrar a ${prospect.name}?`)) onDelete(); }}
              className="w-10 h-10 rounded-full bg-red-500/20 backdrop-blur border border-red-500/40 flex items-center justify-center text-red-400"><Trash2 size={16} /></button>
            <button onClick={onEdit} className="bg-lime-400 text-neutral-950 rounded-full px-4 py-2 flex items-center gap-1.5 f-display text-sm tracking-widest">
              <Pencil size={14} strokeWidth={2.5} />EDITAR
            </button>
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 px-5 pb-4">
          <div className="flex items-center gap-2 mb-1">
            <span className={`w-2 h-2 rounded-full ${tier.dot}`}></span>
            <span className={`f-display text-xs tracking-widest ${tier.text}`}>{tier.label}</span>
            <div className="ml-auto flex items-baseline gap-1">
              <span className={`f-display text-4xl leading-none ${tier.text}`}>{prospect.score}</span>
              <span className="f-mono text-xs text-neutral-500">/100</span>
            </div>
          </div>
          <h1 className="f-display text-4xl text-white leading-tight">{prospect.name}</h1>
          <p className="f-body text-sm text-neutral-400 mt-1">{prospect.club} · {prospect.position} · {prospect.age} años</p>
        </div>
      </div>

      {(prospect.basketCategory || prospect.sex) && (
        <div className="px-5 pt-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 grid grid-cols-2 gap-3">
            <div>
              <div className="f-mono text-[9px] tracking-widest uppercase text-neutral-500 mb-1">Categoría</div>
              <div className="f-display text-2xl text-white leading-none">{prospect.basketCategory ? prospect.basketCategory.toUpperCase() : '—'}</div>
              <div className="f-body text-[11px] text-neutral-500 mt-0.5">{prospect.basketCategory ? labelOfBasketCategory(prospect.basketCategory) : ''}</div>
            </div>
            <div>
              <div className="f-mono text-[9px] tracking-widest uppercase text-neutral-500 mb-1">Sexo</div>
              <div className="f-display text-2xl text-white leading-none">{prospect.sex || '—'}</div>
              <div className="f-body text-[11px] text-neutral-500 mt-0.5">{prospect.sex ? labelOfSex(prospect.sex) : ''}</div>
            </div>
          </div>
        </div>
      )}

      <div className="px-5 pt-4 pb-2 sticky top-0 bg-neutral-950 z-10 border-b border-neutral-900">
        <div className="flex gap-1 bg-neutral-900 border border-neutral-800 rounded-full p-1">
          {[{ key: 'medidas', label: 'Medidas', icon: Ruler }, { key: 'pruebas', label: 'Pruebas', icon: BarChart3 }, { key: 'galeria', label: 'Galería', icon: ImageIcon }].map((t) => {
            const Icon = t.icon;
            return (
              <button key={t.key} onClick={() => setTab(t.key as any)}
                className={`flex-1 py-2 rounded-full f-body text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                  tab === t.key ? 'bg-lime-400 text-neutral-950' : 'text-neutral-400'
                }`}>
                <Icon size={13} />{t.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="px-5 pt-5">
        {tab === 'medidas' && (
          <div className="space-y-3 animate-slide-up">
            <DetailGroup title="Antropometría">
              <DetailRow label="Estatura" value={prospect.heightCm} unit="cm" />
              <DetailRow label="Peso" value={prospect.weight} unit="kg" />
              <DetailRow label="% Grasa" value={prospect.bodyFat} unit="%" />
              <DetailRow label="Envergadura" value={prospect.wingspan} unit="cm" />
              <DetailRow label="Cintura" value={prospect.waist} unit="cm" />
              <DetailRow label="Caderas" value={prospect.hips} unit="cm" />
            </DetailGroup>
          </div>
        )}
        {tab === 'pruebas' && (
          <div className="space-y-3 animate-slide-up">
            <DetailGroup title="Resistencia & Velocidad">
              <DetailRow label="Test 6 minutos" value={prospect.enduranceTest} unit="m" />
              <DetailRow label="Sprint 20m (mejor)" value={prospect.bestSprint20m} unit="seg" />
              <DetailRow label="Flexibilidad (mejor)" value={prospect.bestFlexibility} unit="cm" />
            </DetailGroup>
            <DetailGroup title="Potencia & Agilidad">
              <DetailRow label="Alcance Vertical" value={prospect.verticalReach} unit="cm" />
              <DetailRow label="Saltabilidad (mejor)" value={prospect.bestVerticalJump} unit="cm" />
              <DetailRow label="Flexiones" value={prospect.pushups} unit="reps" />
              <DetailRow label="Agilidad (mejor)" value={prospect.bestAgility} unit="seg" />
            </DetailGroup>
            <DetailGroup title="Técnica & Táctica">
              <DetailRow label="Mecánica de Tiro" value={prospect.shooting} unit="/5" />
              <DetailRow label="Manejo de Balón" value={prospect.ballHandling} unit="/5" />
              <DetailRow label="Toma de Decisiones" value={prospect.decisionMaking} unit="/5" />
              <DetailRow label="Defensa" value={prospect.defense} unit="/5" />
            </DetailGroup>
            <DetailGroup title="Psicológico">
              <DetailRow label="Liderazgo" value={prospect.leadership} unit="/5" />
              <DetailRow label="Ética de Trabajo" value={prospect.workEthic} unit="/5" />
              <DetailRow label="Tolerancia Frustración" value={prospect.frustrationTolerance} unit="/5" />
            </DetailGroup>
          </div>
        )}
        {tab === 'galeria' && (
          <div className="animate-slide-up">
            <div className="flex items-center justify-between mb-4">
              <p className="f-body text-xs text-neutral-500">{(prospect.measurementPhotos || []).length} fotos · agrupadas por ángulo</p>
              <button onClick={() => setShowAddPhoto(true)} className="bg-lime-400 text-neutral-950 rounded-full px-3 py-1.5 flex items-center gap-1 f-display text-xs tracking-widest">
                <Plus size={14} strokeWidth={3} /> AÑADIR
              </button>
            </div>
            {Object.keys(photosByCategory).length === 0 ? (
              <div className="text-center py-12">
                <div className="w-14 h-14 mx-auto rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center mb-3">
                  <ImageIcon size={20} className="text-neutral-500" />
                </div>
                <p className="f-display text-xl text-white mb-1">SIN FOTOS</p>
                <p className="f-body text-xs text-neutral-500 px-6">Añade fotos por ángulo para comparar evolución.</p>
              </div>
            ) : (
              <div className="space-y-5">
                {Object.entries(photosByCategory).map(([cat, photos]) => (
                  <div key={cat}>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="f-display text-lg text-white tracking-wide">{labelOfCategory(cat)}</h4>
                      <span className="f-mono text-[10px] text-neutral-500">{photos.length} foto{photos.length !== 1 ? 's' : ''}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {photos.map((p: any, idx: number) => (
                        <button key={idx} onClick={() => setLightboxPhoto(p)} className="aspect-square rounded-xl overflow-hidden bg-neutral-900 border border-neutral-800 active:scale-95 transition-transform relative">
                          <img src={p.url} alt={cat} className="w-full h-full object-cover" />
                          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-neutral-950/80 to-transparent p-1">
                            <p className="f-mono text-[8px] text-white text-left">{new Date(p.uploadedAt).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <button onClick={onExportPDF} disabled={exporting}
        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-white text-neutral-950 rounded-full pl-5 pr-6 py-4 flex items-center gap-2 shadow-2xl active:scale-95 transition-transform disabled:opacity-70"
        style={{ maxWidth: 'calc(100% - 40px)' }}>
        {exporting ? (<><Loader2 size={18} strokeWidth={2.5} className="spin" /><span className="f-display text-lg tracking-wide">GENERANDO PDF...</span></>)
          : (<><div className="w-7 h-7 rounded-full bg-lime-400 flex items-center justify-center"><FileDown size={16} className="text-neutral-950" strokeWidth={3} /></div><span className="f-display text-lg tracking-wide">EXPORTAR PDF</span></>)}
      </button>

      {showAddPhoto && (
        <AddPhotoModal uploading={addingPhoto} onClose={() => setShowAddPhoto(false)}
          onSubmit={async (payload: any) => { await onAddPhoto(payload); setShowAddPhoto(false); }} />
      )}
      {lightboxPhoto && (
        <Lightbox photo={lightboxPhoto} onClose={() => setLightboxPhoto(null)}
          onDelete={() => { onDeletePhoto(lightboxPhoto); setLightboxPhoto(null); }} />
      )}
    </div>
  );
}

// =========================================================
// TOAST
// =========================================================
function Toast({ toast }: any) {
  if (!toast) return null;
  const isError = toast.type === 'error';
  return (
    <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-[100] rounded-full px-5 py-3 flex items-center gap-2 shadow-2xl animate-slide-up f-body font-semibold text-sm ${
      isError ? 'bg-red-500 text-white' : 'bg-lime-400 text-neutral-950'
    }`}>
      {isError ? <AlertCircle size={16} strokeWidth={2.5} /> : <Check size={16} strokeWidth={3} />}
      {toast.message}
    </div>
  );
}

// =========================================================
// MAIN APP
// =========================================================
export default function App() {
  const [view, setView] = useState<'dashboard' | 'detail' | 'form'>('dashboard');
  const [prospects, setProspects] = useState<any[]>([]);
  const [selectedProspect, setSelectedProspect] = useState<any>(null);
  const [prospectForPDF, setProspectForPDF] = useState<any>(null);
  const [logoForPDF, setLogoForPDF] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [addingPhoto, setAddingPhoto] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [toast, setToast] = useState<any>(null);

  const showToast = (type: string, message: string, duration = 3000) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), duration);
  };

  const loadProspects = async () => {
    try {
      setLoading(true);
      const q = query(collection(db, 'prospects'), orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      setProspects(snap.docs.map(mapFirestoreDoc));
    } catch (err: any) {
      console.error('❌ Error cargando:', err);
      showToast('error', 'Error al cargar la lista', 5000);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadProspects(); }, []);

  const handleSaveProspect = async (formData: any) => {
    setSaving(true);
    try {
      let photoURL: string | null = null;
      if (formData.photo && typeof formData.photo === 'string') {
        if (formData.photo.startsWith('data:')) {
          const safeName = (formData.name || 'prospect').replace(/\s+/g, '-');
          photoURL = await uploadBase64Photo(formData.photo, `prospect-photos/${Date.now()}-${safeName}.jpg`);
        } else {
          photoURL = formData.photo;
        }
      }

      const { photo, ...rest } = formData;

      if (editingId) {
        await updateDoc(doc(db, 'prospects', editingId), { ...rest, photoURL, updatedAt: serverTimestamp() });
        showToast('success', 'Evaluación actualizada');
      } else {
        await addDoc(collection(db, 'prospects'), { ...rest, photoURL, measurementPhotos: [], createdAt: serverTimestamp() });
        showToast('success', 'Evaluación guardada');
      }

      await loadProspects();
      setView('dashboard');
      setEditingId(null);
      setSelectedProspect(null);
    } catch (err: any) {
      console.error('❌ Error guardando:', err);
      showToast('error', 'Error: ' + (err.message || 'desconocido'), 5000);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteProspect = async () => {
    if (!selectedProspect) return;
    try {
      await deleteDoc(doc(db, 'prospects', selectedProspect.id));
      showToast('success', 'Prospecto eliminado');
      await loadProspects();
      setView('dashboard');
      setSelectedProspect(null);
    } catch (err: any) {
      console.error('❌ Error borrando:', err);
      showToast('error', 'Error al eliminar', 5000);
    }
  };

  const handleAddPhoto = async ({ photo, category, notes }: any) => {
    if (!selectedProspect) return;
    setAddingPhoto(true);
    try {
      const url = await uploadBase64Photo(photo, `measurement-photos/${selectedProspect.id}/${Date.now()}.jpg`);
      const newPhoto = { url, category, notes: notes || '', uploadedAt: Date.now() };
      const updatedPhotos = [...(selectedProspect.measurementPhotos || []), newPhoto];
      await updateDoc(doc(db, 'prospects', selectedProspect.id), { measurementPhotos: updatedPhotos });
      const updated = { ...selectedProspect, measurementPhotos: updatedPhotos };
      setSelectedProspect(updated);
      setProspects((prev) => prev.map((p) => (p.id === selectedProspect.id ? updated : p)));
      showToast('success', 'Foto añadida');
    } catch (err: any) {
      console.error('❌ Error subiendo foto:', err);
      showToast('error', 'Error al subir foto', 5000);
    } finally {
      setAddingPhoto(false);
    }
  };

  const handleDeletePhoto = async (photoToDelete: any) => {
    if (!selectedProspect) return;
    try {
      try {
        const photoPath = decodeURIComponent(new URL(photoToDelete.url).pathname.split('/o/')[1].split('?')[0]);
        await deleteObject(ref(storage, photoPath));
      } catch (e) { /* ignorable */ }
      const updatedPhotos = selectedProspect.measurementPhotos.filter((p: any) => p.url !== photoToDelete.url);
      await updateDoc(doc(db, 'prospects', selectedProspect.id), { measurementPhotos: updatedPhotos });
      const updated = { ...selectedProspect, measurementPhotos: updatedPhotos };
      setSelectedProspect(updated);
      setProspects((prev) => prev.map((p) => (p.id === selectedProspect.id ? updated : p)));
      showToast('success', 'Foto eliminada');
    } catch (err: any) {
      console.error('❌ Error borrando foto:', err);
      showToast('error', 'Error al eliminar foto', 5000);
    }
  };

  // =========================================================
  // EXPORT PDF — convierte todas las imágenes a base64 antes
  // =========================================================
  const handleExportPDF = async () => {
    if (!selectedProspect) return;
    setExporting(true);
    try {
      // 1) Convertir logo a base64 (es importado por Vite pero por seguridad lo embebemos)
      const logoBase64 = await urlToBase64(logoSrc);
      setLogoForPDF(logoBase64);

      // 2) Convertir foto principal del atleta a base64
      let photoBase64 = selectedProspect.photo;
      if (photoBase64 && !photoBase64.startsWith('data:')) {
        photoBase64 = await urlToBase64(photoBase64);
      }

      // 3) Convertir todas las fotos de medición a base64
      const photosBase64 = await Promise.all(
        (selectedProspect.measurementPhotos || []).map(async (p: any) => ({
          ...p,
          url: p.url.startsWith('data:') ? p.url : await urlToBase64(p.url),
        }))
      );

      // 4) Inyectar el prospecto temporal en estado para que se renderice con base64
      const prospectForPDFTmp = {
        ...selectedProspect,
        photo: photoBase64,
        measurementPhotos: photosBase64,
      };
      setProspectForPDF(prospectForPDFTmp);

      // 5) Esperar a que React renderice + imágenes carguen
      await new Promise((r) => setTimeout(r, 1500));

      // 6) Capturar con html2canvas
      const element = document.getElementById('printable-area');
      if (!element) throw new Error('Área de impresión no encontrada');

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.92);
      const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
      const pdfWidth = 210;
      const pdfHeight = 297;
      const imgHeight = (canvas.height * pdfWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, imgHeight);
      heightLeft -= pdfHeight;

      while (heightLeft > 0) {
        position -= pdfHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, imgHeight);
        heightLeft -= pdfHeight;
      }

      const today = new Date().toISOString().slice(0, 10);
      const safeName = (selectedProspect.name || 'prospecto').replace(/\s+/g, '-');
      pdf.save(`ScoutBall-${safeName}-${today}.pdf`);
      showToast('success', 'PDF descargado');
    } catch (err: any) {
      console.error('❌ Error PDF:', err);
      showToast('error', 'Error PDF: ' + (err.message || ''), 5000);
    } finally {
      setProspectForPDF(null);
      setLogoForPDF(null);
      setExporting(false);
    }
  };

  const handleSelectProspect = (p: any) => { setSelectedProspect(p); setView('detail'); };
  const handleEditFromDetail = () => { if (!selectedProspect) return; setEditingId(selectedProspect.id); setView('form'); };
  const handleAddNew = () => { setEditingId(null); setSelectedProspect(null); setView('form'); };
  const handleCloseForm = () => { setEditingId(null); setView(selectedProspect ? 'detail' : 'dashboard'); };
  const handleBackToDashboard = () => { setView('dashboard'); setSelectedProspect(null); };

  return (
    <div className="bg-neutral-950 min-h-screen text-white f-body">
      <FontStyles />
      <div className="mx-auto bg-neutral-950 min-h-screen relative overflow-hidden" style={{ maxWidth: '480px' }}>
        {view === 'dashboard' && <Dashboard prospects={prospects} loading={loading} onAddNew={handleAddNew} onSelect={handleSelectProspect} />}
        {view === 'detail' && selectedProspect && (
          <ProspectDetail prospect={selectedProspect} onBack={handleBackToDashboard} onEdit={handleEditFromDetail} onDelete={handleDeleteProspect}
            onAddPhoto={handleAddPhoto} onDeletePhoto={handleDeletePhoto} onExportPDF={handleExportPDF}
            addingPhoto={addingPhoto} exporting={exporting} />
        )}
        {view === 'form' && (
          <EvaluationForm onClose={handleCloseForm} onSave={handleSaveProspect} saving={saving} isEditing={!!editingId}
            initialData={editingId && selectedProspect ? prospectToFormData(selectedProspect) : null} />
        )}
        <Toast toast={toast} />
      </div>

      {/* Printable oculto — usa prospectForPDF (con base64) si está disponible */}
      {prospectForPDF && <PrintableProspect prospect={prospectForPDF} logoBase64={logoForPDF} />}
    </div>
  );
}