// Regras de rolagem portadas 1:1 do projeto rpg-dice-site (player.js).
// d12 · sucesso >= 8 (vantagem: 7 · desvantagem: 9) · cada 12 dá +1 sucesso (+2 com Ordem 3)
// Alinhamento: Ordem se houver algum 12; senão Caos se houver algum 1; senão Normal.

export type RollOptions = { ordem3: boolean; vantagem: boolean; desvantagem: boolean };
export type Alignment = "Ordem" | "Caos" | "Normal";
export type RollOutcome = { results: number[]; successes: number; alignment: Alignment };

export const MAX_DICE = 100;

export function computeRoll(qtd: number, opts: RollOptions, rollDie: () => number): RollOutcome {
  const results: number[] = [];
  for (let i = 0; i < qtd; i++) results.push(rollDie());

  let threshold = 8;
  if (opts.vantagem) threshold = 7;
  if (opts.desvantagem) threshold = 9;

  let successes = 0;
  for (const r of results) {
    if (r >= threshold) successes++;
    if (r === 12) successes += opts.ordem3 ? 2 : 1;
  }

  let alignment: Alignment = "Normal";
  if (results.includes(12)) alignment = "Ordem";
  else if (results.includes(1)) alignment = "Caos";

  return { results, successes, alignment };
}
