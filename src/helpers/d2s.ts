export function durationToSeconds(d: string): number {
  // d = 24*60*60
  // h = 60*60
  // m = 60
  // s = 1
  const regex = /(\d{0,2})([dhms])/gm;
  let m;
  const ps: { l: number; q: string }[] = [];

  while ((m = regex.exec(d)) !== null) {
    if (m.index === regex.lastIndex) {
      regex.lastIndex++;
    }
    ps.push({ l: Number.parseInt(m[1]), q: m[2] });
  }

  let sec = 0;
  ps.forEach((v) => {
    if (v.q === 'd') sec += v.l * 24 * 60 * 60;
    if (v.q === 'h') sec += v.l * 60 * 60;
    if (v.q === 'm') sec += v.l * 60;
    if (v.q === 's') sec += v.l;
  });

  return sec;
}
