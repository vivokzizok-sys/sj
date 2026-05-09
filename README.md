# SJ STORE Pro

نسخة سطح المكتب مبنية الآن على Tauri فقط مع نفس ملفات الواجهة:

- `index.html`
- `css/`
- `js/`
- `assets/`
- `config/`
- `fonts/`
- `libs/`
- `src-tauri/`

## التشغيل أثناء التطوير

```bash
npm install
npm start
```

## بناء ملف EXE

```bash
npm run build
```

بعد نجاح البناء ستجد ملف التثبيت هنا:

```text
src-tauri/target/release/bundle/nsis/
```

## إعداد Firebase

غيّر بيانات Firebase من:

```text
config/firebase.config.js
```

## نسخة Android APK

نسخة الهاتف موجودة في:

```text
mobile/
```

تستخدم نفس الواجهة والبيانات مع تحسينات للهاتف وقارئ باركود من كاميرا Android.

لتجهيز ملفات Android:

```bash
npm run mobile:sync
```

البناء النهائي يتم من GitHub Actions عبر workflow:

```text
Build Android Release APK
```

نسخة العملاء يجب أن تكون Release APK موقعة. أضف هذه الأسرار في GitHub Repository Secrets:

```text
ANDROID_KEYSTORE_BASE64
ANDROID_KEYSTORE_PASSWORD
ANDROID_KEY_ALIAS
ANDROID_KEY_PASSWORD
```
