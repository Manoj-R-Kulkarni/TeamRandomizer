const fs = require('fs');

function shuffle(a) { for (let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]} }

function uniquePlayers(groups) {
  const set = new Set();
  groups.forEach(g=>g.players.forEach(p=>set.add(p)));
  return Array.from(set);
}

function generateTeamsFrom(groups, selectedPlayers) {
  const playerInfo = new Map();
  groups.forEach(g=>{
    const gw = (typeof g.weight === 'number') ? g.weight : 1;
    g.players.forEach(p=>{
      if (typeof p === 'string') playerInfo.set(p, {group: g.name||'__g', weight: gw});
      else if (p && p.name) playerInfo.set(p.name, {group: g.name||'__g', weight: (typeof p.weight==='number'?p.weight:gw)});
    });
  });

  function combinations(arr, k) {
    const res = [];
    function rec(start, chosen) {
      if (chosen.length===k) { res.push(chosen.slice()); return; }
      for (let i=start;i<arr.length;i++) { chosen.push(arr[i]); rec(i+1, chosen); chosen.pop(); }
    }
    rec(0, []);
    return res;
  }

  function solvePool(poolNames) {
    const buckets = new Map();
    poolNames.forEach(p=>{
      const info = playerInfo.get(p) || {group:'__ungrouped', weight:1};
      if (!buckets.has(info.group)) buckets.set(info.group, []);
      buckets.get(info.group).push({name:p, weight: info.weight});
    });

    const choicesPerGroup = Array.from(buckets.entries()).map(([g, players]) => {
      const s = players.length;
      const k1 = Math.floor(s/2);
      const k2 = s - k1;
      const sizes = (k1===k2) ? [k1] : [k1, k2];
      return {group: g, players, sizes};
    });

    let bestScore = Infinity;
    const bestCandidates = [];

    function search(idx, teamA, teamB, weightA, weightB) {
      if (idx===choicesPerGroup.length) {
        const weightDiff = Math.abs(weightA - weightB);
        const sizeDiff = Math.abs(teamA.length - teamB.length);
        const score = (weightDiff * 1000) + sizeDiff;
        if (score < bestScore) {
          bestScore = score;
          bestCandidates.length = 0;
          bestCandidates.push({teamA: teamA.slice(), teamB: teamB.slice(), weightA, weightB, weightDiff, sizeDiff, score});
        } else if (score === bestScore) {
          bestCandidates.push({teamA: teamA.slice(), teamB: teamB.slice(), weightA, weightB, weightDiff, sizeDiff, score});
        }
        return;
      }

      const {players, sizes} = choicesPerGroup[idx];
      for (const size of sizes) {
        const combs = combinations(players, size);
        for (const comb of combs) {
          const namesASet = new Set(comb.map(x=>x.name));
          const namesA = Array.from(namesASet);
          const namesB = players.filter(p=>!namesASet.has(p.name)).map(x=>x.name);
          const wA = comb.reduce((s,p)=>s+(p.weight||1),0);
          const wB = players.reduce((s,p)=>s+(p.weight||1),0) - wA;

          teamA.push(...namesA);
          teamB.push(...namesB);
          search(idx+1, teamA, teamB, weightA + wA, weightB + wB);
          teamA.splice(teamA.length - namesA.length, namesA.length);
          teamB.splice(teamB.length - namesB.length, namesB.length);
        }
      }
    }

    search(0, [], [], 0, 0);
    if (!bestCandidates.length) return null;
    return bestCandidates[Math.floor(Math.random() * bestCandidates.length)];
  }

  const pool = Array.from(new Set(selectedPlayers));
  if (!pool.length) return {teamA:[], teamB:[], captA:'', captB:'', common:null, weights:{a:0,b:0,diff:0}, sizeDiff:0};

  let picked;
  let common = null;
  if (pool.length % 2 === 1) {
    const candidateSolutions = [];
    for (const candidate of pool) {
      const reduced = pool.filter(p=>p!==candidate);
      const solved = solvePool(reduced);
      if (!solved) continue;
      candidateSolutions.push({common: candidate, solved, score: solved.score});
    }
    if (!candidateSolutions.length) return {teamA:[], teamB:[], captA:'', captB:'', common:null, weights:{a:0,b:0,diff:0}, sizeDiff:0};
    const bestScore = Math.min(...candidateSolutions.map(x=>x.score));
    const best = candidateSolutions.filter(x=>x.score===bestScore);
    const chosen = best[Math.floor(Math.random() * best.length)];
    picked = chosen.solved;
    common = chosen.common;
  } else {
    picked = solvePool(pool);
    if (!picked) return {teamA:[], teamB:[], captA:'', captB:'', common:null, weights:{a:0,b:0,diff:0}, sizeDiff:0};
  }

  const teamA = picked.teamA.slice();
  const teamB = picked.teamB.slice();
  if (common) {
    teamA.push(common);
    teamB.push(common);
  }

  shuffle(teamA); shuffle(teamB);
  const captainPoolA = common ? teamA.filter(p => p !== common) : teamA;
  const captainPoolB = common ? teamB.filter(p => p !== common) : teamB;
  const captA = captainPoolA.length ? captainPoolA[Math.floor(Math.random()*captainPoolA.length)] : '';
  const captB = captainPoolB.length ? captainPoolB[Math.floor(Math.random()*captainPoolB.length)] : '';
  return {
    teamA,
    teamB,
    captA,
    captB,
    common,
    weights: {a: picked.weightA, b: picked.weightB, diff: picked.weightDiff},
    sizeDiff: 0
  };
}

const groups = JSON.parse(fs.readFileSync('./groups.json','utf8'));
const all = uniquePlayers(groups);
console.log('Loaded groups, total unique players:', all.length);

function pickAndRun(n){
  if (n>all.length) { console.log('Cannot pick',n,'> available',all.length); return; }
  const pool = all.slice(); shuffle(pool); const picked = pool.slice(0,n);
  console.log('\nPicked',n,'attendees:', picked.join(', '));
  const res = generateTeamsFrom(groups, picked);
  console.log('Team A:', res.teamA.join(', '));
  console.log('Captain A:', res.captA);
  console.log('Team B:', res.teamB.join(', '));
  console.log('Captain B:', res.captB);
  if (res.weights) console.log('Weights A/B/diff:', res.weights.a, res.weights.b, res.weights.diff);
  if (typeof res.sizeDiff === 'number') console.log('Size diff:', res.sizeDiff);
  if (res.common) console.log('Common player (in both):', res.common);
}

pickAndRun(7);
pickAndRun(8);
