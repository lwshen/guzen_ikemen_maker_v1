// RNG, weighted picks, id + measurement-deck utilities
// Split from the verbatim V3.2.0 baseline (Phase 4 stage B) — bodies unchanged
// except top-level state rewritten to ST.* (see state.js).
import {
  C_MEASUREMENT_EN, C_MEASUREMENT_VALUES,
} from '../data/index.js';

const STORAGE_KEY = 'guzen-ikemen-maker-v1.results';

  const sleep = ms => new Promise(r=>setTimeout(r,ms));

  const rnd = (min,max,step=1)=> Math.round((min + Math.random()*(max-min))/step)*step;

  const randomNormal = (mean=0, sd=1) => {
    let u=0, v=0;
    while(u===0) u=Math.random();
    while(v===0) v=Math.random();
    return mean + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  };

  const shuffleInPlace = arr => {
    for(let i=arr.length-1;i>0;i--){
      const j=Math.floor(Math.random()*(i+1));
      [arr[i],arr[j]]=[arr[j],arr[i]];
    }
    return arr;
  };

  // A/Bは100個の周期デッキで管理する。
  // 各100回の平均はA=8.0cm、B=13.5cmに固定し、0.1cm刻み・指定範囲内で抽選する。
  const makeBalancedMeasurementDeck = (min,max,targetMean,sdMin,sdMax) => {
    const lo=Math.round(min*10), hi=Math.round(max*10), mean10=Math.round(targetMean*10);
    const targetSum=mean10*100;
    for(let attempt=0;attempt<400;attempt++){
      const targetSd=(sdMin+0.05+Math.random()*Math.max(0.01,(sdMax-sdMin)-0.10))*10;
      const values=[];
      let drawGuard=0;
      while(values.length<100 && drawGuard++<30000){
        const x=randomNormal(mean10,targetSd);
        if(x>=lo && x<=hi) values.push(Math.max(lo,Math.min(hi,Math.round(x))));
      }
      if(values.length<100) continue;
      let diff=targetSum-values.reduce((a,b)=>a+b,0);
      let guard=0;
      while(diff!==0 && guard++<100000){
        const dir=diff>0 ? 1 : -1;
        let changed=false;
        for(let tries=0;tries<300;tries++){
          const i=Math.floor(Math.random()*values.length);
          const nv=values[i]+dir;
          if(nv>=lo && nv<=hi){
            values[i]=nv;
            diff-=dir;
            changed=true;
            break;
          }
        }
        if(!changed) break;
      }
      if(diff!==0) continue;
      const sd=Math.sqrt(values.reduce((sum,v)=>sum+Math.pow(v-mean10,2),0)/values.length)/10;
      if(sd>=sdMin && sd<=sdMax){
        return shuffleInPlace(values.map(v=>Number((v/10).toFixed(1))));
      }
    }
    // フォールバック：平均を厳密に保つ対称ペア方式
    const pairCount=50;
    const maxDistance=Math.min(targetMean-min,max-targetMean);
    const targetSd=sdMin + Math.random()*(sdMax-sdMin);
    const raw=Array.from({length:pairCount},()=>Math.max(0.02,Math.abs(randomNormal())));
    const rmsForScale = scale => Math.sqrt(raw.reduce((sum,z)=>{
      const d=Math.min(maxDistance,z*scale);
      return sum+d*d;
    },0)/pairCount);
    let scaleLo=0, scaleHi=maxDistance*20;
    for(let i=0;i<80;i++){
      const mid=(scaleLo+scaleHi)/2;
      if(rmsForScale(mid)<targetSd) scaleLo=mid; else scaleHi=mid;
    }
    const deck=[];
    raw.forEach(z=>{
      const d=Math.round(Math.min(maxDistance,z*((scaleLo+scaleHi)/2))*10)/10;
      deck.push(Number((targetMean-d).toFixed(1)), Number((targetMean+d).toFixed(1)));
    });
    return shuffleInPlace(deck);
  };

  // 中央4項目を各20%、両端を各10%にし、中央4項目の合計を厳密に80%とする100個デッキ。
  const makeCMeasurementDeck = () => shuffleInPlace(
    C_MEASUREMENT_VALUES.flatMap((value,index)=>Array(index===0 || index===5 ? 10 : 20).fill(value))
  );

  const measurementDeckState = {
    A:makeBalancedMeasurementDeck(5.0,10.5,8.0,1.5,2.0),
    B:makeBalancedMeasurementDeck(9.0,19.0,13.5,1.5,3.5),
    C:makeCMeasurementDeck(),
    indexA:0,indexB:0,indexC:0
  };

  const drawProfileMeasurement = key => {
    const deck=measurementDeckState[key];
    const indexKey='index'+key;
    const value=deck[measurementDeckState[indexKey] % deck.length];
    measurementDeckState[indexKey]=(measurementDeckState[indexKey]+1)%deck.length;
    return value;
  };

  const gaussRand = (m,s) => { let u=0,v=0; while(!u)u=Math.random(); while(!v)v=Math.random(); return m + s*Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v); };


  const deriveMeasurementB = a => { const A=Number(a)||7; let B=gaussRand(13.3,1.9); B=Math.max(9.0, Math.min(18.0, B)); B=Math.max(B, A*1.05); return Math.round(B*10)/10; };

 // B = A×1.57＋0〜1の誤差
  const ensureProfileMeasurements = c => {
    if(!c) return;
    const invalidA=!Number.isFinite(Number(c.measurementA)) || Number(c.measurementA)<5 || Number(c.measurementA)>10.5;
    const A0 = Number(c.measurementA);
    const invalidB=!Number.isFinite(Number(c.measurementB)) || Number(c.measurementB) < Math.max(9.0, A0*1.05) - 0.05 || Number(c.measurementB) > 18.0;
    const invalidC=!C_MEASUREMENT_VALUES.includes(c.measurementC);
    if(invalidA) c.measurementA=drawProfileMeasurement('A');
    if(invalidB) c.measurementB=deriveMeasurementB(c.measurementA);
    if(invalidC) c.measurementC=drawProfileMeasurement('C');
  };

  const profileMeasurementCLabel = (value, english=false) => english ? (C_MEASUREMENT_EN[value] || value) : value;

  const pick = arr => arr[Math.floor(Math.random()*arr.length)];

  const weighted = entries => { const total = entries.reduce((a,b)=>a+b[1],0); let n=Math.random()*total; for(const [v,w] of entries){n-=w; if(n<=0) return v;} return entries[entries.length-1][0]; };

  const uniqId = () => Math.random().toString(36).slice(2)+Date.now().toString(36);

export {
  STORAGE_KEY,
  sleep,
  rnd,
  randomNormal,
  shuffleInPlace,
  makeBalancedMeasurementDeck,
  makeCMeasurementDeck,
  measurementDeckState,
  drawProfileMeasurement,
  deriveMeasurementB,
  ensureProfileMeasurements,
  profileMeasurementCLabel,
  pick,
  weighted,
  uniqId,
};
