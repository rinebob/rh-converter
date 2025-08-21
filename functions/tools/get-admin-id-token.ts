import admin from 'firebase-admin';
import { initializeApp as initClient } from 'firebase/app';
import { getAuth as getClientAuth, signInWithCustomToken } from 'firebase/auth';

async function main() {
  // Admin SDK (emulator)
  process.env['FIREBASE_AUTH_EMULATOR_HOST'] = '127.0.0.1:9099';
  admin.initializeApp({ projectId: 'rh-converter' });
  const authAdmin = admin.auth();
  const uid = 'admin-user-1';
  await authAdmin.createUser({ uid }).catch(() => {});
  await authAdmin.setCustomUserClaims(uid, { admin: true });
  const customToken = await authAdmin.createCustomToken(uid);

  // Client SDK (emulator)
  const app = initClient({ apiKey: 'fake', projectId: 'rh-converter' });
  const auth = getClientAuth(app);
  const cred = await signInWithCustomToken(auth, customToken);
  const idToken = await cred.user.getIdToken();
  console.log(idToken);
}
main();