"use client";

import { useState, type InputHTMLAttributes } from "react";

import { citesteSuma, sumaInCamp } from "@/lib/formatare";

/*
  Câmp pentru o sumă sau o cantitate cu zecimale.

  Nu e `type="number"`: pe iPhone, cu tastatura în română, tasta de zecimale e
  virgula, iar un câmp numeric o respinge. Ținem textul așa cum e scris („12,”
  la jumătatea tastării) și trimitem mai departe numărul sau null.
*/

type Proprietati = Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type"> & {
  valoare: number | null;
  onValoare: (valoare: number | null) => void;
};

export default function CampSuma({ valoare, onValoare, ...rest }: Proprietati) {
  const [text, setText] = useState(sumaInCamp(valoare));

  // Dacă valoarea se schimbă din afară (alt produs, formular golit), o luăm. Când
  // schimbarea vine chiar din ce s-a tastat, textul deja o arată și îl lăsăm.
  const [ultima, setUltima] = useState(valoare);
  if (valoare !== ultima) {
    setUltima(valoare);
    if (citesteSuma(text) !== valoare) setText(sumaInCamp(valoare));
  }

  return (
    <input
      {...rest}
      type="text"
      inputMode="decimal"
      autoComplete="off"
      value={text}
      onChange={(e) => {
        const nou = e.target.value;
        setText(nou);
        onValoare(citesteSuma(nou));
      }}
    />
  );
}
