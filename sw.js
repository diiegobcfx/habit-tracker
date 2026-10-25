const V='ritual-v2-1';                       // sube el número al publicar cambios
const WORKER=new URL(self.location).searchParams.get('w')||'';
const SHELL=['./','./index.html','./manifest.webmanifest','./icon-192.png','./icon-512.png','./apple-touch-icon.png'];

self.addEventListener('install',e=>{
  e.waitUntil(caches.open(V).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting()));
});
self.addEventListener('activate',e=>{
  e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==V).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});

// Red primero (evita quedarse con versiones viejas), caché como respaldo offline
self.addEventListener('fetch',e=>{
  const r=e.request;
  if(r.method!=='GET'||new URL(r.url).origin!==location.origin)return;
  e.respondWith(
    fetch(r).then(res=>{
      if(res.ok){const cp=res.clone();caches.open(V).then(c=>c.put(r,cp))}
      return res;
    }).catch(()=>caches.match(r).then(m=>m||caches.match('./index.html')))
  );
});

// Push sin payload: el texto se pide al Worker. Siempre se muestra una notificación (iOS lo exige).
self.addEventListener('push',e=>{
  e.waitUntil((async()=>{
    let body='Hora de registrar tus hábitos';
    try{
      const sub=await self.registration.pushManager.getSubscription();
      if(sub&&WORKER){
        const r=await fetch(WORKER+'/pending',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({endpoint:sub.endpoint})});
        if(r.ok){const j=await r.json();if(j.text)body=j.text}
      }
    }catch{}
    await self.registration.showNotification('Ritual',{body,icon:'icon-192.png'});
  })());
});

self.addEventListener('notificationclick',e=>{
  e.notification.close();
  e.waitUntil(self.clients.matchAll({type:'window',includeUncontrolled:true}).then(l=>l.length?l[0].focus():self.clients.openWindow('./')));
});