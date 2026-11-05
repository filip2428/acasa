/*
  Răspunsul unei acțiuni: verde pentru ce a mers, alamă pentru ce merită știut,
  cărămidă pentru ce n-a mers. Aceleași cutii ca în formularul de cheltuieli.
*/

export type StareRaspuns = { mesaj?: string; avertisment?: string; eroare?: string };

export default function Raspuns({ stare, id }: { stare: StareRaspuns; id?: string }) {
  if (!stare.mesaj && !stare.avertisment && !stare.eroare) return null;
  return (
    <div id={id} role="status" className="space-y-2">
      {stare.mesaj && (
        <p className="rounded-xl bg-[var(--color-smalt-palid)] px-3 py-2 text-sm text-[var(--color-smalt-adanc)]">
          {stare.mesaj}
        </p>
      )}
      {stare.avertisment && (
        <p className="rounded-xl bg-[var(--color-alama-palid)] px-3 py-2 text-sm text-[#7a5626]">{stare.avertisment}</p>
      )}
      {stare.eroare && (
        <p className="rounded-xl bg-[var(--color-caramida-palid)] px-3 py-2 text-sm text-[#8c3626]">{stare.eroare}</p>
      )}
    </div>
  );
}
