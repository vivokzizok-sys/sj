# Android APK

هذه نسخة Android مبنية بـ Capacitor وتستخدم نفس واجهة سطح المكتب مع تحسينات للهاتف.

## تجهيز الملفات

```bash
npm run mobile:sync
```

## البناء المحلي

البناء المحلي يحتاج Android SDK، لذلك الأفضل لهذا المشروع هو GitHub Actions.

## بناء Release APK على GitHub

أضف الأسرار التالية في GitHub Repository Secrets:

- `ANDROID_KEYSTORE_BASE64`
- `ANDROID_KEYSTORE_PASSWORD`
- `ANDROID_KEY_ALIAS`
- `ANDROID_KEY_PASSWORD`

ثم شغّل workflow باسم `Build Android Release APK`.
