// Menyimpan sesi Firebase Auth + profil Firestore (paket, role, status langganan)
// dan menyediakannya ke seluruh aplikasi lewat hook useAuth().
import { createContext, useContext, useEffect, useState } from 'react'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import { doc, onSnapshot } from 'firebase/firestore'
import { auth, db } from '../lib/firebase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)       // objek Firebase Auth
  const [profile, setProfile] = useState(null) // dokumen users/{uid}
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let unsubProfile = null

    const unsubAuth = onAuthStateChanged(auth, (u) => {
      unsubProfile?.()
      setUser(u)

      if (!u) {
        setProfile(null)
        setLoading(false)
        return
      }

      // Dengarkan perubahan profil secara langsung: kalau admin mengubah paket,
      // tampilan pengguna ikut berubah tanpa perlu muat ulang.
      unsubProfile = onSnapshot(
        doc(db, 'users', u.uid),
        (snap) => {
          setProfile(snap.exists() ? { uid: u.uid, ...snap.data() } : null)
          setLoading(false)
        },
        () => setLoading(false),
      )
    })

    return () => {
      unsubAuth()
      unsubProfile?.()
    }
  }, [])

  const value = {
    user,
    profile,
    loading,
    tier: profile?.packageTier ?? 'faozonica',
    isAdmin: profile?.role === 'admin',
    status: profile?.statusSubscription ?? 'inactive',
    isActive: profile?.statusSubscription === 'active',
    logout: () => signOut(auth),
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth harus dipakai di dalam AuthProvider')
  return ctx
}
