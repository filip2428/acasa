"use client";

import { useEffect, useState } from "react";

/*
  Pornirea notificărilor pe telefonul ăsta.

  Trei lucruri de care depinde totul pe iPhone:
  - merge doar din aplicația instalată pe ecranul principal (iOS 16.4+);
  - permisiunea trebuie cerută dintr-o atingere, nu la încărcarea paginii;
  - dacă cineva scoate aplicația de pe ecran, abonamentul moare fără să anunțe.

  De asta ecranul spune limpede în ce stare ești, în loc să presupună că un buton
  apăsat o dată înseamnă că notificările merg pe vecie.
*/

type Stare = "se-verifica" | "neinstalat" | "nesuportat" | "refuzat" | "pornit" | "oprit";

export default function Notificari({ cheiePublica }: { cheiePublica: string | null }) {
  const [stare, setStare] = useState<Stare>("se-verifica");
  const [lucreaza, setLucreaza] = useState(false);
  const [eroare, setEroare] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        // Safari pe iPhone ascunde PushManager până când aplicația e instalată.
        setStare(esteInstalata() ? "nesuportat" : "neinstalat");
        return;
      }
      if (Notification.permission === "denied") return setStare("refuzat");

      const inregistrare = await navigator.serviceWorker.getRegistration();
      const abonament = await inregistrare?.pushManager.getSubscription();
      setStare(abonament ? "pornit" : "oprit");
    })();
  }, []);

  async function porneste() {
    setLucreaza(true);
    setEroare(null);
    try {
      const inregistrare = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;

      const permisiune = await Notification.requestPermission();
      if (permisiune !== "granted") {
        setStare("refuzat");
        return;
      }

      const abonament = await inregistrare.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: dinBase64Url(cheiePublica!),
      });

      const raspuns = await fetch("/api/push/abonare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(abonament.toJSON()),
      });
      if (!raspuns.ok) throw new Error("Serverul n-a acceptat abonamentul.");

      setStare("pornit");
    } catch (e) {
      setEroare(e instanceof Error ? e.message : "Ceva n-a mers.");
    } finally {
      setLucreaza(false);
    }
  }

  async function opreste() {
    setLucreaza(true);
    try {
      const inregistrare = await navigator.serviceWorker.getRegistration();
      const abonament = await inregistrare?.pushManager.getSubscription();
      if (abonament) {
        await fetch("/api/push/abonare", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: abonament.endpoint }),
        });
        await abonament.unsubscribe();
      }
      setStare("oprit");
    } finally {
      setLucreaza(false);
    }
  }

  if (!cheiePublica) {
    return (
      <p className="text-[0.9375rem] text-[var(--color-creion)]">
        Lipsesc cheile de notificare. Rulează <code className="cifre">npm run pregatire</code>.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {stare === "se-verifica" && (
        <p className="text-[0.9375rem] text-[var(--color-creion)]">Se verifică…</p>
      )}

      {stare === "neinstalat" && (
        <p className="text-[0.9375rem] leading-relaxed">
          Pe iPhone, notificările merg doar din aplicația instalată. Din Safari, apasă
          butonul de partajare și „Adaugă pe ecranul principal”, apoi deschide-o de acolo
          și revino aici.
        </p>
      )}

      {stare === "nesuportat" && (
        <p className="text-[0.9375rem] leading-relaxed">
          Browserul ăsta nu știe notificări. Deschide aplicația de pe ecranul principal.
        </p>
      )}

      {stare === "refuzat" && (
        <p className="text-[0.9375rem] leading-relaxed">
          Notificările sunt blocate pentru aplicație. Se pornesc din Setările telefonului,
          la Notificări → Acasă.
        </p>
      )}

      {stare === "oprit" && (
        <>
          <p className="text-[0.9375rem] leading-relaxed">
            Nu primești notificări pe telefonul ăsta.
          </p>
          <button
            type="button"
            className="buton buton-principal w-full"
            onClick={porneste}
            disabled={lucreaza}
          >
            {lucreaza ? "Se pornesc…" : "Pornește notificările"}
          </button>
        </>
      )}

      {stare === "pornit" && (
        <>
          <p className="flex items-center gap-2 text-[0.9375rem]">
            <span className="fisa">pornite</span>
            Telefonul ăsta primește notificări.
          </p>
          <button
            type="button"
            className="buton buton-secundar buton-sters w-full"
            onClick={opreste}
            disabled={lucreaza}
          >
            Oprește-le pe telefonul ăsta
          </button>
        </>
      )}

      {eroare && (
        <p className="rounded-xl bg-[var(--color-caramida-palid)] px-3 py-2 text-sm text-[#8c3626]">
          {eroare}
        </p>
      )}
    </div>
  );
}

function esteInstalata() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

/** Cheia VAPID vine ca text base64url; browserul o vrea ca octeți. */
function dinBase64Url(cheie: string) {
  const completare = "=".repeat((4 - (cheie.length % 4)) % 4);
  const curat = (cheie + completare).replace(/-/g, "+").replace(/_/g, "/");
  const brut = atob(curat);
  return Uint8Array.from([...brut].map((c) => c.charCodeAt(0)));
}
