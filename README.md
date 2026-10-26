# Nel App Stock · Sancia
Control de stock de esmaltes (Reposición / En uso / Informe). PWA con Firebase Auth + Firestore.

Incluye también Láser (turnos cada 15 minutos de 12:00 a 20:00), Pagos (semanal + presentismo, conciliado entre efectivo y transferencia) y una entrada unificada para Informe y Catálogo.

Para habilitar estas dos secciones en producción, publica `firestore.rules` junto con la aplicación y asigna los permisos **Láser** o **Pagos** desde Panel Maestro. Los permisos de lectura y edición son independientes.

## Puesta en marcha
1. https://console.firebase.google.com → Crear proyecto → agregar app Web → copiar `firebaseConfig` en `index.html`.
2. Authentication → Método de acceso → activar **Correo/contraseña** → Users → crear tu usuario.
   - El administrador ingresa con su correo y contraseña. Las cuentas de equipo se crean desde **Panel Maestro** y entran con `@usuario` y contraseña; desde allí se eligen las secciones y acciones habilitadas.
3. Firestore Database → Crear base de datos → pegar el contenido de `firestore.rules` en la pestaña Reglas.
4. Publicar:
   - Firebase Hosting: `npm i -g firebase-tools && firebase login && firebase init hosting` (public = `.`, no SPA) → `firebase deploy`
   - o GitHub Pages: subir a un repo → Settings → Pages. Luego en Authentication → Settings → Dominios autorizados agregar `tuusuario.github.io`.
5. Instalar: Android/PC (Chrome/Edge) botón "Instalar app". iPhone: Safari → Compartir → "Agregar a inicio".

## Administración de usuarios

El **Panel Maestro** permite crear cuentas, activar o desactivar el acceso, cambiar los permisos por sección y eliminar permanentemente una cuenta del equipo. Cada usuario solo ve las secciones habilitadas; las reglas de Firestore también controlan el acceso a los datos.

La eliminación permanente usa la función `deleteStaffUser` en `functions/`. Para publicarla en el proyecto `nel-app-stock`, inicia sesión con Firebase CLI y ejecuta `npx -y firebase-tools@latest deploy --only functions --project nel-app-stock`. Cloud Functions requiere que el proyecto esté en el plan Blaze para el despliegue.
