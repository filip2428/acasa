/*
  Lucrătorul de serviciu — partea din aplicație care rulează chiar și când
  aplicația e închisă. Singurul lui rost deocamdată sunt notificările.

  Nu punem aici memorare în cache: pagina se schimbă des în perioada asta, iar
  un cache prost pus e mai enervant decât lipsa lui.
*/

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

self.addEventListener("push", (eveniment) => {
  let mesaj = { titlu: "Acasă", text: "", cale: "/" };
  try {
    mesaj = { ...mesaj, ...eveniment.data.json() };
  } catch {
    mesaj.text = eveniment.data ? eveniment.data.text() : "";
  }

  eveniment.waitUntil(
    self.registration.showNotification(mesaj.titlu, {
      body: mesaj.text,
      icon: "/icoana-192.png",
      badge: "/icoana-192.png",
      lang: "ro",
      tag: mesaj.eticheta || "acasa",
      renotify: true,
      data: { cale: mesaj.cale || "/" },
    }),
  );
});

self.addEventListener("notificationclick", (eveniment) => {
  eveniment.notification.close();
  const cale = (eveniment.notification.data && eveniment.notification.data.cale) || "/";

  eveniment.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((ferestre) => {
      // Dacă aplicația e deja deschisă, o aducem în față în loc s-o deschidem încă o dată.
      for (const fereastra of ferestre) {
        if ("focus" in fereastra) {
          fereastra.navigate(cale);
          return fereastra.focus();
        }
      }
      return self.clients.openWindow(cale);
    }),
  );
});
