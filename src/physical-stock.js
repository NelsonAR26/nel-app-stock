import { getApp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
import { getFirestore, collection, doc, onSnapshot, writeBatch, getDocsFromServer } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

const app=getApp(),auth=getAuth(app),db=getFirestore(app);
const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const norm=s=>String(s??'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim();
const today=()=>{const d=new Date();d.setMinutes(d.getMinutes()-d.getTimezoneOffset());return d.toISOString().slice(0,10)};
let polishes=[],checks=new Map(),selectedBrand='Todas',query='',user=null,unsubPolishes=null,unsubChecks=null,dialog,saveBusy=new Set();

function canEdit(){const a=window.__nelSectionAccess;return !!(a?.admin||a?.permissions?.polishes?.edit)}
function startListeners(next){
 unsubPolishes?.();unsubChecks?.();unsubPolishes=unsubChecks=null;polishes=[];checks.clear();user=next;
 if(!next){refresh();return}
 unsubPolishes=onSnapshot(collection(db,'polishes'),s=>{polishes=s.docs.map(d=>({id:d.id,...d.data()})).filter(p=>p.section==='uso');refresh()},()=>{polishes=[];refresh()});
 unsubChecks=onSnapshot(collection(db,'physicalStockChecks'),s=>{checks=new Map(s.docs.map(d=>[d.id,d.data()]));refresh()},e=>{console.error(e);const msg=$('#physicalStockError');if(msg)msg.textContent='No se pudo leer el control físico. Revisá permisos o conexión.'});
}
function refresh(){mountUseButton();mountMasterExports();if(dialog?.open)renderRows()}

function ensureDialog(){
 if(dialog)return dialog;
 dialog=document.createElement('dialog');dialog.id='physicalStockDialog';dialog.className='physical-stock-dialog';
 dialog.innerHTML='<div class="ps-head"><div><span class="ps-eyebrow">NIC SYSTEM · EN USO</span><h2>Control físico</h2><p>Marcá cada esmalte según lo que encontrás en el local. Cada cambio se guarda automáticamente.</p></div><button class="ps-close" type="button" aria-label="Cerrar control físico">×</button></div><div class="ps-toolbar"><label>Marca<select id="physicalBrandFilter"><option value="Todas">Todas las marcas</option></select></label><label class="ps-search-label">Buscar esmalte<input id="physicalSearch" type="search" placeholder="Nombre o marca…"></label><div class="ps-count" id="physicalCount"></div></div><p class="ps-feedback" id="physicalStockError" aria-live="polite"></p><div class="ps-list" id="physicalStockRows"></div><div class="ps-foot"><span>Los registros quedan disponibles para continuar después.</span><button class="ps-done" type="button">Listo</button></div>';
 document.body.append(dialog);dialog.querySelector('.ps-close').onclick=()=>dialog.close();dialog.querySelector('.ps-done').onclick=()=>dialog.close();
 dialog.addEventListener('click',e=>{const b=e.target.closest('[data-physical-id]');if(b)savePresence(b.dataset.physicalId,b.dataset.present==='true')});
 dialog.addEventListener('change',e=>{if(e.target.id==='physicalBrandFilter'){selectedBrand=e.target.value;renderRows()}});
 dialog.addEventListener('input',e=>{if(e.target.id==='physicalSearch'){query=e.target.value;renderRows()}});
 return dialog;
}

function refreshBrandOptions(){
 const select=$('#physicalBrandFilter');if(!select)return;
 const brands=[...new Set(polishes.map(p=>String(p.brand||'').trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'es',{sensitivity:'base'}));
 if(selectedBrand!=='Todas'&&!brands.includes(selectedBrand))selectedBrand='Todas';
 select.innerHTML='<option value="Todas">Todas las marcas</option>'+brands.map(b=>`<option value="${esc(b)}">${esc(b)} · ${polishes.filter(p=>p.brand===b).length}</option>`).join('');select.value=selectedBrand;
}

function renderRows(){
 const rows=$('#physicalStockRows');if(!rows)return;refreshBrandOptions();
 const filtered=polishes.filter(p=>(selectedBrand==='Todas'||p.brand===selectedBrand)&&norm(`${p.name} ${p.brand} ${p.type}`).includes(norm(query))).sort((a,b)=>String(a.brand).localeCompare(String(b.brand),'es',{sensitivity:'base'})||String(a.name).localeCompare(String(b.name),'es',{numeric:true}));
 const marked=polishes.filter(p=>checks.has(p.id)).length;
 const count=$('#physicalCount');if(count)count.textContent=`${filtered.length} esmaltes · ${marked}/${polishes.length} controlados`;
 if(!user){rows.innerHTML='<div class="ps-empty">Iniciá sesión para continuar el control.</div>';return}
 if(!polishes.length){rows.innerHTML='<div class="ps-empty">No hay esmaltes en En Uso.</div>';return}
 rows.innerHTML=filtered.map(p=>{const state=checks.get(p.id),pending=saveBusy.has(p.id);return `<article class="ps-row"><span class="ps-brand" aria-hidden="true">${esc(String(p.brand||'').trim().slice(0,2).toUpperCase()||'ES')}</span><span class="ps-name"><b>${esc(p.name)}</b><small>${esc(p.brand)} · ${esc(p.type)}</small></span><span class="ps-status ${state?(state.present?'is-present':'is-missing'):'is-unchecked'}">${state?(state.present?'Presente':'Faltante'):'Sin revisar'}</span><span class="ps-actions"><button type="button" class="ps-choice ps-yes ${state?.present===true?'selected':''}" data-physical-id="${esc(p.id)}" data-present="true" aria-pressed="${state?.present===true}" ${pending||!canEdit()?'disabled':''}><span>✓</span> Presente</button><button type="button" class="ps-choice ps-no ${state?.present===false?'selected':''}" data-physical-id="${esc(p.id)}" data-present="false" aria-pressed="${state?.present===false}" ${pending||!canEdit()?'disabled':''}><span>×</span> Faltante</button></span></article>`}).join('')||'<div class="ps-empty">No hay esmaltes para este filtro.</div>';
 const error=$('#physicalStockError');if(error&&!canEdit())error.textContent='Tu cuenta puede consultar el control físico, pero no tiene permiso para cambiar estados.';
}

async function savePresence(id,present){
 if(!canEdit()||saveBusy.has(id))return;const p=polishes.find(x=>x.id===id);if(!p)return;
 saveBusy.add(id);renderRows();
 try{const b=writeBatch(db);b.set(doc(db,'physicalStockChecks',id),{polishId:id,name:String(p.name||''),brand:String(p.brand||''),type:String(p.type||''),present,updatedAt:Date.now()});await b.commit();checks.set(id,{polishId:id,name:p.name,brand:p.brand,type:p.type,present,updatedAt:Date.now()});const error=$('#physicalStockError');if(error)error.textContent='Guardado en Firebase.'}
 catch(e){console.error(e);const error=$('#physicalStockError');if(error)error.textContent=e?.code==='permission-denied'?'Firebase no permitió guardar. Revisá las nuevas reglas y el permiso de edición de esmaltes.':'No se pudo guardar el cambio. Revisá la conexión e intentá de nuevo.'}
 finally{saveBusy.delete(id);renderRows()}
}

function mountUseButton(){
 const main=$('#main'),active=$('#tabs [data-t="uso"].on'),head=main?.querySelector('.head');
 if(!active||!head||!head.querySelector('h2')?.textContent.includes('Esmaltes en uso'))return;
 const actions=head.querySelector('.xb');if(!actions||actions.querySelector('[data-physical-open]'))return;
 const button=document.createElement('button');button.type='button';button.className='btn o';button.dataset.physicalOpen='1';button.innerHTML='<span aria-hidden="true">◉</span> Control físico';button.setAttribute('aria-label','Abrir control físico de esmaltes');button.onclick=()=>{const current=$('#brandFilter')?.value;if(current&&current!=='Todas')selectedBrand=current;const d=ensureDialog();renderRows();if(!d.open)d.showModal()};actions.prepend(button);
}

function reportRows(){return [...polishes].sort((a,b)=>String(a.brand).localeCompare(String(b.brand),'es',{sensitivity:'base'})||String(a.name).localeCompare(String(b.name),'es',{numeric:true})).map(p=>{const s=checks.get(p.id);return {name:p.name||'',brand:p.brand||'',type:p.type||'',status:s?(s.present?'Presente':'Faltante'):'Sin revisar',updatedAt:s?.updatedAt||null}})}
async function latestReport(){
 const [ps,ss]=await Promise.all([getDocsFromServer(collection(db,'polishes')),getDocsFromServer(collection(db,'physicalStockChecks'))]);
 const list=ps.docs.map(d=>({id:d.id,...d.data()})).filter(p=>p.section==='uso').sort((a,b)=>String(a.brand).localeCompare(String(b.brand),'es',{sensitivity:'base'})||String(a.name).localeCompare(String(b.name),'es',{numeric:true}));
 const latest=new Map(ss.docs.map(d=>[d.id,d.data()]));return list.map(p=>{const s=latest.get(p.id);return {name:p.name||'',brand:p.brand||'',type:p.type||'',status:s?(s.present?'Presente':'Faltante'):'Sin revisar',updatedAt:s?.updatedAt||null}});
}
function reportTitle(){return `NicSys Core · Control físico · ${new Date().toLocaleDateString('es-AR')}`}
function stamp(value){return value?new Date(value).toLocaleString('es-AR'):'—'}
function downloadBlob(blob,name){const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1500)}
function filename(ext){return `NicSys-Core-control-fisico-${today()}.${ext}`}
async function exportExcel(rows){if(!window.XLSX)throw new Error('Excel no está disponible.');const wb=XLSX.utils.book_new(),data=[['Nombre','Marca','Tipo','Estado físico','Última actualización'],...rows.map(x=>[x.name,x.brand,x.type,x.status,stamp(x.updatedAt)])],ws=XLSX.utils.aoa_to_sheet(data);ws['!cols']=[{wch:30},{wch:24},{wch:20},{wch:18},{wch:25}];XLSX.utils.book_append_sheet(wb,ws,'Control físico');XLSX.writeFile(wb,filename('xlsx'))}
async function exportPdf(rows){const JsPDF=window.jspdf?.jsPDF;if(!JsPDF)throw new Error('PDF no está disponible.');const pdf=new JsPDF({orientation:'landscape',unit:'pt',format:'a4'}),left=38,right=804,widths=[238,160,120,110,138],heads=['ESMALTE','MARCA','TIPO','ESTADO FÍSICO','ÚLTIMA ACTUALIZACIÓN'];let y=58,page=1;const header=()=>{pdf.setFillColor(246,242,234);pdf.rect(0,0,842,65,'F');pdf.setTextColor(52,43,35);pdf.setFont('helvetica','bold');pdf.setFontSize(15);pdf.text('NIC SYSTEM · CONTROL FÍSICO DE ESMALTES',left,28);pdf.setFont('helvetica','normal');pdf.setFontSize(9);pdf.text(`En Uso · Exportado ${new Date().toLocaleString('es-AR')}`,left,45);pdf.setFillColor(59,92,81);pdf.rect(left,y,right-left,23,'F');pdf.setFont('helvetica','bold');pdf.setFontSize(8);pdf.setTextColor(255,255,255);let x=left+8;heads.forEach((h,i)=>{pdf.text(h,x,y+15);x+=widths[i]});y+=23};header();for(const row of rows){if(y>548){pdf.setFont('helvetica','normal');pdf.setFontSize(8);pdf.setTextColor(120,110,100);pdf.text(`Página ${page}`,right,570,{align:'right'});pdf.addPage();page++;y=58;header()}if((y-81)/21%2===0){pdf.setFillColor(250,248,244);pdf.rect(left,y,right-left,21,'F')}pdf.setFont('helvetica','normal');pdf.setFontSize(8);pdf.setTextColor(55,49,42);let x=left+8;[row.name,row.brand,row.type,row.status,stamp(row.updatedAt)].forEach((value,i)=>{pdf.text(pdf.splitTextToSize(String(value),widths[i]-12)[0]||'',x,y+14);x+=widths[i]});pdf.setDrawColor(231,224,213);pdf.line(left,y+21,right,y+21);y+=21}pdf.setFont('helvetica','normal');pdf.setFontSize(8);pdf.setTextColor(120,110,100);pdf.text(`Total: ${rows.length} esmaltes · Página ${page}`,left,570);pdf.save(filename('pdf'))}
async function exportImage(rows){const rowH=38,width=1200,height=120+Math.max(1,rows.length)*rowH;if(height>32700)throw new Error('La lista supera el tamaño máximo de una sola imagen.');const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;const c=canvas.getContext('2d');c.fillStyle='#f7f3eb';c.fillRect(0,0,width,height);c.fillStyle='#382b20';c.font='700 30px Arial';c.fillText('NIC SYSTEM · CONTROL FÍSICO',40,48);c.font='16px Arial';c.fillStyle='#75695f';c.fillText(`En Uso · ${new Date().toLocaleString('es-AR')} · ${rows.length} esmaltes`,40,76);c.fillStyle='#3b5c51';c.fillRect(32,94,width-64,34);c.fillStyle='#fff';c.font='bold 13px Arial';c.fillText('ESMALTE',48,116);c.fillText('MARCA',430,116);c.fillText('TIPO',700,116);c.fillText('ESTADO FÍSICO',900,116);rows.forEach((r,i)=>{const y=128+i*rowH;if(i%2===0){c.fillStyle='#fffdf9';c.fillRect(32,y,width-64,rowH)}c.fillStyle='#382f27';c.font='15px Arial';c.fillText(String(r.name).slice(0,48),48,y+24);c.fillText(String(r.brand).slice(0,30),430,y+24);c.fillText(String(r.type).slice(0,20),700,y+24);c.font='bold 14px Arial';c.fillStyle=r.status==='Presente'?'#22784e':r.status==='Faltante'?'#a83d47':'#766c5f';c.fillText(r.status,900,y+24);c.strokeStyle='#eee6da';c.beginPath();c.moveTo(32,y+rowH);c.lineTo(width-32,y+rowH);c.stroke()});const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));if(!blob)throw new Error('No se pudo crear la imagen.');downloadBlob(blob,filename('png'))}

let exportBusy=false;
async function exportAction(format,button){if(exportBusy)return;exportBusy=true;button.disabled=true;const old=button.textContent;button.textContent='Preparando…';try{const rows=await latestReport();if(format==='xlsx')await exportExcel(rows);else if(format==='pdf')await exportPdf(rows);else await exportImage(rows);button.textContent='Descargado'}catch(e){console.error(e);button.textContent='No disponible';alert(e.message||'No se pudo preparar la exportación.')}finally{setTimeout(()=>{button.disabled=false;button.textContent=old;exportBusy=false},1000)}}
function mountMasterExports(){
 const panel=$('#masterPanel'),grid=panel?.querySelector('.mp-grid');if(!grid||grid.querySelector('#physicalStockExports'))return;
 const card=document.createElement('section');card.className='mp-card';card.id='physicalStockExports';card.innerHTML='<h3>Control físico de En Uso</h3><p class="mp-sub">Exporta todos los esmaltes con los estados guardados más recientes en Firebase.</p><div class="ps-export-actions"><button type="button" class="mp-btn secondary" data-physical-export="pdf">PDF</button><button type="button" class="mp-btn secondary" data-physical-export="xlsx">Excel</button><button type="button" class="mp-btn secondary" data-physical-export="png">Imagen</button></div><p class="mp-error" id="physicalExportStatus" aria-live="polite"></p>';
 card.addEventListener('click',e=>{const b=e.target.closest('[data-physical-export]');if(b)exportAction(b.dataset.physicalExport,b)});grid.append(card);
}

const observer=new MutationObserver(()=>{mountUseButton();mountMasterExports()});
observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['class','hidden']});
mountUseButton();mountMasterExports();
onAuthStateChanged(auth,startListeners);
