// slot flow: generateCharacter, spin, slots, group, friend, slot editors
// Split from the verbatim V3.2.0 baseline (Phase 4 stage B) — bodies unchanged
// except top-level state rewritten to ST.* (see state.js).
import {
  SMILE_EYES, SMILE_STYLES, CHEEK_SMILES, MOUTH_CORNERS,
  BODY_ASYMS, DICE_GROUPS, ETHNIC_HAIR_WEIGHTS, FOOT_FEATURES, FOOT_WIDTHS, FRIEND_HIER_DELTA, FRIEND_HIER_EN, FRIEND_RELATIONS,
  FRIEND_REL_EN, FRIEND_REL_ZH, FRIEND_HIER_ZH, INNER_DEPS, INNER_FIELD_GEN, OCCUPATIONS, POSTURES, SOLE_TYPES, SOLE_WRINKLES, SPORTS,
  SPORT_BODY, SPORT_EXP_POOL, STRICT_HAIR_OCC, TOE_CURLS, TOE_LINES, TRAINING_BODY, TRAINING_EXCL, TRAINING_LEVELS,
  UNIFORM_VARIANTS, UNIFORM_WORKWEAR, VIBE_OCC, pools, slotDefs,
} from '../data/index.js';
import {
  STORAGE_KEY, drawProfileMeasurement, pick, rnd, sleep, uniqId, weighted,
} from './core.js';
import {
  chooseSmileTraits, smileLine,
  SPORT_STAGES, ageAppearanceByAge, avgHeight, bioLine, bodyRealismLine, bodyTypeDesc, buildBioHook, buildEncounterScene,
  calcFootWidth, calcWeight, chooseAge, chooseBody, chooseEyeShape, chooseEyebrow, chooseEyelash, chooseEyelid,
  chooseFaceAgeCompatible, chooseFaceSpacing, chooseFacialHair, chooseGlasses, chooseOutfitByMbti, chooseRoleByMbti, chooseSkin, chooseSkinDetail,
  chooseSport, chooseTrainingLevel, chooseUniformVariant, chooseVibeByMbti, countryLine, defaultEthnicityForNationality, eraAdjustEntries, eraBrandList,
  eraContextLine, eraLabel, eraOptionsFor, eraProfile, eraStyleNote, eyeAreaLine, faceByEthnicity, faceExtraLine,
  facePresetPhrase, footFeatureLine, footFromHeight, footWidthDesc, generateAccessories, generateBodyHair, generateCoordinatedOutfit, generateEraUnderwear,
  generateSportsHistory, getFixed, getInitial, headCount, maxStageForAge, mbtiProfile, muscleLine, nameByNationality,
  nameKana, occOutfitBlocklist, occupationBodyWeights, occupationFaceWeights, occupationHairWeights, occupationOptionsHTML, occupationOutfitWeights, partBrandRedraw,
  physiqueSpec, pickHeightAround, realismSpec, refSheetInstruction, refSheetKind, roleWithSport, seasonLine, soleDetailLine,
  sportsHistoryLine, sportsHistoryText, syncMarriageRing, teethLine, trainingLine, trainingWeightAdj, underwearDesc, vibeProfile,
} from './generate.js';
import {
  LT,
  T, cardEffectByRarity, cardWearDescription, displayOptionLabel, displayValue, mbtiDescription, mbtiDisplay, promptTargetGuide,
  suggestCardRarity,
} from './i18n.js';
import {
  INNER_EDIT_POOLS, INNER_EDIT_POOLS2, applyFashionSenseFx, applyMuscleFashion, generateInnerProfile,
} from './inner.js';
import {
  buildPrompt, buildTradingCardPrompt,
} from './prompts.js';
import {
  ST, els,
} from './state.js';
import {
  loadHistory, renderAll, switchTab,
} from './ui.js';

  // Lifted out of generateCharacter: the slot editor needs the same map so it can
  // offer the occupation's own hairstyles (e.g. 坊主 for 自衛官), which the generic
  // pools.hairStyles list does not contain. Pure literals, so hoisting is inert.
  const OCC_HAIRSTYLE = (()=>{
    const M = {};
    const set = (list, boost, damp) => list.forEach(o=>{ M[o] = {boost, damp}; });
    set(['美容師','アパレル店員','古着屋店主','モデル'], [['スキンフェード',4],['フェード×ツイストスパイラル',4],['センターパート',3],['韓国風センターパート',3],['マッシュウルフ',2]], null);
    set(['銀行員','公務員','営業職','商社勤務','ホテルスタッフ','経理・事務職','コンサルタント','不動産営業'], [['ビジネス短髪',6],['ソフトツーブロック',4],['ローフェード',3],['短髪',3],['サイドパート',2]], ['波巻きパーマ','スパイラルパーマ','ツイストパーマ','マンバン','フェード×ツイストスパイラル','マッシュウルフ']);
    set(['自衛官','防衛大学校学生'], [['坊主',5],['短髪',5]], null);
    M['自衛官'].only = M['防衛大学校学生'].only = ['坊主','短髪','ビジネス短髪','ソフトツーブロック','アップバング'];
    set(['消防士','警察官','救急隊員'], [['短髪',4],['ソフトモヒカン',2],['アップバング',1]], ['波巻きパーマ','スパイラルパーマ','マンバン','ロング寄りミディアム','マッシュウルフ','フェード×ツイストスパイラル']);
    set(['大工','自動車整備士','電気工事士','工場勤務','漁師','農家','配送ドライバー'], [['ソフトモヒカン',2],['短髪',3],['アップバング',1]], null);
    set(['ITエンジニア','Webデザイナー','ゲーム開発者','アプリ開発者','イラストレーター','編集者'], [['マッシュ',3],['センターパート',2]], null);
    set(['バーテンダー','喫茶店マスター'], [['バーバースタイル（七三フェード）',2],['七三分け',2],['サイドパート',2]], null);
    return M;
  })();

  function generateCharacter(partialMode='full', groupCtx=null){
    const fixed = groupCtx ? {} : getFixed();
    if(ST.FRIEND_CTX){ if(ST.FRIEND_CTX.age) fixed.age = ST.FRIEND_CTX.age; if(ST.FRIEND_CTX.nationality) fixed.nationality = ST.FRIEND_CTX.nationality; if(ST.FRIEND_CTX.season) fixed.season = ST.FRIEND_CTX.season; }
    const initial = getInitial();
    const rareMode = partialMode === 'rare';
    const base = ST.current && partialMode !== 'full' && partialMode !== 'rare' ? {...ST.current} : {};
    let age = Number(fixed.age || base.age || (groupCtx ? Math.min(45, Math.max(18, Number(groupCtx.ageCenter) + rnd(-3,3,1))) : chooseAge(initial.ageMin || 20, initial.ageMax || 32)));
    const nationality = fixed.nationality || initial.nationality || base.nationality || (groupCtx && Math.random()<0.8 ? groupCtx.nationality : pick(pools.nationalities));
    const ethnicity = fixed.ethnicity || initial.ethnicity || base.ethnicity || defaultEthnicityForNationality(nationality);
    const mbti = fixed.mbti || base.mbti || (groupCtx ? weighted(groupCtx.mbtiWeights) : pick(pools.mbtis));
    const vibe = fixed.vibe || (initial.vibe && initial.vibe !== 'ランダム' ? initial.vibe : (base.vibe || (groupCtx && Math.random()<0.6 ? groupCtx.vibe : chooseVibeByMbti(mbti, age))));
    const eraYear = (ST.FRIEND_CTX && ST.FRIEND_CTX.eraYear) || initial.eraYear || '2026';
    const era = eraProfile(eraYear);
    const season = fixed.season || base.season || ((initial.season && initial.season !== 'ランダム') ? initial.season : pick(['春','夏','秋','冬']));
    const profile = vibeProfile(vibe, age);
    const gapMode = Math.random() < 0.15;
    const role = ST.FRIEND_CTX ? (ST.FRIEND_CTX.role || chooseRoleByMbti(age, vibe, mbti, eraYear, gapMode)) : (base.role || (initial.occupation && initial.occupation !== 'ランダム' ? initial.occupation : chooseRoleByMbti(age, vibe, mbti, eraYear, gapMode)));
    const holidayPersona = !!(VIBE_OCC[vibe] && VIBE_OCC[vibe].bad.includes(role));
    const occRowForAge = OCCUPATIONS.find(o=>o[0]===role);
    if(occRowForAge && !base.age){
      const aLo = occRowForAge[4] || 18, aHi = occRowForAge[5] || 80;
      if(age < aLo || age > aHi) age = ST.FRIEND_CTX ? Math.min(aHi, Math.max(aLo, age)) : rnd(aLo, aHi, 1);
    }
    const sportName = fixed.sportName || base.sportName || chooseSport(role, eraYear);
    const sportsHistoryArr = base.sportsHistory || generateSportsHistory(age, role, sportName, initial.sportsBodyInfluence);
    const trainingLevel = fixed.trainingLevel || base.trainingLevel || ((initial.trainingMode && initial.trainingMode !== 'ランダム') ? initial.trainingMode : chooseTrainingLevel({eraYear, age, role, sportsHistory: sportsHistoryArr}));
    const heightAvgBase = avgHeight(nationality, eraYear);
    const occHeightShift = (role === 'モデル' ? 7 : 0) + (sportName === 'バスケットボール' ? 8 : sportName === 'バレーボール' ? 7 : 0);
    const sportsHeightShift = role === 'プロスポーツ選手' ? 0 : (h => { let sh=0; for(const x of h){ if(!x.strength) continue; if(/バスケットボール|バレーボール/.test(x.name)) sh += Math.min(3, x.strength); if(/体操/.test(x.name)) sh -= Math.min(2, x.strength); } return Math.round(sh); })(sportsHistoryArr);
    const heightBaseShift = initial.heightBase === '高めベース（+6cm）' ? 6 : initial.heightBase === '長身多めベース（+10cm）' ? 10 : 0;
    const height = Number(base.heightRaw || pickHeightAround(heightAvgBase + heightBaseShift + occHeightShift + ({'北欧系':3,'白人系':2,'スラブ系':2,'黒人系':2,'東南アジア系':-2,'南アジア系':-1}[ethnicity]||0) + sportsHeightShift - (age >= 70 ? 1 : 0)));
    const sd1 = fixed.skinDetail || (base.skinDetail ? String(base.skinDetail).split('＋')[0] : null) || chooseSkinDetail(age, vibe, role, gapMode);
    const sd2 = fixed.skinDetail2 || base.skinDetail2 || (base.skinDetail && String(base.skinDetail).includes('＋') ? String(base.skinDetail).split('＋')[1] : null) || (sd1 === 'なし（クリアな肌）' ? 'なし（クリアな肌）' : chooseSkinDetail(age, vibe, role, gapMode, [sd1], true));
    const occInfluence = initial.occInfluence || '服装・場面・体型に反映';
    const occFull = occInfluence === '服装・場面・体型に反映';
    const occupationMode = holidayPersona ? '休日' : (occFull ? (Math.random() < 0.65 ? '勤務帰り' : '休日') : '');
    const occOutfitW = occFull ? occupationOutfitWeights(role) : null;
    const occBodyW = occFull ? occupationBodyWeights(role) : null;
    const occFaceW = (occFull && !gapMode) ? occupationFaceWeights(role) : null;
    const occHairW = (occFull && !gapMode) ? occupationHairWeights(role) : null;
    const identityVibe = ['ブサイク系','ホスト系','おじさん系','ヤンキー系','ギャル男系','韓国風'].includes(vibe);
    const userVibeFlag = !!(fixed.vibe || (initial.vibe && initial.vibe !== 'ランダム'));
    const eraMult = userVibeFlag ? 1 : 2;
    const eraBodyMult = userVibeFlag ? 1 : 1.5;
    const bodyType = fixed.bodyType || base.bodyType || (()=>{
      let entries = profile ? profile.bodyTypes.map(([v,w])=>[v,w]) : pools.bodyTypes.map(v=>[v,1]);
      if(!profile){ const hb = chooseBody(height, rareMode); const f = entries.find(x=>x[0]===hb); if(f) f[1]+=3; }
      if(occBodyW){
        (occBodyW.weights||[]).forEach(([v,w])=>{ const f = entries.find(x=>x[0]===v); if(f) f[1]+=w; else entries.push([v,w]); });
        if(occBodyW.exclude){ occBodyW.exclude.forEach(v=>{ const f = entries.find(x=>x[0]===v); if(f) f[1] = 0.5; else entries.push([v, 0.5]); }); }
      }
      if(sportName && sportName !== 'なし' && SPORT_BODY[sportName]){
        SPORT_BODY[sportName].forEach(([v,w])=>{ const f = entries.find(x=>x[0]===v); if(f) f[1]+=w; else entries.push([v,w]); });
      }
      if(role !== 'プロスポーツ選手'){
        sportsHistoryArr.forEach(x=>{
          if(!x.strength) return;
          const m = SPORT_BODY[x.name];
          if(m) m.forEach(([v,w])=>{ const add = w * Math.min(1, x.strength/3); const f = entries.find(e=>e[0]===v); if(f) f[1]+=add; else entries.push([v, add]); });
        });
      }
      if(TRAINING_BODY[trainingLevel]){
        TRAINING_BODY[trainingLevel].forEach(([v,w])=>{ const f = entries.find(e=>e[0]===v); if(f) f[1]+=w; else entries.push([v,w]); });
      }
      if(TRAINING_EXCL[trainingLevel]){
        const kept = entries.filter(([v])=>!TRAINING_EXCL[trainingLevel].includes(v));
        if(kept.length) entries = kept;
      }
      if(age >= 65){
        const MUSCLE = ['筋肉質','がっしり体型','引き締まったスポーツ体型','ラグビー選手体型','細マッチョ','痩せマッチョ'];
        if(!occBodyW) entries = entries.map(([v,w])=>MUSCLE.includes(v) ? [v, Math.max(0.5, w*0.5)] : [v,w]);
        [['標準体型',2],['やせ型',1],['腹だけぽっちゃり',2],['ビール腹',1]].forEach(([v,w])=>{ const f = entries.find(x=>x[0]===v); if(f) f[1]+=w; else entries.push([v,w]); });
      }
      let finalEntries = eraAdjustEntries(entries, era, 'bodyTypes', null, eraBodyMult);
      if(TRAINING_EXCL[trainingLevel]){
        const kept = finalEntries.filter(([v])=>!TRAINING_EXCL[trainingLevel].includes(v));
        if(kept.length) finalEntries = kept;
      }
      return weighted(finalEntries);
    })();
    const weight = calcWeight(height, bodyType) + Math.round(trainingWeightAdj(trainingLevel) * Math.pow(height/100, 2));
    const ageAppearance = base.ageAppearance || ageAppearanceByAge(age);
    const ethnicFace = faceByEthnicity(ethnicity);
    const pickFace = () => {
      let entries = eraAdjustEntries(profile ? profile.facePresets.map(([v,w])=>[v,w]) : pools.facePresets.map(v=>[v, v==='普通顔'?5:2]), era, 'faces', 'excludeFaces', eraMult);
      if(occFaceW && !identityVibe){ occFaceW.forEach(([v,w])=>{ const ww = w*2; const f = entries.find(x=>x[0]===v); if(f) f[1]+=ww; else entries.push([v,ww]); }); }
      if(gapMode && !identityVibe){ pools.facePresets.forEach(v=>{ const f = entries.find(x=>x[0]===v); if(f) f[1]+=1; else entries.push([v,1]); }); }
      if(age >= 55){ entries = entries.filter(([v])=>!['やりらふぃー系','韓国アイドル風','平成アイドル風','親しみやすい大学生系'].includes(v)); [['おじさん系',4],['落ち着いた大人系',4],['昭和顔（濃い顔立ち）',2]].forEach(([v,w])=>{ const f = entries.find(x=>x[0]===v); if(f) f[1]+=w; else entries.push([v,w]); }); }
      return weighted(entries);
    };
    let rawFacePreset = fixed.facePreset || base.facePreset || pickFace();
    if(groupCtx?.avoidFaces?.length && !fixed.facePreset && !base.facePreset){
      for(let i=0;i<3 && groupCtx.avoidFaces.includes(rawFacePreset);i++) rawFacePreset = pickFace();
    }
    const facePreset = chooseFaceAgeCompatible(rawFacePreset, ageAppearance, vibe, age);
    const pickOutfitType = (useOcc) => {
      let entries = [];
      const add = (v,w) => { if(!pools.outfitTypes.includes(v)) return; const f = entries.find(e=>e[0]===v); if(f) f[1]+=w; else entries.push([v,w]); };
      if(profile) profile.outfits.forEach(([v,w])=>add(v, useOcc ? w : w*2));
      mbtiProfile(mbti).outfits.forEach(([v,w])=>add(v, useOcc ? w : w*2));
      if(useOcc && occOutfitW) occOutfitW.forEach(([v,w])=>add(v, w*3));
      if(useOcc){
        const block = occOutfitBlocklist(role);
        const filtered = entries.filter(([v])=>!block.includes(v));
        if(filtered.length) entries = filtered;
        else return (occOutfitW && occOutfitW[0] && occOutfitW[0][0]) || '社会人カジュアル';
      }
      const ep = eraProfile(eraYear);
      (ep.outfits || []).forEach(([v,w])=>add(v, w*2));
      if(Number(eraYear) < 1946){
        const allow = (ep.outfits || []).map(([v])=>v);
        const kept = entries.filter(([v])=>allow.includes(v));
        entries = kept.length ? kept : (ep.outfits || []).map(([v,w])=>[v,w]);
      }
      if(!entries.length) return chooseOutfitByMbti(age, rareMode, vibe, mbti);
      return weighted(entries);
    };
    let outfitType = fixed.outfitType || base.outfitType || pickOutfitType(true);
    if(occFull && (UNIFORM_WORKWEAR[role] || UNIFORM_VARIANTS[role]) && !fixed.outfitType && !base.outfitType) outfitType = '職業制服';
    let holidayOutfitType = base.holidayOutfitType || pickOutfitType(false);
    if(holidayOutfitType === outfitType){ const retry = pickOutfitType(false); if(retry !== outfitType) holidayOutfitType = retry; }
    let holidayGapSuit = base.holidayGapSuit || false;
    if(!base.holidayOutfitType){
      const HOLIDAY_BAN = ['紺スーツ','黒スーツ','グレースーツ','三つ揃いスーツ','学生服（学ラン）','学生服（ブレザー）'];
      if(HOLIDAY_BAN.includes(holidayOutfitType)){
        if(/スーツ/.test(holidayOutfitType) && Math.random() < 0.03){ holidayGapSuit = true; }
        else holidayOutfitType = Math.random() < 0.6 ? 'きれいめカジュアル' : 'ジャケットスタイル';
      }
    }
    const STYLE_SINCE = {'スキンフェード':2016,'ローフェード':2016,'フェード×ツイストスパイラル':2019,'バーバースタイル（七三フェード）':2015,'クロップスタイル':2018,'マッシュウルフ':2020,'ソフトモヒカン':2003,'アシメショート':2008};
    const pickHair = () => {
      let entries = eraAdjustEntries(profile ? profile.hairStyles.map(([v,w])=>[v,w]) : pools.hairStyles.map(v=>[v,1]), era, 'hairStyles', 'excludeHair');
      const y = Number(eraYear) || 2026;
      [['スキンフェード',2],['ローフェード',1.5],['バーバースタイル（七三フェード）',1],['クロップスタイル',1],['フェード×ツイストスパイラル',1.5],['マッシュウルフ',1.5],['ソフトモヒカン',1],['アシメショート',1]].forEach(([v,w])=>{
        if(y >= (STYLE_SINCE[v] || 0)){ const f = entries.find(x=>x[0]===v); if(f) f[1]+=w; else entries.push([v,w]); }
      });
      const oh = (!gapMode && role) ? OCC_HAIRSTYLE[role] : null;
      if(oh){
        (oh.boost||[]).forEach(([v,w])=>{ if(STYLE_SINCE[v] && y < STYLE_SINCE[v]) return; const f = entries.find(x=>x[0]===v); if(f) f[1]+=w*2; else entries.push([v,w*2]); });
        if(oh.damp) entries = entries.map(([v,w])=>oh.damp.includes(v) ? [v, Math.max(0.1, w*0.2)] : [v,w]);
        if(oh.only){ const kept = entries.filter(([v])=>oh.only.includes(v)); if(kept.length) entries = kept; }
      }
      return weighted(entries);
    };
    let hairStyle = base.hairStyle || pickHair();
    if(groupCtx?.avoidHair?.length && !base.hairStyle){
      for(let i=0;i<3 && groupCtx.avoidHair.includes(hairStyle);i++) hairStyle = pickHair();
    }
    const hairColor = base.hairColor || (()=>{
      let entries = eraAdjustEntries(profile ? profile.hairColors.map(([v,w])=>[v,w]) : pools.hairColors.map(v=>[v,1]), era, 'hairColors', 'excludeHairColors');
      const merge = (arr) => arr && arr.forEach(([v,w])=>{ const f = entries.find(x=>x[0]===v); if(f) f[1]+=w; else entries.push([v,w]); });
      const ew = (ETHNIC_HAIR_WEIGHTS[ethnicity] || ETHNIC_HAIR_WEIGHTS['日本人']).map(([v,w])=>[v, identityVibe ? Math.max(1, Math.round(w/2)) : w]);
      merge(ew);
      const ASIAN_FOR_OCC = ['日本人','韓国系','中国系','東アジア系','東南アジア系','中央アジア系','ミックス'];
      if(!(STRICT_HAIR_OCC.includes(role) && !ASIAN_FOR_OCC.includes(ethnicity))) merge(occHairW);
      if(ethnicity === '白人系' || ethnicity === '北欧系'){ const BF = ['黒','ブルーブラック','ネイビーブラック','黒に近いダークブラウン']; entries = entries.map(([v,w])=>BF.includes(v) ? [v, Math.max(0.4, w*0.3)] : [v,w]); }
      if(ethnicity === 'スラブ系'){ const BF = ['黒','ブルーブラック','ネイビーブラック']; entries = entries.map(([v,w])=>BF.includes(v) ? [v, Math.max(0.4, w*0.35)] : [v,w]); }
      const ASIAN_ETH = ['日本人','韓国系','中国系','東アジア系','東南アジア系','中央アジア系','ミックス'];
      const DYE_COLORS = ['金髪（ブリーチ）','ブリーチベージュ','ミルクティーベージュ','ハイトーンアッシュ','シルバーアッシュ','オリーブアッシュ','ブルージュ','ラベンダーグレージュ','メッシュ入りブラック','インナーカラー（アッシュ）','プリン気味の伸びた茶髪','グレージュ','オレンジブラウン'];
      const eraExAll = era.excludeHairColors || [];
      const eraExHair = ASIAN_ETH.includes(ethnicity) ? eraExAll : eraExAll.filter(v=>DYE_COLORS.includes(v));
      if(eraExHair.length){ const kept = entries.filter(([v])=>!eraExHair.includes(v)); if(kept.length) entries = kept; }
      const GRAY = ['白髪まじり','ロマンスグレー','ごま塩頭','ほぼ白髪'];
      if(age < 40){ entries = entries.filter(([v])=>!GRAY.includes(v)); }
      else if(age < 50){ entries = entries.filter(([v])=>v!=='ごま塩頭' && v!=='ほぼ白髪'); merge([['白髪まじり',2]]); }
      else if(age < 60){ entries = entries.filter(([v])=>v!=='ほぼ白髪'); merge([['白髪まじり',3],['ロマンスグレー',3],['ごま塩頭',1]]); }
      else if(age < 70){ merge([['ロマンスグレー',4],['ごま塩頭',4],['白髪まじり',3],['ほぼ白髪',1]]); entries = entries.map(([v,w])=>GRAY.includes(v)?[v,w]:[v,Math.max(0.5, w*0.45)]); }
      else { merge([['ごま塩頭',8],['ほぼ白髪',8],['ロマンスグレー',5],['白髪まじり',2]]); entries = entries.map(([v,w])=>GRAY.includes(v)?[v,w]:[v,Math.max(0.25, w*0.15)]); }
      return weighted(entries);
    })();
    const bodyHair = generateBodyHair(age, ethnicity, vibe, mbti, eraYear);
    const coord = generateCoordinatedOutfit(outfitType, age, rareMode, nationality, vibe, eraYear, season, mbti);
    const hCoord = generateCoordinatedOutfit(holidayOutfitType, age, rareMode, nationality, vibe, eraYear, season, mbti);
    const uniform = occFull ? (chooseUniformVariant(role, season) || UNIFORM_WORKWEAR[role]) : null;
    if(uniform && !fixed.outfitType && !base.outfitType){
      coord.outfitBrand = '支給品・制服';
      coord.jacket = (uniform[8] && season === '冬') ? uniform[8] : 'なし';
      coord.top = uniform[2];
      coord.bottom = uniform[3];
      coord.shoes = uniform[4];
      coord.headwear = uniform[7] || '';
    }
    const PREWAR_COORD = {
      '書生風スタイル（着物＋袴＋学帽）':{jacket:'なし', top:'絣の着物', bottom:'袴', shoes:'下駄'},
      '着物と羽織':{jacket:'羽織', top:'無地の着物', bottom:'着物の裾', shoes:'草履'},
      '国民服風':{jacket:'なし', top:'国民服の上衣', bottom:'国民服のズボン', shoes:'編上げ靴'}
    };
    const applyPrewar = (co, type) => {
      const p = PREWAR_COORD[type];
      if(!p) return;
      co.outfitBrand = '仕立て・既製品'; co.jacket = p.jacket; co.top = p.top; co.bottom = p.bottom; co.shoes = p.shoes;
      co.sockBrand = '仕立て'; co.sockType = '足袋'; co.sockShape = '足袋型'; co.sockMaterial = '綿'; co.sockColor = '白';
    };
    applyPrewar(coord, outfitType);
    applyPrewar(hCoord, holidayOutfitType);
    if(Number(eraYear) < 1950){
      if(!PREWAR_COORD[outfitType] && !uniform) coord.outfitBrand = '仕立て・既製品';
      if(!PREWAR_COORD[holidayOutfitType]) hCoord.outfitBrand = '仕立て・既製品';
    }
    const eraUw = (initial.mainWearMode === '時代に合った下着の種類') ? generateEraUnderwear(eraYear) : null;
    const c = {
      id: uniqId(),
      name: base.name || nameByNationality(nationality, eraYear, age),
      age, eraYear, nationality, ethnicity, vibe, mbti, role,
      heightRaw: height,
      height: `${height}cm`, weight: `${weight}kg`, bodyType,
      footSize: base.footSize || footFromHeight(height, ethnicity),
      measurementA: base.measurementA ?? drawProfileMeasurement('A'),
      measurementB: base.measurementB ?? null, // Aから導出（ensureProfileMeasurementsで B = A×1.57＋0〜1）
      measurementC: base.measurementC || drawProfileMeasurement('C'),
      footShape: base.footShape || pick(pools.footShapes),
      facePreset,
      ageAppearance,
      faceLine: base.faceLine || (()=>{ let v = pick(pools.faceLines); if(groupCtx?.avoidFaceLines?.length){ for(let i=0;i<3 && groupCtx.avoidFaceLines.includes(v);i++) v = pick(pools.faceLines); } return v; })(),
      eyes: base.eyes || (()=>{ let v = ethnicFace.eyes || pick(pools.eyes); if(groupCtx?.avoidEyes?.length){ for(let i=0;i<3 && groupCtx.avoidEyes.includes(v);i++) v = pick(pools.eyes); } return v; })(), tearBags: base.tearBags || fixed.tearBags || pick(pools.tearBags), eyebrow: base.eyebrow || fixed.eyebrow || chooseEyebrow(vibe), eyelid: base.eyelid || fixed.eyelid || chooseEyelid(nationality, ethnicity), eyeShape: base.eyeShape || fixed.eyeShape || chooseEyeShape(), eyelash: base.eyelash || fixed.eyelash || chooseEyelash(), nose: base.nose || (()=>{ const v = pick(pools.nose); const pref = {'白人系':'高い鼻筋の通った鼻','北欧系':'高い鼻筋の通った鼻','スラブ系':'高い鼻筋の通った鼻','黒人系':'小鼻のしっかりした存在感のある鼻','中東系':'高い鼻筋の通った鼻'}[ethnicity]; return (pref && pools.nose.includes(pref) && Math.random()<0.4) ? pref : v; })(), mouth: base.mouth || pick(pools.mouth), lips: base.lips || fixed.lips || weighted([[pools.lips[0],2],[pools.lips[1],3],[pools.lips[2],6],[pools.lips[3],3],[pools.lips[4],2],[pools.lips[5],2.5],[pools.lips[6],2],[pools.lips[7],2]]), mouthPos: base.mouthPos || fixed.mouthPos || weighted([[pools.mouthPos[0],6],[pools.mouthPos[1],2.5],[pools.mouthPos[2],2.5],[pools.mouthPos[3],2],[pools.mouthPos[4],2],[pools.mouthPos[5],1.5]]), faceSpacing: base.faceSpacing || fixed.faceSpacing || chooseFaceSpacing(vibe), faceRatio: base.faceRatio || fixed.faceRatio || weighted([[pools.faceRatios[0],6],[pools.faceRatios[1],3],[pools.faceRatios[2],2.5],[pools.faceRatios[3],2],[pools.faceRatios[4],2],[pools.faceRatios[5],2],[pools.faceRatios[6],1.5],[pools.faceRatios[7],1.5]]), faceAsym: base.faceAsym || fixed.faceAsym || weighted([[pools.faceAsyms[0],3],[pools.faceAsyms[1],6],[pools.faceAsyms[2],5],[pools.faceAsyms[3],2],[pools.faceAsyms[4],2],[pools.faceAsyms[5],2],[pools.faceAsyms[6],1],[pools.faceAsyms[7],1],[pools.faceAsyms[8],1]]), skin: base.skin || chooseSkin(role, season, sportName, sportsHistoryArr, ethnicFace.skin), skinDetail: sd1, skinDetail2: sd2, facialHair: base.facialHair || chooseFacialHair(age, vibe),
      hairStyle, hairColor,
      bodyHairOverall: base.bodyHairOverall || bodyHair.bodyHairOverall,
      chestHair: base.chestHair || bodyHair.chestHair,
      abdominalHair: base.abdominalHair || bodyHair.abdominalHair,
      lowerAbdomenHair: base.lowerAbdomenHair || bodyHair.lowerAbdomenHair,
      armHair: base.armHair || bodyHair.armHair,
      shinHair: base.shinHair || bodyHair.shinHair,
      thighHair: base.thighHair || bodyHair.thighHair,
      armpitHair: base.armpitHair || bodyHair.armpitHair,
      handFingerHair: base.handFingerHair || bodyHair.handFingerHair,
      footToeHair: base.footToeHair || bodyHair.footToeHair,
      backHair: base.backHair || bodyHair.backHair,
      outfitType, outfitBrand: base.outfitBrand || coord.outfitBrand, jacket: base.jacket || coord.jacket, top: base.top || coord.top, bottom: base.bottom || coord.bottom,
      boxerBrand: base.boxerBrand || pick(eraBrandList(pools.boxerBrands, eraYear, '指定しない')), boxerColor: base.boxerColor || pick(pools.boxerColors), baseWearType: base.baseWearType || fixed.baseWearType || weighted([['ボクサーパンツ',6],['ショートショーツ',2],['スポーツスパッツ',2]]), bangs: base.bangs || weighted(pools.bangs.map((v,i)=>[v, i===0?8:1.2])), hairFinish: base.hairFinish || weighted(pools.hairFinishes.map((v,i)=>[v, i===0?7:1.2])), hairVolume: base.hairVolume || weighted(pools.hairVolumes.map((v,i)=>[v, i===0?7:1.5])), bodyAsym: base.bodyAsym || weighted(BODY_ASYMS), posture: base.posture || (()=>{ let e = POSTURES.map(x=>x.slice()); if(age >= 55) e = e.map(([v,w])=>[v, v==='やや猫背気味'? w*2.2 : v==='背筋の伸びた立ち姿'? w*0.7 : w]); return weighted(e); })(),
      glasses: base.glasses || chooseGlasses(eraYear, vibe, role, age),
      holidayOutfitType, holidayGapSuit, holidayOutfitBrand: hCoord.outfitBrand, holidayJacket: hCoord.jacket, holidayTop: hCoord.top, holidayBottom: hCoord.bottom, holidayShoes: hCoord.shoes, holidaySockBrand: hCoord.sockBrand, holidaySockType: hCoord.sockType, holidaySockColor: hCoord.sockColor, holidaySockUse: hCoord.sockUse,
      accessories: base.accessories || generateAccessories({eraYear, age, role, vibe, incomeText: base.incomeText, season, outfitType, sportsHistory: sportsHistoryArr}, false),
      holidayAccessories: base.holidayAccessories || generateAccessories({eraYear, age, role, vibe, incomeText: base.incomeText, season, holidayOutfitType, sportsHistory: sportsHistoryArr, holidayShoes: hCoord.shoes, holidayBottom: hCoord.bottom}, true),
      facePresetOut: base.facePresetOut || (initial.facePresetOut || '含める'),
      snapMode: base.snapMode || (initial.snapMode || '通常（スタジオ演出）'),
      smileEyes: base.smileEyes || null, smileStyle: base.smileStyle || null, cheekSmile: base.cheekSmile || null, mouthCorner: base.mouthCorner || null,
      topBrand: coord.topBrand||'', bottomBrand: coord.bottomBrand||'', shoesBrand: coord.shoesBrand||'', outerBrand: coord.outerBrand||'', tie: coord.tie||'', coat: coord.coat||'', suitSilhouette: coord.silhouette||'', eraFashionNote: coord.eraNote||'', styleNote: coord.styleNote||'',
      holidayTopBrand: hCoord.topBrand||'', holidayBottomBrand: hCoord.bottomBrand||'', holidayShoesBrand: hCoord.shoesBrand||'', holidayOuterBrand: hCoord.outerBrand||'', holidayEraFashionNote: hCoord.eraNote||'', holidayStyleNote: hCoord.styleNote||'',
      occupationMode, occInfluence, holidayPersona, sportName, sportsHistory: sportsHistoryArr, trainingLevel, season, avgHeightBase: heightAvgBase, workUniform: (uniform && !fixed.outfitType && !base.outfitType) ? uniform[0] : '', workUniformEn: (uniform && !fixed.outfitType && !base.outfitType) ? uniform[1] : '', headwear: (uniform && !fixed.outfitType && !base.outfitType) ? (uniform[7] || '') : '', headwearOn: base.headwearOn !== undefined ? base.headwearOn : true, derivedMode: initial.derivedMode || '参照画像前提（簡潔版）', ikemenIndexMode: initial.ikemenIndexMode || '表示しない', bodyHairMode: initial.bodyHairMode || '詳細指定', catchphraseMode: initial.catchphraseMode || '結果画面のみ表示',
      mainWearMode: initial.mainWearMode || 'ボクサーパンツのみ', underwearType: base.underwearType || (eraUw ? eraUw.type : ''), underwearColor: base.underwearColor || (eraUw ? eraUw.color : ''),
      shoes: base.shoes || coord.shoes, sockBrand: base.sockBrand || coord.sockBrand, sockType: base.sockType || coord.sockType, sockShape: base.sockShape || coord.sockShape, sockMaterial: base.sockMaterial || coord.sockMaterial, sockColor: base.sockColor || coord.sockColor, sockUse: base.sockUse || coord.sockUse,
      personality: mbtiDescription(mbti, false),
      background: initial.background, lighting: initial.lighting, quality: initial.quality, outputType: initial.outputType, count: initial.count,
      promptLanguage: initial.promptLanguage || '日本語', promptTarget: initial.promptTarget || 'ChatGPT', captionMode: initial.captionMode || '表記する', bioCaptionMode: base.bioCaptionMode || initial.bioCaptionMode || '入れない', promptDetail: initial.promptDetail || '自動（生成先に合わせる）', captionFields: initial.captionFields || {name:true,era:true,height:true,weight:true,footSize:true,mbti:true},
      cardStyle: initial.cardStyle || 'スタンダード', cardRarity: initial.cardRarity || 'おすすめ自動', cardTheme: initial.cardTheme || 'ネイビー', cardLayout: initial.cardLayout || '縦長カード', cardWearMode: initial.cardWearMode || 'ボクサーパンツのみ', cardEffect: initial.cardEffect || 'なし', cardFields: initial.cardFields || {name:true,age:true,era:true,height:true,weight:true,footSize:true,role:true,mbti:true,rarity:true},
      sceneIdea: buildEncounterScene({role, outfitType, vibe, nationality, ethnicity, mbti, eraYear, season, occInfluence, occupationMode}),
      createdAt: new Date().toISOString()
    };
    if(partialMode==='face' && ST.current){ Object.assign(c, ST.current, {id:uniqId(), nationality:c.nationality, ethnicity:c.ethnicity, vibe:c.vibe, name:nameByNationality(c.nationality, c.eraYear, c.age), role:c.role, mbti:c.mbti, personality:mbtiDescription(c.mbti,false), facePreset:c.facePreset, ageAppearance:c.ageAppearance, faceLine:c.faceLine, eyes:c.eyes, tearBags:c.tearBags, nose:c.nose, mouth:c.mouth, lips:c.lips, mouthPos:c.mouthPos, faceSpacing:c.faceSpacing, faceRatio:c.faceRatio, faceAsym:c.faceAsym, skin:c.skin, facialHair:c.facialHair, hairStyle:c.hairStyle, hairColor:c.hairColor, sceneIdea:buildEncounterScene({role:c.role, outfitType:ST.current.outfitType, vibe:c.vibe, nationality:c.nationality, ethnicity:c.ethnicity, mbti:c.mbti, eraYear:c.eraYear, season:c.season, occInfluence:c.occInfluence, occupationMode:c.occupationMode}), createdAt:new Date().toISOString()}); }
    applyMuscleFashion(c);
    if(!c.smileEyes) Object.assign(c, chooseSmileTraits(c));
    if(partialMode==='outfit' && ST.current){ Object.assign(c, ST.current, {id:uniqId(), nationality:c.nationality, ethnicity:c.ethnicity, vibe:c.vibe, name:nameByNationality(c.nationality, c.eraYear, c.age), role:c.role, mbti:c.mbti, personality:mbtiDescription(c.mbti,false), outfitType:c.outfitType,outfitBrand:c.outfitBrand,jacket:c.jacket,top:c.top,bottom:c.bottom,holidayOutfitType:c.holidayOutfitType,holidayOutfitBrand:c.holidayOutfitBrand,holidayJacket:c.holidayJacket,holidayTop:c.holidayTop,holidayBottom:c.holidayBottom,holidayShoes:c.holidayShoes,holidaySockBrand:c.holidaySockBrand,holidaySockType:c.holidaySockType,holidaySockColor:c.holidaySockColor,holidaySockUse:c.holidaySockUse,boxerBrand:c.boxerBrand,boxerColor:c.boxerColor,mainWearMode:c.mainWearMode,underwearType:c.underwearType,underwearColor:c.underwearColor,shoes:c.shoes,sockBrand:c.sockBrand,sockType:c.sockType,sockShape:c.sockShape,sockMaterial:c.sockMaterial,sockColor:c.sockColor,sockUse:c.sockUse,sceneIdea:buildEncounterScene({role:c.role, outfitType:c.outfitType, vibe:c.vibe, nationality:c.nationality, ethnicity:c.ethnicity, mbti:c.mbti, eraYear:c.eraYear, season:c.season, occInfluence:c.occInfluence, occupationMode:c.occupationMode}), createdAt:new Date().toISOString()}); }
    if(!groupCtx) Object.keys(ST.locks).forEach(k=>{ if(ST.locks[k] && ST.current && ST.current[k]!==undefined) c[k]=ST.current[k]; });
    c.personality = mbtiDescription(c.mbti, false);
    c.bioText = base.bioText || buildBioHook(c);
    if(!c.cardRarity || c.cardRarity==='おすすめ自動' || c.cardRarity==='なし') c.cardRarity = suggestCardRarity(c);
    c.cardEffect = cardEffectByRarity(c.cardRarity);
    return c;
  }

  function slotValue(c,key){
    if(!c) return '？？？';
    if(key==='mbti') return mbtiDisplay(c);
    if(key==='sportsHistory') return sportsHistoryText(c, ST.uiLang==='zh' ? 'zh' : ST.uiLang==='en');
    return String(displayValue(key, c[key]) ?? '？？？');
  }

  function renderSlots(c, revealAll=true){
    slotDefs.forEach(([key,label])=>{
      const el = document.getElementById('slot-'+key); if(!el) return;
      el.classList.toggle('locked', !!ST.locks[key]);
      el.classList.toggle('done', !!c && revealAll);
      el.querySelector('.value').textContent = c ? slotValue(c,key) : '？？？';
      el.querySelector('.lock').textContent = ST.locks[key] ? T('locked') : T('lock');
    });
  }

  function randomPreview(key){
    const map = {age:pools.ages, mbti:pools.mbtis, glasses:pools.glasses, holidayOutfitType:pools.outfitTypes, bodyHairOverall:pools.bodyHairOverall, chestHair:pools.bodyHairLevels, abdominalHair:pools.bodyHairLevels, lowerAbdomenHair:pools.bodyHairLevels, armHair:pools.bodyHairLevels, shinHair:pools.bodyHairLevels, thighHair:pools.bodyHairLevels, armpitHair:pools.bodyHairLevels, handFingerHair:pools.bodyHairLevels, footToeHair:pools.bodyHairLevels, backHair:pools.bodyHairLevels, height:['168cm','172cm','175cm','181cm','188cm'], weight:['58kg','65kg','72kg','80kg'], footSize:['26cm','27.5cm','28.5cm','30cm']};
    const arr = map[key] || pools[key+'s'] || pools[key] || ['???','GUZEN','SLOT'];
    return String(displayValue(key, pick(arr)));
  }

  function mbtiFriendWeights(leaderMbti){
    const g = {guardian:['ISTJ','ISFJ','ESTJ','ESFJ'], analyst:['INTJ','INTP','ENTJ','ENTP'], social:['ESTP','ESFP','ENFP','ENFJ'], creative:['ISFP','INFP','ISTP','INFJ']};
    let w = {guardian:1, analyst:1, social:1, creative:1};
    if(g.guardian.includes(leaderMbti)) w = {guardian:3, social:2, analyst:1, creative:1};
    else if(g.analyst.includes(leaderMbti)) w = {analyst:3, creative:2, guardian:1, social:1};
    else if(g.social.includes(leaderMbti)) w = {social:3, guardian:2, creative:2, analyst:1};
    else w = {creative:3, social:2, analyst:2, guardian:1};
    const entries = [];
    Object.entries(g).forEach(([grp, types])=>types.forEach(t=>entries.push([t, w[grp]])));
    return entries;
  }

  function pickGroupSetting(age, eraYear){
    const y = Number(eraYear) || 2026;
    let list;
    if(age <= 22) list = ['同じ大学のサークル仲間','高校からの友人','バイト仲間','地元の幼なじみ'];
    else if(age <= 29) list = ['職場の同期','大学時代からの友人','バンド仲間','地元の幼なじみ', y >= 1995 ? 'ジム仲間' : 'スポーツ仲間'];
    else list = ['職場の仲間','学生時代からの友人','趣味仲間','地元の幼なじみ'];
    return pick(list);
  }

  function buildGroupCtx(leader, existing){
    return {
      ageCenter: Number(leader.age),
      nationality: leader.nationality,
      vibe: leader.vibe,
      mbtiWeights: mbtiFriendWeights(leader.mbti),
      avoidFaces: existing.map(m=>m.facePreset),
      avoidHair: existing.map(m=>m.hairStyle),
      avoidEyes: existing.map(m=>m.eyes),
      avoidFaceLines: existing.map(m=>m.faceLine)
    };
  }

  function assignPositions(members){
    const g = {guardian:['ISTJ','ISFJ','ESTJ','ESFJ'], analyst:['INTJ','INTP','ENTJ','ENTP'], social:['ESTP','ESFP','ENFP','ENFJ']};
    const posByGroup = m => g.guardian.includes(m.mbti) ? 'しっかり者' : g.analyst.includes(m.mbti) ? 'クール担当' : g.social.includes(m.mbti) ? 'ムードメーカー' : 'マイペース担当';
    const all = ['リーダー格','ムードメーカー','クール担当','しっかり者','いじられ役','マイペース担当'];
    const used = [];
    return members.map((m,i)=>{
      let p = i===0 ? (Math.random()<0.5 ? 'リーダー格' : posByGroup(m)) : posByGroup(m);
      if(used.includes(p)) p = pick(all.filter(x=>!used.includes(x)));
      used.push(p);
      return p;
    });
  }

  function groupSceneBySetting(setting, eraYear, english=false){
    const y = Number(eraYear) || 2026;
    const mapJa = {
      '同じ大学のサークル仲間':'放課後のキャンパスや学食前で談笑している場面',
      '高校からの友人':'カフェや街角で久しぶりに集まって話している場面',
      'バイト仲間':'バイト先の店の前で休憩中に集まっている場面',
      '地元の幼なじみ':'地元の駅前や商店街で集まっている場面',
      '職場の同期':'仕事終わりのオフィス街で並んで歩いている場面',
      '大学時代からの友人':'カフェや街角で久しぶりに集まって話している場面',
      'バンド仲間':'ライブハウス前やスタジオ帰りに機材を持って並ぶ場面',
      'スポーツ仲間':'練習帰りにスポーツ施設の前で並ぶ場面',
      'ジム仲間':'トレーニング帰りにジムの前で並ぶ場面',
      '職場の仲間':'仕事終わりのオフィス街で並んで歩いている場面',
      '学生時代からの友人':'カフェや街角で久しぶりに集まって話している場面',
      '趣味仲間':'趣味の店やイベント会場の近くで集まっている場面'
    };
    const mapEn = {
      '同じ大学のサークル仲間':'chatting together on campus or in front of the cafeteria after class',
      '高校からの友人':'catching up at a cafe or on a street corner',
      'バイト仲間':'gathering in front of their part-time workplace during a break',
      '地元の幼なじみ':'hanging out near their hometown station or shopping street',
      '職場の同期':'walking side by side through the office district after work',
      '大学時代からの友人':'catching up at a cafe or on a street corner',
      'バンド仲間':'lining up with their gear in front of a live house or after a studio session',
      'スポーツ仲間':'lining up in front of a sports facility after practice',
      'ジム仲間':'lining up in front of the gym after a workout',
      '職場の仲間':'walking side by side through the office district after work',
      '学生時代からの友人':'catching up at a cafe or on a street corner',
      '趣味仲間':'gathering near a hobby shop or event venue'
    };
    let sc = english ? (mapEn[setting] || 'spending time together naturally in the city') : (mapJa[setting] || '街中で自然に集まっている場面');
    if(!english && y < 2000) sc += '。街並みや小物も' + eraLabel(y) + '頃の時代感に合わせる';
    if(english && y < 2000) sc += `, with streetscape and props matching the look of around ${y}`;
    return sc;
  }

  function buildGroupPrompt(group, english=false){
    const ms = group.members;
    const lead = ms[0];
    const initial = {background: lead.background, lighting: lead.lighting, quality: lead.quality};
    const scene = groupSceneBySetting(group.setting, lead.eraYear, english);
    const memberBlock = (m,i) => {
      if(english){
        return `[Member ${i+1} (${displayValue('groupPosition', m.groupPosition) || m.groupPosition})] ${m.name}, ${m.age} years old, ${m.height}, ${m.bodyType}. Face type: ${m.facePreset}. Hair: ${m.hairColor} ${m.hairStyle}. Outfit: ${m.outfitBrand} ${m.outfitType} (top: ${m.top}, bottom: ${m.bottom}, shoes: ${m.shoes}).`;
      }
      return `【メンバー${i+1}（${m.groupPosition}）】${m.name}、${m.age}歳、身長${m.height}、${m.bodyType}。顔立ちは${m.facePreset}、髪は${m.hairColor}の${m.hairStyle}。服装は${m.outfitBrand}の${m.outfitType}（トップスは${m.top}、ボトムスは${m.bottom}、靴は${m.shoes}）。`;
    };
    if(english){
      return `Generate one group photo-style image of the following ${ms.length} adult men. All of them are adults aged 18 or older. Keep the image non-sexual, wholesome, and like a natural everyday snapshot of close friends.
Group setting: ${displayValue('groupSetting', group.setting) || group.setting}. Era setting: ${lead.eraYear || '2026'} CE. ${eraStyleNote(lead, true)}

${ms.map(memberBlock).join('\n')}

Scene: ${scene}. Background: ${initial.background}. Lighting: ${initial.lighting}. Visual quality/style: ${enQuality(initial.quality)}.
${buildGroupDistinctionBlock(ms, true)}
Fit all ${ms.length} members naturally into one frame, accurately expressing their height and build differences. Use natural standing positions, distances, and expressions that convey their friendship (e.g., relaxed spacing, casual poses, someone mid-laugh). Each member must remain clearly the same person as his individual profile.
Avoid: making anyone look underage, sexual expression, changing anyone into a different person, extreme body emphasis, or broken text.
${promptTargetGuide(lead, true)}`;
    }
    return `以下の${ms.length}人の成人男性を、1枚の集合写真風画像として生成してください。全員18歳以上の成人で、非性的で健全な、仲の良い友人同士の日常スナップとして描写する。
グループ設定：${group.setting}。時代設定は${eraLabel(lead.eraYear)}頃。${countryLine(lead, false)}${seasonLine(lead, false)}${eraStyleNote(lead, false)}

${ms.map(memberBlock).join('\n')}

場面：${scene}。背景は${initial.background}。光は${initial.lighting}。画質・質感は${initial.quality}。
${buildGroupDistinctionBlock(ms, false)}
全員が1つの画面に自然に収まり、身長差と体格差を正確に表現する。友人関係が伝わる自然な立ち位置・距離感・表情にする（気の抜けた立ち姿、笑っている途中の表情など）。各メンバーは個別プロフィールと同一人物として描く。
避けること：未成年に見える表現、性的表現、別人化、極端な身体強調、文字崩れ。
${promptTargetGuide(lead, false)}`;
  }

  function isCombinedGroup(){
    return !!(ST.currentGroup && ST.currentGroup.members.length > 1 && ST.currentGroup.promptMode === '1つの指示文にまとめて生成');
  }

  function groupMemberIntro(m, i, english){
    if(english) return `[Member ${i+1} (${displayValue('groupPosition', m.groupPosition) || m.groupPosition})] ${m.name}, ${m.age} years old, ${m.nationality} / ${m.ethnicity}. Face type: ${m.facePreset} (${m.ageAppearance}). Face line: ${m.faceLine}. Eyes: ${m.eyes} (tear bags: ${m.tearBags}). Nose: ${m.nose}. Mouth: ${m.mouth}. Skin: ${m.skin}. Hair: ${m.hairColor} ${m.hairStyle}. Facial hair: ${m.facialHair}. ${m.glasses && m.glasses!=='なし' ? `Wears ${displayValue('glasses', m.glasses)}. ` : ''}Height ${m.height}, weight ${m.weight}, body type ${bodyTypeDesc(m.bodyType, true)}, foot size ${m.footSize}, foot shape ${m.footShape}. Overall body hair: ${m.bodyHairOverall}.`;
    return `【メンバー${i+1}（${m.groupPosition}）】${m.name}、${m.age}歳、${m.nationality}・${m.ethnicity}。顔立ちは${m.facePreset}で年齢感は${m.ageAppearance}。フェイスラインは${m.faceLine}。目は${m.eyes}（涙袋は${m.tearBags}）。鼻は${m.nose}。口元は${m.mouth}。肌は${m.skin}。髪は${m.hairColor}の${m.hairStyle}。ひげは${m.facialHair}。${m.glasses && m.glasses!=='なし' ? `眼鏡は${m.glasses}。` : ''}身長${m.height}、体重${m.weight}、体型は${bodyTypeDesc(m.bodyType, false)}、足のサイズ${m.footSize}、足の形は${m.footShape}。体毛の全体傾向は${m.bodyHairOverall}。`;
  }

  function buildGroupDistinctionBlock(ms, english=false){
    const tag = m => english ? `${m.hairColor} ${m.hairStyle} × ${m.facePreset} × ${m.eyes}` : `${m.hairColor}の${m.hairStyle}×${m.facePreset}×${m.eyes}`;
    if(english) return `[How to tell the members apart] ${ms.map((m,i)=>`Member ${i+1} = ${tag(m)}`).join(' / ')}. These ${ms.length} men are clearly DIFFERENT individuals — never blend, average, or swap their facial features, hairstyles, or body types.`;
    return `【メンバーの見分け方】${ms.map((m,i)=>`メンバー${i+1}＝${tag(m)}`).join('／')}。この${ms.length}人は明確に別人であり、顔の特徴・髪型・体型を混ぜたり平均化したり入れ替えたりしない。`;
  }

  function buildGroupMainPrompt(group, english=false){
    const ms = group.members; const lead = ms[0]; const n = ms.length;
    if(english){
      return `Generate one image that naturally places the following ${n} adult men standing side by side, with everyone's full body visible. All of them are adults aged 18 or older. Keep the image non-sexual and wholesome, like a neutral body-reference sheet.
Era setting: ${lead.eraYear || '2026'} CE. ${eraStyleNote(lead, true)}

${ms.map((m,i)=>groupMemberIntro(m,i,true) + ` Main clothing: only ${underwearDesc(m, true)}.`).join('\n')}

${buildGroupDistinctionBlock(ms, true)}
${refSheetKind(lead.outputType) && !['poster','machiWork','machiOff','feet','magazine'].includes(refSheetKind(lead.outputType)) ? `Output format: ${lead.outputType}. Organize the sheet as a grid with one ROW per member and columns for each state/view, and include the mandatory full-body front view, full-body side view, and foot detail (foot front and sole views) for EVERY member.` : ''}
Shared rules: none of the members wear outerwear, tops, bottoms, shoes, or socks. Strictly keep each member's specified underwear type and shape — never turn trunks or briefs into tight boxer briefs, and never make trunks baggy or oversized. Keep the underwear depiction non-sexual with natural standing poses. Accurately express the height and build differences between members, and place each member's name in small readable text near him.
Background: ${lead.background}. Lighting: ${lead.lighting}. Visual quality/style: ${enQuality(lead.quality)}.
Avoid: making anyone look underage, sexual poses, emphasis on genitals, changing anyone into a different person, mixing up the members' features, or broken text.
${promptTargetGuide(lead, true)}`;
    }
    return `以下の${n}人の成人男性を、全員の全身が見えるように横並びで自然に配置した1枚の画像として生成してください。全員18歳以上の成人。非性的で、体型確認用の設定資料として健全に描写する。
時代設定は${eraLabel(lead.eraYear)}頃。${countryLine(lead, false)}${seasonLine(lead, false)}${eraStyleNote(lead, false)}

${ms.map((m,i)=>groupMemberIntro(m,i,false) + `基準服装は${underwearDesc(m, false)}のみ。`).join('\n')}

${buildGroupDistinctionBlock(ms, false)}
${refSheetKind(lead.outputType) && !['poster','machiWork','machiOff','feet','magazine'].includes(refSheetKind(lead.outputType)) ? `出力形式：${lead.outputType}。行をメンバー、列を各状態・ビューとしたグリッドで整理し、必須項目として全身の正面・全身の側面・足元詳細（足の正面と足裏）を全メンバー分含める。` : ''}
共通指示：全員、上着・トップス・ボトムス・靴・靴下は描かない。各メンバーに指定された下着の種類と形状を正確に守り、トランクスやブリーフをボクサーパンツ化しない。トランクスは密着させず、オーバーサイズにもしない。下着表現は非性的で、自然な立ち姿にする。メンバー間の身長差・体格差を正確に表現し、各メンバーの近くに名前を小さく読みやすく表記する。
背景は${lead.background}。光は${lead.lighting}。画質・質感は${lead.quality}。
避けること：未成年に見える表現、性的なポーズ、局部の強調、別人化、メンバー同士の特徴の混同、文字崩れ。
${promptTargetGuide(lead, false)}`;
  }

  function buildGroupOutfitPrompt(group, english=false, mode='weekday'){
    const ms = group.members; const lead = ms[0]; const n = ms.length;
    const f = (m,k,fb) => mode==='holiday' ? (m['holiday'+k] || m[fb]) : m[fb];
    const line = (m,i) => english
      ? `[Member ${i+1}] ${m.name}: ${f(m,'OutfitBrand','outfitBrand')} ${f(m,'OutfitType','outfitType')} — outerwear: ${f(m,'Jacket','jacket') || 'none'}, top: ${f(m,'Top','top')}, bottom: ${f(m,'Bottom','bottom')}, shoes: ${f(m,'Shoes','shoes')}, socks: ${f(m,'SockBrand','sockBrand')} ${f(m,'SockType','sockType')} (${f(m,'SockColor','sockColor')}).`
      : `【メンバー${i+1}】${m.name}：${f(m,'OutfitBrand','outfitBrand')}の${f(m,'OutfitType','outfitType')}。上着は${f(m,'Jacket','jacket') || 'なし'}、トップスは${f(m,'Top','top')}、ボトムスは${f(m,'Bottom','bottom')}、靴は${f(m,'Shoes','shoes')}、靴下は${f(m,'SockBrand','sockBrand')}の${f(m,'SockType','sockType')}（${f(m,'SockColor','sockColor')}）。`;
    if(english){
      return `Generate one image of the same ${n} adult men standing together, each wearing his ${mode==='holiday' ? 'casual' : 'work'} suggested outfit. Keep each member's face, body proportions, height impression, and hairstyle identical to his main profile. Group setting: ${displayValue('groupSetting', group.setting) || group.setting}. Era setting: ${lead.eraYear || '2026'} CE. ${eraStyleNote(lead, true)}

${ms.map(line).join('\n')}

${buildGroupDistinctionBlock(ms, true)}
Make each outfit internally coherent, and let the group look like real friends standing naturally together, expressing their height and build differences. Background: ${lead.background}. Lighting: ${lead.lighting}. Visual style: ${enQuality(lead.quality)}. Non-sexual fashion depiction.
${promptTargetGuide(lead, true)}`;
    }
    return `同じ${n}人の成人男性が、それぞれの${mode==='holiday' ? '私服' : '職業'}の提案服装を着て一緒に立っている1枚の画像として生成してください。各メンバーの顔立ち・体型・身長感・髪型はメイン設定と同一人物として維持する。グループ設定：${group.setting}。時代設定は${eraLabel(lead.eraYear)}頃。${countryLine(lead, false)}${seasonLine(lead, false)}${eraStyleNote(lead, false)}

${ms.map(line).join('\n')}

${buildGroupDistinctionBlock(ms, false)}
各メンバーのコーディネートは用途が一致した自然なものにし、友人同士が自然に並んでいる雰囲気で、身長差・体格差を正確に表現する。背景は${lead.background}。光は${lead.lighting}。質感は${lead.quality}。非性的なファッション描写にする。
${promptTargetGuide(lead, false)}`;
  }

  function buildGroupCardPrompt(group, english=false){
    const ms = group.members; const lead = ms[0]; const n = ms.length;
    const wear = english
      ? (lead.cardWearMode !== 'ボクサーパンツのみ' ? 'Each member wears his own suggested outfit.' : 'Each member wears only his own specified underwear; keep the depiction non-sexual and neutral like a body-reference character card, and strictly keep each specified underwear type and shape.')
      : (lead.cardWearMode !== 'ボクサーパンツのみ' ? '各メンバーはそれぞれの提案服装を着用する。' : '各メンバーはそれぞれ指定された下着のみを着用し、非性的で体型確認用のキャラクターカードとして自然に見せる。指定された下着の種類と形状を正確に守る。');
    const rarity = lead.cardRarity && lead.cardRarity !== 'おすすめ自動' ? lead.cardRarity : 'SR';
    if(english){
      return `Present the same ${n} adult men together on ONE original trading-card-style group card, without copying any existing official card design. Put the logo text "GuzenIkemenMakerCARD" clearly on the card as an original brand logo. Card style: ${displayValue('cardStyle', lead.cardStyle)}. Rarity label: ${rarity}. Color theme: ${displayValue('cardTheme', lead.cardTheme)}. Layout: ${displayValue('cardLayout', lead.cardLayout)}. Group setting: ${displayValue('groupSetting', group.setting) || group.setting}. ${wear}
${buildGroupDistinctionBlock(ms, true)}
Give each member a small readable info panel (name, height, MBTI, position in the group). Express the height and build differences accurately, use a memorable group-card composition, and keep everyone clearly the same person as his individual profile. All members are adults aged 18 or older; keep the card non-sexual.
${promptTargetGuide(lead, true)}`;
    }
    return `同じ${n}人の成人男性を、1枚のオリジナルトレーディングカード風グループカードとして構成してください。実在カードや公式カードの模倣ではなく、独自の架空グループカードとして仕上げる。カード内に「GuzenIkemenMakerCARD」のロゴ文字をオリジナルブランドロゴとしてはっきり入れる。カードスタイルは${lead.cardStyle}、レアリティ表示は${rarity}、配色テーマは${lead.cardTheme}、レイアウトは${lead.cardLayout}。グループ設定：${group.setting}。${wear}
${buildGroupDistinctionBlock(ms, false)}
各メンバーに小さな情報欄（名前・身長・MBTI・グループ内ポジション）を付ける。身長差・体格差を正確に表現し、グループカードとして見栄えのする構図にする。全員18歳以上の成人で、非性的に描く。
${promptTargetGuide(lead, false)}`;
  }

  function isRefMode(c){ return (c?.derivedMode || '参照画像前提（簡潔版）') !== '単体で完結（フル記述）'; }

  function refPrefix(c, english=false){
    if(!isRefMode(c)) return '';
    if(english) return `[REFERENCE IMAGE PROVIDED — IMPORTANT] Generate the EXACT same person as in the attached base reference card. His face, body proportions, height impression, hairstyle, hair color, skin, and foot shape must follow the reference image above all; if any text conflicts with the image, follow the image. Never turn him into a different person or average out his features. In any panel that shows underwear, keep the underwear type and shape exactly as in the reference image.\n[HOW TO USE THE REFERENCE] Learn ONLY the person's features (face, body, hair, skin, foot shape) from the reference image, then REDRAW him from scratch to fit this prompt's scene, lighting, and camera angle. Never produce a cut-and-paste composite look: his skin texture, lighting direction, cast shadows, color grading, and grain must fully match the environment, with no floating outlines or conflicting light sources — the result must read as one naturally captured image. Pose, expression, and gaze may be newly directed for the scene (keep his features intact).\n\n`;
    return `【参照画像あり・重要】添付した基準リファレンスカードの人物と完全に同一人物として生成する。顔立ち・体型・身長感・髪型・髪色・肌・足の形は参照画像を最優先とし、テキストと食い違う場合は参照画像に従う。別人化・特徴の平均化をしない。下着姿を含むパネルでは、下着の種類と形状も参照画像のとおり正確に維持する。\n【参照画像の使い方】参照画像からは人物の特徴（顔立ち・体型・髪・肌・足の形）だけを学び取り、この指示文の場面・光・画角に合わせて人物を一から描き直すこと。参照画像の切り抜きを貼り付けたような合成写真には絶対にしない。肌の質感・光の当たり方・影の落ち方・色味・ノイズ感を背景と完全に一致させ、輪郭の浮きや光源の矛盾のない、1枚として自然に撮影・描画された画像に仕上げる。ポーズ・表情・視線は場面に合わせて新しく付け直してよい（人物の特徴は維持する）。\n\n`;
  }

  function personSummary(c, english=false){
    if(english) return `Subject summary: ${c.name}, ${c.age} years old, ${c.height} / ${c.weight}, occupation: ${roleWithSport(c, true)}. All other physical details follow the attached base reference card.\n`;
    return `人物要約：${c.name}、${c.age}歳、身長${c.height}・体重${c.weight}、職業は${roleWithSport(c, false)}。その他の顔立ち・体型・髪などの詳細は添付の基準リファレンスカードに従う。\n`;
  }

  function usageNote(english=false){
    return english ? '\n* Use this prompt WITH the image generated from the base reference card attached.' : '\n※このプロンプトは、基準リファレンスカードで生成した画像を添付した状態で使用してください。';
  }

  function buildCardInstructionOnly(c, english=false){
    const rarity = c.cardRarity && c.cardRarity !== 'おすすめ自動' ? c.cardRarity : 'SR';
    if(english) return `Present him as ONE original trading-card-style image, without copying any existing official card design. Put the logo text "GuzenIkemenMakerCARD" clearly on the card as an original brand logo. Card style: ${displayValue('cardStyle', c.cardStyle)}. Rarity label: ${rarity} (${cardEffectByRarity(c.cardRarity || 'R')}). Color theme: ${displayValue('cardTheme', c.cardTheme)}. Layout: ${displayValue('cardLayout', c.cardLayout)}. ${cardWearDescription(c, true)} Add a small readable info panel (name, height, MBTI). Style the card's frame, typography, and print texture like printed goods from around ${c.eraYear || '2026'}. Keep the card tasteful and non-sexual.`;
    return `オリジナルトレーディングカード風の1枚として構成する。実在カードや公式カードの模倣ではなく、独自の架空カードとして仕上げる。カード内に「GuzenIkemenMakerCARD」のロゴ文字をオリジナルブランドロゴとしてはっきり入れる。カードスタイルは${c.cardStyle}、レアリティ表示は${rarity}（${cardEffectByRarity(c.cardRarity || 'R')}）、配色テーマは${c.cardTheme}、レイアウトは${c.cardLayout}。${cardWearDescription(c, false)}小さな情報欄（名前・身長・MBTI）を付ける。カードのデザイン様式（枠・書体・印刷質感）も${eraLabel(c.eraYear)}頃の印刷物風にする。品があり非性的なカードにする。`;
  }

  function currentDerivedType(){
    if(ST.derivedType) return ST.derivedType;
    const io = getInitial().outputType || '';
    if(io && !io.includes('16:9')) return io;
    return 'トレーディングカード';
  }

  function buildHandoffSheet(c, english=false){
    const fw = c.footWidth || calcFootWidth(c);
    if(english){
      return `[OUTPUT FORMAT] Create one 16:9 "handoff reference sheet". Panels: full body front / full body side / face front / face side / face front with teeth visible (an "eee" expression, mouth stretched wide sideways to show the upper and lower rows of teeth, dental-reference style — in every other panel teeth appear only as naturally visible when smiling) / bare feet front view / soles (shown by the person himself sitting and presenting his own feet toward the viewer — never as detached, disembodied soles) / an enlarged full-sole view (the same feet as the person panels, detailed enough that the skin ridges of the soles, creases, and arch contours are readable, always oriented toes-up, as a matter-of-fact non-sexual reference enlargement). Every panel must show exactly the same person.${soleDetailLine(c, true)}
[INFO PANEL] (clean readable typography; list ONLY these items) Name "${nameKana(c)}" / Photo year: ${c.eraYear || '2026'} / Born: ${(Number(c.eraYear)||2026)-(Number(c.age)||25)} (age ${c.age}) / Height ${c.height}, Weight ${c.weight} / Body type "${displayValue('bodyType', c.bodyType)}" / Physique guide "about ${headCount(c)} heads tall" / Foot size ${c.footSize} / Foot width "${fw}". Keep all text crisp and unbroken.
[PERSON] Photo year: ${c.eraYear || '2026'} CE. ${eraStyleNote(c, true)} ${c.age} years old, ${c.nationality}, ${c.ethnicity}. ${facePresetPhrase(c, true)} ${eyeAreaLine(c, true)} Nose: ${c.nose}. Base expression: ${c.mouth}.${smileLine(c,true)}${faceExtraLine(c, true)} Facial symmetry: ${displayValue('faceAsym', c.faceAsym || 'ほぼ対称（ごく自然な左右差）')}.${realismSpec(c, true)} ${teethLine(c, true)} Hair: ${c.hairColor} ${c.hairStyle}. Facial hair: ${c.facialHair}.
[PHYSIQUE] ${physiqueSpec(c, true, true)} Hip shape: ${displayValue('hipShape', c.hipShape || '標準的な丸みの臀部')} (a neutral body-reference note; never emphasized or staged).${muscleLine(c, true)}${trainingLine(c, true)}${bodyRealismLine(c, true)}
[FEET] Foot shape: ${c.footShape}; ${footWidthDesc(c, true)}.${footFeatureLine(c, true, true)} In the barefoot panels, render toes with correct counts and joints; show exactly one pair of soles belonging to him only.
[OUTFIT IN SHEET] Underwear (${underwearDesc(c, true)}) only, as a neutral body-reference presentation in the flat, matter-of-fact tone of clothing-catalog product photos — no sexual staging, emphasis, or posing. No outerwear, tops, bottoms, shoes, or socks.
[PURPOSE] This sheet is used to hand the character over to another chat or session as a reference image.
[PROHIBITED] Making him look underage, sexual poses, excessive body emphasis, emphasis on genitals or the hips, excessive sole/toe close-ups outside the dedicated enlargement panel, unnatural AI-looking skin, changing him into a different person, broken text, extra feet or duplicated soles.
${promptTargetGuide(c, true)}`;
    }
    return `【出力形式】16:9の「参考画像作成シート（引継ぎ用）」を1枚作成する。パネル構成：全身前面／全身側面／顔正面／顔側面／顔正面（歯が見える：「イー」と口を横に広げて上下の歯列を見せる、歯科の資料撮影風の即物的な表情。このパネル以外では歯は笑ったときに自然に見える範囲のみ）／裸足の正面／足裏（人物が座って自分の足裏をこちらへ見せる姿として描き、足裏だけが切り離されて描写された状態にしない）／足裏の全体拡大（人物パネルと同一の足。足裏の指紋＝皮膚の隆線やしわ、土踏まずの起伏が分かる精細さ。常につま先が上・かかとが下の向き。資料用の即物的で非性的な拡大）。全パネルを完全に同一人物として一致させる。${soleDetailLine(c, false)}
【情報欄】（読みやすい文字組で、次の項目のみ記載）氏名「${nameKana(c)}」／撮影年代：${eraLabel(c.eraYear)}／生年：${eraLabel((Number(c.eraYear)||2026)-(Number(c.age)||25))}（${c.age}歳）／身長${c.height}・体重${c.weight}／体型「${c.bodyType}」／体格の目安「約${headCount(c)}頭身」／足サイズ${c.footSize}／ワイズ「${fw}」${c.bioCaptionMode==='情報欄に入れる' ? `／ひとこと：「${c.bioText || bioLine(c, false)}」` : ''}。文字は崩さない。
【人物】撮影年代：${eraLabel(c.eraYear)}。${countryLine(c, false)}${eraStyleNote(c, false)}${c.age}歳、${c.nationality}、${c.ethnicity}。${sportsHistoryLine(c, false)}${facePresetPhrase(c)}${eyeAreaLine(c, false)}鼻は${c.nose}、基本表情は${c.mouth}。${smileLine(c,false)}${faceExtraLine(c, false)}左右差は${c.faceAsym || 'ほぼ対称（ごく自然な左右差）'}。${realismSpec(c, false)}${teethLine(c, false)}髪は${c.hairColor}の${c.hairStyle}。ひげは${c.facialHair}。
【体格】${physiqueSpec(c, false, true)}臀部は${c.hipShape || '標準的な丸みの臀部'}（体型確認のための中立的な記載であり、強調や演出はしない）。${muscleLine(c, false)}${trainingLine(c, false)}${bodyRealismLine(c, false)}
【足】足の形は${c.footShape}。${footWidthDesc(c, false)}。${footFeatureLine(c, false, true)}裸足パネルでは指の本数・関節を正確に描き、足裏は本人の1人分のみとする。
【服装】基準服装は${underwearDesc(c, false)}のみ。体型確認のための中立的な資料表現であり、衣料品カタログの商品写真と同じ即物的なトーンで描く。性的な演出・強調・ポーズは一切しない。上着・トップス・ボトムス・靴・靴下は描写しない。
【用途】このシートは、別チャット・別セッションへ人物を引き継ぐための参照画像として使う。
【禁止事項】未成年に見える表現、性的なポーズ、過度な身体強調、局部や臀部の強調、資料用拡大パネル以外での足裏・足指の過度な接写、AIっぽい肌、別人化、文字崩れ、本人以外の足や足裏の重複。
${promptTargetGuide(c, false)}`;
  }

  function buildDerivedPrompt(c, english=false){
    const dt = currentDerivedType();
    if(refSheetKind(dt) === 'handoff') return buildHandoffSheet(c, english);
    if(!isRefMode(c)){
      if(dt === 'トレーディングカード') return buildTradingCardPrompt(c);
      if(refSheetKind(dt) === 'profilesheet') return buildPrompt(Object.assign({}, c, {outputType: dt})) + '\n' + (refSheetInstruction(Object.assign({}, c, {outputType: dt}), english) || '');
      return buildPrompt(Object.assign({}, c, {outputType: dt}));
    }
    const c2 = Object.assign({}, c, {outputType: dt});
    let core;
    if(dt === 'トレーディングカード') core = buildCardInstructionOnly(c, english);
    else core = refSheetInstruction(c2, english) || (english ? `Create the output as: ${displayValue('outputType', dt) || dt}.` : `${dt}として構成する。`);
    const avoid = english
      ? 'Avoid: changing him into a different person, averaging his features, altering his body type or face from the reference image, broken text, or any sexual expression.'
      : '避けること：別人化、特徴の平均化、参照画像と異なる体型・顔立ちへの変更、文字崩れ、性的表現。';
    return `${refPrefix(c, english)}${personSummary(c, english)}${eraContextLine(c, english)}\n${core}\n${avoid}\n${promptTargetGuide(c, english)}${usageNote(english)}`;
  }

  function renderGroupUI(){
    const tabs = document.getElementById('memberTabs');
    const section = document.getElementById('groupSection');
    if(!tabs || !section) return;
    if(!ST.currentGroup || ST.currentGroup.members.length < 2){
      tabs.classList.add('hidden'); section.classList.add('hidden'); tabs.innerHTML=''; return;
    }
    tabs.classList.remove('hidden');
    if(isCombinedGroup()) section.classList.add('hidden'); else section.classList.remove('hidden');
    tabs.innerHTML = ST.currentGroup.members.map((m,i)=>`<button class="btn ${i===ST.activeMember?'primary':'dark'}" data-member="${i}">👤${i+1} ${(m.name||'').split(' ')[0]}｜${displayValue('groupPosition', m.groupPosition) || m.groupPosition}</button>`).join('');
    tabs.querySelectorAll('[data-member]').forEach(b=>b.onclick=()=>{ ST.activeMember=Number(b.dataset.member); ST.current=ST.currentGroup.members[ST.activeMember]; renderAll(); });
    const box = document.getElementById('groupPromptBox');
    if(box) box.value = buildGroupPrompt(ST.currentGroup, isEnglish(ST.currentGroup.members[0]));
    const t = document.getElementById('groupPromptTitle'); if(t) t.textContent = T('groupPromptTitle');
    const cb = document.getElementById('copyGroupBtn'); if(cb) cb.textContent = T('copyGroupBtn');
  }

  function rangeOpts(min, max, step, suffix){
    const out = [];
    for(let v=min; v<=max+1e-9; v+=step){ const s = (step<1 ? v.toFixed(1).replace('.0','') : String(Math.round(v))); out.push(s+suffix); }
    return out;
  }

  function nameCandidates(){
    const out = [];
    for(let i=0;i<12;i++) out.push(nameByNationality(ST.current?.nationality || '日本', ST.current?.eraYear, ST.current?.age));
    return [...new Set(out)];
  }

  function slotEditPool(key){
    if(key==='name') return nameCandidates();
    if(ST.current){
      if(key === 'hairStyle') {
        // pools.hairStyles is occupation-agnostic, so a style only the occupation
        // grants (坊主 for 自衛官) became unreachable once you switched away from it.
        // Offer the occupation's own styles first, then the generic pool.
        const oh = ST.current.role ? OCC_HAIRSTYLE[ST.current.role] : null;
        if (!oh) return pools.hairStyles;
        const own = oh.only || (oh.boost || []).map(([v]) => v);
        return [...new Set([...own, ...pools.hairStyles])];
      }
      if(key==='jacket') return eraOptionsFor('jacket', ST.current, false);
      if(key==='top') return eraOptionsFor('top', ST.current, false);
      if(key==='bottom') return eraOptionsFor('bottom', ST.current, false);
      if(key==='shoes') return eraOptionsFor('shoes', ST.current, false);
      if(key==='holidayJacket') return eraOptionsFor('jacket', ST.current, true);
      if(key==='holidayTop') return eraOptionsFor('top', ST.current, true);
      if(key==='holidayBottom') return eraOptionsFor('bottom', ST.current, true);
      if(key==='holidayShoes') return eraOptionsFor('shoes', ST.current, true);
      if(key==='tie') return eraOptionsFor('tie', ST.current, false);
      if(key==='suitSilhouette') return eraOptionsFor('sil', ST.current, false);
      if(key==='accessoriesEdit' || key==='holidayAccessoriesEdit') return ['なし','ビジネス腕時計','タフネス系デジタル腕時計','スマートウォッチ','機械式の高級腕時計','シンプルな腕時計','革ベルトの腕時計','シルバーチェーンネックレス','華奢なシルバーネックレス','喜平ネックレス','片耳のシルバーピアス','両耳の小ぶりなピアス','左薬指に結婚指輪','ミサンガ','アンクレット'];
      if(key==='holidayStyleNote') return ['—','清潔感重視のベーシックな着こなし','柄物や差し色をその日の気分で','モノトーン中心・機能優先','柔らかい色味と肌ざわり重視','サイズ感が微妙に合っていない','古着ミックスの味のある風合い'];
      if(key==='facePresetOut') return ['含める','含めない'];
      if(key==='snapMode') return pools.snapModes;
      if(key==='smileEyes') return SMILE_EYES;
      if(key==='smileStyle') return SMILE_STYLES;
      if(key==='cheekSmile') return CHEEK_SMILES;
      if(key==='mouthCorner') return MOUTH_CORNERS;
    }
    if(key==='height') return rangeOpts(155, 196, 1, 'cm');
    if(key==='weight') return rangeOpts(45, 110, 1, 'kg');
    if(key==='footSize') return rangeOpts(25.5, 31.0, 0.5, 'cm');
    if(key==='jacket') return pools.jackets;
    if(key==='top') return pools.tops;
    if(key==='bottom') return pools.bottoms;
    if(key==='shoes') return pools.shoes;
    const map = {
      age: pools.ages.map(String), eraYear: pools.eraYears.map(String), mbti: pools.mbtis,
      nationality: pools.nationalities, ethnicity: pools.ethnicities, role: pools.roles,
      vibe: pools.vibes.filter(v=>v!=='ランダム'), bodyType: pools.bodyTypes, footShape: pools.footShapes,
      sportName: ['なし'].concat(SPORTS),
      facePreset: pools.facePresets, ageAppearance: pools.ageLooks, faceLine: pools.faceLines,
      eyes: pools.eyes, tearBags: pools.tearBags, nose: pools.nose, mouth: pools.mouth, lips: pools.lips, mouthPos: pools.mouthPos, faceSpacing: pools.faceSpacings, faceRatio: pools.faceRatios, faceAsym: pools.faceAsyms, footWidth: FOOT_WIDTHS.map(x=>x[0]), footFeature: FOOT_FEATURES.map(x=>x[0]), eyebrow: pools.eyebrows, eyebrowDensity: pools.eyebrowDensities, eyelid: pools.eyelids, eyeShape: pools.eyeShapes, eyelash: pools.eyelashes, jawChin: pools.jawChins, jawAngle: pools.jawAngles, ear: pools.ears, forehead: pools.foreheads, hairline: pools.hairlines, cheek: pools.cheeks, dimple: pools.dimples, mole: pools.moles, hairTexture: pools.hairTextures, eyeBags: pools.eyeBagsPool, adamsApple: pools.adamsApples, lipTone: pools.lipTones, browRidge: pools.browRidges, facialHairGroom: pools.facialHairGrooms, soleType: SOLE_TYPES.map(x=>x[0]), toeLine: TOE_LINES.map(x=>x[0]), soleWrinkle: SOLE_WRINKLES.map(x=>x[0]), toeCurl: TOE_CURLS.map(x=>x[0]), shoulderWidth: pools.shoulderWidths, waistPos: pools.waistPositions, legLength: pools.legLengths, armLength: pools.armLengths, frame: pools.frames, neckLength: pools.neckLengths, limbSize: pools.limbSizes, hipShape: pools.hipShapes, teethAlign: pools.teethAligns, teethColor: pools.teethColors, skin: pools.skin, skinDetail: pools.skinDetails, skinDetail2: pools.skinDetails,
      facialHair: pools.facialHair, glasses: pools.glasses, hairStyle: pools.hairStyles, hairColor: pools.hairColors,
      outfitType: pools.outfitTypes, holidayOutfitType: pools.outfitTypes, outfitBrand: pools.outfitBrands,
      trainingLevel: TRAINING_LEVELS.map(x=>x[0]), bangs: pools.bangs, hairFinish: pools.hairFinishes, hairVolume: pools.hairVolumes, baseWearType: pools.baseWearTypes, boxerColor: pools.boxerColors, boxerBrand: pools.boxerBrands, sockBrand: pools.sockBrands, sockType: pools.sockTypes,
      sockShape: pools.sockShapes, sockMaterial: pools.sockMaterials, sockColor: pools.sockColors, sockUse: pools.sockUse,
      bodyHairOverall: pools.bodyHairOverall
    };
    if(map[key]) return map[key];
    const innerPools = Object.assign({}, INNER_EDIT_POOLS(), INNER_EDIT_POOLS2());
    if(innerPools[key]) return innerPools[key];
    if(['chestHair','abdominalHair','lowerAbdomenHair','armHair','shinHair','thighHair','armpitHair','handFingerHair','footToeHair','backHair'].includes(key)) return pools.bodyHairLevels;
    return pools[key+'s'] || null;
  }

  function applySlotEdit(key, value){
    if(!ST.current) return;
    if(key==='accessoriesEdit'){ ST.current.accessories = value==='なし' ? [] : [value]; return; }
    if(key==='holidayAccessoriesEdit'){ ST.current.holidayAccessories = value==='なし' ? [] : [value]; return; }
    if(key==='holidayStyleNote'){ ST.current.holidayStyleNote = value==='—' ? '' : value; return; }
    ST.current[key] = value;
    if(ST.current.bloodType){
      if(key==='age') generateInnerProfile(ST.current, ['income','education','marital','birthdate']);
      if(key==='role') generateInnerProfile(ST.current, ['income','education']);
      if(key==='nationality') generateInnerProfile(ST.current, ['blood','birthplace','birthdate']);
      if(INNER_FIELD_GEN[key]){ const deps = INNER_DEPS[INNER_FIELD_GEN[key]]; if(deps && deps.length) generateInnerProfile(ST.current, deps.slice()); }
      if(key==='fashionSenseText') applyFashionSenseFx(ST.current);
      if(key==='maritalText') syncMarriageRing(ST.current);
    }
    if(['jacket','top','bottom','shoes'].includes(key)) partBrandRedraw(ST.current, key, false);
    if(['holidayJacket','holidayTop','holidayBottom','holidayShoes'].includes(key)) partBrandRedraw(ST.current, key.replace('holiday','').toLowerCase(), true);
    if(key==='mbti') ST.current.personality = mbtiDescription(value, ST.uiLang==='en');
    if(key==='footSize') ST.current.footSizeManual = true;
    if(key==='height'){
      ST.current.heightRaw = parseInt(value, 10) || ST.current.heightRaw;
      ST.current.weight = calcWeight(ST.current.heightRaw || parseInt(ST.current.height,10) || 175, ST.current.bodyType) + 'kg';
      if(!ST.current.footSizeManual) ST.current.footSize = footFromHeight(ST.current.heightRaw || 171, ST.current.ethnicity);
    }
    if(key==='bodyType'){
      const h = ST.current.heightRaw || parseInt(ST.current.height, 10) || 175;
      ST.current.weight = calcWeight(h, value) + 'kg';
    }
    renderAll();
  }

  function buildSportsHistoryEditor(container, onSave){
    const STR_PRESETS = [[LT('自動（期間から計算）', 'Auto (from span)', '自动（按期间计算）'),'auto'],[LT('影響なし', 'No influence', '无影响'),'0'],[LT('名残程度', 'Faint traces', '略有痕迹'),'0.5'],[LT('ほどよく', 'Moderate', '适中'),'1.2'],[LT('しっかり', 'Strong', '明显'),'2.2']];
    const maxSt = maxStageForAge(Number(ST.current.age)||25);
    const stages = SPORT_STAGES.slice(0, maxSt+1).map(s=>[displayValue('sportStage', s) || s, s]);
    const NONE = LT('なし', 'None', '无');
    const h = ST.current.sportsHistory || [];
    const mk = (opts, val)=>{ const sel=document.createElement('select'); sel.innerHTML=opts.map(o=>{const [lab,v]=Array.isArray(o)?o:[o,o];return `<option value="${v}"${String(v)===String(val)?' selected':''}>${lab}</option>`;}).join(''); return sel; };
    const rows = [];
    for(let i=0;i<2;i++){
      const e = h[i] || null;
      const sp = mk([[NONE,'なし']].concat(SPORT_EXP_POOL.map(n=>[displayValue('sportName', n) || n, n])), e ? e.name : 'なし');
      const fr = mk(stages, e ? SPORT_STAGES[e.from] : '小学校');
      const to = mk(stages, e ? SPORT_STAGES[e.to] : '高校');
      const st = mk(STR_PRESETS, e ? (e.strength===0?'0': e.strength>=2?'2.2': e.strength>=0.8?'1.2':'0.5') : 'auto');
      const lab = document.createElement('label'); lab.textContent = (LT('競技', 'Sport ', '竞技'))+(i+1);
      const row = document.createElement('div'); row.style.cssText='display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:4px';
      row.append(sp,fr,to,st); container.append(lab,row);
      rows.push({sp,fr,to,st});
    }
    const note = document.createElement('p'); note.className='notice'; note.style.margin='4px 0 0';
    note.textContent = LT('競技／開始／終了／体格への影響。確定済みの身長・体型は変わりません（記述側に反映）。', 'Order: sport / start / end / body influence. Height & body type stay as-is.', '顺序：竞技／开始／结束／对体格的影响。已确定的身高・体型不会改变。');
    container.append(note);
    return ()=>{
      const stIdx = v=>SPORT_STAGES.indexOf(v);
      const out = [];
      for(const r of rows){
        if(r.sp.value==='なし') continue;
        let from = stIdx(r.fr.value), to = stIdx(r.to.value);
        if(from > to){ const t=from; from=to; to=t; }
        to = Math.min(to, maxSt); from = Math.min(from, to);
        let strength;
        if(r.st.value==='auto'){ const gap=maxSt-to; const decay=gap<=0?1:gap===1?0.7:gap===2?0.5:0.35; strength=Math.round((to-from+1)*decay*0.85*100)/100; }
        else strength = Number(r.st.value);
        out.push({name:r.sp.value, from, to, strength});
      }
      if(out.length===2 && out[0].name===out[1].name) out.pop();
      ST.current.sportsHistory = out;
      onSave();
    };
  }

  function openSlotEditor(key){
    if(!ST.current || ST.spinning) return;
    const slotEl = document.getElementById('slot-'+key); if(!slotEl) return;
    const valEl = slotEl.querySelector('.value'); if(!valEl || slotEl.querySelector('.slot-editor')) return;
    if(key==='sportsHistory'){
      const wrap = document.createElement('div'); wrap.className='slot-editor';
      const save = buildSportsHistoryEditor(wrap, ()=>{ wrap.remove(); renderAll(); });
      const ok = document.createElement('button'); ok.className='pf-btn'; ok.textContent = LT('決定', 'Save', '确定'); ok.onclick=save;
      const ng = document.createElement('button'); ng.className='pf-btn'; ng.textContent = LT('キャンセル', 'Cancel', '取消'); ng.onclick=()=>wrap.remove();
      wrap.append(ok, ng); slotEl.append(wrap); return;
    }
    const cur = ST.current[key] !== undefined && ST.current[key] !== null ? String(ST.current[key]) : '';
    const pool = slotEditPool(key);
    const wrap = document.createElement('div');
    wrap.className = 'slot-editor';
    if(!pool || !pool.length) return;
    const sel = document.createElement('select');
    const opts = pool.map(String);
    if(cur && !opts.includes(cur)) opts.unshift(cur);
    if(key==='role') sel.innerHTML = occupationOptionsHTML(cur, false);
    else sel.innerHTML = opts.map(v=>`<option value="${String(v).replace(/"/g,'&quot;')}"${String(v)===cur?' selected':''}>${displayOptionLabel(key, v)}</option>`).join('');
    sel.onchange = () => applySlotEdit(key, sel.value);
    sel.onblur = () => renderAll();
    wrap.appendChild(sel);
    valEl.replaceChildren(wrap);
    sel.focus();
  }

  function renderFriendPanel(){
    const relSel = document.getElementById('friendRelation'); if(!relSel) return;
    const keep = relSel.value;
    relSel.innerHTML = Object.keys(FRIEND_RELATIONS).map(r=>`<option value="${r}">${ST.uiLang==='en' ? FRIEND_REL_EN[r] : ST.uiLang==='zh' ? (FRIEND_REL_ZH[r]||r) : r}</option>`).join('');
    if(keep && FRIEND_RELATIONS[keep]) relSel.value = keep;
    const rel = FRIEND_RELATIONS[relSel.value];
    const hierField = document.getElementById('friendHierField');
    const hierSel = document.getElementById('friendHierarchy');
    if(rel.hier){
      hierField.classList.remove('hidden');
      const keepH = hierSel.value;
      hierSel.innerHTML = rel.hier.map(h=>`<option value="${h}">${ST.uiLang==='en' ? FRIEND_HIER_EN[h] : ST.uiLang==='zh' ? (FRIEND_HIER_ZH[h]||h) : h}</option>`).join('');
      if(keepH && rel.hier.includes(keepH)) hierSel.value = keepH;
    } else {
      hierField.classList.add('hidden');
    }
  }

  function createFriend(opts){
    if(!ST.current || ST.spinning) return;
    const relName = document.getElementById('friendRelation').value;
    const rel = FRIEND_RELATIONS[relName]; if(!rel) return;
    const hierName = rel.hier ? document.getElementById('friendHierarchy').value : rel.fixedHier;
    const baseC = {...ST.current}; delete baseC.friendBase;
    const [dLo, dHi] = rel.delta || FRIEND_HIER_DELTA[hierName] || [0,0];
    const targetAge = (opts && opts.age) ? Number(opts.age) : Math.max(18, Math.min(80, Number(baseC.age) + rnd(dLo, dHi, 1)));
    ST.FRIEND_CTX = {
      age: String(targetAge),
      eraYear: String(baseC.eraYear || '2026'),
      season: baseC.season || '',
      nationality: Math.random() < 0.9 ? baseC.nationality : '',
      role: rel.sameRole ? baseC.role : ''
    };
    let f = null;
    for(let i=0;i<8;i++){ f = generateCharacter('full'); if(rel.sameRole || f.role !== baseC.role) break; }
    ST.FRIEND_CTX = null;
    if(opts && opts.name) f.name = opts.name;
    f.friendOf = {name: baseC.name, age: baseC.age, role: baseC.role, relation: relName, hierarchy: hierName};
    f.friendBase = baseC;
    const history = loadHistory(); history.unshift({...baseC, appVersion:'V3.2.2'});
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history.slice(0,50)));
    ST.currentGroup = null; ST.activeMember = 0;
    ST.current = f;
    document.getElementById('friendPanel').classList.add('hidden');
    renderAll(); switchTab('result');
    els.status.textContent = T('friendDone');
  }

  function rerollOne(key){
    if(!ST.current || ST.spinning) return;
    if(key==='sportsHistory'){ ST.current.sportsHistory = generateSportsHistory(ST.current.age, ST.current.role, ST.current.sportName, getInitial().sportsBodyInfluence); renderAll(); return; }
    const fresh = generateCharacter('full');
    const keys = DICE_GROUPS[key] || [key];
    keys.forEach(k=>{ if(fresh[k]!==undefined) ST.current[k]=fresh[k]; });
    if(keys.includes('mbti')) ST.current.personality = mbtiDescription(ST.current.mbti, false);
    renderAll();
  }

  async function spin(){
    if(ST.spinning) return; ST.spinning=true; els.status.textContent=T('spinning');
    const next = generateCharacter(ST.mode);
    for(const [key,label,cat] of slotDefs){
      const el = document.getElementById('slot-'+key); if(!el) continue;
      if(ST.locks[key] && ST.current){ el.querySelector('.value').textContent=slotValue(ST.current,key); continue; }
      if(ST.mode==='face' && !['face','hair'].includes(cat)) { el.querySelector('.value').textContent=slotValue(next,key); continue; }
      if(ST.mode==='outfit' && !['outfit','feet'].includes(cat)) { el.querySelector('.value').textContent=slotValue(next,key); continue; }
      if(document.getElementById('instantMode')?.checked){ el.classList.add('done'); el.querySelector('.value').textContent = slotValue(next,key); continue; }
      el.classList.add('spin');
      for(let i=0;i<8;i++){ el.querySelector('.value').textContent = randomPreview(key); await sleep(35); }
      el.classList.remove('spin'); el.classList.add('done'); el.querySelector('.value').textContent = slotValue(next,key); await sleep(80);
    }
    const gSize = Number(getInitial().groupSize || 1);
    if(ST.mode === 'full' && gSize > 1){
      const setting = pickGroupSetting(next.age, next.eraYear);
      const members = [next];
      const tooSimilar = (m, list) => list.some(o=>{ let n=0; ['facePreset','eyes','nose','faceLine','hairStyle'].forEach(k=>{ if(m[k]===o[k]) n++; }); return n>=3; });
      for(let i=1;i<gSize;i++){
        let mem = generateCharacter('full', buildGroupCtx(next, members));
        for(let r=0; r<2 && tooSimilar(mem, members); r++) mem = generateCharacter('full', buildGroupCtx(next, members));
        members.push(mem);
      }
      const positions = assignPositions(members);
      members.forEach((m,i)=>{ m.groupSetting=setting; m.groupPosition=positions[i]; m.groupIndex=i; m.groupSize=gSize; });
      ST.currentGroup = {members, setting, promptMode: getInitial().groupPromptMode || 'メンバーごとに別々の指示文'};
      ST.activeMember = 0;
    } else if(ST.mode === 'full'){
      ST.currentGroup = null; ST.activeMember = 0;
    } else if(ST.currentGroup){
      ST.currentGroup.members[ST.activeMember] = next;
    }
    ST.current = next; renderAll(); els.status.textContent=T('done'); ST.spinning=false; switchTab('result');
  }

  function isEnglish(c){ return (c?.promptLanguage || '日本語') === 'English'; }

  function enOutputType(v){
    if(!v) return 'a character image';
    const map = {
      '前面・側面を1枚にまとめた設定画像':'a reference sheet showing the front and side full-body views in one image',
      '前面・側面・背面を1枚にまとめた設定画像':'a reference sheet showing the front, side, and back full-body views in one image',
      '16:9のリファレンスカードとして、全身の前面・側面、顔の正面・側面、顔正面（歯が見える）、足の正面と側面と足裏（人物が座って自分の足裏をこちらへ見せる構図とし、足裏だけが切り離されて描写された状態にしない）を1枚に整理して表示する。':'a 16:9 reference card that organizes the full-body front and side views, face front and side views, a face-front-with-teeth-visible view, foot front view, foot side view, sole view, and sock details into one clean layout',
      'SNSプロフィール風画像':'an SNS profile-style image',
      '就活写真風画像':'a job-hunting photo-style image',
      'スポーツ選手紹介風画像':'an athlete-introduction-style image',
      'トレーディングカード風画像':'a trading-card-style image',
      'トレーディングカード風リファレンスカード':'a trading-card-style reference card',
      'レアカード風トレーディングカード画像':'a rare trading-card-style image',
      'シンプルな設定カード風画像':'a simple character card-style image'
    };
    return map[v] || v;
  }

  function enCount(v){
    const map = {'1枚':'1 image','2パターン別々の画像':'2 separate variations','3パターン別々の画像':'3 separate variations','4パターン別々の画像':'4 separate variations','5パターン別々の画像':'5 separate variations','10パターン別々の画像':'10 separate variations'};
    return map[v] || v;
  }

  function enQuality(v){
    const map = {'実写風':'photorealistic','高精細':'high-detail','スマホスナップ風':'smartphone snapshot style','イラスト風':'illustration style','アニメ風イラスト':'anime-style illustration','キャラクター設定画風':'character reference sheet style'};
    return map[v] || v;
  }

export {
  generateCharacter,
  slotValue,
  renderSlots,
  randomPreview,
  mbtiFriendWeights,
  pickGroupSetting,
  buildGroupCtx,
  assignPositions,
  groupSceneBySetting,
  buildGroupPrompt,
  isCombinedGroup,
  groupMemberIntro,
  buildGroupDistinctionBlock,
  buildGroupMainPrompt,
  buildGroupOutfitPrompt,
  buildGroupCardPrompt,
  isRefMode,
  refPrefix,
  personSummary,
  usageNote,
  buildCardInstructionOnly,
  currentDerivedType,
  buildHandoffSheet,
  buildDerivedPrompt,
  renderGroupUI,
  rangeOpts,
  nameCandidates,
  slotEditPool,
  applySlotEdit,
  buildSportsHistoryEditor,
  openSlotEditor,
  renderFriendPanel,
  createFriend,
  rerollOne,
  spin,
  isEnglish,
  enOutputType,
  enCount,
  enQuality,
};
