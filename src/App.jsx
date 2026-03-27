import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, setDoc, collection, onSnapshot, addDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { ShoppingBag, Plus, Trash2, Settings, ExternalLink, MessageCircle, ChevronRight, User, MapPin, Store, Copy, Check, Package, ArrowLeft, Loader2, AlertCircle } from 'lucide-react';

// --- CONFIGURACIÓN DE FIREBASE ---
let app, auth, db;
const APP_ID = "wa-saas-v1";

try {
  // Intentamos leer de las variables de entorno de Vercel (VITE_...) 
  // o de la variable global del entorno de desarrollo
  const configRaw = import.meta.env.VITE_FIREBASE_CONFIG || (typeof __firebase_config !== 'undefined' ? __firebase_config : null);
  
  if (!configRaw) throw new Error("Falta la configuración de Firebase");
  
  const firebaseConfig = typeof configRaw === 'string' ? JSON.parse(configRaw) : configRaw;
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
} catch (e) {
  console.error("Error inicializando Firebase:", e);
}

const App = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [view, setView] = useState('landing'); 
  const [storeData, setStoreData] = useState(null);
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [showCheckout, setShowCheckout] = useState(false);
  const [customerData, setCustomerData] = useState({ name: '', address: '', payment: 'Efectivo' });

  useEffect(() => {
    if (!auth) {
      setError("Configuración de Firebase no encontrada. Revisa las variables de entorno en Vercel.");
      setLoading(false);
      return;
    }

    const unsubAuth = onAuthStateChanged(auth, async (u) => {
      try {
        if (!u) {
          await signInAnonymously(auth);
        } else {
          setUser(u);
          setLoading(false);
        }
      } catch (err) {
        setError("Error al autenticar: " + err.message);
        setLoading(false);
      }
    });
    return () => unsubAuth();
  }, []);

  useEffect(() => {
    if (!user || !db) return;

    const storeRef = doc(db, 'artifacts', APP_ID, 'public', 'data', 'stores', user.uid);
    const unsubStore = onSnapshot(storeRef, (snap) => {
      if (snap.exists()) setStoreData(snap.data());
    }, (err) => console.error("Error cargando tienda:", err));

    const productsRef = collection(db, 'artifacts', APP_ID, 'public', 'data', 'products');
    const unsubProducts = onSnapshot(productsRef, (snap) => {
      const all = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setProducts(all.filter(p => p.ownerId === user.uid));
    }, (err) => console.error("Error cargando productos:", err));

    return () => { unsubStore(); unsubProducts(); };
  }, [user]);

  // Funciones de utilidad
  const createStore = async (name) => {
    if (!name || !user) return;
    await setDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'stores', user.uid), {
      name, whatsapp: '51900000000', currency: 'S/', ownerId: user.uid
    });
    setView('admin');
  };

  const updateStore = async (data) => {
    await updateDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'stores', user.uid), data);
  };

  const addProduct = async (p) => {
    await addDoc(collection(db, 'artifacts', APP_ID, 'public', 'data', 'products'), {
      ...p, ownerId: user.uid
    });
  };

  if (error) return (
    <div className="h-screen flex flex-col items-center justify-center p-6 bg-red-50 text-red-600 text-center">
      <AlertCircle size={48} className="mb-4" />
      <h1 className="text-xl font-bold">Error de Configuración</h1>
      <p className="max-w-md mt-2">{error}</p>
      <p className="text-sm mt-4 text-red-400">Asegúrate de haber añadido VITE_FIREBASE_CONFIG en Vercel.</p>
    </div>
  );

  if (loading) return (
    <div className="h-screen flex items-center justify-center bg-white">
      <Loader2 className="animate-spin text-indigo-600" size={40} />
    </div>
  );

  // --- LOGICA DE VISTAS ---
  if (!storeData && view !== 'store') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gray-50">
        <div className="bg-white p-10 rounded-[3rem] shadow-xl shadow-indigo-100 max-w-sm w-full text-center">
          <Store size={60} className="text-indigo-600 mx-auto mb-6" />
          <h1 className="text-3xl font-black text-gray-900 mb-2">MiTienda WA</h1>
          <p className="text-gray-500 mb-8">Crea tu catálogo digital en segundos.</p>
          <input 
            id="storeName" 
            placeholder="Nombre de tu negocio" 
            className="w-full p-4 border rounded-2xl mb-4 outline-none focus:ring-2 ring-indigo-500 transition" 
          />
          <button 
            onClick={() => createStore(document.getElementById('storeName').value)} 
            className="w-full bg-indigo-600 text-white p-4 rounded-2xl font-bold hover:bg-indigo-700 transition"
          >
            Empezar ahora
          </button>
        </div>
      </div>
    );
  }

  // Vista Admin / Tienda Pública (Simplificada para el ejemplo)
  return (
    <div className="min-h-screen bg-gray-50">
      {view === 'admin' ? (
        <div className="max-w-4xl mx-auto p-4 space-y-6">
          <header className="flex justify-between items-center bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
            <h2 className="text-xl font-bold">{storeData?.name}</h2>
            <button onClick={() => setView('store')} className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-bold">
              <ExternalLink size={16} /> Ver Tienda
            </button>
          </header>
          
          <div className="bg-white p-6 rounded-3xl border border-gray-100 space-y-4">
             <h3 className="font-bold flex items-center gap-2"><Settings size={18}/> Configuración</h3>
             <div className="space-y-3">
                <label className="text-xs font-bold text-gray-400 uppercase">WhatsApp (Ej: 51987654321)</label>
                <input 
                  value={storeData?.whatsapp} 
                  onChange={e => updateStore({whatsapp: e.target.value})} 
                  className="w-full p-3 bg-gray-50 border rounded-xl outline-none"
                />
             </div>
          </div>

          <div className="space-y-4">
             <h3 className="font-bold text-xl px-2">Productos</h3>
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {products.map(p => (
                  <div key={p.id} className="bg-white p-4 rounded-2xl border flex justify-between items-center">
                    <span className="font-medium">{p.name} - {storeData.currency}{p.price}</span>
                    <button onClick={() => deleteDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'products', p.id))} className="text-red-400 p-2 hover:bg-red-50 rounded-lg"><Trash2 size={18}/></button>
                  </div>
                ))}
                <button 
                  onClick={() => addProduct({name: 'Nuevo Producto', price: 0, image: 'https://via.placeholder.com/150'})}
                  className="p-8 border-2 border-dashed rounded-3xl text-gray-400 font-bold hover:bg-white hover:text-indigo-600 hover:border-indigo-200 transition"
                >
                  + Agregar Producto
                </button>
             </div>
          </div>
        </div>
      ) : (
        <div className="max-w-md mx-auto min-h-screen bg-white shadow-2xl">
          <div className="bg-indigo-600 p-8 pt-12 pb-16 text-white rounded-b-[3rem] relative">
            <button onClick={() => setView('admin')} className="absolute top-4 left-4 p-2 bg-white/20 rounded-full"><ArrowLeft size={20}/></button>
            <h1 className="text-3xl font-black">{storeData?.name}</h1>
            <p className="opacity-80">Haz tu pedido aquí 👇</p>
          </div>
          <div className="p-4 -mt-8 space-y-4">
            {products.length === 0 && <p className="text-center text-gray-400 py-10">No hay productos aún.</p>}
            {products.map(p => (
              <div key={p.id} className="bg-white p-4 rounded-2xl border shadow-sm flex items-center gap-4">
                <div className="w-16 h-16 bg-gray-100 rounded-xl overflow-hidden shrink-0">
                  <img src={p.image} className="w-full h-full object-cover" alt="" />
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-gray-800">{p.name}</h4>
                  <p className="text-indigo-600 font-bold">{storeData.currency}{p.price}</p>
                </div>
                <button onClick={() => setCart([...cart, {...p, qty: 1}])} className="bg-indigo-600 text-white px-4 py-2 rounded-xl font-bold text-xs shadow-lg shadow-indigo-100 active:scale-95 transition">Añadir</button>
              </div>
            ))}
          </div>
          {cart.length > 0 && (
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-sm bg-gray-900 text-white p-4 rounded-3xl flex justify-between items-center shadow-2xl z-50">
              <div className="flex items-center gap-3">
                <div className="bg-indigo-500 w-10 h-10 rounded-xl flex items-center justify-center font-bold">{cart.length}</div>
                <span className="font-bold">Total: {storeData.currency}{cart.reduce((a,b)=>a+(b.price*b.qty), 0)}</span>
              </div>
              <button 
                onClick={() => {
                  const msg = `Hola! Quiero pedir:\n` + cart.map(c => `- ${c.name} (${storeData.currency}${c.price})`).join('\n');
                  window.open(`https://wa.me/${storeData.whatsapp}?text=${encodeURIComponent(msg)}`);
                }}
                className="bg-green-500 px-4 py-2 rounded-xl font-bold flex items-center gap-2"
              >
                <MessageCircle size={18}/> Pedir
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default App;

