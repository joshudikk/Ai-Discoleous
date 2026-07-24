// Konfigurasi Firebase — dipakai untuk Authentication dan Cloud Firestore.
// Nilai diambil dari file .env (lihat .env.example).
import { initializeApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider, signInWithPopup } from 'firebase/auth'
import { doc, getDoc, getFirestore, serverTimestamp, setDoc } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

const app = initializeApp(firebaseConfig)

export const auth = getAuth(app)
export const db = getFirestore(app)

const googleProvider = new GoogleAuthProvider()

/**
 * Masuk lewat akun Google. Kalau ini akun baru, profil Firestore dibuat dengan
 * paket default (faozonica) dan status 'inactive' — jadi pengguna Google tetap
 * harus mengaktifkan langganan (bayar + token) sama seperti pendaftar biasa.
 */
export async function signInWithGoogle(defaultTier = 'faozonica') {
  const { user } = await signInWithPopup(auth, googleProvider)
  const ref = doc(db, 'users', user.uid)
  const snap = await getDoc(ref)
  if (!snap.exists()) {
    await setDoc(ref, {
      uid: user.uid,
      nama: user.displayName ?? user.email?.split('@')[0] ?? 'Pengguna',
      alamat: '',
      email: user.email ?? '',
      role: 'user',
      packageTier: defaultTier,
      statusSubscription: 'inactive',
      createdAt: serverTimestamp(),
    })
  }
  return user
}

export default app
