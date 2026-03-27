import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInAnonymously, 
  onAuthStateChanged 
} from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  setDoc, 
  collection, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc
} from 'firebase/firestore';
import { 
  ShoppingBag, Plus, Trash2, Settings, ExternalLink, MessageCircle, 
  ChevronRight, User, MapPin, Store, Copy, Check, Package, ArrowLeft, Loader2 
} from 'lucide-react';

// --- CONFIGURACIÓN DE FIREBASE PARA PRODUCCIÓN ---
// En Vercel, configura VITE_FIREBASE_CONFIG como una variable de entorno
const firebaseConfig = JSON.parse(import.meta.env.VITE_FIREBASE_CONFIG || '{}');
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const APP_ID = "wa-saas-v1"; // ID único para tu base de datos

const App = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('landing'); 
  const [storeData, setStoreData] = useState(null);
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [showCheckout, setShowCheckout] = useState(false);
  const [customerData, setCustomerData] = useState({ name: '', address: '', payment: 'Efectivo' });
  const [copyFeedback, setCopyFeedback] = useState(false);

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, async (u) => {
      if (!u) {
        await signInAnonymously(auth);
      } else {
        setUser(u);
        setLoading(false);
      }
    });
    return () => unsubAuth();
  }, []);

  useEffect(() => {
    if (!user) return;

    // Ruta: /artifacts/{appId}/public/data/{collection}/{docId}
    const storeRef = doc(db, 'artifacts', APP_ID, 'public', 'data', 'stores', user.uid);
    const unsubStore = onSnapshot(storeRef, (snap) => {
      if (snap.exists()) setStoreData(snap.data());
    });

    const productsRef = collection(db, 'artifacts', APP_ID, 'public', 'data', 'products');
    const unsubProducts = onSnapshot(productsRef, (snap) => {
      const all = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setProducts(all.filter(p => p.ownerId === user.uid));
    });

    return () => { unsubStore(); unsubProducts(); };
  }, [user]);

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

  const deleteProduct = (id) => deleteDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'products', id));

  const sendWhatsApp = () => {
    const total = cart.reduce((acc, i) => acc + (i.price * i.qty), 0);
    let msg = `*Pedido: ${storeData.name}*\nCliente: ${customerData.name}\nTotal: ${storeData.currency}${total}`;
    window.open(`https://wa.me/${storeData.whatsapp}?text=${encodeURIComponent(msg)}`);
  };

  if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-indigo-600" /></div>;

  // --- RENDERING LOGIC (Simplificada para brevedad) ---
  if (!storeData && view === 'landing') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center bg-white">
        <Store size={60} className="text-indigo-600 mb-6" />
        <h1 className="text-4xl font-black mb-4">Tu tienda en WhatsApp hoy</h1>
        <input id="storeName" placeholder="Nombre de tu negocio" className="p-4 border rounded-2xl w-full max-w-sm mb-4 outline-none focus:ring-2 ring-indigo-500" />
        <button onClick={() => createStore(document.getElementById('storeName').value)} className="bg-indigo-600 text-white p-4 rounded-2xl w-full max-w-sm font-bold">Crear Tienda Gratis</button>
      </div>
    );
  }

  // Vista Admin y Store similar a la anterior pero adaptada a import.meta.env
  return (
    <div className="p-4">
      {view === 'admin' ? (
        <div className="max-w-4xl mx-auto space-y-6">
           <header className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border">
              <h2 className="text-2xl font-bold">{storeData?.name}</h2>
              <button onClick={() => setView('store')} className="bg-indigo-600 text-white px-4 py-2 rounded-xl flex items-center gap-2">
                <ExternalLink size={18} /> Ver Tienda
              </button>
           </header>
           <section className="bg-white p-6 rounded-2xl border space-y-4">
              <h3 className="font-bold">Ajustes Rápidos</h3>
              <input value={storeData?.whatsapp} onChange={e => updateStore({whatsapp: e.target.value})} className="w-full p-3 bg-gray-50 border rounded-xl" placeholder="WhatsApp (51...)" />
              <div className="p-4 bg-indigo-50 rounded-xl flex justify-between items-center">
                 <span className="text-sm font-medium">Link de tu tienda:</span>
                 <button onClick={() => { document.execCommand('copy'); setCopyFeedback(true); setTimeout(()=>setCopyFeedback(false), 2000)}} className="text-indigo-600 font-bold underline">
                   {copyFeedback ? "¡Copiado!" : "Copiar Link"}
                 </button>
              </div>
           </section>
           <section className="space-y-4">
              <h3 className="font-bold text-xl">Mis Productos</h3>
              {products.map(p => (
                <div key={p.id} className="bg-white p-4 rounded-xl flex justify-between items-center border">
                   <span>{p.name} - {storeData.currency}{p.price}</span>
                   <button onClick={() => deleteProduct(p.id)} className="text-red-500"><Trash2 size={20} /></button>
                </div>
              ))}
              <button onClick={() => addProduct({name: 'Producto Nuevo', price: 10, image: 'https://via.placeholder.com/150'})} className="w-full p-4 border-2 border-dashed rounded-xl text-gray-400 font-bold hover:bg-gray-50">+ Agregar Producto de Prueba</button>
           </section>
        </div>
      ) : (
        <div className="max-w-md mx-auto space-y-6">
          <button onClick={() => setView('admin')} className="text-indigo-600 font-bold flex items-center gap-2"><ArrowLeft size={18}/> Volver al Panel</button>
          <div className="bg-indigo-600 text-white p-10 rounded-[2.5rem] text-center shadow-xl">
            <h1 className="text-3xl font-black">{storeData?.name}</h1>
          </div>
          <div className="grid grid-cols-1 gap-4">
            {products.map(p => (
              <div key={p.id} className="bg-white p-4 rounded-2xl shadow-sm border flex justify-between items-center">
                <div>
                  <h4 className="font-bold">{p.name}</h4>
                  <p className="text-indigo-600">{storeData.currency}{p.price}</p>
                </div>
                <button onClick={() => setCart([...cart, {...p, qty: 1}])} className="bg-indigo-50 text-indigo-600 p-2 rounded-xl font-bold text-sm">Agregar</button>
              </div>
            ))}
          </div>
          {cart.length > 0 && (
             <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] bg-gray-900 text-white p-4 rounded-3xl flex justify-between items-center shadow-2xl">
                <span className="font-bold">{cart.length} productos</span>
                <button onClick={() => {
                   setCustomerData({name: 'Cliente Prueba', address: 'Lima Norte'});
                   sendWhatsApp();
                }} className="bg-indigo-500 px-6 py-2 rounded-xl font-bold">Pedir ahora</button>
             </div>
          )}
        </div>
      )}
    </div>
  );
};

export default App;

