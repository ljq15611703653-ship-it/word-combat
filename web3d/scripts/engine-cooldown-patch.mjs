export function applyCooldownPatch(file, source) {
  if (file !== 'interp') return source;
  const replace = (from, to) => {
    if (!source.includes(from)) throw new Error(`冷却补丁上下文变化：${from}`);
    source = source.replace(from, to);
  };
  replace('  refc: [Record<string, number[]>, Record<string, number[]>];', '  advCooling: [Record<string, number[]>, Record<string, number[]>];\n  refc: [Record<string, number[]>, Record<string, number[]>];');
  replace('    deck: [decks[0]', '    advCooling: [{}, {}],\n    deck: [decks[0]');
  replace('    deck: [s.deck[0]', '    advCooling: [rf(s.advCooling[0]), rf(s.advCooling[1])],\n    deck: [s.deck[0]');
  replace('if (dk) for (const w of adv) dk[w]--;', 'if (dk) for (const w of adv) { dk[w]--; (s.advCooling[side][w] ??= []).push(2); }');
  replace('    for (const c of S.cards) if (c.cd > 0) c.cd--;', '    for (const [w, cds] of Object.entries(s.advCooling[sd])) {\n      const next = cds.map(cd => cd - 1);\n      if (s.deck[sd]) s.deck[sd][w] = (s.deck[sd][w] ?? 0) + next.filter(cd => cd === 0).length;\n      s.advCooling[sd][w] = next.filter(cd => cd > 0);\n    }\n    for (const c of S.cards) if (c.cd > 0) c.cd--;');
  return source;
}
