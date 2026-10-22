const { initializeApp } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore } = require('firebase-admin/firestore');
const { HttpsError, onCall } = require('firebase-functions/v2/https');

initializeApp();

const OWNER_UID = 'm4NQqQ4cMlMcUy6C1ItwAH6un5G3';
const REGION = 'southamerica-east1';

exports.deleteStaffUser = onCall({ region: REGION, maxInstances: 2 }, async request => {
  const caller = request.auth;
  if (!caller || caller.uid !== OWNER_UID) {
    throw new HttpsError('permission-denied', 'Solo la cuenta propietaria puede eliminar usuarios.');
  }

  const uid = request.data?.uid;
  if (typeof uid !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(uid) || uid === caller.uid) {
    throw new HttpsError('invalid-argument', 'El identificador del usuario no es válido.');
  }

  const profileRef = getFirestore().doc(`userAccess/${uid}`);
  const profile = await profileRef.get();
  if (!profile.exists) {
    throw new HttpsError('not-found', 'No se encontró el perfil del usuario.');
  }
  if (profile.get('uid') !== uid || profile.get('role') !== 'staff') {
    throw new HttpsError('permission-denied', 'Solo se pueden eliminar cuentas del equipo.');
  }

  try {
    await getAuth().deleteUser(uid);
  } catch (error) {
    if (error.code !== 'auth/user-not-found') {
      console.error('No se pudo eliminar la cuenta de Authentication.', error);
      throw new HttpsError('internal', 'No se pudo eliminar la cuenta de Authentication.');
    }
  }

  await profileRef.delete();
  return { ok: true };
});
