import { initializeApp, getApp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import { getAuth, initializeAuth, inMemoryPersistence, createUserWithEmailAndPassword, signOut, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
import { getFirestore, collection, doc, getDoc, getDocs, setDoc, updateDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

const firebaseConfig={apiKey:'AIzaSyA_mffH6yFailmdEM1Y-hqAe0jK5fmVdVc',authDomain:'nel-app-stock.firebaseapp.com',projectId:'nel-app-stock',storageBucket:'nel-app-stock.firebasestorage.app',messagingSenderId:'44332337509',appId:'1:44332337509:web:a7efb5fa433e636378798c'};
const app=getApp(),auth=getAuth(app),db=getFirestore(app);
const provisionApp=initializeApp(firebaseConfig,'nel-app-stock-user-provisioner');
const provisionAuth=initializeAuth(provisionApp,{persistence:inMemoryPersistence});
const modules=[['polishes','Stock'],['movements','Movimientos'],['serviceClaims','Reclamos'],['deliveries','Entregas'],['supplyControls','Ronda de insumos'],['settings','Configuración']];
const actions=[['read','Consultar'],['create','Crear'],['edit','Editar'],['delete','Eliminar']];
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let currentUser=null,accountList=[];

const style=document.createElement('style');
style.textContent=`#masterAccess{border:1px solid rgba(255,255,255,.35);border-radius:99px;padding:8px 15px;background:#315348;color:#fff;font-weight:700;white-space:nowrap}#masterAccess[hidden]{display:none!important}#masterPanel{width:min(1080px,96vw);max-height:90dvh;overflow:auto;border:1px solid #d6c9b8;border-radius:24px;padding:22px;background:#f7f3eb;color:#352b23;box-shadow:0 24px 90px #160f0b88}#masterPanel::backdrop{background:#140f0bcc;backdrop-filter:blur(5px)}#masterPanel h2{font-size:26px;margin:0 0 6px;color:#38281e}#masterPanel .mp-sub{margin:0 0 18px;color:#75695f}#masterPanel .mp-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}#masterPanel .mp-card{background:#fffdf9;border:1px solid #e5dccf;border-radius:18px;padding:16px;min-width:0}#masterPanel .mp-card h3{font-size:17px;margin:0 0 12px;color:#3b5c51}#masterPanel label{display:block;margin:9px 0 4px;font-size:13px;font-weight:700;color:#54483e}#masterPanel input{width:100%;padding:10px 12px;border:1px solid #d9cbb9;border-radius:10px;background:#fff;color:#2e2823}#masterPanel button{cursor:pointer}#masterPanel .mp-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:14px;flex-wrap:wrap}#masterPanel .mp-btn{border:0;border-radius:10px;padding:10px 14px;background:#315348;color:#fff;font-weight:700}#masterPanel .mp-btn.secondary{background:#eee7dc;color:#44372c;border:1px solid #d5c8b8}#masterPanel .mp-btn.danger{background:#a84239}#masterPanel .mp-table-wrap{overflow:auto}#masterPanel .mp-table{width:100%;border-collapse:collapse;font-size:13px}#masterPanel .mp-table th,#masterPanel .mp-table td{padding:9px 7px;border-bottom:1px solid #eee5d9;text-align:left;vertical-align:middle}#masterPanel .mp-table th{font-size:11px;text-transform:uppercase;color:#75695f;white-space:nowrap}#masterPanel .mp-perms{max-height:290px;overflow:auto;border:1px solid #eee5d9;border-radius:12px;padding:8px}#masterPanel .mp-perm-row{display:grid;grid-template-columns:minmax(120px,1fr) repeat(4,auto);gap:8px;align-items:center;padding:7px 4px;border-bottom:1px solid #f0e9df;font-size:12px}#masterPanel .mp-perm-row:last-child{border-bottom:0}#masterPanel .mp-perm-row input[type=checkbox]{width:17px;height:17px;accent-color:#315348}#masterPanel .mp-perm-row label{display:flex;align-items:center;gap:4px;margin:0;font-size:11px;font-weight:500}#masterPanel .mp-error{min-height:20px;color:#a84239;font-size:13px;margin-top:8px}#masterPanel .mp-pill{display:inline-block;padding:3px 8px;border-radius:20px;background:#e8eee8;color:#315348;font-weight:700}#masterPanel .mp-pill.off{background:#f7e4e1;color:#a84239}@media(max-width:680px){#masterPanel{width:100vw;max-width:none;max-height:94dvh;height:94dvh;margin:auto 0 0;border-radius:22px 22px 0 0;padding:17px 13px}#masterPanel .mp-grid{grid-template-columns:1fr;gap:10px}#masterPanel .mp-card{padding:13px}#masterPanel .mp-perm-row{grid-template-columns:minmax(92px,1fr) repeat(4,auto);gap:5px;font-size:11px}#masterAccess{padding:7px 10px;font-size:12px}}`;
document.head.append(style);
const dialog=document.createElement('dialog');dialog.id='masterPanel';dialog.innerHTML=`<div class="mp-head"><h2>Panel Maestro</h2><p class="mp-sub">Administrá usuarios y definí qué operaciones puede realizar cada cuenta.</p></div><div class="mp-grid"><section class="mp-card"><h3>Crear usuario</h3><p class="mp-sub">La clave inicial se usa para crear la cuenta y no se guarda en la base de datos. Compartila por un canal privado.</p><label for="mpName">Nombre</label><input id="mpName" maxlength="80" autocomplete="off"><label for="mpEmail">Correo de acceso</label><input id="mpEmail" type="email" maxlength="160" autocomplete="off"><label for="mpPassword">Clave inicial (mínimo 8 caracteres)</label><input id="mpPassword" type="password" minlength="8" autocomplete="new-password"><div class="mp-perms" id="mpNewPerms"></div><p class="mp-error" id="mpCreateError" aria-live="polite"></p><div class="mp-actions"><button class="mp-btn" id="mpCreate">Crear usuario</button></div></section><section class="mp-card"><h3>Usuarios y permisos</h3><p class="mp-sub">Desactivar una cuenta bloquea su acceso a los datos de la aplicación.</p><div class="mp-table-wrap"><table class="mp-table"><thead><tr><th>Usuario</th><th>Estado</th><th>Acciones</th></tr></thead><tbody id="mpUsers"><tr><td colspan="3">Cargando…</td></tr></tbody></table></div><p class="mp-error" id="mpListError" aria-live="polite"></p></section></div><div class="mp-actions"><button class="mp-btn secondary" id="mpClose">Cerrar</button></div>`;
document.body.append(dialog);

function permissionEditor(prefix,permissions={}){
 return `<div class="mp-perm-row"><b>Sección</b>${actions.map(([,label])=>`<b>${label}</b>`).join('')}</div>`+modules.map(([key,label])=>`<div class="mp-perm-row"><span>${label}</span>${actions.map(([action])=>`<label title="${label}: ${action}"><input type="checkbox" data-perm-module="${key}" data-perm-action="${action}" ${permissions?.[key]?.[action]?'checked':''}><span>${actions.find(x=>x[0]===action)[1]}</span></label>`).join('')}</div>`).join('');
}
function readPermissions(root){const out={};root.querySelectorAll('[data-perm-module]').forEach(i=>{const {permModule:m,permAction:a}=i.dataset;(out[m]??={})[a]=i.checked});return out}
function mountPanelButton(){
 const nav=document.querySelector('#tabs');if(!nav||document.querySelector('#masterAccess'))return;
 const button=document.createElement('button');button.id='masterAccess';button.type='button';button.textContent='Panel Maestro';button.addEventListener('click',()=>{dialog.showModal();refreshUsers()});nav.append(button);
}
async function refreshUsers(){
 const body=dialog.querySelector('#mpUsers'),error=dialog.querySelector('#mpListError');body.innerHTML='<tr><td colspan="3">Cargando…</td></tr>';error.textContent='';
 try{const snap=await getDocs(collection(db,'userAccess'));accountList=snap.docs.map(d=>({id:d.id,...d.data()}));body.innerHTML=accountList.map(u=>`<tr><td><b>${esc(u.name||'Usuario')}</b><br>${esc(u.email||'')}</td><td><span class="mp-pill ${u.active===false?'off':''}">${u.active===false?'Desactivado':'Activo'}</span></td><td><button class="mp-btn secondary" data-mp-edit="${esc(u.id)}">Permisos</button> <button class="mp-btn ${u.active===false?'':'danger'}" data-mp-toggle="${esc(u.id)}">${u.active===false?'Activar':'Desactivar'}</button></td></tr>`).join('')||'<tr><td colspan="3">Todavía no hay cuentas.</td></tr>'}
 catch(e){body.innerHTML='';error.textContent='No pude cargar usuarios. Revisá las reglas de Firebase.';console.error(e)}
}
function editUser(uid){
 const user=accountList.find(x=>x.id===uid);if(!user)return;
 const old=dialog.querySelector('#mpEditor');old?.remove();
 const section=document.createElement('section');section.id='mpEditor';section.className='mp-card';section.innerHTML=`<h3>Permisos · ${esc(user.name||user.email||'Usuario')}</h3><div class="mp-perms">${permissionEditor('edit',user.permissions||{})}</div><p class="mp-error" id="mpEditError" aria-live="polite"></p><div class="mp-actions"><button class="mp-btn secondary" id="mpCancelEdit">Cancelar</button><button class="mp-btn" id="mpSaveEdit">Guardar permisos</button></div>`;
 dialog.querySelector('.mp-grid').append(section);
 section.querySelector('#mpCancelEdit').onclick=()=>section.remove();
 section.querySelector('#mpSaveEdit').onclick=async()=>{const b=section.querySelector('#mpSaveEdit'),err=section.querySelector('#mpEditError');b.disabled=true;try{await updateDoc(doc(db,'userAccess',uid),{permissions:readPermissions(section),updatedAt:serverTimestamp()});section.remove();await refreshUsers()}catch(e){err.textContent='No se pudieron guardar los permisos.';console.error(e)}finally{b.disabled=false}};
}
dialog.querySelector('#mpNewPerms').innerHTML=permissionEditor('new');
dialog.querySelector('#mpClose').onclick=()=>dialog.close();
dialog.addEventListener('click',e=>{
  const edit=e.target.closest('[data-mp-edit]'),toggle=e.target.closest('[data-mp-toggle]');
  if(edit)editUser(edit.dataset.mpEdit);
  if(toggle){const u=accountList.find(x=>x.id===toggle.dataset.mpToggle);if(u)updateDoc(doc(db,'userAccess',u.id),{active:u.active===false,updatedAt:serverTimestamp()}).then(refreshUsers).catch(e=>{dialog.querySelector('#mpListError').textContent='No se pudo cambiar el acceso.';console.error(e)})}
});
dialog.querySelector('#mpCreate').onclick=async()=>{
 const name=dialog.querySelector('#mpName').value.trim(),email=dialog.querySelector('#mpEmail').value.trim().toLowerCase(),password=dialog.querySelector('#mpPassword').value,error=dialog.querySelector('#mpCreateError'),button=dialog.querySelector('#mpCreate');
 error.textContent='';if(!name||!email||password.length<8){error.textContent='Completá nombre, correo y una clave de al menos 8 caracteres.';return}
 button.disabled=true;
 try{
  const credential=await createUserWithEmailAndPassword(provisionAuth,email,password);
  await signOut(provisionAuth);
  await setDoc(doc(db,'userAccess',credential.user.uid),{uid:credential.user.uid,name,email,role:'staff',active:true,permissions:readPermissions(dialog.querySelector('#mpNewPerms')),createdAt:serverTimestamp(),updatedAt:serverTimestamp()});
  dialog.querySelector('#mpName').value='';dialog.querySelector('#mpEmail').value='';dialog.querySelector('#mpPassword').value='';dialog.querySelectorAll('#mpNewPerms input').forEach(i=>i.checked=false);
  error.textContent='Usuario creado y permisos guardados.';await refreshUsers();
 }catch(e){error.textContent=e?.code==='auth/email-already-in-use'?'Ese correo ya tiene una cuenta.':e?.code==='auth/weak-password'?'La clave no cumple el mínimo de seguridad.':'No pude crear el usuario. Revisá la configuración de Authentication y las reglas.';console.error(e)}
 finally{button.disabled=false}
};

onAuthStateChanged(auth,async user=>{
 currentUser=user;const button=document.querySelector('#masterAccess');
 if(!user){button?.remove();return}
 try{const profile=await getDoc(doc(db,'userAccess',user.uid));if(profile.exists()&&profile.data().role==='admin'&&profile.data().active!==false){mountPanelButton();dialog.querySelector('#mpNewPerms').innerHTML=permissionEditor('new')}}
 catch(e){console.error('No se pudo verificar el rol de administrador.',e)}
});
