const PATH_WIDTH = 380;
function getNodeX(gi) {
  const seed = gi * 0.15;
  const sin1 = Math.sin(seed);
  const sin2 = Math.sin(seed * 0.5);
  const offset = (sin1 + sin2) / 2;
  return (PATH_WIDTH / 2 - 31) + offset * (PATH_WIDTH - 60 - 31);
}

const catmullRom = (p0, p1, p2, p3, t) => {
  const t2 = t * t;
  const t3 = t2 * t;
  return 0.5 * (
      (2 * p1) +
      (-p0 + p2) * t +
      (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 +
      (-p0 + 3 * p1 - 3 * p2 + p3) * t3
  );
};

const x0 = getNodeX(-1);
const x1 = getNodeX(0);
const x2 = getNodeX(1);
const x3 = getNodeX(2);

console.log("x0:", x0, "x1:", x1, "x2:", x2, "x3:", x3);

for (let y = 141; y <= 251; y += 10) {
    let t = (y - 141) / 110;
    let val = catmullRom(x0, x1, x2, x3, t) + 31;
    console.log("y:", y, "t:", t, "val:", val);
}
