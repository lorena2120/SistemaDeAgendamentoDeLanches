import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import {
  ShoppingCart, X, Clock, Calendar, Search, Plus, Minus,
  CheckCircle2, MapPin, Star, Bell, ChevronRight, ChevronLeft,
  Flame, Leaf, Smartphone, CreditCard, Banknote,
  Copy, Shield, Heart, Zap, Users, ScanLine, Hash, Camera, XCircle,
  UtensilsCrossed, ImageIcon, Tag, Trash2, AlertCircle
} from "lucide-react";
import { BrowserMultiFormatReader } from "@zxing/browser";

type CategoryId = "all" | "salgados" | "padaria" | "sucos" | "saudavel" | "doces" | "marmita";
type PayMethod  = "pix" | "card" | "cash";
type CartStep   = "items" | "payment";

interface MenuItem {
  id: number;
  name: string;
  category: CategoryId;
  price: number;
  rating: number;
  img: string;
  description: string;
  popular?: boolean;
  calories: number;
  tags: string[];
  barcode: string;
}
interface CartEntry extends MenuItem { quantity: number; day: string; time: string; }

const WEEK_DAYS = ["Seg, 11/08","Ter, 12/08","Qua, 13/08","Qui, 14/08","Sex, 15/08"];
const SLOTS     = ["Recreio — 10:00","Almoço — 12:00","Intervalo — 15:30"];
const ALL_TAGS  = ["Favorito","Mais pedido","Sem açúcar","Vegetariano","Vegano","Sem glúten","Proteico","Novo","Combo","Saudável"];
const CATEGORIES: { id: CategoryId; label: string; icon: string }[] = [
  { id:"all",      label:"Tudo",     icon:"🍽️" },
  { id:"salgados", label:"Salgados", icon:"🥐" },
  { id:"padaria",  label:"Padaria",  icon:"🥐" },
  { id:"sucos",    label:"Sucos",    icon:"🥤" },
  { id:"marmita",  label:"Marmita",  icon:"🍱" },
  { id:"saudavel", label:"Saudável", icon:"🥗" },
  { id:"doces",    label:"Doces",    icon:"🍮" },
];
const TAG_STYLE: Record<string,string> = {
  "Favorito":"bg-orange-100 text-orange-700","Mais pedido":"bg-red-100 text-red-700",
  "Sem açúcar":"bg-green-100 text-green-700","Vegetariano":"bg-emerald-100 text-emerald-700",
  "Vegano":"bg-lime-100 text-lime-700","Sem glúten":"bg-sky-100 text-sky-700",
  "Proteico":"bg-violet-100 text-violet-700","Novo":"bg-yellow-100 text-yellow-700",
  "Combo":"bg-pink-100 text-pink-700","Saudável":"bg-teal-100 text-teal-700",
};

const INITIAL_MENU: MenuItem[] = [
  { id:1,  name:"Coxinha de Frango",           category:"salgados", price:5.5,  rating:4.9, img:"https://images.unsplash.com/photo-1682263167429-0dbcf2c1e127?w=480&h=320&fit=crop&auto=format",  description:"Crocante por fora, recheio cremoso de frango temperado com requeijão",     popular:true, calories:280, tags:["Favorito"],               barcode:"7891234560001" },
  { id:2,  name:"Esfiha de Carne",             category:"salgados", price:5.0,  rating:4.6, img:"https://images.unsplash.com/photo-1641848392582-c3297905e920?w=480&h=320&fit=crop&auto=format",  description:"Massa fina aberta, recheio de carne moída bem temperada com hortelã",        popular:false,calories:240, tags:[],                            barcode:"7891234560002" },
  { id:3,  name:"Mini Pão de Queijo ×6",       category:"salgados", price:6.0,  rating:4.8, img:"https://images.unsplash.com/photo-1562273808-fd49429c4539?w=480&h=320&fit=crop&auto=format",  description:"Assado na hora com queijo minas curado, crocante por fora",                  popular:true, calories:210, tags:[],                            barcode:"7891234560003" },
  { id:4,  name:"Tapioca de Queijo e Tomate",  category:"salgados", price:8.0,  rating:4.7, img:"https://images.unsplash.com/photo-1770944268023-7709a33e7870?w=480&h=320&fit=crop&auto=format",  description:"Tapioca fina recheada com queijo branco e tomate seco — sem glúten",          popular:false,calories:195, tags:["Sem glúten","Vegetariano"],   barcode:"7891234560004" },
  { id:5,  name:"Sanduíche de Frango Grelhado",category:"salgados", price:10.0, rating:4.8, img:"https://images.unsplash.com/photo-1785960072741-a049c641f795?w=480&h=320&fit=crop&auto=format",  description:"Pão integral, frango temperado, alface, tomate e molho de iogurte",           popular:true, calories:310, tags:["Proteico"],                 barcode:"7891234560005" },
  { id:6,  name:"Croissant de Presunto e Queijo",category:"padaria",price:9.0,  rating:4.8, img:"https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=480&h=320&fit=crop&auto=format",  description:"Massa folhada amanteigada, presunto cozido e queijo gruyère derretido",       popular:true, calories:420, tags:["Novo"],                      barcode:"7891234560006" },
  { id:7,  name:"Croissant de Nutella",         category:"padaria", price:9.5,  rating:4.9, img:"https://images.unsplash.com/photo-1651604033534-e66b281f1981?w=480&h=320&fit=crop&auto=format",  description:"Massa folhada recheada com Nutella e avelãs trituradas",                      popular:true, calories:510, tags:["Favorito"],               barcode:"7891234560007" },
  { id:8,  name:"Waffle com Mel e Banana",      category:"padaria", price:10.0, rating:4.7, img:"https://images.unsplash.com/photo-1639107981824-4904e9aa6e7e?w=480&h=320&fit=crop&auto=format",  description:"Waffle quentinho com fatias de banana caramelizadas e fio de mel puro",       popular:false,calories:380, tags:["Novo"],                      barcode:"7891234560008" },
  { id:9,  name:"Waffle com Nutella e Morango", category:"padaria", price:11.0, rating:4.9, img:"https://images.unsplash.com/photo-1603030597353-f656b86daaca?w=480&h=320&fit=crop&auto=format",  description:"Waffle duplo com Nutella, morangos frescos e açúcar de confeiteiro",          popular:true, calories:460, tags:["Favorito"],               barcode:"7891234560009" },
  { id:10, name:"Suco de Laranja Natural",      category:"sucos",   price:6.5,  rating:4.9, img:"https://images.unsplash.com/photo-1707569517904-92b134ff5f69?w=480&h=320&fit=crop&auto=format",  description:"Espremido na hora, 400 ml, sem adição de açúcar ou conservantes",            popular:true, calories:110, tags:["Sem açúcar"],              barcode:"7891234560010" },
  { id:11, name:"Vitamina de Banana",           category:"sucos",   price:7.0,  rating:4.7, img:"https://images.unsplash.com/photo-1653542773369-51cce8d08250?w=480&h=320&fit=crop&auto=format", description:"Banana, leite integral e mel da serra — 350 ml, feito na hora",               popular:false,calories:220, tags:[],                            barcode:"7891234560011" },
  { id:12, name:"Vitamina Verde Detox",         category:"sucos",   price:8.0,  rating:4.6, img:"https://images.unsplash.com/photo-1610622930110-3c076902312a?w=480&h=320&fit=crop&auto=format",  description:"Espinafre, maçã verde, pepino, gengibre e limão — 350 ml",                   popular:false,calories:85,  tags:["Vegano","Sem açúcar","Saudável"],barcode:"7891234560012" },
  { id:13, name:"Água de Coco Gelada",          category:"sucos",   price:6.0,  rating:4.8, img:"https://images.unsplash.com/photo-1638517307486-4c2ae5c45764?w=480&h=320&fit=crop&auto=format",  description:"Natural, direto do coco verde, 300 ml — hidratação pura",                    popular:false,calories:60,  tags:["Vegano","Sem açúcar","Saudável"],barcode:"7891234560013" },
  { id:14, name:"Bowl de Açaí com Granola",     category:"saudavel",price:13.0, rating:4.9, img:"https://images.unsplash.com/photo-1684403620650-81dc661a69db?w=480&h=320&fit=crop&auto=format",  description:"Açaí batido com banana, granola crocante, mel e frutas da época",            popular:true, calories:320, tags:["Vegano","Saudável","Favorito"], barcode:"7891234560014" },
  { id:15, name:"Iogurte Grego com Granola",    category:"saudavel",price:9.0,  rating:4.7, img:"https://images.unsplash.com/photo-1649118173382-dad295004282?w=480&h=320&fit=crop&auto=format",  description:"Iogurte grego integral, granola artesanal, mel e frutas vermelhas",           popular:false,calories:290, tags:["Vegetariano","Proteico"],      barcode:"7891234560015" },
  { id:16, name:"Mix de Frutas Frescas",        category:"saudavel",price:8.5,  rating:4.7, img:"https://images.unsplash.com/photo-1588931929796-8f0ea6da0faa?w=480&h=320&fit=crop&auto=format",  description:"Melão, mamão, banana e morango — picados frescos e gelados",                  popular:true, calories:120, tags:["Vegano","Sem glúten","Saudável"],barcode:"7891234560016" },
  { id:17, name:"Salada de Frutas Premium",     category:"saudavel",price:10.0, rating:4.6, img:"https://images.unsplash.com/photo-1781820222256-ab123218726b?w=480&h=320&fit=crop&auto=format",  description:"Frutas da época com calda de mel, hortelã e raspas de limão",                popular:false,calories:145, tags:["Vegano","Sem glúten","Saudável"],barcode:"7891234560017" },
  { id:18, name:"Brigadeiro Gourmet",           category:"doces",   price:4.0,  rating:4.8, img:"https://images.unsplash.com/photo-1733560175037-249f8954789b?w=480&h=320&fit=crop&auto=format",  description:"Chocolate belga 70%, enrolado na granulinha belga importada",                 popular:true, calories:160, tags:["Favorito"],               barcode:"7891234560018" },
  { id:19, name:"Caixa de Brigadeiros ×4",      category:"doces",   price:14.0, rating:4.9, img:"https://images.unsplash.com/photo-1681740103054-7028833156b0?w=480&h=320&fit=crop&auto=format",  description:"Sortidos: chocolate, limão siciliano, maracujá e churros",                   popular:false,calories:620, tags:["Combo"],                     barcode:"7891234560019" },
  { id:20, name:"Bolo de Cenoura com Chocolate",category:"doces",   price:6.5,  rating:4.8, img:"https://images.unsplash.com/photo-1595080622896-844ff207e639?w=480&h=320&fit=crop&auto=format",  description:"Fatia generosa de bolo de cenoura com cobertura de ganache",                  popular:true, calories:380, tags:["Favorito"],               barcode:"7891234560020" },
  { id:21, name:"Mousse de Maracujá",           category:"doces",   price:7.0,  rating:4.7, img:"https://images.unsplash.com/photo-1622814651041-b9a3c54d60ab?w=480&h=320&fit=crop&auto=format",  description:"Mousse aerada de maracujá com calda de frutas vermelhas",                    popular:false,calories:210, tags:[],                            barcode:"7891234560021" },
  { id:22, name:"Marmita do Dia",               category:"marmita", price:18.0, rating:4.9, img:"https://images.unsplash.com/photo-1762631383815-784c04533802?w=480&h=320&fit=crop&auto=format",  description:"Arroz, feijão, proteína grelhada, salada fresca e farofa temperada",          popular:true, calories:650, tags:["Mais pedido"],             barcode:"7891234560022" },
  { id:23, name:"Marmita Vegetariana",          category:"marmita", price:16.0, rating:4.7, img:"https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=480&h=320&fit=crop&auto=format",  description:"Arroz integral, grão-de-bico refogado, legumes e salada verde",               popular:false,calories:520, tags:["Vegetariano","Saudável"],      barcode:"7891234560023" },
];

const PIX_KEY = "cantina@witichfraitag.edu.br";
const PLACEHOLDER_IMG = "https://images.unsplash.com/photo-1490474418585-ba9bad8fd0ea?w=480&h=320&fit=crop&auto=format";

function fmt(n: number) { return `R$ ${n.toFixed(2).replace(".", ",")}`; }
function cartKey(c: CartEntry) { return `${c.id}||${c.day}||${c.time}`; }

// ── Barcode display bars ────────────────────────────────────────────────────
function BarcodeBars({ code }: { code: string }) {
  const bars = useMemo(() => {
    const seed = code.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
    return Array.from({ length: 22 }, (_, i) => ({
      w: ((seed * (i + 7) * 13) % 3) + 1,
      h: ((seed * (i + 3) * 17) % 6) + 6,
    }));
  }, [code]);
  return (
    <div className="flex items-end gap-px h-5">
      {bars.map((b, i) => (
        <div key={i} style={{ width: b.w, height: `${b.h * 10}%` }}
          className="bg-foreground/70 rounded-sm" />
      ))}
    </div>
  );
}

// ── Mini Barcode Scanner (used inside forms) ────────────────────────────────
function MiniScanner({ onDetected, onClose }: { onDetected: (c: string) => void; onClose: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [scanning, setScanning] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const reader = new BrowserMultiFormatReader();
    async function start() {
      try {
        await reader.decodeFromVideoDevice(undefined, videoRef.current!, (result) => {
          if (!active || !result) return;
          onDetected(result.getText());
        });
        if (active) setScanning(true);
      } catch (e: any) { if (active) setErr(e?.message ?? "Câmera indisponível"); }
    }
    start();
    return () => { active = false; BrowserMultiFormatReader.releaseAllStreams(); };
  }, [onDetected]);

  return (
    <div className="rounded-xl overflow-hidden border border-border">
      <div className="relative bg-black aspect-video">
        <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="relative w-44 h-16">
            {[["top-0 left-0","border-t-2 border-l-2"],["top-0 right-0","border-t-2 border-r-2"],
              ["bottom-0 left-0","border-b-2 border-l-2"],["bottom-0 right-0","border-b-2 border-r-2"]
            ].map(([p,b]) => <div key={p} className={`absolute w-5 h-5 ${p} ${b} border-primary`} />)}
            {scanning && <div className="absolute left-1 right-1 h-0.5 bg-primary opacity-80 animate-bounce top-1/2" />}
          </div>
        </div>
        <button onClick={onClose}
          className="absolute top-2 right-2 bg-black/50 rounded-full p-1 hover:bg-black/70">
          <X className="w-4 h-4 text-white" />
        </button>
      </div>
      <div className="px-3 py-2 bg-muted text-xs text-center text-muted-foreground flex items-center justify-center gap-1.5">
        <Camera className="w-3.5 h-3.5" />
        {err ?? (scanning ? "Aponte para o código" : "Iniciando câmera...")}
      </div>
    </div>
  );
}

// ── Full-page Barcode Scanner Modal ─────────────────────────────────────────
function BarcodeScanner({ onDetected, onClose }: { onDetected: (c: string) => void; onClose: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [scanning, setScanning] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [manual, setManual] = useState("");

  useEffect(() => {
    let active = true;
    const reader = new BrowserMultiFormatReader();
    async function start() {
      try {
        await reader.decodeFromVideoDevice(undefined, videoRef.current!, (result) => {
          if (!active || !result) return;
          onDetected(result.getText());
        });
        if (active) setScanning(true);
      } catch (e: any) { if (active) setErr(e?.message ?? "Câmera não disponível"); }
    }
    start();
    return () => { active = false; BrowserMultiFormatReader.releaseAllStreams(); };
  }, [onDetected]);

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm bg-card rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <ScanLine className="w-5 h-5 text-primary" />
            <h2 className="font-black text-lg" style={{ fontFamily:"'Fraunces', serif" }}>Ler código de barras</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-full"><X className="w-5 h-5" /></button>
        </div>
        <div className="relative bg-black aspect-video">
          <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="relative w-56 h-24">
              {[["top-0 left-0","border-t-2 border-l-2"],["top-0 right-0","border-t-2 border-r-2"],
                ["bottom-0 left-0","border-b-2 border-l-2"],["bottom-0 right-0","border-b-2 border-r-2"]
              ].map(([p,b]) => <div key={p} className={`absolute w-6 h-6 ${p} ${b} border-primary`} />)}
              {scanning && <div className="absolute left-1 right-1 h-0.5 bg-primary opacity-80 animate-bounce top-1/2" />}
            </div>
          </div>
          <div className="absolute bottom-3 left-0 right-0 flex justify-center">
            <span className="bg-black/60 text-white text-xs px-3 py-1.5 rounded-full flex items-center gap-1.5">
              <Camera className="w-3.5 h-3.5" />
              {err ?? (scanning ? "Aponte para o código de barras" : "Iniciando câmera...")}
            </span>
          </div>
        </div>
        <div className="p-5">
          <p className="text-xs text-muted-foreground text-center mb-3">Ou digite o código manualmente</p>
          <form onSubmit={e => { e.preventDefault(); if (manual.trim()) onDetected(manual.trim()); }} className="flex gap-2">
            <div className="relative flex-1">
              <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input type="text" placeholder="Ex: 7891234560001" value={manual} onChange={e => setManual(e.target.value)}
                className="w-full bg-muted border border-border rounded-xl py-2.5 pl-9 pr-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary" />
            </div>
            <button type="submit" disabled={!manual.trim()}
              className="bg-primary text-primary-foreground px-4 rounded-xl font-bold text-sm disabled:opacity-40 hover:opacity-90 active:scale-95 transition-all">
              Buscar
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

// ── Register Drawer ──────────────────────────────────────────────────────────
const EMPTY_FORM = {
  name:"", category:"salgados" as CategoryId, price:"", calories:"",
  description:"", barcode:"", img:"", tags:[] as string[], popular:false,
};
type FormData = typeof EMPTY_FORM;

function RegisterDrawer({
  onSave, onClose, editItem,
}: {
  onSave: (item: Omit<MenuItem,"id">) => void;
  onClose: () => void;
  editItem?: MenuItem | null;
}) {
  const [form, setForm] = useState<FormData>(editItem ? {
    name: editItem.name, category: editItem.category,
    price: String(editItem.price), calories: String(editItem.calories),
    description: editItem.description, barcode: editItem.barcode,
    img: editItem.img, tags: editItem.tags, popular: editItem.popular ?? false,
  } : EMPTY_FORM);
  const [errors, setErrors]       = useState<Partial<Record<keyof FormData, string>>>({});
  const [scannerOpen, setScannerOpen] = useState(false);
  const [imgError, setImgError]   = useState(false);

  function set<K extends keyof FormData>(k: K, v: FormData[K]) {
    setForm(f => ({ ...f, [k]: v }));
    setErrors(e => ({ ...e, [k]: undefined }));
  }

  function toggleTag(t: string) {
    set("tags", form.tags.includes(t) ? form.tags.filter(x => x !== t) : [...form.tags, t]);
  }

  function validate(): boolean {
    const e: typeof errors = {};
    if (!form.name.trim())       e.name        = "Nome obrigatório";
    if (!form.price || isNaN(Number(form.price)) || Number(form.price) <= 0) e.price = "Preço inválido";
    if (!form.calories || isNaN(Number(form.calories))) e.calories = "Calorias inválidas";
    if (!form.barcode.trim())    e.barcode     = "Código de barras obrigatório";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    onSave({
      name: form.name.trim(),
      category: form.category,
      price: Number(form.price),
      calories: Number(form.calories),
      description: form.description.trim(),
      barcode: form.barcode.trim(),
      img: form.img.trim() || PLACEHOLDER_IMG,
      tags: form.tags,
      popular: form.popular,
      rating: editItem?.rating ?? 5.0,
    });
  }

  const imgSrc = form.img.trim() || PLACEHOLDER_IMG;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-card h-full flex flex-col shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="px-5 py-4 border-b border-border flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <UtensilsCrossed className="w-5 h-5 text-primary" />
            <h2 className="font-black text-xl" style={{ fontFamily:"'Fraunces', serif" }}>
              {editItem ? "Editar lanche" : "Cadastrar novo lanche"}
            </h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={submit} className="flex-1 overflow-y-auto p-5 space-y-5">

          {/* Image preview */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 block">
              Imagem do produto
            </label>
            <div className="h-36 bg-muted rounded-2xl overflow-hidden mb-2 relative">
              <img
                src={imgError ? PLACEHOLDER_IMG : imgSrc}
                alt="Preview"
                onError={() => setImgError(true)}
                onLoad={() => setImgError(false)}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 hover:opacity-100 transition-opacity">
                <ImageIcon className="w-8 h-8 text-white" />
              </div>
            </div>
            <div className="relative">
              <ImageIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input type="url" placeholder="URL da imagem (opcional)" value={form.img}
                onChange={e => { set("img", e.target.value); setImgError(false); }}
                className="w-full bg-muted border border-border rounded-xl py-2.5 pl-10 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary" />
            </div>
          </div>

          {/* Name */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5 block">
              Nome do lanche *
            </label>
            <input type="text" placeholder="Ex: Coxinha de Frango" value={form.name}
              onChange={e => set("name", e.target.value)}
              className={`w-full bg-muted border rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary transition-all ${errors.name ? "border-destructive" : "border-border"}`} />
            {errors.name && <p className="text-xs text-destructive mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.name}</p>}
          </div>

          {/* Category + Popular */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5 block">Categoria *</label>
              <select value={form.category} onChange={e => set("category", e.target.value as CategoryId)}
                className="w-full bg-muted border border-border rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary">
                {CATEGORIES.filter(c => c.id !== "all").map(c => (
                  <option key={c.id} value={c.id}>{c.icon} {c.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5 block">Destaque</label>
              <button type="button" onClick={() => set("popular", !form.popular)}
                className={`w-full py-2.5 px-3 rounded-xl border text-sm font-semibold flex items-center justify-center gap-2 transition-all ${
                  form.popular ? "bg-yellow-100 border-yellow-400 text-yellow-800" : "bg-muted border-border text-muted-foreground"
                }`}>
                ⭐ {form.popular ? "Popular" : "Normal"}
              </button>
            </div>
          </div>

          {/* Price + Calories */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5 block">Preço (R$) *</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-muted-foreground">R$</span>
                <input type="number" step="0.5" min="0" placeholder="0,00" value={form.price}
                  onChange={e => set("price", e.target.value)}
                  className={`w-full bg-muted border rounded-xl py-2.5 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary ${errors.price ? "border-destructive" : "border-border"}`} />
              </div>
              {errors.price && <p className="text-xs text-destructive mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.price}</p>}
            </div>
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5 block">Calorias *</label>
              <div className="relative">
                <Flame className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input type="number" min="0" placeholder="kcal" value={form.calories}
                  onChange={e => set("calories", e.target.value)}
                  className={`w-full bg-muted border rounded-xl py-2.5 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary ${errors.calories ? "border-destructive" : "border-border"}`} />
              </div>
              {errors.calories && <p className="text-xs text-destructive mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.calories}</p>}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5 block">Descrição</label>
            <textarea placeholder="Ingredientes, modo de preparo, diferenciais..." value={form.description}
              onChange={e => set("description", e.target.value)} rows={3}
              className="w-full bg-muted border border-border rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary resize-none" />
          </div>

          {/* Barcode */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5 block">
              Código de barras *
            </label>
            <div className="flex gap-2 mb-2">
              <div className="relative flex-1">
                <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input type="text" placeholder="Ex: 7891234560001" value={form.barcode}
                  onChange={e => set("barcode", e.target.value)}
                  className={`w-full bg-muted border rounded-xl py-2.5 pl-9 pr-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary ${errors.barcode ? "border-destructive" : "border-border"}`} />
              </div>
              <button type="button" onClick={() => setScannerOpen(s => !s)}
                className={`flex items-center gap-1.5 px-3 rounded-xl border text-sm font-semibold shrink-0 transition-all ${
                  scannerOpen ? "bg-primary text-primary-foreground border-primary" : "bg-muted border-border hover:border-primary/40"
                }`}>
                <ScanLine className="w-4 h-4" />
                <span className="hidden sm:inline">Escanear</span>
              </button>
            </div>
            {errors.barcode && <p className="text-xs text-destructive mb-2 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.barcode}</p>}
            {/* Inline scanner */}
            {scannerOpen && (
              <MiniScanner
                onDetected={code => { set("barcode", code); setScannerOpen(false); }}
                onClose={() => setScannerOpen(false)}
              />
            )}
            {/* Live barcode preview */}
            {form.barcode && !scannerOpen && (
              <div className="bg-muted rounded-xl px-4 py-2.5 flex items-center justify-between gap-3">
                <BarcodeBars code={form.barcode} />
                <span className="text-xs font-mono text-muted-foreground shrink-0">{form.barcode}</span>
              </div>
            )}
          </div>

          {/* Tags */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 block flex items-center gap-1">
              <Tag className="w-3.5 h-3.5" /> Tags / atributos
            </label>
            <div className="flex flex-wrap gap-2">
              {ALL_TAGS.map(t => (
                <button key={t} type="button" onClick={() => toggleTag(t)}
                  className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition-all ${
                    form.tags.includes(t)
                      ? `${TAG_STYLE[t]} border-transparent`
                      : "bg-muted border-border text-muted-foreground hover:border-foreground/20"
                  }`}>
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className="h-2" />
        </form>

        {/* Footer */}
        <div className="p-5 border-t border-border bg-card shrink-0">
          <button type="submit" form="" onClick={submit}
            className="w-full bg-primary text-primary-foreground py-4 rounded-2xl font-bold hover:opacity-90 active:scale-95 transition-all shadow-lg shadow-primary/25 flex items-center justify-center gap-2">
            <CheckCircle2 className="w-5 h-5" />
            {editItem ? "Salvar alterações" : "Cadastrar lanche"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [menu, setMenu]             = useState<MenuItem[]>(INITIAL_MENU);
  const [category, setCategory]     = useState<CategoryId>("all");
  const [search, setSearch]         = useState("");
  const [barcodeFilter, setBarcodeFilter] = useState("");
  const [cart, setCart]             = useState<CartEntry[]>([]);
  const [cartOpen, setCartOpen]     = useState(false);
  const [cartStep, setCartStep]     = useState<CartStep>("items");
  const [pickedItem, setPickedItem] = useState<MenuItem | null>(null);
  const [day, setDay]               = useState(WEEK_DAYS[0]);
  const [slot, setSlot]             = useState(SLOTS[0]);
  const [view, setView]             = useState<"menu" | "success">("menu");
  const [payMethod, setPayMethod]   = useState<PayMethod>("pix");
  const [pixCopied, setPixCopied]   = useState(false);
  const [healthOnly, setHealthOnly] = useState(false);
  const [scannerOpen, setScannerOpen]   = useState(false);
  const [registerOpen, setRegisterOpen] = useState(false);
  const [editItem, setEditItem]         = useState<MenuItem | null>(null);
  const nextId = useRef(INITIAL_MENU.length + 1);

  const handleBarcodeScan = useCallback((code: string) => {
    const found = menu.find(i => i.barcode === code);
    setScannerOpen(false);
    setBarcodeFilter(code);
    setSearch("");
    if (found) setPickedItem(found);
  }, [menu]);

  function clearBarcodeFilter() { setBarcodeFilter(""); }

  function saveItem(data: Omit<MenuItem,"id">) {
    if (editItem) {
      setMenu(m => m.map(i => i.id === editItem.id ? { ...data, id: editItem.id } : i));
    } else {
      setMenu(m => [...m, { ...data, id: nextId.current++ }]);
    }
    setRegisterOpen(false);
    setEditItem(null);
  }

  function deleteItem(id: number) {
    setMenu(m => m.filter(i => i.id !== id));
    setCart(c => c.filter(i => i.id !== id));
    setPickedItem(null);
  }

  const filtered = useMemo(() => {
    const healthTags = ["Saudável","Vegano","Vegetariano","Sem açúcar","Sem glúten"];
    return menu.filter(item => {
      if (barcodeFilter) return item.barcode === barcodeFilter;
      const matchCat    = category === "all" || item.category === category;
      const matchSearch = item.name.toLowerCase().includes(search.toLowerCase()) || item.barcode.includes(search);
      const matchHealth = !healthOnly || item.tags.some(t => healthTags.includes(t));
      return matchCat && matchSearch && matchHealth;
    });
  }, [menu, category, search, healthOnly, barcodeFilter]);

  const popular    = menu.filter(i => i.popular);
  const cartCount  = cart.reduce((s, i) => s + i.quantity, 0);
  const cartTotal  = cart.reduce((s, i) => s + i.price * i.quantity, 0);
  const cartGroups = Array.from(new Set(cart.map(c => `${c.day}||${c.time}`))).map(g => {
    const [gDay, gSlot] = g.split("||");
    return { gDay, gSlot, items: cart.filter(c => c.day === gDay && c.time === gSlot) };
  });

  function addToCart(item: MenuItem) {
    const entry: CartEntry = { ...item, quantity: 1, day, time: slot };
    const key = cartKey(entry);
    setCart(prev => {
      const hit = prev.find(c => cartKey(c) === key);
      if (hit) return prev.map(c => cartKey(c) === key ? { ...c, quantity: c.quantity + 1 } : c);
      return [...prev, entry];
    });
    setPickedItem(null);
  }

  function changeQty(entry: CartEntry, delta: number) {
    const key = cartKey(entry);
    setCart(prev => prev.map(c => cartKey(c) === key ? { ...c, quantity: c.quantity + delta } : c).filter(c => c.quantity > 0));
  }

  function openCart() { setCartStep("items"); setCartOpen(true); }
  function copyPix() { navigator.clipboard.writeText(PIX_KEY).catch(() => {}); setPixCopied(true); setTimeout(() => setPixCopied(false), 2500); }
  function confirmOrder() { setCart([]); setCartOpen(false); setCartStep("items"); setView("success"); }

  // ── Success ────────────────────────────────────────────────────────────────
  if (view === "success") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6"
           style={{ fontFamily:"'Plus Jakarta Sans', sans-serif" }}>
        <div className="text-center max-w-sm w-full">
          <div className="w-28 h-28 rounded-full bg-accent flex items-center justify-center mx-auto mb-8 shadow-xl shadow-accent/30">
            <CheckCircle2 className="w-14 h-14 text-accent-foreground" />
          </div>
          <h1 className="font-black text-3xl mb-3" style={{ fontFamily:"'Fraunces', serif" }}>Pedido confirmado!</h1>
          <p className="text-muted-foreground leading-relaxed mb-6">A cantina foi notificada e preparará seu lanche no horário escolhido.</p>
          <div className="bg-card rounded-2xl border border-border p-5 mb-8 text-left space-y-3">
            {[
              { icon:<Bell className="w-4 h-4 text-primary" />, title:"Lembrete ativado", sub:"10 minutos antes do horário" },
              { icon:<Shield className="w-4 h-4 text-primary" />, title:"Pagamento registrado",
                sub: payMethod==="pix"?"PIX enviado":payMethod==="card"?"Cartão processado":"Pagamento na retirada" },
            ].map(r => (
              <div key={r.title} className="flex items-center gap-3 text-sm">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">{r.icon}</div>
                <div><p className="font-semibold">{r.title}</p><p className="text-muted-foreground text-xs">{r.sub}</p></div>
              </div>
            ))}
          </div>
          <button onClick={() => { setView("menu"); setPayMethod("pix"); }}
            className="w-full bg-primary text-primary-foreground py-4 rounded-2xl font-bold hover:opacity-90 active:scale-95 transition-all">
            Fazer novo pedido
          </button>
        </div>
      </div>
    );
  }

  // ── Main ──────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background" style={{ fontFamily:"'Plus Jakarta Sans', sans-serif" }}>

      {/* Header */}
      <header className="sticky top-0 z-40 bg-primary shadow-lg shadow-primary/20">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <div className="font-black text-2xl text-primary-foreground tracking-tight"
                 style={{ fontFamily:"'Fraunces', serif" }}>LancheFood da Lory</div>
            <div className="flex items-center gap-1 text-xs text-white/70 mt-0.5">
              <MapPin className="w-3 h-3" /> E.M. Wittich Fraitag — Av. Miguel Alves Castanhas
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Register button */}
            <button onClick={() => { setEditItem(null); setRegisterOpen(true); }}
              className="flex items-center gap-1.5 bg-white/15 hover:bg-white/25 text-primary-foreground rounded-full px-3 py-2 text-sm font-semibold transition-colors">
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Novo lanche</span>
            </button>
            <button onClick={openCart}
              className="relative flex items-center gap-2 bg-white/15 hover:bg-white/25 text-primary-foreground rounded-full px-4 py-2 transition-colors">
              <ShoppingCart className="w-5 h-5" />
              <span className="text-sm font-semibold hidden sm:inline">Carrinho</span>
              {cartCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-yellow-400 text-yellow-900 text-xs font-black rounded-full flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Banner */}
      <div className="bg-secondary/60 border-b border-border">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <div className="bg-primary rounded-2xl p-5 flex items-center justify-between relative overflow-hidden">
            <div className="absolute inset-0 opacity-10"
                 style={{ backgroundImage:"radial-gradient(circle at 80% 50%, white 0%, transparent 60%)" }} />
            <div className="relative">
              <p className="text-white/70 text-xs font-bold uppercase tracking-widest mb-1">Cantina escolar digital</p>
              <h2 className="text-white font-black text-xl mb-2" style={{ fontFamily:"'Fraunces', serif" }}>
                Agende, pague e retire sem fila
              </h2>
              <div className="flex flex-wrap gap-2">
                <span className="flex items-center gap-1.5 text-white/80 text-xs bg-white/15 rounded-full px-3 py-1">
                  <Smartphone className="w-3 h-3" /> PIX do celular
                </span>
                <span className="flex items-center gap-1.5 text-white/80 text-xs bg-white/15 rounded-full px-3 py-1">
                  <ScanLine className="w-3 h-3" /> Leitor de código de barras
                </span>
                <span className="flex items-center gap-1.5 text-white/80 text-xs bg-white/15 rounded-full px-3 py-1">
                  <Users className="w-3 h-3" /> Pais pagam de casa
                </span>
              </div>
            </div>
            <div className="text-5xl select-none shrink-0">🧃</div>
          </div>
        </div>
      </div>

      {/* Schedule Bar */}
      <div className="bg-card border-b border-border sticky top-[65px] z-30">
        <div className="max-w-5xl mx-auto px-4 py-2.5 flex items-center gap-3 overflow-x-auto">
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-wide shrink-0 hidden sm:block">Agendar:</span>
          {[
            { icon:<Calendar className="w-4 h-4 text-primary shrink-0" />, val:day, opts:WEEK_DAYS, set:setDay },
            { icon:<Clock className="w-4 h-4 text-primary shrink-0" />, val:slot, opts:SLOTS, set:setSlot },
          ].map((s, i) => (
            <div key={i} className="flex items-center gap-2 bg-muted rounded-xl px-3 py-2 shrink-0">
              {s.icon}
              <select value={s.val} onChange={e => s.set(e.target.value)}
                className="text-sm font-semibold bg-transparent outline-none cursor-pointer text-foreground">
                {s.opts.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
          ))}
          <div className="ml-auto shrink-0">
            <button onClick={() => setHealthOnly(h => !h)}
              className={`flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl border transition-all ${
                healthOnly ? "bg-accent text-accent-foreground border-accent" : "bg-muted text-muted-foreground border-border hover:border-accent/40"
              }`}>
              <Leaf className="w-3.5 h-3.5" /> Saudável
            </button>
          </div>
        </div>
      </div>

      {/* Main */}
      <main className="max-w-5xl mx-auto px-4 py-6">

        {/* Search + Scanner */}
        <div className="flex gap-2 mb-5">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input type="text" placeholder="Buscar nome ou código de barras..." value={search}
              onChange={e => { setSearch(e.target.value); clearBarcodeFilter(); }}
              className="w-full bg-card border border-border rounded-full py-3 pl-11 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary transition-all" />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <button onClick={() => setScannerOpen(true)}
            className="flex items-center gap-2 bg-primary text-primary-foreground rounded-full px-4 py-3 font-semibold text-sm hover:opacity-90 active:scale-95 transition-all shadow-md shadow-primary/25 shrink-0">
            <ScanLine className="w-4 h-4" />
            <span className="hidden sm:inline">Escanear</span>
          </button>
        </div>

        {/* Barcode filter banner */}
        {barcodeFilter && (
          <div className="flex items-center gap-3 bg-primary/8 border border-primary/20 rounded-2xl px-4 py-3 mb-5">
            <ScanLine className="w-5 h-5 text-primary shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold">Código escaneado</p>
              <p className="text-xs text-muted-foreground font-mono truncate">{barcodeFilter}</p>
            </div>
            {filtered.length > 0
              ? <span className="text-xs font-bold text-accent bg-accent/10 px-2 py-1 rounded-full shrink-0">{filtered.length} encontrado</span>
              : <span className="text-xs font-bold text-destructive bg-destructive/10 px-2 py-1 rounded-full shrink-0">Não encontrado</span>}
            <button onClick={clearBarcodeFilter} className="text-muted-foreground hover:text-foreground shrink-0">
              <XCircle className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Categories */}
        {!barcodeFilter && (
          <div className="flex gap-2 overflow-x-auto pb-2 mb-6 scrollbar-hide">
            {CATEGORIES.map(cat => (
              <button key={cat.id} onClick={() => setCategory(cat.id)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold shrink-0 transition-all border ${
                  category === cat.id ? "bg-primary text-primary-foreground border-primary shadow-md shadow-primary/20"
                  : "bg-card text-foreground border-border hover:border-primary/40 hover:bg-secondary"
                }`}>
                {cat.icon} {cat.label}
              </button>
            ))}
          </div>
        )}

        {/* Popular strip */}
        {category === "all" && !search && !healthOnly && !barcodeFilter && popular.length > 0 && (
          <section className="mb-8">
            <h2 className="font-bold text-lg mb-3" style={{ fontFamily:"'Fraunces', serif" }}>⭐ Mais pedidos hoje</h2>
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4">
              {popular.map(item => (
                <button key={item.id} onClick={() => setPickedItem(item)}
                  className="shrink-0 w-40 bg-card rounded-2xl border border-border overflow-hidden text-left hover:shadow-lg hover:border-primary/30 hover:-translate-y-0.5 transition-all active:scale-95 group">
                  <div className="h-24 bg-muted overflow-hidden">
                    <img src={item.img} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  </div>
                  <div className="p-3">
                    <p className="font-semibold text-xs leading-tight mb-1 line-clamp-2">{item.name}</p>
                    <p className="text-primary font-bold text-sm">{fmt(item.price)}</p>
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Grid */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-lg" style={{ fontFamily:"'Fraunces', serif" }}>
              {barcodeFilter ? "Resultado da leitura" : category === "all" ? "Cardápio completo" : CATEGORIES.find(c => c.id === category)?.label}
              <span className="text-sm font-normal text-muted-foreground ml-2">({filtered.length})</span>
            </h2>
            <button onClick={() => { setEditItem(null); setRegisterOpen(true); }}
              className="flex items-center gap-1.5 text-sm font-bold text-primary hover:text-primary/80 transition-colors">
              <Plus className="w-4 h-4" /> Cadastrar
            </button>
          </div>

          {filtered.length === 0 && (
            <div className="text-center py-20 text-muted-foreground">
              <div className="text-5xl mb-4">{barcodeFilter ? "📊" : "🔍"}</div>
              <p className="font-semibold text-foreground">{barcodeFilter ? "Código não cadastrado" : "Nenhum item encontrado"}</p>
              <p className="text-sm mt-1">{barcodeFilter ? `Código ${barcodeFilter} não corresponde a nenhum produto` : "Tente outro nome ou categoria"}</p>
              <button onClick={() => { setEditItem(null); setRegisterOpen(true); }}
                className="mt-5 inline-flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-full text-sm font-bold hover:opacity-90 transition-all">
                <Plus className="w-4 h-4" /> Cadastrar novo lanche
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(item => (
              <div key={item.id} className="bg-card rounded-2xl border border-border overflow-hidden hover:shadow-xl hover:border-primary/25 hover:-translate-y-0.5 transition-all group relative">
                {/* Edit/Delete actions */}
                <div className="absolute top-3 right-3 z-10 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => { setEditItem(item); setRegisterOpen(true); }}
                    className="w-7 h-7 bg-white/90 rounded-full flex items-center justify-center shadow hover:bg-white transition-colors">
                    <ScanLine className="w-3.5 h-3.5 text-foreground" />
                  </button>
                  <button onClick={() => deleteItem(item.id)}
                    className="w-7 h-7 bg-white/90 rounded-full flex items-center justify-center shadow hover:bg-destructive hover:text-destructive-foreground transition-colors">
                    <Trash2 className="w-3.5 h-3.5 text-foreground" />
                  </button>
                </div>
                <button className="w-full text-left" onClick={() => setPickedItem(item)}>
                  <div className="h-44 bg-muted overflow-hidden relative">
                    <img src={item.img} alt={item.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    {item.tags.length > 0 && (
                      <span className={`absolute top-3 left-3 text-xs font-bold px-2.5 py-1 rounded-full ${TAG_STYLE[item.tags[0]] ?? "bg-white/80 text-foreground"}`}>
                        {item.tags[0]}
                      </span>
                    )}
                  </div>
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h3 className="font-bold text-foreground leading-tight">{item.name}</h3>
                      <span className="flex items-center gap-0.5 shrink-0 text-xs text-muted-foreground mt-0.5">
                        <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" /> {item.rating}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mb-3 line-clamp-2 leading-relaxed">{item.description}</p>
                    {item.tags.length > 1 && (
                      <div className="flex flex-wrap gap-1 mb-3">
                        {item.tags.slice(1,3).map(t => (
                          <span key={t} className={`text-xs font-semibold px-2 py-0.5 rounded-full ${TAG_STYLE[t] ?? ""}`}>{t}</span>
                        ))}
                      </div>
                    )}
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-bold text-primary text-lg">{fmt(item.price)}</span>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Flame className="w-3 h-3" /> {item.calories} kcal
                      </span>
                    </div>
                    <div className="border-t border-border/50 pt-3 flex items-center justify-between gap-2">
                      <BarcodeBars code={item.barcode} />
                      <span className="text-xs font-mono text-muted-foreground shrink-0">{item.barcode}</span>
                    </div>
                  </div>
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* Info */}
        <section className="mt-16 mb-10">
          <h2 className="font-black text-2xl mb-2 text-center" style={{ fontFamily:"'Fraunces', serif" }}>
            Por que o LancheFood da Lory?
          </h2>
          <p className="text-muted-foreground text-center text-sm mb-8 max-w-lg mx-auto">
            Filas na cantina consumiam até 15 min do recreio. Com agendamento digital, esse tempo volta para os alunos.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { icon:<Clock className="w-5 h-5" />, title:"Sem fila, sem espera", text:"Lanche pronto antes de você chegar. Só pegar e curtir o recreio." },
              { icon:<ScanLine className="w-5 h-5" />, title:"Código de barras", text:"Escaneia a embalagem e o produto aparece direto — rápido na cantina." },
              { icon:<Heart className="w-5 h-5" />, title:"Opções saudáveis", text:"Açaí, vitaminas, frutas e marmitas balanceadas com calorias visíveis." },
            ].map(({ icon, title, text }) => (
              <div key={title} className="bg-card rounded-2xl border border-border p-5">
                <div className="w-10 h-10 bg-primary/10 text-primary rounded-xl flex items-center justify-center mb-3">{icon}</div>
                <h3 className="font-bold mb-1">{title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{text}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* Item Sheet */}
      {pickedItem && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setPickedItem(null)} />
          <div className="relative w-full max-w-md bg-card rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl">
            <div className="h-52 bg-muted relative">
              <img src={pickedItem.img} alt={pickedItem.name} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
              <button onClick={() => setPickedItem(null)}
                className="absolute top-4 right-4 bg-black/30 hover:bg-black/50 rounded-full p-1.5 transition-colors">
                <X className="w-5 h-5 text-white" />
              </button>
              {pickedItem.tags.length > 0 && (
                <span className={`absolute top-4 left-4 text-xs font-bold px-2.5 py-1 rounded-full ${TAG_STYLE[pickedItem.tags[0]] ?? "bg-white/80 text-foreground"}`}>
                  {pickedItem.tags[0]}
                </span>
              )}
            </div>
            <div className="p-6">
              <div className="flex items-start justify-between gap-3 mb-1">
                <h2 className="font-black text-2xl leading-tight" style={{ fontFamily:"'Fraunces', serif" }}>{pickedItem.name}</h2>
                <span className="text-primary font-black text-xl shrink-0">{fmt(pickedItem.price)}</span>
              </div>
              <div className="flex items-center gap-3 mb-3">
                <span className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" /> {pickedItem.rating}
                </span>
                <span className="text-muted-foreground">·</span>
                <span className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Flame className="w-3.5 h-3.5" /> {pickedItem.calories} kcal
                </span>
              </div>
              {pickedItem.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {pickedItem.tags.map(t => (
                    <span key={t} className={`text-xs font-semibold px-2.5 py-1 rounded-full ${TAG_STYLE[t] ?? ""}`}>{t}</span>
                  ))}
                </div>
              )}
              <p className="text-muted-foreground text-sm leading-relaxed mb-4">{pickedItem.description}</p>
              <div className="bg-muted rounded-xl px-4 py-2.5 flex items-center justify-between gap-3 mb-5">
                <div className="flex items-center gap-2">
                  <Hash className="w-4 h-4 text-muted-foreground shrink-0" />
                  <span className="text-xs font-mono font-bold">{pickedItem.barcode}</span>
                </div>
                <BarcodeBars code={pickedItem.barcode} />
              </div>
              <div className="grid grid-cols-2 gap-2 mb-5">
                {[
                  { icon:<Calendar className="w-4 h-4 text-primary shrink-0" />, val:day, opts:WEEK_DAYS, set:setDay },
                  { icon:<Clock className="w-4 h-4 text-primary shrink-0" />, val:slot, opts:SLOTS, set:setSlot },
                ].map((s, i) => (
                  <div key={i} className="flex items-center gap-2 bg-muted rounded-xl px-3 py-3">
                    {s.icon}
                    <select value={s.val} onChange={e => s.set(e.target.value)}
                      className="flex-1 bg-transparent text-xs font-semibold outline-none cursor-pointer text-foreground w-full">
                      {s.opts.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <button onClick={() => { setEditItem(pickedItem); setPickedItem(null); setRegisterOpen(true); }}
                  className="flex items-center gap-1.5 bg-muted border border-border text-foreground px-4 py-4 rounded-2xl font-semibold text-sm hover:bg-secondary transition-colors">
                  <UtensilsCrossed className="w-4 h-4" /> Editar
                </button>
                <button onClick={() => addToCart(pickedItem)}
                  className="flex-1 bg-primary text-primary-foreground py-4 rounded-2xl font-bold text-base hover:opacity-90 active:scale-95 transition-all shadow-lg shadow-primary/25">
                  Adicionar — {fmt(pickedItem.price)}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cart Drawer */}
      {cartOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setCartOpen(false)} />
          <div className="relative w-full max-w-sm bg-card h-full flex flex-col shadow-2xl">
            <div className="px-5 py-4 border-b border-border flex items-center gap-3">
              {cartStep === "payment" && (
                <button onClick={() => setCartStep("items")} className="p-1.5 hover:bg-muted rounded-full">
                  <ChevronLeft className="w-5 h-5" />
                </button>
              )}
              <h2 className="font-black text-xl flex-1" style={{ fontFamily:"'Fraunces', serif" }}>
                {cartStep === "items" ? "Carrinho" : "Forma de pagamento"}
              </h2>
              <button onClick={() => setCartOpen(false)} className="p-2 hover:bg-muted rounded-full"><X className="w-5 h-5" /></button>
            </div>
            <div className="px-5 py-2.5 bg-muted/50 border-b border-border flex items-center gap-2">
              {["items","payment"].map((s, i) => (
                <div key={s} className="flex items-center gap-2">
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-black transition-all ${
                    cartStep === s ? "bg-primary text-primary-foreground" :
                    (i===0 && cartStep==="payment") ? "bg-accent text-accent-foreground" : "bg-border text-muted-foreground"
                  }`}>
                    {i===0 && cartStep==="payment" ? <CheckCircle2 className="w-3 h-3" /> : i+1}
                  </div>
                  <span className="text-xs font-semibold text-muted-foreground">{s==="items"?"Itens":"Pagamento"}</span>
                  {i<1 && <div className="w-8 h-px bg-border mx-1" />}
                </div>
              ))}
            </div>
            {cart.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-3 p-8 text-center">
                <ShoppingCart className="w-14 h-14 text-border" />
                <p className="font-bold">Carrinho vazio</p>
                <p className="text-sm text-muted-foreground">Escolha seus lanches favoritos para agendar.</p>
              </div>
            ) : cartStep === "items" ? (
              <>
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {cartGroups.map(({ gDay, gSlot, items }) => (
                    <div key={`${gDay}||${gSlot}`} className="bg-muted rounded-2xl overflow-hidden">
                      <div className="px-4 py-2.5 border-b border-border/50 flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5 text-primary" />
                        <span className="text-xs font-bold">{gDay}</span>
                        <span className="text-xs text-muted-foreground">· {gSlot}</span>
                      </div>
                      <div className="p-3 space-y-3">
                        {items.map(entry => (
                          <div key={cartKey(entry)} className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-xl bg-background overflow-hidden shrink-0">
                              <img src={entry.img} alt={entry.name} className="w-full h-full object-cover" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-sm leading-tight truncate">{entry.name}</p>
                              <p className="text-primary font-bold text-sm">{fmt(entry.price * entry.quantity)}</p>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <button onClick={() => changeQty(entry,-1)}
                                className="w-7 h-7 rounded-full bg-card border border-border flex items-center justify-center hover:border-primary transition-colors">
                                <Minus className="w-3 h-3" />
                              </button>
                              <span className="text-sm font-black w-4 text-center">{entry.quantity}</span>
                              <button onClick={() => changeQty(entry,+1)}
                                className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:opacity-90">
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="p-5 border-t border-border">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-muted-foreground font-medium">Total</span>
                    <span className="font-black text-2xl">{fmt(cartTotal)}</span>
                  </div>
                  <button onClick={() => setCartStep("payment")}
                    className="w-full bg-primary text-primary-foreground py-4 rounded-2xl font-bold hover:opacity-90 active:scale-95 transition-all shadow-lg shadow-primary/25 flex items-center justify-center gap-2">
                    Escolher pagamento <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="flex-1 overflow-y-auto p-4">
                  <div className="bg-muted rounded-2xl px-4 py-3 mb-5 flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">{cartCount} {cartCount===1?"item":"itens"}</span>
                    <span className="font-black text-lg">{fmt(cartTotal)}</span>
                  </div>
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">Como você quer pagar?</p>
                  <div className="space-y-3 mb-5">
                    {[
                      { id:"pix" as PayMethod, icon:<Zap className="w-5 h-5 text-teal-600" />, bg:"bg-teal-100", title:"PIX", sub:"Pague agora — pais podem pagar de casa" },
                      { id:"card" as PayMethod, icon:<CreditCard className="w-5 h-5 text-blue-600" />, bg:"bg-blue-100", title:"Cartão de Crédito / Débito", sub:"Débito à vista · Crédito em até 3x" },
                      { id:"cash" as PayMethod, icon:<Banknote className="w-5 h-5 text-orange-600" />, bg:"bg-orange-100", title:"Dinheiro ou PIX na retirada", sub:"Pague diretamente na cantina" },
                    ].map(opt => (
                      <button key={opt.id} onClick={() => setPayMethod(opt.id)}
                        className={`w-full rounded-2xl border-2 p-4 text-left transition-all ${payMethod===opt.id?"border-primary bg-secondary":"border-border bg-card hover:border-primary/40"}`}>
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 ${opt.bg} rounded-xl flex items-center justify-center shrink-0`}>{opt.icon}</div>
                          <div className="flex-1"><p className="font-bold text-sm">{opt.title}</p><p className="text-xs text-muted-foreground">{opt.sub}</p></div>
                          {payMethod===opt.id && <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />}
                        </div>
                      </button>
                    ))}
                  </div>
                  {payMethod==="pix" && (
                    <div className="bg-teal-50 border border-teal-200 rounded-2xl p-4">
                      <p className="text-xs font-bold text-teal-800 uppercase tracking-wide mb-2">Chave PIX da cantina</p>
                      <div className="flex items-center gap-2 bg-white rounded-xl px-3 py-2.5 border border-teal-200 mb-2">
                        <span className="flex-1 text-xs font-mono font-semibold truncate">{PIX_KEY}</span>
                        <button onClick={copyPix} className="flex items-center gap-1 text-xs font-bold text-teal-700 hover:text-teal-900 shrink-0">
                          <Copy className="w-3.5 h-3.5" />{pixCopied?"Copiado!":"Copiar"}
                        </button>
                      </div>
                      <p className="text-xs text-teal-700 text-center">Valor: <strong>{fmt(cartTotal)}</strong></p>
                    </div>
                  )}
                  {payMethod==="card" && (
                    <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
                      <p className="text-xs text-blue-700 leading-relaxed">💳 Após confirmar, você receberá um link seguro por SMS para inserir os dados do cartão.</p>
                    </div>
                  )}
                  {payMethod==="cash" && (
                    <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4">
                      <p className="text-xs text-orange-700 leading-relaxed">💵 Seu lanche será reservado. Pague na cantina ao retirar — dinheiro trocado ou PIX na hora.</p>
                    </div>
                  )}
                </div>
                <div className="p-5 border-t border-border">
                  <button onClick={confirmOrder}
                    className="w-full bg-primary text-primary-foreground py-4 rounded-2xl font-bold hover:opacity-90 active:scale-95 transition-all shadow-lg shadow-primary/25">
                    {payMethod==="pix"?"Já enviei o PIX — confirmar":payMethod==="card"?"Confirmar e receber link":"Reservar e pagar na retirada"}
                  </button>
                  <p className="text-center text-xs text-muted-foreground mt-2.5 flex items-center justify-center gap-1">
                    <Shield className="w-3 h-3" /> Pedido protegido pela política da cantina
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Register Drawer */}
      {registerOpen && (
        <RegisterDrawer
          onSave={saveItem}
          onClose={() => { setRegisterOpen(false); setEditItem(null); }}
          editItem={editItem}
        />
      )}

      {/* Global Barcode Scanner */}
      {scannerOpen && (
        <BarcodeScanner onDetected={handleBarcodeScan} onClose={() => setScannerOpen(false)} />
      )}

      {/* Floating cart — mobile */}
      {cartCount > 0 && !cartOpen && (
        <div className="fixed bottom-6 left-0 right-0 flex justify-center z-30 px-4 sm:hidden">
          <button onClick={openCart}
            className="bg-primary text-primary-foreground rounded-full px-6 py-4 font-bold shadow-2xl shadow-primary/40 flex items-center gap-3 hover:opacity-90 active:scale-95 transition-all">
            <ShoppingCart className="w-5 h-5" />
            Ver carrinho ({cartCount}) · {fmt(cartTotal)}
          </button>
        </div>
      )}
    </div>
  );
}
