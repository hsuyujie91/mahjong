# Firebase 多人連線設定步驟

麻將小幫手要跨裝置同步（四支手機各看自己的視角），需要一個免費的 Firebase
即時資料庫。整個過程約 5～10 分鐘，你只要做前端點擊、把設定值貼給我即可。

## 1. 建立 Firebase 專案
1. 到 https://console.firebase.google.com/ ，用 Google 帳號登入。
2. 點「建立專案 / Add project」，名稱隨意（例如 `mahjong-helper`）。
3. 可以關閉 Google Analytics（不需要），一路「繼續」到建立完成。

## 2. 建立即時資料庫（Realtime Database）
1. 左側選單 → 「建構 / Build」→「Realtime Database」。
2. 點「建立資料庫 / Create Database」。
3. 位置選離台灣近的（例如 `asia-southeast1`，新加坡）。
4. 安全規則先選「以測試模式啟動 / Start in test mode」→ 建立。
   （之後我會給你正式規則，見第 5 步。）

## 3. 開啟匿名登入
1. 左側選單 → 「建構 / Build」→「Authentication」。
2. 點「開始使用 / Get started」。
3. 在「Sign-in method」分頁 → 找到「匿名 / Anonymous」→ 開啟（Enable）→ 儲存。

## 4. 取得網頁 App 設定值（要給我的）
1. 左上角齒輪 → 「專案設定 / Project settings」。
2. 往下捲到「你的應用程式 / Your apps」→ 點網頁圖示 `</>`。
3. 取暱稱隨意，**不用**勾選 Firebase Hosting → 註冊 App。
4. 畫面會顯示一段 `const firebaseConfig = { ... }`，把整段（apiKey、authDomain、
   databaseURL、projectId、storageBucket、messagingSenderId、appId）複製貼給我。
   - 若沒看到 `databaseURL`，去 Realtime Database 頁面複製最上方那條網址
     （形如 `https://xxxx-default-rtdb.asia-southeast1.firebasedatabase.app`）。

> 這些值可以公開放進前端程式（Firebase 本來就設計成前端使用），安全性由下一步的
> 規則把關，不是機密金鑰，貼給我沒問題。

## 5. 套用正式安全規則（我準備好後）
1. Realtime Database →「規則 / Rules」分頁。
2. 把本專案 `database.rules.json` 的內容整段貼上 → 發布 / Publish。
   （目前規則：需登入才能讀寫，房號固定 4 碼。之後要更嚴格可再調整。）

---

把第 4 步的設定值給我後，我會貼進 `src/firebase.js`，接著用兩個瀏覽器分頁模擬兩支
手機，實際驗證同步後再交給你。
