# Nel App Stock · Sancia
Control de stock de esmaltes (Reposición / En uso / Informe). PWA con Firebase Auth + Firestore.

## Puesta en marcha
1. https://console.firebase.google.com → Crear proyecto → agregar app Web → copiar `firebaseConfig` en `index.html`.
2. Authentication → Método de acceso → activar **Correo/contraseña** → Users → crear tu usuario.
3. Firestore Database → Crear base de datos → pegar el contenido de `firestore.rules` en la pestaña Reglas.
4. Publicar:
   - Firebase Hosting: `npm i -g firebase-tools && firebase login && firebase init hosting` (public = `.`, no SPA) → `firebase deploy`
   - o GitHub Pages: subir a un repo → Settings → Pages. Luego en Authentication → Settings → Dominios autorizados agregar `tuusuario.github.io`.
5. Instalar: Android/PC (Chrome/Edge) botón "Instalar app". iPhone: Safari → Compartir → "Agregar a inicio".
