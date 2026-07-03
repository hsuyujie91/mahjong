// Firebase 連線設定：多人連線用的即時資料庫（Realtime Database）＋匿名登入
//
// ⚠️ 請把你在 Firebase 主控台建立的 Web App 設定值貼進 firebaseConfig。
// 取得方式見專案根目錄的 FIREBASE_SETUP.md。
import { initializeApp } from 'firebase/app'
import { getDatabase } from 'firebase/database'
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth'

const firebaseConfig = {
  apiKey: 'AIzaSyCgtJeaVSVHaC0aYNYLQhC76j5O-chyZdc',
  authDomain: 'mahjong-helper-653ca.firebaseapp.com',
  databaseURL: 'https://mahjong-helper-653ca-default-rtdb.asia-southeast1.firebasedatabase.app',
  projectId: 'mahjong-helper-653ca',
  storageBucket: 'mahjong-helper-653ca.firebasestorage.app',
  messagingSenderId: '643238813015',
  appId: '1:643238813015:web:f5712bc75d0e93d25bf212',
}

// 尚未貼上設定值時，讓上層可以判斷是否進入單機測試模式
export const firebaseReady = firebaseConfig.apiKey !== 'PASTE_HERE'

const app = firebaseReady ? initializeApp(firebaseConfig) : null
export const db = app ? getDatabase(app) : null
export const auth = app ? getAuth(app) : null

// 匿名登入，回傳 uid（每支裝置一個穩定 uid，用來認領座位）
export function ensureAuth() {
  return new Promise((resolve, reject) => {
    if (!auth) {
      reject(new Error('Firebase 尚未設定'))
      return
    }
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) {
        unsub()
        resolve(user.uid)
      }
    })
    signInAnonymously(auth).catch(reject)
  })
}
