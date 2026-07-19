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

  const buckets = new Map();
  selectedPlayers.forEach(p=>{
    const info = playerInfo.get(p) || {group:'__ungrouped', weight:1};
    if (!buckets.has(info.group)) buckets.set(info.group, []);
    buckets.get(info.group).push({name:p, weight: info.weight});
  });

  const groupsArr = Array.from(buckets.entries());
  const choicesPerGroup = groupsArr.map(([g, players]) => {
    const s = players.length;
    const k1 = Math.floor(s/2);
    const k2 = s - k1;
    const sizes = (k1===k2) ? [k1] : [k1, k2];
    return {group: g, players, sizes};
  });

  let bestScore = Infinity;
  const bestCandidates = [];
  function combinations(arr, k) {
    const res = [];
    function rec(start, chosen) {
      if (chosen.length===k) { res.push(chosen.slice()); return; }
      for (let i=start;i<arr.length;i++) { chosen.push(arr[i]); rec(i+1, chosen); chosen.pop(); }
    }
    rec(0, []);
    return res;
  }

  function search(idx, teamA, teamB, weightA, weightB) {
    if (idx===choicesPerGroup.length) {
      const weightDiff = Math.abs(weightA - weightB);
      const sizeDiff = Math.abs(teamA.length - teamB.length);
      const score = (weightDiff * 1000) + sizeDiff;
      if (score < bestScore) {
        bestScore = score;
        bestCandidates.length = 0;
        bestCandidates.push({teamA: teamA.slice(), teamB: teamB.slice(), weightA, weightB, weightDiff, sizeDiff});
      } else if (score === bestScore) {
        bestCandidates.push({teamA: teamA.slice(), teamB: teamB.slice(), weightA, weightB, weightDiff, sizeDiff});
      }
      return;
    }
    const {players, sizes} = choicesPerGroup[idx];
    for (const size of sizes) {
      const combs = combinations(players, size);
      for (const comb of combs) {
        const namesA = comb.map(x=>x.name);
        const namesB = players.filter(p=>!namesA.includes(p.name)).map(x=>x.name);
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
  if (!bestCandidates.length) return {teamA:[], teamB:[], captA:'', captB:'', common:null};
  const picked = bestCandidates[Math.floor(Math.random() * bestCandidates.length)];
  shuffle(picked.teamA); shuffle(picked.teamB);
  const captA = picked.teamA.length? picked.teamA[Math.floor(Math.random()*picked.teamA.length)] : '';
  const captB = picked.teamB.length? picked.teamB[Math.floor(Math.random()*picked.teamB.length)] : '';
  return {
    teamA: picked.teamA,
    teamB: picked.teamB,
    captA,
    captB,
    common: null,
    weights: {a: picked.weightA, b: picked.weightB, diff: picked.weightDiff},
    sizeDiff: picked.sizeDiff
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
