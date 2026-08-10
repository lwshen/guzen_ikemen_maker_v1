// character generation: names, era, outfit coordination, body, foot, prompt fragments
// Split from the verbatim V3.2.0 baseline (Phase 4 stage B) — bodies unchanged
// except top-level state rewritten to ST.* (see state.js).
import {
  HIGH_TRAIN,
  ACC_HI_PIERCE, ACC_NO_PIERCE, ACC_WORK_OFF, ATHLETIC_OCC, BODY_ASYM_EN, BRAND_SINCE, BRIDGE_HOOK, CULT_MEM,
  ERA_HOOK, FACE_EXTRA_DEFAULTS, FASHION_CASUAL_TAGS, FOOT_ANGLES, FOOT_COZY, FOOT_FABRICS, FOOT_FEATURES, FOOT_OCC_CAT_SCENES,
  FOOT_OCC_SCENES, FOOT_POSTURES, FOOT_PROPS, FOOT_SCENES, FOOT_SCENE_MIGRATION, FOOT_SHOE_STATES, FOOT_SOCK_STATES, FOOT_WIDTHS,
  FREE_HAIR_OCC, FVOCAB, MBTI_INTRO, NAMES_BY_YEAR, NATION_NAMES, OCCUPATIONS, OCC_CAT_HOOK, OCC_CAT_LABELS,
  OCC_CAT_ORDER, OCC_CAT_SCENES, OCC_HOOK, OCC_MBTI_CAT, OCC_SCENES, POSTER_FOOT, POSTURE_EN, SOLE_TYPES,
  SMILE_EYES, SMILE_STYLES, CHEEK_SMILES, MOUTH_CORNERS,
  SOLE_WRINKLES, SPORTS, SPORT_EXP_WEIGHTS, SPORT_MEM, SPORT_MUSCLE, SPORT_MUSCLE_ZH, SPORT_SKELETON, SPORT_STAGES_ZH, STRICT_HAIR_OCC, TOE_CURLS,
  TOE_LINES, TRAINING_DESC, TRAINING_LEVELS, TRAIN_HOOK, UNDERWEAR_COLOR_EN, UNIFORM_VARIANTS, VIBE_AGE_MAX, VIBE_OCC,
  pools, slotDefs, valueTranslations,
} from '../data/index.js';
import {
  ensureProfileMeasurements, pick, profileMeasurementCLabel, rnd, weighted,
} from './core.js';
import {
  enQuality, openSlotEditor, renderSlots, rerollOne,
} from './flow.js';
import {
  LT,
  T, cardEffectByRarity, displayOptionLabel, displayValue, fixedLabel, mbtiDescription, mbtiDisplay, promptValue, readCaptionFields,
  readCardFields, renderSelectOptions, slotLabel, suggestCardRarity, syncCardSettingsVisibility, writeCaptionFields, writeCardFields, langOf,
} from './i18n.js';
import {
  applyFashionSenseFx, applyMuscleFashion, generateInnerProfile, innerDialectOf, innerMagazineBlock,
} from './inner.js';
import {
  ST, els,
} from './state.js';
import {
  catCollapsed, renderAll,
} from './ui.js';

  function initManualControls(){
    const out = document.getElementById('manualOutputType');
    const qual = document.getElementById('manualQuality');
    const bg = document.getElementById('manualBackground');
    const light = document.getElementById('manualLighting');
    const count = document.getElementById('manualCount');
    const lang = document.getElementById('manualPromptLanguage');
    const target = document.getElementById('manualPromptTarget');
    const caption = document.getElementById('manualCaptionMode');
    const cardStyle = document.getElementById('manualCardStyle');
    const cardRarity = document.getElementById('manualCardRarity');
    const cardTheme = document.getElementById('manualCardTheme');
    const cardLayout = document.getElementById('manualCardLayout');
    const cardWear = document.getElementById('manualCardWearMode');
    const cardEffect = document.getElementById('manualCardEffect');
    const selected = {
      out: ST.current?.outputType || out?.value || pools.outputTypes[0],
      qual: ST.current?.quality || qual?.value || pools.qualities[0],
      bg: ST.current?.background || bg?.value || pools.backgrounds[0],
      light: ST.current?.lighting || light?.value || pools.lighting[0],
      count: ST.current?.count || count?.value || pools.counts[0],
      lang: ST.current?.promptLanguage || lang?.value || pools.promptLanguages[0],
      target: ST.current?.promptTarget || target?.value || pools.promptTargets[0],
      caption: ST.current?.captionMode || caption?.value || '表記する',
      cardStyle: ST.current?.cardStyle || cardStyle?.value || pools.cardStyles[0],
      cardRarity: ST.current?.cardRarity || cardRarity?.value || 'おすすめ自動',
      cardTheme: ST.current?.cardTheme || cardTheme?.value || pools.cardThemes[1],
      cardLayout: ST.current?.cardLayout || cardLayout?.value || pools.cardLayouts[0],
      cardWearMode: ST.current?.cardWearMode || cardWear?.value || pools.cardWearModes[0],
      cardEffect: cardEffectByRarity(ST.current?.cardRarity || cardRarity?.value || 'R')
    };
    renderSelectOptions(out, 'outputType', pools.outputTypes, selected.out, false);
    renderSelectOptions(qual, 'quality', pools.qualities, selected.qual, false);
    renderSelectOptions(bg, 'background', pools.backgrounds, selected.bg, false);
    renderSelectOptions(light, 'lighting', pools.lighting, selected.light, false);
    renderSelectOptions(count, 'count', pools.counts, selected.count, false);
    renderSelectOptions(lang, 'promptLanguage', pools.promptLanguages, selected.lang, false);
    renderSelectOptions(target, 'promptTarget', pools.promptTargets, selected.target, false);
    renderSelectOptions(caption, 'captionMode', pools.captionModes, selected.caption, false);
    renderSelectOptions(cardStyle, 'cardStyle', pools.cardStyles, selected.cardStyle, false);
    renderSelectOptions(cardRarity, 'cardRarity', pools.cardRarities, selected.cardRarity, false);
    renderSelectOptions(cardTheme, 'cardTheme', pools.cardThemes, selected.cardTheme, false);
    renderSelectOptions(cardLayout, 'cardLayout', pools.cardLayouts, selected.cardLayout, false);
    renderSelectOptions(cardWear, 'cardWearMode', pools.cardWearModes, selected.cardWearMode, false);
    renderSelectOptions(cardEffect, 'cardEffect', pools.cardEffects, selected.cardEffect, false); if(cardEffect) cardEffect.disabled = true;
    writeCaptionFields('manual', ST.current?.captionFields || readCaptionFields('initial'));
    writeCardFields('manual', ST.current?.cardFields || readCardFields('initial'));
    if(out) out.onchange = () => { syncCardSettingsVisibility(); if(ST.current){ ST.current.outputType = out.value; renderAll(); } };
    if(qual) qual.onchange = () => { if(ST.current){ ST.current.quality = qual.value; renderAll(); } };
    if(bg) bg.onchange = () => { if(ST.current){ ST.current.background = bg.value; renderAll(); } };
    if(light) light.onchange = () => { if(ST.current){ ST.current.lighting = light.value; renderAll(); } };
    if(count) count.onchange = () => { if(ST.current){ ST.current.count = count.value; renderAll(); } };
    if(lang) lang.onchange = () => { if(ST.current){ ST.current.promptLanguage = lang.value; renderAll(); } };
    if(target) target.onchange = () => { if(ST.current){ ST.current.promptTarget = target.value; renderAll(); } };
    if(caption) caption.onchange = () => { if(ST.current){ ST.current.captionMode = caption.value; renderAll(); } };
    if(cardStyle) cardStyle.onchange = () => { if(ST.current){ ST.current.cardStyle = cardStyle.value; renderAll(); } };
    if(cardRarity) cardRarity.onchange = () => { if(ST.current){ ST.current.cardRarity = cardRarity.value==='おすすめ自動' ? suggestCardRarity(ST.current) : cardRarity.value; ST.current.cardEffect = cardEffectByRarity(ST.current.cardRarity); renderAll(); } };
    if(cardTheme) cardTheme.onchange = () => { if(ST.current){ ST.current.cardTheme = cardTheme.value; renderAll(); } };
    if(cardLayout) cardLayout.onchange = () => { if(ST.current){ ST.current.cardLayout = cardLayout.value; renderAll(); } };
    if(cardWear) cardWear.onchange = () => { if(ST.current){ ST.current.cardWearMode = cardWear.value; renderAll(); } };
    if(cardEffect) cardEffect.onchange = () => { if(ST.current){ ST.current.cardEffect = cardEffectByRarity(ST.current.cardRarity); renderAll(); } };
    document.querySelectorAll('[data-caption-scope="manual"]').forEach(el=>{ el.onchange = () => { if(ST.current){ ST.current.captionFields = readCaptionFields('manual'); renderAll(); } }; });
    document.querySelectorAll('[data-card-scope="manual"]').forEach(el=>{ el.onchange = () => { if(ST.current){ ST.current.cardFields = readCardFields('manual'); renderAll(); } }; });
  }

  function initInitialSettings(){
    const nat = document.getElementById('initialNationality');
    const eth = document.getElementById('initialEthnicity');
    const ageMin = document.getElementById('initialAgeMin');
    const ageMax = document.getElementById('initialAgeMax');
    const vibe = document.getElementById('initialVibe');
    const era = document.getElementById('initialEraYear');
    const bg = document.getElementById('initialBackground');
    const light = document.getElementById('initialLighting');
    const qual = document.getElementById('initialQuality');
    const out = document.getElementById('initialOutputType');
    const mainWear = document.getElementById('initialMainWearMode');
    const groupSizeSel = document.getElementById('initialGroupSize');
    const groupPMSel = document.getElementById('initialGroupPromptMode');
    const occInfSel = document.getElementById('initialOccInfluence');
    const occSel = document.getElementById('initialOccupation');
    const cpSel = document.getElementById('initialCatchphrase');
    const dmSel = document.getElementById('initialDerivedMode');
    const count = document.getElementById('initialCount');
    const promptLang = document.getElementById('initialPromptLanguage');
    const target = document.getElementById('initialPromptTarget');
    const caption = document.getElementById('initialCaptionMode');
    const cardStyle = document.getElementById('initialCardStyle');
    const cardRarity = document.getElementById('initialCardRarity');
    const cardTheme = document.getElementById('initialCardTheme');
    const cardLayout = document.getElementById('initialCardLayout');
    const cardWear = document.getElementById('initialCardWearMode');
    const cardEffect = document.getElementById('initialCardEffect');
    const selected = {
      nat: nat?.value || '日本', eth: eth?.value || 'ランダム', ageMin: ageMin?.value || '20', ageMax: ageMax?.value || '32', vibe: vibe?.value || 'ランダム', era: era?.value || '2026',
      bg: bg?.value || 'シンプルなグレーバック', light: light?.value || '自然光。明るく清潔感がある。', qual: qual?.value || '実写風',
      out: out?.value || '16:9のリファレンスカードとして、全身の前面・側面、顔の正面・側面、顔正面（歯が見える）、足の正面と側面と足裏（人物が座って自分の足裏をこちらへ見せる構図とし、足裏だけが切り離されて描写された状態にしない）を1枚に整理して表示する。', mainWearMode: mainWear?.value || 'ボクサーパンツのみ', count: count?.value || '1枚', lang: promptLang?.value || '日本語',
      target: target?.value || 'ChatGPT', caption: caption?.value || '表記する',
      cardStyle: cardStyle?.value || 'スタンダード', cardRarity: cardRarity?.value || 'おすすめ自動', cardTheme: cardTheme?.value || 'ネイビー', cardLayout: cardLayout?.value || '縦長カード', cardWearMode: cardWear?.value || 'ボクサーパンツのみ', cardEffect: cardEffectByRarity(cardRarity?.value || 'R')
    };
    renderSelectOptions(nat, 'nationality', pools.nationalities, selected.nat, true);
    renderSelectOptions(eth, 'ethnicity', pools.ethnicities, selected.eth, true);
    renderSelectOptions(ageMin, 'age', pools.ages, selected.ageMin, false);
    renderSelectOptions(ageMax, 'age', pools.ages, selected.ageMax, false);
    renderSelectOptions(vibe, 'vibe', pools.vibes, selected.vibe, false);
    renderSelectOptions(era, 'eraYear', pools.eraYears, selected.era, false);
    renderSelectOptions(bg, 'background', pools.backgrounds, selected.bg, false);
    renderSelectOptions(light, 'lighting', pools.lighting, selected.light, false);
    renderSelectOptions(qual, 'quality', pools.qualities, selected.qual, false);
    renderSelectOptions(out, 'outputType', pools.outputTypes, selected.out, false);
    renderSelectOptions(mainWear, 'mainWearMode', pools.mainWearModes, selected.mainWearMode, false);
    renderSelectOptions(groupSizeSel, 'groupSize', pools.groupSizes, groupSizeSel?.value || '1人（通常）', false);
    renderSelectOptions(groupPMSel, 'groupPromptMode', pools.groupPromptModes, groupPMSel?.value || 'メンバーごとに別々の指示文', false);
    renderSelectOptions(occInfSel, 'occInfluence', pools.occInfluences, occInfSel?.value || '服装・場面・体型に反映', false);
    if(occSel){ const cur = occSel.value || 'ランダム'; occSel.innerHTML = occupationOptionsHTML(cur, true); occSel.value = cur; if(!occSel.value) occSel.value='ランダム'; }
    renderSelectOptions(cpSel, 'catchphraseMode', pools.catchphraseModes, cpSel?.value || '結果画面のみ表示', false);
    if(cpSel) cpSel.onchange = () => { if(ST.current){ ST.current.catchphraseMode = cpSel.value; renderAll(); } };
    renderSelectOptions(dmSel, 'derivedMode', pools.derivedModes, dmSel?.value || '参照画像前提（簡潔版）', false);
    const trSel = document.getElementById('initialTraining');
    renderSelectOptions(trSel, 'trainingLevel', ['ランダム'].concat(TRAINING_LEVELS.map(x=>x[0])), trSel?.value || 'ランダム', false);
    const ssSel = document.getElementById('initialSeason');
    renderSelectOptions(ssSel, 'season', pools.seasons, ssSel?.value || 'ランダム', false);
    if(ssSel) ssSel.onchange = () => { if(ST.current){ ST.current.season = ssSel.value !== 'ランダム' ? ssSel.value : ST.current.season; refreshSeasonOutfits(ST.current); renderAll(); } };
    if(dmSel) dmSel.onchange = () => { if(ST.current){ ST.current.derivedMode = dmSel.value; renderAll(); } };
    if(groupPMSel) groupPMSel.onchange = () => { if(ST.currentGroup){ ST.currentGroup.promptMode = groupPMSel.value; renderAll(); } };
    renderSelectOptions(count, 'count', pools.counts, selected.count, false);
    renderSelectOptions(promptLang, 'promptLanguage', pools.promptLanguages, selected.lang, false);
    renderSelectOptions(target, 'promptTarget', pools.promptTargets, selected.target, false);
    renderSelectOptions(caption, 'captionMode', pools.captionModes, selected.caption, false);
    renderSelectOptions(cardStyle, 'cardStyle', pools.cardStyles, selected.cardStyle, false);
    renderSelectOptions(cardRarity, 'cardRarity', pools.cardRarities, selected.cardRarity, false);
    renderSelectOptions(cardTheme, 'cardTheme', pools.cardThemes, selected.cardTheme, false);
    renderSelectOptions(cardLayout, 'cardLayout', pools.cardLayouts, selected.cardLayout, false);
    renderSelectOptions(cardWear, 'cardWearMode', pools.cardWearModes, selected.cardWearMode, false);
    renderSelectOptions(cardEffect, 'cardEffect', pools.cardEffects, selected.cardEffect, false); if(cardEffect) cardEffect.disabled = true;
    writeCaptionFields('initial', readCaptionFields('initial'));
    writeCardFields('initial', readCardFields('initial'));
    if(out) out.onchange = () => { syncCardSettingsVisibility(); };
    if(mainWear) mainWear.onchange = () => { if(ST.current){ ST.current.mainWearMode = mainWear.value; if(mainWear.value==='時代に合った下着の種類'){ const u = generateEraUnderwear(ST.current.eraYear); ST.current.underwearType = u.type; ST.current.underwearColor = u.color; } else { ST.current.underwearType=''; ST.current.underwearColor=''; } renderAll(); } };
    if(cardRarity) cardRarity.onchange = () => { const eff=document.getElementById('initialCardEffect'); if(eff) eff.value = cardEffectByRarity(cardRarity.value==='おすすめ自動'?'R':cardRarity.value); };
    syncCardSettingsVisibility();
  }

  function getInitial(){
    const nat = document.getElementById('initialNationality')?.value || 'ランダム';
    const eth = document.getElementById('initialEthnicity')?.value || 'ランダム';
    let ageMin = Number(document.getElementById('initialAgeMin')?.value || 20);
    let ageMax = Number(document.getElementById('initialAgeMax')?.value || 32);
    if(ageMin > ageMax){ const tmp = ageMin; ageMin = ageMax; ageMax = tmp; }
    return {
      nationality: nat && nat !== 'ランダム' ? nat : '',
      ethnicity: eth && eth !== 'ランダム' ? eth : '',
      ageMin,
      ageMax,
      vibe: document.getElementById('initialVibe')?.value || 'ランダム',
      eraYear: document.getElementById('initialEraYear')?.value || '2026',
      background: document.getElementById('initialBackground')?.value || pools.backgrounds[0],
      lighting: document.getElementById('initialLighting')?.value || pools.lighting[0],
      quality: document.getElementById('initialQuality')?.value || pools.qualities[0],
      outputType: document.getElementById('initialOutputType')?.value || pools.outputTypes[0],
      mainWearMode: document.getElementById('initialMainWearMode')?.value || 'ボクサーパンツのみ',
      groupSize: parseInt(document.getElementById('initialGroupSize')?.value || '1', 10) || 1,
      groupPromptMode: document.getElementById('initialGroupPromptMode')?.value || 'メンバーごとに別々の指示文',
      occInfluence: document.getElementById('initialOccInfluence')?.value || '服装・場面・体型に反映',
      occupation: document.getElementById('initialOccupation')?.value || 'ランダム',
      catchphraseMode: document.getElementById('initialCatchphrase')?.value || '結果画面のみ表示',
      derivedMode: document.getElementById('initialDerivedMode')?.value || '参照画像前提（簡潔版）',
      season: document.getElementById('initialSeason')?.value || 'ランダム',
      facePresetOut: document.getElementById('initialFacePresetOut')?.value || '含める',
      snapMode: document.getElementById('initialSnapMode')?.value || '通常（スタジオ演出）',
      heightBase: document.getElementById('initialHeightBase')?.value || '平均身長ベース',
      ikemenIndexMode: document.getElementById('initialIkemenIndex')?.value || '表示しない',
      bodyHairMode: document.getElementById('initialBodyHairMode')?.value || '詳細指定',
      trainingMode: document.getElementById('initialTraining')?.value || 'ランダム',
      sportsBodyInfluence: document.getElementById('initialSportsInfluence')?.value || '標準',
      count: document.getElementById('initialCount')?.value || pools.counts[0],
      promptLanguage: document.getElementById('initialPromptLanguage')?.value || pools.promptLanguages[0],
      promptTarget: document.getElementById('initialPromptTarget')?.value || pools.promptTargets[0],
      captionMode: document.getElementById('initialCaptionMode')?.value || '表記する',
      bioCaptionMode: document.getElementById('initialBioCaption')?.value || '入れない',
      promptDetail: document.getElementById('initialPromptDetail')?.value || '自動（生成先に合わせる）',
      captionFields: readCaptionFields('initial'),
      cardStyle: document.getElementById('initialCardStyle')?.value || pools.cardStyles[0],
      cardRarity: document.getElementById('initialCardRarity')?.value || 'おすすめ自動',
      cardTheme: document.getElementById('initialCardTheme')?.value || pools.cardThemes[1],
      cardLayout: document.getElementById('initialCardLayout')?.value || pools.cardLayouts[0],
      cardWearMode: document.getElementById('initialCardWearMode')?.value || pools.cardWearModes[0],
      cardEffect: cardEffectByRarity(document.getElementById('initialCardRarity')?.value || 'R'),
      cardFields: readCardFields('initial')
    };
  }

  function defaultEthnicityForNationality(nationality){
    if(nationality==='日本') return '日本人';
    if(nationality==='韓国') return '韓国系';
    if(['中国','台湾'].includes(nationality)) return '中国系';
    if(['タイ','ベトナム','フィリピン','インドネシア','マレーシア'].includes(nationality)) return '東南アジア系';
    if(nationality==='インド') return '南アジア系';
    if(['ロシア','ポーランド'].includes(nationality)) return 'スラブ系';
    if(nationality==='スウェーデン') return '北欧系';
    if(['イタリア','スペイン','アルゼンチン'].includes(nationality)) return '南欧系';
    if(nationality==='トルコ') return '中東系';
    if(nationality==='モンゴル') return '東アジア系';
    if(nationality==='ナイジェリア') return '黒人系';
    if(['アメリカ','カナダ','イギリス','フランス','ドイツ','オーストラリア'].includes(nationality)) return '白人系';
    if(['ブラジル','メキシコ'].includes(nationality)) return 'ラテン系';
    return pick(pools.ethnicities);
  }

  function chooseSurname(){
    if(Math.random() < 0.05) return pick(pools.surnamesRare);
    const n = pools.surnames.length;
    return weighted(pools.surnames.map((nm, i)=>[nm, (n + 20 - i) / (n + 20)]));
  }

  function givenNameByBirthYear(birthYear){
    const byNum = Number(birthYear) || 2000;
    if(byNum >= 2000){
      const y = Math.min(2025, byNum);
      const list = NAMES_BY_YEAR[y] || NAMES_BY_YEAR[2025];
      if(list && list.length){
        return weighted(list.map((nm, i)=>[nm, 60/(i+5)]));
      }
    }
    const g = pools.givenByEra;
    const by = Number(birthYear) || 2000;
    if(by < 1900) return pick(g.s1880);
    if(by < 1920) return pick(g.s1900);
    if(by < 1940) return pick(g.s1920);
    if(by < 1950) return pick(g.s1940);
    if(by < 1960) return pick(g.s1950);
    if(by < 1970) return pick(g.s1960);
    if(by < 1980) return pick(g.s1970);
    if(by < 1990) return pick(g.s1980);
    if(by < 2000) return pick(g.s1990);
    if(by < 2010) return pick(g.s2000);
    return pick(g.s2010);
  }

  function nameKana(c){
    const n = String((c && c.name) || c || '');
    const m = n.match(/（(.+)）$/);
    return m ? m[1] : n;
  }

  function nameByNationality(nationality, eraYear='2026', age=25){
    const d = NATION_NAMES[nationality];
    if(d){
      const birth = (Number(eraYear) || 2026) - (Number(age) || 25);
      const givens = (birth < 1960 && d.old) ? d.old.concat(d.given) : d.given;
      const g = pick(givens);
      if(!d.family) return `${g[0]}（${g[1]}）`;
      const f = pick(d.family);
      if(d.order === 'E') return `${f[0]}${d.sep !== undefined ? d.sep : ''}${g[0]}（${f[1]}・${g[1]}）`;
      return `${g[0]} ${f[0]}（${g[1]}・${f[1]}）`;
    }
    return legacyNameByNationality(nationality, eraYear, age);
  }

  function legacyNameByNationality(nationality, eraYear='2026', age=25){
    if(nationality==='韓国') return `${pick(['キム','パク','イ','チェ','チョン'])} ${pick(['ミンジュン','ソジュン','ジフン','ドユン','ヒョヌ'])}`;
    if(['中国','台湾'].includes(nationality)) return `${pick(['王','李','張','陳','林'])} ${pick(['俊傑','宇航','子軒','浩然','一辰'])}`;
    if(['アメリカ','カナダ','イギリス','オーストラリア'].includes(nationality)) return `${pick(['Alex','Noah','Liam','Lucas','Ethan'])} ${pick(['Smith','Brown','Taylor','Martin','Wilson'])}`;
    if(['フランス','ドイツ','イタリア','スペイン'].includes(nationality)) return `${pick(['Lucas','Matteo','Leon','Hugo','Theo'])} ${pick(['Martin','Rossi','Garcia','Muller','Dubois'])}`;
    if(['ブラジル','メキシコ'].includes(nationality)) return `${pick(['Mateo','Diego','Lucas','Gabriel','Santiago'])} ${pick(['Silva','Garcia','Lopez','Santos','Martinez'])}`;
    if(['タイ','ベトナム','フィリピン','インドネシア','マレーシア'].includes(nationality)) return `${pick(['An','Minh','Kiet','Arun','Niran','Paolo','Rizky','Aiman'])} ${pick(['Tran','Nguyen','Phan','Somsak','Prasert','Santos','Tan','Ahmad'])}`;
    if(nationality==='インド') return `${pick(['Arjun','Rahul','Vihaan','Ayaan','Kabir'])} ${pick(['Sharma','Patel','Singh','Kumar','Gupta'])}`;
    const birthYear = (Number(eraYear) || 2026) - (Number(age) || 25);
    return `${chooseSurname()} ${givenNameByBirthYear(birthYear)}`;
  }

  function faceByEthnicity(ethnicity){
    if(ethnicity==='韓国系') return {facePreset:'韓国アイドル風', skin:'透明感のある肌', hairColor:'黒', eyes:'涼しげな目元'};
    if(ethnicity==='白人系') return {facePreset:'高身長モデル系', skin:'自然な肌質', hairColor:pick(['自然な茶髪','アッシュブラウン','グレージュ']), eyes:'知的な目元'};
    if(ethnicity==='スラブ系') return {facePreset:'クール系', skin:'色白の肌', eyes:'淡い色の切れ長の目元'};
    if(ethnicity==='北欧系') return {facePreset:'高身長モデル系', skin:'非常に色白の肌', eyes:'淡いブルー系の目元'};
    if(ethnicity==='南欧系') return {facePreset:'ワイルド系', skin:'少し日焼けした肌', eyes:'力強い目元'};
    if(ethnicity==='ラテン系') return {facePreset:'ワイルド系', skin:'少し日焼けした肌', hairColor:'黒に近いダークブラウン', eyes:'力強い目元'};
    if(ethnicity==='東南アジア系') return {facePreset:'親しみやすい大学生系', skin:'少し日焼けした肌', hairColor:'黒', eyes:'優しい目元'};
    if(ethnicity==='南アジア系') return {facePreset:'落ち着いた大人系', skin:'褐色の肌', hairColor:'黒', eyes:'力強い目元'};
    if(ethnicity==='黒人系') return {facePreset:'体育会系スポーツ男子', skin:'深い褐色の肌', hairColor:'黒', eyes:'力強い目元'};
    if(ethnicity==='中東系') return {facePreset:'ミステリアス系', skin:'マットで自然な肌', hairColor:'黒', eyes:'知的な目元'};
    if(ethnicity==='中央アジア系') return {facePreset:'クール系', skin:'自然な肌質', hairColor:'黒に近いダークブラウン', eyes:'涼しげな目元'};
    if(ethnicity==='中国系') return {facePreset:'真面目系', skin:'自然な肌質', hairColor:'黒', eyes:'涼しげな目元'};
    return {facePreset:'普通顔', skin:'健康的な肌質', hairColor:'黒', eyes:'親しみやすい目元'};
  }

  function initSlots(){
    const CAT_LABELS = LT({basic:'基本', body:'体型・身体', bodyhair:'体毛', face:'顔立ち', outfit:'服装・靴下'}, {basic:'Basic', body:'Body', bodyhair:'Body Hair', face:'Face', outfit:'Outfit & Socks'}, {basic:'基本', body:'体型・身体', bodyhair:'体毛', face:'脸部', outfit:'服装・袜子'});
    const cats = [];
    slotDefs.forEach(([key,label,cat])=>{ const c = cat || 'basic'; if(!cats.includes(c)) cats.push(c); });
    const slotHtml = ([key,label]) => `<div class="slot" id="slot-${key}"><button class="lock" data-lock="${key}">${T('lock')}</button><button class="dice" data-dice="${key}" title="${T('diceTitle')}">🎲</button>${key==='name' ? '' : `<button class="edit" data-edit="${key}" title="${T('editTitle')}">✎</button>`}<small>${slotLabel(key,label)}</small><div class="value">？？？</div><div class="meta">${T('clickLock')}</div></div>`;
    els.slotGrid.innerHTML = cats.map(cat=>{
      const defs = slotDefs.filter(d=>(d[2]||'basic')===cat);
      return `<div class="slot-cat${catCollapsed[cat]?' collapsed':''}" data-cat="${cat}"><button class="cat-head" data-cathead="${cat}">${CAT_LABELS[cat]||cat}（${defs.length}）<span class="cat-arrow">▼</span></button><div class="cat-grid">${defs.map(slotHtml).join('')}</div></div>`;
    }).join('');
    document.querySelectorAll('[data-cathead]').forEach(b=>b.addEventListener('click',()=>{ const cat=b.dataset.cathead; const wrap=b.closest('.slot-cat'); wrap.classList.toggle('collapsed'); catCollapsed[cat]=wrap.classList.contains('collapsed'); }));
    document.querySelectorAll('[data-lock]').forEach(b=>b.addEventListener('click',()=>{ST.locks[b.dataset.lock]=!ST.locks[b.dataset.lock]; renderSlots(ST.current,false);}));
    document.querySelectorAll('[data-dice]').forEach(b=>b.addEventListener('click',()=>rerollOne(b.dataset.dice)));
    document.querySelectorAll('[data-edit]').forEach(b=>b.addEventListener('click',()=>openSlotEditor(b.dataset.edit)));
  }

  function initFixedForm(){
    const fixedFields = [
      ['age','年齢固定', pools.ages],
      ['nationality','国籍固定', pools.nationalities],
      ['ethnicity','人種固定', pools.ethnicities],
      ['bodyType','体型固定', pools.bodyTypes],
      ['facePreset','顔立ち固定', pools.facePresets],
      ['vibe','雰囲気系統固定', pools.vibes.filter(v=>v!=='ランダム')],
      ['mbti','MBTI固定', pools.mbtis],
      ['outfitType','服装固定', pools.outfitTypes]
    ];
    const selected = {};
    document.querySelectorAll('[data-fixed]').forEach(s=>{ selected[s.dataset.fixed] = s.value; });
    els.fixedForm.innerHTML = fixedFields.map(([key,label,options])=>`<label class="field"><span>${fixedLabel(key,label)}</span><select data-fixed="${key}"></select></label>`).join('');
    fixedFields.forEach(([key,label,options])=>{
      const el = els.fixedForm.querySelector(`[data-fixed="${key}"]`);
      renderSelectOptions(el, key, options, selected[key] || 'ランダム', true);
    });
  }

  function getFixed(){
    const fixed = {};
    document.querySelectorAll('[data-fixed]').forEach(s=>{ if(s.value && s.value !== 'ランダム') fixed[s.dataset.fixed] = String(s.value); });
    return fixed;
  }

  function calcWeight(height, bodyType){
    const table = [
      ['やせ',18.3],['華奢',18.0],['細身',18.8],['陸上長距離',19.2],['バスケットボール',20.5],['高身長モデル',20],
      ['クライマー',21.5],['肩幅広め',22],['逆三角形',22.2],['細マッチョ',21.8],['中肉中背',21.5],['隠れ筋肉',22.0],['水泳',22.5],['陸上短距離',22.8],['痩せマッチョ',22.2],
      ['サッカー',22.5],['筋肉',23],['スポーツ',23],['骨太',23.5],['腹だけ',24.2],['がっしり',24.5],['ビール',24.8],
      ['柔道',26],['ラグビー',26.5],['ぽっちゃり',26.5]
    ];
    const hit = table.find(([k])=>bodyType.includes(k));
    const bmi = hit ? hit[1] : 21.2;
    return Math.round(bmi*Math.pow(height/100,2));
  }

  function footByHeight(h, rare){
    let min=25, max=27;
    if(h>=183){min=28;max=31}else if(h>=177){min=27;max=29}else if(h>=171){min=26;max=28}else{min=25;max=27}
    if(rare && Math.random()<.3) max = Math.min(34,max+2);
    return rnd(min,max,.5).toFixed(1).replace('.0','')+'cm';
  }

  function chooseBody(height, rare){
    if(rare) return weighted(pools.bodyTypes.map(v=>[v, v.includes('腹だけ')||v.includes('ぽっちゃり')||v.includes('高身長')||v.includes('脚')?5:2]));
    if(height>=182) return weighted([['高身長モデル体型',4],['脚が長い',3],['筋肉質',2],['標準体型',2],['バスケットボール選手体型',1]]);
    if(height<=170) return weighted([['やせ型',3],['細身',3],['標準体型',3],['痩せマッチョ',2],['サッカー選手体型',1]]);
    return weighted([['標準体型',4],['細身',3],['スーツ映え体型',2],['筋肉質',2],['引き締まったスポーツ体型',2],['腹だけぽっちゃり',1]]);
  }

  function chooseOutfit(age, rare, vibe='ランダム'){
    if(vibe==='スポーツ系') return weighted([['スポーツ練習着',5],['大学生カジュアル',2],['私服通学風',2]]);
    if(vibe==='真面目系' || vibe==='大人っぽい系') return weighted([['紺スーツ',4],['グレースーツ',3],['ジャケットスタイル',3],['社会人カジュアル',2]]);
    if(vibe==='韓国風') return weighted([['ジャケットスタイル',3],['大学生カジュアル',3],['社会人カジュアル',2],['ストリート系',2]]);
    if(vibe==='中性系') return weighted([['大学生カジュアル',3],['ストリート系',3],['社会人カジュアル',2],['私服通学風',2]]);
    if(vibe==='ワイルド系') return weighted([['ストリート系',4],['社会人カジュアル',2],['スポーツ練習着',2],['大学生カジュアル',2]]);
    if(vibe==='やりらふぃー系' || vibe==='ストリート系' || vibe==='陽キャ大学生系') return weighted([['ストリート系',4],['大学生カジュアル',3],['私服通学風',2],['スポーツ練習着',1]]);
    if(vibe==='塩顔系' || vibe==='犬系男子' || vibe==='古着系' || vibe==='サブカル系') return weighted([['大学生カジュアル',3],['私服通学風',3],['社会人カジュアル',2],['ストリート系',2]]);
    if(vibe==='クール系' || vibe==='ミステリアス系') return weighted([['黒スーツ',2],['ジャケットスタイル',3],['社会人カジュアル',2],['ストリート系',2]]);
    if(vibe==='清楚系') return weighted([['ジャケットスタイル',3],['社会人カジュアル',3],['紺スーツ',2],['大学生カジュアル',2]]);
    if(age<=22) return weighted([['大学生カジュアル',3],['私服通学風',3],['学生服（ブレザー）', rare?3:1],['学生服（学ラン）', rare?3:1],['スポーツ練習着',2],['制服風コーデ',2],['ストリート系',2]]);
    if(age<=30) return weighted([['紺スーツ',3],['社会人カジュアル',3],['大学生カジュアル',1],['ジャケットスタイル',2],['黒スーツ',2],['ストリート系',1]]);
    return weighted([['紺スーツ',3],['グレースーツ',3],['ジャケットスタイル',3],['社会人カジュアル',2],['黒スーツ',2]]);
  }

  function weightedPickMap(items){ return weighted(items.map(v=>Array.isArray(v)?v:[v,1])); }

  function chooseAge(min,max){
    const candidates = pools.ages.filter(v=>v>=min && v<=max);
    return pick(candidates.length?candidates:pools.ages);
  }

  function ageAppearanceByAge(age){
    if(age>=65) return weighted([['穏やかな年配の風格',5],['年相応の渋さがある',3],['やや若く見える',1]]);
    if(age>=50) return weighted([['年相応の渋さがある',5],['実年齢相応',3],['やや若く見える',1]]);
    if(age<=22) return weighted([['実年齢相応',4],['やや若く見える',4],['少し大人びて見える',1]]);
    if(age<=29) return weighted([['実年齢相応',5],['やや若く見える',2],['少し大人びて見える',2]]);
    return weighted([['実年齢相応',5],['少し大人びて見える',4],['やや若く見える',1]]);
  }

  function chooseRole(age,vibe){
    const early = ['大学生風の成人男性','スポーツ経験者','クリエイター風','モデル風','俳優風','フリーランス風'];
    const mid = ['若手社会人','営業職風','事務職風','IT系会社員風','研究職風','販売員風','インストラクター風','アナウンサー風'];
    let arr = age<=22 ? early.concat(['成人男性キャラクター']) : mid.concat(['成人男性キャラクター','若手社会人','スポーツ経験者','モデル風']);
    if(vibe==='スポーツ系') arr = ['スポーツ経験者','インストラクター風','大学生風の成人男性','モデル風'];
    if(vibe==='真面目系') arr = ['若手社会人','事務職風','研究職風','IT系会社員風','営業職風'];
    if(vibe==='韓国風') arr = ['モデル風','俳優風','クリエイター風','若手社会人'];
    if(vibe==='ワイルド系') arr = ['スポーツ経験者','俳優風','フリーランス風','販売員風'];
    if(vibe==='やりらふぃー系' || vibe==='ストリート系' || vibe==='陽キャ大学生系') arr = ['大学生風の成人男性','販売員風','フリーランス風','モデル風','スポーツ経験者'];
    if(vibe==='塩顔系' || vibe==='犬系男子' || vibe==='清楚系') arr = ['若手社会人','大学生風の成人男性','事務職風','販売員風','モデル風'];
    if(vibe==='クール系' || vibe==='ミステリアス系' || vibe==='サブカル系' || vibe==='古着系') arr = ['クリエイター風','フリーランス風','研究職風','IT系会社員風','モデル風'];
    return pick(arr);
  }

  function vibeProfile(vibe, age){
    const map = {
      '爽やか系': { facePresets:[['普通顔',4],['親しみやすい大学生系',4],['日本の若手俳優風',3],['爽やか知的アナウンサー系',2]], hairStyles:[['短髪',3],['アップバング',3],['センターパート',2],['ニュアンスパーマ',2]], hairColors:[['黒',4],['ブルーブラック',3],['黒に近いダークブラウン',2]], outfits:[['大学生カジュアル',3],['社会人カジュアル',3],['ジャケットスタイル',2],['私服通学風',2]], bodyTypes:[['標準体型',4],['細身',3],['スーツ映え体型',2]] },
      '真面目系': { facePresets:[['真面目系',5],['スーツ映え社会人系',4],['普通顔',3]], hairStyles:[['ビジネス短髪',4],['サイドパート',4],['短髪',2]], hairColors:[['黒',5],['ブルーブラック',3]], outfits:[['紺スーツ',4],['グレースーツ',3],['ジャケットスタイル',3],['社会人カジュアル',2]], bodyTypes:[['標準体型',4],['スーツ映え体型',4],['細身',2]] },
      'ワイルド系': { facePresets:[['ワイルド系',5],['体育会系スポーツ男子',3],['清潔感のある若手俳優風',2]], hairStyles:[['ツイストパーマ',3],['スパイラルパーマ',3],['アップバング',2],['ウルフミディアム',2]], hairColors:[['黒',3],['黒に近いダークブラウン',3],['自然な茶髪',2]], outfits:[['ストリート系',4],['社会人カジュアル',2],['スポーツ練習着',2]], bodyTypes:[['筋肉質',4],['引き締まったスポーツ体型',3],['がっしり体型',2]] },
      'スポーツ系': { facePresets:[['弟系童顔（笑顔が武器）',2],['垂れ目パピー系',1.5],['体育会系スポーツ男子',5],['大学サッカー部系',4],['普通顔',2]], hairStyles:[['短髪',4],['アップバング',3],['ソフトツーブロック',2]], hairColors:[['黒',4],['ブルーブラック',2]], outfits:[['スポーツ練習着',5],['大学生カジュアル',2],['私服通学風',2]], bodyTypes:[['引き締まったスポーツ体型',4],['サッカー選手体型',4],['筋肉質',3],['痩せマッチョ',2]] },
      'きれいめ系': { facePresets:[['スーツ映え社会人系',4],['高身長モデル系',3],['日本の若手俳優風',3]], hairStyles:[['センターパート',3],['サイドパート',3],['韓国風センターパート',2],['ビジネス短髪',2]], hairColors:[['黒',3],['ブルーブラック',3],['アッシュブラウン',2]], outfits:[['ジャケットスタイル',4],['社会人カジュアル',3],['紺スーツ',2]], bodyTypes:[['細身',3],['スーツ映え体型',3],['高身長モデル体型',2]] },
      'カジュアル系': { facePresets:[['親しみやすい大学生系',4],['普通顔',4],['日本の若手俳優風',2]], hairStyles:[['マッシュ',3],['センターパート',2],['ソフトツーブロック',3],['ニュアンスパーマ',2]], hairColors:[['黒',3],['黒に近いダークブラウン',2],['自然な茶髪',2]], outfits:[['大学生カジュアル',4],['私服通学風',4],['ストリート系',2],['社会人カジュアル',2]], bodyTypes:[['標準体型',4],['細身',3],['やせ型',2]] },
      '韓国風': { facePresets:[['弟系童顔（笑顔が武器）',2],['垂れ目パピー系',1.5],['韓国アイドル風',6],['中性系',3],['高身長モデル系',2]], hairStyles:[['韓国風センターパート',5],['センターパート',3],['ニュアンスパーマ',2]], hairColors:[['黒',3],['ブルーブラック',3],['グレージュ',2]], outfits:[['きれいめカジュアル',1],['ジャケットスタイル',3],['大学生カジュアル',2],['社会人カジュアル',2]], bodyTypes:[['細身',4],['高身長モデル体型',3],['標準体型',2]] },
      '中性系': { facePresets:[['中性系',6],['韓国アイドル風',3],['普通顔',2]], hairStyles:[['センターパート',3],['マッシュ',3],['ロング寄りミディアム',2],['ウルフミディアム',2]], hairColors:[['黒',3],['ブルーブラック',2],['グレージュ',2],['アッシュブラウン',2]], outfits:[['大学生カジュアル',3],['ストリート系',2],['社会人カジュアル',2],['ジャケットスタイル',2]], bodyTypes:[['細身',4],['やせ型',3],['高身長モデル体型',2]] },
      '大人っぽい系': { facePresets:[['落ち着いた大人系',5],['スーツ映え社会人系',4],['高身長モデル系',2]], hairStyles:[['サイドパート',3],['ビジネス短髪',3],['センターパート',2]], hairColors:[['黒',4],['黒に近いダークブラウン',2],['アッシュブラウン',1]], outfits:[['紺スーツ',4],['グレースーツ',3],['ジャケットスタイル',3],['社会人カジュアル',2]], bodyTypes:[['スーツ映え体型',4],['標準体型',3],['高身長モデル体型',2]] },
      'やりらふぃー系': { facePresets:[['やりらふぃー系',5],['ワイルド系',3],['日本の若手俳優風',2],['普通顔',1]], hairStyles:[['ツイストパーマ',4],['波巻きパーマ',4],['スパイラルパーマ',3],['アップバング',2],['ウルフミディアム',2]], hairColors:[['黒',3],['明るめブラウン',4],['アッシュブラウン',3],['自然な茶髪',3]], outfits:[['ストリート系',5],['大学生カジュアル',3],['私服通学風',3],['スポーツ練習着',1]], bodyTypes:[['細身',3],['痩せマッチョ',3],['標準体型',2],['引き締まったスポーツ体型',2]] },
      'ストリート系': { facePresets:[['ワイルド系',3],['やりらふぃー系',3],['日本の若手俳優風',2],['普通顔',2]], hairStyles:[['ツイストパーマ',3],['波巻きパーマ',3],['マッシュ',2],['ウルフミディアム',2],['センターパート',2]], hairColors:[['黒',3],['自然な茶髪',3],['明るめブラウン',2],['アッシュブラウン',2]], outfits:[['ストリート系',6],['大学生カジュアル',2],['私服通学風',2]], bodyTypes:[['細身',3],['標準体型',3],['痩せマッチョ',2],['腹だけぽっちゃり',1]] },
      '塩顔系': { facePresets:[['塩顔系',6],['中性系',3],['普通顔',3],['韓国アイドル風',2]], hairStyles:[['マッシュ',4],['センターパート',4],['韓国風センターパート',2],['ニュアンスパーマ',2]], hairColors:[['黒',5],['ブルーブラック',3],['黒に近いダークブラウン',2]], outfits:[['大学生カジュアル',3],['きれいめカジュアル',1],['社会人カジュアル',3],['ジャケットスタイル',2]], bodyTypes:[['細身',5],['やせ型',3],['標準体型',2]] },
      '犬系男子': { facePresets:[['犬系男子風',6],['親しみやすい大学生系',4],['普通顔',3],['日本の若手俳優風',2]], hairStyles:[['マッシュ',4],['ニュアンスパーマ',3],['短髪',2],['ソフトツーブロック',2]], hairColors:[['黒',4],['黒に近いダークブラウン',3],['自然な茶髪',2]], outfits:[['大学生カジュアル',4],['私服通学風',3],['社会人カジュアル',2],['ジャケットスタイル',1]], bodyTypes:[['標準体型',4],['細身',3],['痩せマッチョ',2]] },
      'クール系': { facePresets:[['クール系',5],['真面目系',3],['高身長モデル系',3],['韓国アイドル風',2]], hairStyles:[['センターパート',3],['サイドパート',3],['ビジネス短髪',2],['韓国風センターパート',2]], hairColors:[['黒',5],['ブルーブラック',4],['アッシュブラウン',1]], outfits:[['黒スーツ',3],['ジャケットスタイル',3],['社会人カジュアル',2],['ストリート系',1]], bodyTypes:[['細身',3],['スーツ映え体型',3],['高身長モデル体型',2],['標準体型',2]] },
      'ミステリアス系': { facePresets:[['ミステリアス系',5],['中性系',3],['クール系',3],['高身長モデル系',2]], hairStyles:[['ロング寄りミディアム',3],['ウルフミディアム',3],['センターパート',3],['波巻きパーマ',2]], hairColors:[['黒',4],['ブルーブラック',3],['グレージュ',2],['アッシュブラウン',2]], outfits:[['黒スーツ',2],['ジャケットスタイル',3],['ストリート系',3],['社会人カジュアル',2]], bodyTypes:[['細身',4],['高身長モデル体型',2],['標準体型',2],['やせ型',2]] },
      'サブカル系': { facePresets:[['サブカル系',5],['中性系',3],['普通顔',2],['塩顔系',2]], hairStyles:[['ウルフミディアム',4],['マッシュ',3],['ロング寄りミディアム',2],['ニュアンスパーマ',2]], hairColors:[['黒',3],['アッシュブラウン',3],['グレージュ',3],['自然な茶髪',2]], outfits:[['古着系',1],['ストリート系',3],['大学生カジュアル',3],['私服通学風',2]], bodyTypes:[['細身',4],['やせ型',3],['標準体型',2]] },
      '古着系': { facePresets:[['普通顔',3],['サブカル系',3],['塩顔系',2],['親しみやすい大学生系',2]], hairStyles:[['マッシュ',3],['ウルフミディアム',3],['ニュアンスパーマ',3],['センターパート',2]], hairColors:[['黒',3],['自然な茶髪',3],['アッシュブラウン',2],['黒に近いダークブラウン',2]], outfits:[['大学生カジュアル',4],['私服通学風',3],['ストリート系',2],['社会人カジュアル',1]], bodyTypes:[['標準体型',4],['細身',3],['やせ型',2],['腹だけぽっちゃり',1]] },
      '清楚系': { facePresets:[['普通顔',4],['真面目系',4],['親しみやすい大学生系',3],['塩顔系',2]], hairStyles:[['短髪',3],['センターパート',3],['サイドパート',2],['マッシュ',2]], hairColors:[['黒',5],['ブルーブラック',3],['黒に近いダークブラウン',2]], outfits:[['ジャケットスタイル',3],['社会人カジュアル',3],['大学生カジュアル',2],['紺スーツ',2]], bodyTypes:[['標準体型',4],['細身',3],['スーツ映え体型',2]] },
      'レトロ系': { facePresets:[['落ち着いた大人系',3],['普通顔',3],['日本の若手俳優風',2],['サブカル系',2]], hairStyles:[['センターパート',4],['ロング寄りミディアム',3],['ウルフミディアム',3],['サイドパート',2]], hairColors:[['黒',5],['黒に近いダークブラウン',3]], outfits:[['ジャケットスタイル',3],['大学生カジュアル',3],['社会人カジュアル',2],['私服通学風',2]], bodyTypes:[['細身',4],['標準体型',3],['やせ型',2]] },
      'モード系': { facePresets:[['高身長モデル系',4],['クール系',4],['ミステリアス系',3],['中性系',2]], hairStyles:[['センターパート',3],['ロング寄りミディアム',3],['マンバン',2],['ウルフミディアム',2]], hairColors:[['黒',5],['ブルーブラック',3]], outfits:[['黒スーツ',3],['ジャケットスタイル',4],['ストリート系',2]], bodyTypes:[['高身長モデル体型',4],['細身',4],['やせ型',2]] },
      'アウトドア系': { facePresets:[['ワイルド系',3],['親しみやすい大学生系',3],['普通顔',3],['体育会系スポーツ男子',2]], hairStyles:[['短髪',4],['アップバング',3],['マッシュ',2],['ニュアンスパーマ',2]], hairColors:[['黒',4],['黒に近いダークブラウン',3],['自然な茶髪',2]], outfits:[['大学生カジュアル',3],['私服通学風',3],['ストリート系',2],['スポーツ練習着',2]], bodyTypes:[['標準体型',3],['がっしり体型',3],['引き締まったスポーツ体型',3]] },
      'バンドマン系': { facePresets:[['サブカル系',4],['ミステリアス系',3],['中性系',3],['塩顔系',2]], hairStyles:[['ウルフミディアム',4],['ロング寄りミディアム',4],['マッシュ',2],['波巻きパーマ',2]], hairColors:[['黒',4],['ブルーブラック',2],['アッシュブラウン',2],['グレージュ',2]], outfits:[['ストリート系',4],['大学生カジュアル',3],['私服通学風',2],['ジャケットスタイル',2]], bodyTypes:[['やせ型',4],['細身',4],['標準体型',2]] },
      '紳士系': { facePresets:[['落ち着いた大人系',5],['スーツ映え社会人系',4],['爽やか知的アナウンサー系',2]], hairStyles:[['サイドパート',4],['ビジネス短髪',4],['短髪',2]], hairColors:[['黒',5],['黒に近いダークブラウン',2]], outfits:[['グレースーツ',3],['紺スーツ',3],['黒スーツ',2],['ジャケットスタイル',3]], bodyTypes:[['スーツ映え体型',4],['標準体型',3],['高身長モデル体型',2]] },
      'ギャル男系': { facePresets:[['やりらふぃー系',4],['ワイルド系',3],['日本の若手俳優風',2]], hairStyles:[['ウルフミディアム',4],['スパイラルパーマ',3],['アップバング',3],['ツイストパーマ',2]], hairColors:[['明るめブラウン',5],['自然な茶髪',3],['アッシュブラウン',2],['金髪（ブリーチ）',2],['ハイトーンアッシュ',2]], outfits:[['ストリート系',5],['大学生カジュアル',3],['私服通学風',2]], bodyTypes:[['細身',4],['痩せマッチョ',3],['やせ型',2]] },
      '普通系': { facePresets:[['普通顔',6],['親しみやすい大学生系',2],['真面目系',2]], hairStyles:[['短髪',3],['マッシュ',2],['センターパート',2],['サイドパート',2]], hairColors:[['黒',5],['黒に近いダークブラウン',2]], outfits:[['大学生カジュアル',3],['社会人カジュアル',3],['私服通学風',2]], bodyTypes:[['標準体型',5],['細身',2],['やせ型',2]] },
      'ブサイク系': { facePresets:[['ブサイク系',6],['普通顔',2]], hairStyles:[['短髪',3],['マッシュ',2],['サイドパート',2]], hairColors:[['黒',6]], outfits:[['大学生カジュアル',3],['社会人カジュアル',2],['私服通学風',2]], bodyTypes:[['標準体型',3],['ぽっちゃり',2],['腹だけぽっちゃり',2],['やせ型',2]] },
      '地味系': { facePresets:[['真面目系',4],['普通顔',3],['塩顔系',2]], hairStyles:[['短髪',3],['サイドパート',3],['ビジネス短髪',2]], hairColors:[['黒',6],['黒に近いダークブラウン',2]], outfits:[['社会人カジュアル',3],['私服通学風',3],['大学生カジュアル',2]], bodyTypes:[['標準体型',4],['やせ型',3],['細身',2]] },
      'オタク系': { facePresets:[['普通顔',3],['真面目系',3],['サブカル系',2],['ブサイク系',1]], hairStyles:[['短髪',3],['マッシュ',3],['センターパート',1]], hairColors:[['黒',6]], outfits:[['私服通学風',3],['大学生カジュアル',3],['社会人カジュアル',1]], bodyTypes:[['やせ型',3],['標準体型',3],['ぽっちゃり',2]] },
      'ヤンキー系': { facePresets:[['ワイルド系',4],['やんちゃ系',4],['やりらふぃー系',1]], hairStyles:[['ウルフミディアム',3],['アップバング',3],['短髪',2],['スパイラルパーマ',2]], hairColors:[['明るめブラウン',4],['自然な茶髪',3],['黒',2],['金髪（ブリーチ）',3],['オレンジブラウン',1]], outfits:[['ストリート系',4],['大学生カジュアル',2],['スポーツ練習着',1]], bodyTypes:[['痩せマッチョ',3],['がっしり体型',2],['細身',2]] },
      'ホスト系': { facePresets:[['ホスト系',6],['日本の若手俳優風',2]], hairStyles:[['ウルフミディアム',3],['センターパート',3],['ニュアンスパーマ',2],['マンバン',1]], hairColors:[['明るめブラウン',3],['アッシュブラウン',3],['グレージュ',2],['黒',1],['シルバーアッシュ',2],['ハイトーンアッシュ',1]], outfits:[['黒スーツ',4],['ジャケットスタイル',3],['ストリート系',1]], bodyTypes:[['細身',4],['やせ型',2],['高身長モデル体型',2]] },
      'おじさん系': { facePresets:[['おじさん系',6],['落ち着いた大人系',3]], hairStyles:[['短髪',3],['サイドパート',3],['ビジネス短髪',3]], hairColors:[['黒',4],['黒に近いダークブラウン',3],['白髪まじり',2],['ロマンスグレー',1]], outfits:[['社会人カジュアル',3],['グレースーツ',2],['紺スーツ',2],['ジャケットスタイル',2]], bodyTypes:[['標準体型',3],['腹だけぽっちゃり',2],['ビール腹',2],['がっしり体型',2]] },
      'メガネ知的系': { facePresets:[['真面目系',4],['爽やか知的アナウンサー系',3],['塩顔系',2]], hairStyles:[['短髪',3],['センターパート',2],['サイドパート',2],['マッシュ',2]], hairColors:[['黒',6],['ブルーブラック',2]], outfits:[['ジャケットスタイル',3],['社会人カジュアル',3],['私服通学風',2]], bodyTypes:[['細身',3],['やせ型',3],['標準体型',3]] },
      '陽キャ大学生系': { facePresets:[['親しみやすい大学生系',5],['やりらふぃー系',3],['日本の若手俳優風',3],['普通顔',2]], hairStyles:[['アップバング',3],['ニュアンスパーマ',3],['波巻きパーマ',2],['短髪',2],['センターパート',2]], hairColors:[['黒',3],['自然な茶髪',3],['明るめブラウン',2],['アッシュブラウン',2]], outfits:[['大学生カジュアル',5],['私服通学風',4],['ストリート系',2],['スポーツ練習着',1]], bodyTypes:[['標準体型',3],['細身',3],['痩せマッチョ',2],['引き締まったスポーツ体型',2]] }
    };
    const chosen = map[vibe] || null;
    if(!chosen) return null;
    if(vibe==='韓国風' && age<22) chosen.outfits = [['大学生カジュアル',3],['ジャケットスタイル',2],['社会人カジュアル',2]];
    return chosen;
  }

  function chooseFaceAgeCompatible(facePreset, ageAppearance, vibe, age){
    if(Number(age) >= 55) return facePreset;
    if(['昭和顔（濃い顔立ち）','しょうゆ顔','ソース顔','彫りの深い縄文系','あっさり弥生系','たれ目系','つり目系','平成アイドル風'].includes(facePreset)) return facePreset;
    if(['ブサイク系','ホスト系','おじさん系','ヤンキー系','ギャル男系','韓国風'].includes(vibe)) return facePreset;
    if(vibe==='大人っぽい系' || ageAppearance==='少し大人びて見える') return weighted([[facePreset,4],['落ち着いた大人系',4],['スーツ映え社会人系',3],['真面目系',2]]);
    if(vibe==='スポーツ系') return weighted([[facePreset,4],['体育会系スポーツ男子',3],['大学サッカー部系',3],['普通顔',2]]);
    if(ageAppearance==='やや若く見える') return weighted([[facePreset,4],['親しみやすい大学生系',4],['普通顔',3],['日本の若手俳優風',2],['韓国アイドル風',2],['弟系童顔（笑顔が武器）',2.5],['垂れ目パピー系',1.5]]);
    return weighted([[facePreset,7],['普通顔',2],['真面目系',1],['清潔感のある若手俳優風',1]]);
  }

  /* ===== V2.8 職業別「偶然見かけた場面」大幅拡充 ===== */
  function buildEncounterScene(c){
    const scenes = [];
    const nat = c.nationality || '';    if(['ISTJ','ISFJ','ESTJ','ESFJ'].includes(c.mbti)) scenes.push('出勤前の静かな駅前やオフィス街で、落ち着いた雰囲気で歩いているところを偶然見かけた場面');
    if(['ESTP','ESFP'].includes(c.mbti)) scenes.push('夕方の街角やスポーツ施設帰りに、活動的な雰囲気で友人と合流する前の姿を偶然見かけた場面');
    if(['ISFP','INFP'].includes(c.mbti)) scenes.push('カフェ前や古着屋、小さなギャラリーの近くで、自然体の私服姿を偶然見かけた場面');
    if(['ENFP','ENFJ'].includes(c.mbti)) scenes.push('にぎやかな通りや商業施設周辺で、明るい雰囲気で友人を待つ姿を偶然見かけた場面');
    if(['INTJ','INTP'].includes(c.mbti)) scenes.push('大学施設や静かな作業スペースの近くで、考え込むように歩く姿を偶然見かけた場面');
    if(c.role.includes('大学生') || c.outfitType.includes('通学') || c.outfitType.includes('学生服')) scenes.push('駅から学校へ向かう途中、朝の通学路でふと見かけた場面');
    if(c.role.includes('社会人') || c.role.includes('営業') || c.role.includes('事務') || c.role.includes('IT')) scenes.push('出勤前の駅前やオフィス街で偶然すれ違った場面');
    if(c.role.includes('研究') || c.role.includes('クリエイター')) scenes.push('大学施設や作業スペースの近くで、資料やPCを持って移動しているところを偶然見かけた場面');
    if(c.role.includes('スポーツ') || c.vibe==='スポーツ系') scenes.push('スポーツ施設の外や練習帰りの通路で、汗が引いた自然な状態を偶然見かけた場面');
    if(c.role.includes('モデル') || c.role.includes('俳優')) scenes.push('街中で撮影や移動の合間に、ふと立ち止まった瞬間を偶然見かけた場面');
    if(c.vibe==='ワイルド系') scenes.push('夕方の街角で、少しラフな雰囲気で歩いているところを偶然見かけた場面');
    if(c.vibe==='やりらふぃー系' || c.vibe==='ストリート系' || c.vibe==='陽キャ大学生系') scenes.push('駅前や繁華街の通りで、友人と合流する前の自然な姿を偶然見かけた場面');
    if(c.vibe==='塩顔系' || c.vibe==='犬系男子' || c.vibe==='清楚系') scenes.push('カフェ前や落ち着いた街角で、柔らかい雰囲気の立ち姿を偶然見かけた場面');
    if(c.vibe==='サブカル系' || c.vibe==='古着系') scenes.push('古着屋や小さなギャラリーの近くで、個性的な私服姿を偶然見かけた場面');
    if(c.vibe==='クール系' || c.vibe==='ミステリアス系') scenes.push('夜の駅前や静かな通りで、落ち着いた雰囲気で歩く姿を偶然見かけた場面');
    if(c.vibe==='韓国風' || c.vibe==='中性系') scenes.push('カフェや商業施設の近くで、洗練された私服姿を偶然見かけた場面');
    if(nat==='日本') scenes.push('駅前や商店街、学校やオフィスの近くで、日常の流れの中に自然に溶け込んでいるところを偶然見かけた場面');
    if(nat==='韓国') scenes.push('都会的なカフェ通りや商業施設の近くで、洗練された雰囲気の立ち姿を偶然見かけた場面');
    if(nat==='中国' || nat==='台湾') scenes.push('大型商業施設や夜の街並みの近くで、都会的な私服姿を偶然見かけた場面');
    if(nat==='アメリカ' || nat==='イギリス') scenes.push('大学キャンパス周辺やダウンタウンの歩道で、自然に歩いている姿を偶然見かけた場面');
    if(nat==='フランス') scenes.push('街路樹のある通りやカフェテラスの近くで、さりげなく立っている姿を偶然見かけた場面');
    if(nat==='ブラジル' || nat==='メキシコ') scenes.push('広場やスポーツコートの近くで、活動的で親しみやすい雰囲気の姿を偶然見かけた場面');
    if(nat==='タイ' || nat==='ベトナム') scenes.push('にぎやかな通りや屋外カフェの近くで、軽やかな私服姿を偶然見かけた場面');
    let occPicks = [];
    if(c.occInfluence !== '影響なし' && c.role){
      const rolePool = OCC_SCENES[c.role];
      const catPool = OCC_CAT_SCENES[OCC_CAT[c.role]];
      if(c.occupationMode === '休日'){ scenes.push('休日に、仕事とは違う雰囲気の私服でくつろいで歩く姿を偶然見かけた場面'); }
      else occPicks = (rolePool && rolePool.length ? rolePool : (catPool || [])).slice();
    }
    if(c.role && c.role.includes('商社')) scenes.push('オフィス街の交差点で、書類鞄を持って颯爽と歩く姿を偶然見かけた場面');
    if(c.role && c.role.includes('工場')) scenes.push('工場や作業場の近くで、仕事帰りに私服へ着替えた姿を偶然見かけた場面');
    if(c.vibe==='レトロ系') scenes.push('喫茶店やレコードショップの近くで、レトロな雰囲気の私服姿を偶然見かけた場面');
    if(c.vibe==='バンドマン系') scenes.push('ライブハウスの入り口近くで、機材を持って立っている姿を偶然見かけた場面');
    if(c.vibe==='紳士系') scenes.push('落ち着いたホテルのロビーや上質な街並みで、品のある立ち姿を偶然見かけた場面');
    if(c.vibe==='アウトドア系') scenes.push('公園の入り口やアウトドアショップの前で、身軽な服装でたたずむ姿を偶然見かけた場面');
    if(c.vibe==='ギャル男系') scenes.push('繁華街の通りで、華やかな雰囲気で友人と話している姿を偶然見かけた場面');
    if(c.vibe==='モード系') scenes.push('セレクトショップやギャラリー前で、モードな私服姿を偶然見かけた場面');
    const eraYr = Number(c.eraYear) || 2026;
    let eraScene = null;
    if(eraYr < 1980) eraScene = pick(['駅の伝言板や喫茶店の窓際の近くで、当時らしい落ち着いた私服姿を偶然見かけた場面','商店街のレコード店の前で立ち止まっている姿を偶然見かけた場面']);
    else if(eraYr < 1990) eraScene = '喫茶店や貸レコード店の近くで、時代の空気をまとった私服姿を偶然見かけた場面';
    else if(eraYr < 2000) eraScene = pick(['レンタルビデオ店やゲームセンターの前で、友人を待つ姿を偶然見かけた場面','公衆電話の近くで連絡を待つような姿を偶然見かけた場面']);
    else if(eraYr < 2010) eraScene = 'CDショップや携帯ショップの前で、ふと立ち止まる姿を偶然見かけた場面';
    else if(eraYr < 2020) eraScene = 'カフェの前でスマートフォンを見ながら待ち合わせている姿を偶然見かけた場面';
    else eraScene = 'カフェや商業施設の前で、スマートフォンを片手に自然体でたたずむ姿を偶然見かけた場面';
    if(eraScene){ scenes.push(eraScene); scenes.push(eraScene); }
    const genericScenes = ['信号待ちの交差点で、ふと隣に立っていたところを偶然見かけた場面','自動販売機の前で飲み物を選んでいる姿を偶然見かけた場面','書店の店先で立ち読みをしている姿を偶然見かけた場面','コインランドリーの前で洗濯物を待つ姿を偶然見かけた場面','バス停のベンチでバスを待つ姿を偶然見かけた場面','神社の石段をゆっくり上る姿を偶然見かけた場面','河川敷の遊歩道を歩いている姿を偶然見かけた場面','コンビニの前で買い物袋を提げて立つ姿を偶然見かけた場面','横断歩道を渡りきったところを偶然見かけた場面','公園のベンチでひと息ついている姿を偶然見かけた場面','パン屋の店先で香りに足を止めた姿を偶然見かけた場面','花屋の前で花をながめている姿を偶然見かけた場面','ATMの列に並んでいる姿を偶然見かけた場面','ガード下の道を通り抜ける姿を偶然見かけた場面','歩道橋の上から街を見下ろす姿を偶然見かけた場面','ポストに封筒を投函する姿を偶然見かけた場面','クリーニング店から仕上がりを受け取って出てきた姿を偶然見かけた場面','傘立てから傘を取り出している姿を偶然見かけた場面','立ち食いそば屋ののれんをくぐろうとする姿を偶然見かけた場面','駐輪場で自転車の鍵を外している姿を偶然見かけた場面'];
    scenes.push(pick(genericScenes)); scenes.push(pick(genericScenes));
    const seasonScenes = {
      '春':['桜並木の下を歩く姿を偶然見かけた場面','花見帰りらしい和やかな表情の姿を偶然見かけた場面','春風に髪を押さえながら歩く姿を偶然見かけた場面'],
      '夏':['夕立あがりの濡れた路面を歩く姿を偶然見かけた場面','日陰を選んで歩く夏らしい姿を偶然見かけた場面','夏祭りの帰りらしい雰囲気の姿を偶然見かけた場面'],
      '秋':['紅葉した並木道を歩く姿を偶然見かけた場面','落ち葉を踏みながら歩く姿を偶然見かけた場面','金木犀の香る住宅街を歩く姿を偶然見かけた場面'],
      '冬':['白い息を吐きながら足早に歩く姿を偶然見かけた場面','ポケットに手を入れて歩く冬らしい姿を偶然見かけた場面','イルミネーションの灯る通りを歩く姿を偶然見かけた場面']
    };
    if(c.season && seasonScenes[c.season]) scenes.push(pick(seasonScenes[c.season]), pick(seasonScenes[c.season]));
    const occRate = (c.occupationMode === '勤務帰り' || c.occupationMode === '勤務中') ? .82 : .45;
    let sc = (occPicks.length && Math.random() < occRate) ? pick(occPicks) : pick(scenes);
    const sceneMods = ['夕暮れどき、','朝の澄んだ空気の中、','昼下がり、','日が落ちたばかりの時間帯に、','小雨上がりに、','よく晴れた日に、','曇り空の下、'];
    if(Math.random() < 0.45 && !/^(朝|夜|夕|早朝|昼|休日|非番|開店前|閉店後|白い息|夕立)/.test(sc)) sc = pick(sceneMods) + sc;
    return sc;
  }

  /* ===== V3.2.2 時代別ファッション語彙エンジン（年タグ＋近接年代ウィンドウ） ===== */
  // 項目: [名称, from, peak, to, tags]  tags: c=カジュアル s=ストリート k=きれいめ f=古着 o=オフィス可 p=スポーツ / アウターのみ W=冬 L=春秋 S=夏羽織
  // --- 台形近接ウィンドウ：from-3で立ち上がり、peakで最大、to+8まで残存（15%へ減衰） ---
  function eraItemW(it, y){
    const f = it[1], pk = it[2], t = it[3];
    if(y < f-3 || y > t+8) return 0;
    if(y < f) return 0.5 * (y-(f-3))/3;
    if(y <= t){ const span = Math.max(1, Math.max(pk-f, t-pk)); return 1 + 0.7*(1 - Math.abs(y-pk)/span); }
    return Math.max(0.15, 1 - ((y-t)/8)*0.85);
  }

  // 年齢ラグ：40歳超は55%で「若い頃の年」を参照（最大12年）
  function eraRefYear(y, age){
    const a = Number(age)||25;
    if(a > 40 && Math.random() < 0.55) return y - Math.min(12, Math.round((a-32)*0.45));
    return y;
  }

  function pickEraItem(list, y, tagRe, boostOld){
    const cand = [];
    for(const it of list){
      let w = eraItemW(it, y);
      if(!w) continue;
      if(tagRe && !tagRe.test(it[4]||'')) continue;
      if(boostOld && y > it[3]) w *= 3;
      cand.push([it[0], w]);
    }
    return cand.length ? weighted(cand) : null;
  }

  function eraSilhouetteNote(y){
    if(y < 1975) return '細身〜フレアの70年代前夜シルエット';
    if(y < 1985) return 'アイビー〜プレッピーの端正なシルエット';
    if(y < 1990) return '肩幅にゆとりのある80年代後半シルエット';
    if(y < 1995) return '渋カジ〜キレカジのきれいめカジュアル感';
    if(y < 2000) return '全体にルーズな90年代後半シルエット';
    if(y < 2005) return 'ゆるさの残る2000年代前半シルエット';
    if(y < 2010) return 'Yライン細身の2000年代後半シルエット';
    if(y < 2015) return '細身基調の2010年代前半シルエット';
    if(y < 2020) return 'ノームコア寄りのすっきりした細身シルエット';
    if(y < 2023) return '全体にオーバーサイズの2020年代シルエット';
    return 'オーバーサイズ×Y2Kが混ざる2020年代なかばのシルエット';
  }

  function mbtiStyleNote(mbti){
    const m = String(mbti||'');
    if(!m || m.length < 4) return '';
    const cands = [];
    if(/J$/.test(m)) cands.push('ベーシックな配色で、アイロンの効いた清潔感のある着こなし');
    if(/P$/.test(m)) cands.push('柄物や差し色をその日の気分で取り入れる着こなし');
    if(m[2]==='T') cands.push('モノトーン中心・機能優先の合理的な着こなし');
    if(m[2]==='F') cands.push('柔らかい色味と肌ざわり重視の親しみやすい着こなし');
    return cands.length ? pick(cands) : '';
  }

  const FV_INDEX = (()=>{ const m={}; for(const k of ['top','bottom','shoes','outer']) for(const it of FVOCAB[k]){ if(!m[it[0]]) m[it[0]]=[]; m[it[0]].push(it); } return m; })();

  function fvInWindow(name, y){ const its = FV_INDEX[name]; if(!its) return true; return its.some(it=>eraItemW(it, y) > 0); }

  const FV_SUIT_TYPES = ['紺スーツ','黒スーツ','グレースーツ','三つ揃いスーツ'];

  function applyEraFashionLayer(res, outfitType, eraYear, opts){
    opts = opts || {};
    const y0 = Number(eraYear) || 2026;
    const age = Number(opts.age)||25, season = opts.season || '', vibe = opts.vibe || '';
    const mute = !!opts.mute; // ファッション無頓着：残存期（型落ち）を3倍で引く
    if(FV_SUIT_TYPES.includes(outfitType)){
      res.silhouette = pickEraItem(FVOCAB.suitSil, y0) || '';
      if(Math.random() < 0.65){ const s = pickEraItem(FVOCAB.suitShirt, y0); if(s) res.top = s; }
      if(Math.random() < 0.6){ const s = pickEraItem(FVOCAB.bizShoes, y0); if(s) res.shoes = s; }
      if(season === '夏'){
        if(y0 >= 2005 && Math.random() < 0.45){ res.jacket = '上着なし（クールビズ）'; res.tie = 'ノータイ'; }
        else { res.tie = Math.random() < 0.7 ? (pickEraItem(FVOCAB.suitTie, y0) || '無地ネクタイ') : 'ノータイ'; res.jacket += '（盛夏用の薄手生地）'; }
      } else {
        res.tie = Math.random() < 0.8 ? (pickEraItem(FVOCAB.suitTie, y0) || '無地ネクタイ') : 'ノータイ';
        if(season === '冬') res.coat = pickEraItem(FVOCAB.bizCoat, y0) || 'ステンカラーコート';
        else if(season && Math.random() < 0.35) res.coat = pickEraItem(FVOCAB.bizCoat, y0, /l/) || '';
      }
      return res;
    }
    const tagRe = FASHION_CASUAL_TAGS[outfitType];
    if(!tagRe){
      if(outfitType === 'スポーツ練習着' && Math.random() < 0.5){ const s = pickEraItem(FVOCAB.shoes, y0, /p/); if(s) res.shoes = s; }
      return res;
    }
    const y = eraRefYear(y0, age);
    const oldEra = y0 < 1992; // 現代ベース値の混入を防ぐため旧年代はほぼ全置換
    const forceAll = oldEra || outfitType==='きれいめカジュアル' || outfitType==='古着系'; // 新形式はベースが種値なので常に全置換
    if(Math.random() < (forceAll?1:0.75)){ const t = pickEraItem(FVOCAB.top, y, tagRe, mute) || (forceAll ? pickEraItem(FVOCAB.top, y, null, mute) : null); if(t) res.top = t; }
    if(Math.random() < (forceAll?1:0.75)){ const b = pickEraItem(FVOCAB.bottom, y, tagRe, mute) || (forceAll ? pickEraItem(FVOCAB.bottom, y, null, mute) : null); if(b) res.bottom = b; }
    if(Math.random() < (forceAll?1:0.60)){ const s = pickEraItem(FVOCAB.shoes, y, tagRe, mute) || (forceAll ? pickEraItem(FVOCAB.shoes, y, null, mute) : null); if(s) res.shoes = s; }
    // 置換されなかったベース値の年窓検証（範囲外なら強制差し替え）
    for(const [k, lst] of [['top',FVOCAB.top],['bottom',FVOCAB.bottom],['shoes',FVOCAB.shoes]]){
      if(res[k] && !fvInWindow(res[k], y0)){
        const alt = pickEraItem(lst, y, tagRe, mute) || pickEraItem(lst, y, null, mute);
        if(alt) res[k] = alt;
      }
    }
    // 上着：季節連動
    if(season === '夏'){
      res.jacket = Math.random() < 0.8 ? '指定なし' : (pickEraItem(FVOCAB.outer, y, /S/) || '薄手の羽織りシャツ');
    } else if(season === '冬'){
      const w = pickEraItem(FVOCAB.outer, y, tagRe.source==='k' ? /k.*W|W.*k|[ck]?.*W/ : /W/, mute);
      res.jacket = w || '防寒用の上着';
      if(/サンダル/.test(res.shoes)) res.shoes = pickEraItem(FVOCAB.shoes, y, tagRe, mute) || 'スニーカー';
    } else if(season){
      res.jacket = Math.random() < 0.55 ? (pickEraItem(FVOCAB.outer, y, /L/, mute) || res.jacket) : '指定なし';
    } else if(Math.random() < 0.7){
      const l = pickEraItem(FVOCAB.outer, y, /[LW]/, mute); if(l) res.jacket = l;
    }
    res.eraNote = eraSilhouetteNote(y);
    return res;
  }

  // --- 部位別ブランド ---
  function assignPartBrands(res, outfitType, profile, eraYear, vibe){
    const same = Math.random() < 0.30;
    const denimBrands = eraBrandList(["Levi's",'EDWIN','BIG JOHN','UNIQLO','GU','無印良品','GLOBAL WORK','WEGO','ZARA','無地ノーブランド'], eraYear);
    const sneakerBrands = eraBrandList(['NIKE','adidas','New Balance','PUMA','ASICS','MIZUNO','CONVERSE','VANS','無地ノーブランド'], eraYear);
    const leatherBrands = ['REGAL','HARUTA','無地ノーブランド'];
    if(FV_SUIT_TYPES.includes(outfitType)){
      res.topBrand = pick(profile.formal);
      res.bottomBrand = res.outfitBrand;
      res.shoesBrand = pick(leatherBrands);
      res.outerBrand = res.coat ? pick(profile.formal) : '';
      return res;
    }
    const basePool = outfitType==='ストリート系' ? profile.street : (outfitType==='ジャケットスタイル'||outfitType==='きれいめカジュアル') ? (profile.preppy||profile.casual) : outfitType==='スポーツ練習着' ? profile.sports : profile.casual;
    res.topBrand = same ? res.outfitBrand : pick(basePool);
    res.bottomBrand = same ? res.outfitBrand : (/(デニム|パンツ|チノ|スラックス|カーゴ)/.test(res.bottom) && Math.random()<0.6 ? pick(denimBrands) : pick(basePool));
    res.shoesBrand = same ? res.outfitBrand : (/(スニーカー|シューズ|サンダル|ブーツ)/.test(res.shoes) ? pick(sneakerBrands) : /(ローファー|革靴|チップ|モンク|モカシン)/.test(res.shoes) ? pick(leatherBrands) : pick(basePool));
    res.outerBrand = (res.jacket && res.jacket !== '指定なし' && res.jacket !== 'なし') ? (same ? res.outfitBrand : pick(basePool)) : '';
    return res;
  }

  // ===== V3.2.2 コーデ部位ヘルパー・アクセサリー・季節連動 =====
  const COORD_TYPE_TAG = FASHION_CASUAL_TAGS;

  function eraOptionsFor(kind, c, holiday){
    const y = Number(c.eraYear)||2026;
    const type = holiday ? (c.holidayOutfitType||c.outfitType) : c.outfitType;
    const isSuit = FV_SUIT_TYPES.includes(type);
    const season = c.season||'';
    const tagRe = COORD_TYPE_TAG[type] || null;
    const seen = new Set(); const out=[];
    const push=v=>{ if(v && !seen.has(v)){ seen.add(v); out.push(v); } };
    if(kind==='jacket'){
      push('指定なし');
      if(isSuit){ push('テーラードジャケット'); if(season==='夏' && y>=2005) push('上着なし（クールビズ）'); FVOCAB.bizCoat.forEach(it=>{ if(eraItemW(it,y)>0) push(it[0]); }); }
      const sre = season==='夏' ? /S/ : season==='冬' ? /W/ : /[LWS]/;
      FVOCAB.outer.forEach(it=>{ if(eraItemW(it,y)>0 && sre.test(it[4]||'')) push(it[0]); });
      return out;
    }
    if(kind==='top'){ (isSuit?FVOCAB.suitShirt:FVOCAB.top).forEach(it=>{ if(eraItemW(it,y)>0 && (isSuit || !tagRe || tagRe.test(it[4]||''))) push(it[0]); }); if(!isSuit && tagRe) FVOCAB.top.forEach(it=>{ if(eraItemW(it,y)>0) push(it[0]); }); return out; }
    if(kind==='bottom'){ FVOCAB.bottom.forEach(it=>{ if(eraItemW(it,y)>0 && (!tagRe || tagRe.test(it[4]||''))) push(it[0]); }); FVOCAB.bottom.forEach(it=>{ if(eraItemW(it,y)>0) push(it[0]); }); return out; }
    if(kind==='shoes'){ (isSuit?FVOCAB.bizShoes:FVOCAB.shoes).forEach(it=>{ if(eraItemW(it,y)>0 && (isSuit || !tagRe || tagRe.test(it[4]||''))) push(it[0]); }); if(!isSuit) FVOCAB.shoes.forEach(it=>{ if(eraItemW(it,y)>0) push(it[0]); }); return out; }
    if(kind==='tie'){ push('ノータイ'); FVOCAB.suitTie.forEach(it=>{ if(eraItemW(it,y)>0) push(it[0]); }); return out; }
    if(kind==='sil'){ FVOCAB.suitSil.forEach(it=>{ if(eraItemW(it,y)>0) push(it[0]); }); return out; }
    return out;
  }

  function partBrandRedraw(c, kind, holiday){
    const y = c.eraYear; const type = holiday ? (c.holidayOutfitType||c.outfitType) : c.outfitType;
    const isSuit = FV_SUIT_TYPES.includes(type);
    const denim = eraBrandList(["Levi's",'EDWIN','BIG JOHN','UNIQLO','GU','無印良品','GLOBAL WORK','WEGO','ZARA','無地ノーブランド'], y);
    const snk = eraBrandList(['NIKE','adidas','New Balance','PUMA','ASICS','MIZUNO','CONVERSE','VANS','無地ノーブランド'], y);
    const lth = ['REGAL','HARUTA','無地ノーブランド'];
    const cas = eraBrandList(['UNIQLO','GU','無印良品','BEAMS','UNITED ARROWS','SHIPS','GLOBAL WORK','URBAN RESEARCH','JOURNAL STANDARD','WEGO','coen','無地ノーブランド'], y);
    const fml = eraBrandList(['AOKI','ORIHICA','SUIT SELECT','THE SUIT COMPANY','洋服の青山','はるやま','無地ノーブランド'], y);
    const P = k => holiday ? 'holiday'+k[0].toUpperCase()+k.slice(1) : k;
    if(kind==='top') c[P('topBrand')] = isSuit ? pick(fml) : pick(cas);
    if(kind==='bottom') c[P('bottomBrand')] = isSuit ? (holiday?c.holidayOutfitBrand:c.outfitBrand) : (/(デニム|カーゴ|チノ)/.test(holiday?c.holidayBottom:c.bottom)?pick(denim):pick(cas));
    if(kind==='shoes') c[P('shoesBrand')] = /(スニーカー|シューズ|サンダル|ブーツ)/.test(holiday?c.holidayShoes:c.shoes) ? pick(snk) : pick(lth);
    if(kind==='jacket'){ const j = holiday?c.holidayJacket:c.jacket; c[holiday?'holidayOuterBrand':'outerBrand'] = (j && j!=='指定なし' && j!=='なし' && !/クールビズ/.test(j)) ? pick(cas) : ''; }
  }

  function rerollCoordPart(c, kind, holiday){
    const y = Number(c.eraYear)||2026; const yy = eraRefYear(y, c.age);
    const type = holiday ? (c.holidayOutfitType||c.outfitType) : c.outfitType;
    const isSuit = FV_SUIT_TYPES.includes(type);
    const tagRe = COORD_TYPE_TAG[type] || null;
    const P = k => holiday ? 'holiday'+k[0].toUpperCase()+k.slice(1) : k;
    if(kind==='jacket'){
      const season=c.season||'';
      let v;
      if(isSuit){ if(season==='夏' && y>=2005 && Math.random()<0.45){ v='上着なし（クールビズ）'; if(!holiday) c.tie='ノータイ'; } else v='テーラードジャケット'; if(season==='冬' && !holiday) c.coat = pickEraItem(FVOCAB.bizCoat,y)||'ステンカラーコート'; }
      else if(season==='夏') v = Math.random()<0.8?'指定なし':(pickEraItem(FVOCAB.outer,yy,/S/)||'薄手の羽織りシャツ');
      else if(season==='冬') v = pickEraItem(FVOCAB.outer,yy,/W/)||'防寒用の上着';
      else v = Math.random()<0.55?(pickEraItem(FVOCAB.outer,yy,/L/)||'指定なし'):'指定なし';
      c[holiday?'holidayJacket':'jacket']=v;
    }
    if(kind==='top') c[holiday?'holidayTop':'top'] = (isSuit?pickEraItem(FVOCAB.suitShirt,y):pickEraItem(FVOCAB.top,yy,tagRe)) || (holiday?c.holidayTop:c.top);
    if(kind==='bottom') c[holiday?'holidayBottom':'bottom'] = (isSuit?(holiday?c.holidayBottom:c.bottom):pickEraItem(FVOCAB.bottom,yy,tagRe)) || (holiday?c.holidayBottom:c.bottom);
    if(kind==='shoes') c[holiday?'holidayShoes':'shoes'] = (isSuit?pickEraItem(FVOCAB.bizShoes,y):pickEraItem(FVOCAB.shoes,yy,tagRe)) || (holiday?c.holidayShoes:c.shoes);
    if(kind==='tie') c.tie = Math.random()<0.8?(pickEraItem(FVOCAB.suitTie,y)||'無地ネクタイ'):'ノータイ';
    if(kind==='sil') c.suitSilhouette = pickEraItem(FVOCAB.suitSil,y)||c.suitSilhouette;
    partBrandRedraw(c, kind, holiday);
  }

  function generateAccessories(c, holiday){
    const y = Number(c.eraYear)||2026, age = Number(c.age)||25;
    const role = String(c.role||''), vibe = String(c.vibe||'');
    const type = holiday ? (c.holidayOutfitType||'') : (c.outfitType||'');
    const isSuit = FV_SUIT_TYPES.includes(type);
    const list = [];
    // 時計
    if(age>=25 && Math.random()<0.55){
      const inc = Number((String(c.incomeText||'').match(/約(\d+)万円/)||[])[1])||0;
      if(inc>=700 && Math.random()<0.5) list.push('機械式の高級腕時計');
      else if(y>=2016 && /IT|エンジニア|Web|プログラ/.test(role) && Math.random()<0.6) list.push('スマートウォッチ');
      else if(/現場|職人|整備|工場|大工|鳶|農|漁|建設|自衛官|消防/.test(role)) list.push('タフネス系デジタル腕時計');
      else if(/営業|銀行|商社|コンサル|公務員/.test(role)||isSuit) list.push('ビジネス腕時計');
      else list.push(pick(['シンプルな腕時計','革ベルトの腕時計']));
    }
    // ネックレス（スーツ平日は除外）
    if(!(isSuit && !holiday)){
      if(['ストリート系','ホスト系','ギャル男系','やりらふぃー系','ヤンキー系'].includes(vibe) && Math.random()<0.45) list.push(pick(['シルバーチェーンネックレス','喜平ネックレス']));
      else if(vibe==='韓国風' && Math.random()<0.35) list.push('華奢なシルバーネックレス');
      else if(Math.random()<0.08) list.push('シンプルなネックレス');
    }
    // ピアス（1995年以降）
    if(y>=1995 && !ACC_NO_PIERCE.some(r=>role.includes(r))){
      const p = ACC_HI_PIERCE.some(r=>role.includes(r)) ? 0.5 : (['ストリート系','ギャル男系','ホスト系','バンドマン系','やりらふぃー系'].includes(vibe)?0.35:0.08);
      if(Math.random()<p) list.push(pick(['片耳のシルバーピアス','両耳の小ぶりなピアス']));
    }
    // 夏小物
    if(c.season==='夏' && holiday){
      const sporty = (c.sportsHistory||[]).length>0;
      if(sporty && age<=25 && Math.random()<0.3) list.push('ミサンガ');
      else if(/サンダル|ショートパンツ/.test((c.holidayShoes||'')+(c.holidayBottom||'')) && Math.random()<0.18) list.push('アンクレット');
    }
    return list;
  }

  // zh display line for the muscle-development profile row (ja/en keep the
  // original muscleLine expression at the call site)
  function muscleDevLineZh(c){
    const hist = ((c && c.sportsHistory) || []).filter(x=>x.strength > 0 && SPORT_MUSCLE[x.name]);
    if(!hist.length) return '无（无运动经历影响）';
    const zh = SPORT_MUSCLE_ZH[hist[0].name];
    return zh ? zh[0] : SPORT_MUSCLE[hist[0].name][0];
  }

  function accWorkNote(c){ return ACC_WORK_OFF.some(r=>String(c.role||'').includes(r)) ? '（勤務中は外す）' : ''; }

  function syncMarriageRing(c){
    if(!c) return;
    const married = /既婚|再婚/.test(String(c.maritalText||''));
    const strip = a => (a||[]).filter(x=>!/結婚指輪/.test(x));
    c.accessories = strip(c.accessories); c.holidayAccessories = strip(c.holidayAccessories);
    if(married && Math.random()<0.92){ (c.accessories=c.accessories||[]).push('左薬指に結婚指輪'); (c.holidayAccessories=c.holidayAccessories||[]).push('左薬指に結婚指輪'); }
  }

  function accText(c, holiday, english){
    const l = (holiday?c.holidayAccessories:c.accessories)||[];
    const note = !holiday ? accWorkNote(c) : '';
    if(english) return ` Accessories: ${l.length?l.join(', '):'none'}${note?' (removed while on duty)':''}.`;
    return `アクセサリーは${l.length?l.join('・'):'なし'}${note}。`;
  }

  function applyCoordToCharacter(c, holiday){
    const co = generateCoordinatedOutfit(holiday?(c.holidayOutfitType||c.outfitType):c.outfitType, c.age, false, c.nationality, c.vibe, c.eraYear, c.season, c.mbti);
    if(holiday){
      c.holidayOutfitBrand=co.outfitBrand; c.holidayJacket=co.jacket; c.holidayTop=co.top; c.holidayBottom=co.bottom; c.holidayShoes=co.shoes;
      c.holidaySockBrand=co.sockBrand; c.holidaySockType=co.sockType; c.holidaySockColor=co.sockColor; c.holidaySockUse=co.sockUse;
      c.holidayTopBrand=co.topBrand||''; c.holidayBottomBrand=co.bottomBrand||''; c.holidayShoesBrand=co.shoesBrand||''; c.holidayOuterBrand=co.outerBrand||'';
      c.holidayEraFashionNote=co.eraNote||''; c.holidayStyleNote=co.styleNote||c.holidayStyleNote||'';
    } else {
      c.outfitBrand=co.outfitBrand; c.jacket=co.jacket; c.top=co.top; c.bottom=co.bottom; c.shoes=co.shoes;
      c.sockBrand=co.sockBrand; c.sockType=co.sockType; c.sockShape=co.sockShape; c.sockMaterial=co.sockMaterial; c.sockColor=co.sockColor; c.sockUse=co.sockUse;
      c.topBrand=co.topBrand||''; c.bottomBrand=co.bottomBrand||''; c.shoesBrand=co.shoesBrand||''; c.outerBrand=co.outerBrand||'';
      c.tie=co.tie||''; c.coat=co.coat||''; c.suitSilhouette=co.silhouette||''; c.eraFashionNote=co.eraNote||''; c.styleNote=co.styleNote||c.styleNote||'';
    }
  }

  function refreshSeasonOutfits(c){
    if(!c) return;
    if(!c.workUniform) applyCoordToCharacter(c, false);
    applyCoordToCharacter(c, true);
    applyMuscleFashion(c);
    if(typeof applyFashionSenseFx==='function') applyFashionSenseFx(c);
    const ring = (c.accessories||[]).some(x=>/結婚指輪/.test(x));
    c.accessories = generateAccessories(c, false);
    c.holidayAccessories = generateAccessories(c, true);
    if(ring){ c.accessories.push('左薬指に結婚指輪'); c.holidayAccessories.push('左薬指に結婚指輪'); }
  }

  function generateCoordinatedOutfit(outfitType, age, rareMode, nationality='', vibe='ランダム', eraYear='2026', season='', mbti=''){
    const baseFormalBrands = ['AOKI','ORIHICA','SUIT SELECT','THE SUIT COMPANY','P.S.FA','UNITED ARROWS','SHIPS','nano・universe','KONAKA','五大陸','UNITED TOKYO'];
    const baseCasualBrands = ['UNIQLO','GU','無印良品','BEAMS','UNITED ARROWS','SHIPS','GLOBAL WORK','nano・universe','URBAN RESEARCH','JOURNAL STANDARD','ZARA','H&M','Calvin Klein','POLO RALPH LAUREN','TOMMY HILFIGER','LACOSTE','Champion','THE NORTH FACE','WEGO','niko and...','coen',"FREAK'S STORE",'green label relaxing','RAGEBLUE','HARE',"Lui's",'SENSE OF PLACE','BEAUTY&YOUTH','UNITED TOKYO','COMOLI','AURALEE','mont-bell','Patagonia','GRAMICCI','EDWIN',"Levi's",'BIG JOHN'];
    const baseSportsBrands = ['NIKE','adidas','MIZUNO','ASICS','PUMA','New Balance','UNDER ARMOUR','Champion','DESCENTE','le coq sportif'];
    const schoolBlazerBrands = ['KANKO','TOMBOW','EAST BOY','OLIVE des OLIVE School','学生服メーカー指定なし'];
    const schoolGakuranBrands = ['KANKO','TOMBOW','学生服メーカー指定なし'];
    const profile = {
      formal:[...baseFormalBrands], casual:[...baseCasualBrands], sports:[...baseSportsBrands], street:['NIKE','adidas','Calvin Klein','TOMMY HILFIGER','ZARA','H&M','BEAMS','GU','NEIGHBORHOOD','WTAPS','visvim','nonnative','Supreme','X-LARGE','FR2','HUMAN MADE','Carhartt WIP','WEGO','STUDIOUS','kolor','sacai','N.HOOLYWOOD','White Mountaineering'],
      preppy:['BEAMS','UNITED ARROWS','SHIPS','POLO RALPH LAUREN','LACOSTE','UNIQLO','BEAUTY&YOUTH','green label relaxing'], socksBusiness:['Tabio','靴下屋','Fukuske','POLO RALPH LAUREN','Calvin Klein','無地ノーブランド'], socksCasual:['UNIQLO','無印良品','Tabio','靴下屋','POLO RALPH LAUREN','Calvin Klein','無地ノーブランド']
    };
    if(nationality==='日本'){
      profile.formal = ['AOKI','ORIHICA','SUIT SELECT','P.S.FA','UNITED ARROWS','SHIPS','nano・universe','KONAKA','五大陸','UNITED TOKYO'];
      profile.casual = ['UNIQLO','GU','無印良品','BEAMS','URBAN RESEARCH','JOURNAL STANDARD','GLOBAL WORK','nano・universe','SHIPS','WEGO','niko and...','coen',"FREAK'S STORE",'green label relaxing','RAGEBLUE','HARE',"Lui's",'SENSE OF PLACE','BEAUTY&YOUTH','UNITED TOKYO','COMOLI','AURALEE','mont-bell','GRAMICCI','EDWIN',"Levi's",'BIG JOHN'];
      profile.street = ['NIKE','adidas','GU','BEAMS','Calvin Klein','TOMMY HILFIGER','NEIGHBORHOOD','WTAPS','visvim','nonnative','Supreme','X-LARGE','FR2','HUMAN MADE','Carhartt WIP','WEGO','STUDIOUS','sacai','N.HOOLYWOOD'];
    } else if(nationality==='韓国'){
      profile.formal = ['MUSINSA STANDARD','8seconds','SPAO','ANDERSSON BELL','ZARA','UNIQLO'];
      profile.casual = ['MUSINSA STANDARD','8seconds','SPAO','TOPTEN','Covernat','ZARA','H&M','Calvin Klein','TOMMY HILFIGER'];
      profile.street = ['MUSINSA STANDARD','thisisneverthat','Covernat','ADER error','Calvin Klein','adidas','NIKE','ZARA'];
      profile.preppy = ['8seconds','SPAO','Calvin Klein','LACOSTE','ZARA'];
    } else if(nationality==='中国' || nationality==='台湾'){
      profile.formal = ['UNIQLO','MUJI','ZARA','GXG','SELECTED','HLA'];
      profile.casual = ['UNIQLO','MUJI','ZARA','H&M','Calvin Klein','TOMMY HILFIGER','HLA','Semir','Bosideng'];
      profile.street = ['adidas','NIKE','ZARA','H&M','Calvin Klein','李寧','ANTA'];
    } else if(nationality==='ロシア'){
      const soviet = Number(eraYear) <= 1991;
      profile.formal = soviet ? ['既製の実用衣料'] : ["O'STIN",'Gloria Jeans','ZARA','H&M'];
      profile.casual = soviet ? ['既製の実用衣料'] : ["O'STIN",'Gloria Jeans','Sela','ZARA','H&M','adidas'];
      profile.street = soviet ? ['既製の実用衣料'] : ['adidas','NIKE',"O'STIN",'Gloria Jeans'];
    } else if(nationality==='アメリカ'){
      profile.formal = ['POLO RALPH LAUREN','Calvin Klein','TOM FORD','BROOKS BROTHERS','ZARA','H&M'];
      profile.casual = ['Gap','Old Navy','Carhartt','L.L.Bean','POLO RALPH LAUREN','Calvin Klein','TOMMY HILFIGER','LACOSTE','THE NORTH FACE'];
      profile.street = ['NIKE','adidas','Carhartt','Dickies','Calvin Klein','Champion','THE NORTH FACE'];
      profile.preppy = ['POLO RALPH LAUREN','LACOSTE','BROOKS BROTHERS','L.L.Bean','TOMMY HILFIGER'];
    } else if(nationality==='イギリス'){
      profile.formal = ['Marks & Spencer','Next','TOM FORD','ZARA','H&M'];
      profile.casual = ['Marks & Spencer','Next','Barbour','Fred Perry','Ben Sherman','LACOSTE','H&M'];
      profile.street = ['Fred Perry','Ben Sherman','adidas','NIKE','Champion'];
      profile.preppy = ['Fred Perry','Barbour','Marks & Spencer','LACOSTE'];
    } else if(nationality==='フランス'){
      profile.formal = ['A.P.C.','agnès b.','ZARA','H&M','Calvin Klein'];
      profile.casual = ['A.P.C.','agnès b.','SAINT JAMES','LACOSTE','ZARA','H&M'];
      profile.street = ['A.P.C.','NIKE','adidas','LACOSTE'];
      profile.preppy = ['SAINT JAMES','LACOSTE','agnès b.'];
    } else if(nationality==='ドイツ'){
      profile.formal = ['Hugo Boss','s.Oliver','ZARA','H&M'];
      profile.casual = ['s.Oliver','Jack Wolfskin','Hugo Boss','ZARA','H&M','adidas'];
      profile.street = ['adidas','PUMA','Jack Wolfskin','NIKE'];
    } else if(nationality==='イタリア'){
      profile.formal = ['Hugo Boss','Diesel','ZARA','Benetton'];
      profile.casual = ['Diesel','Benetton','Fila','Stone Island','ZARA','H&M'];
      profile.street = ['Diesel','Stone Island','Fila','NIKE','adidas'];
    } else if(nationality==='スペイン' || nationality==='アルゼンチン'){
      profile.formal = ['Massimo Dutti','ZARA','Mango','H&M'];
      profile.casual = ['ZARA','Massimo Dutti','Pull&Bear','Mango','Desigual','H&M'];
      profile.street = ['Pull&Bear','ZARA','NIKE','adidas'];
    } else if(['ブラジル','メキシコ'].includes(nationality)){
      profile.casual = nationality==='ブラジル' ? ['Hering','Osklen','Havaianas','NIKE','adidas','ZARA','H&M'] : ['NIKE','adidas','PUMA','ZARA','H&M','Calvin Klein','TOMMY HILFIGER'];
      profile.sports = ['NIKE','adidas','PUMA','New Balance','UNDER ARMOUR'];
      profile.street = ['NIKE','adidas','PUMA','Calvin Klein','ZARA'];
    } else if(['タイ','ベトナム'].includes(nationality)){
      profile.casual = ['UNIQLO','MUJI','ZARA','H&M','Calvin Klein','TOMMY HILFIGER'];
      profile.street = ['NIKE','adidas','ZARA','H&M','Calvin Klein'];
    }
    if(vibe==='韓国風'){ profile.casual = ['MUSINSA STANDARD','8seconds','SPAO','Calvin Klein','ZARA','ANDERSSON BELL']; profile.preppy = ['8seconds','SPAO','Calvin Klein','LACOSTE']; }
    if(vibe==='やりらふぃー系' || vibe==='ストリート系'){ profile.street = ['NIKE','adidas','Calvin Klein','TOMMY HILFIGER','GU','ZARA','H&M']; }
    if(vibe==='真面目系' || vibe==='大人っぽい系'){ profile.formal = [...new Set(profile.formal.concat(['AOKI','ORIHICA','SUIT SELECT','BROOKS BROTHERS']))]; }
    const eraY = Number(eraYear) || 2026;
    if(!nationality || nationality==='日本'){
      if(eraY < 1990){
        profile.preppy = [...new Set(profile.preppy.concat(['VAN','JUN','MEN\'S BIGI','TAKEO KIKUCHI']))];
        profile.casual = [...new Set(profile.casual.concat(['VAN','JUN','MEN\'S BIGI','COMME des GARÇONS HOMME']))];
        profile.formal = [...new Set(profile.formal.concat(['D\'URBAN','洋服の青山','はるやま']))];
      } else if(eraY < 2005){
        profile.street = [...new Set(profile.street.concat(['A BATHING APE','UNDERCOVER','Stüssy']))];
        profile.casual = [...new Set(profile.casual.concat(['GAP','TAKEO KIKUCHI']))];
      } else if(eraY < 2015){
        profile.casual = [...new Set(profile.casual.concat(['GAP']))];
        profile.street = [...new Set(profile.street.concat(['Stüssy']))];
      }
    }
    Object.keys(profile).forEach(k=>{ profile[k] = eraBrandList(profile[k], eraYear, '無地ノーブランド'); });
    const blazerBrandsEra = eraBrandList(schoolBlazerBrands, eraYear, '学生服メーカー指定なし');
    const gakuranBrandsEra = eraBrandList(schoolGakuranBrands, eraYear, '学生服メーカー指定なし');
    const res = { outfitBrand:'無地ノーブランド', jacket:'指定なし', top:'白シャツ', bottom:'黒スラックス', shoes:'黒革靴', sockBrand:'Tabio', sockType:'ビジネスソックス', sockShape:'クルー丈', sockMaterial:'綿＋ナイロン', sockColor:'黒', sockUse:'新品に近い' };

    if(['紺スーツ','黒スーツ','グレースーツ'].includes(outfitType)){
      res.outfitBrand = pick(profile.formal);
      res.jacket = 'テーラードジャケット';
      res.top = weighted([['白シャツ',5],['サックスブルーシャツ',2],['ネクタイ付きシャツ',3]]);
      res.bottom = outfitType==='黒スーツ'?'黒スラックス':outfitType==='グレースーツ'?'グレースラックス':'紺スラックス';
      res.shoes = weighted([['黒革靴',5],['茶革靴',2],['ローファー',2]]);
      res.sockBrand = pick(profile.socksBusiness);
      res.sockType = weighted([['ビジネスソックス',6],['柄ありビジネスソックス', rareMode?3:1]]);
      res.sockShape = '薄手ビジネス形状';
      res.sockMaterial = weighted([['綿＋ナイロン',4],['薄手ナイロン混',3],['綿混',2]]);
      res.sockColor = res.sockType.includes('柄') ? weighted([['ネイビー地ストライプ',4],['黒地ドット',2],['アーガイル柄',2]]) : weighted([['黒',5],['紺',4],['チャコール',3],['グレー',2],['ブラウン',1]]);
    } else if(outfitType==='ジャケットスタイル'){
      res.outfitBrand = pick(vibe==='韓国風'?profile.preppy:profile.casual);
      res.jacket = weighted([['テーラードジャケット',4],['カーディガン',2],['ステンカラーコート',1]]);
      res.top = vibe==='韓国風' ? weighted([['白シャツ',3],['ニット',3],['ポロシャツ',2],['無地Tシャツ',2]]) : weighted([['白シャツ',4],['サックスブルーシャツ',2],['ポロシャツ',2],['ニット',2]]);
      res.bottom = weighted([['黒スラックス',3],['紺スラックス',3],['グレースラックス',2],['チノパン',2]]);
      res.shoes = weighted([['ローファー',4],['黒革靴',3],['茶革靴',2],['白スニーカー',1]]);
      res.sockBrand = pick(profile.socksBusiness);
      res.sockType = weighted([['ビジネスソックス',4],['柄ありビジネスソックス',2],['クルー丈ソックス',2]]);
      res.sockShape = res.sockType.includes('ビジネス') ? '薄手ビジネス形状' : 'クルー丈';
      res.sockMaterial = res.sockType.includes('ビジネス') ? '綿＋ナイロン' : '綿混';
      res.sockColor = res.sockType.includes('柄') ? weighted([['アーガイル柄',3],['ネイビー地ストライプ',3],['黒地ドット',2]]) : weighted([['黒',4],['紺',4],['チャコール',3],['グレー',2]]);
    } else if(outfitType==='社会人カジュアル'){
      res.outfitBrand = pick(vibe==='真面目系'||vibe==='大人っぽい系'?profile.preppy:profile.casual);
      res.jacket = weighted([['指定なし',3],['テーラードジャケット',1],['カーディガン',2],['パーカー',2],['ステンカラーコート',1]]);
      res.top = vibe==='韓国風' ? weighted([['無地Tシャツ',2],['ニット',3],['白シャツ',3],['ポロシャツ',2]]) : weighted([['無地Tシャツ',3],['ロングスリーブTシャツ',2],['ポロシャツ',3],['ニット',2],['白シャツ',2],['スウェット',2]]);
      res.bottom = weighted([['チノパン',3],['黒スラックス',2],['紺スラックス',2],['デニム',2],['ワイドパンツ',1]]);
      res.shoes = weighted([['白スニーカー',3],['黒スニーカー',3],['ローファー',2],['茶革靴',1],['キャンバススニーカー',2]]);
      res.sockBrand = pick(profile.socksCasual);
      res.sockType = res.shoes.includes('スニーカー')||res.shoes.includes('キャンバス') ? weighted([['くるぶしソックス',4],['インビジブルソックス',3],['クルー丈ソックス',2],['ワンポイントソックス',2]]) : weighted([['ビジネスソックス',2],['クルー丈ソックス',3],['柄ありビジネスソックス',1]]);
      res.sockShape = res.sockType==='インビジブルソックス' ? 'インビジブル丈' : res.sockType==='くるぶしソックス' ? 'くるぶし丈' : 'クルー丈';
      res.sockMaterial = weighted([['綿混',3],['綿＋ナイロン',2],['リブ編みコットン',2],['薄手ナイロン混',1]]);
      res.sockColor = res.sockType.includes('柄') ? weighted([['アーガイル柄',2],['ネイビー地ストライプ',2],['黒地ドット',1]]) : weighted([['白',3],['黒',3],['紺',2],['グレー',2],['チャコール',1]]);
    } else if(outfitType==='大学生カジュアル' || outfitType==='私服通学風'){
      res.outfitBrand = pick(vibe==='韓国風'?profile.casual:(vibe==='やりらふぃー系'||vibe==='ストリート系'||vibe==='陽キャ大学生系'?profile.street:profile.casual));
      res.jacket = vibe==='韓国風' ? weighted([['指定なし',3],['カーディガン',2],['デニムジャケット',1],['パーカー',2]]) : weighted([['指定なし',3],['パーカー',3],['カーディガン',2],['MA-1',1],['デニムジャケット',1],['ナイロンジャケット',1]]);
      res.top = vibe==='韓国風' ? weighted([['無地Tシャツ',3],['ニット',3],['ロングスリーブTシャツ',2],['オーバーサイズTシャツ',2]]) : weighted([['無地Tシャツ',4],['オーバーサイズTシャツ',3],['ロングスリーブTシャツ',2],['スウェット',3],['パーカー',2],['ポロシャツ',1]]);
      res.bottom = vibe==='やりらふぃー系' ? weighted([['ワイドパンツ',3],['カーゴパンツ',3],['デニム',2],['黒ショートパンツ',2]]) : weighted([['デニム',4],['ストレートデニム',3],['チノパン',3],['カーゴパンツ',2],['ワイドパンツ',2],['黒ショートパンツ',1]]);
      res.shoes = vibe==='韓国風' ? weighted([['白スニーカー',4],['黒スニーカー',3],['キャンバススニーカー',2]]) : weighted([['白スニーカー',4],['黒スニーカー',3],['キャンバススニーカー',3],['ローファー',1],['サンダル', rareMode?2:1]]);
      res.sockBrand = pick(eraBrandList(['UNIQLO','無印良品','Tabio','靴下屋','NIKE','adidas','Champion','PUMA','New Balance','Calvin Klein','無地ノーブランド'], eraYear));
      res.sockType = res.shoes==='サンダル' ? weighted([['インビジブルソックス',4],['くるぶしソックス',2],['クルー丈ソックス',1]]) : weighted([['くるぶしソックス',4],['クルー丈ソックス',3],['ワンポイントソックス',2],['ライン入りソックス',2],['ロゴ入りソックス',1],['インビジブルソックス',2]]);
      res.sockShape = res.sockType==='インビジブルソックス' ? 'インビジブル丈' : res.sockType==='くるぶしソックス' ? 'くるぶし丈' : 'クルー丈';
      res.sockMaterial = weighted([['綿混',4],['リブ編みコットン',2],['綿＋ナイロン',2],['パイル編み',1]]);
      res.sockColor = res.sockType.includes('ライン') ? 'ライン入り白' : res.sockType.includes('ロゴ') || res.sockType.includes('ワンポイント') ? weighted([['白',3],['黒',3],['グレー',2]]) : weighted([['白',3],['黒',3],['グレー',3],['紺',2],['チャコール',1]]);
    } else if(outfitType==='スポーツ練習着'){
      res.outfitBrand = pick(profile.sports);
      res.jacket = weighted([['スポーツジャケット',3],['指定なし',2],['ナイロンジャケット',2],['パーカー',1]]);
      res.top = weighted([['スポーツシャツ',5],['ゲームシャツ',2],['無地Tシャツ',1]]);
      res.bottom = weighted([['ジャージパンツ',4],['ナイロンパンツ',3],['黒ショートパンツ',2],['ハーフパンツ',2]]);
      res.shoes = weighted([['ランニングシューズ',4],['白スニーカー',1],['黒スニーカー',1],['サッカースパイク', age<28?2:1],['バスケットシューズ', age<28?2:1]]);
      res.sockBrand = pick(profile.sports);
      res.sockType = weighted([['スポーツソックス',5],['クルー丈ソックス',3],['ライン入りソックス',2],['ロゴ入りソックス',2]]);
      res.sockShape = weighted([['クルー丈',4],['厚手スポーツ形状',4],['ミドル丈',2]]);
      res.sockMaterial = weighted([['吸汗速乾素材',5],['パイル編み',3],['綿＋ナイロン',2]]);
      res.sockColor = weighted([['白',4],['黒',3],['ライン入り白',3],['グレー',1]]);
    } else if(outfitType==='学生服（ブレザー）' || outfitType==='制服風コーデ'){
      res.outfitBrand = pick(blazerBrandsEra);
      res.jacket = '学生ブレザー';
      res.top = weighted([['ブレザー用シャツ',4],['制服用ワイシャツ',4],['ネクタイ付きシャツ',3]]);
      res.bottom = 'ブレザー用スラックス';
      res.shoes = weighted([['ローファー',5],['黒革靴',2]]);
      res.sockBrand = pick(eraBrandList(['Tabio','靴下屋','Fukuske','POLO RALPH LAUREN','無地ノーブランド'], eraYear));
      res.sockType = weighted([['ビジネスソックス',4],['柄ありビジネスソックス',1],['クルー丈ソックス',2]]);
      res.sockShape = weighted([['クルー丈',3],['薄手ビジネス形状',4]]);
      res.sockMaterial = weighted([['綿＋ナイロン',4],['綿混',3]]);
      res.sockColor = res.sockType.includes('柄') ? weighted([['ネイビー地ストライプ',3],['アーガイル柄',2]]) : weighted([['紺',4],['黒',3],['チャコール',2],['グレー',1]]);
    } else if(outfitType==='学生服（学ラン）'){
      res.outfitBrand = pick(gakuranBrandsEra);
      res.jacket = '学ラン上着';
      res.top = '制服用ワイシャツ';
      res.bottom = '学ラン用ズボン';
      res.shoes = weighted([['黒革靴',4],['ローファー',3]]);
      res.sockBrand = pick(eraBrandList(['Tabio','靴下屋','Fukuske','無地ノーブランド'], eraYear));
      res.sockType = weighted([['ビジネスソックス',5],['クルー丈ソックス',2],['柄ありビジネスソックス', rareMode?2:1]]);
      res.sockShape = weighted([['クルー丈',3],['薄手ビジネス形状',4]]);
      res.sockMaterial = weighted([['綿＋ナイロン',4],['綿混',3]]);
      res.sockColor = res.sockType.includes('柄') ? weighted([['黒地ドット',2],['ネイビー地ストライプ',2]]) : weighted([['黒',4],['紺',3],['チャコール',2]]);
    } else if(outfitType==='ストリート系'){
      res.outfitBrand = pick(profile.street);
      res.jacket = weighted([['指定なし',2],['MA-1',2],['スタジャン',2],['パーカー',3],['デニムジャケット',1]]);
      res.top = vibe==='やりらふぃー系' ? weighted([['オーバーサイズTシャツ',4],['パーカー',3],['ゲームシャツ',2],['スウェット',2]]) : weighted([['オーバーサイズTシャツ',4],['無地Tシャツ',3],['スウェット',3],['ゲームシャツ',2],['パーカー',2]]);
      res.bottom = weighted([['ワイドパンツ',3],['カーゴパンツ',3],['デニム',2],['黒ショートパンツ',1]]);
      res.shoes = weighted([['白スニーカー',4],['黒スニーカー',4],['キャンバススニーカー',3],['ブーツ',1]]);
      res.sockBrand = pick(eraBrandList(['NIKE','adidas','Champion','PUMA','New Balance','UNIQLO','Calvin Klein','無地ノーブランド'], eraYear));
      res.sockType = weighted([['クルー丈ソックス',4],['ライン入りソックス',3],['ロゴ入りソックス',2],['ワンポイントソックス',2]]);
      res.sockShape = weighted([['クルー丈',5],['ミドル丈',2]]);
      res.sockMaterial = weighted([['綿混',3],['パイル編み',2],['リブ編みコットン',2]]);
      res.sockColor = res.sockType.includes('ライン') ? 'ライン入り白' : weighted([['白',4],['黒',4],['グレー',2]]);
    } else if(outfitType==='きれいめカジュアル'){
      res.outfitBrand = pick(profile.preppy || profile.casual);
      res.jacket = weighted([['指定なし',3],['テーラードジャケット',3],['カーディガン',2],['ノーカラージャケット',1]]);
      res.top = weighted([['白シャツ',3],['ニット',3],['バンドカラーシャツ',2],['無地カットソー',2],['ポロシャツ',1]]);
      res.bottom = weighted([['黒スラックス',3],['ワイドスラックス',2],['テーパードパンツ',3],['白パンツ（マリン）',1],['チノパン',2]]);
      res.shoes = weighted([['ローファー',4],['白レザースニーカー（スタンスミス風）',3],['サイドゴアブーツ',2],['茶革靴',1]]);
      res.sockBrand = pick(profile.socksBusiness || ['Tabio','靴下屋','無地ノーブランド']);
      res.sockType = weighted([['クルー丈ソックス',3],['ビジネスソックス',3],['インビジブルソックス',2]]);
      res.sockShape = res.sockType==='インビジブルソックス' ? 'インビジブル丈' : 'クルー丈';
      res.sockMaterial = weighted([['綿混',3],['綿＋ナイロン',3],['リブ編みコットン',2]]);
      res.sockColor = weighted([['黒',4],['白',3],['グレー',2],['ベージュ',1]]);
    } else if(outfitType==='古着系'){
      res.outfitBrand = pick(eraBrandList(['古着（ブランド不詳）','WEGO',"FREAK'S STORE",'無地ノーブランド'], eraYear, '古着（ブランド不詳）'));
      res.jacket = weighted([['指定なし',3],['デニムジャケット',2],['コーデュロイジャケット',2],['スウィングトップ',1],['ミリタリーM-65',1]]);
      res.top = weighted([['バンドTシャツ',3],['チェックのネルシャツ',3],['カレッジロゴスウェット',2],['アメカジ無地ポケT',2],['ダンガリーシャツ',1]]);
      res.bottom = weighted([['ダメージリペアの古着リーバイス風',3],['太畝コーデュロイ（古着）',2],['ミリタリーチノ（M-41風）',2],['ストレートデニム',2]]);
      res.shoes = weighted([['キャンバススニーカー',3],['ワークブーツ（赤茶）',2],['レトロランニングシューズ',2],['コインローファー（HARUTA風）',1]]);
      res.sockBrand = pick(eraBrandList(['無地ノーブランド','UNIQLO','Tabio','Champion'], eraYear));
      res.sockType = weighted([['クルー丈ソックス',4],['ライン入りソックス',2],['ワンポイントソックス',2]]);
      res.sockShape = 'クルー丈';
      res.sockMaterial = weighted([['綿混',4],['リブ編みコットン',3]]);
      res.sockColor = weighted([['白',3],['生成り',2],['黒',2],['グレー',2]]);
      res.sockUse = '味の出た使用感';
    }

    res.sockUse = weighted([['新品に近い',1],['自然な使用感',4],['少し履き込まれている',4],['毛羽立ちが少しある',2],['スポーツ後の自然な使用感', outfitType==='スポーツ練習着'?4:1],['清潔だが生活感あり',3]].filter(x=>x[1]>0));
    applyEraFashionLayer(res, outfitType, eraYear, {age, season, vibe});
    assignPartBrands(res, outfitType, profile, eraYear, vibe);
    res.styleNote = Math.random() < 0.5 ? mbtiStyleNote(mbti) : '';
    return res;
  }

  // ===== V3.2.2 笑い方（表情変化）モジュール =====
  function chooseSmileTraits(c){
    const fp=String(c.facePreset||''), vibe=String(c.vibe||'');
    const cute=/童顔|パピー|くしゃ笑い|たれ目|犬系|親しみ|大学生/.test(fp)||['韓国風','スポーツ系','元気系','爽やか系'].includes(vibe);
    const cool=/クール|ミステリアス|塩顔|しょうゆ|モデル/.test(fp)||['クール系','ミステリアス系','紳士系'].includes(vibe);
    const W=(arr,f)=>weighted(arr.map(v=>[v,f(v)]));
    return {
      smileEyes: W(SMILE_EYES,v=>/糸のよう|垂れ目になる|涙袋笑い/.test(v)?(cute?5:cool?0.6:2):/変わらない|見開いて/.test(v)?(cool?4:1):2),
      smileStyle: W(SMILE_STYLES,v=>/くしゃ笑い|大口|八重歯|横に大きく/.test(v)?(cute?5:cool?0.5:2):/控えめ|照れ笑い|ニヒル|息が漏れる/.test(v)?(cool?4:1.5):2),
      cheekSmile: W(CHEEK_SMILES,v=>{ const hollow=/こけ|薄くシャープ|影になる/.test(String(c.cheek||'')); if(/リンゴ|柔らかく持ち上がる/.test(v)) return hollow?0.4:(cute?5:1.5); if(/シャープ/.test(v)) return hollow?4:(cool?4:1); return 2; }),
      mouthCorner: W(MOUTH_CORNERS,v=>/上がり気味/.test(v)?(cute?4:2):/への字/.test(v)?(cool?2.5:1):2)
    };
  }
  function smileLine(c, english=false){
    if(!c.smileEyes) return '';
    if(english) return ` Smile traits: ${c.smileEyes}; ${c.smileStyle}; ${c.cheekSmile}; ${c.mouthCorner}.`;
    return `笑い方の特徴：${c.smileEyes}。${c.smileStyle}。${c.cheekSmile}。${c.mouthCorner}。`;
  }
  function snapLine(c, english=false){
    const m = c && c.snapMode;
    if(m==='他撮りスナップ風') return english
      ? `\n[PHOTO STYLE] Candid snapshot taken by a friend: slightly low angle, phone-flash feel at night, mild motion blur and slight defocus, everyday cluttered background allowed — an unposed split-second moment, not studio-perfect.`
      : `\n【撮影演出】友人が撮った日常スナップ風にする：ローアングル気味の画角、夜ならスマホのフラッシュ感、軽い手ブレとわずかなピンボケ、生活感のある背景の粗さを許容し、作り込んでいない一瞬の空気を出す。ポーズは自然でカメラを意識しすぎない。`;
    if(m==='自撮り風') return english
      ? `\n[PHOTO STYLE] Selfie style: arm's-length wide-angle framing with slight perspective distortion, eyes to the lens, ambient indoor light, casual close distance.`
      : `\n【撮影演出】自撮り風にする：腕を伸ばした広角気味の画角（軽いパース歪み）、視線はレンズへ、室内の環境光、顔がやや大きめに写るカジュアルな距離感。`;
    return '';
  }

  function applyEraFashionTwist(res, outfitType, eraYear){
    const casualTypes = ['大学生カジュアル','社会人カジュアル','私服通学風','ストリート系','ジャケットスタイル'];
    if(!casualTypes.includes(outfitType)) return res;
    const y = Number(eraYear) || 2026;
    let tops = null, bottoms = null;
    if(y < 1980){ tops = ['開襟シャツ','ポロシャツ（アイビー風）','タートルネックニット','チェックのボタンダウンシャツ','ベスト付きシャツスタイル']; bottoms = ['スラックス','ベルボトム風スラックス','コーデュロイパンツ']; }
    else if(y < 1990){ tops = ['ポロシャツ','ボタンダウンシャツ','薄手のクルーネックニット','スタジャン風トップス']; bottoms = ['チノパン','タック入りスラックス','ストレートデニム']; }
    else if(y < 2000){ tops = ['オーバーサイズTシャツ','チェックのネルシャツ','無地スウェット','ポロシャツ']; bottoms = ['ルーズストレートデニム','ケミカルウォッシュデニム','カーゴパンツ','チノパン']; }
    else if(y < 2010){ tops = ['レイヤード風Tシャツ','七分袖カットソー','細身のシャツ']; bottoms = ['ダメージ加工デニム','ブーツカットデニム','細身のチノパン']; }
    else if(y < 2020){ tops = ['白Tシャツ','無地カットソー','オックスフォードシャツ']; bottoms = ['黒スキニーパンツ','スキニーデニム','テーパードパンツ']; }
    else { tops = ['オーバーサイズTシャツ','ビッグシルエットシャツ','ニットベスト重ねスタイル']; bottoms = ['ワイドパンツ','ワイドデニム','バルーンパンツ']; }
    if(tops && Math.random() < 0.6) res.top = pick(tops);
    if(bottoms && Math.random() < 0.6) res.bottom = pick(bottoms);
    return res;
  }

  function mbtiProfile(code){
    const groups = {
      guardian:['ISTJ','ISFJ','ESTJ','ESFJ'], analyst:['INTJ','INTP','ENTJ','ENTP'], social:['ESTP','ESFP','ENFP','ENFJ'], creative:['ISFP','INFP','ISTP','INFJ']
    };
    if(groups.guardian.includes(code)) return {vibes:[['真面目系',4],['清楚系',3],['大人っぽい系',3],['きれいめ系',2],['紳士系',2]], roles:[['若手社会人',4],['事務職風',3],['営業職風',3],['研究職風',2]], outfits:[['紺スーツ',4],['グレースーツ',3],['ジャケットスタイル',3],['社会人カジュアル',2]]};
    if(groups.analyst.includes(code)) return {vibes:[['クール系',4],['ミステリアス系',3],['サブカル系',2],['真面目系',2],['モード系',2]], roles:[['研究職風',4],['IT系会社員風',4],['クリエイター風',2],['フリーランス風',2]], outfits:[['黒スーツ',3],['ジャケットスタイル',3],['社会人カジュアル',2],['ストリート系',1],['大学生カジュアル',1]]};
    if(groups.social.includes(code)) return {vibes:[['やりらふぃー系',3],['陽キャ大学生系',3],['スポーツ系',3],['爽やか系',2],['ワイルド系',2],['ギャル男系',1],['アウトドア系',1]], roles:[['販売員風',3],['モデル風',3],['インストラクター風',3],['スポーツ経験者',3],['俳優風',2]], outfits:[['ストリート系',4],['スポーツ練習着',3],['大学生カジュアル',3],['私服通学風',2]]};
    return {vibes:[['中性系',3],['塩顔系',3],['サブカル系',3],['古着系',2],['カジュアル系',2],['バンドマン系',2],['レトロ系',2]], roles:[['クリエイター風',4],['フリーランス風',3],['大学生風の成人男性',3],['モデル風',2],['販売員風',1]], outfits:[['大学生カジュアル',3],['社会人カジュアル',3],['ジャケットスタイル',2],['ストリート系',2],['私服通学風',2]]};
  }

  function chooseVibeByMbti(mbti, age){
    let entries = mbtiProfile(mbti).vibes.map(([v,w])=>[v,w]);
    if(age !== undefined){
      entries = entries.filter(([v])=>!(VIBE_AGE_MAX[v] && age > VIBE_AGE_MAX[v]));
      if(age >= 55){ [['おじさん系',2],['紳士系',2],['大人っぽい系',2],['レトロ系',2],['地味系',1]].forEach(([v,w])=>{ const f = entries.find(x=>x[0]===v); if(f) f[1]+=w; else entries.push([v,w]); }); }
      if(!entries.length) entries = [['大人っぽい系',1],['普通系',1]];
    }
    return weighted(entries);
  }

  function chooseOutfitByMbti(age, rareMode, vibe, mbti){
    const profile = mbtiProfile(mbti);
    const candidate = weighted(profile.outfits);
    if(candidate && pools.outfitTypes.includes(candidate)) return candidate;
    return chooseOutfit(age, rareMode, vibe);
  }

  // ===== V1.9.1: 職業システム =====
  const OCC_CAT = {};

  function occupationOptionsHTML(selected, includeRandom=true){
    const en = (typeof ST.uiLang!=='undefined' && ST.uiLang==='en');
    const esc = v=>String(v).replace(/"/g,'&quot;');
    let h = includeRandom ? `<option value="ランダム"${selected==='ランダム'?' selected':''}>${displayOptionLabel('role','ランダム')}</option>` : '';
    if(selected && selected!=='ランダム' && !OCC_CAT[selected]) h += `<option value="${esc(selected)}" selected>${selected}</option>`;
    for(const cat of OCC_CAT_ORDER){
      const items = OCCUPATIONS.filter(([,c])=>c===cat);
      if(!items.length) continue;
      const lab = OCC_CAT_LABELS[cat] ? LT(OCC_CAT_LABELS[cat].ja, OCC_CAT_LABELS[cat].en, OCC_CAT_LABELS[cat].zh) : cat;
      h += `<optgroup label="${esc(lab)}">` + items.map(([n])=>`<option value="${esc(n)}"${String(selected)===n?' selected':''}>${(typeof displayOptionLabel==='function') ? displayOptionLabel('role', n) : n}</option>`).join('') + `</optgroup>`;
    }
    return h;
  }

  const SUIT_TYPES = ['紺スーツ','黒スーツ','グレースーツ'];

  const SCHOOL_TYPES = ['学生服（学ラン）','学生服（ブレザー）','制服風コーデ'];

  function occOutfitBlocklist(occ){
    if(!occ) return [];
    const cat = OCC_CAT[occ];
    let block = SCHOOL_TYPES.slice();
    if(cat==='student'){ block = SCHOOL_TYPES.concat(occ==='就活中の大学生' ? [] : SUIT_TYPES); }
    else if(['消防士','警察官','自衛官'].includes(occ)) block = block.concat(SUIT_TYPES);
    else if(['大工','自動車整備士','電気工事士','農家','漁師','工場勤務','配送ドライバー'].includes(occ)) block = block.concat(SUIT_TYPES);
    else if(['バーテンダー','ホテルスタッフ'].includes(occ)) block = block.concat(['スポーツ練習着']);
    else if(occ==='プロゲーマー' || occ==='YouTuber' || occ==='古着屋店主' || occ==='悠々自適（定年後）') block = block.concat(SUIT_TYPES);
    return block;
  }

  function chooseUniformVariant(role, season){
    const list = UNIFORM_VARIANTS[role];
    if(!list) return null;
    const entries = list.map(v=>{
      let w = v[5] || 1;
      if(v[6] === 'summer') w = season === '夏' ? w * 4 : (season === '冬' ? Math.max(0.2, w * 0.2) : w);
      if(v[6] === 'winter') w = season === '冬' ? w * 3 : (season === '夏' ? Math.max(0.3, w * 0.3) : w);
      return [v, w];
    });
    return weighted(entries);
  }

  function occupationOutfitWeights(occ){
    const cat = OCC_CAT[occ];
    const special = {
      '銀行員':[['紺スーツ',4],['グレースーツ',3]], '公務員':[['グレースーツ',3],['紺スーツ',2],['社会人カジュアル',1]],
      'ミュージシャン':[['ストリート系',3],['大学生カジュアル',2]], 'アパレル店員':[['ストリート系',2],['ジャケットスタイル',2],['大学生カジュアル',2]],
      'ジムトレーナー':[['スポーツ練習着',3],['大学生カジュアル',2]], 'スポーツインストラクター':[['スポーツ練習着',3],['大学生カジュアル',2]], 'プロスポーツ選手':[['スポーツ練習着',3],['社会人カジュアル',1]],
      'バーテンダー':[['黒スーツ',3],['ジャケットスタイル',2]], 'ホテルスタッフ':[['紺スーツ',2],['ジャケットスタイル',2]], '喫茶店マスター':[['ジャケットスタイル',3],['社会人カジュアル',2]],
      'お笑い芸人':[['大学生カジュアル',2],['ジャケットスタイル',2],['ストリート系',1]], 'YouTuber':[['ストリート系',3],['大学生カジュアル',2]], 'プロゲーマー':[['大学生カジュアル',3],['ストリート系',2],['スポーツ練習着',1]], '声優':[['社会人カジュアル',2],['大学生カジュアル',2]],
      '書道家':[['ジャケットスタイル',2],['社会人カジュアル',2]], 'パティシエ':[['社会人カジュアル',3],['大学生カジュアル',1]], '寿司職人':[['社会人カジュアル',3],['大学生カジュアル',1]], 'ラーメン店店主':[['社会人カジュアル',3],['大学生カジュアル',1]], '僧侶':[['社会人カジュアル',3],['ジャケットスタイル',1]], '古着屋店主':[['ストリート系',3],['大学生カジュアル',2]], '悠々自適（定年後）':[['社会人カジュアル',3],['ジャケットスタイル',1],['大学生カジュアル',1]]
    };
    if(special[occ]) return special[occ];
    const byCat = {
      student:[['大学生カジュアル',3],['私服通学風',2],['ストリート系',1]],
      office:[['紺スーツ',3],['グレースーツ',2],['ジャケットスタイル',2],['社会人カジュアル',1]],
      it:[['社会人カジュアル',3],['大学生カジュアル',2],['ジャケットスタイル',1]],
      medical:[['社会人カジュアル',3],['私服通学風',1],['ジャケットスタイル',1]],
      edu:[['ジャケットスタイル',3],['社会人カジュアル',2],['グレースーツ',1]],
      service:[['社会人カジュアル',2],['大学生カジュアル',2],['ジャケットスタイル',1]],
      trade:[['社会人カジュアル',3],['大学生カジュアル',2],['スポーツ練習着',1]],
      creative:[['社会人カジュアル',2],['ストリート系',2],['ジャケットスタイル',2]],
      uniform:[['社会人カジュアル',2],['スポーツ練習着',2],['大学生カジュアル',1]],
      showa:[['グレースーツ',2],['ジャケットスタイル',2],['社会人カジュアル',2]]
    };
    return byCat[cat] || [];
  }

  function occupationBodyWeights(occ){
    const HARD_ATHLETIC = ['消防士','警察官','自衛官','救急隊員','防衛大学校学生','プロスポーツ選手'];
    if(occ==='プロスポーツ選手') return {weights:[['引き締まったスポーツ体型',3],['ラグビー選手体型',2],['バスケットボール選手体型',2],['水泳選手体型',2],['陸上短距離選手体型',2],['サッカー選手体型',2],['筋肉質',2]], exclude:['やせ型','ぽっちゃり','腹だけぽっちゃり']};
    if(HARD_ATHLETIC.includes(occ)) return {weights:[['がっしり体型',4],['引き締まったスポーツ体型',4],['筋肉質',2],['柔道家体型',1],['ラグビー選手体型',2]], exclude:['やせ型','華奢な体型','ぽっちゃり','腹だけぽっちゃり']};
    if(ATHLETIC_OCC.includes(occ)) return {weights:[['がっしり体型',3],['引き締まったスポーツ体型',4],['筋肉質',2],['細マッチョ',2],['水泳選手体型',1]], exclude:['ぽっちゃり','腹だけぽっちゃり']};
    if(occ==='モデル') return {weights:[['高身長モデル体型',4],['細身',3]], exclude:['ぽっちゃり','腹だけぽっちゃり','がっしり体型']};
    if(['飲食店店長','喫茶店マスター'].includes(occ)) return {weights:[['腹だけぽっちゃり',1],['ビール腹',1],['標準体型',1]], exclude:null};
    const cat = OCC_CAT[occ];
    const byCat = {
      trade:{weights:[['がっしり体型',2],['標準体型',1]], exclude:null},
      office:{weights:[['スーツ映え体型',1],['標準体型',1]], exclude:null},
      it:{weights:[['細身',1],['やせ型',1]], exclude:null},
      medical:{weights:[['標準体型',1],['細身',1]], exclude:null},
      edu:{weights:[['細身',1],['標準体型',1]], exclude:null},
      service:{weights:[['細身',1],['標準体型',1]], exclude:null},
      creative:{weights:[['細身',1],['やせ型',1]], exclude:null},
      student:{weights:[['細身',1],['標準体型',1]], exclude:null},
      showa:{weights:[['標準体型',1],['がっしり体型',1]], exclude:null},
      uniform:{weights:[['引き締まったスポーツ体型',1],['標準体型',1]], exclude:null}
    };
    return byCat[cat] || null;
  }

  function chooseSport(role, eraYear){
    const y = Number(eraYear) || 2026;
    if(role === 'プロスポーツ選手'){
      return weighted([['野球',5],['サッカー', y >= 1993 ? 5 : 2],['バスケットボール',3],['バレーボール',2],['ラグビー',2],['柔道',2],['剣道',1],['陸上短距離',2],['陸上長距離',2],['水泳',2],['テニス',2],['卓球',1],['ボクシング',2],['ゴルフ',2],['自転車ロード',1],['体操',1]]);
    }
    if(['体育教師','ジムトレーナー','スポーツインストラクター'].includes(role) && Math.random() < 0.6){
      return pick(SPORTS);
    }
    return 'なし';
  }

  function roleWithSport(c, english=false){
    const hasSport = c.sportName && c.sportName !== 'なし';
    if(english){
      const r = (typeof valueTranslations!=='undefined' && valueTranslations[c.role]) || c.role;
      return hasSport ? `${r} (${(typeof valueTranslations!=='undefined' && valueTranslations[c.sportName]) || c.sportName})` : r;
    }
    return hasSport ? `${c.role}（${c.sportName}）` : (c.role || '');
  }

  function chooseRoleByMbti(age, vibe, mbti, eraYear='2026', gapMode=false){
    const y = Number(eraYear) || 2026;
    const g = {guardian:['ISTJ','ISFJ','ESTJ','ESFJ'], analyst:['INTJ','INTP','ENTJ','ENTP'], social:['ESTP','ESFP','ENFP','ENFJ']};
    const grp = g.guardian.includes(mbti) ? 'guardian' : g.analyst.includes(mbti) ? 'analyst' : g.social.includes(mbti) ? 'social' : 'creative';
    const catW = OCC_MBTI_CAT[grp];
    let entries = OCCUPATIONS.filter(([n,c,since,until,aMin,aMax])=>{
      if(since && y < since) return false;
      if(until && y > until) return false;
      if(aMin && age < aMin) return false;
      if(aMax && age > aMax) return false;
      if(c==='student' && age > 24 && n!=='大学院生') return false;
      return true;
    }).map(([n,c])=>{
      let w = catW[c] || 1;
      if(age <= 22 && c==='student') w += 4;
      if(age > 24 && c==='student') w = Math.max(1, w-1);
      if(y < 1990 && c==='showa') w += 2;
      if(vibe==='スポーツ系' && ATHLETIC_OCC.includes(n)) w += 2;
      if(vibe==='バンドマン系' && n==='ミュージシャン') w += 4;
      if(vibe==='紳士系' && (c==='office' || n==='ホテルスタッフ' || n==='バーテンダー')) w += 2;
      if(vibe==='オタク系' && (c==='it' || n==='書店員' || n==='ゲーム開発者')) w += 2;
      if(vibe==='メガネ知的系' && (c==='edu' || n==='編集者' || n==='大学研究員' || n==='大学院生')) w += 2;
      if((vibe==='ブサイク系' || vibe==='普通系') && n==='お笑い芸人') w += 3;
      if(vibe==='オタク系' && (n==='プロゲーマー' || n==='声優')) w += 2;
      if(vibe==='古着系' && n==='古着屋店主') w += 3;
      if(age >= 60 && ['寿司職人','書道家','僧侶','農家','漁師','喫茶店マスター','大工','俳優','塾講師','ラーメン店店主'].includes(n)) w += 2;
      if(age >= 62 && n==='悠々自適（定年後）') w += 3;
      if(!gapMode && VIBE_OCC[vibe]){
        if(VIBE_OCC[vibe].good.includes(n)) w = w * 3 + 3;
        if(VIBE_OCC[vibe].bad.includes(n)) w = w * 0.3;
      }
      return [n, w];
    });
    return weighted(entries) || '営業職';
  }

  function occupationHairWeights(occ){
    if(STRICT_HAIR_OCC.includes(occ)) return [['黒',4],['黒に近いダークブラウン',1]];
    if(FREE_HAIR_OCC.includes(occ)) return [['明るめブラウン',3],['アッシュブラウン',3],['グレージュ',2],['自然な茶髪',2],['ハイトーンアッシュ',1]];
    return null;
  }

  function occupationFaceWeights(occ){
    const special = {
      'お笑い芸人':[['ブサイク系',2],['普通顔',2],['やんちゃ系',1]],
      'モデル':[['高身長モデル系',3],['清潔感のある若手俳優風',1]],
      '俳優':[['清潔感のある若手俳優風',2],['日本の若手俳優風',2]],
      'バーテンダー':[['ミステリアス系',1],['クール系',1],['落ち着いた大人系',1]],
      '僧侶':[['落ち着いた大人系',2],['真面目系',1]]
    };
    if(special[occ]) return special[occ];
    const cat = OCC_CAT[occ];
    const byCat = {
      office:[['スーツ映え社会人系',2],['真面目系',1],['爽やか知的アナウンサー系',1]],
      uniform:[['体育会系スポーツ男子',2],['ワイルド系',1]],
      edu:[['真面目系',1],['落ち着いた大人系',1]],
      medical:[['真面目系',1],['清潔感のある若手俳優風',1]],
      it:[['普通顔',1],['真面目系',1]],
      creative:[['サブカル系',1],['塩顔系',1]],
      enta:[['やんちゃ系',1],['普通顔',1]],
      trade:[['ワイルド系',1],['普通顔',1]],
      service:[['親しみやすい大学生系',1],['普通顔',1]],
      showa:[['昭和顔（濃い顔立ち）',2],['落ち着いた大人系',1]]
    };
    return byCat[cat] || null;
  }

  const SPORT_STAGES = ['幼稚園','小学校','中学校','高校','大学','社会人'];

  function maxStageForAge(age){ if(age>=23) return 5; if(age>=19) return 4; if(age>=16) return 3; if(age>=13) return 2; if(age>=7) return 1; return 0; }

  function chooseSkin(role, season, sportName, hist, ethnicSkin){
    const TAN = {'ほんのり日焼けした肌':1,'少し日焼けした肌':2,'小麦色に日焼けした肌':3,'しっかり日焼けした肌':4,'屋外仕事のこんがり日焼け肌':5};
    const baseSkin = ethnicSkin || '健康的な肌質';
    const outdoorJob = /農家|漁師|大工|とび職|庭師|造園|土木|建設|林業|警備員|郵便配達|引越|自衛官|プロスポーツ選手|スポーツインストラクター|ライフセーバー|海の家/.test(String(role||''));
    const outdoorSport = /野球|サッカー|ラグビー|テニス|ソフトテニス|陸上|自転車|ゴルフ|アメリカンフットボール|ボート|スキー/.test(String(sportName||'')) || (hist||[]).some(x=>x.strength>0 && /野球|サッカー|ラグビー|テニス|陸上|自転車|ゴルフ/.test(x.name));
    const summer = season === '夏';
    const winter = season === '冬';
    const pale = /色白|透明感/.test(baseSkin);
    if(/褐色/.test(baseSkin)){
      if((outdoorJob || (summer && outdoorSport)) && Math.random() < 0.35) return baseSkin === '深い褐色の肌' ? '日差しでいっそう深まった深い褐色の肌' : '日差しでいっそう深まった褐色の肌';
      return baseSkin;
    }
    // 人種既定の肌を基準（w=10）に、日焼け5段階を環境で上乗せする
    const entries = [[baseSkin, 10]];
    for(const [v,t] of Object.entries(TAN)){
      let w = [1.6, 1.1, 0.5, 0.2, 0.1][t-1];
      if(outdoorJob) w += t * 1.6;
      if(outdoorSport) w += Math.min(t, 3) * 1.1;
      if(summer) w *= (t >= 3 ? 1.8 : 1.4);
      if(winter) w *= (t >= 4 ? 0.4 : t >= 3 ? 0.6 : 0.85);
      if(pale) w *= 0.4;
      entries.push([v, w]);
    }
    return weighted(entries);
  }

  // 成人男性の運動部・クラブ経験率 約78.9%／種目シェアは公的統計を参考にした重み
  function sportExpPick(age, exclude){
    const a = Number(age)||25;
    let list = SPORT_EXP_WEIGHTS.map(x=>x.slice());
    const adj=(name,f)=>{ const it=list.find(x=>x[0]===name); if(it) it[1]*=f; };
    if(a<=35){ adj('サッカー',1.5); adj('野球',0.85); adj('バドミントン',1.25); adj('バスケットボール',1.15); }
    if(a>=45){ adj('野球',1.3); adj('剣道',1.8); adj('柔道',1.8); adj('サッカー',0.6); adj('ソフトテニス',1.3); adj('卓球',1.2); }
    if(exclude && exclude.length) list = list.filter(x=>!exclude.includes(x[0]));
    return weighted(list.map(x=>[x[0], x[1]]));
  }

  function generateSportsHistory(age, role, sportName, influenceMode){
    const maxSt = maxStageForAge(Number(age)||25);
    const infl = influenceMode === '影響なし' ? 0 : influenceMode === '控えめ' ? 0.5 : influenceMode === '強め' ? 1.5 : 1;
    const mkStrength = (from,to)=>{
      const stages = to - from + 1;
      const gap = maxSt - to;
      const decay = gap<=0 ? 1 : gap===1 ? 0.7 : gap===2 ? 0.5 : 0.35;
      const personal = 0.5 + Math.random()*0.7;
      if(infl === 0) return 0;
      if(Math.random() < 0.15) return 0;
      return Math.round(stages * decay * personal * infl * 100)/100;
    };
    const hist = [];
    if(role === 'プロスポーツ選手' && sportName && sportName !== 'なし'){
      const from = Math.random() < 0.6 ? 1 : 2;
      hist.push({name: sportName, from, to: maxSt, strength: Math.max(1.5, (maxSt-from+1) * (0.7+Math.random()*0.5))});
      if(Math.random() < 0.25){
        let nm; let g=0; do{ nm = sportExpPick(age, [sportName]); g++; }while(nm===sportName && g<10);
        const f2 = rnd(0,2,1); const t2 = rnd(f2, Math.min(2, maxSt), 1);
        hist.push({name:nm, from:f2, to:t2, strength: mkStrength(f2,t2)*0.5});
      }
      return hist;
    }
    const r = Math.random();
    const count = r < 0.211 ? 0 : r < 0.80 ? 1 : 2; // 経験なし≒21.1%（経験率78.9%）
    const used = [];
    for(let i=0;i<count;i++){
      const nm = sportExpPick(age, used);
      used.push(nm);
      let from, to;
      if(nm === '水泳' && Math.random() < 0.6){ from = 0; to = Math.min(rnd(0,1,1), maxSt); }
      else { from = rnd(0, Math.min(3, maxSt), 1); to = rnd(from, maxSt, 1); }
      hist.push({name:nm, from, to, strength: mkStrength(from,to)});
    }
    hist.sort((a,b)=> (b.to-b.from) - (a.to-a.from));
    if(hist.length===2) hist[1].strength = Math.round(hist[1].strength * 0.5 * 100)/100;
    return hist;
  }

  function sportsHistoryText(c, lang='ja'){
    const zhMode = lang === 'zh', enMode = lang === 'en';
    const h = (c && c.sportsHistory) || [];
    if(!h.length) return zhMode ? '无（文化系・不参加社团）' : enMode ? 'None (non-athletic)' : 'なし（文化系・帰宅部）';
    if(zhMode) return h.map(x=>`${displayValue('sportName',x.name)}（${SPORT_STAGES_ZH[SPORT_STAGES[x.from]]||SPORT_STAGES[x.from]}${x.from===x.to?'':'〜'+(SPORT_STAGES_ZH[SPORT_STAGES[x.to]]||SPORT_STAGES[x.to])}）`).join('／');
    if(enMode) return h.map(x=>{ const f=promptValue(SPORT_STAGES[x.from]), t=promptValue(SPORT_STAGES[x.to]);
      return `${promptValue(x.name)} (${f}${x.from===x.to?'':'–'+t})`; }).join(', ');
    return h.map(x=>`${x.name}（${SPORT_STAGES[x.from]}${x.from===x.to?'':'〜'+SPORT_STAGES[x.to]}）`).join('／');
  }

  function muscleLine(c, english=false, brief=false){
    const hist = (c.sportsHistory || []).filter(x=>x.strength > 0 && SPORT_MUSCLE[x.name]);
    if(!hist.length) return '';
    const bt = String(c.bodyType || '');
    const chubby = /ぽっちゃり|ビール腹|腹だけ/.test(bt);
    const frail = /やせ型|華奢/.test(bt);
    const main = hist[0];
    const mm = SPORT_MUSCLE[main.name];
    let tier = (c.role === 'プロスポーツ選手' && main.name === c.sportName) || main.strength >= 2 ? 2 : main.strength >= 0.8 ? 1 : 0;
    if(frail && tier === 2) tier = 1;
    if(brief){
      if(tier < 2 || chubby) return '';
      return english ? ` Even through his clothes, the build of his ${mm[3] || mm[1]} reads clearly.` : `服の上からも${mm[2]}の厚みが分かる。`;
    }
    const tl = String(c.trainingLevel || '');
    const guardJa = /ボディビル級|パワー系|フィジーク級/.test(tl) ? '筋肉の発達は設定した体型・体重の範囲内で描き、体型そのものは変えない。' : '筋肉の発達は設定した体型・体重の範囲内のメリハリとして描き、体型そのものは変えない。ボディビル的な誇張や血管の強調はしない。';
    const guardEn = ' Depict this development only as definition within his set body type and weight — never altering the body type itself, and never bodybuilder-style exaggeration or vein emphasis.';
    let core, coreEn;
    if(chubby){
      core = `今の体型の下に、${main.name}経験で鍛えた${mm[2]}の名残が感じられる`;
      coreEn = `beneath his current build, traces of ${mm[2]} training from his ${main.name} days remain`;
    } else if(tier === 2){
      core = `${mm[0]}がしっかり発達している`;
      coreEn = `${mm[1]} are well developed`;
      const longCareer = (main.to - main.from + 1) >= 4 || (c.role === 'プロスポーツ選手' && main.name === c.sportName);
      if(longCareer){
        const sk = SPORT_SKELETON[main.name];
        core += sk ? `。長い競技歴により筋肉だけでなく骨格にも競技の跡が出ており、${sk[0]}になっている` : `。長い競技歴により、筋肉のつき方そのものが${main.name}特有の形に仕上がっている`;
        coreEn += sk ? `. His long career shows even in his bone structure: ${sk[1]}` : `. His long career has shaped his musculature into a distinctly ${main.name}-specific form`;
      }
    } else if(tier === 1){
      core = `${mm[0]}にほどよい発達がある`;
      coreEn = `${mm[1]} show moderate development`;
    } else {
      core = `学生時代の${main.name}で鍛えた${mm[2]}の名残がうっすら残る`;
      coreEn = `a faint trace of ${mm[2]} from his school-days ${main.name} remains`;
    }
    const sub = hist[1];
    let subJa = '', subEn = '';
    if(sub && sub.strength >= 0.8 && SPORT_MUSCLE[sub.name] && !chubby){
      subJa = `加えて、${sub.name}由来の${SPORT_MUSCLE[sub.name][2]}の発達も見て取れる。`;
      subEn = ` In addition, ${sub.name}-derived development of the ${SPORT_MUSCLE[sub.name][2]} is visible.`;
    }
    if(english) return ` Muscle development: ${coreEn}.${subEn}${guardEn}`;
    return `発達部位：${core}。${subJa}${guardJa}`;
  }

  function chooseTrainingLevel(c){
    const y = Number(c.eraYear) || 2026;
    const age = Number(c.age) || 30;
    const role = String(c.role || '');
    const list = TRAINING_LEVELS.map(([n,w])=>{
      let weight = w;
      if(n === 'ボディビル級（過剰な筋肥大）' && y < 1990) weight = 0;
      if(n === 'フィジーク級（大会レベルの絞りと逆三角形）' && y < 2010) weight = 0;
      if(n === '機能系（クロスフィット・自重上級）' && y < 2005) weight = 0;
      if(/ジム習慣|細マッチョ仕上げ/.test(n) && y < 1985) weight *= 0.2;
      if(age >= 65 && /フィジーク級|ボディビル級|パワー系/.test(n)) weight *= 0.2;
      if(['ジムトレーナー','スポーツインストラクター','プロスポーツ選手','消防士','自衛官','警察官','救急隊員'].includes(role) && /しっかり|細マッチョ仕上げ|機能系|フィジーク級/.test(n)) weight *= 2.5;
      if(role === 'モデル' && /ボディビル級|パワー系/.test(n)) weight = 0;
      if(sportsInfluence(c, /ラグビー|アメリカンフットボール|相撲/) >= 1 && n === 'パワー系（厚み重視の剛力体型）') weight *= 2;
      if(sportsInfluence(c, /体操|クライミング/) >= 1 && n === '機能系（クロスフィット・自重上級）') weight *= 2;
      if(sportsInfluence(c, /水泳/) >= 1 && n === 'フィジーク級（大会レベルの絞りと逆三角形）') weight *= 1.5;
      return [n, weight];
    }).filter(([,w])=>w > 0);
    return weighted(list);
  }

  function trainingWeightAdj(level){
    if(level === 'ボディビル級（過剰な筋肥大）') return 4.5;
    if(level === 'パワー系（厚み重視の剛力体型）') return 5.5;
    if(level === 'フィジーク級（大会レベルの絞りと逆三角形）') return 1.5;
    if(level === 'しっかり鍛えている（中級）') return 1;
    return 0;
  }

  function bodyRealismLine(c, english=false){
    const parts = [];
    if(c.posture && c.posture !== '自然な立ち姿') parts.push(english ? POSTURE_EN[c.posture] : c.posture);
    if(c.bodyAsym && c.bodyAsym !== 'なし') parts.push(english ? BODY_ASYM_EN[c.bodyAsym] : c.bodyAsym);
    if(!parts.length) return '';
    return english ? ` Body realism: ${parts.join('; ')} — keep it subtle and anatomically natural, never a deformity.` : `体の実在感：${parts.join('、')}。ごく控えめに、解剖学的に自然な範囲で描き、変形や誇張にはしない。`;
  }

  function hairDetailLine(c, english=false){
    const parts = [];
    if(c.hairVolume && c.hairVolume !== '標準的な毛量') parts.push(english ? (c.hairVolume==='毛量多め'?'thick, dense hair volume':'thin hair volume') : `毛量は${c.hairVolume}`);
    if(c.bangs && c.bangs !== '指定なし') parts.push(english ? `bangs: ${valueTranslations[c.bangs] || c.bangs}` : `前髪は${c.bangs}`);
    if(c.hairFinish && c.hairFinish !== '指定なし') parts.push(english ? `styling: ${valueTranslations[c.hairFinish] || c.hairFinish}` : `整髪は${c.hairFinish}`);
    if(!parts.length) return '';
    return english ? ` ${parts.join('; ')}.` : `${parts.join('、')}。`;
  }

  function trainingLine(c, english=false){
    const lv = c.trainingLevel || 'なし';
    const d = TRAINING_DESC[lv];
    if(!d) return '';
    const guard = lv === 'ボディビル級（過剰な筋肥大）'
      ? (english ? ' Keep the hypertrophy within what real professional bodybuilders achieve — no balloon-like AI distortion, no broken joints, and keep his head-to-body ratio intact.' : '筋肥大は実在のプロビルダーの範囲にとどめ、AI的な風船状の変形・関節の破綻をさせず、頭身比は維持する。')
      : (/フィジーク級|パワー系/.test(lv)
        ? (english ? ' No competition-stage staging.' : '大会ステージ的な演出はしない。')
        : '');
    return english ? ` Training habit (${lv}): ${d[1]}.${guard}` : `筋トレ習慣「${lv}」：${d[0]}。${guard}`;
  }

  function sportsHistoryLine(c, english=false){
    const h = (c && c.sportsHistory) || [];
    if(!h.length) return english ? ' Sports background: none (non-athletic school years).' : '経験競技：なし（文化系・帰宅部）。'
    const mark = st => st===0 ? '・体格影響なし' : st>=2 ? '・影響しっかり' : st>=0.8 ? '・影響ほどよく' : '・影響名残';
    const txt = h.map(x=>`${x.name}（${SPORT_STAGES[x.from]}${x.from===x.to?'':'〜'+SPORT_STAGES[x.to]}${mark(x.strength)}）`).join('／');
    return english ? ` Sports background: ${txt}.` : `経験競技：${txt}。`;
  }

  function sportsInfluence(c, regex){
    return ((c && c.sportsHistory) || []).reduce((a,x)=> a + (regex.test(x.name) ? (x.strength||0) : 0), 0);
  }

  function bioLine(c, english=false){
    const age = c.age;
    const role = english ? (promptValue(c.role) || c.role) : (c.role || '');
    const hist = ((c && c.sportsHistory) || []);
    const active = hist.filter(x=>x.strength > 0);
    if(c.role === 'プロスポーツ選手' && c.sportName && c.sportName !== 'なし'){
      return english ? `A ${age}-year-old who has devoted himself to ${c.sportName} all the way to the professional stage.` : `${c.sportName}ひと筋でプロの舞台に立つ${age}歳。`;
    }
    if(active.length){
      const m = active[0];
      const span = m.from === m.to ? `${SPORT_STAGES[m.from]}時代に` : `${SPORT_STAGES[m.from]}から${SPORT_STAGES[m.to]}まで`;
      const spanEn = m.from === m.to ? `in ${SPORT_STAGES[m.from]}` : `from ${SPORT_STAGES[m.from]} through ${SPORT_STAGES[m.to]}`;
      const second = active[1] ? `（${active[1].name}も経験）` : '';
      const secondEn = active[1] ? ` (with some ${active[1].name})` : '';
      return english ? `A ${age}-year-old ${role} who threw himself into ${m.name} ${spanEn}${secondEn}.` : `${span}${m.name}に打ち込んだ${second}、${role}の${age}歳。`;
    }
    if(hist.length){
      return english ? `A ${age}-year-old ${role}; his ${hist[0].name} days left little mark on his build.` : `${hist[0].name}の経験はあるが体つきには出ていない、${role}の${age}歳。`;
    }
    return english ? `A ${age}-year-old ${role} who spent his school years outside the sports clubs.` : `運動部とは縁のない学生時代を過ごした、${role}の${age}歳。`;
  }

  function sportYears(x){ const Y=[2,6,3,3,4,5]; let t=0; for(let i=x.from;i<=x.to;i++) t+=Y[i]||3; return t; }

  function buildBioHook(c){
    const age = c.age;
    const roleJa = c.role || '';
    const active = ((c.sportsHistory)||[]).filter(x=>x.strength>0);
    const zero = ((c.sportsHistory)||[]).filter(x=>x.strength===0);
    const cands = [];
    const add = (txt, sc)=>{ if(txt) cands.push([txt, sc]); };
    const y = Number(c.eraYear)||2026;
    // ギャップ・影響ゼロ
    if(zero.length && SPORT_MEM[zero[0].name]) add(`言わなければ絶対に伝わらないが、${zero[0].name}経験者である。${roleJa}、${age}歳。`, 9);
    if(c.holidayPersona) add(`平日は${roleJa}、休日は${c.vibe}。切り替えの早さが取り柄の${age}歳。`, 8);
    // 橋渡し
    const cat = (typeof OCC_CAT!=='undefined') ? OCC_CAT[roleJa] : '';
    if(active.length){
      const br = BRIDGE_HOOK[active[0].name + cat];
      if(br) add(`${br}。${active[0].name}あがりの${roleJa}、${age}歳。`, 7);
    }
    // 競技: 役どころ・情景・数字
    if(active.length && SPORT_MEM[active[0].name]){
      const m = SPORT_MEM[active[0].name]; const sp = active[0];
      add(`${pick(m.ro)}。それが${SPORT_STAGES[sp.to]}までの青春だった。いまは${roleJa}。`, 6);
      add(`いまも${pick(m.sc)}を思い出す、${roleJa}の${age}歳。`, 5);
      add(`${sp.name}歴${sportYears(sp)}年。いまは${roleJa}として生きる${age}歳。`, 5);
      if(sp.strength >= 2) add(`体つきを見れば、聞かなくても${sp.name}をやっていたと分かる。`, 6);
    }
    // 筋トレ
    const th = TRAIN_HOOK[c.trainingLevel];
    if(th) add(`${pick(th)}、${roleJa}の${age}歳。`, /フィジーク|ボディビル|パワー系/.test(c.trainingLevel||'') ? 7 : 5);
    // 職業
    const oh = OCC_HOOK[roleJa];
    if(oh) add(`${pick(oh)}、${age}歳の${roleJa}。`, 5);
    else if(OCC_CAT_HOOK[cat]) add(`${pick(OCC_CAT_HOOK[cat])}、${age}歳の${roleJa}。`, 4);
    // 文化系（履歴なしのみ）
    if(!((c.sportsHistory)||[]).length && (!c.nationality || c.nationality === '日本')){
      const ck = pick(Object.keys(CULT_MEM));
      add(`${pick(CULT_MEM[ck])}。そんな学生時代を過ごした${roleJa}、${age}歳。`, 5);
    }
    // MBTI他己紹介
    if(MBTI_INTRO[c.mbti]) add(`${pick(MBTI_INTRO[c.mbti])}${age}歳。職業は${roleJa}。`, 4);
    const isJP = !c.nationality || c.nationality === '日本';
    const eraKeys = isJP ? Object.keys(ERA_HOOK).map(Number).sort((a,b)=>a-b) : [];
    if(eraKeys.length){ let ek = eraKeys[0]; for(const k of eraKeys){ if(y >= k) ek = k; } add(`${pick(ERA_HOOK[ek])}${age}歳の${roleJa}。`, 3); }
    // 未来・現在進行の一言
    if(active.length) add(`${active[0].name}は辞めた。でも体は覚えている。${roleJa}、${age}歳。`, 4.5);
    if(TRAIN_HOOK[c.trainingLevel] || active.length) add(`${age}歳。まだ体は裏切らない。職業は${roleJa}。`, 3.5);
    add(`${roleJa}${age}年生の${age}歳、という冗談が好きな男。`, 2 + (age<=30?1:0));
    if(c.glasses && c.glasses !== 'なし') add(`眼鏡を外すと誰か分からないと言われる${roleJa}、${age}歳。`, 4);
    // 内面・背景フック（結果画面のみ・プロンプト非反映）
    if(c.myBoomText) add(`最近のマイブームは${c.myBoomText}。${roleJa}、${age}歳。`, 6);
    if(c.hobbyText) add(`休日はもっぱら${String(c.hobbyText).replace(/（.*?）/,'')}。${age}歳の${roleJa}。`, 5.5);
    if(c.birthplaceText && (!c.nationality || c.nationality==='日本')){
      const pref = String(c.birthplaceText).split('：')[0];
      add(`${pref}生まれ。${age}歳の${roleJa}。`, 4.5);
      const dia = (typeof innerDialectOf==='function') ? innerDialectOf(c) : null;
      if(dia) add(`ふとした時に${dia[0]}が出る、${pref}育ちの${roleJa}。`, 5.5);
    }
    if(c.foodLikeText && !/特になし/.test(c.foodLikeText)) add(`${String(c.foodLikeText).replace(/（.*?）/,'')}のためなら行列に並ぶ${age}歳。職業は${roleJa}。`, 4);
    if(c.familyText && /長男|長女|次男|次女|三男|三女/.test(c.familyText) && /既婚|再婚/.test(String(c.maritalText||''))) add(`家では${(String(c.familyText).match(/長男|長女|次男|次女|三男|三女/)||[''])[0]}のパパ、外では${roleJa}。${age}歳。`, 5.5);
    if(c.nicknameText && /「(.+?)」/.test(c.nicknameText)) add(`仲間内では${(String(c.nicknameText).match(/「(.+?)」/)||['',''])[1]}と呼ばれる${roleJa}、${age}歳。`, 4.5);
    if(c.innerDream && !/特に大きな夢/.test(c.innerDream)) add(`ささやかな夢は「${c.innerDream}」。${age}歳の${roleJa}。`, 3.5);
    if(c.memoryText) add(`いまでも${String(c.memoryText).replace(/こと$/,'')}を思い出す。${roleJa}、${age}歳。`, 3.5);
    // 正統派フォールバック
    add(bioLine(c, false), 3.5);
    return weighted(cands.map(([t,sc])=>[t, Math.pow(sc, 1.5)]));
  }

  function muscleSummary(c, lang='ja'){
    const zhMode = lang === 'zh', enMode = lang === 'en';
    const hist = ((c && c.sportsHistory) || []).filter(x=>x.strength > 0 && SPORT_MUSCLE[x.name]);
    if(!hist.length) return zhMode ? '无' : enMode ? 'None' : 'なし';
    const m = hist[0];
    if(zhMode){
      const tierZh = ((c.role === 'プロスポーツ選手' && m.name === c.sportName) || m.strength >= 2) ? '发达' : m.strength >= 0.8 ? '适度' : '留有痕迹';
      const zh = SPORT_MUSCLE_ZH[m.name];
      return `${displayValue('sportName',m.name)}：${zh?zh[1]:SPORT_MUSCLE[m.name][2]}（${tierZh}）${hist[1] && hist[1].strength > 0 ? `／${displayValue('sportName',hist[1].name)}` : ''}`;
    }
    const tierTxt = ((c.role === 'プロスポーツ選手' && m.name === c.sportName) || m.strength >= 2) ? (enMode ? 'well developed' : 'しっかり') : m.strength >= 0.8 ? (enMode ? 'moderate' : 'ほどよく') : (enMode ? 'faint traces' : '名残程度');
    return `${m.name}：${SPORT_MUSCLE[m.name][2]}（${tierTxt}）${hist[1] && hist[1].strength > 0 ? `／${hist[1].name}` : ''}`;
  }

  function isEastAsianLike(nationality, ethnicity){
    return /日本|韓国|中国|台湾|東アジア|アジア/.test(String(nationality||'') + String(ethnicity||''));
  }

  function chooseEyebrow(vibe){
    const sharp = ['クール系','ミステリアス系','紳士系','オラオラ系'].includes(vibe) ? 1.5 : 1;
    const soft = ['犬系男子','癒し系','清楚系','塩顔系'].includes(vibe) ? 1.5 : 1;
    return weighted([
      ['太めの直線眉', 3*sharp], ['太めのアーチ眉', 2],
      ['標準的な直線眉', 4*sharp], ['標準的なゆるいアーチ眉', 5],
      ['やや細めの直線眉', 2], ['やや細めのアーチ眉', 2*soft],
      ['眉尻の下がった優しい眉', 2.5*soft], ['への字型の眉', 1.2],
      ['眉山のはっきりした眉', 2*sharp], ['短めで力強い眉', 1.5*sharp]
    ]);
  }

  function chooseEyelid(nationality, ethnicity){
    const ea = isEastAsianLike(nationality, ethnicity);
    return weighted([
      ['一重', ea?3:0.8], ['奥二重', ea?4:1.5], ['末広二重', ea?4:2.5],
      ['平行二重', ea?2:5], ['左右で異なるまぶた（片方だけ二重）', 0.8]
    ]);
  }

  function chooseEyeShape(){
    return weighted([['標準的な目の形',5],['切れ長の目',3],['アーモンド形の目',3],['丸みのある目',2.5],['たれ目気味の目',2],['つり目気味の目',2],['細めの目',1.5]]);
  }

  function chooseEyelash(){
    return weighted([['短めで控えめなまつ毛',3],['標準的な長さのまつ毛',6],['やや長めのまつ毛',2.5],['長めで濃いまつ毛',1.2],['細くまばらなまつ毛',1.5]]);
  }

  function chooseCheek(c){
    const age = Number(c.age)||30, bt = String(c.bodyType||''), fp = String(c.facePreset||'');
    const highTrain = (typeof HIGH_TRAIN!=='undefined') && HIGH_TRAIN.includes(c.trainingLevel);
    const soft = /ぽっちゃり|がっちり|ビール腹|恰幅|腹だけ/.test(bt), slim = /細身|痩せ|やせ型|華奢|陸上長距離/.test(bt);
    const cute = /童顔|パピー|くしゃ笑い|犬系|親しみ/.test(fp);
    let l = [['標準的な頬',5],['頬骨が高めの頬',2],['ややこけた頬',slim?3:0.8],['ふっくらした頬',soft?4:1.2],['ハリのある引き締まった頬',highTrain?4:1.5],['子供の頃の面影が残る丸い頬',cute?4:(age<=27?1.5:0.3)],['餅のように柔らかそうな頬',soft?2.5:0.6],['薄くシャープな頬',slim?2.5:1],['頬骨の下がすっと影になる頬',slim&&age>=25?2:0.7]];
    if(age>=45) l.push(['年齢なりに少し位置が下がった頬',2.5],['たるみはじめた頬',soft?2.5:1.2]);
    return weighted(l);
  }

  function chooseFaceExtras(c){
    const age = Number(c.age) || 30;
    const bt = String(c.bodyType || '');
    const vibe = String(c.vibe || '');
    const role = String(c.role || '');
    const ea = isEastAsianLike(c.nationality, c.ethnicity);
    const grap = sportsInfluence(c, /柔道|ラグビー|相撲|レスリング|アメリカンフットボール/);
    const nightWork = ['救急隊員','消防士','自衛官','警察官','医師','看護師'].includes(role) || ['it','medical'].includes((typeof OCC_CAT!=='undefined') ? OCC_CAT[role] : '');
    const out = {};
    out.eyebrowDensity = weighted([['濃い眉', ea?3:2],['標準的な濃さの眉',6],['薄めの眉',2]]);
    out.jawChin = weighted([['標準的な顎先',6],['尖り気味の顎先', /細身|やせ型|華奢/.test(bt)?3:1.2],['丸みのある顎先', /ぽっちゃり|ビール腹/.test(bt)?3:1.5],['しっかりした顎先', /筋肉質|がっしり|骨太/.test(bt)?3:1.5],['軽く割れた顎先', ea?0.5:1.2]]);
    out.jawAngle = weighted([['エラは目立たない', /細身|やせ型|華奢/.test(bt)?3:2],['ほどよく張ったエラ',6],['はっきり張ったエラ', (/がっしり|骨太|柔道家|ラグビー/.test(bt)?3:1.2)+grap*0.5]]);
    out.ear = weighted([['標準的な耳',8],['立ち耳',2],['寝た耳',2],['福耳',1.5],['小ぶりな耳',1.5],['柔道耳（軽度の耳介の厚み）', grap>=2?2.5:0]]);
    out.forehead = weighted([['標準的な広さの額',6],['狭めの額',2],['広めの額',2.5]]);
    out.hairline = weighted([['直線的な生え際',5],['ゆるいM字の生え際', age>=30?3:1.5],['富士額の生え際',1.5],['やや後退気味の生え際', age>=40?2:0]]);
    out.cheek = chooseCheek(c);
    out.dimple = weighted([['えくぼなし',8],['片側にえくぼ',1.2],['両側にえくぼ',1.5]]);
    out.mole = weighted([['ほくろなし',10],['目尻の下の泣きぼくろ',1.2],['口元のほくろ',1.2],['顎のほくろ',1],['頬のほくろ',1.2],['首すじのほくろ',1]]);
    out.hairTexture = (c?.ethnicity)==='黒人系' ? weighted([['強いカールのアフロテクスチャ',6],['細かいカールヘア',4],['強いくせ毛',2]]) : weighted([['直毛', ea?5:2.5],['やわらかい猫っ毛',3],['硬めの剛毛',3],['ゆるいくせ毛',2.5],['強いくせ毛', ea?1:2]]);
    out.eyeBags = weighted([['クマなし', 10],['うっすらとした目の下のクマ', nightWork?2.5:0.8]]);
    out.adamsApple = weighted([['のどぼとけは控えめ', /ぽっちゃり|ビール腹/.test(bt)?2.5:1.5],['標準的なのどぼとけ',6],['のどぼとけがはっきり出ている', /細身|やせ型|華奢|細マッチョ/.test(bt)?3:1.5]]);
    out.lipTone = weighted([['血色のよい唇',3],['標準的な血色の唇',6],['やや乾燥気味の唇', c.season==='冬'?3:1.2]]);
    out.browRidge = weighted([['彫りは標準的',6],['彫りが深い眉まわり', ea?1.5:4],['ややフラットな眉まわり', ea?3:1]]);
    out.facialHairGroom = (c.facialHair && c.facialHair !== 'なし')
      ? weighted([['きれいに整えている', ['警察官','自衛官','消防士','救急隊員','防衛大学校学生','銀行員','ホテルスタッフ'].includes(role)?4:2.5],['自然に整えている',6],['伸ばしっぱなし気味', ['バンドマン系','アウトドア系','レトロ系'].includes(vibe)?2.5:1]])
      : '自然に整えている';
    return out;
  }

  function chooseFaceSpacing(vibe){
    const inward = ['クール系','ミステリアス系'].includes(vibe) ? 1.3 : 1;
    const outward = ['犬系男子','清楚系','癒し系'].includes(vibe) ? 1.3 : 1;
    return weighted([[pools.faceSpacings[0], 2*inward],[pools.faceSpacings[1], 4*inward],[pools.faceSpacings[2], 6],[pools.faceSpacings[3], 4*outward],[pools.faceSpacings[4], 2*outward],[pools.faceSpacings[5], 0.8*inward],[pools.faceSpacings[6], 0.8*outward]]);
  }

  function chooseSkinDetail(age, vibe, role, gapMode, exclude, secondary){
    let entries = [['なし（クリアな肌）', secondary ? 26 : 16],['頬にそばかす',2],['鼻まわりに薄いそばかす',2],['額に小さなニキビ',1],['頬にニキビ跡（薄い凹凸）',2],['口元のほくろ',2],['目元の泣きぼくろ',2],['首筋のほくろ',1],['頬の小さなほくろ',2],['うっすら青ひげ（剃り跡）',1],['日焼けによる肌ムラ',1],['えくぼ',1.5],['左頬の薄い傷跡',0.5],['眉尻の剃り込み跡',0.5],['目の下のうっすらしたクマ',1.2],['頬の自然な赤み',1],['額の皮脂感（自然なテカリ）',0.8],['頬の毛穴感（自然な質感）',0.8],['腕まくり日焼けの跡',0.3],['ゴーグル跡の日焼けムラ',0.2],['眉間のしわ',0],['目尻の笑いじわ',0],['ほうれい線',0],['頬の薄いシミ',0],['首のしわ',0]];
    const adj = (v,d) => { const f = entries.find(x=>x[0]===v); if(f) f[1] = Math.max(0.2, f[1]+d); };
    if(!gapMode){
      if(age <= 24){ adj('額に小さなニキビ',2); adj('頬にそばかす',1); adj('額の皮脂感（自然なテカリ）',0.7); }
      if(age >= 30){ adj('額に小さなニキビ',-0.8); }
      if(age >= 40){ adj('うっすら青ひげ（剃り跡）',1); adj('日焼けによる肌ムラ',1); adj('頬にそばかす',-1); adj('眉間のしわ',1.5); adj('目尻の笑いじわ',2); }
      if(age >= 45){ adj('ほうれい線',2); }
      if(age >= 50){ adj('頬の薄いシミ',1.5); }
      if(age >= 60){ adj('首のしわ',1.5); adj('眉間のしわ',1.5); adj('目尻の笑いじわ',1.5); adj('ほうれい線',1.5); adj('頬の薄いシミ',1); adj('なし（クリアな肌）', secondary ? -10 : -6); }
      if(['清楚系','韓国風','ホスト系','きれいめ系','中性系'].includes(vibe)){ adj('なし（クリアな肌）', secondary ? 20 : 14); ['額に小さなニキビ','頬にニキビ跡（薄い凹凸）','うっすら青ひげ（剃り跡）','日焼けによる肌ムラ','頬にそばかす','額の皮脂感（自然なテカリ）','頬の毛穴感（自然な質感）'].forEach(v=>{ const f = entries.find(x=>x[0]===v); if(f) f[1] = f[1]*0.3; }); }
      if(['ブサイク系','おじさん系','ヤンキー系'].includes(vibe)){ adj('頬にニキビ跡（薄い凹凸）',2); adj('うっすら青ひげ（剃り跡）',2); adj('なし（クリアな肌）',-3); }
      if(vibe === 'ヤンキー系') adj('眉尻の剃り込み跡',2);
      if(['ITエンジニア','アプリ開発者','ゲーム開発者','研修医','看護師','救急隊員'].includes(role)) adj('目の下のうっすらしたクマ',1.5);
      if(['アウトドア系','スポーツ系'].includes(vibe) || ['農家','漁師','大工','自動車整備士','電気工事士','工場勤務','配送ドライバー','体育教師','プロスポーツ選手','消防士','自衛官','救急隊員','防衛大学校学生'].includes(role)){ adj('日焼けによる肌ムラ',2); adj('腕まくり日焼けの跡',1.5); }
      if(['プロスポーツ選手','体育教師','ジムトレーナー','スポーツインストラクター'].includes(role) || vibe === 'スポーツ系') adj('ゴーグル跡の日焼けムラ',0.8);
    }
    if(exclude && exclude.length) entries = entries.filter(([v]) => v === 'なし（クリアな肌）' || !exclude.includes(v));
    entries = entries.filter(([,w]) => w > 0);
    return weighted(entries);
  }

  function skinDetailLine(c, english=false){
    const parts = [];
    [c.skinDetail, c.skinDetail2].forEach(v=>{
      if(!v || v === 'なし（クリアな肌）') return;
      String(v).split('＋').forEach(p=>{ if(p && !parts.includes(p)) parts.push(p); });
    });
    if(!parts.length) return '';
    if(english) return ` Skin details: ${parts.map(v=>(typeof valueTranslations!=='undefined' && valueTranslations[v]) || v).join(' and ')} — render them subtly as natural skin texture, never exaggerated and never as grime that undermines his appeal.`;
    return `肌には${parts.join('と')}があり、過度に強調せず自然な質感として描く。キャラクター性を損なう汚れ表現にはしない。`;
  }

  function chooseFacialHair(age, vibe){
    let entries = [['なし',24],['ごく薄い青ひげ',4],['自然な青ひげ',3],['短い無精ひげ',3],['整えた短いひげ',2],['口ひげ',1],['あごひげ',1],['口ひげ＋あごひげ',1],['ワイルドめのひげ',1]];
    if(age >= 35) entries = entries.map(([v,w])=> v==='なし' ? [v, w-8] : ['整えた短いひげ','口ひげ','あごひげ'].includes(v) ? [v, w+2] : [v,w]);
    if(vibe==='おじさん系') entries = entries.map(([v,w])=> v==='なし' ? [v, Math.max(6, w-10)] : [v, w+1]);
    if(vibe==='ワイルド系' || vibe==='ヤンキー系' || vibe==='アウトドア系') entries = entries.map(([v,w])=> ['短い無精ひげ','ワイルドめのひげ'].includes(v) ? [v, w+2] : [v,w]);
    if(['清楚系','真面目系','きれいめ系','韓国風','中性系','ホスト系'].includes(vibe)) entries = entries.map(([v,w])=> v==='なし' ? [v, w+10] : [v, Math.max(1, w-1)]);
    return weighted(entries);
  }

  function chooseGlasses(eraYear, vibe, occupation, age){
    const y = Number(eraYear) || 2026;
    let entries = [['なし',48],['黒縁メガネ',1],['細フレームメガネ',1],['メタルフレームメガネ',1],['丸メガネ',1],['ハーフリムメガネ',1],['縁なしメガネ',1],['金縁メガネ',1]];
    const boost = (name, w) => { const f = entries.find(e=>e[0]===name); if(f) f[1]+=w; };
    if(y < 1990){ boost('金縁メガネ',3); boost('メタルフレームメガネ',2); }
    else if(y < 2005){ boost('細フレームメガネ',3); boost('縁なしメガネ',2); boost('メタルフレームメガネ',1); }
    else { boost('黒縁メガネ',3); boost('丸メガネ',1); boost('ハーフリムメガネ',1); }
    if(vibe==='メガネ知的系'){ entries = entries.map(([v,w])=> v==='なし' ? [v,2] : [v, w+2]); }
    else if(vibe==='オタク系'){ entries = entries.map(([v,w])=> v==='なし' ? [v,14] : [v,w]); boost('黒縁メガネ',4); }
    else if(vibe==='地味系' || vibe==='真面目系'){ entries = entries.map(([v,w])=> v==='なし' ? [v,26] : [v,w]); }
    if(['大学研究員','編集者','大学院生','塾講師','高校教師','薬剤師','建築士','ITエンジニア'].includes(occupation)){ entries = entries.map(([v,w])=> v==='なし' ? [v, Math.max(10, w-14)] : [v, w+1]); }
    if(age !== undefined && age >= 60){ entries = entries.map(([v,w])=> v==='なし' ? [v, Math.round(w*0.55)] : [v, w+1]); }
    return weighted(entries);
  }

  // ===== V1.6.2: 時代設定の反映（顔立ち・体型・髪型・ブランド） =====
  function brandAvailableInEra(brand, year){
    const since = BRAND_SINCE[brand];
    return since === undefined ? true : Number(year) >= since;
  }

  function eraBrandList(arr, year, fallback='無地ノーブランド'){
    const f = (arr||[]).filter(b=>brandAvailableInEra(b, year));
    return f.length ? f : [fallback];
  }

  function warekiOf(y){
    y = Number(y) || 2026;
    const n = (era, base) => { const k = y - base; return `${era}${k === 1 ? '元' : k}年`; };
    if(y >= 2019) return n('令和', 2018);
    if(y >= 1989) return n('平成', 1988);
    if(y >= 1926) return n('昭和', 1925);
    if(y >= 1912) return n('大正', 1911);
    return n('明治', 1867);
  }

  function eraLabel(y, english=false){
    y = Number(y) || 2026;
    return english ? `${y}` : `${y}年（${warekiOf(y)}）`;
  }

  function eraPhotoStyle(y){
    y = Number(y) || 2026;
    if(y < 1930) return ['モノクロの乾板写真風（粒子と滲みのあるクラシックな質感）','a monochrome glass-plate photograph look with heavy grain and soft blur'];
    if(y < 1955) return ['モノクロフィルム写真風','a monochrome film photograph look'];
    if(y < 1975) return ['初期カラーフィルム風（少し退色した色味）','an early color film look with slightly faded tones'];
    if(y < 1990) return ['フィルム写真らしい濃いめの発色','a rich film-photo color look'];
    if(y < 2003) return ['コンパクトフィルムカメラ風の写り','a compact film camera look'];
    if(y < 2013) return ['初期デジタルカメラ風の写り','an early digital camera look'];
    return ['現代のスマホ・ミラーレス風のクリアな写り','a clean modern smartphone/mirrorless look'];
  }

  function scriptOf(nat){
    const m = {'ロシア':'キリル文字','モンゴル':'キリル文字','韓国':'ハングル','中国':'漢字（簡体字）','台湾':'漢字（繁体字）','タイ':'タイ文字','インド':'デーヴァナーガリー文字など現地文字'};
    return m[nat] || '現地語のラテン文字';
  }

  function countryLine(c, english=false){
    const nat = c && c.nationality;
    if(!nat || nat === '日本') return '';
    const natEn = (typeof valueTranslations!=='undefined' && valueTranslations[nat]) || nat;
    if(english) return `The setting is ${natEn}: match the streets, signage (in the local script), vehicles, and passers-by to that country in the same era. `;
    return `舞台は${nat}。街並み・看板の文字（${scriptOf(nat)}）・車両・行き交う人々の装いも${nat}の同年代に合わせる。`;
  }

  function seasonLine(c, english=false){
    const sn = c && c.season;
    if(!sn) return '';
    const M = {
      '春':['季節は春。軽めの羽織りものや柔らかい光、桜や新緑など、春らしい装いと街の様子にする。','It is spring: light layers, soft light, and spring scenery such as cherry blossoms or fresh greenery. '],
      '夏':['季節は夏。半袖や薄手の服、強い日差し、青々とした街路樹など、夏らしい装いと街の様子にする。','It is summer: short sleeves or light fabrics, strong sunlight, and lush summer streets. '],
      '秋':['季節は秋。重ね着や暖色の光、紅葉など、秋らしい装いと街の様子にする。','It is autumn: layered outfits, warm-toned light, and autumn foliage. '],
      '冬':['季節は冬。コートやニットの防寒、冷たく澄んだ空気、冬枯れや雪の気配など、冬らしい装いと街の様子にする。','It is winter: coats and knitwear, crisp cold air, and hints of bare trees or snow. ']
    };
    const m = M[sn];
    if(!m) return '';
    const adj = english ? 'The outfit may be naturally adapted to the season (sleeve length, adding or removing outerwear) while keeping the specified coordination as the base. ' : '（服装は指定コーデを基準に、袖丈やアウターの有無を季節に合わせて自然に調整してよい）';
    return english ? `${m[1]}${adj}` : `${m[0]}${adj}`;
  }

  function eraContextLine(c, english=false){
    const y = c.eraYear || '2026';
    const p = eraPhotoStyle(y);
    if(english) return `Era setting: around ${y}. Match streets, signage, props, vehicles, and garment textures to this period, exclude anything that did not exist yet. ${countryLine(c, true)}${seasonLine(c, true)}Render the image as ${p[1]}.\n`;
    return `時代設定：${eraLabel(y)}頃。街並み・看板・小物・車両・服の質感をこの年代に合わせ、その時代に存在しない物は描かない。${countryLine(c, false)}${seasonLine(c, false)}画の質感は${p[0]}にする。\n`;
  }

  function avgHeight(nationality, eraYear){
    const y = Number(eraYear) || 2026;
    if(!nationality || nationality === '日本'){
      if(y < 1920) return 157; if(y < 1940) return 160; if(y < 1955) return 162;
      if(y < 1970) return 166; if(y < 1985) return 168; if(y < 2000) return 170;
      return 171;
    }
    const MODERN = {'韓国':174,'中国':172,'台湾':172,'タイ':169,'ベトナム':167,'フィリピン':167,'インドネシア':167,'マレーシア':168,'インド':167,'アメリカ':177,'カナダ':177,'イギリス':177,'フランス':176,'スペイン':176,'ドイツ':180,'イタリア':175,'オーストラリア':178,'ブラジル':175,'メキシコ':170,'ロシア':176,'スウェーデン':180,'ポーランド':178,'トルコ':174,'モンゴル':170,'ナイジェリア':170,'アルゼンチン':174};
    const m = MODERN[nationality] || 172;
    const decay = y >= 2000 ? 0 : Math.min(8, Math.round((2000 - y) * 0.07));
    return m - decay;
  }

  function pickHeightAround(avg){
    const off = weighted([[0,6],[1,5],[-1,5],[2,4],[-2,4],[3,3],[-3,3],[4,2],[-4,2],[5,1.5],[-5,1.5],[7,1],[-7,1],[10,0.5],[-10,0.5],[12,0.25],[-12,0.25]]);
    return Math.max(155, Math.min(196, Math.round(avg + Number(off))));
  }

  function footFromHeight(height, ethnicity){
    const bonus = ['白人系','黒人系','スラブ系','北欧系','南欧系'].includes(ethnicity) ? 0.5 : 0;
    const fl = Number(weighted([[0,5],[0.5,4],[-0.5,4],[1,2],[-1,2],[1.5,1],[-1.5,1]]));
    const sizeUp = Number(weighted([[0.5,6],[1.0,4]]));
    let f = (Number(height) || 171) * 0.149 + bonus + fl + sizeUp;
    f = Math.round(f * 2) / 2;
    f = Math.max(25.5, Math.min(31.0, f));
    return `${f.toFixed(1).replace('.0','')}cm`;
  }

  function eraProfile(year){
    const y = Number(year) || 2026;
    if(y < 1946) return {
      labelJa: y < 1912 ? '明治末期' : (y < 1927 ? '大正時代' : '昭和戦前・戦中期'), labelEn: 'prewar-era Japan',
      faces:[['昭和顔（濃い顔立ち）',4],['彫りの深い縄文系',3],['真面目系',3],['落ち着いた大人系',2],['普通顔',2]],
      excludeFaces:['韓国アイドル風','やりらふぃー系','犬系男子風','塩顔系','平成アイドル風'],
      hairStyles:[['坊主',4],['七三分け',4],['オールバック',3],['短髪',2]],
      hairColors:[['黒',8]],
      excludeHairColors:['金髪（ブリーチ）','ブリーチベージュ','ミルクティーベージュ','ハイトーンアッシュ','シルバーアッシュ','オリーブアッシュ','ブルージュ','ラベンダーグレージュ','メッシュ入りブラック','インナーカラー（アッシュ）','プリン気味の伸びた茶髪','グレージュ','アッシュブラウン','オレンジブラウン','明るめブラウン','自然な茶髪','マロンブラウン','カーキブラウン','赤みブラウン','チョコレートブラウン','ダークチェリーブラウン','ダークアッシュ','ネイビーブラック'],
      outfits: y >= 1940 ? [['国民服風',5],['着物と羽織',2],['開襟シャツスタイル',1]] : [['書生風スタイル（着物＋袴＋学帽）',3],['着物と羽織',4],['三つ揃いスーツ',2],['開襟シャツスタイル',1]],
      bodyTypes:[['やせ型',4],['細身',4],['標準体型',3]]
    };
    if(y < 1970) return {
      labelJa:'戦後・高度成長期', labelEn:'postwar Japan',
      faces:[['昭和顔（濃い顔立ち）',4],['真面目系',3],['落ち着いた大人系',3],['普通顔',3],['ソース顔',2]],
      excludeFaces:['韓国アイドル風','やりらふぃー系','犬系男子風','塩顔系','平成アイドル風'],
      hairStyles:[['七三分け',4],['坊主',3],['オールバック',3],['短髪',3]],
      hairColors:[['黒',8]],
      excludeHairColors:['金髪（ブリーチ）','ブリーチベージュ','ミルクティーベージュ','ハイトーンアッシュ','シルバーアッシュ','オリーブアッシュ','ブルージュ','ラベンダーグレージュ','メッシュ入りブラック','インナーカラー（アッシュ）','プリン気味の伸びた茶髪','グレージュ','アッシュブラウン','オレンジブラウン','明るめブラウン','マロンブラウン','カーキブラウン','赤みブラウン','ダークチェリーブラウン'],
      outfits:[['開襟シャツスタイル',3],['三つ揃いスーツ',2],['グレースーツ',2],['社会人カジュアル',1],['着物と羽織',1]],
      bodyTypes:[['やせ型',3],['細身',3],['標準体型',3]]
    };
    if(y < 1980) return {
      labelJa:'1970年代', labelEn:'the 1970s',
      faces:[['落ち着いた大人系',3],['ワイルド系',3],['普通顔',3],['真面目系',2],['昭和顔（濃い顔立ち）',4],['ソース顔',3],['彫りの深い縄文系',2]],
      excludeFaces:['韓国アイドル風','やりらふぃー系','犬系男子風','塩顔系','平成アイドル風'],
      hairStyles:[['センターパート',4],['ロング寄りミディアム',4],['ウルフミディアム',3],['マッシュ',2],['ニュアンスパーマ',2]],
      excludeHair:['韓国風センターパート','マンバン','ツイストパーマ','波巻きパーマ','スパイラルパーマ','ソフトツーブロック'],
      hairColors:[['黒',6],['黒に近いダークブラウン',1]],
      excludeHairColors:['金髪（ブリーチ）','ブリーチベージュ','ミルクティーベージュ','ハイトーンアッシュ','シルバーアッシュ','オリーブアッシュ','ブルージュ','ラベンダーグレージュ','メッシュ入りブラック','インナーカラー（アッシュ）','プリン気味の伸びた茶髪','グレージュ','アッシュブラウン','オレンジブラウン'],
      bodyTypes:[['細身',4],['やせ型',3],['標準体型',3]]
    };
    if(y < 1990) return {
      labelJa:'1980年代', labelEn:'the 1980s',
      faces:[['落ち着いた大人系',3],['普通顔',3],['爽やか知的アナウンサー系',2],['ワイルド系',2],['真面目系',2],['昭和顔（濃い顔立ち）',3],['ソース顔',3],['彫りの深い縄文系',2]],
      excludeFaces:['韓国アイドル風','やりらふぃー系','犬系男子風','塩顔系','平成アイドル風'],
      hairStyles:[['サイドパート',4],['短髪',3],['マッシュ',2],['ロング寄りミディアム',2],['アップバング',2]],
      excludeHair:['韓国風センターパート','マンバン','ツイストパーマ','波巻きパーマ','スパイラルパーマ'],
      hairColors:[['黒',6],['黒に近いダークブラウン',1]],
      excludeHairColors:['金髪（ブリーチ）','ブリーチベージュ','ミルクティーベージュ','ハイトーンアッシュ','シルバーアッシュ','オリーブアッシュ','ブルージュ','ラベンダーグレージュ','メッシュ入りブラック','インナーカラー（アッシュ）','プリン気味の伸びた茶髪','グレージュ','アッシュブラウン','オレンジブラウン'],
      bodyTypes:[['標準体型',4],['細身',3],['スーツ映え体型',2]]
    };
    if(y < 2000) return {
      labelJa:'1990年代', labelEn:'the 1990s',
      faces:[['日本の若手俳優風',4],['普通顔',3],['親しみやすい大学生系',2],['ワイルド系',2],['平成アイドル風',3],['しょうゆ顔',2],['ソース顔',2]],
      excludeFaces:['韓国アイドル風','やりらふぃー系','犬系男子風'],
      hairStyles:[['センターパート',5],['ロング寄りミディアム',3],['短髪',3],['マッシュ',2],['ウルフミディアム',2]],
      excludeHair:['韓国風センターパート','マンバン','ツイストパーマ','波巻きパーマ'],
      hairColors:[['黒',4],['自然な茶髪',3],['明るめブラウン',2],['金髪（ブリーチ）',1],['プリン気味の伸びた茶髪',1],['メッシュ入りブラック',1]],
      excludeHairColors:['ブルージュ','ラベンダーグレージュ','オリーブアッシュ','インナーカラー（アッシュ）','ミルクティーベージュ','シルバーアッシュ'],
      bodyTypes:[['細身',4],['標準体型',3],['やせ型',2]]
    };
    if(y < 2010) return {
      labelJa:'2000年代', labelEn:'the 2000s',
      faces:[['清潔感のある若手俳優風',3],['日本の若手俳優風',3],['普通顔',3],['ワイルド系',2],['しょうゆ顔',3],['平成アイドル風',2]],
      excludeFaces:['やりらふぃー系','犬系男子風','韓国アイドル風'],
      hairStyles:[['ウルフミディアム',5],['短髪',3],['スパイラルパーマ',2],['アップバング',2]],
      excludeHair:['マンバン','韓国風センターパート','波巻きパーマ'],
      hairColors:[['明るめブラウン',3],['自然な茶髪',3],['黒',3],['金髪（ブリーチ）',2],['ハイトーンアッシュ',2],['メッシュ入りブラック',2],['プリン気味の伸びた茶髪',1]],
      excludeHairColors:['ブルージュ','ラベンダーグレージュ','オリーブアッシュ'],
      bodyTypes:[['細身',3],['標準体型',3],['引き締まったスポーツ体型',2]]
    };
    if(y < 2020) return {
      labelJa:'2010年代', labelEn:'the 2010s',
      faces:[['塩顔系',3],['清潔感のある若手俳優風',3],['普通顔',3],['韓国アイドル風',2],['犬系男子風',2],['しょうゆ顔',2],['あっさり弥生系',2],['たれ目系',1]],
      excludeFaces:[],
      hairStyles:[['ソフトツーブロック',5],['アップバング',4],['短髪',3],['ビジネス短髪',2],['マッシュ',2]],
      excludeHair:[],
      hairColors:[['黒',3],['アッシュブラウン',2],['ブルーブラック',2],['自然な茶髪',2],['ダークアッシュ',2],['ミルクティーベージュ',1]],
      bodyTypes:[['引き締まったスポーツ体型',3],['細身',3],['標準体型',3],['筋肉質',2],['細マッチョ',2]]
    };
    return {
      labelJa:'2020年代', labelEn:'the 2020s',
      faces:[['韓国アイドル風',3],['中性系',3],['塩顔系',3],['やりらふぃー系',2],['犬系男子風',2],['普通顔',2],['あっさり弥生系',2],['たれ目系',2],['つり目系',1]],
      excludeFaces:[],
      hairStyles:[['マッシュ',4],['センターパート',4],['韓国風センターパート',4],['ニュアンスパーマ',3],['ツイストパーマ',3],['波巻きパーマ',2],['マンバン',1]],
      excludeHair:[],
      hairColors:[['黒',3],['ブルーブラック',2],['アッシュブラウン',2],['グレージュ',1],['ブルージュ',2],['オリーブアッシュ',2],['ラベンダーグレージュ',1],['シルバーアッシュ',1],['ミルクティーベージュ',1]],
      bodyTypes:[['痩せマッチョ',3],['引き締まったスポーツ体型',3],['細身',3],['標準体型',3],['細マッチョ',2]]
    };
  }

  function eraAdjustEntries(entries, era, boostsKey, excludeKey, mult=1){
    let e = entries.map(([v,w])=>[v,w]);
    const excludes = era[excludeKey] || [];
    const filtered = e.filter(([v])=>!excludes.includes(v));
    if(filtered.length) e = filtered;
    (era[boostsKey]||[]).forEach(([v,w])=>{
      const boosted = Math.round(w * mult);
      const f = e.find(x=>x[0]===v);
      if(f) f[1]+=boosted; else e.push([v,boosted]);
    });
    return e;
  }

  function facePresetPhrase(c, english=false, lead=true){
    if(!c || c.facePresetOut === '含めない') return '';
    if(english) return `Overall face impression: ${c.facePreset} (but for eyes, nose, mouth and other details, the part-level specs below take priority). `;
    return `顔立ちの全体印象は${c.facePreset}（ただし目・鼻・口など細部は後述のパーツ指定を優先する）。`;
  }

  function eraStyleNote(c, english=false){
    const y = Number(c.eraYear) || 2026;
    const era = eraProfile(y);
    if(english) return `Match the hairstyle, physique presentation, fashion, accessories, and surroundings to the look and feel of around ${y} (${era.labelEn}), and avoid brands, hairstyles, or items that did not exist in that era.`;
    return `髪型・体型の見せ方・ファッション・小物・街並みは${eraLabel(y)}頃（${era.labelJa}）の時代感に合わせ、その時代に存在しないブランド・髪型・アイテムの表現は避ける。`;
  }

  function generateEraUnderwear(eraYear){
    const y = Number(eraYear) || 2026;
    let entries;
    if(y < 1980) entries = [['白ブリーフ',6],['カラーブリーフ',1]];
    else if(y < 1990) entries = [['白ブリーフ',4],['トランクス',2],['カラーブリーフ',1]];
    else if(y < 2000) entries = [['トランクス',5],['白ブリーフ',2],['ボクサーパンツ',1]];
    else if(y < 2010) entries = [['ボクサーパンツ',3],['トランクス',3],['白ブリーフ',1]];
    else if(y < 2020) entries = [['ボクサーパンツ',5],['トランクス',1]];
    else entries = [['ボクサーパンツ',6],['白ブリーフ',1]];
    const type = weighted(entries);
    let color;
    if(type === '白ブリーフ') color = '白';
    else if(type === 'カラーブリーフ') color = pick(['ライトブルー','グレー','ネイビー']);
    else if(type === 'トランクス') color = pick(['チェック柄','ストライプ柄','無地ネイビー','無地グレー','小紋柄']);
    else color = pick(pools.boxerColors);
    return {type, color};
  }

  function underwearDesc(c, lang='ja'){
    const zhMode = lang === 'zh', enMode = lang === 'en';
    const mode = c?.mainWearMode || 'ボクサーパンツのみ';
    const brandJa = c?.boxerBrand && c.boxerBrand !== '指定しない' ? `${c.boxerBrand}の` : '';
    const brandEn = c?.boxerBrand && c.boxerBrand !== '指定しない' ? `${c.boxerBrand} ` : '';
    if(mode === '時代に合った下着の種類' && c?.underwearType){
      const t = c.underwearType, col = c.underwearColor || '';
      if(zhMode){
        const brandZh = c?.boxerBrand && c.boxerBrand !== '指定しない' ? `${displayValue('outfitBrand',c.boxerBrand)}的` : '';
        return `${brandZh}${col?`${displayValue('underwearColor',col)}的`:''}${displayValue('underwearType',t)}`;
      }
      if(enMode){
        const colEn = UNDERWEAR_COLOR_EN[col] || col;
        const tEn = {'白ブリーフ':'classic white briefs','カラーブリーフ':`${colEn} classic briefs`,'トランクス':`${colEn} loose trunks-style boxer shorts`,'ボクサーパンツ':`${colEn} boxer briefs`}[t] || `${colEn} ${t}`;
        return `${brandEn}${tEn}`;
      }
      const tJa = {'白ブリーフ':'白ブリーフ','カラーブリーフ':`${col}のカラーブリーフ`,'トランクス':`${col}のトランクス`,'ボクサーパンツ':`${col}のボクサーパンツ`}[t] || `${col}の${t}`;
      return `${brandJa}${tJa}`;
    }
    const bwt = c?.baseWearType || 'ボクサーパンツ';
    if(zhMode){
      const brandZh = c?.boxerBrand && c.boxerBrand !== '指定しない' ? `${displayValue('outfitBrand',c.boxerBrand)}的` : '';
      return `${brandZh}${displayValue('boxerColor',c?.boxerColor)}的${displayValue('baseWearType',bwt)}`;
    }
    const bwtEn = {'ボクサーパンツ':'boxer briefs','ショートショーツ':'athletic short shorts','スポーツスパッツ':'sports compression spats'}[bwt] || 'boxer briefs';
    if(enMode) return `${brandEn}${UNDERWEAR_COLOR_EN[c?.boxerColor] || c?.boxerColor} ${bwtEn}`;
    return `${brandJa}${c?.boxerColor}の${bwt}`;
  }

  function bodyTypeDesc(v, english=false){
    if(v==='腹だけぽっちゃり') return english
      ? 'belly-only chubby — his face, arms, legs, and chest stay average and NOT chubby; only the stomach area is softly rounded. Do NOT make the whole body chubby'
      : '腹だけぽっちゃり（顔・腕・脚・胸まわりは標準的なままで、お腹まわりだけ柔らかく丸みがある。全身をぽっちゃりさせない）';
    if(v==='ビール腹') return english
      ? 'beer belly — only a firm, forward-protruding belly; his face, arms, legs, and chest stay average. Do NOT make the whole body fat'
      : 'ビール腹（張りのあるお腹だけが前に出ている。顔・腕・脚・胸まわりは標準的なままで、全身は太らせない）';
    return v;
  }

  function footOccScenes(role){
    if(!role) return [];
    let rows = (FOOT_OCC_SCENES[role] || []).slice();
    if(!rows.length && typeof OCC_CAT !== 'undefined' && FOOT_OCC_CAT_SCENES[OCC_CAT[role]]) rows = FOOT_OCC_CAT_SCENES[OCC_CAT[role]].slice();
    return rows;
  }

  function footCfg(c){ const base={scene:'ランダム',posture:'ランダム',shoeState:'ランダム',wear:'ランダム',fabric:'ランダム',sockState:'ランダム',angle:'ランダム',prop:'ランダム'}; const out = Object.assign(base, (c && c.footScene) || {}); if(FOOT_SCENE_MIGRATION[out.scene]) out.scene = FOOT_SCENE_MIGRATION[out.scene]; return out; }

  function footAxisOptions(axis){
    if(axis==='scene') return FOOT_SCENES.map(x=>x[0]).concat(footOccScenes(ST.current && ST.current.role).map(x=>x[0]));
    if(axis==='posture') return FOOT_POSTURES.map(x=>x[0]);
    if(axis==='shoeState') return FOOT_SHOE_STATES;
    if(axis==='wear') return ['職業服装のまま','私服'];
    if(axis==='fabric') return FOOT_FABRICS.map(x=>x[0]);
    if(axis==='sockState') return FOOT_SOCK_STATES.map(x=>x[0]);
    if(axis==='angle') return FOOT_ANGLES;
    if(axis==='prop'){ let opts = ['なし'].concat(FOOT_PROPS.generic).concat(FOOT_PROPS['新幹線の座席（靴を脱いでくつろぐ）']).concat(FOOT_PROPS['こたつのある部屋']); footOccScenes(ST.current && ST.current.role).forEach(r=>{ opts = opts.concat(r[3]||[]); }); return Array.from(new Set(opts)); }
    return [];
  }

  function resolveFootCfg(c){
    const out = footCfg(c);
    const occRows = footOccScenes(c && c.role);
    if(out.scene==='ランダム'){ const all = FOOT_SCENES.concat(occRows).concat(occRows); out.scene = pick(all)[0]; }
    const srow = FOOT_SCENES.find(x=>x[0]===out.scene) || occRows.find(x=>x[0]===out.scene) || FOOT_SCENES[0];
    if(out.posture==='ランダム'){ const cands = FOOT_POSTURES.filter(p=>p[1].includes(srow[1])); out.posture = pick((cands.length?cands:FOOT_POSTURES))[0]; }
    if(out.shoeState==='ランダム'){ let cands = FOOT_SHOE_STATES.slice(); if(srow[1]==='bed' || out.scene.includes('スリッパ')) cands = cands.filter(v=>v!=='靴を完全に履いている'); out.shoeState = pick(cands); }
    const occRow = occRows.find(x=>x[0]===out.scene);
    const cozy = FOOT_COZY.includes(out.scene) || !!(occRow && occRow[4]);
    if(out.wear==='ランダム') out.wear = Math.random() < (cozy ? 0.6 : 0.25) ? '私服' : '職業服装のまま';
    if(out.fabric==='ランダム') out.fabric = weighted(FOOT_FABRICS.map(f=>[f[0], f[1][cozy?1:0]]));
    if(out.sockState==='ランダム') out.sockState = cozy ? weighted(FOOT_SOCK_STATES) : '靴下を履いたまま';
    if(out.angle==='ランダム') out.angle = weighted([[FOOT_ANGLES[0],5],[FOOT_ANGLES[1],3],[FOOT_ANGLES[2],2]]);
    if(out.prop==='ランダム'){ const pp = (occRow && occRow[3] && occRow[3].length) ? occRow[3] : (FOOT_PROPS[out.scene] || FOOT_PROPS.generic); out.prop = Math.random()<0.75 ? pick(pp) : 'なし'; }
    return out;
  }

  function refSheetKind(outputType){
    if(!outputType) return null;
    if(outputType.includes('比較リファレンスシート')) return 'compare';
    if(outputType.includes('表情差分リファレンスシート')) return 'expressions';
    if(outputType.includes('フル設定資料シート')) return 'full';
    if(outputType.includes('段階着装リファレンスシート')) return 'stages';
    if(outputType.includes('ブループリントシート')) return 'blueprint';
    if(outputType.includes('服装リファレンスシート')) return 'outfitref';
    if(outputType.includes('人物ポスター')) return 'poster';
    if(outputType.includes('街で見かけたイケメンシート：職業編')) return 'machiWork';
    if(outputType.includes('街で見かけたイケメンシート：オフ編')) return 'machiOff';
    if(outputType.includes('偶然足元強調場面シート')) return 'feet';
    if(outputType.includes('参考画像作成シート')) return 'handoff';
    if(outputType.includes('人物特集雑誌ページ')) return 'magazine';
    if(outputType.includes('キャラクタープロフィールシート')) return 'profilesheet';
    return null;
  }

  function outfitSummaryLine(c, english=false){
    if(english) return c.workUniform ? `Work outfit for the outfit panels: ${c.workUniformEn} — top: ${c.top}${uniformJacketPhrase(c, true)}, bottom: ${c.bottom}${uniformHatPhrase(c, true)}, socks: ${c.sockBrand} ${c.sockType} (${c.sockColor}), shoes (only where allowed): ${c.shoes}. Do not reproduce real organizations' insignia or logos.` : `Suggested outfit for the outfit panels: ${c.outfitBrand} ${c.outfitType} — outerwear: ${c.jacket}, top: ${c.top}, bottom: ${c.bottom}, socks: ${c.sockBrand} ${c.sockType} (${c.sockColor}), shoes (only where allowed): ${c.shoes}.`;
    return c.workUniform ? `服装パネルの内容：${c.workUniform}。トップスは${c.top}${uniformJacketPhrase(c, false)}、ボトムスは${c.bottom}${uniformHatPhrase(c, false)}、靴下は${c.sockBrand}の${c.sockType}（${c.sockColor}）、靴（許可されたパネルのみ）は${c.shoes}。実在組織の記章・ロゴは正確に再現しない。` : `提案服装パネルの内容：${c.outfitBrand}の${c.outfitType}。上着は${c.jacket}、トップスは${c.top}、ボトムスは${c.bottom}、靴下は${c.sockBrand}の${c.sockType}（${c.sockColor}）、靴（許可されたパネルのみ）は${c.shoes}。`;
  }

  function posterFootNote(c, english=false){
    const sp = POSTER_FOOT[c.role];
    if(english) return `Footwear should be whatever is most natural for his occupation and the chosen scene${sp ? ` — for him: ${sp[1]}` : ''}. If shoes would look unnatural (tatami rooms, dojos, beaches, etc.), consider bare feet, tabi, setta/geta sandals, or other footwear instead of defaulting to shoes and socks. `;
    return `足元は職業と場面に最も自然な状態を選ぶ${sp ? `（この人物の場合：${sp[0]}）` : ''}。靴が不自然な場面（和室・道場・砂浜など）では、靴と靴下に固定せず、素足・足袋・雪駄・下駄・サンダルなども検討する。`;
  }

  function bmiOf(c){ const h = ((c.heightRaw || parseInt(c.height, 10) || 171)) / 100; const w = parseFloat(c.weight) || 65; return w / (h * h); }

  function headCount(c){
    const h = c.heightRaw || parseInt(c.height, 10) || 171;
    let v = 7.0 + (h - 171) * 0.07;
    const bt = String(c.bodyType || '');
    let adj = 0;
    if(/高身長モデル|脚が長い/.test(bt)) adj = 0.2;
    else if(/細身|やせ型|華奢|スーツ映え/.test(bt)) adj = 0.1;
    else if(/筋肉質|がっしり|骨太|ラグビー|柔道家/.test(bt)) adj = -0.1;
    else if(/ぽっちゃり|ビール腹|腹だけ/.test(bt)) adj = -0.1;
    const bmi = bmiOf(c);
    let badj = 0;
    if(bmi < 18.5) badj = 0.1; else if(bmi >= 27) badj = -0.1; else if(bmi >= 25) badj = -0.05;
    v += Math.abs(adj) >= Math.abs(badj) ? adj : badj;
    return Math.max(6.4, Math.min(8.3, Math.round(v * 10) / 10));
  }

  function chooseFrameAxes(c){
    const h = c.heightRaw || parseInt(c.height, 10) || 171;
    const bt = String(c.bodyType || '');
    const bmi = bmiOf(c);
    const wide = sportsInfluence(c, /水泳|ラグビー|柔道|アメリカンフットボール|レスリング|相撲|ボート/);
    const jump = sportsInfluence(c, /バレーボール|バスケットボール/);
    const grap = sportsInfluence(c, /柔道|ラグビー|相撲|レスリング|アメリカンフットボール/);
    const w = (arr)=>weighted(arr);
    const shoulder = w([['狭め', /細身|やせ型|華奢/.test(bt)?4:1],['普通',6],['広め',(/筋肉質|がっしり|逆三角形|水泳|ラグビー|肩幅広め/.test(bt)?5:2)+wide],['非常に広い',(/ラグビー|肩幅広め/.test(bt)?1.5:0.4)+wide*0.5]]);
    const waist = w([['低め', h<168?2:1],['標準',6],['高め',(h>=178?4:1.5)+(/高身長モデル|脚が長い/.test(bt)?3:0)]]);
    let leg = w([['標準',5],['やや長い',3+(h>=175?1.5:0)],['長い',(h>=178?2.5:0.8)+(/脚が長い|高身長モデル/.test(bt)?3:0)],['非常に長い',(h>=185?1:0.2)+(/脚が長い/.test(bt)?1.5:0)]]);
    if(waist==='低め' && (leg==='長い'||leg==='非常に長い')) leg='やや長い';
    const arm = w([['標準',6],['やや長い',2.5+jump*0.6],['長い',0.7+jump*0.8]]);
    const frame = w([['コンパクト', (h<167?3:0.8)+(bmi<19?1:0)],['標準',6],['大柄',(h>=180?2.5:0.8)+(bmi>=25?1.5:0)+grap*0.6],['大型',(h>=186&&bmi>=26?1.5:0.2)+grap*0.4]]);
    const neck = w([['短め',(/筋肉質|がっしり|ラグビー|柔道家/.test(bt)?3:1)+grap*0.5],['標準',6],['やや長い', /細身|やせ型|華奢|モデル/.test(bt)?3:1.2]]);
    const limb = w([['小さめ', h<167?2:0.8],['標準',6],['大きめ',(h>=180?2.5:1)+(/がっしり|骨太|ラグビー/.test(bt)?2:0)+grap*0.4]]);
    return {shoulderWidth:shoulder, waistPos:waist, legLength:leg, armLength:arm, frame:frame, neckLength:neck, limbSize:limb};
  }

  function chooseHipShape(c){
    const bt = String(c.bodyType || '');
    const grap = sportsInfluence(c, /柔道|ラグビー|相撲|レスリング|アメリカンフットボール/);
    const sprint = sportsInfluence(c, /自転車競技|陸上（短距離）|スケート/);
    return weighted([
      ['標準的な丸みの臀部', 6],
      ['筋肉質で引き締まった臀部', (/筋肉質|マッチョ|スポーツ体型|ラグビー|サッカー|陸上短距離|クライマー/.test(bt)?4:1) + grap*1.2 + sprint*1.5],
      ['平たくすっきりした臀部', /細身|やせ型|華奢/.test(bt)?3:1.2],
      ['骨盤幅が広めのどっしりした臀部', (/ぽっちゃり|ビール腹|骨太|がっしり/.test(bt)?3:0.8) + grap*0.5],
      ['小ぶりでコンパクトな臀部', /細身|やせ型|華奢|陸上長距離/.test(bt)?2.5:1],
      ['丸みのしっかりした臀部', /ぽっちゃり|腹だけ/.test(bt)?2.5:1]
    ]);
  }

  function chooseTeethAlign(age){
    const a = Number(age)||30;
    return weighted([['整った歯列',5],['ほぼ整った歯列',6],['前歯がわずかに重なる歯列',2],['すきっ歯気味の歯列',1.2],['八重歯が少し覗く歯列',1.5],['矯正後のきれいな歯列',1.5],['前歯2本がやや大きめの歯列',1.2],['下の前歯に軽い重なりがある歯列',1.5],['前歯がわずかに前傾した歯列',1],['矯正中（目立ちにくい矯正装置）', (a>=15 && a<=35)?0.6:0]]);
  }

  function chooseTeethColor(age, align){
    const noBridge = /矯正後|矯正中/.test(String(align||''));
    return weighted([['自然な白さの歯',5],['やや黄味がかった自然な色の歯',4],['白く手入れされた歯',2],['うっすらした着色のある歯',1.2],['生まれつきやや灰味・縞状のトーンがある歯',0.6],['前歯1本だけ色味がわずかに異なる歯（差し歯・補綴由来）', noBridge?0:0.8]]);
  }

  function teethColorNote(co, english=false){
    if(String(co).includes('差し歯')) return english ? ' (a prosthetic tooth from a past treatment such as a school-days injury — keep it healthy-looking and clean, never decayed or unsanitary)' : '（学生時代の外傷治療など由来はさまざま。健康的で清潔感のある範囲にとどめ、劣化・不衛生には見せない）';
    if(String(co).includes('縞状')) return english ? ' (a congenital tonal trait — depict it as a natural individual feature, never as looking unhealthy)' : '（幼少期由来の生まれつきの色調。病的に見せず自然な個性として描く）';
    return '';
  }

  function teethLine(c, english=false){
    const al = c.teethAlign || 'ほぼ整った歯列';
    const co = c.teethColor || '自然な白さの歯';
    if(english) return `Teeth: ${promptValue(al)}, ${promptValue(co)}${teethColorNote(co, true)}. Show the teeth only as far as naturally visible when he smiles — do NOT keep his teeth constantly bared.`;
    return `歯並びは${al}、色は${co}${teethColorNote(co, false)}。歯は笑ったときに自然に見える範囲でのみ描写し、常に歯を見せた表情にはしない。`;
  }

  function frameOf(c){
    if(!c._frame){ c._frame = {shoulderWidth:c.shoulderWidth,waistPos:c.waistPos,legLength:c.legLength,armLength:c.armLength,frame:c.frame,neckLength:c.neckLength,limbSize:c.limbSize}; }
    return {shoulderWidth:c.shoulderWidth||'普通', waistPos:c.waistPos||'標準', legLength:c.legLength||'標準', armLength:c.armLength||'標準', frame:c.frame||'標準', neckLength:c.neckLength||'標準', limbSize:c.limbSize||'標準'};
  }

  function frameSentence(c, english=false){
    const f = frameOf(c);
    if(english){
      const en = {'狭め':'narrow','普通':'average','広め':'broad','非常に広い':'very broad','低め':'low','標準':'average','高め':'high','やや長い':'slightly long','長い':'long','非常に長い':'very long','コンパクト':'compact','大柄':'large-built','大型':'very large-built','短め':'short','やや長い ':'slightly long','小さめ':'smallish','大きめ':'largish'};
      return ` Shoulders: ${en[f.shoulderWidth]||f.shoulderWidth}. Waist position: ${en[f.waistPos]||f.waistPos}, legs: ${en[f.legLength]||f.legLength}, arms: ${en[f.armLength]||f.armLength}. Build frame: ${en[f.frame]||f.frame}; neck: ${en[f.neckLength]||f.neckLength}; hands and feet: ${en[f.limbSize]||f.limbSize}.`;
    }
    return `肩幅は${f.shoulderWidth}、腰の位置は${f.waistPos}で脚の長さは${f.legLength}。腕は${f.armLength}、骨格は${f.frame}、首は${f.neckLength}、手足のサイズ感は${f.limbSize}。`;
  }

  function physiqueSpec(c, english=false, forCard=false){
    const h = c.heightRaw || parseInt(c.height, 10) || 171;
    const hc = headCount(c);
    const bt = String(c.bodyType || '');
    let core, coreEn;
    if(h >= 185){ core = `頭部は小さめ・肩の位置は高く・腰高で脚は長めに描き、圧倒的な長身（${h}cm）と分かる比率にする`; coreEn = `draw the head small, shoulders high, waist high, and legs long so he clearly reads as strikingly tall (${h}cm)`; }
    else if(h >= 180){ core = `頭部はやや小さめ・肩の位置は高く・腰高で脚は長めに描き、明確に長身（${h}cm）と分かる比率にする`; coreEn = `draw the head slightly small, shoulders high, waist high, and legs long so he clearly reads as tall (${h}cm)`; }
    else if(h >= 175){ core = `肩の位置をやや高く、脚を長めに描き、平均より背が高い（${h}cm）と分かる比率にする`; coreEn = `place the shoulders slightly high and draw the legs long so he reads as taller than average (${h}cm)`; }
    else if(h >= 165){ core = `自然で標準的な比率（${h}cm）。頭部を大きく描きすぎない`; coreEn = `natural, standard proportions (${h}cm); do not draw the head too large`; }
    else { core = `小柄（${h}cm）だが頭身は保ち、子どもに見えない大人の比率で描く`; coreEn = `small in stature (${h}cm) but keep adult proportions so he never looks like a child`; }
    let extra = '', extraEn = '';
    if(/筋肉質|がっしり|骨太|ラグビー|柔道家|肩幅広め/.test(bt)){ extra = '肩幅は広く首は太めだが、頭身と縦の比率は維持する。'; extraEn = ' Broad shoulders and a thick neck, but keep the head-to-body ratio and vertical proportions intact.'; }
    else if(/ぽっちゃり|ビール腹|腹だけ/.test(bt)){ extra = '横幅が増しても縦の比率は縮めない。'; extraEn = ' Extra width must not shorten the vertical proportions.'; }
    else if(/高身長モデル|脚が長い/.test(bt)){ extra = '脚をさらに長めに強調する。'; extraEn = ' Emphasize the legs even longer.'; }
    const panel = forCard ? (english ? ' In the full-body panels, keep this head-to-body ratio exact and never enlarge the head.' : '全身パネルでは頭身比を正確に維持し、頭部を大きく描きすぎない。') : '';
    const guard = english ? ' Do not write any of these numbers or ratios as text inside the image.' : '（これらの数値を画像内に文字として描き込まない）。';
    if(english) return `Physique guide: about ${hc} heads tall — ${coreEn}.${frameSentence(c, true)}${extraEn}${panel}${guard}`;
    return `体格の目安：約${hc}頭身。${core}。${frameSentence(c, false)}${extra}${panel}${guard}`;
  }

  function calcFootWidth(c){
    const bt = String(c.bodyType || '');
    const bmi = bmiOf(c);
    let lvl = 1;
    if(/細身|やせ型|華奢/.test(bt) || bmi < 19) lvl = 0;
    if(/筋肉質|がっしり|骨太|肩幅広め|バスケットボール|ラグビー|柔道家/.test(bt) || (bmi >= 24 && bmi < 27)) lvl = 2;
    if(/ぽっちゃり|ビール腹/.test(bt) || bmi >= 27) lvl = 3;
    const sp = String(c.sportName || '');
    if(/ラグビー|柔道|相撲/.test(sp) || ['自衛官','消防士'].includes(c.role)) lvl += 1;
    if(/長距離/.test(sp)) lvl -= 1;
    lvl = Math.max(0, Math.min(3, lvl));
    return FOOT_WIDTHS[lvl][0];
  }

  function footWidthDesc(c, english=false){
    const name = c.footWidth || calcFootWidth(c);
    const row = FOOT_WIDTHS.find(x=>x[0]===name) || FOOT_WIDTHS[1];
    return english ? `foot width ${row[0]}: ${row[2]}` : `ワイズ${row[0]}：${row[1]}`;
  }

  function chooseSoleType(c){
    const fw = String(c.footWidth || '');
    const fs2 = String(c.footShape || '');
    const ff = String(c.footFeature || '');
    const sp = String(c.sportName || '') + ((c.sportsHistory||[]).map(x=>x.name).join(''));
    const standing = isStandingRole(c.role);
    const age = Number(c.age) || 30;
    const list = [];
    for(const [name, w] of SOLE_TYPES.map(x=>[x[0], x[1]])){
      if(fw.startsWith('E（') && ['幅広肉厚型','しわ深型','武骨大判型'].includes(name)) continue;
      if((fw.startsWith('3E') || fw.startsWith('4E')) && ['すっきり細長型','細身指長型'].includes(name)) continue;
      if(ff.includes('扁平足') && name === 'ハイアーチ型') continue;
      let weight = w;
      if(/甲高|土踏まず高め/.test(fs2) && name === 'ハイアーチ型') weight *= 3;
      if(fs2 === '幅広' && ['幅広肉厚型','しわ深型'].includes(name)) weight *= 2.5;
      if(fs2 === '細め' && ['すっきり細長型','細身指長型'].includes(name)) weight *= 2.5;
      if(fs2 === '足指が長め' && name === '細身指長型') weight *= 2.5;
      if(ff.includes('母趾球が発達') && ['内側カーブ型','パッド発達型'].includes(name)) weight *= 3;
      if(ff.includes('扁平足') && ['均整なめらか型','幅広肉厚型'].includes(name)) weight *= 2;
      if(ff.includes('指の間が開きやすい') && name === '指間開き型') weight *= 3;
      if(ff.includes('立ち仕事') && ['パッド発達型','武骨大判型'].includes(name)) weight *= 2.5;
      if(/柔道|ラグビー|相撲|レスリング/.test(sp) && ['パッド発達型','武骨大判型'].includes(name)) weight *= (1 + Math.min(2.5, sportsInfluence(c, /柔道|ラグビー|相撲|レスリング/) + (/柔道|ラグビー|相撲|レスリング/.test(String(c.sportName||''))?1.5:0)));
      if(/長距離/.test(sp) && name === 'ハイアーチ型') weight *= (1.5 + Math.min(2, sportsInfluence(c, /長距離/) + (/長距離/.test(String(c.sportName||''))?1.5:0)));
      if(/水泳/.test(sp) && ['細身指長型','指間開き型'].includes(name)) weight *= (1 + Math.min(2.5, sportsInfluence(c, /水泳/) + (/水泳/.test(String(c.sportName||''))?1.5:0)));
      if(/クライミング/.test(sp) && name === 'パッド発達型') weight *= 2;
      if(/ダンス|体操/.test(sp) && ['コンパクト丸型','細身指長型'].includes(name)) weight *= 1.5;
      if(standing && ['しわ深型','パッド発達型','武骨大判型'].includes(name)) weight *= 1.5;
      if(age >= 45 && ['しわ深型','武骨大判型'].includes(name)) weight *= 1.8;
      if(age <= 22 && ['しわ深型','武骨大判型'].includes(name)) weight *= 0.5;
      list.push([name, weight]);
    }
    return weighted(list);
  }

  function chooseSoleWrinkle(c){
    const age = Number(c.age) || 30;
    const st = String(c.soleType || '');
    const standing = isStandingRole(c.role);
    let w = [3, 5, 2];
    if(age >= 45) w = [1.5, 4, 4];
    if(age <= 22) w = [4.5, 4, 1];
    if(standing) w[2] *= 1.7;
    if(['しわ深型','武骨大判型'].includes(st)) w = [0.5, 3, 6];
    if(['すっきり細長型','細身指長型','均整なめらか型'].includes(st)) w[0] *= 1.8;
    return weighted(SOLE_WRINKLES.map((x, i)=>[x[0], w[i]]));
  }

  function chooseToeLine(c){
    const fs2 = String(c.footShape || '');
    const ff = String(c.footFeature || '');
    const st = String(c.soleType || '');
    const si = (re)=> (re.test(String(c.sportName || '')) ? 1.5 : 0) + Math.min(2.5, sportsInfluence(c, re));
    const list = [];
    for(const [name, w] of TOE_LINES.map(x=>[x[0], x[1]])){
      if(ff.includes('指の間が開きやすい') && name === '指先が密着した並び') continue;
      let weight = w;
      if(fs2 === 'エジプト型' && name === '親指側へゆるやかに流れる並び') weight *= 3;
      if(fs2 === 'ギリシャ型' && name === '第2趾が少し前へ出て目立つ並び') weight *= 3;
      if(fs2 === 'スクエア型' && ['まっすぐ前を向いたそろった並び','指先が密着した並び'].includes(name)) weight *= 2.5;
      if(ff.includes('指の間が開きやすい') && ['親指と第2趾の間にすき間がある並び','全指の間に軽いすき間のある離れのよい並び'].includes(name)) weight *= 3;
      if(ff.includes('内反小趾') && name === '小指が内側へ丸まり気味の並び') weight *= 3;
      if(ff.includes('節のある足') && name === '扇状に均等に開いた並び') weight *= 2;
      if(st === '指間開き型' && ['親指と第2趾の間にすき間がある並び','全指の間に軽いすき間のある離れのよい並び'].includes(name)) weight *= 2;
      if(st === 'すっきり細長型' && name === '指先が密着した並び') weight *= 2;
      if(st === '武骨大判型' && ['親指側へゆるやかに流れる並び','小指が内側へ丸まり気味の並び'].includes(name)) weight *= 2;
      const grip = si(/柔道|相撲|レスリング|クライミング/);
      if(grip > 0 && ['扇状に均等に開いた並び','全指の間に軽いすき間のある離れのよい並び'].includes(name)) weight *= (1 + grip);
      const swim = si(/水泳/);
      if(swim > 0 && name === '全指の間に軽いすき間のある離れのよい並び') weight *= (1 + swim);
      const posture = si(/ダンス|体操/);
      if(posture > 0 && name === 'まっすぐ前を向いたそろった並び') weight *= (1 + posture * 0.7);
      const climb = si(/クライミング/);
      if(climb > 0 && name === '指の付け根ラインが強くカーブした並び') weight *= (1 + climb);
      list.push([name, weight]);
    }
    return weighted(list);
  }

  function soleDetailLine(c, english=false){
    const st = SOLE_TYPES.find(x=>x[0]===c.soleType) || SOLE_TYPES[5];
    const wr = SOLE_WRINKLES.find(x=>x[0]===c.soleWrinkle) || SOLE_WRINKLES[1];
    const tl = TOE_LINES.find(x=>x[0]===c.toeLine) || TOE_LINES[0];
    const tc = TOE_CURLS.find(x=>x[0]===c.toeCurl) || TOE_CURLS[1];
    if(promptOpt(c).compact){
      if(english) return ` Sole detail: ${st[3]}. Toe alignment: ${tl[3]}. Creasing: ${wr[2]}. Natural range of motion only.`;
      return `足裏の詳細（${st[0]}）：${st[2]}。指の並びは「${tl[0]}」。しわは「${wr[0]}」。可動域は自然な範囲のみ。`;
    }
    if(english) return ` Sole detail: ${st[3]}. Toe alignment: ${tl[3]}, with ${tc[2]}. Creasing: ${wr[2]}. Keep toe lean, gaps, and curl within the natural range of motion — no broken joints or unnatural crossing.`;
    return `足裏の詳細（${st[0]}）：${st[2]}。指の並びは「${tl[0]}」：${tl[2]}。「${tc[0]}」で描く。しわは「${wr[0]}」：${wr[1]}。指の傾き・すき間・丸まりは自然な可動域の範囲にとどめ、関節の破綻や不自然な交差にはしない。`;
  }

  function isStandingRole(role){
    if(['警察官','自衛官','消防士','救急隊員','防衛大学校学生'].includes(role)) return true;
    return /調理|シェフ|美容|理容|販売|アパレル|工場|職人|大工|整備|警備|ホテル|バーテンダー|パティシエ|花屋|書店/.test(String(role||''));
  }

  function chooseFootFeature(c){
    const age = Number(c.age) || 30;
    const role = c.role || '';
    const cat = (typeof OCC_CAT !== 'undefined') ? OCC_CAT[role] : '';
    const sp = String(c.sportName || '') + '/' + ((c.sportsHistory || []).filter(x=>x.strength > 0).map(x=>x.name).join('/'));
    const si = (re)=> (re.test(String(c.sportName || '')) ? 1.5 : 0) + Math.min(2.5, sportsInfluence(c, re));
    const standing = isStandingRole(role);
    const list = [];
    const fs2 = String(c.footShape || '');
    const fw = String(c.footWidth || '');
    for(const [name, w, minAge] of FOOT_FEATURES){
      if(age < minAge) continue;
      if(name === '長時間の立ち仕事の跡' && !standing) continue;
      if(fs2 === '甲高' && name === '甲が薄く腱のラインがうっすら見える足') continue;
      if(fs2 === '土踏まず低め' && name === 'ハイアーチ気味') continue;
      if(fs2 === '土踏まず高め' && name === '扁平足気味') continue;
      if((fs2 === '細め' || fw.startsWith('E（')) && (name === '前足部が扇形にしっかり広がった足' || name === '母趾球が発達して張り出した足')) continue;
      if(fw.startsWith('4E') && name === '甲が薄く腱のラインがうっすら見える足') continue;
      let weight = w;
      if(!c.gapMode){
        if(standing){ if(name === '長時間の立ち仕事の跡') weight *= 3; if(name === '扁平足気味') weight *= 1.5; }
        if(/サッカー|バスケ|野球|テニス|ラグビー|バレーボール/.test(sp) && name === '指の関節がしっかりした節のある足') weight *= (1 + si(/サッカー|バスケットボール|野球|テニス|ラグビー|バレーボール/));
        if(/長距離/.test(sp) && name === 'ハイアーチ気味') weight *= (1 + si(/長距離/));
        if(/水泳/.test(sp) && name === '足指の間が開きやすい') weight *= (1 + si(/水泳/));
        if(/柔道|ラグビー|相撲/.test(sp) && name === '指の関節がしっかりした節のある足') weight *= (1 + si(/柔道|ラグビー|相撲/));
        if(/クライミング/.test(sp) && name === '指の関節がしっかりした節のある足') weight *= (1 + si(/クライミング/));
        if(/ダンス|体操/.test(sp) && name === 'ハイアーチ気味') weight *= (1 + si(/ダンス|体操/) * 0.6);
        if(/陸上/.test(sp) && name === 'アキレス腱がくっきり浮き出た引き締まった足首') weight *= (1.5 + si(/陸上/));
        if(/バスケ|バレーボール/.test(sp) && name === '足首が太くしっかりした跳躍系の足') weight *= (1.5 + si(/バスケットボール|バレーボール/));
        if(/柔道|相撲|ラグビー/.test(sp) && name === '母趾球が発達して張り出した足') weight *= (1.5 + si(/柔道|相撲|ラグビー/));
        if(/水泳/.test(sp) && name === '指が長くしなやかな足') weight *= (1.5 + si(/水泳/));
        if(/サッカー|野球|テニス|ラグビー|バスケ/.test(sp) && name === 'すねから続く腱の筋が浮いた競技者の足首') weight *= (1 + si(/サッカー|野球|テニス|ラグビー|バスケットボール/));
        if(['自衛官','消防士','警察官','防衛大学校学生'].includes(role) && name === '引き締まった細めの足首（ブーツ生活の足）') weight *= 3;
        if((standing || /僧侶|旅館|和装|着物/.test(role)) && name === '前足部が扇形にしっかり広がった足') weight *= 2.5;
        if((cat === 'office' || cat === 'it') && name === '特徴なし・整った足') weight *= 1.3;
      }
      list.push([name, weight]);
    }
    return weighted(list);
  }

  function footFeatureLine(c, english=false, detailed=false){
    const name = c.footFeature || '特徴なし・整った足';
    if(name === '特徴なし・整った足') return '';
    const row = FOOT_FEATURES.find(x=>x[0]===name);
    const detail = row ? row[3] : '';
    if(english) return detailed ? ` Foot trait: ${name} — ${detail} (depict subtly and anatomically correctly, never exaggerated into deformity).` : ` Foot trait: ${name} (only to the extent naturally visible).`;
    return detailed ? `足の特徴：${name}（${detail}。誇張して変形させず、解剖学的に正確な範囲で控えめに描く）。` : `足の特徴：${name}（自然に分かる範囲で）。`;
  }

  function eyeAreaLine(c, english=false){
    const eb = c.eyebrow || '標準的なゆるいアーチ眉', ed = c.eyebrowDensity || '標準的な濃さの眉';
    const el = c.eyelid || '末広二重', esh = c.eyeShape || '標準的な目の形', ei = c.eyes || '親しみやすい目元', ela = c.eyelash || '標準的な長さのまつ毛';
    if(english) return `Eyebrows: ${promptValue(eb)} (${promptValue(ed)}). Eyelid: ${promptValue(el)}. Eye shape: ${promptValue(esh)}. Eye impression: ${promptValue(ei)}. Eyelashes: ${promptValue(ela)} — never make him look like he is wearing makeup or mascara.`;
    return `眉は${eb}で、${ed}。まぶたは${el}、目の形は${esh}、目の印象は${ei}。まつ毛は${ela}（化粧をしているようには見せない）。`;
  }

  function faceExtraLine(c, english=false){
    const LIMIT = promptOpt(c).compact ? 6 : 99;
    const parts = [];
    const add = (key, jaFmt, enFmt)=>{
      const v = c[key];
      if(!v || v === FACE_EXTRA_DEFAULTS[key]) return;
      parts.push(english ? enFmt(promptValue(v)) : jaFmt(v));
    };
    add('jawChin', v=>`顎先は${v}`, v=>`Chin: ${v}`);
    add('jawAngle', v=>`${v}`, v=>`Jaw: ${v}`);
    add('browRidge', v=>`${v}`, v=>`Brow: ${v}`);
    add('forehead', v=>`${v}`, v=>`Forehead: ${v}`);
    add('hairline', v=>`${v}`, v=>`Hairline: ${v}`);
    add('cheek', v=>`${v}`, v=>`Cheeks: ${v}`);
    add('ear', v=>`耳は${v}`, v=>`Ears: ${v}`);
    add('dimple', v=>`${v}`, v=>`Dimples: ${v}`);
    add('mole', v=>`${v}がある`, v=>`Mole: ${v}`);
    add('eyeBags', v=>`${v}`, v=>`Under-eye: ${v}`);
    add('adamsApple', v=>`${v}`, v=>`Throat: ${v}`);
    add('lipTone', v=>`${v}`, v=>`Lip tone: ${v}`);
    if(!parts.length) return '';
    if(parts.length > LIMIT) parts.length = LIMIT;
    return english ? ` ${parts.join('. ')}.` : `${parts.join('、')}。`;
  }

  function promptOpt(c){
    const mode = c?.promptDetail || '自動（生成先に合わせる）';
    const compact = mode === '要点圧縮' || (mode !== 'フル記述' && c?.promptTarget === 'ChatGPT');
    const antiAI = /Nanobanana/i.test(String(c?.promptTarget || '')) && !/イラスト|アニメ|漫画|設定画/.test(String(c?.quality || '実写風'));
    return { compact, antiAI };
  }

  function realismSpec(c, english=false){
    const q = String(c.quality || '実写風');
    const illust = /イラスト|アニメ|漫画|設定画/.test(q);
    if(illust){
      return english
        ? ' Avoid an over-idealized "AI-beauty" face: do not make the face perfectly symmetrical (reflect his set facial asymmetry), and keep the features individually distinct rather than averaged.'
        : '過度に整った“AI美形”にはせず、顔を完全な左右対称にしない（設定した左右差を反映する）。パーツを平均化せず、この人物固有の個性を保つ。左右差は個性として描き、変形や破綻にはしない。';
    }
    const anti = promptOpt(c).antiAI
      ? (english
        ? ' Anti-AI-look: avoid uniform studio lighting and HDR glow; use natural light with uneven falloff and asymmetric soft shadows, faint sensor noise, and a slightly off-center candid framing. Do not airbrush the skin; keep a neutral, slightly desaturated color grade like an unedited photo.'
        : 'AI感の抑制：均一なスタジオ照明やHDR的な発光感を避け、自然光のムラ・左右非対称の柔らかい影・かすかなノイズ感を含める。構図はわずかにオフセンターのスナップ写真的なフレーミングにする。肌はエアブラシ調に均さず、色調は無加工写真のような彩度控えめのニュートラルにする。')
      : '';
    return anti + (english
      ? ' Render the face with biological realism, like a photograph of a real person: skin with visible pores, tiny irregularities, and natural tonal variation — never porcelain-smooth. Do not make the face perfectly symmetrical (reflect his set facial asymmetry). Keep eye highlights and teeth within natural limits. Avoid the over-idealized "AI-beauty" look — glossy uniform skin, unnaturally large eyes, or averaged, homogeneous features.'
      : '顔は実在の人物の写真のような生物学的リアリズムで描く。肌には毛穴・ごく小さな凹凸・自然な色ムラがあり、陶器のように均一に滑らかにしない。顔は完全な左右対称にせず（設定した左右差を反映）、目のハイライトや歯の描写も自然な範囲にとどめる。いわゆる“AI美形”的な、過度に整った顔立ち・グロスがかった均一な肌・不自然に大きな目・平均化された均質な顔を避ける。左右差は個性として描き、変形や破綻にはしない。');
  }

  function heightContrastCue(c, english=false){
    const h = c.heightRaw || parseInt(c.height, 10) || 171;
    const avg = c.avgHeightBase || 171;
    const d = h - avg;
    if(d >= 12) return english ? ' Compared with door frames and passers-by, he stands about half a head taller — clearly a tall man for this time and place.' : '周囲の通行人やドア枠と比べて頭半分ほど高く見える、その時代・土地では明確な長身として描く。';
    if(d >= 6) return english ? ' He reads slightly taller than the people around him.' : '周囲よりやや背が高いと分かる対比で描く。';
    if(d <= -6) return english ? ' He reads slightly smaller than the people around him, while keeping adult proportions.' : '周囲よりやや小柄に見える対比で描く（大人の比率は維持）。';
    return '';
  }

  function uniformJacketPhrase(c, english=false){
    if(!c || !c.workUniform || !c.jacket || c.jacket === 'なし') return '';
    return english ? ` (with ${c.jacket} worn over it)` : `（上に${c.jacket}を羽織る）`;
  }

  function uniformHatPhrase(c, english=false){
    if(!c || !c.workUniform || !c.headwear || c.headwearOn === false) return '';
    return english ? `, headwear: ${c.headwear} (worn on the head)` : `、帽子は${c.headwear}を着用`;
  }

  function workOutfitSpec(c, english=false){
    if(c.workUniform){
      if(english) return `Work outfit contents: ${c.workUniformEn} — top: ${c.top}${uniformJacketPhrase(c, true)}, bottom: ${c.bottom}, shoes: ${c.shoes}${uniformHatPhrase(c, true)}, socks: ${c.sockBrand} ${c.sockType} (${c.sockColor}, ${c.sockUse}). Do not reproduce real organizations' insignia or logos. `;
      return `職業服装の内容：${c.workUniform}。トップスは${c.top}${uniformJacketPhrase(c, false)}、ボトムスは${c.bottom}、靴は${c.shoes}${uniformHatPhrase(c, false)}、靴下は${c.sockBrand}の${c.sockType}（${c.sockColor}、${c.sockUse}）。実在組織の記章・ロゴは正確に再現しない。`;
    }
    if(english) return `Work outfit contents: ${c.outfitBrand} ${c.outfitType} — outerwear: ${c.jacket}, top: ${c.topBrand?`${c.topBrand} `:''}${c.top}, bottom: ${c.bottomBrand?`${c.bottomBrand} `:''}${c.bottom}, shoes: ${c.shoesBrand?`${c.shoesBrand} `:''}${c.shoes}, socks: ${c.sockBrand} ${c.sockType} (${c.sockColor}, ${c.sockUse}).${c.tie?` Tie: ${c.tie}.`:''}${c.coat?` Coat: ${c.coat}.`:''}${c.suitSilhouette?` Suit silhouette: ${c.suitSilhouette}.`:''}${c.workFitNote?` ${c.workFitNote}.`:''}${accText(c,false,true)} `;
    return `職業服装の内容：${c.outfitBrand}の${c.outfitType}。上着は${c.jacket}、トップスは${c.topBrand?`${c.topBrand}の`:''}${c.top}、ボトムスは${c.bottomBrand?`${c.bottomBrand}の`:''}${c.bottom}、靴は${c.shoesBrand?`${c.shoesBrand}の`:''}${c.shoes}、靴下は${c.sockBrand}の${c.sockType}（${c.sockColor}、${c.sockUse}）。${c.tie?`ネクタイは${c.tie}。`:''}${c.coat?`コートは${c.outerBrand?`${c.outerBrand}の`:''}${c.coat}。`:''}${c.suitSilhouette?`スーツのシルエットは「${c.suitSilhouette}」。`:''}${c.workFitNote?`${c.workFitNote}。`:''}${accText(c,false,false)}`;
  }

  function innerCasualNotes(c, english=false){
    const notes = [c.holidayGapSuit ? (english?'He wears a suit even on his day off — to him, this IS casual':'休日なのにスーツ。本人は私服のつもり') : '', c.holidayStyleNote || c.styleNote, c.muscleFashionNote, c.senseFashionNote].filter(Boolean);
    const senseLn = c.fashionSenseText ? (english ? ` His styling policy: "${c.fashionSenseText}".` : `本人のコーデ基準：「${c.fashionSenseText}」。`) : '';
    if(!notes.length) return senseLn;
    return (english ? ` Styling notes: ${notes.join('; ')}.` : `着こなしメモ：${notes.join('。')}。`) + senseLn;
  }

  function casualOutfitSpec(c, english=false){
    if(english) return `Casual outfit contents: ${c.holidayOutfitBrand || c.outfitBrand} ${c.holidayOutfitType || c.outfitType} — outerwear: ${c.holidayJacket || 'none'}, top: ${c.holidayTopBrand?`${c.holidayTopBrand} `:''}${c.holidayTop || c.top}, bottom: ${c.holidayBottomBrand?`${c.holidayBottomBrand} `:''}${c.holidayBottom || c.bottom}, shoes: ${c.holidayShoesBrand?`${c.holidayShoesBrand} `:''}${c.holidayShoes || c.shoes}, socks: ${c.holidaySockBrand || c.sockBrand} ${c.holidaySockType || c.sockType} (${c.holidaySockColor || c.sockColor}).${c.holidayEraFashionNote?` Overall: ${c.holidayEraFashionNote}.`:''}${accText(c,true,true)}${innerCasualNotes(c, true)} `;
    return `私服コーデの内容：${c.holidayOutfitBrand || c.outfitBrand}の${c.holidayOutfitType || c.outfitType}。上着は${c.holidayJacket && c.holidayJacket!=='指定なし' && c.holidayOuterBrand ? `${c.holidayOuterBrand}の` : ''}${c.holidayJacket || 'なし'}、トップスは${c.holidayTopBrand?`${c.holidayTopBrand}の`:''}${c.holidayTop || c.top}、ボトムスは${c.holidayBottomBrand?`${c.holidayBottomBrand}の`:''}${c.holidayBottom || c.bottom}、靴は${c.holidayShoesBrand?`${c.holidayShoesBrand}の`:''}${c.holidayShoes || c.shoes}、靴下は${c.holidaySockBrand || c.sockBrand}の${c.holidaySockType || c.sockType}（${c.holidaySockColor || c.sockColor}）。${c.holidayEraFashionNote?`全体は${c.holidayEraFashionNote}。`:''}${accText(c,true,false)}${innerCasualNotes(c)}`;
  }

  function occupationBackdrop(occ, english=false){
    const sp = {
      '消防士': ['非番の消防署近くの街並み','a street near the fire station on his day off'],
      '警察官': ['非番の交番前の通り','a street near a police box on his day off'],
      '自衛官': ['駐屯地近くの落ち着いた街並み','a calm street near the base'],
      '農家': ['畑と直売所のある田園風景','farmland with a produce stand'],
      '漁師': ['朝の漁港','a fishing port in the morning'],
      '美容師': ['おしゃれなサロンの前','the front of a stylish hair salon'],
      'バーテンダー': ['夜のバーの入口','the entrance of a bar at night'],
      '喫茶店マスター': ['昭和の面影が残る喫茶店の前','the front of a retro coffee shop'],
      '僧侶': ['寺の門前','the gate of a temple'],
      '悠々自適（定年後）': ['朝の公園','a park in the morning'],
      '救急隊員': ['救急ステーションの近く','near an ambulance station'],
      '防衛大学校学生': ['学校近くの坂道の街並み','a hillside street near the academy'],
      'お笑い芸人': ['劇場の前','the front of a comedy theater'],
      'YouTuber': ['撮影機材のある街角','a city corner with filming gear'],
      '寿司職人': ['のれんの掛かった寿司店の前','the front of a sushi restaurant with a noren curtain'],
      'ラーメン店店主': ['湯気の上がるラーメン店の前','the front of a steaming ramen shop']
    };
    if(sp[occ]) return english ? sp[occ][1] : sp[occ][0];
    const cat = OCC_CAT[occ];
    const byCat = {
      office:['夕方のオフィス街','an office district in the evening'], it:['モダンなオフィスビルの前','the front of a modern office building'],
      medical:['病院近くの街並み','a street near a hospital'], edu:['学校近くの通り','a street near a school'],
      service:['店舗が並ぶ通り','a street lined with shops'], trade:['作業場や工房の前','the front of a workshop'],
      creative:['スタジオや制作現場の近く','near a studio or production site'], uniform:['スポーツ施設の前','the front of a sports facility'],
      enta:['スタジオや劇場の近く','near a studio or theater'], showa:['昭和の街並み','a Showa-era streetscape'],
      student:['大学キャンパス','a university campus'], retired:['朝の公園','a park in the morning']
    };
    const b = byCat[cat] || ['自然な街並み','a natural streetscape'];
    return english ? b[1] : b[0];
  }

  function magazineStyleByEra(eraYear, english=false){
    const y = Number(eraYear) || 2026;
    if(y < 1935) return english ? 'a prewar photo-album page layout (monochrome plates, classical vertical typesetting)' : '戦前の写真帖風レイアウト（モノクロ図版と伝統的な縦組み）';
    if(y < 1960) return english ? 'a postwar monochrome graph-magazine layout' : '戦後の白黒グラフ誌風レイアウト';
    if(y < 1980) return english ? 'a Showa-era weekly magazine gravure layout (vertical text, grainy photos, retro typefaces)' : '昭和の週刊誌グラビア風レイアウト（縦組み・粒子感のある写真・レトロな書体）';
    if(y < 1990) return english ? 'an 80s city-magazine layout with bright colors and hand-drawn accents' : '80年代シティ系雑誌風レイアウト（明るい配色と手書き風あしらい）';
    if(y < 2000) return english ? 'a 90s street-fashion magazine layout with lively cutout collages' : '90年代ストリートファッション誌風レイアウト（にぎやかな切り抜きコラージュ）';
    if(y < 2010) return english ? 'a 2000s men\'s fashion magazine layout with big headlines and feature tabs' : '2000年代メンズファッション誌風レイアウト（大きな見出しと特集タブ）';
    if(y < 2020) return english ? 'a minimal 2010s lifestyle magazine layout' : '2010年代のミニマルなライフスタイル誌風レイアウト';
    return english ? 'a clean modern web-magazine style layout' : '現代のWebマガジン風のクリーンなレイアウト';
  }

  function magazineQA(c, english=false){
    const g = {guardian:['ISTJ','ISFJ','ESTJ','ESFJ'], analyst:['INTJ','INTP','ENTJ','ENTP'], social:['ESTP','ESFP','ENFP','ENFJ']};
    const grp = g.guardian.includes(c.mbti) ? 'guardian' : g.analyst.includes(c.mbti) ? 'analyst' : g.social.includes(c.mbti) ? 'social' : 'creative';
    const hobbyMap = {'スポーツ系':['ジム通いやフットサル','the gym and futsal'],'古着系':['古着屋巡り','vintage shopping'],'オタク系':['アニメやゲーム','anime and games'],'アウトドア系':['キャンプや登山','camping and hiking'],'バンドマン系':['バンド活動や機材集め','band practice and gear'],'レトロ系':['純喫茶巡り','retro coffee shops'],'メガネ知的系':['読書や美術館','reading and museums'],'おじさん系':['銭湯や晩酌','public baths and evening drinks'],'ギャル男系':['サウナや流行の遊び','saunas and trendy hangouts'],'ホスト系':['筋トレや美容','working out and skincare'],'サブカル系':['ミニシアターやレコード','indie cinemas and records'],'清楚系':['カフェでの読書','reading at cafes'],'ヤンキー系':['バイクいじり','tinkering with motorbikes'],'普通系':['散歩や動画鑑賞','walks and watching videos']};
    const hobbyDef = {guardian:['料理や散歩','cooking and walks'], analyst:['読書や考え事','reading and thinking'], social:['友人との食事','eating out with friends'], creative:['音楽や写真','music and photography']};
    const hobby = hobbyMap[c.vibe] || hobbyDef[grp];
    if(english) return `Pick 2-3 questions such as "How do you spend your days off?", "What are you into lately?", and "What's your type?". Do NOT use pre-written answers — write the answers on the spot, in his own natural voice, based on this persona: personality ${mbtiDescription(c.mbti, 'en')}, vibe ${promptValue(c.vibe) || c.vibe}, hobby tendencies around ${hobby[1]}${c.sportName && c.sportName !== 'なし' ? `, and his sport is ${promptValue(c.sportName)}` : ''}. Match the wording to his age (${c.age}) and to how people spoke around ${c.eraYear || '2026'}.`;
    return `質問は「休日の過ごし方」「最近のマイブーム」「好きなタイプ」などから2〜3問選ぶ。回答の例文はここには書かないので、生成時に本人の人物像に沿った自然な口調でその場で書き起こすこと。人物像ヒント：性格は${mbtiDescription(c.mbti, 'ja')}、雰囲気は${c.vibe}、趣味の傾向は${hobby[0]}あたり${c.sportName && c.sportName !== 'なし' ? `、競技は${c.sportName}` : ''}。言葉選びは${c.age}歳という年齢と、${eraLabel(c.eraYear)}頃の話し言葉に合わせる`;
  }

  function profileShortText(c, english=false){
    const per = mbtiDescription(c.mbti, langOf(english));
    const hol = c.holidayOutfitType || '';
    if(english) return `A ${c.age}-year-old ${promptValue(c.role) || 'man'} with a ${String(per).toLowerCase()} air; on days off he goes for a ${promptValue(hol) || 'relaxed'} style.`;
    return `${per}雰囲気の${c.age}歳・${c.role}。休日は${hol ? hol + 'の装い' : '気楽な私服'}で過ごす。`;
  }

  function catchphrase(c, english=false){
    const occ = (c.role==='プロスポーツ選手' && c.sportName && c.sportName!=='なし') ? `${c.sportName}選手` : (c.role || '');
    const occEn = (c.role==='プロスポーツ選手' && c.sportName && c.sportName!=='なし')
      ? `${promptValue(c.sportName)} player`
      : (promptValue(c.role) || c.role);
    const enJoin = (adjRaw) => { const adj = String(adjRaw||'').toLowerCase().trim(); const noun = String(occEn).toLowerCase(); const p = adj ? `${adj} ${noun}` : noun; return `${/^[aeiou]/.test(p) ? 'An' : 'A'} ${p}`; };
    const bright = ['金髪（ブリーチ）','ブリーチベージュ','ミルクティーベージュ','ハイトーンアッシュ','明るめブラウン','オレンジブラウン','シルバーアッシュ'].includes(c.hairColor);
    const blackish = ['黒','ブルーブラック','ネイビーブラック','黒に近いダークブラウン'].includes(c.hairColor);
    const gray = ['白髪まじり','ロマンスグレー','ごま塩頭','ほぼ白髪'].includes(c.hairColor);
    const strict = STRICT_HAIR_OCC.includes(c.role), free = FREE_HAIR_OCC.includes(c.role);
    if(c.holidayPersona) return english ? `${enJoin('')} on weekdays, ${String(promptValue(c.vibe) || c.vibe).toLowerCase()} on days off` : `平日は${occ}、休日は${c.vibe}`;
    if(c.age >= 60 && ['ギャル男系','やりらふぃー系','ヤンキー系','ストリート系','バンドマン系','韓国風','ホスト系'].includes(c.vibe)) return english ? `Forever ${String(promptValue(c.vibe) || c.vibe).toLowerCase()} — ${String(occEn).toLowerCase()}` : `いくつになっても${c.vibe}の${occ}`;
    if(c.age <= 30 && ['飲食店店長','ラーメン店店主','コンビニ店長','寿司職人','喫茶店マスター'].includes(c.role)) return english ? enJoin('young') : `若き${occ}`;
    if(strict && bright) return english ? `${enJoin('')} with unexpectedly bright hair` : `明るい髪の${occ}`;
    if(free && blackish) return english ? `${enJoin('')} who keeps his hair black` : `黒髪のままの${occ}`;
    if(gray && c.age < 50) return english ? enJoin('gray-haired-too-soon') : `若白髪の${occ}`;
    // 特徴候補を収集し、ランダムに1つ選ぶ
    const feats = [];
    const hairFeat = {'金髪（ブリーチ）':['金髪の','bleached-blond'],'ブリーチベージュ':['ブリーチヘアの','bleach-haired'],'ハイトーンアッシュ':['ハイトーンの','high-tone-haired'],'シルバーアッシュ':['シルバーヘアの','silver-haired'],'メッシュ入りブラック':['メッシュヘアの','highlight-streaked'],'インナーカラー（アッシュ）':['インナーカラーの','inner-colored'],'プリン気味の伸びた茶髪':['プリン頭の','grown-out-dyed'],'オレンジブラウン':['オレンジヘアの','orange-haired'],'白髪まじり':['白髪まじりの','graying'],'ロマンスグレー':['ロマンスグレーの','silver-gray'],'ごま塩頭':['ごま塩頭の','salt-and-pepper'],'ほぼ白髪':['白髪の','white-haired']};
    if(hairFeat[c.hairColor]) feats.push(hairFeat[c.hairColor]);
    const faceFeat = {'ワイルド系':['ワイルド顔の','wild-faced'],'ブサイク系':['愛嬌のある顔の','charmingly homely'],'ホスト系':['ホスト顔の','host-club-faced'],'おじさん系':['おじさん顔の','middle-aged-faced'],'昭和顔（濃い顔立ち）':['昭和顔の','Showa-faced'],'塩顔系':['塩顔の','subtle-featured'],'韓国アイドル風':['アイドル顔の','idol-faced'],'高身長モデル系':['モデル顔の','model-faced'],'やんちゃ系':['やんちゃ顔の','mischievous-faced'],'ソース顔':['ソース顔の','bold-featured'],'しょうゆ顔':['しょうゆ顔の','refined-featured'],'ミステリアス系':['ミステリアスな','mysterious'],'クール系':['クールな','cool-looking'],'彫りの深い縄文系':['彫りの深い','deep-featured'],'たれ目系':['たれ目の','droopy-eyed'],'つり目系':['つり目の','sharp-eyed'],'弟系童顔（笑顔が武器）':['童顔の','baby-faced'],'垂れ目パピー系':['垂れ目の','puppy-eyed'],'愛嬌くしゃ笑い顔':['くしゃ笑いの','crinkle-smiling']};
    if(faceFeat[c.facePreset]) feats.push(faceFeat[c.facePreset]);
    const bodyFeat = {'ビール腹':['ビール腹の','beer-bellied'],'ラグビー選手体型':['ラグビー体型の','rugby-built'],'華奢な体型':['華奢な','delicately built'],'細マッチョ':['細マッチョの','lean-muscled'],'ぽっちゃり':['ぽっちゃり','chubby'],'筋肉質':['筋肉質な','muscular'],'高身長モデル体型':['高身長','tall'],'隠れ筋肉質':['脱いだらすごい','secretly muscular'],'腹だけぽっちゃり':['お腹だけゆるい','belly-soft'],'柔道家体型':['柔道家体型の','judo-built'],'骨太体型':['骨太な','big-boned']};
    if(bodyFeat[c.bodyType]) feats.push(bodyFeat[c.bodyType]);
    const h = parseInt(c.height);
    const hb = c.avgHeightBase || 171;
    if(h >= hb + 10) feats.push(['長身の','extra-tall']);
    else if(h && h <= hb - 8) feats.push(['小柄な','compact']);
    if(c.glasses && c.glasses !== 'なし') feats.push([`${c.glasses}の`, 'bespectacled']);
    if(c.facialHair && c.facialHair !== 'なし') feats.push([c.facialHair.includes('無精') ? '無精ひげの' : 'ひげの', c.facialHair.includes('無精') ? 'stubbled' : 'bearded']);
    if(c.skinDetail && c.skinDetail !== 'なし（クリアな肌）'){
      if(String(c.skinDetail).includes('泣きぼくろ')) feats.push(['泣きぼくろの','teardrop-moled']);
      else if(String(c.skinDetail).includes('そばかす')) feats.push(['そばかすの','freckled']);
      else if(String(c.skinDetail).includes('ほくろ')) feats.push(['ほくろの','moled']);
    }
    if(feats.length){
      const f = pick(feats);
      return english ? enJoin(f[1]) : `${f[0]}${occ}`;
    }
    if(c.age >= 60) return english ? `${enJoin('seasoned')}, still going strong` : `まだまだ現役の${occ}`;
    return english ? enJoin(promptValue(c.vibe) || c.vibe) : `${c.vibe}の${occ}`;
  }

  function refSheetInstruction(c, english=false){
    const kind = refSheetKind(c.outputType);
    if(!kind) return null;
    const mustJa = '必須パネルとして、全身の正面、全身の側面、足元詳細（足の正面と足裏）を必ず含める。';
    const mustEn = 'As mandatory panels, always include the full-body front view, the full-body side view, and a foot detail section (foot front view and sole view).';
    const sameJa = '各パネルにラベルを付け、全パネル同一人物として顔立ち・体型・身長感を完全に一致させる。非性的で、体型・服装確認用の資料として健全に描く。';
    const sameEn = 'Label every panel, keep every panel clearly the same person with identical face, body proportions, and height impression, and keep the sheet non-sexual as a neutral body/outfit reference.';
    if(kind==='compare'){
      if(english) return `Create a landscape comparison reference sheet. Left panel: him wearing only his underwear. Right panel: him wearing his full suggested outfit but WITHOUT shoes, wearing only the suggested socks so his feet are visible. Both panels show the full-body front view in the same pose and same scale. ${mustEn} The foot detail section shows only the bare foot front view and sole view, with no dedicated sock-detail panel. ${outfitSummaryLine(c, true)} ${sameEn}`;
      return `横長の比較リファレンスシートとして構成する。左パネルは下着のみの姿、右パネルは提案服装を着ているが靴は履いていない姿（提案靴下のみ着用で足元が見える）。両パネルとも同一ポーズ・同一スケールの全身の正面で描く。${mustJa}足元詳細は素足の足の正面と足裏を配置する（靴下の詳細パネルは入れない）。${outfitSummaryLine(c, false)}${sameJa}`;
    }
    if(kind==='expressions'){
      if(english) return `Create an expression variation reference sheet. Upper section: ${mustEn} Lower section: a 2×3 grid of six face close-up expressions — neutral, soft smile, big smile, surprised, slightly troubled, and a cool sideways glance. Keep the hairstyle identical in every expression panel. ${sameEn}`;
      return `表情差分リファレンスシートとして構成する。上段：${mustJa}下段：顔アップの表情差分6種（真顔／微笑み／笑顔／驚き／少し困った顔／クールな流し目）を2×3のグリッドで並べる。全表情コマで髪型を完全に一致させる。${sameJa}`;
    }
    if(kind==='full'){
      if(english) return `Create a full character reference sheet. Include: full-body front, side, AND back views; face front and side views; four expression variations (neutral, soft smile, big smile, cool); and a foot detail section with the foot front view and sole view (no dedicated sock-detail panel). ${mustEn} ${sameEn}`;
      return `フル設定資料シートとして構成する。全身の正面・側面・後ろ姿、顔の正面と側面、表情差分4種（真顔／微笑み／笑顔／クールな表情）、足元詳細（足の正面・足裏）を1枚に整理して配置する。靴下の詳細パネルは入れない。${mustJa}${sameJa}`;
    }
    if(kind==='machiWork'){
      if(english) return `Create a "spotted in town: at work" sheet — a candid street-documentary style collage of 3-4 snapshot panels showing him actually working in his work outfit${c.workUniformEn ? ` (${c.workUniformEn})` : ''}. At least one panel shows his FULL BODY; mix in shots of his hands at work and his expression. He is unaware of the camera, but the tone must be wholesome street documentary — never voyeuristic. Background: ${occupationBackdrop(c.role, true)}. ${outfitSummaryLine(c, true)} Add subtle panel labels, keep every panel the same person, non-sexual.`;
      return `「街で見かけたイケメンシート：職業編」として構成する。${c.role}が職業服装${c.workUniform ? `（${c.workUniform}）` : ''}で実際に働いている自然な瞬間を、スナップ写真風に3〜4コマ並べた1枚シートにする。少なくとも1コマは全身が写るカットにし、働く手元や表情のカットを織り交ぜる。撮られていることに気づいていない自然な雰囲気だが、盗撮的ないやらしさは一切なく、街角ドキュメンタリー風の健全なトーンにする。背景は${occupationBackdrop(c.role, false)}。${outfitSummaryLine(c, false)}各コマにさりげないラベルを付け、全コマ同一人物として非性的に描く。`;
    }
    if(kind==='machiOff'){
      const offJa = `私服の内容：${c.holidayOutfitBrand || c.outfitBrand}の${c.holidayOutfitType || c.outfitType}、トップスは${c.holidayTop || c.top}、ボトムスは${c.holidayBottom || c.bottom}、靴は${c.holidayShoes || c.shoes}。`;
      const offEn = `Casual outfit: ${c.holidayOutfitBrand || c.outfitBrand} ${c.holidayOutfitType || c.outfitType}, top ${c.holidayTop || c.top}, bottom ${c.holidayBottom || c.bottom}, shoes ${c.holidayShoes || c.shoes}.`;
      if(english) return `Create a "spotted in town: off duty" sheet — 3-4 candid snapshot panels of him spending his day off in his casual outfit, in scenes that fit his vibe (a cafe, a stroll, browsing shops, etc.). At least one panel shows his FULL BODY. He looks relaxed and unaware of the camera, in a wholesome street-snap tone — never voyeuristic. ${offEn} Add subtle panel labels, keep every panel the same person, non-sexual.`;
      return `「街で見かけたイケメンシート：オフ編」として構成する。私服姿でオフの時間を過ごす自然な瞬間を、スナップ写真風に3〜4コマ並べた1枚シートにする。場面は本人の雰囲気に合うもの（カフェ・散歩・買い物・公園など）。少なくとも1コマは全身が写るカットにする。力の抜けたリラックスした表情で、盗撮的ないやらしさは一切ない健全な街角スナップのトーンにする。${offJa}各コマにさりげないラベルを付け、全コマ同一人物として非性的に描く。`;
    }
    if(kind==='feet'){
      const fc = footCfg(c);
      const fsrow = FOOT_SCENES.find(x=>x[0]===fc.scene) || footOccScenes(c && c.role).find(x=>x[0]===fc.scene);
      const frow = FOOT_FABRICS.find(x=>x[0]===fc.fabric);
      const barefootish = fc.sockState !== 'ランダム' && fc.sockState !== '靴下を履いたまま';
      const footSpecJa = `${footWidthDesc(c, false)}。${footFeatureLine(c, false, barefootish)}${barefootish ? soleDetailLine(c, false) : ''}`;
      const footSpecEn = ` ${footWidthDesc(c, true)}.${footFeatureLine(c, true, barefootish)}${barefootish ? soleDetailLine(c, true) : ''}`;
      if(english){
        const sceneEn = fc.scene==='ランダム'
          ? `Choose ONE scene in which removing his shoes arises NATURALLY from his occupation or the flow of his day — tatami rooms, raised seating, entryways, break spaces, or a Shinkansen seat are only examples; feel free to invent any fitting situation${c.sceneIdea ? ` (usable scene idea for reference: "${c.sceneIdea}")` : ''}.`
          : `Scene: ${fc.scene}${fsrow && fsrow[2] ? ` (floor: ${fsrow[2]})` : ''}.`;
        const postureEn = fc.posture==='ランダム' ? '' : ` Posture: ${fc.posture}.`;
        const shoeEn = fc.shoeState==='ランダム'
          ? ` His removed shoes (${c.shoes}) appear tucked at the edge of the frame ONLY if that is natural for the scene — otherwise leave them out of frame.`
          : ` Shoe state: ${fc.shoeState}（靴：${c.shoes}）.`;
        const wearEn = fc.wear==='私服' ? casualOutfitSpec(c, true) : workOutfitSpec(c, true).replace(/shoes: [^,]+, /, '');
        const fabricEn = fc.fabric==='ランダム'
          ? ' The sock fabric must NOT look brand-new: depict a natural state somewhere between everyday wear and well worn-in, fitting the situation.'
          : ` Sock fabric condition: ${frow ? frow[2] : fc.fabric}.`;
        const sockEn = fc.sockState==='ランダム' || fc.sockState==='靴下を履いたまま'
          ? ` The composition should naturally draw the eye to his sock-clad feet (${c.sockBrand} ${c.sockType}, ${c.sockColor})`
          : ` Sock state: ${fc.sockState} (socks: ${c.sockBrand} ${c.sockType}, ${c.sockColor}); the composition should naturally draw the eye to his feet`;
        const angleEn = fc.angle==='ランダム' ? '' : ` Camera: ${fc.angle} — even from a low angle, do NOT turn this into an exaggerated close-up; keep enough distance that he is identifiable.`;
        const propEn = fc.prop==='ランダム' ? ' One or two small props fitting the scene may be added near his feet.' : (fc.prop==='なし' ? '' : ` Place near his feet: ${fc.prop}.`);
        return `Create a "chance foot-focus scene sheet". ${sceneEn}${postureEn} ${wearEn}${fabricEn}${sockEn} — e.g. just after slipping off his shoes, sitting casually, or resting — without unnatural enlargement and without pointedly turning his soles toward the viewer; keep his feet naturally noticeable within the scene. His upper body or full figure stays naturally in frame so he is clearly identifiable.${shoeEn}${angleEn}${propEn}${footSpecEn} Keep any dirt or wear within a natural range (faint sole marks and dulling only; no excessive soiling or unsanitary depiction). Render the feet with accurate, realistic human anatomy${barefootish ? ', including bare feet with correct toe counts and joints' : ''}. Avoid: deformed feet, wrong toe counts or broken joints, more than his own two feet, duplicated soles or extra pairs of feet, unnatural bending angles, exaggerated close-ups of soles or toes, and any sexual staging. Keep it a relaxed, wholesome slice of everyday life.`;
      }
      const sceneJa = fc.scene==='ランダム'
        ? `職業や1日の流れの中で靴を脱ぐ必然性が自然に生まれる場面を1つ選んで描く。和室・座敷・小上がり・玄関・休憩スペース・新幹線の座席などはあくまで例であり、これらに限定せず人物の職業や生活から自由に発想してよい${c.sceneIdea ? `（参考にできる場面アイデア：「${c.sceneIdea}」）` : ''}。`
        : `場面は「${fc.scene}」${fsrow && fsrow[2] ? `（床は${fsrow[2]}）` : ''}。`;
      const postureJa = fc.posture==='ランダム' ? '' : `座り方・姿勢は「${fc.posture}」。`;
      const shoeJa = fc.shoeState==='ランダム'
        ? `脱いだ靴（${c.shoes}）は、場面として自然な場合のみ画面の隅に収め、構図に入れる必然性がなければ画面に入れない。`
        : `靴の状態は「${fc.shoeState}」（靴：${c.shoes}）。`;
      const wearJa = fc.wear==='私服' ? `私服でくつろいだ状態で描く。${casualOutfitSpec(c, false)}` : `職業服装のまま靴だけを脱いだ状態を基本とする。${workOutfitSpec(c, false)}`;
      const fabricJa = fc.fabric==='ランダム'
        ? `靴下の生地は新品には見せず、日常の使用感〜履き込んだ状態の間で場面に合った自然な状態を精細に描く。`
        : `靴下の生地の状態：${frow ? frow[2] : fc.fabric}。`;
      const sockJa = fc.sockState==='ランダム' || fc.sockState==='靴下を履いたまま'
        ? `提案靴下（${c.sockBrand}の${c.sockType}、${c.sockColor}）を履いた足元へ、構図の中で自然に視線が導かれるようにする`
        : `靴下の着脱状態は「${fc.sockState}」（靴下：${c.sockBrand}の${c.sockType}、${c.sockColor}）。足元へ構図の中で自然に視線が導かれるようにする`;
      const angleJa = fc.angle==='ランダム' ? '' : `カメラは「${fc.angle}」から。低アングルでも過度な接写にはせず、誰なのか分かる距離感を保つ。`;
      const propJa = fc.prop==='ランダム' ? `場面に合う小物を1〜2点、足元の近くに添えてもよい。` : (fc.prop==='なし' ? '' : `足元の近くに「${fc.prop}」を添える。`);
      return `「偶然足元強調場面シート」として構成する。${sceneJa}${postureJa}${wearJa}${fabricJa}${sockJa}（玄関で靴を脱いだ直後・座敷で足を崩した瞬間・縁側でくつろぐ姿など）。足元を不自然に拡大したり、足裏をことさらこちらへ向けたりせず、画面内で自然に目立つ程度にとどめる。上半身または全身も自然に画面に収め、誰なのか分かるようにする。${shoeJa}${angleJa}${propJa}${footSpecJa}汚れは踏み跡やうっすらしたくすみ程度の自然な範囲にとどめ、過度な汚損や不衛生な表現はしない。足元は写実的で正確な人体構造を維持する${barefootish ? '（素足の場合も指の本数・関節を正確に描く）' : ''}。避けること：足の変形、指の本数や関節の崩れ、本人の両足2本以外の足の生成、足裏の重複や複数人分の足裏、不自然な曲がり方、足裏・足指の過度な接写、性的な演出。自然でリラックスした健全な生活描写にとどめる。`;
    }
    if(kind==='profilesheet'){
      if(!c.bloodType) generateInnerProfile(c);
      if(!c.measurementA && typeof ensureProfileMeasurements==='function') ensureProfileMeasurements(c);
      const wear = (ST.current && ST.current.profileSheetWear) || '職業服装';
      const wearSpecJa = wear==='私服' ? casualOutfitSpec(c, false) : workOutfitSpec(c, false);
      const wearSpecEn = wear==='私服' ? casualOutfitSpec(c, true) : workOutfitSpec(c, true);
      const A = Number(c.measurementA).toFixed(1), B = Number(c.measurementB).toFixed(1);
      const CL = (typeof profileMeasurementCLabel==='function') ? profileMeasurementCLabel(c.measurementC, english) : c.measurementC;
      const S = ST.innerCatShow;
      const catLines = [];
      if(S.basic) catLines.push(`【基本】生年月日：${c.birthdateText}／出身地：${String(c.birthplaceText||'').replace('：','')}／血液型：${c.bloodType}／一人称：${c.pronoun}／口調：${c.speechText}／あだ名：${c.nicknameText}`);
      if(S.life) catLines.push(`【暮らし・家族】${c.maritalText}・恋人：${c.loverText}／家族構成：${c.familyText}／${c.livingText}・住居：${c.residenceText}／出自：${c.originText}／学歴：${c.educationText}／収入：${c.incomeText}／資産：${c.assetText}`);
      if(S.daily) catLines.push(`【日常・嗜好】健康：${c.healthText}／趣味：${c.hobbyText}／マイブーム：${c.myBoomText}／好物：${c.foodLikeText}・苦手：${c.foodHateText}`);
      if(S.mind) catLines.push(`【内面】行動原理：${c.principleText}／夢：${c.innerDream}／本音の欲望：${c.innerDesire}／弱点：${c.weaknessMind}・${c.weaknessBody}／才能：${c.innerTalent}／コンプレックス：${c.complexText}／許せないこと：${c.unforgivableText}／コーデ基準：${c.fashionSenseText}`);
      if(S.past) catLines.push(`【過去・人間関係】${c.pastUpbringing}／${c.pastTrauma}／思い出：${c.memoryText}／親友：${String(c.friendText||'').replace(/〔.*?〕/,'')}／恋愛対象：${c.loveTarget}／恋愛経験：${c.loveCountText}`);
      if(S.adult) catLines.push(`【オトナの事情（小さく・婉曲表現で）】飲酒：${c.drinkText}／喫煙：${c.smokeText}／ギャンブル歴：${c.gambleText}／風俗経験：${c.fuzokuText}／初めての体験：${c.firstExpText}／経験人数：${c.expCountText}／週頻度：相手あり ${c.weekFreqText}・セルフ ${c.selfFreqText}`);
      const linesJa = catLines.join('。 ');
      if(english){
        const blocks = [
          `(1) his one-line bio "${bioLine(c, true)}" under a small headline`,
          `(2) a basic profile block (name ${nameKana(c)}, age ${c.age}, occupation ${promptValue(c.role)}, height ${c.height}, weight ${c.weight}, foot ${c.footSize}, MBTI ${c.mbti} / ${mbtiDescription(c.mbti, 'en')})`
        ];
        if(catLines.length) blocks.push(`(3) an "Inner / Background" block in smaller type listing (values are Japanese, keep them verbatim and readable): ${linesJa}`);
        blocks.push(`(${catLines.length?4:3}) a "PROFILE ONLY A / B / C" box: A ${A}cm / B ${B}cm / C ${CL} — print the values only, never explain their meaning`);
        return `Create a single 16:9 "character profile sheet". LEFT: one full-body standing shot in his ${wear==='私服'?'casual outfit':'work outfit'} with shoes (${wearSpecEn}). RIGHT: a clean info area with — ${blocks.join('; ')}. Keep all text clean and unbroken.${catLines.length&&S.adult?' Soften the "grown-up matters" lines with tasteful euphemism or partial masking.':''} Render as a wholesome, non-sexual character reference sheet in the visual quality "${enQuality(c.quality)}".`;
      }
      const blocks = [
        `①小見出しの下にひとこと背景「${c.bioText || bioLine(c, false)}」`,
        `②基本プロフィール欄（名前：${nameKana(c)}／${c.age}歳／${c.role}／身長${c.height}・体重${c.weight}・足${c.footSize}／MBTI：${c.mbti} / ${mbtiDescription(c.mbti, 'ja')}）`
      ];
      if(catLines.length) blocks.push(`③「内面・背景」欄を小さめの文字で整理して記載する：${linesJa}`);
      blocks.push(`${catLines.length?'④':'③'}「PROFILE ONLY A / B / C」欄（A：${A}cm／B：${B}cm／C：${CL}。数値・表記のみ記載し、意味の説明は一切書かない）`);
      return `「キャラクタープロフィールシート」として16:9の1枚に構成する。左側：${wear==='私服'?'私服':'職業服装'}のフルコーデでの全身立ち姿を1枚（靴あり。${wearSpecJa}）。右側：情報エリアを整然と組む。${blocks.join('。')}。誌面の日本語はすべて文字化けさせず読みやすく。${catLines.length&&S.adult?'「オトナの事情」の行は伏せ字や婉曲で品よく小さく。':''}全体は健全で非性的な人物設定資料として、画風・質感「${c.quality}」で描く。`;
    }
    if(kind==='magazine'){
      if(english) return `Create a "character feature magazine page" — a fictional magazine spread featuring ${nameKana(c)} (${c.age}, ${promptValue(c.role)}), designed in ${magazineStyleByEra(c.eraYear, true)}. Layout: one main photo (casual outfit — ${casualOutfitSpec(c, true).replace('Casual outfit contents: ','')}), a smaller sub-cut (work outfit — ${workOutfitSpec(c, true).replace('Work outfit contents: ','')}), a big headline using the catchphrase "${catchphrase(c, true)}", a profile box (name, age, occupation, height ${c.height}), and a mini interview section: ${magazineQA(c, true)} ${c.season ? `Give the page a seasonal ${String(promptValue(c.season) || c.season).toLowerCase()} -issue feel. ` : ''}${innerMagazineBlock(c, true)}All page text must be clean and readable. Use a FICTIONAL magazine identity${c.nationality && c.nationality !== '日本' ? ` published in ${promptValue(c.nationality)}` : ''} — no real magazine names or logos.`;
      return `「人物特集雑誌ページ」として構成する。${nameKana(c)}（${c.age}歳・${c.role}）を特集する${c.nationality && c.nationality !== '日本' ? `${c.nationality}で発行されている` : ''}架空の雑誌の誌面で、レイアウトは${eraLabel(c.eraYear)}頃の${magazineStyleByEra(c.eraYear, false)}にする。構成：メイン写真（私服コーデ。${casualOutfitSpec(c, false)}）、小さめのサブカット（職業服装。${workOutfitSpec(c, false)}）、キャッチフレーズ「${catchphrase(c, false)}」を使った大見出し、プロフィール欄（名前・年齢・職業・身長${c.height}）、ミニインタビュー欄：${magazineQA(c, false)}。${c.season ? `${c.season}の特集号として、誌面全体に季節感も添える。` : ''}${innerMagazineBlock(c, false)}誌面の日本語はすべて読みやすく、文字化けさせない。実在の雑誌名・ロゴは使わず、架空の雑誌としてデザインする。`;
    }
    if(kind==='outfitref'){
      if(english) return `Create an outfit reference sheet with an occupation-themed backdrop. The hero content is his full WORK outfit (shoes included). Panels: (1) full-body FRONT view in the complete work outfit with shoes, (2) full-body SIDE view, (3) an upper-body close-up showing fabric and layering details, (4) a shoe detail (side view and sole), and (5) a foot detail with the BARE foot front view and sole view (shoes and socks removed), and (6) a SOCK detail panel showing the foot wearing the suggested socks from the FRONT and from the SOLE side, rendering the sock condition (${c.sockUse}) accurately. Background: ${occupationBackdrop(c.role, true)}, conveying the atmosphere of his occupation. ${outfitSummaryLine(c, true)} Label every panel, keep every panel clearly the same person, and keep the sheet non-sexual.`;
      return `服装リファレンスシートとして、職業に合わせた背景で構成する。主役は靴まで含めた職業服装のフルコーデ。パネル構成：①フルコーデの全身の正面（靴あり）、②全身の側面、③素材や重ね着が分かる上半身のディテールアップ、④靴の詳細（側面とソール）、⑤足元詳細（靴と靴下を脱いだ素足の正面と足裏）、⑥靴下詳細（提案靴下を履いた足の正面と足裏。靴下の使用感「${c.sockUse}」を正確に描く）。背景は${occupationBackdrop(c.role, false)}とし、職業の空気感が伝わるようにする。${outfitSummaryLine(c, false)}各パネルにラベルを付け、全パネル同一人物として顔立ち・体型・身長感を完全に一致させ、非性的に描く。`;
    }
    if(kind==='poster'){
      if(english) return `Create a single character poster (magazine-cover / movie-poster style) that instantly communicates who he is and what he does. He wears his full work outfit and is placed large in the composition. ${workOutfitSpec(c, true)}${posterFootNote(c, true)}With the background (${occupationBackdrop(c.role, true)}), props, and lighting expressing his occupation and persona. Style the poster's typography, colors, and print texture like advertising from around ${c.eraYear || '2026'}. Place the catchphrase "${catchphrase(c, true)}" as a large, stylish title, and his name "${nameKana(c)}" as a smaller readable credit. At the bottom, add a small readable profile box: name, age ${c.age}, occupation ${roleWithSport(c, true)}, height ${c.height}, and a one-line profile "${profileShortText(c, true)}". Keep all text unbroken. The poster must be tasteful and non-sexual.`;
      return `人物ポスターとして構成する。雑誌の表紙や映画ポスターのように、職業と人物像がひと目で伝わる1枚。人物は職業服装のフルコーデで大きく配置する。${workOutfitSpec(c, false)}${posterFootNote(c, false)}背景（${occupationBackdrop(c.role, false)}）・小物・光で職業感と人柄を演出する。ポスターのデザイン様式（書体・配色・印刷質感）も${eraLabel(c.eraYear)}頃の印刷物・広告風にする。タイトルとしてキャッチフレーズ「${catchphrase(c, false)}」を大きくスタイリッシュに、名前「${nameKana(c)}」を小さめの読みやすい文字で添える。さらに下部に小さめのプロフィール欄（名前・${c.age}歳・職業「${roleWithSport(c, false)}」・身長${c.height}・一行プロフィール「${profileShortText(c, false)}」）を読みやすく配置する。文字は崩さない。品があり非性的なポスターにする。`;
    }
    if(kind==='blueprint'){
      const info = english
        ? `Info panel fields (clean blueprint typography): Name "${c.name}", Height ${c.height}, Weight ${c.weight}, Foot size ${c.footSize}, Occupation ${promptValue(c.role)}, MBTI ${c.mbti}, and a one-line profile: "${profileShortText(c, true)}".`
        : `情報欄（設計図らしい読みやすい文字組で記載）：氏名「${nameKana(c)}」、身長${c.height}、体重${c.weight}、足のサイズ${c.footSize}、職業「${c.role}」、MBTI「${c.mbti}」、プロフィール短文「${profileShortText(c, false)}」。`;
      if(english) return `Create a "chance-encounter character blueprint sheet" in a technical-drawing style: blueprint-blue background with a subtle grid, thin white frame lines, dimension-line accents, and clear panel labels. Required panels: (1) full-body FRONT view and (2) full-body SIDE view wearing only his underwear; (3) full-body front view wearing his work outfit WITHOUT shoes (suggested socks visible); (4) face FRONT view and (5) face SIDE view; (6) foot detail with the foot front view and sole view. ${info} ${outfitSummaryLine(c, true)} Label every panel, keep every panel clearly the same person, and keep the sheet non-sexual as a neutral character reference document.`;
      return `「偶然人物ブループリントシート」として、設計図（青図）風に構成する。ブループリントブルーの背景にうっすらとした方眼、細い白のフレーム線、寸法線風の飾り、明確なパネルラベルを付ける。必須パネル：①下着のみの全身の正面、②下着のみの全身の側面、③職業服装を着た全身の正面（靴は履かず、提案靴下が見える状態）、④顔の正面、⑤顔の側面、⑥足元詳細（足の正面と足裏）。${info}${outfitSummaryLine(c, false)}各パネルにラベルを付け、全パネル同一人物として顔立ち・体型・身長感を完全に一致させ、非性的なキャラクター設定資料として健全に描く。`;
    }
    // stages
    if(english) return `Create a step-by-step dressing reference sheet. Arrange four stages left to right as full-body front views: (1) underwear only, (2) underwear + suggested socks + top, (3) full outfit WITHOUT shoes (socks visible), (4) the completed outfit including shoes. ${mustEn} The full-body side view is drawn in the underwear-only state, and the foot detail section shows the foot front view and sole view. All stages are the same person in the same pose and scale so the body-to-outfit correspondence is clear. ${outfitSummaryLine(c, true)} ${sameEn}`;
    return `段階着装リファレンスシートとして構成する。左から順に①下着のみ、②下着＋提案靴下＋トップス、③フルコーディネート（靴なし・靴下が見える）、④靴まで含めた完成コーデ、の4段階を全身の正面で並べる。${mustJa}全身の側面は下着のみの状態で描き、足元詳細は足の正面と足裏を配置する。全段階同一人物・同一ポーズ・同一スケールで、体型と服装の対応が分かるようにする。${outfitSummaryLine(c, false)}${sameJa}`;
  }

  function underwearShapeGuide(c, english=false){
    if(promptOpt(c).compact) return '';
    const mode = c?.mainWearMode || 'ボクサーパンツのみ';
    const t = mode==='時代に合った下着の種類' ? (c?.underwearType || 'ボクサーパンツ') : 'ボクサーパンツ';
    if(t==='トランクス'){
      if(english) return 'IMPORTANT underwear shape: depict the underwear strictly as woven trunks (classic boxer shorts) in a trim, well-fitted size — a clean, neat silhouette with no baggy or oversized look. The waistband and hips fit naturally, the fabric is non-stretch woven cloth with side seams and an elastic waistband, and the leg openings sit close along the thighs while the fabric still hangs slightly free instead of clinging to the skin. Do NOT render them as tight knit boxer briefs, compression shorts, or briefs, and do NOT make them baggy oversized boxers.';
      return '【下着の形状指定・重要】下着は必ずトランクス（布帛のボクサーショーツ）として描く。サイズはジャストサイズで、だぶつきやオーバーサイズ感のない、すっきりと整ったシルエットにする。ウエストと腰回りは自然にフィットさせ、生地は伸縮しない織り生地（布帛）で、サイドの縫い目とゴムウエストを描く。裾口は太ももに沿う位置にありつつ、生地が肌に張り付かず軽く浮く程度にする。ニット生地で肌に密着するボクサーパンツ、ボクサーブリーフ、コンプレッションショーツ、ブリーフとして描いてはいけない。だぶだぶのオーバーサイズトランクスにもしない。';
    }
    if(t==='白ブリーフ' || t==='カラーブリーフ'){
      if(english) return 'IMPORTANT underwear shape: depict the underwear strictly as classic briefs — a Y-front style with NO leg coverage, cut high at the thigh joint so the entire thigh is bare, with an elastic waistband and leg openings that follow the crease of the legs. Do NOT render them as boxer briefs or trunks that cover any part of the thighs.';
      return '【下着の形状指定・重要】下着は必ずブリーフとして描く。裾がなく脚の付け根で切り替わる形で、太もも部分には一切布がかからない。ゴムウエストで、脚口は脚の付け根のラインに沿う。太ももを覆うボクサーパンツやトランクスとして描いてはいけない。';
    }
    if(english) return 'Underwear: standard men\'s knit boxer briefs of an ordinary above-knee length, exactly like an everyday clothing-catalog product — completely standard specifications, never rendered as loose trunks.';
    return '下着は一般的な男性用ボクサーパンツ（ニット素材・膝上丈の標準的な形状）とする。衣料品カタログに載っている通常の商品と同じ、ごく標準的な仕様で描き、トランクスのような太くゆとりのあるシルエットにはしない。';
  }

  function underwearAvoid(c, english=false){
    const mode = c?.mainWearMode || 'ボクサーパンツのみ';
    if(mode!=='時代に合った下着の種類' || !c?.underwearType || c.underwearType==='ボクサーパンツ') return '';
    if(english) return ' changing the underwear type (e.g., turning trunks or briefs into tight boxer briefs), rendering the trunks skin-tight like knit underwear, rendering the trunks baggy and oversized,';
    return '下着の種類の変更（トランクスやブリーフをボクサーパンツ化する等）、トランクスをニット密着シルエットで描くこと、トランクスをだぶだぶのオーバーサイズで描くこと、';
  }

  function generateBodyHair(age, ethnicity, vibe, mbti, eraYear='2026'){
    const eraY = Number(eraYear) || 2026;
    let overallEntries = [['ほぼなし',1],['薄め',3],['自然',5],['やや濃い',2],['部位差あり',2],['手入れされている',2]];
    if(age<=21) overallEntries = [['ほぼなし',3],['薄め',5],['自然',4],['やや濃い',1]];
    else if(age>=29) overallEntries = [['自然',4],['部位差あり',3],['やや濃い',3],['手入れされている',3],['濃い',1]];
    if(['日本人','韓国系','中国系','東アジア系'].includes(ethnicity)) overallEntries = [['ほぼなし',3],['薄め',5],['自然',4],['手入れされている',1]];
    if(ethnicity==='東南アジア系') overallEntries = [['薄め',2],['自然',5],['部位差あり',3],['やや濃い',1]];
    if(['南アジア系','中東系','ラテン系'].includes(ethnicity)) overallEntries = [['自然',4],['やや濃い',4],['濃い',2],['部位差あり',3]];
    if(ethnicity==='白人系') overallEntries = [['薄め',2],['自然',4],['やや濃い',3],['部位差あり',2],['濃い',1]];
    if(ethnicity==='黒人系') overallEntries = [['自然',4],['やや濃い',3],['部位差あり',2],['手入れされている',2]];
    if(['爽やか系','中性系','塩顔系','清楚系'].includes(vibe)) overallEntries = [['ほぼなし',4],['薄め',5],['自然',3],['手入れされている',2]];
    if(vibe==='ワイルド系') overallEntries = [['やや濃い',4],['濃い',3],['部位差あり',3],['ワイルド寄り',2],['自然',2]];
    if(vibe==='スポーツ系') overallEntries = [['スポーツ系で自然',4],['自然',4],['部位差あり',2],['手入れされている',2]];
    if(vibe==='やりらふぃー系') overallEntries = [['薄め',4],['自然',4],['手入れされている',3],['部位差あり',1]];
    if(['ISTJ','ISFJ','ESTJ','ESFJ'].includes(mbti)) overallEntries.push(['手入れされている',3]);
    if(eraY < 1995){
      overallEntries = overallEntries.filter(([v])=>v!=='手入れされている');
      overallEntries.push(['自然',3],['やや濃い',1]);
      if(!overallEntries.length) overallEntries = [['自然',5],['やや濃い',2]];
    } else if(eraY < 2010){
      overallEntries = overallEntries.map(([v,w])=> v==='手入れされている' ? [v, Math.max(1, w-1)] : [v,w]);
    } else {
      overallEntries.push(['手入れされている',2]);
    }
    const overall = weighted(overallEntries);
    function level(area){
      let e = [['なし',1],['ごく薄い',2],['薄め',4],['自然',5],['やや濃い',2],['手入れ済み',2]];
      if(eraY < 1995) e = e.filter(([v])=>v!=='手入れ済み' && v!=='部分的に残している');
      else if(eraY < 2010) e = e.map(([v,w])=> v==='手入れ済み' ? [v, Math.max(1, w-1)] : [v,w]);
      if(['ほぼなし'].includes(overall)) e = [['なし',5],['ごく薄い',4],['薄め',1]];
      if(['薄め','手入れされている'].includes(overall)) e = [['ごく薄い',2],['薄め',5],['自然',3],['手入れ済み',3]];
      if(['やや濃い','部位差あり','スポーツ系で自然'].includes(overall)) e = [['薄め',1],['自然',4],['やや濃い',3],['手入れ済み',2]];
      if(['濃い','ワイルド寄り'].includes(overall)) e = [['自然',2],['やや濃い',4],['濃い',3],['部分的に残している',2]];
      if(['胸毛','腹毛','背中'].includes(area) && ['日本人','韓国系','中国系','東アジア系'].includes(ethnicity)) e = [['なし',3],['ごく薄い',4],['薄め',3],['自然',1]];
      if(area==='胸毛' && ethnicity==='日本人') e = [['なし',7],['ごく薄い',3],['薄め',2],['自然',1]];
      if(['すね毛','腕毛'].includes(area) && vibe==='スポーツ系') e.push(['自然',4]);
      return weighted(e);
    }
    return {
      bodyHairOverall: overall,
      chestHair: level('胸毛'), abdominalHair: level('腹毛'), lowerAbdomenHair: level('へそ下'), armHair: level('腕毛'), shinHair: level('すね毛'), thighHair: level('もも毛'), armpitHair: level('脇毛'), handFingerHair: level('手の甲・指毛'), footToeHair: level('足の甲・指毛'), backHair: level('背中')
    };
  }

export {
  chooseCheek,
  chooseSmileTraits,
  smileLine,
  snapLine,
  muscleDevLineZh,
  initManualControls,
  initInitialSettings,
  getInitial,
  defaultEthnicityForNationality,
  chooseSurname,
  givenNameByBirthYear,
  nameKana,
  nameByNationality,
  legacyNameByNationality,
  faceByEthnicity,
  initSlots,
  initFixedForm,
  getFixed,
  calcWeight,
  footByHeight,
  chooseBody,
  chooseOutfit,
  weightedPickMap,
  chooseAge,
  ageAppearanceByAge,
  chooseRole,
  vibeProfile,
  chooseFaceAgeCompatible,
  buildEncounterScene,
  eraItemW,
  eraRefYear,
  pickEraItem,
  eraSilhouetteNote,
  mbtiStyleNote,
  FV_INDEX,
  fvInWindow,
  FV_SUIT_TYPES,
  applyEraFashionLayer,
  assignPartBrands,
  COORD_TYPE_TAG,
  eraOptionsFor,
  partBrandRedraw,
  rerollCoordPart,
  generateAccessories,
  accWorkNote,
  syncMarriageRing,
  accText,
  applyCoordToCharacter,
  refreshSeasonOutfits,
  generateCoordinatedOutfit,
  applyEraFashionTwist,
  mbtiProfile,
  chooseVibeByMbti,
  chooseOutfitByMbti,
  OCC_CAT,
  occupationOptionsHTML,
  SUIT_TYPES,
  SCHOOL_TYPES,
  occOutfitBlocklist,
  chooseUniformVariant,
  occupationOutfitWeights,
  occupationBodyWeights,
  chooseSport,
  roleWithSport,
  chooseRoleByMbti,
  occupationHairWeights,
  occupationFaceWeights,
  SPORT_STAGES,
  maxStageForAge,
  chooseSkin,
  sportExpPick,
  generateSportsHistory,
  sportsHistoryText,
  muscleLine,
  chooseTrainingLevel,
  trainingWeightAdj,
  bodyRealismLine,
  hairDetailLine,
  trainingLine,
  sportsHistoryLine,
  sportsInfluence,
  bioLine,
  sportYears,
  buildBioHook,
  muscleSummary,
  isEastAsianLike,
  chooseEyebrow,
  chooseEyelid,
  chooseEyeShape,
  chooseEyelash,
  chooseFaceExtras,
  chooseFaceSpacing,
  chooseSkinDetail,
  skinDetailLine,
  chooseFacialHair,
  chooseGlasses,
  brandAvailableInEra,
  eraBrandList,
  warekiOf,
  eraLabel,
  eraPhotoStyle,
  scriptOf,
  countryLine,
  seasonLine,
  eraContextLine,
  avgHeight,
  pickHeightAround,
  footFromHeight,
  eraProfile,
  eraAdjustEntries,
  facePresetPhrase,
  eraStyleNote,
  generateEraUnderwear,
  underwearDesc,
  bodyTypeDesc,
  footOccScenes,
  footCfg,
  footAxisOptions,
  resolveFootCfg,
  refSheetKind,
  outfitSummaryLine,
  posterFootNote,
  bmiOf,
  headCount,
  chooseFrameAxes,
  chooseHipShape,
  chooseTeethAlign,
  chooseTeethColor,
  teethColorNote,
  teethLine,
  frameOf,
  frameSentence,
  physiqueSpec,
  calcFootWidth,
  footWidthDesc,
  chooseSoleType,
  chooseSoleWrinkle,
  chooseToeLine,
  soleDetailLine,
  isStandingRole,
  chooseFootFeature,
  footFeatureLine,
  eyeAreaLine,
  faceExtraLine,
  promptOpt,
  realismSpec,
  heightContrastCue,
  uniformJacketPhrase,
  uniformHatPhrase,
  workOutfitSpec,
  innerCasualNotes,
  casualOutfitSpec,
  occupationBackdrop,
  magazineStyleByEra,
  magazineQA,
  profileShortText,
  catchphrase,
  refSheetInstruction,
  underwearShapeGuide,
  underwearAvoid,
  generateBodyHair,
};
