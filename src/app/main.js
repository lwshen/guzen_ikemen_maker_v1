// Application logic (Phase 4 stage A: single module, verbatim from the
// frozen V3.2.0 baseline minus dead code; see MIGRATION_VERIFICATION.md §4).
// Modules are strict by definition. Data tables live in ../data/.
import {
  C_MEASUREMENT_VALUES, C_MEASUREMENT_EN, pools, slotDefs, slotLabelMap, fixedFieldLabelMap, uiText, valueTranslations,
  sceneTranslations, captionFieldLabelMap, cardFieldLabelMap, uiCardTitles, NAMES_BY_YEAR, NATION_NAMES, OCC_SCENES, OCC_CAT_SCENES,
  FVOCAB, FASHION_CASUAL_TAGS, ACC_NO_PIERCE, ACC_HI_PIERCE, ACC_WORK_OFF, VIBE_AGE_MAX, OCCUPATIONS, OCC_CAT_LABELS,
  OCC_CAT_ORDER, OCC_MBTI_CAT, ATHLETIC_OCC, UNIFORM_WORKWEAR, UNIFORM_VARIANTS, SPORTS, SPORT_BODY, VIBE_OCC,
  ETHNIC_HAIR_WEIGHTS, STRICT_HAIR_OCC, FREE_HAIR_OCC, SPORT_EXP_POOL, SPORT_EXP_WEIGHTS, SPORT_MUSCLE, SPORT_SKELETON, TRAINING_LEVELS,
  TRAINING_DESC, TRAINING_BODY, TRAINING_EXCL, BODY_ASYMS, POSTURES, BODY_ASYM_EN, POSTURE_EN, SPORT_MEM,
  CULT_MEM, MBTI_INTRO, OCC_HOOK, OCC_CAT_HOOK, ERA_HOOK, BRIDGE_HOOK, TRAIN_HOOK, EYE_MIGRATION,
  BRAND_SINCE, UNDERWEAR_COLOR_EN, FOOT_CFG_AXES, FOOT_SCENES, FOOT_COZY, FOOT_POSTURES, FOOT_SHOE_STATES, FOOT_FABRICS,
  FOOT_SOCK_STATES, FOOT_ANGLES, FOOT_OCC_SCENES, FOOT_SCENE_MIGRATION, FOOT_OCC_CAT_SCENES, FOOT_PROPS, POSTER_FOOT, FOOT_WIDTHS,
  FOOT_FEATURES, SOLE_TYPES, SOLE_WRINKLES, TOE_LINES, TOE_CURLS, FACE_EXTRA_DEFAULTS, INNER_DISPLAY_KEYS, INNER_DREAMS,
  INNER_DREAM_CAT, INNER_DESIRES, INNER_WEAK_MIND, INNER_WEAK_BODY, INNER_TALENTS, INNER_UPBRINGINGS, INNER_TRAUMAS, INNER_PRONOUNS_BASE,
  INNER_LOVE_BASE, INNER_LOVE_NOTES, INNER_ORIGINS, INNER_COMPLEX_GENERIC, INNER_BLOOD_DIST, INNER_INCOME_TABLE, INNER_HOBBY_GENERIC, INNER_HOBBY_BY_VIBE,
  INNER_MYBOOM_MODERN, INNER_MYBOOM_COMMON, INNER_MYBOOM_RETRO, INNER_FOOD_LIKE, INNER_FOOD_HATE, INNER_HEALTH_BASE, INNER_HEALTH_MID, INNER_LIVING_SINGLE,
  INNER_LIVING_MARRIED, INNER_FRIEND_MEET, INNER_FRIEND_NAMES, INNER_FRIEND_FREQ, INNER_LOVER_NONE, INNER_LOVER_YES, INNER_MEMORY_BASE, INNER_JP_PREFS,
  INNER_NATION_CITIES, INNER_DIALECTS, INNER_SPEECH_REGISTER, INNER_SPEECH_VOICE, INNER_SPEECH_HABITS, INNER_DEPS, INNER_CATS, INNER_PRINCIPLES,
  INNER_UNFORGIVABLES, INNER_FASHION_SENSE, INNER_LOVE_NOTE_ANY, INNER_LOVE_NOTE_F, INNER_LOVE_NOTE_M, INNER_LOVE_NOTE_BI, INNER_KANA2KANJI, INNER_FIELD_GEN,
  HIGH_TRAIN, DICE_GROUPS, FRIEND_RELATIONS, FRIEND_HIER_DELTA, FRIEND_REL_EN, FRIEND_HIER_EN, IKEMEN_DELTAS, IKEMEN_AXIS_LABELS,
  BODYHAIR_KEYS, UNIFORM_NAME_MIGRATION, PROMPT_PANES,
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
  const deriveMeasurementB = a => { const A=Number(a)||7; return Math.round((A*1.57 + Math.random()*1)*10)/10; }; // B = A×1.57＋0〜1の誤差
  const ensureProfileMeasurements = c => {
    if(!c) return;
    const invalidA=!Number.isFinite(Number(c.measurementA)) || Number(c.measurementA)<5 || Number(c.measurementA)>10.5;
    const A0 = Number(c.measurementA);
    const invalidB=!Number.isFinite(Number(c.measurementB)) || Number(c.measurementB) < A0*1.57 - 0.05 || Number(c.measurementB) > A0*1.57 + 1.05;
    const invalidC=!C_MEASUREMENT_VALUES.includes(c.measurementC);
    if(invalidA) c.measurementA=drawProfileMeasurement('A');
    if(invalidB) c.measurementB=deriveMeasurementB(c.measurementA);
    if(invalidC) c.measurementC=drawProfileMeasurement('C');
  };
  const profileMeasurementCLabel = (value, english=false) => english ? (C_MEASUREMENT_EN[value] || value) : value;
  const pick = arr => arr[Math.floor(Math.random()*arr.length)];
  const weighted = entries => { const total = entries.reduce((a,b)=>a+b[1],0); let n=Math.random()*total; for(const [v,w] of entries){n-=w; if(n<=0) return v;} return entries[entries.length-1][0]; };
  const uniqId = () => Math.random().toString(36).slice(2)+Date.now().toString(36);



  let current = null;
  let locks = {};
  let mode = 'full';
  let spinning = false;
  let uiLang = 'ja';

  function T(key){ return uiText[uiLang][key]; }
  function slotLabel(key, fallback){ return (slotLabelMap[key]||{})[uiLang] || fallback; }
  function fixedLabel(key, fallback){ return (fixedFieldLabelMap[key]||{})[uiLang] || fallback; }

  function displayValue(key, value){
    if(value===undefined || value===null) return value;
    if(key==='captionMode') return captionModeDisplay(value);
    if(uiLang!=='en') return value;
    if(key==='age') return `${value} years old`;
    if(key==='eraYear') return `${value} CE`;
    if(key==='sceneIdea') return sceneTranslations[String(value)] || value;
    return valueTranslations[String(value)] || value;
  }

  function displayOptionLabel(key, value){
    if(key==='captionMode') return captionModeDisplay(value);
    if(uiLang!=='en'){
      if(key==='age') return `${value}歳`;
      if(key==='eraYear') return eraLabel(value);
      return value;
    }
    if(key==='age') return `${value} years old`;
    if(key==='eraYear') return `${value} CE`;
    if(key==='sceneIdea') return sceneTranslations[String(value)] || value;
    return valueTranslations[String(value)] || value;
  }
  function renderSelectOptions(selectEl, key, values, selectedValue, includeRandom=false){
    if(!selectEl) return;
    const items = includeRandom ? ['ランダム', ...values] : values;
    selectEl.innerHTML = items.map(v=>`<option value="${String(v).replace(/"/g,'&quot;')}">${displayOptionLabel(key, v)}</option>`).join('');
    const match = items.find(v => String(v) === String(selectedValue));
    if(match!==undefined) selectEl.value = String(match);
    else if(items.length) selectEl.value = String(items[0]);
  }

  function mbtiDescription(code, english=false){
    const ja = {
      INTJ:'戦略的で独立心が強い', INTP:'論理的で探究心が強い', ENTJ:'決断力がありリーダー気質', ENTP:'発想力豊かで刺激を好む',
      INFJ:'理想志向で思慮深い', INFP:'感受性が高くマイペース', ENFJ:'面倒見がよく社交的', ENFP:'明るく自由なムードメーカー',
      ISTJ:'誠実で安定感がある', ISFJ:'穏やかで気配り上手', ESTJ:'現実的で頼れる', ESFJ:'協調性が高く親しみやすい',
      ISTP:'寡黙で実践的', ISFP:'自然体で柔らかい', ESTP:'行動的でノリが良い', ESFP:'華やかで人懐っこい'
    };
    const en = {
      INTJ:'strategic and independent', INTP:'logical and curious', ENTJ:'decisive natural leader', ENTP:'inventive and stimulation-seeking',
      INFJ:'idealistic and thoughtful', INFP:'sensitive and easygoing', ENFJ:'social and supportive', ENFP:'bright and free-spirited',
      ISTJ:'sincere and steady', ISFJ:'gentle and attentive', ESTJ:'practical and dependable', ESFJ:'friendly and cooperative',
      ISTP:'quiet and hands-on', ISFP:'soft and natural', ESTP:'action-oriented and upbeat', ESFP:'charismatic and approachable'
    };
    return (english?en:ja)[code] || code;
  }
  function mbtiDisplay(c){
    if(!c?.mbti) return '';
    return `${c.mbti} / ${mbtiDescription(c.mbti, uiLang==='en')}`;
  }
  function captionModeDisplay(mode){
    if(uiLang!=='en') return mode || '表記しない';
    const map = {'画像下部に1行で表記':'One-line footer text','カード風ミニプロフィールを下部に表示':'Mini profile card at the bottom','スタイリッシュなタグ型で表示':'Stylish tag-style display','表記しない':'No text overlay'};
    return map[mode] || 'No text overlay';
  }
  function getCaptionFieldLabelsArray(c, english=false){
    const labels = [];
    const fields = c?.captionFields || {name:true,era:true,height:true,weight:true,footSize:true,mbti:true};
    Object.entries(captionFieldLabelMap).forEach(([k,map])=>{ if(fields[k]) labels.push(english?map.en:map.ja); });
    return labels;
  }
  function buildCaptionLine(c, english=false){
    const parts = [];
    const fields = c?.captionFields || {name:true,era:true,height:true,weight:true,footSize:true,mbti:true};
    if(fields.name) parts.push(english ? `Name: ${nameKana(c)}` : `氏名：${nameKana(c)}`);
    if(fields.age) parts.push(english ? `Age: ${c.age}` : `年齢：${c.age}歳`);
    if(fields.era) parts.push(english ? `Era: ${c.eraYear || '2026'}` : `年代：${eraLabel(c.eraYear)}`);
    if(fields.height) parts.push(english ? `Height: ${c.height}` : `身長：${c.height}`);
    if(fields.weight) parts.push(english ? `Weight: ${c.weight}` : `体重：${c.weight}`);
    if(fields.footSize) parts.push(english ? `Foot Size: ${c.footSize}` : `足のサイズ：${c.footSize}`);
    if(fields.mbti) parts.push(english ? `MBTI: ${c.mbti} (${mbtiDescription(c.mbti, true)})` : `MBTI：${c.mbti}（${mbtiDescription(c.mbti, false)}）`);
    if(fields.nationality) parts.push(english ? `Nationality: ${displayValue('nationality',c.nationality)}` : `国籍：${c.nationality}`);
    if(fields.role) parts.push(english ? `Occupation: ${displayValue('role',c.role)}` : `職業：${c.role}`);
    return parts.join(english ? ' / ' : '｜');
  }
  function buildCaptionInstruction(c, english=false){
    if(!c || c.captionMode==='表記しない'){
      return english ? 'Do not add any extra text inside the image.' : '画像内に追加の文字情報は入れない。';
    }
    const labelsArr = getCaptionFieldLabelsArray(c, english);
    if(!labelsArr.length) return english ? 'Do not add any extra text inside the image.' : '画像内に追加の文字情報は入れない。';
    const labels = labelsArr.join(', ');
    const sample = buildCaptionLine(c, english);
    if(c.captionMode==='カード風ミニプロフィールを下部に表示'){
      return english ? `Place a compact, stylish mini profile card at the lower left or lower right. Use a semi-transparent panel, clean spacing, and readable labels. Include: ${labels}. Example text: "${sample}".` : `画像下部の左または右に、半透明パネルのミニプロフィールカードを配置する。読みやすい余白とラベル設計にし、記載項目は${labels}。例：「${sample}」。`;
    }
    if(c.captionMode==='スタイリッシュなタグ型で表示'){
      return english ? `Display the profile as stylish capsule tags near the bottom. Keep the tags clean, aligned, and readable. Include: ${labels}. Example text: "${sample}".` : `画像下部付近に、スタイリッシュなカプセル型タグとしてプロフィールを表示する。整列感と可読性を重視し、記載項目は${labels}。例：「${sample}」。`;
    }
    if(c.captionMode==='表記する'){
      return english ? `Include a readable, well-designed profile text area that suits the selected output type. Use tasteful typography, good spacing, and a layout that does not distract from the character. Include: ${labels}. Example text: "${sample}".` : `選択した出力タイプに合う、読みやすくデザイン性のあるプロフィール表記を入れる。余白、文字サイズ、整列感を整え、人物を邪魔しない。記載項目は${labels}。例：「${sample}」。`;
    }
    return english ? `Add a clean single line of small readable text at the bottom of the image. Include: ${labels}. Use accurate text like: "${sample}". Keep the typography tasteful and not distracting.` : `画像下部に、小さく読みやすい1行の文字情報を入れる。記載項目は${labels}。例として「${sample}」のように正確に表記する。文字はデザイン性を重視し、人物を邪魔しない。`;
  }
  function promptTargetGuide(c, english=false){
    const target = c?.promptTarget || 'ChatGPT';
    if(english){
      if(target==='NanobananaPro') return 'Optimize the prompt for NanobananaPro with especially clear identity consistency, balanced full-body proportions, and accurate text rendering.';
      if(target==='Grok') return 'Optimize the prompt for Grok with concise but explicit priorities, strong realism, and natural anatomy.';
      return 'Optimize the prompt for ChatGPT image generation with faithful instruction following, clear attribute reflection, and accurate text rendering when text is requested.';
    }
    if(target==='NanobananaPro') return 'NanobananaPro向けに、同一人物性、全身バランス、文字表記の正確さが安定するように明確に指示する。';
    if(target==='Grok') return 'Grok向けに、重要要素を簡潔かつ明確に優先し、写実性と自然な人体バランスを重視する。';
    return 'ChatGPT向けに、設定項目を忠実に反映し、属性と文字表記を正確に生成できるよう明確に指示する。';
  }
  function outfitStyleGuide(c, english=false){
    if(english) return 'Make the suggested outfit stylish, cohesive, and clearly suited to his vibe, nationality, age, MBTI, and role. Keep the silhouette and color balance polished.';
    return '提案服装は人物の雰囲気、国籍、年齢、MBTI、役割に合ったスタイリッシュで統一感のあるコーディネートにする。シルエットと配色のまとまりも良くする。';
  }
  function isCardOutput(c){ return !!(c?.outputType||'').includes('カード'); }
  function isTradingCardOutputValue(outputType){
    return ['トレーディングカード風画像','トレーディングカード風リファレンスカード','レアカード風トレーディングカード画像','シンプルな設定カード風画像'].includes(outputType || '');
  }
  function isTradingCardOutput(c){ return isTradingCardOutputValue(c?.outputType); }
  function suggestCardRarity(c){
    let score = scoreRarity(c)[0] || 0;
    if(['高身長モデル体型','スーツ映え体型','筋肉質','引き締まったスポーツ体型'].includes(c.bodyType)) score += 10;
    if(['高身長モデル系','韓国アイドル風','ミステリアス系','クール系','やりらふぃー系'].includes(c.facePreset)) score += 8;
    if(['ワイルド系','韓国風','ミステリアス系','クール系','陽キャ大学生系'].includes(c.vibe)) score += 6;
    if(['ENTJ','ENFJ','ESTP','ENFP'].includes(c.mbti)) score += 5;
    if(['レアカード風','ホログラム風','高級感のあるカード風'].includes(c.cardStyle)) score += 10;
    if(score >= 110) return 'Legendary';
    if(score >= 92) return 'Secret';
    if(score >= 76) return 'UR';
    if(score >= 60) return 'SSR';
    if(score >= 42) return 'SR';
    if(score >= 22) return 'R';
    return 'N';
  }
  function cardEffectByRarity(rarity){
    const r = rarity || 'R';
    if(r==='Legendary') return 'ホログラム風';
    if(r==='Secret') return '箔押し風';
    if(r==='UR') return 'キラ加工風';
    if(r==='SSR') return '光沢風';
    if(r==='SR') return 'フレーム強調';
    if(r==='R') return '角丸カード風';
    if(r==='N') return 'なし';
    return 'なし';
  }
  function syncCardSettingsVisibility(){
    document.querySelectorAll('[data-ui-card="initialCard"],[data-ui-card="manualCard"]').forEach(el=>el.classList.remove('hidden'));
  }
  function readCardFields(scope){
    const fields = {name:false,age:false,era:false,height:false,weight:false,footSize:false,nationality:false,ethnicity:false,role:false,vibe:false,mbti:false,facePreset:false,bodyType:false,footShape:false,bodyHairOverall:false,outfitType:false,scene:false,rarity:false};
    document.querySelectorAll(`[data-card-scope="${scope}"]`).forEach(el=>{ fields[el.dataset.cardField] = !!el.checked; });
    return fields;
  }
  function writeCardFields(scope, fields){
    const f = fields || {name:true,age:true,era:true,height:true,weight:true,footSize:true,role:true,mbti:true,rarity:true};
    document.querySelectorAll(`[data-card-scope="${scope}"]`).forEach(el=>{ el.checked = f[el.dataset.cardField] !== false; });
  }
  function setCardCheckboxLabels(){
    document.querySelectorAll('[data-card-label]').forEach(el=>{
      const key = el.dataset.cardLabel;
      const map = cardFieldLabelMap[key];
      if(map) el.textContent = uiLang==='en' ? map.en : map.ja;
    });
    const i=document.getElementById('initialCardFieldsLabel'); if(i) i.textContent = uiLang==='en' ? 'Card information fields' : 'カード内表示項目';
    const m=document.getElementById('manualCardFieldsLabel'); if(m) m.textContent = uiLang==='en' ? 'Card information fields' : 'カード内表示項目';
  }
  function cardPoseGuide(c, english=false){
    const vibe = c?.vibe || '';
    const role = c?.role || '';
    const mbti = c?.mbti || '';
    if(english){
      if(vibe.includes('スポーツ') || role.includes('スポーツ') || ['ESTP','ESFP'].includes(mbti)) return 'Use a catchy athletic pose with confident movement, like a dynamic step forward or a light action-ready stance.';
      if(vibe.includes('クール') || vibe.includes('ミステリアス') || ['INTJ','INTP'].includes(mbti)) return 'Use a catchy cool pose with a composed gaze, slightly angled shoulders, and one hand near the jacket or pocket.';
      if(vibe.includes('韓国') || vibe.includes('中性') || ['INFP','ISFP'].includes(mbti)) return 'Use a stylish soft pose with a relaxed expression, clean hand placement, and a refined fashion-card feel.';
      if(vibe.includes('ワイルド') || vibe.includes('やりらふぃー') || vibe.includes('ストリート')) return 'Use a catchy street-style pose with confident posture, angled stance, and expressive hand placement.';
      if(vibe.includes('爽やか') || vibe.includes('清楚') || ['ENFJ','ENFP','ESFJ'].includes(mbti)) return 'Use a bright approachable pose with an open stance and a clean friendly expression.';
      return 'Use a catchy character-card pose that reflects his profile, vibe, role, and MBTI while staying natural and non-sexual.';
    }
    if(vibe.includes('スポーツ') || role.includes('スポーツ') || ['ESTP','ESFP'].includes(mbti)) return 'プロフィールに基づき、前へ踏み出すような動きや軽いアクション感のある、キャッチーなスポーツ系ポーズにする。';
    if(vibe.includes('クール') || vibe.includes('ミステリアス') || ['INTJ','INTP'].includes(mbti)) return 'プロフィールに基づき、肩を少し斜めにし、落ち着いた視線でジャケットやポケットに手を添えるようなクールでキャッチーなポーズにする。';
    if(vibe.includes('韓国') || vibe.includes('中性') || ['INFP','ISFP'].includes(mbti)) return 'プロフィールに基づき、柔らかい表情と自然な手元で、洗練されたファッションカード風のキャッチーなポーズにする。';
    if(vibe.includes('ワイルド') || vibe.includes('やりらふぃー') || vibe.includes('ストリート')) return 'プロフィールに基づき、斜め立ちや表情のある手元を使った、自信のあるストリートカード風のキャッチーなポーズにする。';
    if(vibe.includes('爽やか') || vibe.includes('清楚') || ['ENFJ','ENFP','ESFJ'].includes(mbti)) return 'プロフィールに基づき、開いた姿勢と親しみやすい表情の、明るくキャッチーなポーズにする。';
    return 'プロフィール、雰囲気、役割、MBTIに基づいた、自然で非性的なキャッチーなキャラクターカード用ポーズにする。';
  }
  function cardWearDescription(c, english=false){
    const mode = c?.cardWearMode || 'ボクサーパンツのみ';
    if(mode==='職業服装'){
      if(english) return `Use his work outfit: ${c.workUniform ? c.workUniformEn : `${c.outfitBrand} ${c.outfitType}`}. Outerwear: ${c.jacket}. Top: ${c.top}. Bottom: ${c.bottom}. Shoes: ${c.shoes}${uniformHatPhrase(c, true)}. Socks: ${c.sockBrand} ${c.sockType}.${c.workUniform ? ` Do not reproduce real organizations' insignia or logos.` : ''}`;
      return `カード内の服装は職業服装にする。${c.workUniform ? `${c.workUniform}を着用し、` : `${c.outfitBrand}の${c.outfitType}を基調に、`}上着は${c.jacket}、トップスは${c.top}、ボトムスは${c.bottom}、靴は${c.shoes}${uniformHatPhrase(c, false)}、靴下は${c.sockBrand}の${c.sockType}。${c.workUniform ? '実在組織の記章・ロゴは正確に再現しない。' : ''}`;
    }
    if(mode==='私服'){
      const hb = c.holidayOutfitBrand || c.outfitBrand, ht = c.holidayOutfitType || c.outfitType;
      const hj = c.holidayJacket || c.jacket, htp = c.holidayTop || c.top, hbm = c.holidayBottom || c.bottom, hsh = c.holidayShoes || c.shoes;
      if(english) return `Use his casual outfit: ${hb} ${ht}. Outerwear: ${hj}. Top: ${htp}. Bottom: ${hbm}. Shoes: ${hsh}. Socks: ${c.holidaySockBrand || c.sockBrand} ${c.holidaySockType || c.sockType}.`;
      return `カード内の服装は私服にする。${hb}の${ht}を基調に、上着は${hj}、トップスは${htp}、ボトムスは${hbm}、靴は${hsh}、靴下は${c.holidaySockBrand || c.sockBrand}の${c.holidaySockType || c.sockType}。`;
    }
    if(english) return `Use only ${underwearDesc(c, true)} as the card outfit. ${underwearShapeGuide(c, true)} Keep the depiction non-sexual and neutral, like a body-reference character card.`;
    return `カード内の服装は${underwearDesc(c, false)}のみ。${underwearShapeGuide(c, false)}非性的で、体型確認用のキャラクターカードとして自然に見せる。`;
  }
  function buildCardInstruction(c, english=false){
    const fields = c.cardFields || {};
    const labels = Object.entries(cardFieldLabelMap).filter(([k])=>fields[k]).map(([k,map])=>english?map.en:map.ja).join(', ');
    const rarityText = c.cardRarity && c.cardRarity!=='おすすめ自動' ? c.cardRarity : suggestCardRarity(c);
    const effect = cardEffectByRarity(rarityText);
    const rarityReasonJa = `レアリティは、体型・顔立ち・雰囲気・MBTI・足サイズ・体毛・服装などの項目の組み合わせから「${rarityText}」を提案する。必要に応じてユーザーが変更できる。装飾効果はレアリティに準じて「${effect}」にする。`;
    const rarityReasonEn = `Suggest the rarity label "${rarityText}" based on the combination of body type, face type, vibe, MBTI, foot size, body hair, and outfit. The user can edit the rarity. The decorative effect should follow the rarity and be "${displayValue('cardEffect',effect)}".`;
    if(english){
      const rareExtra = ['SSR','UR','Secret','Legendary'].includes(rarityText) ? ' Add a premium finish appropriate to the rarity, while keeping the character and all text readable.' : '';
      return `Present the result as a high-quality original trading-card-style character design inspired by the visual polish of popular collectible trading cards, without copying any existing official card design. Put the logo text "GuzenIkemenMakerCARD" clearly on the card as an original brand logo. Card style: ${displayValue('cardStyle',c.cardStyle)}. Rarity label: ${rarityText}. Color theme: ${displayValue('cardTheme',c.cardTheme)}. Layout: ${displayValue('cardLayout',c.cardLayout)}. Decorative effect: ${displayValue('cardEffect',effect)}. ${rarityReasonEn} Include readable information panels or stat tags for: ${labels || 'name, profile, MBTI, and role'}. Use premium card framing, strong typography, clean icon-like accents, and a memorable collectible-card composition.${rareExtra}`;
    }
    const rareExtra = ['SSR','UR','Secret','Legendary'].includes(rarityText) ? '高レアリティにふさわしい高級感、光沢感、特別感を加える。ただし人物や文字の視認性は損なわない。' : '';
    return `人気トレーディングカードのようにデザイン性を高めた、オリジナルのトレーディングカード風キャラクターデザインとして構成する。ただし実在カードや公式カードの模倣ではなく、独自の架空キャラクターカードとして仕上げる。カード内に「GuzenIkemenMakerCARD」のロゴ文字を、オリジナルブランドロゴとしてはっきり入れる。カードスタイルは${c.cardStyle}、レアリティ表示は${rarityText}、配色テーマは${c.cardTheme}、レイアウトは${c.cardLayout}、装飾効果は${effect}。${rarityReasonJa}カード枠、情報パネル、ステータス欄、タグ欄を自然に配置し、表示項目は${labels || '氏名、プロフィール、MBTI、役割'}。人物を主役にしつつ、設定資料としての読みやすさとカードとしての見栄えを両立する。${rareExtra}`;
  }

  function buildBodyHairSummary(c, english=false){
    if(c && c.bodyHairMode === '自然な表現（簡潔）'){
      return english
        ? 'Body hair: a natural, age-appropriate amount overall, kept subtle — neither artificially hairless nor excessive.'
        : '体毛は年齢・体質相応の自然な範囲で、全体に控えめに描く（過度な無毛化も過剰な描写もしない）。';
    }
    if(!c) return '';
    const partsJa = [`体毛は全体として${c.bodyHairOverall}`];
    const areasJa = [['胸毛',c.chestHair],['腹毛',c.abdominalHair],['へそ下',c.lowerAbdomenHair],['腕毛',c.armHair],['すね毛',c.shinHair],['もも毛',c.thighHair],['脇毛',c.armpitHair],['手の甲・指毛',c.handFingerHair],['足の甲・指毛',c.footToeHair],['背中',c.backHair]];
    if(!english) return `${partsJa[0]}。${areasJa.map(([k,v])=>`${k}は${v}`).join('、')}。体毛表現は非性的で、成人男性の自然な身体特徴として描写する。`;
    const areasEn = [['chest hair',c.chestHair],['abdominal hair',c.abdominalHair],['lower abdomen hair',c.lowerAbdomenHair],['arm hair',c.armHair],['shin hair',c.shinHair],['thigh hair',c.thighHair],['armpit hair',c.armpitHair],['hand and finger hair',c.handFingerHair],['foot and toe hair',c.footToeHair],['back hair',c.backHair]];
    return `Body hair overall is ${displayValue('bodyHairOverall',c.bodyHairOverall)}. ${areasEn.map(([k,v])=>`${k}: ${displayValue('bodyHairLevel',v)}`).join('; ')}. Depict body hair non-sexually as a natural adult male body feature.`;
  }
  function setCaptionCheckboxLabels(){
    document.querySelectorAll('[data-caption-label]').forEach(el=>{
      const key = el.dataset.captionLabel;
      const map = captionFieldLabelMap[key];
      if(map) el.textContent = uiLang==='en' ? map.en : map.ja;
    });
    const i=document.getElementById('initialCaptionFieldsLabel'); if(i) i.textContent = uiLang==='en' ? 'Image text fields' : '画像内に表示する項目';
    const m=document.getElementById('manualCaptionFieldsLabel'); if(m) m.textContent = uiLang==='en' ? 'Image text fields' : '画像内に表示する項目';
  }
  function setUiCardTitles(){
    document.querySelectorAll('[data-ui-card]').forEach(card=>{
      const m=uiCardTitles[card.dataset.uiCard]; const h=card.querySelector('h3'); if(m&&h) h.textContent=uiLang==='en'?m.en:m.ja;
    });
  }
  function readCaptionFields(scope){
    const fields = {name:false,age:false,era:false,height:false,weight:false,footSize:false,mbti:false,nationality:false,role:false};
    document.querySelectorAll(`[data-caption-scope="${scope}"]`).forEach(el=>{ fields[el.dataset.captionField] = !!el.checked; });
    return fields;
  }
  function writeCaptionFields(scope, fields){
    const f = fields || {name:true,era:true,height:true,weight:true,footSize:true,mbti:true};
    document.querySelectorAll(`[data-caption-scope="${scope}"]`).forEach(el=>{ el.checked = f[el.dataset.captionField] !== false; });
  }
  function setFieldLabel(selectId, text){ const el=document.getElementById(selectId); const span=el?.parentElement?.querySelector('span'); if(span) span.textContent=text; }
  function updateModeNote(){
    const m={full:T('mode_full_note'), face:T('mode_face_note'), outfit:T('mode_outfit_note'), rare:T('mode_rare_note')};
    const note=document.getElementById('modeNote'); if(note) note.textContent=T('currentMode')+m[mode];
  }
  function applyUiLanguage(){
    document.documentElement.lang = uiLang==='ja' ? 'ja' : 'en';
    document.querySelector('.badge').textContent = 'GUZEN SLOT SYSTEM / V3.2.0';
    document.querySelector('.title').textContent = 'Guzen Ikemen Maker V3.2.0';
    document.querySelector('.subtitle').textContent = T('subtitle');
    const heroNotice = document.getElementById('heroNotice'); if(heroNotice) heroNotice.textContent = T('heroNotice');
    const tabMap = {slot:'tab_slot', result:'tab_result', history:'tab_history', settings:'tab_settings'};
    document.querySelectorAll('.tab').forEach(t=>{ const k=tabMap[t.dataset.tab]; if(k) t.textContent=T(k); });
    const startBtn=document.getElementById('startBtn'); if(startBtn) startBtn.textContent=T('startBtn');
    const im=document.getElementById('instantModeText'); if(im) im.textContent=T('instantSkip');
    const pn=document.getElementById('presetName'); if(pn) pn.placeholder=T('presetPlaceholder');
    const ps=document.getElementById('savePresetBtn'); if(ps) ps.textContent=T('presetSave');
    const pl=document.getElementById('loadPresetBtn'); if(pl) pl.textContent=T('presetLoad');
    const pd=document.getElementById('deletePresetBtn'); if(pd) pd.textContent=T('presetDelete');
    const ib=document.getElementById('importBtn'); if(ib) ib.textContent=T('importJson');
    document.querySelectorAll('.dice').forEach(d=>d.title=T('diceTitle'));
    updateCharCounts();
    const rerollBtn=document.getElementById('rerollUnlockedBtn'); if(rerollBtn) rerollBtn.textContent=T('rerollUnlockedBtn');
    const resetBtn=document.getElementById('resetLocksBtn'); if(resetBtn) resetBtn.textContent=T('resetLocksBtn');
    document.querySelector('section.panel .section-title h2').textContent = T('initialTitle');
    document.querySelector('section.panel .section-title .pill').textContent = T('initialPill');
    document.querySelector('section.panel .notice[style*="margin-top:12px"]').textContent = T('initialNotice');
    const slotTitles=document.querySelectorAll('.grid.cols > section.panel .section-title h2'); if(slotTitles[0]) slotTitles[0].textContent=T('slotResult');
    const statusPill=document.getElementById('statusPill'); if(statusPill && (!statusPill.textContent || ['待機中','Waiting'].includes(statusPill.textContent))) statusPill.textContent=T('waiting');
    const sideTitles=document.querySelectorAll('aside .section-title h2'); if(sideTitles[0]) sideTitles[0].textContent=T('rarityTitle'); if(sideTitles[1]) sideTitles[1].textContent=T('modesTitle');
    const rarityNote=document.getElementById('rarityNote'); if(rarityNote && (!current)) rarityNote.textContent=T('rarityNoteIdle');
    document.querySelectorAll('[data-mode]').forEach(b=>{ b.textContent=T('mode_'+b.dataset.mode); });
    updateModeNote();
    const resultTitles=document.querySelectorAll('#tab-result .section-title h2');
    if(resultTitles[0]) resultTitles[0].textContent=T('resultTitle');
    const pa=document.getElementById('promptAreaTitle'); if(pa) pa.textContent=T('promptAreaTitle');
    const pt1=document.getElementById('paneTitle-main'); if(pt1) pt1.textContent=T('promptTitle');
    const pt2=document.getElementById('paneTitle-outfit'); if(pt2) pt2.textContent=T('outfitTitle');
    const pt2b=document.getElementById('paneTitle-outfitHoliday'); if(pt2b) pt2b.textContent=T('outfitHolidayTitle');
    const pt3=document.getElementById('paneTitle-scene'); if(pt3) pt3.textContent=T('sceneTitle');
    const pt4=document.getElementById('paneTitle-derived'); if(pt4) pt4.textContent=T('derivedTitle');
    const pt5=document.getElementById('paneTitle-friendPair'); if(pt5) pt5.textContent=T('friendPairTitle');
    const cp5=document.getElementById('copyFriendPairBtn'); if(cp5) cp5.textContent=T('copyPromptBtn');
    const fpw=document.getElementById('friendPairWarn'); if(fpw) fpw.textContent=T('friendPairWarn');
    const fct=document.getElementById('footCfgTitle'); if(fct){ fct.childNodes[0].textContent = T('footCfgTitlePrefix') + ' '; }
    const fcd=document.getElementById('footCfgDiceBtn'); if(fcd) fcd.textContent=T('footDiceBtn');
    const fcr=document.getElementById('footCfgResetBtn'); if(fcr) fcr.textContent=T('footResetBtn');
    const fcn=document.getElementById('footCfgNote'); if(fcn) fcn.textContent=T('footCfgNote');
    const fpwl=document.getElementById('friendPairWearLabel'); if(fpwl) fpwl.textContent=T('friendPairWearLabel');
    const fpcl=document.getElementById('friendPairCountLabel'); if(fpcl) fpcl.textContent=T('friendPairCountLabel');
    renderFriendPairControls();
    const dw=document.getElementById('derivedWarn'); if(dw) dw.textContent=T('derivedWarn');
    const saveBtn=document.getElementById('saveBtn'); if(saveBtn) saveBtn.textContent=T('saveBtn');
    const frB=document.getElementById('friendBtn'); if(frB) frB.textContent=T('friendBtn');
    const rst=document.getElementById('restoreTitle'); if(rst) rst.textContent=T('restoreTitle');
    const rsb=document.getElementById('restoreCodeBtn'); if(rsb) rsb.textContent=T('restoreCodeBtn');
    const rsn=document.getElementById('restoreNote'); if(rsn) rsn.textContent=T('restoreNote');
    const frT=document.getElementById('friendPanelTitle'); if(frT) frT.textContent=T('friendPanelTitle');
    const frR=document.getElementById('friendRelationLabel'); if(frR) frR.textContent=T('friendRelationLabel');
    const frH=document.getElementById('friendHierLabel'); if(frH) frH.textContent=T('friendHierLabel');
    const frG=document.getElementById('friendGoBtn'); if(frG) frG.textContent=T('friendGoBtn');
    const frN=document.getElementById('friendNote'); if(frN) frN.textContent=T('friendNote');
    if(document.getElementById('friendRelation')) renderFriendPanel();
    const jsonBtn=document.getElementById('jsonBtn'); if(jsonBtn) jsonBtn.textContent=T('jsonBtn');
    const cp1=document.getElementById('copyPromptBtn'); if(cp1) cp1.textContent=T('copyPromptBtn');
    const cp2=document.getElementById('copyOutfitBtn'); if(cp2) cp2.textContent=T('copyOutfitBtn');
    const cp3=document.getElementById('copySceneBtn'); if(cp3) cp3.textContent=T('copySceneBtn');
    const cp4=document.getElementById('copyDerivedBtn'); if(cp4) cp4.textContent=T('copyCardBtn');
    const histTitle=document.querySelector('#tab-history .section-title h2'); if(histTitle) histTitle.textContent=T('historyTitle');
    const chBtn=document.getElementById('clearHistoryBtn'); if(chBtn) chBtn.textContent=T('clearHistoryBtn');
    const setTitle=document.querySelector('#tab-settings .section-title h2'); if(setTitle) setTitle.textContent=T('settingsTitle');
    const setPill=document.querySelector('#tab-settings .section-title .pill'); if(setPill) setPill.textContent=T('settingsPill');
    const setNotice=document.querySelector('#tab-settings .notice'); if(setNotice) setNotice.textContent=T('settingsNotice');
    Object.entries(T('fieldLabels')).forEach(([id,label])=>setFieldLabel(id,label));
    const makerLabel=document.getElementById('makerLanguageLabel'); if(makerLabel) makerLabel.textContent = uiLang==='ja' ? 'メーカー言語 / App Language' : 'App Language / メーカー言語';
    setCaptionCheckboxLabels();
    setCardCheckboxLabels();
    setUiCardTitles();
    initSlots();
    initFixedForm();
    initManualControls();
    initInitialSettings();
    renderAll();
  }

  const els = {
    slotGrid: document.getElementById('slotGrid'), status: document.getElementById('statusPill'), rarity: document.getElementById('rarity'), rareScore: document.getElementById('rareScore'), rarityNote: document.getElementById('rarityNote'), profileView: document.getElementById('profileView'), promptBox: document.getElementById('promptBox'), historyList: document.getElementById('historyList'), fixedForm: document.getElementById('fixedForm')
  };

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
      out: current?.outputType || out?.value || pools.outputTypes[0],
      qual: current?.quality || qual?.value || pools.qualities[0],
      bg: current?.background || bg?.value || pools.backgrounds[0],
      light: current?.lighting || light?.value || pools.lighting[0],
      count: current?.count || count?.value || pools.counts[0],
      lang: current?.promptLanguage || lang?.value || pools.promptLanguages[0],
      target: current?.promptTarget || target?.value || pools.promptTargets[0],
      caption: current?.captionMode || caption?.value || '表記する',
      cardStyle: current?.cardStyle || cardStyle?.value || pools.cardStyles[0],
      cardRarity: current?.cardRarity || cardRarity?.value || 'おすすめ自動',
      cardTheme: current?.cardTheme || cardTheme?.value || pools.cardThemes[1],
      cardLayout: current?.cardLayout || cardLayout?.value || pools.cardLayouts[0],
      cardWearMode: current?.cardWearMode || cardWear?.value || pools.cardWearModes[0],
      cardEffect: cardEffectByRarity(current?.cardRarity || cardRarity?.value || 'R')
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
    writeCaptionFields('manual', current?.captionFields || readCaptionFields('initial'));
    writeCardFields('manual', current?.cardFields || readCardFields('initial'));
    if(out) out.onchange = () => { syncCardSettingsVisibility(); if(current){ current.outputType = out.value; renderAll(); } };
    if(qual) qual.onchange = () => { if(current){ current.quality = qual.value; renderAll(); } };
    if(bg) bg.onchange = () => { if(current){ current.background = bg.value; renderAll(); } };
    if(light) light.onchange = () => { if(current){ current.lighting = light.value; renderAll(); } };
    if(count) count.onchange = () => { if(current){ current.count = count.value; renderAll(); } };
    if(lang) lang.onchange = () => { if(current){ current.promptLanguage = lang.value; renderAll(); } };
    if(target) target.onchange = () => { if(current){ current.promptTarget = target.value; renderAll(); } };
    if(caption) caption.onchange = () => { if(current){ current.captionMode = caption.value; renderAll(); } };
    if(cardStyle) cardStyle.onchange = () => { if(current){ current.cardStyle = cardStyle.value; renderAll(); } };
    if(cardRarity) cardRarity.onchange = () => { if(current){ current.cardRarity = cardRarity.value==='おすすめ自動' ? suggestCardRarity(current) : cardRarity.value; current.cardEffect = cardEffectByRarity(current.cardRarity); renderAll(); } };
    if(cardTheme) cardTheme.onchange = () => { if(current){ current.cardTheme = cardTheme.value; renderAll(); } };
    if(cardLayout) cardLayout.onchange = () => { if(current){ current.cardLayout = cardLayout.value; renderAll(); } };
    if(cardWear) cardWear.onchange = () => { if(current){ current.cardWearMode = cardWear.value; renderAll(); } };
    if(cardEffect) cardEffect.onchange = () => { if(current){ current.cardEffect = cardEffectByRarity(current.cardRarity); renderAll(); } };
    document.querySelectorAll('[data-caption-scope="manual"]').forEach(el=>{ el.onchange = () => { if(current){ current.captionFields = readCaptionFields('manual'); renderAll(); } }; });
    document.querySelectorAll('[data-card-scope="manual"]').forEach(el=>{ el.onchange = () => { if(current){ current.cardFields = readCardFields('manual'); renderAll(); } }; });
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
    if(cpSel) cpSel.onchange = () => { if(current){ current.catchphraseMode = cpSel.value; renderAll(); } };
    renderSelectOptions(dmSel, 'derivedMode', pools.derivedModes, dmSel?.value || '参照画像前提（簡潔版）', false);
    const trSel = document.getElementById('initialTraining');
    renderSelectOptions(trSel, 'trainingLevel', ['ランダム'].concat(TRAINING_LEVELS.map(x=>x[0])), trSel?.value || 'ランダム', false);
    const ssSel = document.getElementById('initialSeason');
    renderSelectOptions(ssSel, 'season', pools.seasons, ssSel?.value || 'ランダム', false);
    if(ssSel) ssSel.onchange = () => { if(current){ current.season = ssSel.value !== 'ランダム' ? ssSel.value : current.season; refreshSeasonOutfits(current); renderAll(); } };
    if(dmSel) dmSel.onchange = () => { if(current){ current.derivedMode = dmSel.value; renderAll(); } };
    if(groupPMSel) groupPMSel.onchange = () => { if(currentGroup){ currentGroup.promptMode = groupPMSel.value; renderAll(); } };
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
    if(mainWear) mainWear.onchange = () => { if(current){ current.mainWearMode = mainWear.value; if(mainWear.value==='時代に合った下着の種類'){ const u = generateEraUnderwear(current.eraYear); current.underwearType = u.type; current.underwearColor = u.color; } else { current.underwearType=''; current.underwearColor=''; } renderAll(); } };
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
  NATION_NAMES['カナダ'] = NATION_NAMES['アメリカ'];
  NATION_NAMES['イギリス'] = NATION_NAMES['アメリカ'];
  NATION_NAMES['オーストラリア'] = NATION_NAMES['アメリカ'];
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
    const CAT_LABELS = uiLang==='en'
      ? {basic:'Basic', body:'Body', bodyhair:'Body Hair', face:'Face', outfit:'Outfit & Socks'}
      : {basic:'基本', body:'体型・身体', bodyhair:'体毛', face:'顔立ち', outfit:'服装・靴下'};
    const cats = [];
    slotDefs.forEach(([key,label,cat])=>{ const c = cat || 'basic'; if(!cats.includes(c)) cats.push(c); });
    const slotHtml = ([key,label]) => `<div class="slot" id="slot-${key}"><button class="lock" data-lock="${key}">${T('lock')}</button><button class="dice" data-dice="${key}" title="${T('diceTitle')}">🎲</button>${key==='name' ? '' : `<button class="edit" data-edit="${key}" title="${T('editTitle')}">✎</button>`}<small>${slotLabel(key,label)}</small><div class="value">？？？</div><div class="meta">${T('clickLock')}</div></div>`;
    els.slotGrid.innerHTML = cats.map(cat=>{
      const defs = slotDefs.filter(d=>(d[2]||'basic')===cat);
      return `<div class="slot-cat${catCollapsed[cat]?' collapsed':''}" data-cat="${cat}"><button class="cat-head" data-cathead="${cat}">${CAT_LABELS[cat]||cat}（${defs.length}）<span class="cat-arrow">▼</span></button><div class="cat-grid">${defs.map(slotHtml).join('')}</div></div>`;
    }).join('');
    document.querySelectorAll('[data-cathead]').forEach(b=>b.addEventListener('click',()=>{ const cat=b.dataset.cathead; const wrap=b.closest('.slot-cat'); wrap.classList.toggle('collapsed'); catCollapsed[cat]=wrap.classList.contains('collapsed'); }));
    document.querySelectorAll('[data-lock]').forEach(b=>b.addEventListener('click',()=>{locks[b.dataset.lock]=!locks[b.dataset.lock]; renderSlots(current,false);}));
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
      'スポーツ系': { facePresets:[['体育会系スポーツ男子',5],['大学サッカー部系',4],['普通顔',2]], hairStyles:[['短髪',4],['アップバング',3],['ソフトツーブロック',2]], hairColors:[['黒',4],['ブルーブラック',2]], outfits:[['スポーツ練習着',5],['大学生カジュアル',2],['私服通学風',2]], bodyTypes:[['引き締まったスポーツ体型',4],['サッカー選手体型',4],['筋肉質',3],['痩せマッチョ',2]] },
      'きれいめ系': { facePresets:[['スーツ映え社会人系',4],['高身長モデル系',3],['日本の若手俳優風',3]], hairStyles:[['センターパート',3],['サイドパート',3],['韓国風センターパート',2],['ビジネス短髪',2]], hairColors:[['黒',3],['ブルーブラック',3],['アッシュブラウン',2]], outfits:[['ジャケットスタイル',4],['社会人カジュアル',3],['紺スーツ',2]], bodyTypes:[['細身',3],['スーツ映え体型',3],['高身長モデル体型',2]] },
      'カジュアル系': { facePresets:[['親しみやすい大学生系',4],['普通顔',4],['日本の若手俳優風',2]], hairStyles:[['マッシュ',3],['センターパート',2],['ソフトツーブロック',3],['ニュアンスパーマ',2]], hairColors:[['黒',3],['黒に近いダークブラウン',2],['自然な茶髪',2]], outfits:[['大学生カジュアル',4],['私服通学風',4],['ストリート系',2],['社会人カジュアル',2]], bodyTypes:[['標準体型',4],['細身',3],['やせ型',2]] },
      '韓国風': { facePresets:[['韓国アイドル風',6],['中性系',3],['高身長モデル系',2]], hairStyles:[['韓国風センターパート',5],['センターパート',3],['ニュアンスパーマ',2]], hairColors:[['黒',3],['ブルーブラック',3],['グレージュ',2]], outfits:[['きれいめカジュアル',1],['ジャケットスタイル',3],['大学生カジュアル',2],['社会人カジュアル',2]], bodyTypes:[['細身',4],['高身長モデル体型',3],['標準体型',2]] },
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
    if(ageAppearance==='やや若く見える') return weighted([[facePreset,4],['親しみやすい大学生系',4],['普通顔',3],['日本の若手俳優風',2],['韓国アイドル風',2]]);
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

  /* ===== V3.2.0 時代別ファッション語彙エンジン（年タグ＋近接年代ウィンドウ） ===== */
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


  // ===== V3.2.0 コーデ部位ヘルパー・アクセサリー・季節連動 =====
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
  const OCC_CAT = {}; OCCUPATIONS.forEach(([n,c])=>OCC_CAT[n]=c);
  function occupationOptionsHTML(selected, includeRandom=true){
    const en = (typeof uiLang!=='undefined' && uiLang==='en');
    const esc = v=>String(v).replace(/"/g,'&quot;');
    let h = includeRandom ? `<option value="ランダム"${selected==='ランダム'?' selected':''}>${en?'Random':'ランダム'}</option>` : '';
    if(selected && selected!=='ランダム' && !OCC_CAT[selected]) h += `<option value="${esc(selected)}" selected>${selected}</option>`;
    for(const cat of OCC_CAT_ORDER){
      const items = OCCUPATIONS.filter(([,c])=>c===cat);
      if(!items.length) continue;
      const lab = OCC_CAT_LABELS[cat] ? (en?OCC_CAT_LABELS[cat].en:OCC_CAT_LABELS[cat].ja) : cat;
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
  SPORT_BODY['陸上（短距離）'] = SPORT_BODY['陸上短距離'];
  SPORT_BODY['陸上（長距離）'] = SPORT_BODY['陸上長距離'];
  SPORT_BODY['自転車ロード'] = SPORT_BODY['自転車競技'];
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
  function sportsHistoryText(c, english=false){
    const h = (c && c.sportsHistory) || [];
    if(!h.length) return english ? 'None (non-athletic)' : 'なし（文化系・帰宅部）';
    return h.map(x=>`${x.name}（${SPORT_STAGES[x.from]}${x.from===x.to?'':'〜'+SPORT_STAGES[x.to]}）`).join('／');
  }
  (function(){
    const alias = (map, pairs)=>pairs.forEach(([a,b])=>{ if(map[b] && !map[a]) map[a] = map[b]; });
    alias(SPORT_MUSCLE, [['陸上短距離','陸上（短距離）'],['陸上長距離','陸上（長距離）'],['自転車ロード','自転車競技']]);
    alias(SPORT_SKELETON, [['陸上短距離','陸上（短距離）'],['自転車ロード','自転車競技']]);
    SPORT_MUSCLE['ゴルフ'] = ['体幹の回旋筋と前腕、スイングを支える下半身','rotational core, forearms, and a swing-anchoring lower body','体幹まわり'];
    SPORT_SKELETON['サッカー'] = ['骨盤まわりと大腿骨の安定した下半身骨格','a stable pelvis-and-femur lower structure'];
  })();
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
    const role = displayValue('role', c.role) || c.role;
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
  (function(){
    const A=(k,sc,ro)=>{const m=SPORT_MEM[k]; if(m){m.sc.push(...sc); m.ro.push(...ro);}};
    A('卓球',['ラリーの音だけの放課後'],['サーブの魔術師','守備型カットマンの忍耐','ダブルスの相方に恵まれた']);
    A('テニス',['雨上がりのコート整備'],['セカンドサーブの職人','壁打ち仲間が最初のライバル','ボレー専門の前衛']);
    A('ソフトテニス',['夏合宿の砂入りコート'],['ロブで粘る後衛','ポーチの読みが冴えた前衛']);
    A('バドミントン',['羽が天井に届いた体育館'],['クリアの飛距離自慢','ダブルスの前衛職人','ローテーションの頭脳役']);
    A('陸上（短距離）',['雨のタータンの匂い'],['スタートだけは日本一と言われた','リレーで抜いた3人','追い風参考の自己ベスト']);
    A('陸上（長距離）',['冬の朝の白い息'],['ラストスパートの男','ペース配分の職人','故障と付き合い続けた粘り']);
    A('剣道',['防具の革の匂い'],['出小手の名手','声の大きさで相手を飲む','稽古熱心だけが取り柄と言われた']);
    A('空手',['正拳突きの反復の日々'],['型の美しさで勝負した','組手のカウンター使い']);
    A('相撲',['塩を撒く一瞬の静けさ'],['押し相撲ひと筋','四股の美しさを褒められた']);
    A('ラグビー',['試合後のノーサイドの握手'],['タックル数だけはチーム一','ラインアウトのジャンパー','モールを押し込む縁の下']);
    A('ハンドボール',['スカイプレーの着地音'],['7mスローの守護神','速攻の起点役']);
    A('体操',['手のひらのマメが硬くなった日'],['鉄棒の離れ技に憧れた','着地の神と呼ばれた','補助係から始めた努力型']);
    A('ボクシング',['縄跳びのリズム音'],['ジャブを打ち続けた3年間','スパーリング相手専門の献身']);
    A('レスリング',['計量前夜の空腹'],['タックルの入り足だけは天才','スタミナ勝負の後半型']);
    A('スキー',['リフトから見た朝焼け'],['旗門ギリギリを攻めた','転び方から教わった初心者上がり']);
    A('スケート',['貸靴から始まった週末'],['コーナーワークの職人','氷の上でだけ足が速い']);
    A('自転車競技',['峠の頂上で飲んだ水の味'],['ヒルクライムの登坂職人','集団の風よけ役','落車の傷が勲章']);
    A('ボート',['艇庫の朝の静けさ'],['ストロークのリズム番','声で艇を進めたコックス']);
    A('アメリカンフットボール',['ハドルの円陣の熱'],['ラインの無名の壁','スペシャルチームの職人']);
    A('ダンス',['鏡張りのスタジオの終電前'],['ソロパートを勝ち取った夜','振り覚えの速さだけは負けない']);
    A('クライミング',['チョークバッグの白い手形'],['最後の一手を落とし続けた課題','ムーブの解読が趣味']);
    A('ゴルフ',['朝露のフェアウェイ'],['パター練習だけ毎晩やる','ドラコン狙いの一発屋']);
    A('野球',['甲子園中継を正座で見た夏'],['牽制で刺すのが得意だった']);
    A('サッカー',['リフティング100回の壁'],['セットプレーの职人']);
    A('水泳',['メドレーリレーの第一泳者'],['ターンの速さで稼いだ']);
    A('柔道',['道場の神棚への一礼'],['乱取り10本の後の静けさ担当']);
    A('バスケットボール',['ボールの空気圧を確かめる癖'],['フリースローだけ9割の男']);
    const C=(k,arr)=>{ if(CULT_MEM[k]) CULT_MEM[k].push(...arr); else CULT_MEM[k]=arr; };
    C('吹奏楽',['マウスピースだけ持ち歩いた']); C('軽音',['コード3つで作った初オリジナル']);
    C('美術',['デッサンの消しカスの山']); C('図書室',['返却期限を守ったことがない']);
    C('ゲーム',['対戦相手と店の外で友達になった']); C('バイト',['まかないが夕飯だった']);
    C('生徒会',['予算折衝で鍛えられた']); C('帰宅部',['自転車の寄り道ルートが100通り']);
    C('鉄道',['廃線跡を歩いた夏休み']); C('釣り',['坊主の日ほど語りたがる']);
    C('将棋',['負けた棋譜ほど覚えている']); C('パソコン',['自作機の配線が青春だった']);
    C('写真',['現像液の匂いが好きだった','運動会のカメラ係常連','フィルム1本を1ヶ月かけて撮った']);
    C('演劇',['裏方の暗転作業が得意だった','台詞より小道具作りに燃えた']);
    C('料理',['文化祭の焼きそば担当から始まった','弁当男子の先駆けだった']);
    const M=(k,t)=>{ if(MBTI_INTRO[k]) MBTI_INTRO[k].push(t); };
    M('INTJ','雑談より本題から入りたい'); M('INTP','検索履歴が百科事典');
    M('ENTJ','会議の終了時刻を守らせる係'); M('ENTP','禁止と言われるとやりたくなる');
    M('INFJ','空気の変化に気づくのが早い'); M('INFP','拾った猫の名前を3日悩む');
    M('ENFJ','送別の色紙を必ず言い出す'); M('ENFP','旅の計画より当日の風まかせ');
    M('ISTJ','領収書を日付順に並べる'); M('ISFJ','傘を2本持ち歩く');
    M('ESTJ','行列の整理を自然に始める'); M('ESFJ','差し入れの数を人数+2で買う');
    M('ISTP','家電の異音の原因を当てる'); M('ISFP','散歩コースを毎回変える');
    M('ESTP','初対面の店で常連ぶれる'); M('ESFP','カメラを向けられると強い');
    const O=(k,arr)=>{ if(OCC_HOOK[k]) OCC_HOOK[k].push(...arr); else OCC_HOOK[k]=arr; };
    O('消防士',['放水の反動を全身で覚えている']); O('警察官',['雨の日の交通整理で顔を覚えられた']);
    O('看護師',['採血の上手さで指名される']); O('大工',['鉛筆を耳に挟むのが定位置']);
    O('美容師',['自分の髪は同僚に任せる']); O('バーテンダー',['シェイカーの音で機嫌が分かると言われる']);
    O('寿司職人',['米の炊き加減に朝一番厳しい']); O('農家',['長靴の泥の落とし方に流儀がある']);
    O('漁師',['携帯より潮見表を先に見る']); O('ITエンジニア',['再起動で直ると信じている']);
    O('教師',['赤ペンのインクの減りが早い','チョークを投げずに置く派']);
    O('料理人',['まかないにいちばん本気を出す','包丁を研ぐ日曜の朝']);
    O('トラック運転手',['深夜のサービスエリアの味方','バック駐車は一発で決める']);
    O('銀行員',['札勘の速さだけは支店一','電卓は見ずに打てる']);
    O('公務員',['書類の角を揃える癖が抜けない','印鑑を3種類使い分ける']);
    O('営業職',['靴磨きが月曜の儀式','名刺の渡し方に魂を込める']);
    const OC=(k,t)=>{ if(OCC_CAT_HOOK[k]) OCC_CAT_HOOK[k].push(t); };
    OC('office','会議室の予約合戦に強い'); OC('it','コーヒーの消費量で進捗が分かる');
    OC('medical','早歩きが標準速度になった'); OC('edu','声が廊下の端まで届く');
    OC('service','混雑予測が天気予報より当たる'); OC('trade','手袋のサイズにこだわる');
    OC('creative','散歩中にアイデアが降ってくる'); OC('uniform','休日の私服が一番の悩み');
    OC('showa','手書きの字に自信がある'); OC('student','締切前夜の集中力だけは天才');
    OC('retired','平日の空いた映画館が特等席');
    const E=(k,t)=>{ if(ERA_HOOK[k]) ERA_HOOK[k].push(t); };
    E('1946','闇市の匂いをかすかに覚えている'); E('1970','プロレス中継に熱狂した');
    E('1980','ラジカセを肩に担いだ世代'); E('1990','プリクラ帳を持っていた');
    E('2000','着うたフルに月額を払った'); E('2010','自撮り棒を最初に笑った側');
    E('2020','リモート会議の背景に凝った'); E('2030','紙の地図を読める希少種');
    const T=(k,t)=>{ if(TRAIN_HOOK[k]) TRAIN_HOOK[k].push(t); };
    T('細マッチョ仕上げ（絞り重視）','コンビニで成分表を裏返す');
    T('機能系（クロスフィット・自重上級）','壁を見ると逆立ちしたくなる');
    T('フィジーク級（大会レベルの絞りと逆三角形）','塩抜きの週の無口さは許してほしい');
    T('パワー系（厚み重視の剛力体型）','瓶の蓋係として重宝されている');
    T('ボディビル級（過剰な筋肥大）','飛行機の座席でいつも謝る');
    T('しっかり鍛えている（中級）','レッグデイの翌日は階段を避ける');
    T('昔は鍛えていた（今は中断）','プロテインの残りが賞味期限切れ');
    Object.assign(BRIDGE_HOOK, {
      '野球uniform':'遠投で鍛えた肩は現場の頼み綱','ボクシングuniform':'間合いの読みは制服の仕事でも生きる',
      '体操medical':'体の使い方を知っているから腰を痛めない','クライミングtrade':'高所作業はむしろ落ち着く',
      'ダンスcreative':'リズム感は企画会議でも役に立つ','卓球it':'反射神経はデバッグにも効く',
      '相撲service':'受け止める力は接客で覚えた','ラグビーoffice':'ワンフォーオールが口癖になった',
      'バレーボールedu':'拾ってつなぐのは教室でも同じ','剣道showa':'礼に始まり礼に終わる仕事ぶり'
    });
  })();
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
  function muscleSummary(c, english=false){
    const hist = ((c && c.sportsHistory) || []).filter(x=>x.strength > 0 && SPORT_MUSCLE[x.name]);
    if(!hist.length) return english ? 'None' : 'なし';
    const m = hist[0];
    const tierTxt = ((c.role === 'プロスポーツ選手' && m.name === c.sportName) || m.strength >= 2) ? (english ? 'well developed' : 'しっかり') : m.strength >= 0.8 ? (english ? 'moderate' : 'ほどよく') : (english ? 'faint traces' : '名残程度');
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
    out.cheek = weighted([['標準的な頬',6],['頬骨が高めの頬', /細マッチョ|クライマー|陸上長距離|細身/.test(bt)?2.5:1.5],['ややこけた頬', /やせ型|華奢|陸上長距離/.test(bt)?2.5:0.8],['ふっくらした頬', /ぽっちゃり|腹だけ/.test(bt)?3:1.2]]);
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
  function underwearDesc(c, english=false){
    const mode = c?.mainWearMode || 'ボクサーパンツのみ';
    const brandJa = c?.boxerBrand && c.boxerBrand !== '指定しない' ? `${c.boxerBrand}の` : '';
    const brandEn = c?.boxerBrand && c.boxerBrand !== '指定しない' ? `${c.boxerBrand} ` : '';
    if(mode === '時代に合った下着の種類' && c?.underwearType){
      const t = c.underwearType, col = c.underwearColor || '';
      if(english){
        const colEn = UNDERWEAR_COLOR_EN[col] || col;
        const tEn = {'白ブリーフ':'classic white briefs','カラーブリーフ':`${colEn} classic briefs`,'トランクス':`${colEn} loose trunks-style boxer shorts`,'ボクサーパンツ':`${colEn} boxer briefs`}[t] || `${colEn} ${t}`;
        return `${brandEn}${tEn}`;
      }
      const tJa = {'白ブリーフ':'白ブリーフ','カラーブリーフ':`${col}のカラーブリーフ`,'トランクス':`${col}のトランクス`,'ボクサーパンツ':`${col}のボクサーパンツ`}[t] || `${col}の${t}`;
      return `${brandJa}${tJa}`;
    }
    const bwt = c?.baseWearType || 'ボクサーパンツ';
    const bwtEn = {'ボクサーパンツ':'boxer briefs','ショートショーツ':'athletic short shorts','スポーツスパッツ':'sports compression spats'}[bwt] || 'boxer briefs';
    if(english) return `${brandEn}${UNDERWEAR_COLOR_EN[c?.boxerColor] || c?.boxerColor} ${bwtEn}`;
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
    if(axis==='scene') return FOOT_SCENES.map(x=>x[0]).concat(footOccScenes(current && current.role).map(x=>x[0]));
    if(axis==='posture') return FOOT_POSTURES.map(x=>x[0]);
    if(axis==='shoeState') return FOOT_SHOE_STATES;
    if(axis==='wear') return ['職業服装のまま','私服'];
    if(axis==='fabric') return FOOT_FABRICS.map(x=>x[0]);
    if(axis==='sockState') return FOOT_SOCK_STATES.map(x=>x[0]);
    if(axis==='angle') return FOOT_ANGLES;
    if(axis==='prop'){ let opts = ['なし'].concat(FOOT_PROPS.generic).concat(FOOT_PROPS['新幹線の座席（靴を脱いでくつろぐ）']).concat(FOOT_PROPS['こたつのある部屋']); footOccScenes(current && current.role).forEach(r=>{ opts = opts.concat(r[3]||[]); }); return Array.from(new Set(opts)); }
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
    if(english) return `Teeth: ${displayValue('teethAlign', al)}, ${displayValue('teethColor', co)}${teethColorNote(co, true)}. Show the teeth only as far as naturally visible when he smiles — do NOT keep his teeth constantly bared.`;
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
    if(english) return `Eyebrows: ${displayValue('eyebrow', eb)} (${displayValue('eyebrowDensity', ed)}). Eyelid: ${displayValue('eyelid', el)}. Eye shape: ${displayValue('eyeShape', esh)}. Eye impression: ${displayValue('eyes', ei)}. Eyelashes: ${displayValue('eyelash', ela)} — never make him look like he is wearing makeup or mascara.`;
    return `眉は${eb}で、${ed}。まぶたは${el}、目の形は${esh}、目の印象は${ei}。まつ毛は${ela}（化粧をしているようには見せない）。`;
  }
  function faceExtraLine(c, english=false){
    const LIMIT = promptOpt(c).compact ? 6 : 99;
    const parts = [];
    const add = (key, jaFmt, enFmt)=>{
      const v = c[key];
      if(!v || v === FACE_EXTRA_DEFAULTS[key]) return;
      parts.push(english ? enFmt(displayValue(key, v)) : jaFmt(v));
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
    if(english) return `Pick 2-3 questions such as "How do you spend your days off?", "What are you into lately?", and "What's your type?". Do NOT use pre-written answers — write the answers on the spot, in his own natural voice, based on this persona: personality ${mbtiDescription(c.mbti, true)}, vibe ${displayValue('vibe', c.vibe) || c.vibe}, hobby tendencies around ${hobby[1]}${c.sportName && c.sportName !== 'なし' ? `, and his sport is ${(typeof valueTranslations!=='undefined' && valueTranslations[c.sportName]) || c.sportName}` : ''}. Match the wording to his age (${c.age}) and to how people spoke around ${c.eraYear || '2026'}.`;
    return `質問は「休日の過ごし方」「最近のマイブーム」「好きなタイプ」などから2〜3問選ぶ。回答の例文はここには書かないので、生成時に本人の人物像に沿った自然な口調でその場で書き起こすこと。人物像ヒント：性格は${mbtiDescription(c.mbti, false)}、雰囲気は${c.vibe}、趣味の傾向は${hobby[0]}あたり${c.sportName && c.sportName !== 'なし' ? `、競技は${c.sportName}` : ''}。言葉選びは${c.age}歳という年齢と、${eraLabel(c.eraYear)}頃の話し言葉に合わせる`;
  }

  function profileShortText(c, english=false){
    const per = mbtiDescription(c.mbti, english);
    const hol = c.holidayOutfitType || '';
    if(english) return `A ${c.age}-year-old ${displayValue('role', c.role) || 'man'} with a ${String(per).toLowerCase()} air; on days off he goes for a ${displayValue('outfitType', hol) || 'relaxed'} style.`;
    return `${per}雰囲気の${c.age}歳・${c.role}。休日は${hol ? hol + 'の装い' : '気楽な私服'}で過ごす。`;
  }
  function catchphrase(c, english=false){
    const occ = (c.role==='プロスポーツ選手' && c.sportName && c.sportName!=='なし') ? `${c.sportName}選手` : (c.role || '');
    const occEn = (c.role==='プロスポーツ選手' && c.sportName && c.sportName!=='なし')
      ? `${(typeof valueTranslations!=='undefined' && valueTranslations[c.sportName]) || c.sportName} player`
      : (displayValue('role', c.role) || c.role);
    const enJoin = (adjRaw) => { const adj = String(adjRaw||'').toLowerCase().trim(); const noun = String(occEn).toLowerCase(); const p = adj ? `${adj} ${noun}` : noun; return `${/^[aeiou]/.test(p) ? 'An' : 'A'} ${p}`; };
    const bright = ['金髪（ブリーチ）','ブリーチベージュ','ミルクティーベージュ','ハイトーンアッシュ','明るめブラウン','オレンジブラウン','シルバーアッシュ'].includes(c.hairColor);
    const blackish = ['黒','ブルーブラック','ネイビーブラック','黒に近いダークブラウン'].includes(c.hairColor);
    const gray = ['白髪まじり','ロマンスグレー','ごま塩頭','ほぼ白髪'].includes(c.hairColor);
    const strict = STRICT_HAIR_OCC.includes(c.role), free = FREE_HAIR_OCC.includes(c.role);
    if(c.holidayPersona) return english ? `${enJoin('')} on weekdays, ${String(displayValue('vibe', c.vibe) || c.vibe).toLowerCase()} on days off` : `平日は${occ}、休日は${c.vibe}`;
    if(c.age >= 60 && ['ギャル男系','やりらふぃー系','ヤンキー系','ストリート系','バンドマン系','韓国風','ホスト系'].includes(c.vibe)) return english ? `Forever ${String(displayValue('vibe', c.vibe) || c.vibe).toLowerCase()} — ${String(occEn).toLowerCase()}` : `いくつになっても${c.vibe}の${occ}`;
    if(c.age <= 30 && ['飲食店店長','ラーメン店店主','コンビニ店長','寿司職人','喫茶店マスター'].includes(c.role)) return english ? enJoin('young') : `若き${occ}`;
    if(strict && bright) return english ? `${enJoin('')} with unexpectedly bright hair` : `明るい髪の${occ}`;
    if(free && blackish) return english ? `${enJoin('')} who keeps his hair black` : `黒髪のままの${occ}`;
    if(gray && c.age < 50) return english ? enJoin('gray-haired-too-soon') : `若白髪の${occ}`;
    // 特徴候補を収集し、ランダムに1つ選ぶ
    const feats = [];
    const hairFeat = {'金髪（ブリーチ）':['金髪の','bleached-blond'],'ブリーチベージュ':['ブリーチヘアの','bleach-haired'],'ハイトーンアッシュ':['ハイトーンの','high-tone-haired'],'シルバーアッシュ':['シルバーヘアの','silver-haired'],'メッシュ入りブラック':['メッシュヘアの','highlight-streaked'],'インナーカラー（アッシュ）':['インナーカラーの','inner-colored'],'プリン気味の伸びた茶髪':['プリン頭の','grown-out-dyed'],'オレンジブラウン':['オレンジヘアの','orange-haired'],'白髪まじり':['白髪まじりの','graying'],'ロマンスグレー':['ロマンスグレーの','silver-gray'],'ごま塩頭':['ごま塩頭の','salt-and-pepper'],'ほぼ白髪':['白髪の','white-haired']};
    if(hairFeat[c.hairColor]) feats.push(hairFeat[c.hairColor]);
    const faceFeat = {'ワイルド系':['ワイルド顔の','wild-faced'],'ブサイク系':['愛嬌のある顔の','charmingly homely'],'ホスト系':['ホスト顔の','host-club-faced'],'おじさん系':['おじさん顔の','middle-aged-faced'],'昭和顔（濃い顔立ち）':['昭和顔の','Showa-faced'],'塩顔系':['塩顔の','subtle-featured'],'韓国アイドル風':['アイドル顔の','idol-faced'],'高身長モデル系':['モデル顔の','model-faced'],'やんちゃ系':['やんちゃ顔の','mischievous-faced'],'ソース顔':['ソース顔の','bold-featured'],'しょうゆ顔':['しょうゆ顔の','refined-featured'],'ミステリアス系':['ミステリアスな','mysterious'],'クール系':['クールな','cool-looking'],'彫りの深い縄文系':['彫りの深い','deep-featured'],'たれ目系':['たれ目の','droopy-eyed'],'つり目系':['つり目の','sharp-eyed']};
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
    return english ? enJoin(displayValue('vibe', c.vibe) || c.vibe) : `${c.vibe}の${occ}`;
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
      const wear = (current && current.profileSheetWear) || '職業服装';
      const wearSpecJa = wear==='私服' ? casualOutfitSpec(c, false) : workOutfitSpec(c, false);
      const wearSpecEn = wear==='私服' ? casualOutfitSpec(c, true) : workOutfitSpec(c, true);
      const A = Number(c.measurementA).toFixed(1), B = Number(c.measurementB).toFixed(1);
      const CL = (typeof profileMeasurementCLabel==='function') ? profileMeasurementCLabel(c.measurementC, english) : c.measurementC;
      const S = innerCatShow;
      const catLines = [];
      if(S.basic) catLines.push(`【基本】生年月日：${c.birthdateText}／出身地：${String(c.birthplaceText||'').replace('：','')}／血液型：${c.bloodType}／一人称：${c.pronoun}／口調：${c.speechText}／あだ名：${c.nicknameText}`);
      if(S.life) catLines.push(`【暮らし・家族】${c.maritalText}・恋人：${c.loverText}／家族構成：${c.familyText}／${c.livingText}・住居：${c.residenceText}／出自：${c.originText}／学歴：${c.educationText}／収入：${c.incomeText}／資産：${c.assetText}`);
      if(S.daily) catLines.push(`【日常・嗜好】健康：${c.healthText}／趣味：${c.hobbyText}／マイブーム：${c.myBoomText}／好物：${c.foodLikeText}・苦手：${c.foodHateText}`);
      if(S.mind) catLines.push(`【内面】行動原理：${c.principleText}／夢：${c.innerDream}／本音の欲望：${c.innerDesire}／弱点：${c.weaknessMind}・${c.weaknessBody}／才能：${c.innerTalent}／コンプレックス：${c.complexText}／許せないこと：${c.unforgivableText}／コーデ基準：${c.fashionSenseText}`);
      if(S.past) catLines.push(`【過去・人間関係】${c.pastUpbringing}／${c.pastTrauma}／思い出：${c.memoryText}／親友：${String(c.friendText||'').replace(/〔.*?〕/,'')}／恋愛対象：${c.loveTarget}／恋愛経験：${c.loveCountText}`);
      if(S.adult) catLines.push(`【オトナの事情（小さく・婉曲表現で）】飲酒：${c.drinkText}／喫煙：${c.smokeText}／ギャンブル歴：${c.gambleText}／風俗経験：${c.fuzokuText}／初めての体験：${c.firstExpText}／週頻度：相手あり ${c.weekFreqText}・セルフ ${c.selfFreqText}`);
      const linesJa = catLines.join('。 ');
      if(english){
        const blocks = [
          `(1) his one-line bio "${bioLine(c, true)}" under a small headline`,
          `(2) a basic profile block (name ${nameKana(c)}, age ${c.age}, occupation ${displayValue('role', c.role)}, height ${c.height}, weight ${c.weight}, foot ${c.footSize}, MBTI ${mbtiDisplay(c)})`
        ];
        if(catLines.length) blocks.push(`(3) an "Inner / Background" block in smaller type listing (values are Japanese, keep them verbatim and readable): ${linesJa}`);
        blocks.push(`(${catLines.length?4:3}) a "PROFILE ONLY A / B / C" box: A ${A}cm / B ${B}cm / C ${CL} — print the values only, never explain their meaning`);
        return `Create a single 16:9 "character profile sheet". LEFT: one full-body standing shot in his ${wear==='私服'?'casual outfit':'work outfit'} with shoes (${wearSpecEn}). RIGHT: a clean info area with — ${blocks.join('; ')}. Keep all text clean and unbroken.${catLines.length&&S.adult?' Soften the "grown-up matters" lines with tasteful euphemism or partial masking.':''} Render as a wholesome, non-sexual character reference sheet in the visual quality "${enQuality(c.quality)}".`;
      }
      const blocks = [
        `①小見出しの下にひとこと背景「${c.bioText || bioLine(c, false)}」`,
        `②基本プロフィール欄（名前：${nameKana(c)}／${c.age}歳／${c.role}／身長${c.height}・体重${c.weight}・足${c.footSize}／MBTI：${mbtiDisplay(c)}）`
      ];
      if(catLines.length) blocks.push(`③「内面・背景」欄を小さめの文字で整理して記載する：${linesJa}`);
      blocks.push(`${catLines.length?'④':'③'}「PROFILE ONLY A / B / C」欄（A：${A}cm／B：${B}cm／C：${CL}。数値・表記のみ記載し、意味の説明は一切書かない）`);
      return `「キャラクタープロフィールシート」として16:9の1枚に構成する。左側：${wear==='私服'?'私服':'職業服装'}のフルコーデでの全身立ち姿を1枚（靴あり。${wearSpecJa}）。右側：情報エリアを整然と組む。${blocks.join('。')}。誌面の日本語はすべて文字化けさせず読みやすく。${catLines.length&&S.adult?'「オトナの事情」の行は伏せ字や婉曲で品よく小さく。':''}全体は健全で非性的な人物設定資料として、画風・質感「${c.quality}」で描く。`;
    }
    if(kind==='magazine'){
      if(english) return `Create a "character feature magazine page" — a fictional magazine spread featuring ${nameKana(c)} (${c.age}, ${displayValue('role', c.role)}), designed in ${magazineStyleByEra(c.eraYear, true)}. Layout: one main photo (casual outfit — ${casualOutfitSpec(c, true).replace('Casual outfit contents: ','')}), a smaller sub-cut (work outfit — ${workOutfitSpec(c, true).replace('Work outfit contents: ','')}), a big headline using the catchphrase "${catchphrase(c, true)}", a profile box (name, age, occupation, height ${c.height}), and a mini interview section: ${magazineQA(c, true)} ${c.season ? `Give the page a seasonal ${String(displayValue('season', c.season) || c.season).toLowerCase()} -issue feel. ` : ''}${innerMagazineBlock(c, true)}All page text must be clean and readable. Use a FICTIONAL magazine identity${c.nationality && c.nationality !== '日本' ? ` published in ${(typeof valueTranslations!=='undefined' && valueTranslations[c.nationality]) || c.nationality}` : ''} — no real magazine names or logos.`;
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
        ? `Info panel fields (clean blueprint typography): Name "${c.name}", Height ${c.height}, Weight ${c.weight}, Foot size ${c.footSize}, Occupation ${displayValue('role', c.role)}, MBTI ${c.mbti}, and a one-line profile: "${profileShortText(c, true)}".`
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

  let FRIEND_CTX = null;
  /* ===== V3.2 内面・背景プロフィール（プロンプト非反映） ===== */
  function innerRoleCat(role){
    const r = String(role||'');
    if(/学生|浪人|進路準備/.test(r)) return 'student';
    if(/悠々自適/.test(r)) return 'retired';
    if(/医師|歯科|看護|薬剤|理学療法|研修医|介護/.test(r)) return 'medical';
    if(/デザイナー|カメラ|ミュージシャン|編集|イラスト|映像|声優|俳優|モデル|書道|YouTuber|ゲーマー|クリエイター|アナウンサー|お笑い|記者/.test(r)) return 'creative';
    if(/大工|整備|電気工事|工場|配送|農家|漁師|建築士|引越し|警備|運転|運転士|パイロット|郵便|職人|寿司|ラーメン|パティシエ|シェフ|理容/.test(r)) return 'trade';
    if(/アパレル|カフェ|バーテン|ホテル|店員|店長|マスター|銭湯|花屋|司書|保育士|美容師|教習所/.test(r)) return 'service';
    if(/公務員|消防|警察|自衛|教師|教員|教官|国鉄|防衛/.test(r)) return 'public';
    if(/スポーツ|トレーナー|インストラクター|体育|ライフガード|プール監視/.test(r)) return 'sports';
    return 'office';
  }
  function innerAgeBand(age){ const a=Number(age)||25; return a<26?'y':a<46?'m':a<65?'s':'o'; }
 // [A,O,B,AB]
  const INNER_RHNEG = (nat)=>/日本|韓国|中国|台湾|タイ|ベトナム|フィリピン|インドネシア|マレーシア|モンゴル/.test(nat)?0.005:/インド/.test(nat)?0.05:/トルコ/.test(nat)?0.1:/ナイジェリア/.test(nat)?0.04:/ブラジル|メキシコ|アルゼンチン/.test(nat)?0.08:0.15;
  function innerWeighted(list, extra){
    const cand = (extra ? list.concat(extra) : list).map(x=>[x, Math.max(0.01, x[1])]);
    const v = weighted(cand.map(([x,w])=>[x,w]));
    return v; // returns [text, w, badge?]
  }
  function innerBadgeOf(item, wSum, list){
    if(!item) return null;
    if(item[2]==='r') return 'rare';
    if(item[2]==='d') return Math.random()<.6 ? 'rare' : null; // ダーティ系は目立たせる
    const total = list.reduce((s,x)=>s+x[1],0);
    return (item[1]/total) < 0.02 ? 'rare' : null;
  }
  function chooseInnerDream(c){
    const band = innerAgeBand(c.age), cat = innerRoleCat(c.role);
    const list = (INNER_DREAMS[band]||[]).concat(INNER_DREAMS.common).concat(INNER_DREAM_CAT[cat]||[]);
    const it = innerWeighted(list);
    return [it[0], innerBadgeOf(it, 0, list)];
  }
  function chooseInnerDesire(c, dream){
    let list = INNER_DESIRES;
    for(let tries=0;tries<4;tries++){
      const it = innerWeighted(list);
      const t = it[0];
      if(dream && t.slice(0,4) === String(dream).slice(0,4)) continue;
      const gap = it[2]==='d' && Math.random()<.35;
      return [t, gap ? 'gap' : innerBadgeOf(it, 0, list)];
    }
    return ['本音を言える相手が欲しい', null];
  }
  function chooseInnerWeakness(c){
    const age = Number(c.age)||25;
    let mind = INNER_WEAK_MIND.slice(), body = INNER_WEAK_BODY.slice();
    if(age<20) mind = mind.filter(x=>!/酒|二日酔い/.test(x[0]));
    if(age<20) body = body.filter(x=>!/酒|アルコール|加齢臭/.test(x[0]));
    if(age>=45){ body = body.concat([['老眼が始まった',5],['尿酸値が気になる',4,'d'],['階段で膝が笑う',3]]); }
    if(/細身/.test(String(c.bodyType||''))) body = body.concat([['体力がない',6]]);
    if(/ぽっちゃり|がっちり/.test(String(c.bodyType||''))) body = body.concat([['膝に負担がかかりやすい',4]]);
    const m = innerWeighted(mind), b = innerWeighted(body);
    const badge = (m[2]==='d'||b[2]==='d') && Math.random()<.5 ? 'rare' : null;
    return [m[0], b[0], badge];
  }
  function chooseInnerTalent(c){
    const noneW = 55;
    let list = INNER_TALENTS.slice();
    const sports = (c.sportsHistory||[]).some(x=>x.strength>0);
    if(sports) list = list.concat([['球技全般をすぐ人並み以上にこなす',3],['反射神経が良い',3]]);
    if(/ミュージシャン|声優|アナウンサー/.test(String(c.role||''))) list = list.concat([['耳コピができる',4]]);
    const total = list.reduce((s,x)=>s+x[1],0);
    if(Math.random() < noneW/(noneW+total)) return ['特になし（それが逆に強み…かもしれない）', null];
    const it = innerWeighted(list);
    return [it[0], it[2]==='d' ? 'rare' : innerBadgeOf(it, 0, list)];
  }
  function chooseInnerPronoun(c){
    const age = Number(c.age)||25;
    let list = INNER_PRONOUNS_BASE.map(x=>x.slice());
    const boost = (label, f)=>{ const it=list.find(x=>x[0]===label); if(it) it[1]*=f; };
    if(/公務員|銀行|医師|弁護士|アナウンサー|会計士|教師|教員|商社|コンサル/.test(String(c.role||''))){ boost('私',2.5); boost('僕',1.4); }
    if(/^I/.test(String(c.mbti||''))) boost('僕',1.5);
    if(/知的|上品|清潔感/.test(String(c.vibe||''))){ boost('僕',1.6); boost('私',1.3); }
    if(/ワイルド|スポーティ|ストリート/.test(String(c.vibe||''))){ boost('俺',1.6); boost('オレ',1.5); }
    if(age>=68) boost('わし',12);
    if(age<=22){ boost('一人称がまだ確立していない',2.5); boost('自分',1.4); }
    if(/自衛|警察|消防|体育|スポーツ/.test(String(c.role||''))) boost('自分',3);
    const it = innerWeighted(list);
    return [it[0], innerBadgeOf(it, 0, list)];
  }
  function chooseInnerIncome(c){
    const role = String(c.role||''), age = Number(c.age)||25, cat = innerRoleCat(role);
    if(cat==='student'){
      const it = innerWeighted([['収入なし（仕送り＋バイト月3万円）',5],['バイト代 月5万円',5],['バイト代 月8万円（掛け持ち）',3],['収入なし（勉強に専念）',3],['配信の投げ銭 月1万円',0.7,'r'],['treasureNFT…ではなく堅実に月4万円',0.1,'r']]);
      return [it[0], it[2] ? 'rare' : null];
    }
    if(cat==='retired'){
      const it = innerWeighted([['年金 月18万円',6],['年金 月22万円＋家賃収入少々',2],['年金＋退職金の取り崩し',4],['年金 月15万円（つつましく）',3],['配当と年金で悠々自適',0.8,'r']]);
      return [it[0], it[2] ? 'rare' : null];
    }
    let lo=330, hi=560;
    for(const [re,a,b] of INNER_INCOME_TABLE){ if(re.test(role)){ lo=a; hi=b; break; } }
    const mult = age<23?0.62:age<28?0.78:age<34?0.92:age<45?1.06:age<55?1.18:age<65?1.08:0.7;
    lo=Math.round(lo*mult); hi=Math.round(hi*mult);
    let v = lo + (hi-lo)*Math.pow(Math.random(), 1.25);
    if(Math.random()<0.04) v = hi*(1.2+Math.random()*.8); // 上振れレア
    if(Math.random()<0.03) v = lo*0.75; // 下振れレア
    v = Math.max(150, Math.round(v/10)*10);
    const badge = (v>=1000 || v>=hi*1.15 || v<=lo*0.8) ? 'rare' : null;
    return ['年収 約'+v+'万円', badge];
  }
  function chooseInnerEducation(c){
    const role = String(c.role||''), age = Number(c.age)||25, era = Number(c.eraYear)||2026, cat = innerRoleCat(role);
    const F = (v,b)=>[v, b||null];
    if(/防衛大学校/.test(role)) return F('防衛大学校在学中');
    if(/大学院生/.test(role)) return F('大学院在学中（修士課程）');
    if(/大学1年生/.test(role)) return F('大学1年在学中');
    if(/就活中の大学生/.test(role)) return F('大学4年在学中（就活中）');
    if(/大学生/.test(role)) return F('大学在学中（'+rnd(2,3,1)+'年）');
    if(/専門学校生/.test(role)) return F('専門学校在学中');
    if(/浪人生/.test(role)) return F('高卒（浪人中・志望校一本）');
    if(/高校卒業直後/.test(role)) return F('高卒（進路準備中）');
    if(/医師|研修医/.test(role)) return F('大卒（医学部）');
    if(/歯科医師/.test(role)) return F('大卒（歯学部）');
    if(/薬剤師/.test(role)) return F('大卒（薬学部6年制）');
    if(/弁護士/.test(role)) return F('大卒（法学部）＋法科大学院修了');
    if(/公認会計士/.test(role)) return F(pick(['大卒（商学部）','大卒（経済学部）'])) ;
    if(/看護師/.test(role)) return F(pick(['看護専門学校卒','大卒（看護学部）']));
    if(/理学療法士/.test(role)) return F(pick(['専門卒（リハビリ学科）','大卒（理学療法学科）']));
    if(/建築士/.test(role)) return F(pick(['大卒（建築学科）','工業高校卒＋実務で二級から']));
    if(/大学研究員/.test(role)) return F('大学院卒（博士課程）', 'rare');
    if(/パイロット/.test(role)) return F(pick(['大卒＋自社養成パイロット','航空大学校卒']), 'rare');
    if(/教師|教員/.test(role)) return F(pick(['大卒（教育学部）','大卒（教職課程履修）']));
    if(/体育教師/.test(role)) return F('大卒（体育大）');
    let list;
    const oldEra = era <= 1980;
    if(cat==='trade' || cat==='service'){
      list = [['高卒（就職組）',8],['工業高校卒',cat==='trade'?6:1],['商業高校卒',3],['専門学校卒',6],['大卒（私立文系）',3],['高卒（家業の手伝いから）',2],['大学中退',1,'r'],['高校中退から叩き上げ',0.8,'d'],['夜間高校卒（働きながら）',0.7,'r']];
    } else if(oldEra){
      list = [['高卒',9],['中卒（集団就職）',4,'r'],['旧制中学卒',2],['大卒（当時のエリート）',2,'r'],['商業高校卒',3],['工業高校卒',3]];
    } else {
      list = [['大卒（私立文系）',8],['大卒（地方国立大）',6],['大卒（私立理系）',5],['大卒（有名私大）',3],['高卒（就職組）',5],['専門学校卒',4],['大学院卒（修士）',1.5,'r'],['大卒（東大）',0.3,'r'],['大卒（京大）',0.3,'r'],['海外大卒',0.4,'r'],['大学中退',1,'r'],['通信制大学卒（働きながら）',0.7,'r'],['夜間大学卒',0.5,'r'],['大卒（1年留年して5年で卒業）',1.5],['高専卒',1]];
    }
    if(/銀行員|商社勤務|コンサルタント|企画職/.test(role)){
      list = list.filter(x=>!/高卒|高専卒|専門学校卒|中退|夜間高校/.test(x[0]));
      if(/コンサルタント|商社勤務/.test(role)) list = list.map(x=>/有名私大|東大|京大|海外大|大学院/.test(x[0])?[x[0],x[1]*4,x[2]]:x);
    }
    if(age<23) list = list.filter(x=>!/留年して5年|大学院卒/.test(x[0]));
    if(age<21) list = list.filter(x=>!/大卒|大学院|海外大/.test(x[0]));
    if(!list.length) list = [['高卒',1]];
    const it = innerWeighted(list);
    return [it[0], (it[2]==='d'||it[2]==='r') ? 'rare' : null];
  }
  function chooseInnerOrigin(c){
    let list = INNER_ORIGINS.slice();
    if(/医師|歯科/.test(String(c.role||''))) list = list.map(x=>x[0]==='開業医の家系'?[x[0],x[1]*6,x[2]]:x);
    if(/農家/.test(String(c.role||''))) list = list.map(x=>x[0]==='農家の長男'?[x[0],x[1]*8]:x);
    if(/漁師/.test(String(c.role||''))) list = list.map(x=>x[0]==='漁師町の生まれ'?[x[0],x[1]*8]:x);
    if(/僧侶/.test(String(c.role||''))) list = list.map(x=>x[0]==='寺の息子'?[x[0],x[1]*20,'r']:x);
    const it = innerWeighted(list);
    let badge = (it[2]==='d'||it[2]==='r') ? 'rare' : null;
    const inc = String(c.incomeText||'');
    const m = inc.match(/約(\d+)万円/);
    if(m && Number(m[1])>=900 && /生活保護|借金|施設|母子家庭|夜逃げ/.test(it[0])) badge = 'gap';
    return [it[0], badge];
  }
  function chooseInnerComplexBase(c){
    let list = INNER_COMPLEX_GENERIC.slice();
    const h = Number(c.heightRaw || parseInt(c.height,10)) || 172;
    const age = Number(c.age)||25;
    if(h<=167) list.push(['身長が低いこと',9]);
    if(h>=189) list.push(['身長が高すぎて目立つこと',5]);
    if(/ぽっちゃり/.test(String(c.bodyType||''))) list.push(['体型のこと',8]);
    if(/細身/.test(String(c.bodyType||''))) list.push(['ガリガリ体型なこと',6]);
    if(/一重/.test(String(c.eyelid||''))) list.push(['一重の目つきが悪く見られがちなこと',6]);
    if(/後退/.test(String(c.hairline||''))) list.push(['生え際の後退',8,'d']);
    if(/ニキビ/.test(String(c.skinDetail||''))) list.push(['肌荒れ・ニキビ跡',6]);
    if(/老け/.test(String(c.ageAppearance||''))) list.push(['実年齢より老けて見られること',6]);
    if(/童顔|若く/.test(String(c.ageAppearance||''))) list.push(['童顔で貫禄がないこと',5]);
    if(/濃いめ|かなり濃い/.test(String(c.bodyHairOverall||''))) list.push(['毛深いこと',6,'d']);
    if(/薄め|ほぼ無毛/.test(String(c.bodyHairOverall||''))) list.push(['体毛が薄すぎること',3]);
    if(/高卒|中卒/.test(String(c.educationText||'')) && innerRoleCat(c.role)==='office') list.push(['職場で学歴の話になると黙ること',5,'d']);
    const fs = parseFloat(c.footSize); if(fs && fs>=29) list.push(['足がデカくて靴がないこと',4]);
    if(age<=29) {} else { list = list.filter(x=>!/童貞/.test(x[0])); }
    const total = list.reduce((s,x)=>s+x[1],0);
    if(Math.random() < 14/(14+total)) return ['特になし（あるとすれば無頓着なこと）', null];
    const it = innerWeighted(list);
    return [it[0], it[2]==='d' && Math.random()<.6 ? 'rare' : innerBadgeOf(it, 0, list)];
  }
  function chooseInnerBlood(c){
    const dist = INNER_BLOOD_DIST[String(c.nationality||'日本')] || INNER_BLOOD_DIST['日本'];
    const type = weighted([['A型',dist[0]],['O型',dist[1]],['B型',dist[2]],['AB型',dist[3]]]);
    const rhn = Math.random() < INNER_RHNEG(String(c.nationality||'日本'));
    const v = rhn ? type+'（Rh−）' : type;
    const share = type==='A型'?dist[0]:type==='O型'?dist[1]:type==='B型'?dist[2]:dist[3];
    return [v, rhn ? 'rare' : (share<=10 ? 'rare' : null)];
  }
  function innerBadgeHtml(c, key){
    const b = c.innerMeta && c.innerMeta[key];
    if(b==='rare') return ' <span class="inner-badge ib-rare">★レア</span>';
    if(b==='gap') return ' <span class="inner-badge ib-gap">⚡ギャップ</span>';
    return '';
  }
  const INNER_EDIT_POOLS = ()=>({
    innerDream: [...new Set([].concat(INNER_DREAMS.y,INNER_DREAMS.m,INNER_DREAMS.s,INNER_DREAMS.o,INNER_DREAMS.common,...Object.values(INNER_DREAM_CAT)).map(x=>x[0]))],
    innerDesire: INNER_DESIRES.map(x=>x[0]),
    weaknessMind: INNER_WEAK_MIND.map(x=>x[0]),
    weaknessBody: INNER_WEAK_BODY.map(x=>x[0]).concat(['老眼が始まった','尿酸値が気になる','階段で膝が笑う']),
    innerTalent: ['特になし（それが逆に強み…かもしれない）'].concat(INNER_TALENTS.map(x=>x[0])),
    pastUpbringing: INNER_UPBRINGINGS.map(x=>x[0]),
    pastTrauma: ['トラウマ：なし'].concat(INNER_TRAUMAS.map(x=>'少し引きずっている：'+x[0])).concat(INNER_TRAUMAS.map(x=>'はっきりしたトラウマ：'+x[0])),
    pronoun: INNER_PRONOUNS_BASE.map(x=>x[0]),
    incomeText: ['収入なし（仕送り＋バイト月3万円）','バイト代 月5万円','バイト代 月8万円（掛け持ち）','年金 月18万円'].concat([180,220,260,300,340,380,420,460,500,550,600,650,700,800,900,1000,1200,1500,2000,3000].map(v=>'年収 約'+v+'万円')),
    originText: INNER_ORIGINS.map(x=>x[0]),
    educationText: ['高卒（就職組）','工業高校卒','商業高校卒','専門学校卒','高専卒','大卒（私立文系）','大卒（私立理系）','大卒（地方国立大）','大卒（有名私大）','大卒（東大）','大卒（京大）','海外大卒','大学院卒（修士）','大学院卒（博士課程）','大学中退','高校中退から叩き上げ','通信制大学卒（働きながら）','夜間大学卒','大卒（医学部）','大卒（法学部）＋法科大学院修了','大学在学中（2年）','大学4年在学中（就活中）','高卒（浪人中・志望校一本）'],
    complexText: ['特になし（あるとすれば無頓着なこと）'].concat(INNER_COMPLEX_GENERIC.map(x=>x[0])).concat(['身長が低いこと','体型のこと','一重の目つきが悪く見られがちなこと','生え際の後退','実年齢より老けて見られること','童顔で貫禄がないこと','毛深いこと']),
    bloodType: ['A型','O型','B型','AB型','A型（Rh−）','O型（Rh−）','B型（Rh−）','AB型（Rh−）'],
    loveTarget: INNER_LOVE_BASE.map(x=>x[0]).concat(INNER_LOVE_NOTES.slice(0,14).map(n=>'女性（'+n[0]+'）'))
  });

  /* ===== V3.3 内面・背景 拡張（新16項目＋整合エンジン／プロンプトは雑誌ページのみ反映） ===== */
  // --- 既存プールの拡充 ---
  INNER_DESIRES.push(['同窓会で「変わったな」と言われたい',3],['一度でいいから札束で扇がれてみたい',1.5,'d'],['会社の金でいい店に行きたい',2,'d'],['後輩に慕われる先輩でいたい',4],['誰かの初恋の人でありたかった',2],['宝飾時計を衝動買いする自分になりたい',1.2,'d'],['「休みの日は何してるの」に胸を張って答えたい',4],['母親に楽をさせたい',4],['嫌な飲み会を断れる人間になりたい',4],['推しに認知されたい',1.2,'d'],['伝説の社員として語り継がれたい',1.5],['異性からの既読無視に動じない心が欲しい',2.5],['「一生遊んで暮らせる額」の定義を自分で確かめたい',2],['隣の部署のあの人と話すきっかけが欲しい',2.5],['SNSでバズって人生を変えたい',1.8,'d']);
  INNER_WEAK_MIND.push(['電話が苦手（かける前に台本を作る）',4],['行列に並べない',3],['ドタキャンされると一日引きずる',3],['集合時間の30分前に着いてしまう',3.5],['サプライズが下手',3],['値札を見ずに買えない',3.5],['「なんでもいい」と言って後悔する',4],['褒め言葉を素直に受け取れない',3.5],['グループLINEで既読だけつけがち',4],['決めゼリフを噛む',2.5]);
  INNER_WEAK_BODY.push(['正座が5分ももたない',3.5],['まぶしさに弱い',2.5],['エアコンで喉をやられる',3],['辛いものに弱い（翌日まで響く）',3,'d'],['徹夜が完全にできなくなった',4],['声が枯れやすい',2.5],['湿布の匂いが取れない',2,'d'],['乾燥肌',3]);
  INNER_TALENTS.push(['初対面の子どもに懐かれる',2],['宴会の幹事をやらせたら完璧',2],['道を聞かれがち（安心感のある顔）',2.5],['ビュッフェで元を取る戦略眼',2],['駐車が一発で決まる',2],['贈り物選びのセンスがある',2],['落し物をよく見つける',1.5],['スイカを叩いて当てられる',1],['電車で絶妙な位置に立てる',1.5],['アイロンがけがプロ級',1.5]);
  INNER_UPBRINGINGS.push(['習い事をいくつも掛け持ちさせられた',2.5],['野球少年だった（万年補欠）',3],['夏休みの宿題を最終日にやるタイプだった',5],['近所の駄菓子屋に入り浸っていた',3.5],['図書室の常連だった',3],['家の手伝い（店番・農作業）が当たり前だった',2.5],['転勤で方言が混ざった',1.5],['犬と一緒に育った',3]);
  INNER_TRAUMAS.push(['跳び箱で頭から落ちた記憶',2],['発表会で楽器の音が出なかった記憶',2],['遠足のバスでの失敗',1.5,'d'],['プールの飛び込み台',2],['歯医者のドリル音',3]);
  INNER_ORIGINS.push(['クリーニング店の息子',1.2],['祖父が船大工だった家系',0.8],['両親とも教員の家庭',1.5],['自営業（電器店）の家',1.2],['社員寮のある会社町で育つ',1.5],['団地の商店会長の孫',0.5,'r'],['母が民謡の先生',0.5,'r'],['父が転職を繰り返す家庭',1.2,'d']);
  INNER_COMPLEX_GENERIC.push(['爪を噛む癖が抜けないこと',2,'d'],['貧乏ゆすり',2.5],['笑うと歯茎が見えること',2],['声変わりが遅かった記憶',1.5],['クセのある寝癖',2.5],['ネクタイを綺麗に結べないこと',2],['地図アプリなしでは生きられないこと',2.5],['血を見るのが苦手なこと',2],['お化け屋敷が本気で無理なこと',2.5],['カラオケの十八番が古いこと',2.5]);
  INNER_LOVE_NOTES.push(['敬語が可愛い人に弱い',2.5],['食べっぷりのいい人に弱い',3],['方言に弱い',2.5],['年の差は気にしない',2.5],['同じ趣味の人がいい',3.5],['連絡はマメな方',3],['連絡不精で振られがち',2.5,'d'],['理想が高いと言われる',2.5]);

  // --- 新規データプール ---

  function innerParseKanaName(c){
    const raw = nameKana(c) || String(c.name||'');
    const parts = raw.split(/[\s\u3000・]+/).filter(Boolean);
    if(parts.length>=2) return {fam:parts[0], giv:parts[1]};
    return {fam:parts[0]||'', giv:parts[0]||''};
  }
  function chooseInnerHobby(c){
    const list = INNER_HOBBY_GENERIC.concat(INNER_HOBBY_BY_VIBE[c.vibe]||[]);
    const age = Number(c.age)||25; let l = list.slice();
    if(age>=60) l = l.concat([['盆栽',2],['グラウンドゴルフ',1.5],['川柳',1]]);
    const it = innerWeighted(l);
    return [it[0], it[2]==='d'&&Math.random()<.5 ? 'rare' : (it[2]==='r'?'rare':null)];
  }
  function chooseInnerMyBoom(c, hobby){
    const y = Number(c.eraYear)||2026;
    let l = INNER_MYBOOM_COMMON.slice();
    if(y>=2015) l = l.concat(INNER_MYBOOM_MODERN);
    if(y<1995) l = l.concat(INNER_MYBOOM_RETRO);
    for(let i=0;i<4;i++){
      const it = innerWeighted(l);
      if(hobby && (it[0].slice(0,3)===String(hobby).slice(0,3))) continue;
      return [it[0], it[2]==='r' ? 'rare' : null];
    }
    return ['ストレッチ', null];
  }
  function chooseInnerFoods(c){
    const like = innerWeighted(INNER_FOOD_LIKE);
    for(let i=0;i<5;i++){
      const hate = innerWeighted(INNER_FOOD_HATE);
      const key = s=>String(s).replace(/（.*?）/g,'').slice(0,3);
      if(key(hate[0])!==key(like[0])) return [like[0], hate[0], null];
    }
    return [like[0], '特になし（好き嫌いゼロ）', null];
  }
  function chooseInnerHealth(c){
    const age = Number(c.age)||25;
    let l = INNER_HEALTH_BASE.slice();
    if(age>=42) l = l.concat(INNER_HEALTH_MID);
    const it = innerWeighted(l);
    let v = it[0];
    const wb = String(c.weaknessBody||'');
    if(/腰痛/.test(wb) && !/腰/.test(v) && Math.random()<.6) v = 'おおむね良好（ただし腰に爆弾）';
    else if(/胃が弱い/.test(wb) && Math.random()<.5) v = 'おおむね良好（胃だけは正直）';
    else if(/花粉症/.test(wb) && /花粉/.test(v)===false && Math.random()<.4) v = '良好（ただし花粉の季節を除く）';
    return [v, it[2]==='d'&&Math.random()<.5 ? 'rare' : (it[2]==='r'?'rare':null)];
  }
  function chooseInnerMarital(c){
    const age = Number(c.age)||25;
    let list;
    if(age<20) list=[['独身（未婚）',1]];
    else if(age<23) list=[['独身（未婚）',97],['既婚',1.2,'g'],['婚約中',1,'r']];
    else if(age<28) list=[['独身（未婚）',84],['既婚',12],['婚約中',2.5],['離婚歴あり（独身）',1.2,'r']];
    else if(age<33) list=[['独身（未婚）',58],['既婚',34],['婚約中',3],['離婚歴あり（独身）',4],['再婚',1,'r']];
    else if(age<40) list=[['独身（未婚）',41],['既婚',48],['離婚歴あり（独身）',7],['再婚',3],['婚約中',1]];
    else if(age<50) list=[['独身（未婚）',25],['既婚',57],['離婚歴あり（独身）',10],['再婚',6],['婚約中',0.5,'r']];
    else if(age<65) list=[['独身（未婚）',15],['既婚',64],['離婚歴あり（独身）',11],['再婚',8],['死別（独身）',2,'r']];
    else list=[['独身（未婚）',6],['既婚',68],['離婚歴あり（独身）',9],['再婚',8],['死別（独身）',9,'r']];
    const it = innerWeighted(list);
    return [it[0], it[2]==='g' ? 'gap' : (it[2]==='r' ? 'rare' : null)];
  }
  function innerIsMarried(c){ return /既婚|再婚/.test(String(c.maritalText||'')); }
  function chooseInnerLiving(c){
    const age = Number(c.age)||25, cat = innerRoleCat(c.role);
    if(innerIsMarried(c)){ const it = innerWeighted(INNER_LIVING_MARRIED); return [it[0], it[2]==='d' ? 'gap' : (it[2]||null)]; }
    let l = INNER_LIVING_SINGLE.map(x=>x.slice());
    if(cat==='student'){ l = l.map(x=>/実家/.test(x[0])?[x[0],x[1]*1.4]:x).concat([['学生寮',3],['大学近くの学生向けアパートで一人暮らし',6]]); }
    if(age>=38) l = l.map(x=>/実家暮らし/.test(x[0])?[x[0],x[1]*0.55]:x);
    if(/寮/.test(String(c.role||'')) || /自衛官/.test(String(c.role||''))) l = l.concat([['駐屯地の営内班（隊舎住まい）',8]]);
    const it = innerWeighted(l);
    const badge = (age>=40 && /実家暮らし/.test(it[0])) ? 'rare' : (it[2]==='r' ? 'rare' : null);
    return [it[0], badge];
  }
  function chooseInnerFamily(c){
    const age = Number(c.age)||25, org = String(c.originText||''), liv = String(c.livingText||'');
    if(innerIsMarried(c)){
      const wife = '妻';
      const maxKid = Math.max(0, age-23);
      let kids = [];
      if(age>=27 && Math.random()<(age<32?0.45:age<45?0.75:0.85)){
        const n = weighted([[1, age<34?5:4],[2, age<32?2:5],[3,1.2]]);
        let ages=[]; for(let i=0;i<n;i++){ ages.push(rnd(0, Math.min(maxKid, age>=50? age-24 : 14),1)); }
        ages.sort((a,b)=>b-a);
        const lab=['長','次','三'];
        kids = ages.map((a,i)=>`${lab[i]||''}${Math.random()<.5?'男':'女'}（${age>=55&&a>=25?'独立':a+'歳'}）`);
      }
      if(age>=58 && kids.length===0 && Math.random()<.7) return [`${wife}と二人暮らし（子どもは独立）`, null];
      if(/二世帯/.test(liv)) return [`${wife}${kids.length?'・'+kids.join('・'):''}・両親と同居`, null];
      if(/単身赴任/.test(liv)) return [`${wife}${kids.length?'・'+kids.join('・'):''}（家族は地元、本人だけ赴任先）`, 'gap'];
      return [wife + (kids.length? '・'+kids.join('・') : 'と二人暮らし（子なし）'), null];
    }
    // 独身：出自から兄弟構成を復元
    let members;
    if(/一人っ子/.test(org)) members='父・母';
    else if(/次男/.test(org)) members='父・母・兄';
    else if(/三男|末っ子/.test(org)) members='父・母・兄・姉';
    else if(/長男（姉3人）/.test(org)) members='父・母・姉3人';
    else if(/5人兄弟/.test(org)) members='父・母・兄2人・弟・妹';
    else if(/母子家庭/.test(org)) members='母' + (Math.random()<.5?'・妹':'');
    else if(/父子家庭/.test(org)) members='父' + (Math.random()<.5?'・弟':'');
    else if(/祖父母に育てられた/.test(org)) members='祖父・祖母';
    else if(/長男/.test(org)) members='父・母' + pick(['・妹','・弟','・弟・妹','']);
    else members='父・母' + pick(['・兄','・姉','・妹','・弟','','']);
    if(/一人暮らし|寮|社宅|シェア|住み込み|営内/.test(liv)) return [`（同居なし）実家に${members}`, null];
    if(/祖父母の家/.test(liv)) return ['祖父・祖母と同居（実家に'+members.replace(/祖父・祖母/,'父・母')+'）', null];
    return [members + 'と同居', null];
  }
  function innerWareki(y){
    if(y>=2019) return '令和'+(y-2018===1?'元':y-2018)+'年';
    if(y>=1989) return '平成'+(y-1988===1?'元':y-1988)+'年';
    if(y>=1926) return '昭和'+(y-1925===1?'元':y-1925)+'年';
    if(y>=1912) return '大正'+(y-1911===1?'元':y-1911)+'年';
    return '明治'+(y-1867)+'年';
  }
  function innerZodiac(m,d){
    const z=[[1,20,'やぎ座'],[2,19,'みずがめ座'],[3,21,'うお座'],[4,20,'おひつじ座'],[5,21,'おうし座'],[6,22,'ふたご座'],[7,23,'かに座'],[8,23,'しし座'],[9,23,'おとめ座'],[10,24,'てんびん座'],[11,23,'さそり座'],[12,22,'いて座'],[12,32,'やぎ座']];
    for(const [mm,dd,name] of z){ if(m<mm || (m===mm && d<dd)) return name; }
    return 'やぎ座';
  }
  function chooseInnerBirthdate(c){
    const refY = Number(c.eraYear)||2026, age = Number(c.age)||25;
    const by = refY - age;
    const m = rnd(1,12,1);
    const dim = [31, (by%4===0&&(by%100!==0||by%400===0))?29:28,31,30,31,30,31,31,30,31,30,31][m-1];
    const d = rnd(1,dim,1);
    const eto = ['申','酉','戌','亥','子','丑','寅','卯','辰','巳','午','未'][by%12];
    const isJP = !c.nationality || c.nationality==='日本';
    const v = isJP ? `${by}年${m}月${d}日（${innerWareki(by)}・${innerZodiac(m,d)}・${eto}年）` : `${by}年${m}月${d}日（${innerZodiac(m,d)}）`;
    return [v, null];
  }
  function chooseInnerNickname(c){
    const {fam, giv} = innerParseKanaName(c);
    const age = Number(c.age)||25;
    const cands = [['特になし（下の名前か苗字で呼ばれる）',6]];
    if(giv){ cands.push([`「${giv}」（呼び捨て）`,5]); if(age<=32) cands.push([`「${giv}くん」`,3]); if(giv.length<=3) cands.push([`「${giv}っち」`,1.5]); if(giv.length>=2) cands.push([`「${giv.slice(0,2)}ちゃん」`,1.5]); }
    if(fam && fam.length>=2){ cands.push([`「${fam.slice(0,2)}」（苗字の頭）`,3]); cands.push([`「${fam.slice(0,2)}ちゃん」`,2]); }
    if(fam && fam.length>=3) cands.push([`「${fam.slice(0,2)}さん」（後輩から）`,2]);
    if(c.glasses && c.glasses!=='なし') cands.push([`「メガネ」（そのまますぎる）`,1.2,'r']);
    if(/がっちり|筋肉/.test(String(c.bodyType||''))) cands.push([`「ゴリさん」（部活時代の名残）`,1,'r']);
    if(innerRoleCat(c.role)==='student') cands.push([`「先輩」（後輩からはこれで固定）`,1.5]);
    cands.push([`「ハカセ」（何でも知ってるから）`,0.5,'r'],[`「社長」（なぜかそう呼ばれる）`,0.4,'r'],[`「マスター」（行きつけの店で）`,0.5,'r']);
    const clean = cands.filter(x=>x[1]>0);
    const it = innerWeighted(clean);
    return [it[0], it[2]==='r' ? 'rare' : null];
  }
  function innerDialectOf(c){
    const tags = String(c._bpTags||'');
    for(const key of ['kansai','hakata','hiroshima','nagoya','tohoku','okinawa','tosa','kyushu','north']){
      if(tags.includes(key)) return INNER_DIALECTS[key];
    }
    return null;
  }
  function chooseInnerSpeech(c){
    const pr = String(c.pronoun||'');
    const reg = /私|わたくし/.test(pr) ? 'polite' : /俺|オレ|おれ/.test(pr) ? (Math.random()<.35?'mid':'rough') : /自分/.test(pr) ? (Math.random()<.6?'polite':'mid') : 'mid';
    const base = innerWeighted(INNER_SPEECH_REGISTER[reg]);
    const habit = innerWeighted(INNER_SPEECH_HABITS);
    const dia = innerDialectOf(c);
    const natJP = !c.nationality || c.nationality==='日本';
    let parts = [base[0], habit[0]];
    let badge = null;
    if(Math.random()<.45){ const vc = innerWeighted(INNER_SPEECH_VOICE); parts.splice(1, 0, vc[0]); }
    if(Math.random()<.25){ let h2; for(let i=0;i<5;i++){ h2 = innerWeighted(INNER_SPEECH_HABITS); if(h2[0]!==habit[0]) break; } if(h2 && h2[0]!==habit[0]) parts.push(h2[0]); }
    if(natJP && dia && Math.random()<.65){ parts.splice(1, 0, pick(dia[1])); }
    else if(!natJP && Math.random()<.6){ parts.splice(1, 0, pick(['日本語は流暢だが助詞がたまに揺れる','日本語と母語がふとした瞬間に混ざる','敬語を丁寧に使いすぎる外国語話者の癖'])); badge=null; }
    if(/方言/.test(String(c.complexText||'')) && natJP){
      const d2 = dia || INNER_DIALECTS.kansai;
      parts = [base[0], `気を抜くと${d2[0]}が出る（本人は気にしている）`, habit[0]];
    }
    return [parts.join('。'), badge];
  }
  function chooseInnerMemory(c){
    const age = Number(c.age)||25;
    let l = INNER_MEMORY_BASE.map(x=>x.slice());
    const sp = ((c.sportsHistory)||[]).filter(x=>x.strength>0);
    if(sp.length) l.push([`${sp[0].name}の最後の大会（負けた悔しさまで含めて）`,6]);
    if(innerIsMarried(c)) l.push(['結婚式で友人代表が号泣したこと',4],['プロポーズの夜（緊張で声が裏返った）',3.5]);
    if(/長男|長女|次男|次女|三男|三女/.test(String(c.familyText||''))) l.push(['子どもが初めて歩いた日',5]);
    if(/死別/.test(String(c.maritalText||''))) l.push(['妻と最後に行った旅行',5,'r']);
    if(/いじめられた|不登校/.test(String(c.pastUpbringing||''))) l.push(['はじめて味方になってくれた友人の一言',4,'r']);
    if(/荒れていた/.test(String(c.pastUpbringing||''))) l.push(['恩師に胸ぐらを掴まれて泣いた日',3,'r']);
    if(age<24) l = l.filter(x=>!/初任給|売上目標/.test(x[0]));
    if(age>=60) l.push(['初めて自分の給料で買ったテレビ',4],['万博に連れて行ってもらった日',3]);
    const it = innerWeighted(l);
    return [it[0], it[2]==='r' ? 'rare' : null];
  }
  function chooseInnerLover(c){
    const mar = String(c.maritalText||''), lt = String(c.loveTarget||'');
    if(/既婚|再婚/.test(mar)){
      if(Math.random()<0.006) return ['既婚（だが最近、よくない予感のする連絡先が増えた）', 'gap'];
      return ['配偶者（妻）', null];
    }
    if(/婚約中/.test(mar)) return ['婚約者あり（式場を検討中）', null];
    if(/死別/.test(mar)) return ['なし（妻の仏壇に毎朝手を合わせる）', 'rare'];
    if(/興味がない/.test(lt)) return ['なし（そもそも求めていない）', null];
    if(/二次元/.test(lt)) return ['なし（心の恋人は画面の中）', null];
    if(/推し/.test(lt)) return ['なし（推し活が恋愛の代わり）', null];
    const age = Number(c.age)||25;
    const pYes = age<23?0.3:age<30?0.38:age<40?0.33:0.25;
    if(/離婚歴/.test(mar) && Math.random()<0.5) return [pick(['なし（しばらく懲りている）','なし（もう籍は入れないと決めている）','恋人あり（再婚は考え中）']), null];
    if(Math.random()<pYes){ const it = innerWeighted(INNER_LOVER_YES); return [it[0], null]; }
    const it = innerWeighted(INNER_LOVER_NONE);
    return [it[0], null];
  }

  // --- 依存関係グラフ（再抽選時のカスケード） ---
  function innerExpandKeys(keys){
    const out = new Set(keys);
    let grew = true;
    while(grew){
      grew = false;
      for(const k of Array.from(out)){
        for(const d of (INNER_DEPS[k]||[])){ if(!out.has(d)){ out.add(d); grew = true; } }
      }
    }
    return out;
  }
  // --- 完全版 generateInnerProfile（旧定義を上書き・生成順で整合を担保） ---
  function generateInnerProfile(c, keys){
    const all = !keys;
    if(!c.innerMeta) c.innerMeta = {};
    const M = c.innerMeta;
    const set = all ? null : innerExpandKeys(keys);
    const has = k => all || set.has(k);
    if(has('income')){ const r = chooseInnerIncome(c); c.incomeText = r[0]; M.income = r[1]; }
    if(has('education')){ const r = chooseInnerEducation(c); c.educationText = r[0]; M.education = r[1]; }
    if(has('origin')){ const r = chooseInnerOrigin(c); c.originText = r[0]; M.origin = r[1]; }
    if(has('marital')){ const r = chooseInnerMarital(c); c.maritalText = r[0]; M.marital = r[1]; }
    if(has('marital') && typeof syncMarriageRing==='function') syncMarriageRing(c);
    if(has('living')){ const r = chooseInnerLiving(c); c.livingText = r[0]; M.living = r[1]; }
    if(has('birthplace')){ const r = chooseInnerBirthplace(c); c.birthplaceText = r[0]; M.birthplace = r[1]; }
    if(has('family')){ const r = chooseInnerFamily(c); c.familyText = r[0]; M.family = M.family==='gap'||r[1]==='gap' ? 'gap' : r[1]; }
    if(has('residence')){ const r = chooseInnerResidence(c); c.residenceText = r[0]; M.residence = r[1]; }
    if(has('birthdate')){ const r = chooseInnerBirthdate(c); c.birthdateText = r[0]; M.birthdate = r[1]; }
    if(has('pronoun')){ const r = chooseInnerPronoun(c); c.pronoun = r[0]; M.pronoun = r[1]; }
    if(has('principle')){ const r = chooseInnerPrinciple(c); c.principleText = r[0]; M.principle = r[1]; }
    if(has('fashionsense')){ const r = chooseInnerFashionSense(c); c.fashionSenseText = r[0]; M.fashionsense = r[1]; applyFashionSenseFx(c); }
    if(has('dream')){ const r = chooseInnerDream(c); c.innerDream = r[0]; M.dream = r[1]; }
    if(has('desire')){ const r = chooseInnerDesire(c, c.innerDream); c.innerDesire = r[0]; M.desire = r[1]; }
    if(has('weakness')){ const r = chooseInnerWeakness(c); c.weaknessMind = r[0]; c.weaknessBody = r[1]; M.weakness = r[2]; }
    if(has('health')){ const r = chooseInnerHealth(c); c.healthText = r[0]; M.health = r[1]; }
    if(has('talent')){ const r = chooseInnerTalent(c); c.innerTalent = r[0]; M.talent = r[1]; }
    if(has('past')){ const r = chooseInnerPast(c); c.pastUpbringing = r[0]; c.pastTrauma = r[1]; M.past = r[2]; }
    if(has('unforgivable')){ const r = chooseInnerUnforgivable(c); c.unforgivableText = r[0]; M.unforgivable = r[1]; }
    if(has('gamble')){ const r = chooseInnerGamble(c); c.gambleText = r[0]; M.gamble = r[1]; }
    if(has('asset')){ const r = chooseInnerAsset(c); c.assetText = r[0]; M.asset = r[1]; }
    if(has('hobby')){ const r = chooseInnerHobby(c); c.hobbyText = r[0]; M.hobby = r[1]; }
    if(has('myboom')){ const r = chooseInnerMyBoom(c, c.hobbyText); c.myBoomText = r[0]; M.myboom = r[1]; }
    if(has('foods')){ const r = chooseInnerFoods(c); c.foodLikeText = r[0]; c.foodHateText = r[1]; M.foods = r[2]; }
    if(has('nickname')){ const r = chooseInnerNickname(c); c.nicknameText = r[0]; M.nickname = r[1]; }
    if(has('complex')){ const r = chooseInnerComplex(c); c.complexText = r[0]; M.complex = r[1]; }
    if(has('speech')){ const r = chooseInnerSpeech(c); c.speechText = r[0]; M.speech = r[1]; }
    if(has('memory')){ const r = chooseInnerMemory(c); c.memoryText = r[0]; M.memory = r[1]; }
    if(has('blood')){ const r = chooseInnerBlood(c); c.bloodType = r[0]; M.blood = r[1]; }
    if(has('love')){ const r = chooseInnerLove(c); c.loveTarget = r[0]; M.love = r[1]; }
    if(has('lover')){ const r = chooseInnerLover(c); c.loverText = r[0]; M.lover = r[1]; }
    if(has('fuzoku')){ const r = chooseInnerFuzoku(c); c.fuzokuText = r[0]; M.fuzoku = r[1]; }
    if(has('firstexp')){ const r = chooseInnerFirstExp(c); c.firstExpText = r[0]; M.firstexp = r[1]; }
    if(has('lovecount')){ const r = chooseInnerLoveCount(c); c.loveCountText = r[0]; M.lovecount = r[1]; }
    if(has('weekfreq')){ const r = chooseInnerWeekFreq(c); c.weekFreqText = r[0]; M.weekfreq = r[1]; }
    if(has('selffreq')){ const r = chooseInnerSelfFreq(c); c.selfFreqText = r[0]; M.selffreq = r[1]; }
    if(has('drink')){ const r = chooseInnerDrink(c); c.drinkText = r[0]; M.drink = r[1]; }
    if(has('smoke')){ const r = chooseInnerSmoke(c); c.smokeText = r[0]; M.smoke = r[1]; }
    if(has('friend')){ const r = chooseInnerFriend(c); c.friendText = r[0]; M.friend = r[1]; }
    if(all && typeof buildBioHook === 'function'){ c.bioText = buildBioHook(c); }
    return c;
  }
  // --- カテゴリ表示状態（初期はすべて非表示・表示したものだけプロンプト反映） ---
  let innerCatShow = {basic:false, life:false, daily:false, mind:false, past:false, adult:false};
  function innerAnyShown(){ return Object.values(innerCatShow).some(Boolean); }
  // --- 表示セクション（カテゴリ選択式・32項目） ---
  function buildInnerSection(c, L){
    const en = uiLang==='en';
    const V = (val, key)=>`${val||'—'}${innerBadgeHtml(c, key)}`;
    const friendVal = V(c.friendText,'friend') + (c.friendOf ? '' : ` <button class="pf-btn" data-make-friend title="${en?'Create this friend for real':'この友人を実際に作成（表示された関係・名前を反映）'}">👥 ${en?'Create this friend':'この友人を作成'}</button>`);
    const CAT_ROWS = {
      basic: [
        [en?'Birth Date':'生年月日', V(c.birthdateText,'birthdate'), 'birthdateText','icv-basic'],
        [en?'Hometown':'出身地', V(c.birthplaceText,'birthplace'), 'birthplaceText','icv-basic'],
        [en?'Blood Type':'血液型', V(c.bloodType,'blood'), 'bloodType','icv-basic'],
        [en?'Pronoun':'一人称', V(c.pronoun,'pronoun'), 'pronoun','icv-basic'],
        [en?'Speech Style':'口調・話し方', V(c.speechText,'speech'), 'speechText','icv-basic'],
        [en?'Nickname':'ニックネーム', V(c.nicknameText,'nickname'), 'nicknameText','icv-basic']
      ],
      life: [
        [en?'Marital Status':'結婚', V(c.maritalText,'marital'), 'maritalText','icv-life'],
        [en?'Partner':'恋人の有無', V(c.loverText,'lover'), 'loverText','icv-life'],
        [en?'Family':'家族構成', V(c.familyText,'family'), 'familyText','icv-life'],
        [en?'Living Situation':'生活状況', V(c.livingText,'living'), 'livingText','icv-life'],
        [en?'Residence':'住居', V(c.residenceText,'residence'), 'residenceText','icv-life'],
        [en?'Family Roots':'出自', V(c.originText,'origin'), 'originText','icv-life'],
        [en?'Education':'学歴', V(c.educationText,'education'), 'educationText','icv-life'],
        [en?'Income':'収入', V(c.incomeText,'income'), 'incomeText','icv-life'],
        [en?'Assets':'資産', V(c.assetText,'asset'), 'assetText','icv-life']
      ],
      daily: [
        [en?'Health':'健康状態', V(c.healthText,'health'), 'healthText','icv-daily'],
        [en?'Hobby':'趣味', V(c.hobbyText,'hobby'), 'hobbyText','icv-daily'],
        [en?'Current Obsession':'マイブーム', V(c.myBoomText,'myboom'), 'myBoomText','icv-daily'],
        [en?'Favorite Food':'好きな食べ物', V(c.foodLikeText,'foods'), 'foodLikeText','icv-daily'],
        [en?'Disliked Food':'嫌いな食べ物', V(c.foodHateText,'foods'), 'foodHateText','icv-daily']
      ],
      mind: [
        [en?'Guiding Principle':'行動原理', V(c.principleText,'principle'), 'principleText','icv-mind'],
        [en?'Fashion Policy':'コーデ基準', V(c.fashionSenseText,'fashionsense'), 'fashionSenseText','icv-mind'],
        [en?'Public Dream':'表向きの夢', V(c.innerDream,'dream'), 'innerDream','icv-mind'],
        [en?'Hidden Desire':'欲望（本音）', V(c.innerDesire,'desire'), 'innerDesire','icv-mind'],
        [en?'Weakness (Mind / Body)':'弱点（性格 / 身体）', V(`${c.weaknessMind||'—'}／${c.weaknessBody||'—'}`,'weakness'), 'weaknessMind,weaknessBody','icv-mind'],
        [en?'Talent':'秀でた才能', V(c.innerTalent,'talent'), 'innerTalent','icv-mind'],
        [en?'Complex':'コンプレックス', V(c.complexText,'complex'), 'complexText','icv-mind'],
        [en?'Unforgivable':'許せないこと', V(c.unforgivableText,'unforgivable'), 'unforgivableText','icv-mind']
      ],
      past: [
        [en?'Past / Trauma':'過去（生い立ち / トラウマ）', V(`${c.pastUpbringing||'—'}<br>${c.pastTrauma||'トラウマ：なし'}`,'past'), 'pastUpbringing,pastTrauma','icv-past'],
        [en?'Treasured Memory':'思い出の出来事', V(c.memoryText,'memory'), 'memoryText','icv-past'],
        [en?'Close Friend':'仲の良い友人', friendVal, 'friendText','icv-past'],
        [en?'Romantic Interest':'恋愛対象', V(c.loveTarget,'love'), 'loveTarget','icv-past'],
        [en?'Past Relationships':'恋愛経験人数', V(c.loveCountText,'lovecount'), 'loveCountText','icv-past']
      ],
      adult: [
        [en?'Drinking':'飲酒', V(c.drinkText,'drink'), 'drinkText','icv-adult'],
        [en?'Smoking':'喫煙', V(c.smokeText,'smoke'), 'smokeText','icv-adult'],
        [en?'Gambling History':'ギャンブル歴', V(c.gambleText,'gamble'), 'gambleText','icv-adult'],
        [en?'Adult-Venue Experience':'風俗経験', V(c.fuzokuText,'fuzoku'), 'fuzokuText','icv-adult'],
        [en?'First Experience':'初めての体験', V(c.firstExpText,'firstexp'), 'firstExpText','icv-adult'],
        [en?'Weekly Pace (Partner)':'週頻度（相手あり）', V(c.weekFreqText,'weekfreq'), 'weekFreqText','icv-adult'],
        [en?'Weekly Pace (Solo)':'週頻度（セルフ）', V(c.selfFreqText,'selffreq'), 'selfFreqText','icv-adult']
      ]
    };
    const allOn = INNER_CATS.every(([k])=>innerCatShow[k]);
    const ctrl = `<div class="inner-ctrl">`
      + `<button class="pf-btn inner-allbtn" data-icat-all="${allOn?'0':'1'}">${allOn ? (en?'Hide all':'すべて隠す') : (en?'Show all':'すべて表示')}</button>`
      + INNER_CATS.map(([k,ja,enT,cls])=>`<button class="icat-chip ${cls}${innerCatShow[k]?' on':''}" data-icat="${k}">${en?enT:ja}</button>`).join('')
      + `</div>`;
    const rows = [['__HEAD__', ctrl]];
    let shown = 0;
    for(const [k,ja,enT,cls] of INNER_CATS){
      if(!innerCatShow[k]) continue;
      shown++;
      rows.push(['__HEAD__', `<div class="inner-cat ${cls}">${en?enT:ja}</div>`]);
      rows.push(...CAT_ROWS[k]);
    }
    if(!shown) rows.push(['__HEAD__', `<p class="notice" style="margin:8px 0 2px">${en?'Nothing is shown yet. Tap the category chips above to reveal items — only the shown categories are reflected in the magazine-page / profile-sheet prompts.':'まだ何も表示されていません。上のカテゴリボタンを押すと項目が表示されます。表示したカテゴリだけが雑誌ページ／プロフィールシートの指示文に反映されます。'}</p>`]);
    return ['inner', en ? 'Inner / Background (only shown categories go into magazine & profile-sheet prompts)' : '内面・背景（表示中のカテゴリのみ雑誌ページ／プロフィールシートに反映）', rows];
  }
  // --- ✎編集用プール（新項目） ---
  function INNER_EDIT_POOLS2(){
    const c = (typeof current!=='undefined' && current) ? current : {};
    const refY = Number(c.eraYear)||2026, age = Number(c.age)||25, by = refY-age;
    const dates = [];
    for(let m=1;m<=12;m++){ for(const d of [4,17]){ dates.push(`${by}年${m}月${d}日（${(!c.nationality||c.nationality==='日本') ? innerWareki(by)+'・' : ''}${innerZodiac(m,d)}${(!c.nationality||c.nationality==='日本') ? '・'+['申','酉','戌','亥','子','丑','寅','卯','辰','巳','午','未'][by%12]+'年' : ''}）`); } }
    const jpPlaces = [];
    INNER_JP_PREFS.forEach(p=>p[1].forEach(m=>jpPlaces.push(p[0]+'：'+m)));
    const natCities = [];
    Object.entries(INNER_NATION_CITIES).forEach(([n,cs])=>cs.slice(0,2).forEach(city=>natCities.push(n+'・'+city+'出身')));
    return {
      hobbyText: [...new Set(INNER_HOBBY_GENERIC.map(x=>x[0]).concat(...Object.values(INNER_HOBBY_BY_VIBE).map(l=>l.map(x=>x[0]))))],
      myBoomText: [...new Set(INNER_MYBOOM_COMMON.concat(INNER_MYBOOM_MODERN, INNER_MYBOOM_RETRO).map(x=>x[0]))],
      foodLikeText: INNER_FOOD_LIKE.map(x=>x[0]),
      foodHateText: INNER_FOOD_HATE.map(x=>x[0]),
      healthText: [...new Set(INNER_HEALTH_BASE.concat(INNER_HEALTH_MID).map(x=>x[0]).concat(['おおむね良好（ただし腰に爆弾）','おおむね良好（胃だけは正直）']))],
      maritalText: ['独身（未婚）','既婚','婚約中','離婚歴あり（独身）','再婚','死別（独身）'],
      livingText: [...new Set(INNER_LIVING_SINGLE.concat(INNER_LIVING_MARRIED).map(x=>x[0]).concat(['学生寮','大学近くの学生向けアパートで一人暮らし','駐屯地の営内班（隊舎住まい）']))],
      familyText: ['父・母と同居','父・母・妹と同居','父・母・兄と同居','（同居なし）実家に父・母','（同居なし）実家に父・母・弟','（同居なし）実家に母','妻と二人暮らし（子なし）','妻・長男（3歳）','妻・長女（5歳）・次男（2歳）','妻・子どもは独立（孫あり）','祖父・祖母と同居','母・妹と同居'],
      birthplaceText: jpPlaces.concat(natCities),
      birthdateText: dates,
      nicknameText: (()=>{ const arr=[]; for(let i=0;i<12;i++){ arr.push(chooseInnerNickname(c)[0]); } return [...new Set(['特になし（下の名前か苗字で呼ばれる）'].concat(arr))]; })(),
      speechText: (()=>{ const arr=[]; for(let i=0;i<14;i++){ arr.push(chooseInnerSpeech(c)[0]); } return [...new Set(arr)]; })(),
      memoryText: [...new Set(INNER_MEMORY_BASE.map(x=>x[0]).concat(['結婚式で友人代表が号泣したこと','子どもが初めて歩いた日']))],
      principleText: INNER_PRINCIPLES.map(x=>x[0]),
      fashionSenseText: INNER_FASHION_SENSE.map(x=>x[0]),
      unforgivableText: INNER_UNFORGIVABLES.map(x=>x[0]),
      fuzokuText: ['なし','なし（機会がない）','なし（興味がない）','なし（お金がもったいない）','なし（対象外）','誘われて断った','付き合いで1回だけ','若い頃に数回','たまに行く','行きつけがある','卒業した（昔は通った）','ノーコメント（察してほしい）'],
      gambleText: ['なし（興味なし）','宝くじを年末だけ','競馬をレジャー程度','パチンコ経験あり（今はしない）','学生時代に雀荘へ通った','パチスロに熱かった時期がある','現役でパチンコ通い','競艇・競輪もたしなむ','株・FXで手痛い授業料を払った','借金を作って足を洗った','麻雀は打てるが賭けない主義','ソシャゲのガチャが実質ギャンブルだと気づいている'],
      firstExpText: ['二十歳前後','大学時代','社会人1年目','20代半ば','20代後半','成人してすぐ','30代（遅咲き）','まだない','まだない（興味もない）','ノーコメント（言わぬが花）','忘れたことにしている','秘密（大人になってから話すやつ）'],
      weekFreqText: ['夫婦円満ペース（月数回）','週1をキープ','最近はご無沙汰気味','レス気味だが仲は良い','記念日限定','聞くな（察してほしい）','週1〜2（会える日次第）','週末集中型','遠距離につき月イチ','まだそういう関係ではない','なし（相手がいない）','ゼロ更新中（記録継続）','たまに（アプリで会う人と）','気の置けない友人がいる（察してほしい）','ご縁があれば（現在は素振りのみ）','なし（そもそも求めていない）','もう数えていない（安らか）','ノーコメント'],
      selfFreqText: ['週2〜3（本人談）','週1','ほぼ毎日（若さ）','月数回（省エネ）','賢者モード長期継続中','ノーカウント主義','週1（内緒）','月数回（こっそり）','ほぼ卒業した','会えない週の補完程度','恋人に誓って控えめ','ほぼなし（性欲も控えめ）','月数回（健康維持）','もう数えていない（安らか）'],
      drinkText: ['飲まない（下戸）','飲まない（あえて）','付き合い程度','週末だけ','晩酌が日課（ビール1本）','晩酌が日課（ハイボール派）','ザル（記憶は残るタイプ）','ザル（記憶が飛ぶタイプ）','休肝日を週2で死守','禁酒中（今週から）','家では飲まない主義','クラフトビール沼','日本酒をゆっくり派','ノンアル愛好家'],
      smokeText: ['吸わない','吸わない（匂いも苦手）','元喫煙者（禁煙5年目）','元喫煙者（禁煙成功・今は匂いに敏感）','加熱式タバコ','紙巻き1日数本','紙巻き1日一箱','たまにもらいタバコ','飲んだ時だけ吸う','減煙中（1日数本まで来た）','葉巻をごくたまに（気取り）'],
      loveCountText: ['0人','0人（そもそも求めていない）','1人','1人（妻ひと筋）','1人（手をつないで終わった清い交際）','2人','3人','片手で足りる','5〜6人','10人前後','二桁（途中で数えるのをやめた）','ノーカウント主義'],
      assetText: (()=>{ const arr=[]; for(let i=0;i<14;i++){ arr.push(chooseInnerAsset({age:c.age, role:c.role, eraYear:c.eraYear, incomeText:c.incomeText, gambleText:c.gambleText, innerDesire:c.innerDesire, livingText:c.livingText, educationText:c.educationText, mbti:c.mbti})[0]); } return [...new Set(['貯金ほぼゼロ（宵越しの銭は持たない）'].concat(arr))]; })(),
      friendText: (()=>{ const arr=[]; for(let i=0;i<14;i++){ arr.push(chooseInnerFriend({age:c.age, nationality:c.nationality, eraYear:c.eraYear})[0]); } return [...new Set(arr)]; })(),
      loverText: [...new Set(INNER_LOVER_NONE.concat(INNER_LOVER_YES).map(x=>x[0]).concat(['配偶者（妻）','婚約者あり（式場を検討中）']))],
      residenceText: ['実家（出身地）','都市部・駅徒歩12分の1K','都市部・築古だが広めの1DK','職場まで自転車15分のアパート','都心の1LDK（少し背伸び）','郊外の2LDK（賃貸）','駅徒歩15分の3LDK（ローン返済中）','地元の市内アパート（地元勤務）','地方都市の1LDK（家賃に余裕）','海の見える町のアパート','赴任先のワンルーム（家具は最小限）','職場まで徒歩圏の寮・社宅']
    };
  }
  // --- 雑誌ページ専用：内面・背景の全反映ブロック ---
  function innerMagazineBlock(c, english=false){
    if(!c.bloodType) generateInnerProfile(c);
    if(!innerAnyShown()) return '';
    const S = innerCatShow;
    const bp = String(c.birthplaceText||'').replace('：','');
    if(english){
      const parts = [];
      if(S.basic || S.life){
        const profBits = [];
        if(S.basic){ profBits.push(`birth date ${c.birthdateText||''}`, `blood type ${c.bloodType||''}`, `hometown ${bp}`); }
        if(S.life){ profBits.push(`family ${c.familyText||''} (${c.maritalText||''})`, `living: ${c.livingText||''} / ${c.residenceText||''}`, `education ${c.educationText||''}`, `savings note ${c.assetText||''}`); }
        parts.push(` Extend the profile box with: ${profBits.join(', ')}.`);
      }
      if(S.daily || S.mind){
        const pd = [];
        if(S.daily){ pd.push(`hobby ${c.hobbyText||''}`, `current obsession ${c.myBoomText||''}`, `favorite food ${c.foodLikeText||''}`, `disliked food ${c.foodHateText||''}`, `health ${c.healthText||''}`); }
        if(S.mind){ pd.push(`motto-level dream "${c.innerDream||''}"`, `special talent ${c.innerTalent||''}`); }
        parts.push(` Add a "personal data" sidebar: ${pd.join('; ')}.`);
      }
      if(S.basic || S.past || S.life){
        const iv = [];
        if(S.basic){ iv.push(`first-person pronoun ${c.pronoun||''}`, `speech style ${c.speechText||''}`, `nickname ${c.nicknameText||''}`); }
        if(S.past){ iv.push(`treasured memory ${c.memoryText||''}`, `romantic interest ${c.loveTarget||''}`, `relationship history ${c.loveCountText||''}`); }
        if(S.life){ iv.push(`partner status ${c.loverText||''}`); }
        parts.push(` In the interview, answer in HIS voice using: ${iv.join(', ')}.`);
      }
      if(S.past) parts.push(` Add a tiny "friend's comment" box quoting his close friend (${c.friendText||''}) in one warm line.`);
      if(S.mind || S.past || S.adult){
        const col = [];
        if(S.mind){ col.push(`guiding principle (${c.principleText||''})`, `pet peeve (${c.unforgivableText||''})`, `weakness (${c.weaknessMind||''} / ${c.weaknessBody||''})`, `complex (${c.complexText||''})`); }
        if(S.past){ col.push(`upbringing (${c.pastUpbringing||''})`); }
        const sub = [];
        if(S.mind) sub.push(`his hidden desire (${c.innerDesire||''})`);
        if(S.adult) sub.push(`adult-venue history (${c.fuzokuText||'none'}), first experience (${c.firstExpText||''}), weekly pace with partner (${c.weekFreqText||''}), solo pace (${c.selfFreqText||''}), drinking (${c.drinkText||''}), smoking (${c.smokeText||''}) and gambling history (${c.gambleText||'none'})`);
        if(S.past && c.pastTrauma && c.pastTrauma!=='トラウマ：なし') sub.push(`past (${c.pastTrauma})`);
        parts.push(` Add a small self-deprecating column touching lightly on ${col.join(', ')}${sub.length ? ` and — only as subtle subtext, never explicit — ${sub.join(', ')}` : ''}.`);
      }
      parts.push(' Keep everything tasteful, humane and non-sexual; soften anything raw into magazine-safe wording.');
      return parts.join('');
    }
    const parts = [];
    if(S.basic || S.life){
      const profBits = [];
      if(S.basic){ profBits.push(`生年月日${c.birthdateText||''}`, `血液型${c.bloodType||''}`, `出身地${bp}`); }
      if(S.life){ profBits.push(`家族構成「${c.familyText||''}」（${c.maritalText||''}）`, `現在の暮らし「${c.livingText||''}・${c.residenceText||''}」`, `学歴「${c.educationText||''}」`, `ふところ事情「${c.assetText||''}」`); }
      parts.push(`プロフィール欄は次で拡張する：${profBits.join('／')}。`);
    }
    if(S.daily || S.mind){
      const pd = [];
      if(S.daily){ pd.push(`趣味「${c.hobbyText||''}」`, `マイブーム「${c.myBoomText||''}」`, `好物「${c.foodLikeText||''}」`, `苦手「${c.foodHateText||''}」`, `健康状態「${c.healthText||''}」`); }
      if(S.mind){ pd.push(`将来の夢「${c.innerDream||''}」`, `秀でた特技「${c.innerTalent||''}」`, `コーデ基準「${c.fashionSenseText||''}」`); }
      parts.push(`パーソナルデータ欄も設ける：${pd.join('、')}。`);
    }
    if(S.basic || S.past || S.life){
      const iv = [];
      if(S.basic){ iv.push(`一人称は「${c.pronoun||''}」、口調は「${c.speechText||''}」、あだ名は${c.nicknameText||''}`); }
      if(S.past){ iv.push(`話題には思い出「${c.memoryText||''}」、恋愛観（恋愛対象：${c.loveTarget||''}／恋愛遍歴：${c.loveCountText||''}${S.life ? `／現在：${c.loverText||''}` : ''}）を織り込む`); }
      else if(S.life){ iv.push(`話題には現在の恋愛事情（${c.loverText||''}）を軽く織り込む`); }
      parts.push(`インタビューの回答は本人の声で書く：${iv.join('。')}。`);
    }
    if(S.past) parts.push(`小さな「友人からのひとこと」欄を作り、仲の良い友人（${(c.friendText||'').replace(/〔.*?〕/,'')}）からの温かい一言を載せる。`);
    if(S.mind || S.past || S.adult){
      const col = [];
      if(S.mind){ col.push(`行動原理「${c.principleText||''}」と許せないこと「${c.unforgivableText||''}」`, `弱点（${c.weaknessMind||''}／${c.weaknessBody||''}）やコンプレックス（${c.complexText||''}）`); }
      if(S.past){ col.push(`生い立ち（${c.pastUpbringing||''}）`); }
      const sub = [];
      if(S.mind) sub.push(`本音の欲望（${c.innerDesire||''}）`);
      if(S.adult) sub.push(`夜の顔（飲酒：${c.drinkText||''}／喫煙：${c.smokeText||''}／ギャンブル歴：${c.gambleText||'なし'}／風俗経験：${c.fuzokuText||'なし'}／初めての体験：${c.firstExpText||''}／週頻度：相手あり ${c.weekFreqText||''}・セルフ ${c.selfFreqText||''}）`);
      if(S.past && c.pastTrauma && c.pastTrauma!=='トラウマ：なし') sub.push(`過去（${c.pastTrauma}）`);
      parts.push(`自虐まじりの小コラムでは${col.join('、')}に軽く触れ${sub.length ? `、${sub.join('や')}は誌面に直接書かず行間の匂わせ程度にとどめる` : 'る'}。`);
    }
    parts.push('生々しい項目は雑誌的に品よく言い換え、人柄が愛おしく伝わる誌面にする。');
    return parts.join('');
  }
  /* ===== V3.4 内面・背景 追加項目＋整合強化＋UI刷新 ===== */
  // --- 行動原理 ---
  // --- 許せないこと ---
  // --- 風俗経験 ---
  function chooseInnerFuzoku(c){
    const age = Number(c.age)||25;
    if(age<20) return ['なし', null];
    const lt = String(c.loveTarget||'');
    const married = /既婚|再婚/.test(String(c.maritalText||''));
    let list;
    if(/男性$|^男性/.test(lt.split('（')[0]) ) list = [['なし（対象外）',8],['なし',3],['ノーコメント',1,'d']];
    else if(/興味がない/.test(lt)) list = [['なし（興味がない）',8],['誘われて断った',2],['付き合いで1回だけ',1,'d']];
    else list = [['なし（機会がない）',22],['なし（興味がない）',18],['なし（お金がもったいない）',8],['誘われて断った',8],['付き合いで1回だけ',12,'d'],['若い頃に数回',8,'d'],['たまに行く',4,'d'],['行きつけがある',1.5,'d'],['卒業した（昔は通った）',4,'d'],['ノーコメント（察してほしい）',3,'d']];
    if(age<24) list = list.filter(x=>!/若い頃|卒業した/.test(x[0]));
    const it = innerWeighted(list);
    let badge = null;
    if(it[2]==='d'){ badge = married && /たまに行く|行きつけ/.test(it[0]) ? 'gap' : (Math.random()<.5 ? 'rare' : null); }
    return [it[0], badge];
  }
  // --- ギャンブル歴 ---
  function chooseInnerGamble(c){
    const age = Number(c.age)||25, y = Number(c.eraYear)||2026;
    if(age<20){
      const it = innerWeighted([['なし（興味なし）',8],['なし（年齢的にまだ）',4],['友人の家の麻雀くらい',1.5]]);
      return [it[0], null];
    }
    let list = [['なし（興味なし）',20],['宝くじを年末だけ',10],['競馬をレジャー程度',6],['パチンコ経験あり（今はしない）',6],['学生時代に雀荘へ通った',3],['パチスロに熱かった時期がある',3,'d'],['現役でパチンコ通い',2,'d'],['競艇・競輪もたしなむ',1.5,'d'],['株・FXで手痛い授業料を払った',2,'d'],['借金を作って足を洗った',0.8,'d'],['麻雀は打てるが賭けない主義',3]];
    if(y>=2013) list.push(['ソシャゲのガチャが実質ギャンブルだと気づいている',4,'d']);
    const wm = String(c.weaknessMind||''), ds = String(c.innerDesire||'');
    if(/ギャンブル/.test(wm) || /ギャンブルで一発/.test(ds)){
      list = list.map(x=>/現役|熱かった|競艇|借金/.test(x[0])?[x[0],x[1]*5,x[2]]:(/なし/.test(x[0])?[x[0],x[1]*0.15]:x));
    }
    const it = innerWeighted(list);
    return [it[0], it[2]==='d' ? (/借金/.test(it[0])?'rare':(Math.random()<.5?'rare':null)) : null];
  }
  // --- 初めての体験（成人後表現のみ・具体描写なし） ---
  function chooseInnerFirstExp(c){
    const age = Number(c.age)||25;
    if(age<20) return [/興味がない/.test(String(c.loveTarget||'')) ? 'まだない（興味もない）' : pick(['まだない','秘密（大人になってから話すやつ）']), null];
    let list = [['二十歳前後',7],['大学時代',6],['社会人1年目',4],['20代半ば',4],['20代後半',2.5],['成人してすぐ',3],['ノーコメント（言わぬが花）',3,'d'],['忘れたことにしている',1.5,'d']];
    if(age>=27) list.push(['30代（遅咲き）',age>=32?2:0.8]);
    const married = /既婚|再婚/.test(String(c.maritalText||''));
    if(/興味がない/.test(String(c.loveTarget||''))) list = married ? [['ノーコメント（家庭の事情）',5],['二十歳前後',2]] : [['まだない（興味もない）',6],['ノーコメント',2]];
    else if(!married){ const still = age>=25 ? [['まだない',age>=30?1.2:2,'r']] : [['まだない',4]]; list = list.concat(still); }
    const it = innerWeighted(list);
    let badge = it[2]==='r' ? 'rare' : (it[2]==='d'&&Math.random()<.5 ? 'rare' : null);
    let v = it[0];
    if(!/まだない|ノーコメント|忘れた/.test(v)){
      const lt2 = String(c.loveTarget||'');
      let partners = ['当時の恋人','同い年の恋人','年上の人','お互い初めて同士'];
      if(/^女性|どちらも/.test(lt2)) partners = partners.concat(['当時の彼女','初カノ','バイト先で出会った年上の彼女']);
      if(/^男性/.test(lt2)) partners = ['当時の恋人','年上の人','学生時代からの恋人','お互い初めて同士'];
      if(/社会人|20代半ば|20代後半|30代/.test(v)){
        partners.push('職場で出会った人','合コンで知り合った人');
        if((Number(c.eraYear)||2026)>=2016) partners.push('マッチングアプリで出会った人');
      }
      if(married && /二十歳前後|大学時代|社会人1年目|成人してすぐ/.test(v) && Math.random()<0.35) partners = ['のちに妻になる人'];
      let places = ['相手の部屋','自分の部屋','旅行先の宿'];
      if(/大学時代/.test(v)) places = ['相手の下宿','自分のワンルーム','ゼミ旅行先の宿'];
      if(/二十歳前後|成人してすぐ/.test(v)) places.push('実家（家族の留守中）');
      if(/社会人|20代|30代/.test(v)) places.push('ホテル');
      let place = pick(places);
      if(Math.random()<0.05){ place = pick(['車の中','漫画喫茶の個室']); if(!badge) badge='rare'; }
      v = `${v}（相手は${pick(partners)}・場所は${place}）`;
    }
    return [v, badge];
  }
  // --- 週頻度・相手あり（婉曲・自己申告テイスト） ---
  function chooseInnerWeekFreq(c){
    const age = Number(c.age)||25;
    const married = /既婚|再婚/.test(String(c.maritalText||''));
    const hasLover = /^恋人あり|婚約者あり/.test(String(c.loverText||''));
    const noInterest = /興味がない/.test(String(c.loveTarget||''));
    let list;
    if(married) list = [['夫婦円満ペース（月数回）',5],['週1をキープ',3],['最近はご無沙汰気味',4,'d'],['レス気味だが仲は良い',2.5,'d'],['記念日限定',2],['聞くな（察してほしい）',2,'d'],['アプリを覗くだけ覗いている',0.5,'g'],['気の置けない友人がいる（察してほしい）',0.3,'g']];
    else if(hasLover) list = [['週1〜2（会える日次第）',5],['週末集中型',4],['遠距離につき月イチ',1.5],['まだそういう関係ではない',1.5],['ノーコメント',2,'d']];
    else if(noInterest) list = [['なし（そもそも求めていない）',8],['なし',3]];
    else list = [['なし（相手がいない）',7],['ゼロ更新中（記録継続）',3,'d'],['たまに（アプリで会う人と）',1.5,'d'],['気の置けない友人がいる（察してほしい）',1,'d'],['ご縁があれば（現在は素振りのみ）',2]];
    if(age>=55) list = list.map(x=>/週1〜2|週末集中/.test(x[0])?[x[0],x[1]*0.4,x[2]]:x).concat(married?[['もう数えていない（安らか）',3]]:[]);
    const it = innerWeighted(list);
    return [it[0], it[2]==='g' ? 'gap' : (it[2]==='d'&&Math.random()<.4 ? 'rare' : null)];
  }
  // --- 週頻度・セルフ（婉曲） ---
  function chooseInnerSelfFreq(c){
    const age = Number(c.age)||25;
    const married = /既婚|再婚/.test(String(c.maritalText||''));
    const hasLover = /^恋人あり|婚約者あり/.test(String(c.loverText||''));
    const noInterest = /興味がない/.test(String(c.loveTarget||''));
    let list = [['週2〜3（本人談）',5,'d'],['週1',4],['ほぼ毎日（若さ）',age<=27?3:0.6,'d'],['月数回（省エネ）',3],['賢者モード長期継続中',2],['ノーカウント主義',2,'d']];
    if(married) list = [['週1（内緒）',4,'d'],['月数回（こっそり）',4],['ほぼ卒業した',3],['ノーカウント主義',2,'d'],['風呂掃除当番の日だけ…いや何でもない',1,'d']];
    else if(hasLover) list = [['会えない週の補完程度',5],['週1',3],['月数回',3],['恋人に誓って控えめ',2],['ノーコメント',1.5,'d']];
    if(noInterest) list = [['ほぼなし（性欲も控えめ）',5],['月数回（健康維持）',3],['ノーカウント主義',1.5,'d']];
    if(age>=55) list = list.map(x=>/ほぼ毎日|週2〜3/.test(x[0])?[x[0],x[1]*0.25,x[2]]:x).concat([['もう数えていない（安らか）',3]]);
    const it = innerWeighted(list);
    let v = it[0];
    let badge = it[2]==='d'&&Math.random()<.35 ? 'rare' : null;
    // タイミングと場所（住居・職業と整合）
    if(!/ほぼ卒業|ほぼなし|賢者モード|もう数えていない/.test(v)){
      const liv = String(c.livingText||''), res = String(c.residenceText||''), role = String(c.role||'');
      const y = Number(c.eraYear)||2026;
      const tanshin = /単身赴任/.test(liv);
      const dorm = /相部屋|営内|隊舎/.test(liv+res);
      const sumikomi = /住み込み/.test(liv);
      const jikka = /実家暮らし|祖父母の家/.test(liv);
      const cohab = married && !tanshin;
      const share = /ルームシェア/.test(liv);
      let timings = [['寝る前',5],['風呂上がり',3],['休日の昼下がり',2.5],['深夜',3]];
      let places;
      if(dorm) { places = [['風呂の個室（相部屋ゆえ）',4],['消灯後の布団の中（無音の攻防）',3],['トイレの個室',2.5]]; timings = [['消灯後',5],['皆が出払った隙',3],['外泊時にまとめて',2]]; }
      else if(sumikomi) { places = [['店の上の自室（音量に細心の注意）',5],['風呂場',3]]; }
      else if(jikka) { places = [['深夜の自室（音に気を使う）',5],['風呂場',3.5],['家族の外出中の自室',3]]; timings = [['深夜、家族が寝静まってから',5],['家に誰もいない隙に',3.5],['風呂のついでに',3]]; }
      else if(cohab) { places = [['風呂場',4],['書斎（家族に内緒）',2.5],['トイレ（安住の地）',3],['自室（妻の外出中）',3]]; timings = [['妻の外出中',4],['深夜、家族が寝静まってから',4],['早朝、誰よりも早く起きて',1.5]]; }
      else if(share) { places = [['自室（鍵を確認してから）',5],['風呂場',3]]; }
      else { places = [['自室（誰にも気兼ねなく）',5],['ベッドでだらだらと',3.5],['風呂場',2.5]]; }
      if(/看護師|警備員|消防士|自衛官|工場|夜勤/.test(role)) timings.push(['夜勤明けの朝',4]);
      if(/トラック|長距離/.test(role)) timings.push(['長距離明け',4]);
      if(/営業|商社|コンサルタント/.test(role) && !dorm) { places.push(['出張先のビジネスホテル',2]); timings.push(['出張の夜',2]); }
      if(y>=2020 && /IT|エンジニア|Web|デザイナー|企画/.test(role) && !dorm && !jikka){ timings.push(['テレワークの昼休み（背徳）',0.8,'d']); }
      const t = innerWeighted(timings), p = innerWeighted(places);
      if(t[2]==='d' && !badge) badge = 'rare';
      v = `${v}（タイミング：${t[0]}／場所：${p[0]}）`;
    }
    return [v, badge];
  }
  // --- 恋愛経験人数（付き合った人数・人物像連動） ---
  function chooseInnerLoveCount(c){
    const age = Number(c.age)||25;
    const lt = String(c.loveTarget||''), fe = String(c.firstExpText||'');
    const married = /既婚|再婚/.test(String(c.maritalText||''));
    if(/興味がない/.test(lt) && !married) return ['0人（そもそも求めていない）', null];
    if(/二次元|推し/.test(lt)) return [married ? '1人（妻ひと筋。推しは推し）' : pick(['0人（三次元は対象外）','1人（昔いた。それで悟った）']), null];
    if(/まだない/.test(fe) && !married){
      const v = pick(['0人','1人（手をつないで終わった清い交際）']);
      return [v, age>=32 && v==='0人' ? 'rare' : null];
    }
    let list;
    if(age<20) list = [['0人',3],['1人',4],['2人',2.5],['3人（早熟）',1,'r']];
    else if(age<25) list = [['1人',4],['2人',4],['3人',3],['片手で足りる',2.5],['0人',2],['5〜6人',1,'d']];
    else if(age<35) list = [['1人',2.5],['2人',3],['3人',3.5],['片手で足りる',4],['5〜6人',2.5],['10人前後',1,'d'],['0人',0.8,'r']];
    else list = [['2人',2.5],['3人',3],['片手で足りる',4],['5〜6人',3],['10人前後',1.5,'d'],['二桁（途中で数えるのをやめた）',0.8,'d'],['1人',2],['0人',0.4,'r']];
    const playful = ['ホスト系','ギャル男系','やりらふぃー系','韓国風','ストリート系'].includes(String(c.vibe||''));
    if(playful) list = list.map(x=>/10人|二桁|5〜6/.test(x[0])?[x[0],x[1]*3,x[2]]:(/^0人|^1人/.test(x[0])?[x[0],x[1]*0.35,x[2]]:x));
    if(/^E/.test(String(c.mbti||''))) list = list.map(x=>/片手|5〜6|10人/.test(x[0])?[x[0],x[1]*1.4,x[2]]:x);
    if(/一途/.test(lt)) list = list.map(x=>/10人|二桁/.test(x[0])?[x[0],x[1]*0.25,x[2]]:(/^1人|^2人/.test(x[0])?[x[0],x[1]*1.8,x[2]]:x));
    if(/惚れっぽい/.test(lt)) list = list.map(x=>/片手|5〜6|10人/.test(x[0])?[x[0],x[1]*1.6,x[2]]:x);
    if(married) list = list.filter(x=>x[0]!=='0人');
    for(let i=0;i<6;i++){
      const it = innerWeighted(list);
      if(married && it[0]==='0人') continue;
      let badge = null;
      if(it[2]==='r') badge = 'rare';
      else if(playful && /^(0人|1人)$/.test(it[0])) badge = 'gap';
      else if(it[2]==='d' && Math.random()<.5) badge = 'rare';
      let v = it[0];
      if(married && v==='1人') v = '1人（妻ひと筋）';
      return [v, badge];
    }
    return [married?'1人（妻ひと筋）':'1人', null];
  }
  // --- 資産（収入×年齢×性癖連動） ---
  function chooseInnerAsset(c){
    const age = Number(c.age)||25, y = Number(c.eraYear)||2026;
    const cat = innerRoleCat(c.role);
    const gam = String(c.gambleText||''), ds = String(c.innerDesire||''), liv = String(c.livingText||'');
    if(cat==='student' || age<=21){
      if(/借金を作って/.test(gam)) return ['バイト代が返済にほぼ消えている', 'rare'];
      return [`バイト貯金${rnd(3,45,1)}万円`, null];
    }
    if(/借金を作って/.test(gam)) return [pick(['借金を完済したばかり（貯金はこれから）','返済がもう少しだけ残っている']), 'rare'];
    const inc = Number((String(c.incomeText||'').match(/約(\d+)万円/)||[])[1]) || 350;
    const years = Math.max(1, age-22);
    const spender = /分不相応な買い物|ギャンブルで一発|散財/.test(ds) || /現役でパチンコ|パチスロに熱かった/.test(gam);
    let k = 0.04 + Math.random()*0.28;
    if(spender) k *= 0.25;
    if(/^I..J/.test(String(c.mbti||''))) k *= 1.3;
    let amt = Math.round(inc * years * k / 10) * 10;
    let v, badge = null;
    if(amt < 30){ v = pick(['貯金ほぼゼロ（宵越しの銭は持たない）','貯金は常に一桁万円']); badge = inc>=700 ? 'gap' : (spender?'rare':null); }
    else if(amt < 100) v = `貯金${Math.max(30,amt)}万円前後`;
    else if(amt < 300) v = `貯金${Math.round(amt/50)*50}万円ほど`;
    else if(amt < 700) v = `貯金${Math.round(amt/100)*100}万円台`;
    else if(amt < 1500){ v = '貯金1000万円が見えてきた'; if(age<35) badge='rare'; }
    else { v = '貯金1500万円超（堅実の鬼）'; badge='rare'; }
    const extras = [];
    if(/持ち家|ローン/.test(liv)) extras.push('持ち家（ローン残あり）');
    if(Math.random()<.22){
      if(y>=2018) extras.push('積立NISAをコツコツ');
      else if(y>=2001) extras.push('投信をこっそり積立');
      else extras.push(y>=1985&&y<1996 ? '定期預金（金利のいい時代）' : '財形貯蓄');
    }
    if(/大卒|大学院/.test(String(c.educationText||'')) && age<=32 && Math.random()<.2) extras.push('奨学金返済中');
    if(Math.random()<.02 && !badge){ v = '実家が太い（本人は普通のつもり）'; badge='gap'; }
    return [v + (extras.length? '・'+extras.join('・') : ''), badge];
  }
  // --- 飲酒 ---
  function chooseInnerDrink(c){
    const age = Number(c.age)||25;
    if(age<20) return ['飲まない（20歳になったら考える）', null];
    let list = [['飲まない（下戸）',4],['飲まない（あえて）',2],['付き合い程度',7],['週末だけ',5],['晩酌が日課（ビール1本）',5],['晩酌が日課（ハイボール派）',3],['ザル（記憶は残るタイプ）',2,'d'],['ザル（記憶が飛ぶタイプ）',1,'d'],['休肝日を週2で死守',3],['禁酒中（今週から）',1.5,'d'],['家では飲まない主義',2.5],['クラフトビール沼',1.5],['日本酒をゆっくり派',2]];
    const h = String(c.healthText||'');
    if(/γ-GTP/.test(h)) list = list.map(x=>/晩酌|ザル/.test(x[0])?[x[0],x[1]*4,x[2]]:(/飲まない/.test(x[0])?[x[0],x[1]*0.2]:x));
    if(/健康優良|献血/.test(h)) list = list.map(x=>/ザル/.test(x[0])?[x[0],x[1]*0.4,x[2]]:x);
    if(/(お酒|酒)に弱い/.test(String(c.weaknessBody||''))) list = [['飲まない（下戸）',8],['付き合いで一杯だけ（すぐ赤くなる)',6],['ノンアル愛好家',3]];
    const it = innerWeighted(list);
    return [it[0], it[2]==='d'&&Math.random()<.5 ? 'rare' : null];
  }
  // --- 喫煙（時代の喫煙率と健康状態に連動） ---
  function chooseInnerSmoke(c){
    const age = Number(c.age)||25, y = Number(c.eraYear)||2026;
    if(age<20) return ['吸わない', null];
    const h = String(c.healthText||'');
    if(/禁煙に成功/.test(h)) return ['元喫煙者（禁煙成功・今は匂いに敏感）', null];
    if(/禁煙に挑戦中/.test(h)) return ['減煙中（1日数本まで来た）', 'rare'];
    let list = [['吸わない',17],['吸わない（匂いも苦手）',4],['元喫煙者（禁煙5年目）',3],['加熱式タバコ',3],['紙巻き1日数本',2,'d'],['紙巻き1日一箱',1,'d'],['たまにもらいタバコ',1.5,'d'],['飲んだ時だけ吸う',2,'d'],['葉巻をごくたまに（気取り）',0.4,'r']];
    if(y<1995){ list = list.map(x=>/紙巻き/.test(x[0])?[x[0],x[1]*8,x[2]]:(/^吸わない/.test(x[0])?[x[0],x[1]*0.35]:x)); }
    else if(y<2010){ list = list.map(x=>/紙巻き|もらい/.test(x[0])?[x[0],x[1]*2.5,x[2]]:x); }
    if(age>=50 && y>=2010) list = list.map(x=>/元喫煙者/.test(x[0])?[x[0],x[1]*2.5]:x);
    const it = innerWeighted(list);
    return [it[0], it[2]==='d'&&Math.random()<.4 ? 'rare' : (it[2]==='r'?'rare':null)];
  }
  // --- コーデ基準（ファッションセンス・服装へ直結） ---
  function chooseInnerFashionSense(c){
    const married = /既婚|再婚/.test(String(c.maritalText||''));
    const hasLover = /^恋人あり|婚約者あり/.test(String(c.loverText||''));
    const jikka = /実家暮らし/.test(String(c.livingText||''));
    let l = INNER_FASHION_SENSE.map(x=>x.slice());
    l = l.filter(x=>!(x[2]==='wife' && !married)).filter(x=>!(x[2]==='gf' && (!hasLover || married))).filter(x=>!(x[2]==='mom' && !jikka));
    const allSame = c.holidayTopBrand && c.holidayTopBrand===c.holidayBottomBrand && c.holidayBottomBrand===c.holidayShoesBrand;
    if(allSame) l = l.map(x=>x[2]==='same'?[x[0],x[1]*4,x[2]]:x);
    if(String(c.vibe||'')==='古着系' || String(c.holidayOutfitType||'')==='古着系') l = l.map(x=>x[2]==='furugi'?[x[0],x[1]*6,x[2]]:x);
    if(/石橋を叩いて/.test(String(c.principleText||''))) l = l.map(x=>x[2]==='ten'?[x[0],x[1]*4,x[2]]:x);
    if(/分不相応な買い物/.test(String(c.innerDesire||''))) l = l.map(x=>x[2]==='stretch'?[x[0],x[1]*5,x[2]]:x);
    const it = innerWeighted(l);
    let badge = null;
    if(it[2]==='mute') badge = Math.random()<.4 ? 'rare' : null;
    if(it[2]==='stretch') badge = 'gap';
    if(it[2]==='d') badge = 'rare';
    return [it[0], badge];
  }
  function applyFashionSenseFx(c){
    if(!c) return;
    const s = String(c.fashionSenseText||'');
    c.senseFashionNote = '';
    if(/量販店で3着|色違いを5枚|サイズ表記だけ|穴が開くまで/.test(s)){
      const cheap = pick(eraBrandList(['無地ノーブランド','UNIQLO','しまむら','GU'], Number(c.eraYear)||2026, '無地ノーブランド'));
      c.holidayOutfitBrand = cheap; c.holidayTopBrand = cheap; c.holidayBottomBrand = cheap; c.holidayShoesBrand = '';
      if(c.holidayOuterBrand) c.holidayOuterBrand = cheap;
      c.holidaySockUse = '着古してよれ気味';
      c.senseFashionNote = Math.random()<0.12 ? '上下の色が少しケンカしている' : 'サイズ感が微妙に合っていない、飾り気のない着こなし';
      if(/ケンカ/.test(c.senseFashionNote) && c.innerMeta) c.innerMeta.fashionsense = 'gap';
    } else if(/妻が選んで|彼女が選んで/.test(s)){
      c.senseFashionNote = '隅々まで手入れされた小綺麗な着こなし（選んだのは本人ではない）';
    } else if(/背伸びしたブランド/.test(s)){
      c.senseFashionNote = 'コーデの中で1点だけ明らかに高級なアイテムが浮いている';
    } else if(/定番を10年/.test(s)){
      c.senseFashionNote = '長く着込んだ定番品ならではの馴染んだ風合い';
    } else if(/古着一筋/.test(s)){
      c.senseFashionNote = '年代物の風合いを活かした古着ミックス';
    }
    // 内面リンク：体型コンプ→オーバーサイズ隠し
    if(/ぽっちゃり|ビール腹|腹だけ/.test(String(c.bodyType||'')) && /体型|腹/.test(String(c.complexText||'')) && !c.senseFashionNote){
      c.senseFashionNote = 'オーバーサイズで体型をぼかしがちな着こなし';
    }
  }
  // --- 恋愛対象：実際の割合＋対象別の多彩な傾向ノート ---
  INNER_LOVE_BASE.length = 0;
  INNER_LOVE_BASE.push(['女性',90.6],['男性',2.6,'r'],['男女どちらも',2.6,'r'],['まだ揺らいでいて分からない',1.1,'r'],['恋愛にあまり興味がない',1.6,'r'],['二次元にしか本気になれない',1,'r'],['恋愛よりも推しがすべて',0.5,'r']);
  function chooseInnerLove(c){
    const base = innerWeighted(INNER_LOVE_BASE);
    let v = base[0], badge = base[2] ? 'rare' : null;
    const noteFor = (b)=>{
      if(b==='女性') return INNER_LOVE_NOTE_ANY.concat(INNER_LOVE_NOTE_F);
      if(b==='男性') return INNER_LOVE_NOTE_ANY.concat(INNER_LOVE_NOTE_M);
      if(b==='男女どちらも') return Math.random()<.5 ? INNER_LOVE_NOTE_BI : INNER_LOVE_NOTE_BI.concat(INNER_LOVE_NOTE_ANY, INNER_LOVE_NOTE_F, INNER_LOVE_NOTE_M);
      return null;
    };
    const pool = noteFor(base[0]);
    if(pool && Math.random()<.78){
      const n = innerWeighted(pool);
      v = base[0]+'（'+n[0]+'）';
      if(!badge && n[2]==='d' && Math.random()<.45) badge = /既婚者/.test(n[0]) ? 'gap' : 'rare';
    }
    return [v, badge];
  }
  // --- 出自×出身地の整合強化 ---
  function chooseInnerBirthplace(c){
    const nat = String(c.nationality||'日本');
    if(nat!=='日本' && INNER_NATION_CITIES[nat]){
      return [nat+'・'+pick(INNER_NATION_CITIES[nat])+'出身', null];
    }
    const org = String(c.originText||'');
    let cand = INNER_JP_PREFS.map(x=>x.slice());
    const wantTag = /漁師町/.test(org)?'sea':/離島/.test(org)?'island':/山間/.test(org)?'mountain':/温泉旅館/.test(org)?'onsen':null;
    const rural = /農家|漁師町|山間|離島|温泉旅館/.test(org);
    const urban = /団地育ち|社宅育ち|商店街/.test(org);
    if(rural) cand = cand.filter(x=>!x[3].includes('metro'));
    if(wantTag) cand = cand.map(x=>x[3].includes(wantTag)?[x[0],x[1],x[2]*8,x[3]]:x);
    if(rural) cand = cand.map(x=>[x[0],x[1],x[2]*(x[3].includes('sea')||x[3].includes('mountain')||wantTag?1:1.5),x[3]]);
    if(urban) cand = cand.map(x=>x[3].includes('metro')?[x[0],x[1],x[2]*2.6,x[3]]:x);
    const row = weighted(cand.map(x=>[x, x[2]]));
    let city;
    if(wantTag==='island') { const f=row[1].filter(m=>/石垣|五島|奄美/.test(m)); city = pick(f.length?f:row[1]); }
    else if(wantTag==='onsen') { const f=row[1].filter(m=>/別府|草津|豊岡|霧島/.test(m)); city = pick(f.length?f:row[1]); }
    else if(rural) { const f=row[1].filter(m=>!/市$/.test(m)||!/札幌|仙台|さいたま|横浜|川崎|名古屋|大阪|神戸|京都|福岡/.test(m)); city = pick(f.length?f:row[1]); }
    else city = pick(row[1]);
    c._bpTags = row[3]; c._bpPref = row[0];
    let v = row[0]+'：'+city;
    if(/転勤族/.test(org)) v += '（出生地。育ちは転勤で各地）';
    if(/海外駐在帰り/.test(org)) v += '（幼少期の数年は海外）';
    const rare = row[2]<=0.7 ? 'rare' : null;
    return [v, rare];
  }
  // --- 家族構成×生い立ちの整合（生い立ちフィルタ） ---
  function innerPastAllowed(c, txt){
    const org = String(c.originText||''), fam = String(c.familyText||'');
    if(/厳格な父親/.test(txt) && /母子家庭|祖父母に育てられた/.test(org)) return false;
    if(/過干渉の母/.test(txt) && /父子家庭|祖父母に育てられた/.test(org)) return false;
    if(/兄の背中/.test(txt) && !/次男|三男|末っ子|兄/.test(org+fam)) return false;
    if(/妹弟の面倒/.test(txt) && !/長男|妹|弟/.test(org+fam)) return false;
    if(/親の離婚を経験/.test(txt) && /父・母/.test(fam) && !/実家に父・母/.test(fam) && Math.random()<.7) return false;
    if(/家業の倒産/.test(txt) && !/経営者|商店|工場|店/.test(org) && Math.random()<.5) return false;
    if(/家の手伝い（店番・農作業）/.test(txt) && !/農家|漁師|商店|店|工場|旅館/.test(org)) return false;
    return true;
  }
  function chooseInnerPast(c){
    let ups = INNER_UPBRINGINGS.filter(x=>innerPastAllowed(c, x[0]));
    if(!ups.length) ups = [['平凡で穏やかな家庭で育つ',1]];
    const up = innerWeighted(ups);
    const r = Math.random();
    let trauma = 'トラウマ：なし', tBadge = null;
    let trs = INNER_TRAUMAS.filter(x=>!(/父親の怒鳴り声/.test(x[0]) && /母子家庭|祖父母に育てられた/.test(String(c.originText||''))));
    if(r >= 0.9){ const t = innerWeighted(trs); trauma = 'はっきりしたトラウマ：' + t[0]; tBadge = 'rare'; }
    else if(r >= 0.65){ const t = innerWeighted(trs); trauma = '少し引きずっている：' + t[0]; tBadge = (t[2]==='r'||t[2]==='d') ? 'rare' : null; }
    const badge = up[2] ? 'rare' : tBadge;
    return [up[0], trauma, badge];
  }
  // --- コンプレックス：家族構成整合（兄がいないのに兄と比較されない） ---
  function chooseInnerComplex(c){
    for(let i=0;i<5;i++){
      const r = chooseInnerComplexBase(c);
      if(/兄と比べられて/.test(r[0]) && !/次男|三男|末っ子|兄/.test(String(c.originText||'')+String(c.familyText||''))) continue;
      if(/方言/.test(r[0]) && !(typeof innerDialectOf==='function' && innerDialectOf(c))) continue;
      const by2 = (Number(c.eraYear)||2026) - (Number(c.age)||25);
      if(/名前がキラキラ/.test(r[0]) && by2 < 1996) continue;
      if(/名前が古風/.test(r[0])){
        if(c.nationality && c.nationality!=='日本') continue;
        const nm = String(c.name||'').match(/^(\S+)[\s\u3000]+(\S+)（([^）]+)）$/);
        if(!nm) continue;
        const INNER_RETRO_GIVEN = [['茂','シゲル'],['勇','イサム'],['清','キヨシ'],['進','ススム'],['昇','ノボル'],['稔','ミノル'],['勝','マサル'],['守','マモル'],['武','タケシ'],['正','タダシ'],['博','ヒロシ'],['隆','タカシ'],['修','オサム'],['豊','ユタカ'],['巌','イワオ']];
        const kanaSep = nm[3].includes('・') ? '・' : ' ';
        const kanaToks = nm[3].split(/[・\s\u3000]+/).filter(Boolean);
        const famKana = kanaToks[0] || '';
        const alreadyRetro = INNER_RETRO_GIVEN.some(([kj])=>nm[2]===kj);
        if(by2 > 1978 && !alreadyRetro){
          const [kj, kk] = pick(INNER_RETRO_GIVEN);
          c.name = `${nm[1]} ${kj}（${famKana}${kanaSep}${kk}）`;
          const nr = chooseInnerNickname(c);
          c.nicknameText = nr[0];
          if(c.innerMeta) c.innerMeta.nickname = nr[1];
          return [`名前が古風すぎること（祖父と同じ「${kj}」）`, 'rare'];
        }
        return [r[0], by2 > 1978 ? 'rare' : r[1]];
      }
      return r;
    }
    return ['特になし（あるとすれば無頓着なこと）', null];
  }
  // --- 生活状況×住居の整合強化 ---
  function chooseInnerResidence(c){
    const liv = String(c.livingText||''), nat = String(c.nationality||'日本');
    const bp = String(c.birthplaceText||'').split('：')[0].replace(/・.*$/,'').replace(/（.*$/,'');
    const inc = (String(c.incomeText||'').match(/約(\d+)万円/)||[])[1];
    const rich = inc && Number(inc)>=800;
    if(/実家/.test(liv) && !/建て替え/.test(liv)) return [`実家（${bp||'出身地'}）`, null];
    if(/学生寮/.test(liv)) return ['大学の学生寮（相部屋）', null];
    if(/営内/.test(liv)) return ['駐屯地の隊舎（外出は許可制）', null];
    if(/寮|社宅|住み込み/.test(liv)) return [pick(['職場まで徒歩圏の寮・社宅','会社敷地内（通勤0分）','職場の裏（通勤30秒）']), null];
    if(/単身赴任/.test(liv)) return [pick(['赴任先のワンルーム（家具は最小限）','赴任先の1K（週末に帰省）']), null];
    if(nat!=='日本' && Math.random()<.5) return [pick(['母国の実家近くのアパート','母国の都市部のフラット']), null];
    if(innerIsMarried(c)){
      if(/二世帯/.test(liv)) return ['二世帯住宅（親と同居・持ち家）', null];
      if(/妻の実家の近く/.test(liv)) return ['妻の地元の住宅街（賃貸戸建て）', null];
      if(/持ち家/.test(liv)) return [pick([`郊外の分譲${Math.random()<.5?'マンション':'戸建て'}（ローン返済中）`, '駅徒歩15分の3LDK（ローン返済中）', `${bp?bp+'にUターンして持ち家':'郊外の建売住宅'}`]), null];
      return [pick(['郊外の2LDK（賃貸）','駅近の賃貸マンション2LDK','社宅型の賃貸（会社補助あり）']), null];
    }
    const metro = Math.random()<.6;
    if(metro) return [pick(['都市部・駅徒歩12分の1K','都市部・築古だが広めの1DK','職場まで自転車15分のアパート','家賃を抑えた各駅停車の駅近く',`${rich?'都心の1LDK（少し背伸び）':'都市部のワンルーム'}`]), rich?'rare':null];
    return [pick([`地元（${bp||'出身地'}）の市内アパート（地元勤務）`, '地方都市の1LDK（家賃に余裕）', '海の見える町のアパート']), null];
  }
  // --- 友人：値はクリーンに保持（ボタンは表示側で付与） ---
  function chooseInnerFriend(c){
    if(c.friendOf && c.friendOf.name){
      return [`${nameKana(c.friendOf.name)}（${c.friendOf.relation||'友人'}・実体化済み）`, null];
    }
    const meet = innerWeighted(INNER_FRIEND_MEET);
    const fq = innerWeighted(INNER_FRIEND_FREQ);
    const age = Number(c.age)||25;
    const delta = /幼なじみ|腐れ縁|同級生|部活仲間|サークル/.test(meet[0]) ? rnd(-1,1,1) : /同期/.test(meet[0]) ? rnd(-2,2,1) : rnd(-4,5,1);
    const fAge = Math.max(18, Math.min(80, age + delta));
    const full = (typeof nameByNationality==='function') ? nameByNationality(c.nationality||'日本', c.eraYear||'2026', fAge) : '友人';
    const kanji = String(full).replace(/（.*$/,'').trim();
    if(c) c._friendSeed = {name: full, meet: meet[0], freq: fq[0], age: fAge};
    return [`${meet[0]}・${kanji}（${fq[0]}）`, null];
  }
  // --- 友人の実体化（表示情報を反映して友人作成） ---
  function innerFriendRelOf(meetTxt){
    if(/幼なじみ|腐れ縁/.test(meetTxt)) return ['幼なじみ','同い年'];
    if(/高校の同級生|専門学校の同期/.test(meetTxt)) return ['同級生', null];
    if(/職場の同期|前の職場の同期/.test(meetTxt)) return ['同期', null];
    if(/部活仲間|サークル仲間|大学の同期/.test(meetTxt)) return ['学生時代からの友人','同い年'];
    return ['趣味仲間','同い年'];
  }
  function makeInnerFriend(){
    if(!current || spinning) return;
    const seed = current._friendSeed || null;
    const ft = String(current.friendText||'');
    const meet = seed ? seed.meet : (ft.match(/^(.+?)・/)||[])[1] || '高校の同級生';
    const [relName, hierFix] = innerFriendRelOf(meet);
    const rel = FRIEND_RELATIONS[relName]; if(!rel) return;
    if(typeof renderFriendPanel === 'function') renderFriendPanel();
    const relSel = document.getElementById('friendRelation');
    if(relSel){ relSel.value = relName; }
    if(typeof renderFriendPanel === 'function') renderFriendPanel();
    const hierSel = document.getElementById('friendHierarchy');
    const hierName = rel.hier ? (hierFix && rel.hier.includes(hierFix) ? hierFix : pick(rel.hier.filter(h=>h!=='上司'))) : rel.fixedHier;
    if(hierSel && rel.hier && rel.hier.includes(hierName)) hierSel.value = hierName;
    createFriend(seed ? {age: seed.age, name: seed.name} : undefined);
    if(current && seed && (!current.nationality || current.nationality==='日本')){
      const km = String(seed.name).match(/（(.+)）/);
      if(km){
        const toks = km[1].split(/[・\s]+/).filter(Boolean);
        const givKana = toks.length>=2 ? toks[toks.length-1] : toks[0];
        if(givKana && /^[ァ-ヴー]+$/.test(givKana)){
          if(!current.innerMeta) current.innerMeta = {};
          current.nicknameText = `「${givKana}」（呼び捨て）`;
          current.innerMeta.nickname = null;
          renderAll();
        }
      }
    }
  }
  // --- チューザー：行動原理・許せないこと ---
  function chooseInnerPrinciple(c){
    let l = INNER_PRINCIPLES.map(x=>x.slice());
    const mb = String(c.mbti||'');
    const boost=(re,f)=>{ l=l.map(x=>re.test(x[0])?[x[0],x[1]*f,x[2]]:x); };
    if(/J$/.test(mb)) boost(/約束|石橋|三年|朝イチ|手は抜かない/,1.8);
    if(/P$/.test(mb)) boost(/勢い|とりあえず|楽しい方|逃げる/,1.8);
    if(/^..T/.test(mb)) boost(/実利|勝てる勝負|比べない|護身/,1.5);
    if(/^..F/.test(mb)) boost(/家族|悪口|声をかける|信じて/,1.6);
    const it = innerWeighted(l);
    return [it[0], it[2]==='d' && Math.random()<.5 ? 'rare' : null];
  }
  function chooseInnerUnforgivable(c){
    let l = INNER_UNFORGIVABLES.map(x=>x.slice());
    if(/いじめられた/.test(String(c.pastUpbringing||''))) l=l.map(x=>/弱い者いじめ|努力を嘲笑う/.test(x[0])?[x[0],x[1]*4]:x);
    if(/借金/.test(String(c.pastUpbringing||'')+String(c.gambleText||''))) l=l.map(x=>/金の貸し借り/.test(x[0])?[x[0],x[1]*3]:x);
    if(/接客|店員|カフェ|アパレル|コンビニ/.test(String(c.role||''))) l=l.map(x=>/店員への横柄/.test(x[0])?[x[0],x[1]*3]:x);
    const it = innerWeighted(l);
    return [it[0], null];
  }

  // 依存グラフ拡張
  INNER_DEPS.weakness.push('gamble');
  INNER_DEPS.love.push('fuzoku');
  INNER_DEPS.marital.push('fuzoku');
  INNER_DEPS.desire = ['gamble'];
  INNER_DEPS.past = INNER_DEPS.past.concat(['unforgivable']);
  INNER_DEPS.family = ['complex'];
  INNER_DEPS.lover = ['weekfreq','selffreq','fashionsense'];
  INNER_DEPS.marital.push('fashionsense');
  INNER_DEPS.health = ['smoke','drink'];
  INNER_DEPS.marital.push('weekfreq');
  INNER_DEPS.love.push('firstexp');
  INNER_DEPS.love.push('lovecount');
  INNER_DEPS.marital.push('lovecount');
  INNER_DEPS.firstexp = ['lovecount'];
  INNER_DEPS.gamble = ['asset'];
  INNER_DEPS.income.push('asset');
  INNER_DEPS.desire = (INNER_DEPS.desire||[]).concat(['asset']);


  function applyMuscleFashion(c){
    if(!c) return;
    const high = HIGH_TRAIN.includes(c.trainingLevel);
    const heavy = /フィジーク|パワー系|ボディビル/.test(String(c.trainingLevel||''));
    c.muscleFashionNote = '';
    c.workFitNote = c.workFitNote && !/既製スーツ|鍛えた体/.test(c.workFitNote) ? c.workFitNote : '';
    if(!high) return;
    c.muscleFashionNote = heavy ? pick(['胸と肩で生地がしっかり張るサイズ感','二の腕が袖を押し上げ、上からでも体つきが分かる']) : pick(['胸まわりに程よく張りの出るサイズ感','太ももに合わせて選んだテーパードの穿きこなし']);
    if(['紺スーツ','黒スーツ','グレースーツ'].includes(c.outfitType) && heavy) c.workFitNote = '既製スーツの肩がやや窮屈そうな、上着の上からでも分かる鍛えた体';
    if(c.season==='夏' && high && ['大学生カジュアル','ストリート系','私服通学風','古着系'].includes(c.holidayOutfitType) && Math.random()<0.3){
      c.holidayTop = heavy ? 'タンクトップ' : 'ボディラインの出るピタT';
    }
  }
  function generateCharacter(partialMode='full', groupCtx=null){
    const fixed = groupCtx ? {} : getFixed();
    if(FRIEND_CTX){ if(FRIEND_CTX.age) fixed.age = FRIEND_CTX.age; if(FRIEND_CTX.nationality) fixed.nationality = FRIEND_CTX.nationality; if(FRIEND_CTX.season) fixed.season = FRIEND_CTX.season; }
    const initial = getInitial();
    const rareMode = partialMode === 'rare';
    const base = current && partialMode !== 'full' && partialMode !== 'rare' ? {...current} : {};
    let age = Number(fixed.age || base.age || (groupCtx ? Math.min(45, Math.max(18, Number(groupCtx.ageCenter) + rnd(-3,3,1))) : chooseAge(initial.ageMin || 20, initial.ageMax || 32)));
    const nationality = fixed.nationality || initial.nationality || base.nationality || (groupCtx && Math.random()<0.8 ? groupCtx.nationality : pick(pools.nationalities));
    const ethnicity = fixed.ethnicity || initial.ethnicity || base.ethnicity || defaultEthnicityForNationality(nationality);
    const mbti = fixed.mbti || base.mbti || (groupCtx ? weighted(groupCtx.mbtiWeights) : pick(pools.mbtis));
    const vibe = fixed.vibe || (initial.vibe && initial.vibe !== 'ランダム' ? initial.vibe : (base.vibe || (groupCtx && Math.random()<0.6 ? groupCtx.vibe : chooseVibeByMbti(mbti, age))));
    const eraYear = (FRIEND_CTX && FRIEND_CTX.eraYear) || initial.eraYear || '2026';
    const era = eraProfile(eraYear);
    const season = fixed.season || base.season || ((initial.season && initial.season !== 'ランダム') ? initial.season : pick(['春','夏','秋','冬']));
    const profile = vibeProfile(vibe, age);
    const gapMode = Math.random() < 0.15;
    const role = FRIEND_CTX ? (FRIEND_CTX.role || chooseRoleByMbti(age, vibe, mbti, eraYear, gapMode)) : (base.role || (initial.occupation && initial.occupation !== 'ランダム' ? initial.occupation : chooseRoleByMbti(age, vibe, mbti, eraYear, gapMode)));
    const holidayPersona = !!(VIBE_OCC[vibe] && VIBE_OCC[vibe].bad.includes(role));
    const occRowForAge = OCCUPATIONS.find(o=>o[0]===role);
    if(occRowForAge && !base.age){
      const aLo = occRowForAge[4] || 18, aHi = occRowForAge[5] || 80;
      if(age < aLo || age > aHi) age = FRIEND_CTX ? Math.min(aHi, Math.max(aLo, age)) : rnd(aLo, aHi, 1);
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
    if(partialMode==='face' && current){ Object.assign(c, current, {id:uniqId(), nationality:c.nationality, ethnicity:c.ethnicity, vibe:c.vibe, name:nameByNationality(c.nationality, c.eraYear, c.age), role:c.role, mbti:c.mbti, personality:mbtiDescription(c.mbti,false), facePreset:c.facePreset, ageAppearance:c.ageAppearance, faceLine:c.faceLine, eyes:c.eyes, tearBags:c.tearBags, nose:c.nose, mouth:c.mouth, lips:c.lips, mouthPos:c.mouthPos, faceSpacing:c.faceSpacing, faceRatio:c.faceRatio, faceAsym:c.faceAsym, skin:c.skin, facialHair:c.facialHair, hairStyle:c.hairStyle, hairColor:c.hairColor, sceneIdea:buildEncounterScene({role:c.role, outfitType:current.outfitType, vibe:c.vibe, nationality:c.nationality, ethnicity:c.ethnicity, mbti:c.mbti, eraYear:c.eraYear, season:c.season, occInfluence:c.occInfluence, occupationMode:c.occupationMode}), createdAt:new Date().toISOString()}); }
    applyMuscleFashion(c);
    if(partialMode==='outfit' && current){ Object.assign(c, current, {id:uniqId(), nationality:c.nationality, ethnicity:c.ethnicity, vibe:c.vibe, name:nameByNationality(c.nationality, c.eraYear, c.age), role:c.role, mbti:c.mbti, personality:mbtiDescription(c.mbti,false), outfitType:c.outfitType,outfitBrand:c.outfitBrand,jacket:c.jacket,top:c.top,bottom:c.bottom,holidayOutfitType:c.holidayOutfitType,holidayOutfitBrand:c.holidayOutfitBrand,holidayJacket:c.holidayJacket,holidayTop:c.holidayTop,holidayBottom:c.holidayBottom,holidayShoes:c.holidayShoes,holidaySockBrand:c.holidaySockBrand,holidaySockType:c.holidaySockType,holidaySockColor:c.holidaySockColor,holidaySockUse:c.holidaySockUse,boxerBrand:c.boxerBrand,boxerColor:c.boxerColor,mainWearMode:c.mainWearMode,underwearType:c.underwearType,underwearColor:c.underwearColor,shoes:c.shoes,sockBrand:c.sockBrand,sockType:c.sockType,sockShape:c.sockShape,sockMaterial:c.sockMaterial,sockColor:c.sockColor,sockUse:c.sockUse,sceneIdea:buildEncounterScene({role:c.role, outfitType:c.outfitType, vibe:c.vibe, nationality:c.nationality, ethnicity:c.ethnicity, mbti:c.mbti, eraYear:c.eraYear, season:c.season, occInfluence:c.occInfluence, occupationMode:c.occupationMode}), createdAt:new Date().toISOString()}); }
    if(!groupCtx) Object.keys(locks).forEach(k=>{ if(locks[k] && current && current[k]!==undefined) c[k]=current[k]; });
    c.personality = mbtiDescription(c.mbti, false);
    c.bioText = base.bioText || buildBioHook(c);
    if(!c.cardRarity || c.cardRarity==='おすすめ自動' || c.cardRarity==='なし') c.cardRarity = suggestCardRarity(c);
    c.cardEffect = cardEffectByRarity(c.cardRarity);
    return c;
  }

  function slotValue(c,key){
    if(!c) return '？？？';
    if(key==='mbti') return mbtiDisplay(c);
    if(key==='sportsHistory') return sportsHistoryText(c, uiLang==='en');
    return String(displayValue(key, c[key]) ?? '？？？');
  }
  function renderSlots(c, revealAll=true){
    slotDefs.forEach(([key,label])=>{
      const el = document.getElementById('slot-'+key); if(!el) return;
      el.classList.toggle('locked', !!locks[key]);
      el.classList.toggle('done', !!c && revealAll);
      el.querySelector('.value').textContent = c ? slotValue(c,key) : '？？？';
      el.querySelector('.lock').textContent = locks[key] ? T('locked') : T('lock');
    });
  }
  function randomPreview(key){
    const map = {age:pools.ages, mbti:pools.mbtis, glasses:pools.glasses, holidayOutfitType:pools.outfitTypes, bodyHairOverall:pools.bodyHairOverall, chestHair:pools.bodyHairLevels, abdominalHair:pools.bodyHairLevels, lowerAbdomenHair:pools.bodyHairLevels, armHair:pools.bodyHairLevels, shinHair:pools.bodyHairLevels, thighHair:pools.bodyHairLevels, armpitHair:pools.bodyHairLevels, handFingerHair:pools.bodyHairLevels, footToeHair:pools.bodyHairLevels, backHair:pools.bodyHairLevels, height:['168cm','172cm','175cm','181cm','188cm'], weight:['58kg','65kg','72kg','80kg'], footSize:['26cm','27.5cm','28.5cm','30cm']};
    const arr = map[key] || pools[key+'s'] || pools[key] || ['???','GUZEN','SLOT'];
    return String(displayValue(key, pick(arr)));
  }
  let currentGroup = null;
  let activeMember = 0;
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
    return !!(currentGroup && currentGroup.members.length > 1 && currentGroup.promptMode === '1つの指示文にまとめて生成');
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
  let derivedType = null;
  function currentDerivedType(){
    if(derivedType) return derivedType;
    const io = getInitial().outputType || '';
    if(io && !io.includes('16:9')) return io;
    return 'トレーディングカード';
  }
  function buildHandoffSheet(c, english=false){
    const fw = c.footWidth || calcFootWidth(c);
    if(english){
      return `[OUTPUT FORMAT] Create one 16:9 "handoff reference sheet". Panels: full body front / full body side / face front / face side / face front with teeth visible (an "eee" expression, mouth stretched wide sideways to show the upper and lower rows of teeth, dental-reference style — in every other panel teeth appear only as naturally visible when smiling) / bare feet front view / soles (shown by the person himself sitting and presenting his own feet toward the viewer — never as detached, disembodied soles) / an enlarged full-sole view (the same feet as the person panels, detailed enough that the skin ridges of the soles, creases, and arch contours are readable, always oriented toes-up, as a matter-of-fact non-sexual reference enlargement). Every panel must show exactly the same person.${soleDetailLine(c, true)}
[INFO PANEL] (clean readable typography; list ONLY these items) Name "${nameKana(c)}" / Photo year: ${c.eraYear || '2026'} / Born: ${(Number(c.eraYear)||2026)-(Number(c.age)||25)} (age ${c.age}) / Height ${c.height}, Weight ${c.weight} / Body type "${displayValue('bodyType', c.bodyType)}" / Physique guide "about ${headCount(c)} heads tall" / Foot size ${c.footSize} / Foot width "${fw}". Keep all text crisp and unbroken.
[PERSON] Photo year: ${c.eraYear || '2026'} CE. ${eraStyleNote(c, true)} ${c.age} years old, ${c.nationality}, ${c.ethnicity}. ${facePresetPhrase(c, true)} ${eyeAreaLine(c, true)} Nose: ${c.nose}. Base expression: ${c.mouth}.${faceExtraLine(c, true)} Facial symmetry: ${displayValue('faceAsym', c.faceAsym || 'ほぼ対称（ごく自然な左右差）')}.${realismSpec(c, true)} ${teethLine(c, true)} Hair: ${c.hairColor} ${c.hairStyle}. Facial hair: ${c.facialHair}.
[PHYSIQUE] ${physiqueSpec(c, true, true)} Hip shape: ${displayValue('hipShape', c.hipShape || '標準的な丸みの臀部')} (a neutral body-reference note; never emphasized or staged).${muscleLine(c, true)}${trainingLine(c, true)}${bodyRealismLine(c, true)}
[FEET] Foot shape: ${c.footShape}; ${footWidthDesc(c, true)}.${footFeatureLine(c, true, true)} In the barefoot panels, render toes with correct counts and joints; show exactly one pair of soles belonging to him only.
[OUTFIT IN SHEET] Underwear (${underwearDesc(c, true)}) only, as a neutral body-reference presentation in the flat, matter-of-fact tone of clothing-catalog product photos — no sexual staging, emphasis, or posing. No outerwear, tops, bottoms, shoes, or socks.
[PURPOSE] This sheet is used to hand the character over to another chat or session as a reference image.
[PROHIBITED] Making him look underage, sexual poses, excessive body emphasis, emphasis on genitals or the hips, excessive sole/toe close-ups outside the dedicated enlargement panel, unnatural AI-looking skin, changing him into a different person, broken text, extra feet or duplicated soles.
${promptTargetGuide(c, true)}`;
    }
    return `【出力形式】16:9の「参考画像作成シート（引継ぎ用）」を1枚作成する。パネル構成：全身前面／全身側面／顔正面／顔側面／顔正面（歯が見える：「イー」と口を横に広げて上下の歯列を見せる、歯科の資料撮影風の即物的な表情。このパネル以外では歯は笑ったときに自然に見える範囲のみ）／裸足の正面／足裏（人物が座って自分の足裏をこちらへ見せる姿として描き、足裏だけが切り離されて描写された状態にしない）／足裏の全体拡大（人物パネルと同一の足。足裏の指紋＝皮膚の隆線やしわ、土踏まずの起伏が分かる精細さ。常につま先が上・かかとが下の向き。資料用の即物的で非性的な拡大）。全パネルを完全に同一人物として一致させる。${soleDetailLine(c, false)}
【情報欄】（読みやすい文字組で、次の項目のみ記載）氏名「${nameKana(c)}」／撮影年代：${eraLabel(c.eraYear)}／生年：${eraLabel((Number(c.eraYear)||2026)-(Number(c.age)||25))}（${c.age}歳）／身長${c.height}・体重${c.weight}／体型「${c.bodyType}」／体格の目安「約${headCount(c)}頭身」／足サイズ${c.footSize}／ワイズ「${fw}」${c.bioCaptionMode==='情報欄に入れる' ? `／ひとこと：「${c.bioText || bioLine(c, false)}」` : ''}。文字は崩さない。
【人物】撮影年代：${eraLabel(c.eraYear)}。${countryLine(c, false)}${eraStyleNote(c, false)}${c.age}歳、${c.nationality}、${c.ethnicity}。${sportsHistoryLine(c, false)}${facePresetPhrase(c)}${eyeAreaLine(c, false)}鼻は${c.nose}、基本表情は${c.mouth}。${faceExtraLine(c, false)}左右差は${c.faceAsym || 'ほぼ対称（ごく自然な左右差）'}。${realismSpec(c, false)}${teethLine(c, false)}髪は${c.hairColor}の${c.hairStyle}。ひげは${c.facialHair}。
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
    if(!currentGroup || currentGroup.members.length < 2){
      tabs.classList.add('hidden'); section.classList.add('hidden'); tabs.innerHTML=''; return;
    }
    tabs.classList.remove('hidden');
    if(isCombinedGroup()) section.classList.add('hidden'); else section.classList.remove('hidden');
    tabs.innerHTML = currentGroup.members.map((m,i)=>`<button class="btn ${i===activeMember?'primary':'dark'}" data-member="${i}">👤${i+1} ${(m.name||'').split(' ')[0]}｜${displayValue('groupPosition', m.groupPosition) || m.groupPosition}</button>`).join('');
    tabs.querySelectorAll('[data-member]').forEach(b=>b.onclick=()=>{ activeMember=Number(b.dataset.member); current=currentGroup.members[activeMember]; renderAll(); });
    const box = document.getElementById('groupPromptBox');
    if(box) box.value = buildGroupPrompt(currentGroup, isEnglish(currentGroup.members[0]));
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
    for(let i=0;i<12;i++) out.push(nameByNationality(current?.nationality || '日本', current?.eraYear, current?.age));
    return [...new Set(out)];
  }
  function slotEditPool(key){
    if(key==='name') return nameCandidates();
    if(current){
      if(key==='jacket') return eraOptionsFor('jacket', current, false);
      if(key==='top') return eraOptionsFor('top', current, false);
      if(key==='bottom') return eraOptionsFor('bottom', current, false);
      if(key==='shoes') return eraOptionsFor('shoes', current, false);
      if(key==='holidayJacket') return eraOptionsFor('jacket', current, true);
      if(key==='holidayTop') return eraOptionsFor('top', current, true);
      if(key==='holidayBottom') return eraOptionsFor('bottom', current, true);
      if(key==='holidayShoes') return eraOptionsFor('shoes', current, true);
      if(key==='tie') return eraOptionsFor('tie', current, false);
      if(key==='suitSilhouette') return eraOptionsFor('sil', current, false);
      if(key==='accessoriesEdit' || key==='holidayAccessoriesEdit') return ['なし','ビジネス腕時計','タフネス系デジタル腕時計','スマートウォッチ','機械式の高級腕時計','シンプルな腕時計','革ベルトの腕時計','シルバーチェーンネックレス','華奢なシルバーネックレス','喜平ネックレス','片耳のシルバーピアス','両耳の小ぶりなピアス','左薬指に結婚指輪','ミサンガ','アンクレット'];
      if(key==='holidayStyleNote') return ['—','清潔感重視のベーシックな着こなし','柄物や差し色をその日の気分で','モノトーン中心・機能優先','柔らかい色味と肌ざわり重視','サイズ感が微妙に合っていない','古着ミックスの味のある風合い'];
      if(key==='facePresetOut') return ['含める','含めない'];
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
    if(!current) return;
    if(key==='accessoriesEdit'){ current.accessories = value==='なし' ? [] : [value]; return; }
    if(key==='holidayAccessoriesEdit'){ current.holidayAccessories = value==='なし' ? [] : [value]; return; }
    if(key==='holidayStyleNote'){ current.holidayStyleNote = value==='—' ? '' : value; return; }
    current[key] = value;
    if(current.bloodType){
      if(key==='age') generateInnerProfile(current, ['income','education','marital','birthdate']);
      if(key==='role') generateInnerProfile(current, ['income','education']);
      if(key==='nationality') generateInnerProfile(current, ['blood','birthplace','birthdate']);
      if(INNER_FIELD_GEN[key]){ const deps = INNER_DEPS[INNER_FIELD_GEN[key]]; if(deps && deps.length) generateInnerProfile(current, deps.slice()); }
      if(key==='fashionSenseText') applyFashionSenseFx(current);
      if(key==='maritalText') syncMarriageRing(current);
    }
    if(['jacket','top','bottom','shoes'].includes(key)) partBrandRedraw(current, key, false);
    if(['holidayJacket','holidayTop','holidayBottom','holidayShoes'].includes(key)) partBrandRedraw(current, key.replace('holiday','').toLowerCase(), true);
    if(key==='mbti') current.personality = mbtiDescription(value, uiLang==='en');
    if(key==='footSize') current.footSizeManual = true;
    if(key==='height'){
      current.heightRaw = parseInt(value, 10) || current.heightRaw;
      current.weight = calcWeight(current.heightRaw || parseInt(current.height,10) || 175, current.bodyType) + 'kg';
      if(!current.footSizeManual) current.footSize = footFromHeight(current.heightRaw || 171, current.ethnicity);
    }
    if(key==='bodyType'){
      const h = current.heightRaw || parseInt(current.height, 10) || 175;
      current.weight = calcWeight(h, value) + 'kg';
    }
    renderAll();
  }
  function buildSportsHistoryEditor(container, onSave){
    const STR_PRESETS = [['自動（期間から計算）','auto'],['影響なし','0'],['名残程度','0.5'],['ほどよく','1.2'],['しっかり','2.2']];
    const maxSt = maxStageForAge(Number(current.age)||25);
    const stages = SPORT_STAGES.slice(0, maxSt+1);
    const h = current.sportsHistory || [];
    const mk = (opts, val)=>{ const sel=document.createElement('select'); sel.innerHTML=opts.map(o=>{const [lab,v]=Array.isArray(o)?o:[o,o];return `<option value="${v}"${String(v)===String(val)?' selected':''}>${lab}</option>`;}).join(''); return sel; };
    const rows = [];
    for(let i=0;i<2;i++){
      const e = h[i] || null;
      const sp = mk(['なし'].concat(SPORT_EXP_POOL), e ? e.name : 'なし');
      const fr = mk(stages, e ? SPORT_STAGES[e.from] : '小学校');
      const to = mk(stages, e ? SPORT_STAGES[e.to] : '高校');
      const st = mk(STR_PRESETS, e ? (e.strength===0?'0': e.strength>=2?'2.2': e.strength>=0.8?'1.2':'0.5') : 'auto');
      const lab = document.createElement('label'); lab.textContent = (uiLang==='en'?'Sport ':'競技')+(i+1);
      const row = document.createElement('div'); row.style.cssText='display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:4px';
      row.append(sp,fr,to,st); container.append(lab,row);
      rows.push({sp,fr,to,st});
    }
    const note = document.createElement('p'); note.className='notice'; note.style.margin='4px 0 0';
    note.textContent = uiLang==='en' ? 'Order: sport / start / end / body influence. Height & body type stay as-is.' : '競技／開始／終了／体格への影響。確定済みの身長・体型は変わりません（記述側に反映）。';
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
      current.sportsHistory = out;
      onSave();
    };
  }
  function openSlotEditor(key){
    if(!current || spinning) return;
    const slotEl = document.getElementById('slot-'+key); if(!slotEl) return;
    const valEl = slotEl.querySelector('.value'); if(!valEl || slotEl.querySelector('.slot-editor')) return;
    if(key==='sportsHistory'){
      const wrap = document.createElement('div'); wrap.className='slot-editor';
      const save = buildSportsHistoryEditor(wrap, ()=>{ wrap.remove(); renderAll(); });
      const ok = document.createElement('button'); ok.className='pf-btn'; ok.textContent = uiLang==='en'?'Save':'決定'; ok.onclick=save;
      const ng = document.createElement('button'); ng.className='pf-btn'; ng.textContent = uiLang==='en'?'Cancel':'キャンセル'; ng.onclick=()=>wrap.remove();
      wrap.append(ok, ng); slotEl.append(wrap); return;
    }
    const cur = current[key] !== undefined && current[key] !== null ? String(current[key]) : '';
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
    relSel.innerHTML = Object.keys(FRIEND_RELATIONS).map(r=>`<option value="${r}">${uiLang==='en' ? FRIEND_REL_EN[r] : r}</option>`).join('');
    if(keep && FRIEND_RELATIONS[keep]) relSel.value = keep;
    const rel = FRIEND_RELATIONS[relSel.value];
    const hierField = document.getElementById('friendHierField');
    const hierSel = document.getElementById('friendHierarchy');
    if(rel.hier){
      hierField.classList.remove('hidden');
      const keepH = hierSel.value;
      hierSel.innerHTML = rel.hier.map(h=>`<option value="${h}">${uiLang==='en' ? FRIEND_HIER_EN[h] : h}</option>`).join('');
      if(keepH && rel.hier.includes(keepH)) hierSel.value = keepH;
    } else {
      hierField.classList.add('hidden');
    }
  }
  function createFriend(opts){
    if(!current || spinning) return;
    const relName = document.getElementById('friendRelation').value;
    const rel = FRIEND_RELATIONS[relName]; if(!rel) return;
    const hierName = rel.hier ? document.getElementById('friendHierarchy').value : rel.fixedHier;
    const baseC = {...current}; delete baseC.friendBase;
    const [dLo, dHi] = rel.delta || FRIEND_HIER_DELTA[hierName] || [0,0];
    const targetAge = (opts && opts.age) ? Number(opts.age) : Math.max(18, Math.min(80, Number(baseC.age) + rnd(dLo, dHi, 1)));
    FRIEND_CTX = {
      age: String(targetAge),
      eraYear: String(baseC.eraYear || '2026'),
      season: baseC.season || '',
      nationality: Math.random() < 0.9 ? baseC.nationality : '',
      role: rel.sameRole ? baseC.role : ''
    };
    let f = null;
    for(let i=0;i<8;i++){ f = generateCharacter('full'); if(rel.sameRole || f.role !== baseC.role) break; }
    FRIEND_CTX = null;
    if(opts && opts.name) f.name = opts.name;
    f.friendOf = {name: baseC.name, age: baseC.age, role: baseC.role, relation: relName, hierarchy: hierName};
    f.friendBase = baseC;
    const history = loadHistory(); history.unshift({...baseC, appVersion:'V3.2.0'});
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history.slice(0,50)));
    currentGroup = null; activeMember = 0;
    current = f;
    document.getElementById('friendPanel').classList.add('hidden');
    renderAll(); switchTab('result');
    els.status.textContent = T('friendDone');
  }
  function rerollOne(key){
    if(!current || spinning) return;
    if(key==='sportsHistory'){ current.sportsHistory = generateSportsHistory(current.age, current.role, current.sportName, getInitial().sportsBodyInfluence); renderAll(); return; }
    const fresh = generateCharacter('full');
    const keys = DICE_GROUPS[key] || [key];
    keys.forEach(k=>{ if(fresh[k]!==undefined) current[k]=fresh[k]; });
    if(keys.includes('mbti')) current.personality = mbtiDescription(current.mbti, false);
    renderAll();
  }

  async function spin(){
    if(spinning) return; spinning=true; els.status.textContent=T('spinning');
    const next = generateCharacter(mode);
    for(const [key,label,cat] of slotDefs){
      const el = document.getElementById('slot-'+key); if(!el) continue;
      if(locks[key] && current){ el.querySelector('.value').textContent=slotValue(current,key); continue; }
      if(mode==='face' && !['face','hair'].includes(cat)) { el.querySelector('.value').textContent=slotValue(next,key); continue; }
      if(mode==='outfit' && !['outfit','feet'].includes(cat)) { el.querySelector('.value').textContent=slotValue(next,key); continue; }
      if(document.getElementById('instantMode')?.checked){ el.classList.add('done'); el.querySelector('.value').textContent = slotValue(next,key); continue; }
      el.classList.add('spin');
      for(let i=0;i<8;i++){ el.querySelector('.value').textContent = randomPreview(key); await sleep(35); }
      el.classList.remove('spin'); el.classList.add('done'); el.querySelector('.value').textContent = slotValue(next,key); await sleep(80);
    }
    const gSize = Number(getInitial().groupSize || 1);
    if(mode === 'full' && gSize > 1){
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
      currentGroup = {members, setting, promptMode: getInitial().groupPromptMode || 'メンバーごとに別々の指示文'};
      activeMember = 0;
    } else if(mode === 'full'){
      currentGroup = null; activeMember = 0;
    } else if(currentGroup){
      currentGroup.members[activeMember] = next;
    }
    current = next; renderAll(); els.status.textContent=T('done'); spinning=false; switchTab('result');
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
  const RARE_RULES = [
    ['高身長183cm+', 20, c=>c.heightRaw>=183],
    ['大足29cm+', 20, c=>parseFloat(c.footSize)>=29],
    ['特大足30cm+', 25, c=>parseFloat(c.footSize)>=30],
    ['規格外の足31cm+', 30, c=>parseFloat(c.footSize)>=31],
    ['個性体型', 15, c=>String(c.bodyType).includes('高身長')||String(c.bodyType).includes('腹だけ')||String(c.bodyType).includes('ぽっちゃり')],
    ['レア靴下', 12, c=>String(c.sockType).includes('柄')||String(c.sockType).includes('インビジブル')],
    ['学生服スタイル', 10, c=>String(c.outfitType).includes('学生服')],
    ['普通顔×180cm+', 12, c=>c.facePreset==='普通顔' && c.heightRaw>=180],
    ['10枚出力', 10, c=>String(c.count).includes('10')],
    ['戦前の時代設定', 15, c=>Number(c.eraYear)<1946],
    ['外国籍', 8, c=>c.nationality && c.nationality!=='日本'],
    ['ギャップ枠', 12, c=>!!c.gapMode],
    ['休日ペルソナ', 10, c=>!!c.holidayPersona],
    ['レアな肌の特徴', 8, c=>['左頬の薄い傷跡','眉尻の剃り込み跡','ゴーグル跡の日焼けムラ','腕まくり日焼けの跡'].some(v=>v===c.skinDetail||v===c.skinDetail2)],
    ['明色髪', 8, c=>['金髪','シルバー','アッシュグレー','プラチナ'].some(v=>String(c.hairColor).includes(v))],
    ['高身長178cm+', 8, c=>c.heightRaw>=178 && c.heightRaw<183],
    ['スタイル抜群（7.6頭身+）', 10, c=>parseFloat(headCount(c))>=7.6 && parseFloat(headCount(c))<7.9],
    ['8頭身級（7.9頭身+）', 18, c=>parseFloat(headCount(c))>=7.9],
    ['平行二重×アーモンド', 10, c=>c.eyelid==='平行二重' && c.eyeShape==='アーモンド形の目'],
    ['左右対称に近い顔', 8, c=>c.faceAsym==='左右対称に近い整った顔'],
    ['彫りの深い顔立ち', 6, c=>String(c.browRidge).includes('深い')],
    ['整った歯列', 5, c=>c.teethAlign==='整った歯列' || c.teethAlign==='矯正後のきれいな歯列'],
    ['えくぼ', 6, c=>c.dimple && c.dimple!=='えくぼなし'],
    ['泣きぼくろ', 5, c=>String(c.mole).includes('泣きぼくろ') || ['目元の泣きぼくろ'].some(v=>v===c.skinDetail||v===c.skinDetail2)],
    ['引き締まり体型', 5, c=>/細マッチョ|痩せマッチョ|水泳選手|逆三角形|クライマー/.test(String(c.bodyType))],
    ['長いまつ毛', 4, c=>String(c.eyelash).includes('長め')],
    ['ふっくら涙袋', 4, c=>['ふっくら','ややはっきり'].includes(String(c.tearBags))],
    ['珍しい職業', 8, c=>['僧侶','書道家','防衛大学校学生','国鉄職員','パイロット','アナウンサー','ライフガード','電車運転士','プロスポーツ選手','漁師'].includes(c.role)],
    ['珍しいMBTI', 6, c=>['INFJ','INTJ','ENTJ'].includes(c.mbti)],
    ['脚長スタイル', 6, c=>['長い','非常に長い'].includes(String(c.legLength))],
    ['特徴的な髪型', 5, c=>/マンバン|スキンフェード|アフロ|ツイスト|スパイラル|ウルフ|アシメ/.test(String(c.hairStyle))]
  ];
  function rarityBreakdown(c){
    if(!c) return [];
    const out = [];
    for(const [label, pt, test] of RARE_RULES){ try{ if(test(c)) out.push([label, pt]); }catch(e){} }
    return out;
  }
  function ikemenBreakdown(c){
    if(!c) return [];
    const out = [];
    for(const key in IKEMEN_DELTAS){
      const d = IKEMEN_DELTAS[key][c[key]];
      if(d) out.push([IKEMEN_AXIS_LABELS[key], d]);
    }
    const hc = headCount(c);
    const hd = hc >= 7.8 ? 8 : hc >= 7.6 ? 6 : hc >= 7.3 ? 3 : hc >= 7.0 ? 0 : hc >= 6.8 ? -3 : -6;
    if(hd) out.push(['頭身', hd]);
    const sd = (c.skinDetail || 'なし（クリアな肌）') === 'なし（クリアな肌）' ? 3 : -2;
    if(sd) out.push(['肌', sd]);
    out.sort((a,b)=>b[1]-a[1]);
    return out;
  }
  function ikemenScore(c){
    if(!c) return 50;
    const sum = ikemenBreakdown(c).reduce((a,[,d])=>a+d, 0);
    return Math.max(0, Math.min(100, 50 + sum));
  }
  function ikemenRank(sc, english=false){
    if(sc >= 85) return english ? 'Miraculous features' : '奇跡の造形';
    if(sc >= 75) return english ? 'Head-turning looks' : '振り返られるイケメン';
    if(sc >= 65) return english ? 'Eye-catching looks' : '目を引くイケメン';
    if(sc >= 55) return english ? 'Somewhat refined features' : 'やや整った顔立ち';
    if(sc >= 45) return english ? 'Average features' : '平均的な顔立ち';
    return english ? 'Plain, approachable features' : '素朴で親しみやすい顔立ち';
  }
  function scoreRarity(c){
    if(!c) return [0,'NORMAL','idle'];
    const s = rarityBreakdown(c).reduce((a,[,p])=>a+p,0);
    if(s>=40) return [s,'LEGEND','legend']; if(s>=24) return [s,'SUPER RARE','super']; if(s>=10) return [s,'RARE','rare']; return [s,'NORMAL','normal'];
  }
  function rerollProfile(key){
    if(!current || spinning) return;
    if(key==='skinDetail' || key==='skinDetail2'){
      current.skinDetail = chooseSkinDetail(current.age, current.vibe, current.role, current.gapMode);
      current.skinDetail2 = (current.skinDetail && current.skinDetail !== 'なし（クリアな肌）') ? chooseSkinDetail(current.age, current.vibe, current.role, current.gapMode, current.skinDetail, true) : 'なし（クリアな肌）';
      renderAll(); return;
    }
    if(key==='sceneIdea'){ current.sceneIdea = buildEncounterScene(current); renderAll(); return; }
    if(key==='faceSpacing'){ current.faceSpacing = chooseFaceSpacing(current.vibe); renderAll(); return; }
    if(['lips','mouthPos','faceRatio','faceAsym','footWidth'].includes(key)){ const pool = slotEditPool(key); if(pool) current[key] = pick(pool); renderAll(); return; }
    if(key==='footFeature'){ current.footFeature = chooseFootFeature(current); renderAll(); return; }
    if(['eyebrowDensity','jawChin','jawAngle','ear','forehead','hairline','cheek','dimple','mole','hairTexture','eyeBags','adamsApple','lipTone','browRidge','facialHairGroom'].includes(key)){ const fx = chooseFaceExtras(current); current[key] = fx[key]; renderAll(); return; }
    if(['jacket','top','bottom','shoes'].includes(key)){ rerollCoordPart(current, key, false); renderAll(); return; }
    if(['holidayJacket','holidayTop','holidayBottom','holidayShoes'].includes(key)){ rerollCoordPart(current, key.replace('holiday','').toLowerCase(), true); renderAll(); return; }
    if(key==='tie'){ rerollCoordPart(current, 'tie', false); renderAll(); return; }
    if(key==='suitSilhouette'){ rerollCoordPart(current, 'sil', false); renderAll(); return; }
    if(key==='accessoriesEdit'){ const ring=(current.accessories||[]).some(x=>/結婚指輪/.test(x)); current.accessories=generateAccessories(current,false); if(ring) current.accessories.push('左薬指に結婚指輪'); renderAll(); return; }
    if(key==='holidayAccessoriesEdit'){ const ring=(current.holidayAccessories||[]).some(x=>/結婚指輪/.test(x)); current.holidayAccessories=generateAccessories(current,true); if(ring) current.holidayAccessories.push('左薬指に結婚指輪'); renderAll(); return; }
    if(key==='holidayStyleNote'){ current.holidayStyleNote = mbtiStyleNote(current.mbti); applyMuscleFashion(current); if(typeof applyFashionSenseFx==='function') applyFashionSenseFx(current); renderAll(); return; }
    if(key==='trainingLevel'){ current.trainingLevel = chooseTrainingLevel(current); applyMuscleFashion(current); current.bioText = buildBioHook(current); renderAll(); return; }
    if(key==='sportsHistory'){ current.sportsHistory = generateSportsHistory(current.age, current.role, current.sportName, getInitial().sportsBodyInfluence); current.bioText = buildBioHook(current); renderAll(); return; }
    if(key==='bioText'){ current.bioText = buildBioHook(current); renderAll(); return; }
    if(key==='measurementA'){ current.measurementA=drawProfileMeasurement('A'); current.measurementB=deriveMeasurementB(current.measurementA); renderAll(); return; }
    if(key==='measurementB'){ current.measurementB=deriveMeasurementB(current.measurementA); renderAll(); return; }
    if(key==='measurementC'){ current.measurementC=drawProfileMeasurement('C'); renderAll(); return; }
    if(key==='baseWearType'){ current.baseWearType = weighted([['ボクサーパンツ',6],['ショートショーツ',2],['スポーツスパッツ',2]]); renderAll(); return; }
    if(key==='boxerColor'){ current.boxerColor = pick(pools.boxerColors); renderAll(); return; }
    if(key==='soleType'){ current.soleType = chooseSoleType(current); current.soleWrinkle = chooseSoleWrinkle(current); renderAll(); return; }
    if(key==='toeLine'){ current.toeLine = chooseToeLine(current); renderAll(); return; }
    if(key==='soleWrinkle'){ current.soleWrinkle = chooseSoleWrinkle(current); renderAll(); return; }
    if(key==='toeCurl'){ current.toeCurl = weighted(TOE_CURLS.map(x=>[x[0], x[1]])); renderAll(); return; }
    if(key==='sportsHistory'){ current.sportsHistory = generateSportsHistory(Number(current.age), current.role, current.sportName); renderAll(); return; }
    if(key==='muscleTone'){
      const maxSt = maxStageForAge(Number(current.age)||25);
      (current.sportsHistory || []).forEach((x, i)=>{
        const stages = x.to - x.from + 1;
        const gap = maxSt - x.to;
        const decay = gap<=0?1: gap===1?0.7: gap===2?0.5:0.35;
        const isProMain = current.role === 'プロスポーツ選手' && x.name === current.sportName;
        let st = Math.random() < 0.15 && !isProMain ? 0 : Math.round(stages * decay * (0.5 + Math.random()*0.7) * 100)/100;
        if(isProMain) st = Math.max(1.5, st);
        x.strength = i === 1 ? Math.round(st * 0.5 * 100)/100 : st;
      });
      renderAll(); return;
    }
    if(['shoulderWidth','waistPos','legLength','armLength','frame','neckLength','limbSize'].includes(key)){ const fx = chooseFrameAxes(current); current[key] = fx[key]; renderAll(); return; }
    if(key==='hipShape'){ current.hipShape = chooseHipShape(current); renderAll(); return; }
    if(key==='teethAlign'){ current.teethAlign = chooseTeethAlign(current.age); current.teethColor = chooseTeethColor(current.age, current.teethAlign); renderAll(); return; }
    if(key==='teethColor'){ current.teethColor = chooseTeethColor(current.age, current.teethAlign); renderAll(); return; }
    if(key==='bodyHairAll'){
      const fresh = generateCharacter('full');
      BODYHAIR_KEYS.forEach(k=>{ if(fresh[k]!==undefined) current[k]=fresh[k]; });
      renderAll(); return;
    }
    const INNER_REROLL = {innerDream:['dream'], innerDesire:['desire'], weaknessMind:['weakness'], weaknessBody:['weakness'], innerTalent:['talent'], pastUpbringing:['past'], pastTrauma:['past'], pronoun:['pronoun'], incomeText:['income'], originText:['origin'], educationText:['education'], complexText:['complex'], bloodType:['blood'], loveTarget:['love'], maritalText:['marital'], livingText:['living'], familyText:['family'], birthplaceText:['birthplace'], birthdateText:['birthdate'], nicknameText:['nickname'], speechText:['speech'], memoryText:['memory'], friendText:['friend'], loverText:['lover'], residenceText:['residence'], healthText:['health'], hobbyText:['hobby'], myBoomText:['myboom'], foodLikeText:['foods'], foodHateText:['foods'], principleText:['principle'], unforgivableText:['unforgivable'], fuzokuText:['fuzoku'], gambleText:['gamble'], firstExpText:['firstexp'], weekFreqText:['weekfreq'], drinkText:['drink'], smokeText:['smoke'], loveCountText:['lovecount'], assetText:['asset'], selfFreqText:['selffreq'], fashionSenseText:['fashionsense']};
    if(INNER_REROLL[key]){ generateInnerProfile(current, INNER_REROLL[key]); renderAll(); return; }
    if(key==='role'){
      const fresh = generateCharacter('full');
      ['role','sportName','occupationMode','holidayPersona','workUniform','workUniformEn','headwear','headwearOn','outfitType','outfitBrand','jacket','top','bottom','shoes','sockBrand','sockType','sockShape','sockMaterial','sockColor','sockUse'].forEach(k=>{ if(fresh[k]!==undefined) current[k]=fresh[k]; });
      if(current.bloodType) generateInnerProfile(current, ['income','education','dream']);
      renderAll(); return;
    }
    rerollOne(key);
  }
  function openProfileEdit(btn){
    if(!current) return;
    const kv = btn.closest('.kv');
    if(!kv || kv.querySelector('.pf-editor')) return;
    if(btn.dataset.pEdit === 'sportsHistory'){
      const ed = document.createElement('div'); ed.className='pf-editor';
      const save = buildSportsHistoryEditor(ed, ()=>{ ed.remove(); renderAll(); });
      const ok = document.createElement('button'); ok.className='pf-btn'; ok.textContent = uiLang==='en'?'Save':'決定'; ok.onclick=save;
      const ng = document.createElement('button'); ng.className='pf-btn'; ng.textContent = uiLang==='en'?'Cancel':'キャンセル'; ng.onclick=()=>ed.remove();
      ed.append(ok, ng); kv.append(ed); return;
    }
    const keys = btn.dataset.pEdit.split(',');
    const ed = document.createElement('div');
    ed.className = 'pf-editor';
    const sels = [];
    keys.forEach(k=>{
      const pool = slotEditPool(k);
      if(!pool || !pool.length) return;
      const cur = current[k] !== undefined && current[k] !== null ? String(current[k]) : '';
      const opts = pool.map(String);
      if(cur && !opts.includes(cur)) opts.unshift(cur);
      const lab = document.createElement('label'); lab.textContent = slotLabel(k, k);
      const sel = document.createElement('select');
      if(k==='role') sel.innerHTML = occupationOptionsHTML(cur, false);
      else sel.innerHTML = opts.map(v=>`<option value="${String(v).replace(/"/g,'&quot;')}"${String(v)===cur?' selected':''}>${displayOptionLabel(k, v)}</option>`).join('');
      ed.appendChild(lab); ed.appendChild(sel); sels.push([k, sel]);
    });
    if(!sels.length) return;
    const bar = document.createElement('div'); bar.style.cssText='display:flex;gap:6px';
    const okB = document.createElement('button'); okB.className='pf-btn'; okB.textContent='OK';
    const ngB = document.createElement('button'); ngB.className='pf-btn'; ngB.textContent='✕';
    okB.onclick = () => { const vals = sels.map(([k,sel])=>[k, sel.value]); vals.forEach(([k,v])=>{ if(String(current[k]) !== v) applySlotEdit(k, v); }); renderAll(); };
    ngB.onclick = () => renderAll();
    bar.appendChild(okB); bar.appendChild(ngB); ed.appendChild(bar);
    kv.appendChild(ed);
  }
  function buildOutfitPrompt(c, mode='weekday'){
    if(!c) return '';
    const activeOutfitType = mode==='holiday' ? (c.holidayOutfitType || c.outfitType) : c.outfitType;
    const adultUniformJa = activeOutfitType.includes('学生服') ? '学生服は成人男性キャラクターが着る制服風衣装として扱い、未成年に見えないようにする。' : '';
    const adultUniformEn = activeOutfitType.includes('学生服') ? 'Treat the school uniform as a uniform-inspired outfit worn by an adult male character, and make sure he does not look underage.' : '';
    const capJa = buildCaptionInstruction(c, false);
    const capEn = buildCaptionInstruction(c, true);
    const targetJa = promptTargetGuide(c, false);
    const targetEn = promptTargetGuide(c, true);
    const styleJa = outfitStyleGuide(c, false);
    const styleEn = outfitStyleGuide(c, true);
    const bodyJa = buildBodyHairSummary(c,false);
    const bodyEn = buildBodyHairSummary(c,true);
    if(isEnglish(c)){
      return `Draw the adult male character "${c.name}" as the same person in an outfit variation.

Preserve the character's identity. Era setting: ${c.eraYear || '2026'} CE. ${eraStyleNote(c, true)} He is ${c.age} years old, ${c.nationality}, ${c.ethnicity}. His vibe is ${c.vibe}. His personality and demeanor feel ${mbtiDescription(c.mbti, true)}. ${facePresetPhrase(c, true)}And his age appearance is ${c.ageAppearance}. Height ${c.height}, weight ${c.weight}, body type ${bodyTypeDesc(c.bodyType, true)}. Hair is ${c.hairColor} ${c.hairStyle}. Facial hair: ${c.facialHair}. ${bodyEn}

${mode==='holiday'
  ? `[Casual outfit] This is his personal, off-duty style that reflects his personality and vibe. Base the outfit on ${c.holidayOutfitBrand || c.outfitBrand} ${c.holidayOutfitType || c.outfitType}. Outerwear: ${c.holidayOuterBrand?`${c.holidayOuterBrand} `:''}${c.holidayJacket || 'none'}. Top: ${c.holidayTopBrand?`${c.holidayTopBrand} `:''}${c.holidayTop || c.top}. Bottom: ${c.holidayBottomBrand?`${c.holidayBottomBrand} `:''}${c.holidayBottom || c.bottom}. Shoes: ${c.holidayShoesBrand?`${c.holidayShoesBrand} `:''}${c.holidayShoes || c.shoes}. Socks: ${c.holidaySockBrand || c.sockBrand} ${c.holidaySockType || c.sockType} (${c.holidaySockColor || c.sockColor}).${c.holidayEraFashionNote?` Overall silhouette: ${c.holidayEraFashionNote}.`:''}${accText(c,true,true)}${innerCasualNotes(c, true)}`
  : c.workUniform ? `[Work uniform — as a ${(typeof valueTranslations!=='undefined' && valueTranslations[c.role]) || displayValue('role', c.role) || c.role}] He wears ${c.workUniformEn}. Depict it as practical issued workwear. Do NOT accurately reproduce insignia or logos of any real organization, unit, or company — keep it a generic, standard uniform style for his occupation. Outerwear: ${c.jacket && c.jacket !== 'なし' ? c.jacket : 'none'}. Top: ${c.top}. Bottom: ${c.bottom}. Shoes: ${c.shoes}${uniformHatPhrase(c, true)}. Socks: ${c.sockBrand} ${c.sockType} (${c.sockColor}, ${c.sockUse}).` : `[Work outfit${c.role ? ` — as a ${displayValue('role', c.role)}` : ''}] Base the outfit on ${c.outfitBrand} ${c.outfitType}. Outerwear: ${c.jacket}. Top: ${c.topBrand?`${c.topBrand} `:''}${c.top}. Bottom: ${c.bottomBrand?`${c.bottomBrand} `:''}${c.bottom}. Shoes: ${c.shoesBrand?`${c.shoesBrand} `:''}${c.shoes}. Socks: ${c.sockBrand} ${c.sockType}; shape: ${c.sockShape}; material: ${c.sockMaterial}; color/pattern: ${c.sockColor}; condition: ${c.sockUse}.${c.tie?` Tie: ${c.tie}.`:''}${c.coat?` Coat: ${c.coat}.`:''}${c.suitSilhouette?` Suit silhouette: ${c.suitSilhouette}.`:''}${c.workFitNote?` ${c.workFitNote}.`:''}${accText(c,false,true)}`}

${styleEn}
Era setting: around ${c.eraYear || '2026'}. Match the garment silhouettes, fabrics, and accessories to this period.\n${adultUniformEn}
Make the top, bottom, shoes, and socks work together naturally. Do not mix formal, school uniform, sportswear, and casual elements in an unnatural way. Background: ${c.background}. Lighting: ${c.lighting}. Visual style: ${enQuality(c.quality)}. Depict him in a natural standing pose as a non-sexual fashion variation. Keep the same face, body proportions, height impression, and hairstyle.

${capEn}
${targetEn}`;
    }
    return `成人男性キャラクター「${c.name}」を、同一人物の服装差分として描写する。

人物の特徴は維持する。時代設定は${eraLabel(c.eraYear)}頃。${countryLine(c, false)}${seasonLine(c, false)}${eraStyleNote(c, false)}${c.age}歳、${c.nationality}、${c.ethnicity}。雰囲気は${c.vibe}。性格・立ち居振る舞いの雰囲気は${mbtiDescription(c.mbti,false)}。${c.holidayPersona ? `平日は${c.role}として堅実に働いているが、休日は${c.vibe}の雰囲気に一変するタイプであり、この画像は休日の姿として描く。` : ''}${facePresetPhrase(c)}年齢感は${c.ageAppearance}。${realismSpec(c, false)}身長${c.height}、体重${c.weight}、体型は${bodyTypeDesc(c.bodyType, false)}。${physiqueSpec(c, false)}${heightContrastCue(c, false)}${muscleLine(c, false, true)}髪は${c.hairColor}の${c.hairStyle}。ひげは${c.facialHair}。${bodyJa}

${mode==='holiday'
  ? `【私服コーデ】仕事とは違う、本人の性格や雰囲気が表れる私服として描く。服装は${c.holidayOutfitBrand || c.outfitBrand}の${c.holidayOutfitType || c.outfitType}を基調にする。上着は${c.holidayOuterBrand?`${c.holidayOuterBrand}の`:''}${c.holidayJacket || 'なし'}、トップスは${c.holidayTopBrand?`${c.holidayTopBrand}の`:''}${c.holidayTop || c.top}、ボトムスは${c.holidayBottomBrand?`${c.holidayBottomBrand}の`:''}${c.holidayBottom || c.bottom}、靴は${c.holidayShoesBrand?`${c.holidayShoesBrand}の`:''}${c.holidayShoes || c.shoes}。靴下は${c.holidaySockBrand || c.sockBrand}の${c.holidaySockType || c.sockType}（${c.holidaySockColor || c.sockColor}）。${c.holidayEraFashionNote?`全体は${c.holidayEraFashionNote}。`:''}${accText(c,true,false)}${innerCasualNotes(c)}`
  : c.workUniform ? `【職業コーデ（${c.role}の勤務服）】服装は${c.workUniform}。支給品らしい実用的な着こなしで描く。実在の特定組織・部隊・企業の記章やロゴを正確に再現せず、標準的な${c.role}の制服スタイルにとどめる。上着は${c.jacket && c.jacket !== 'なし' ? c.jacket : 'なし'}、トップスは${c.top}、ボトムスは${c.bottom}、靴は${c.shoes}${uniformHatPhrase(c, false)}。靴下は${c.sockBrand}の${c.sockType}（${c.sockColor}、${c.sockUse}）。` : `【職業コーデ${c.role ? `（${c.role}の仕事着・仕事帰りの装い）` : ''}】服装は${c.outfitBrand}の${c.outfitType}を基調にする。上着は${c.jacket}、トップスは${c.topBrand?`${c.topBrand}の`:''}${c.top}、ボトムスは${c.bottomBrand?`${c.bottomBrand}の`:''}${c.bottom}、靴は${c.shoesBrand?`${c.shoesBrand}の`:''}${c.shoes}。靴下は${c.sockBrand}の${c.sockType}で、形状は${c.sockShape}、素材は${c.sockMaterial}、色・柄は${c.sockColor}、使用感は${c.sockUse}。${c.tie?`ネクタイは${c.tie}。`:''}${c.coat?`コートは${c.outerBrand?`${c.outerBrand}の`:''}${c.coat}。`:''}${c.suitSilhouette?`スーツのシルエットは「${c.suitSilhouette}」。`:''}${c.workFitNote?`${c.workFitNote}。`:''}${accText(c,false,false)}`}

${styleJa}
時代設定は${eraLabel(c.eraYear)}頃。${countryLine(c, false)}${seasonLine(c, false)}服のシルエット・素材感・小物もこの年代に合わせる。\n${adultUniformJa}
トップス、ボトムス、靴、靴下の用途が一致した自然なコーディネートにする。フォーマル、学生服、スポーツ、カジュアルが不自然に混ざらないようにする。背景は${c.background}、光は${c.lighting}、質感は${c.quality}。非性的なファッション差分として、自然な立ち姿で描写する。元の顔立ち、体型、身長感、髪型を変えない。

${capJa}
${targetJa}`;
  }

  function buildScenePrompt(c){
    if(!c) return '';
    const scene = c.sceneIdea || buildEncounterScene(c);
    const capJa = buildCaptionInstruction(c, false);
    const capEn = buildCaptionInstruction(c, true);
    const targetJa = promptTargetGuide(c, false);
    const targetEn = promptTargetGuide(c, true);
    const styleJa = outfitStyleGuide(c, false);
    const styleEn = outfitStyleGuide(c, true);
    const bodyJa = buildBodyHairSummary(c,false);
    const bodyEn = buildBodyHairSummary(c,true);
    if(isEnglish(c)){
      return `Draw the adult male character "${c.name}" in a natural everyday scene where he is casually spotted by chance.

Scene: "${scene}". Era setting: ${c.eraYear || '2026'} CE. ${eraStyleNote(c, true)} He is ${c.age} years old, ${c.nationality}, ${c.ethnicity}. His occupation is ${c.role}, his vibe is ${c.vibe}, and his MBTI is ${c.mbti} (${mbtiDescription(c.mbti,true)}). ${facePresetPhrase(c, true)}And his age appearance is ${c.ageAppearance}. Height ${c.height}, weight ${c.weight}, body type ${bodyTypeDesc(c.bodyType, true)}. Hair is ${c.hairColor} ${c.hairStyle}. Facial hair: ${c.facialHair}. ${bodyEn}

Use natural everyday clothing that fits the character and the scene, or clothing aligned with the suggested outfit direction. ${styleEn} Base the background on ${c.background}, use ${c.lighting}, and render it in ${enQuality(c.quality)}. Avoid an overly direct camera-facing pose; make it feel like a naturally observed moment in a street or facility setting.

He wears ${c.occupationMode==='休日' && c.holidayOutfitType ? `his casual outfit (${c.holidayOutfitBrand || ''} ${c.holidayOutfitType}: top ${c.holidayTop}, bottom ${c.holidayBottom}, shoes ${c.holidayShoes})` : `his work outfit (${c.workUniform ? c.workUniformEn : `${c.outfitBrand} ${c.outfitType}`}: top ${c.top}, bottom ${c.bottom}, shoes ${c.shoes})`}. Keep it non-sexual and candid, with a natural standing, walking, or relaxed posture. Preserve the same face, body proportions, height impression, and hairstyle as the same character.

${capEn}
${targetEn}`;
    }
    return `成人男性キャラクター「${c.name}」を、日常の中で偶然見かけた自然な場面として描写する。

場面は「${scene}」。時代設定は${eraLabel(c.eraYear)}頃。${countryLine(c, false)}${seasonLine(c, false)}${eraStyleNote(c, false)}${c.age}歳、${c.nationality}、${c.ethnicity}。職業は${roleWithSport(c, false)}、雰囲気は${c.vibe}、性格・立ち居振る舞いの雰囲気は${mbtiDescription(c.mbti,false)}。${c.holidayPersona ? `平日は${c.role}として堅実に働いているが、休日は${c.vibe}の雰囲気に一変するタイプであり、この画像は休日の姿として描く。` : ''}${facePresetPhrase(c)}年齢感は${c.ageAppearance}。${realismSpec(c, false)}身長${c.height}、体重${c.weight}、体型は${bodyTypeDesc(c.bodyType, false)}。${physiqueSpec(c, false)}${heightContrastCue(c, false)}${muscleLine(c, false, true)}髪は${c.hairColor}の${c.hairStyle}。ひげは${c.facialHair}。${bodyJa}

服装は人物像と場面に合う自然な私服、または提案服装の方向性に合わせる。${styleJa} 背景は${c.background}を基調にし、光は${c.lighting}、質感は${c.quality}。カメラ目線にしすぎず、街中や施設内でふと見かけたような自然な距離感にする。

服装は${c.occupationMode==='休日' && c.holidayOutfitType ? `私服コーデ（${c.holidayOutfitBrand || ''}の${c.holidayOutfitType}、トップスは${c.holidayTop}、ボトムスは${c.holidayBottom}、靴は${c.holidayShoes}）` : `職業コーデ（${c.workUniform ? c.workUniform : `${c.outfitBrand}の${c.outfitType}`}、トップスは${c.top}、ボトムスは${c.bottom}、靴は${c.shoes}）`}を着用する。作り込みすぎない日常スナップ風。非性的で、自然な立ち姿、歩き姿、たたずまいを描写する。顔立ち、体型、身長感、髪型は同一人物として保つ。

${capJa}
${targetJa}`;
  }

  function buildTradingCardPrompt(c){
    if(!c) return '';
    const english = isEnglish(c);
    const cardInst = buildCardInstruction(c, english);
    const wear = cardWearDescription(c, english);
    const pose = cardPoseGuide(c, english);
    const body = buildBodyHairSummary(c, english);
    const caption = buildCaptionInstruction({...c, captionMode:'表記する'}, english);
    const target = promptTargetGuide(c, english);
    const rarity = c.cardRarity && c.cardRarity!=='おすすめ自動' ? c.cardRarity : suggestCardRarity(c);
    const effect = cardEffectByRarity(rarity);
    if(english){
      return `Create a separate trading-card-style variation prompt for the adult male character "${c.name}".

Era setting: ${c.eraYear || '2026'} CE. ${eraStyleNote(c, true)} Keep the character consistent with the main profile. He is ${c.age} years old, ${c.nationality}, ${c.ethnicity}. Occupation: ${c.role}. Vibe: ${c.vibe}. His personality and demeanor feel ${mbtiDescription(c.mbti,true)}. ${c.holidayPersona ? `On weekdays he works earnestly as a ${displayValue('role', c.role)}, but on days off his whole vibe transforms into a ${displayValue('vibe', c.vibe)} style — depict him here in his day-off persona.` : ''} ${facePresetPhrase(c, true)}${realismSpec(c, true)} Body type: ${bodyTypeDesc(c.bodyType, true)}. Height: ${c.height}. Weight: ${c.weight}. ${physiqueSpec(c, true)}${heightContrastCue(c, true)}${muscleLine(c, true, true)} Foot size: ${c.footSize}. Facial hair: ${c.facialHair}${c.facialHair!=='なし' && ['白髪まじり','ロマンスグレー','ごま塩頭','ほぼ白髪'].includes(c.hairColor) ? ' (with graying facial hair)' : ''}. ${c.glasses && c.glasses!=='なし' ? `He wears ${displayValue('glasses', c.glasses)}. ` : ''}Hair: ${c.hairColor} ${c.hairStyle}. ${body}

${wear}
${pose}

${cardInst}
Use rarity ${rarity} and decorative effect ${displayValue('cardEffect',effect)}. Make the character pose catchy and memorable based on his profile, not a plain standing pose. The card should look visually polished like a premium collectible character card, with clear hierarchy, readable profile panels, strong border design, and the original logo "GuzenIkemenMakerCARD". Do not imitate a real card franchise or use copyrighted card layouts.

${caption}
${target}`;
    }
    return `成人男性キャラクター「${c.name}」のトレーディングカード風差分プロンプトを作成する。

時代設定は${eraLabel(c.eraYear)}頃。${countryLine(c, false)}${seasonLine(c, false)}${eraStyleNote(c, false)}同一人物として、メインプロフィールの顔立ち・体型・身長感・髪型を維持する。${c.age}歳、${c.nationality}、${c.ethnicity}。職業は${roleWithSport(c, false)}、雰囲気は${c.vibe}。性格・立ち居振る舞いの雰囲気は${mbtiDescription(c.mbti,false)}。${c.holidayPersona ? `平日は${c.role}として堅実に働いているが、休日は${c.vibe}の雰囲気に一変するタイプであり、この画像は休日の姿として描く。` : ''}${facePresetPhrase(c)}体型は${bodyTypeDesc(c.bodyType, false)}。身長${c.height}、体重${c.weight}、足のサイズ${c.footSize}。${physiqueSpec(c, false)}ひげは${c.facialHair}${c.facialHair!=='なし' && ['白髪まじり','ロマンスグレー','ごま塩頭','ほぼ白髪'].includes(c.hairColor) ? '（白髪まじりのひげ）' : ''}。${c.glasses && c.glasses!=='なし' ? `眼鏡は${c.glasses}をかけている。` : ''}髪は${c.hairColor}の${c.hairStyle}。${body}

${wear}
${pose}

${cardInst}
レアリティは${rarity}、装飾効果は${effect}。カード内のキャラクターは、ただの直立ではなく、プロフィールに基づいたキャッチーで記憶に残るポーズにする。カードのデザインは人気トレーディングカードのように見栄えを高め、階層感のある情報パネル、読みやすいプロフィール欄、強いカード枠、オリジナルロゴ「GuzenIkemenMakerCARD」を入れる。実在カードシリーズや公式カードのデザインは模倣しない。

${caption}
${target}`;
  }

  function buildPrompt(c, baseMode=false){
    if(baseMode) c = Object.assign({}, c, {outputType:'16:9の基準リファレンスカード'});
    if(!c) return '';
    const refJa = refSheetInstruction(c, false);
    const refEn = refSheetInstruction(c, true);
    const sheetKind = refSheetKind(c.outputType);
    const outputJa = refJa ? refJa : (c.outputType.includes('16:9') ? '16:9の基準リファレンスカードとして、全身の前面・側面、顔の正面・側面、顔正面（歯が見える）、足の正面と側面と足裏を1枚に整理して表示する。足裏は、人物が座って自分の足裏をこちらへ見せる姿として描き、足裏だけが切り離されて描写された状態にしない。あわせて、同じ足裏の全体拡大パネルを併載する（人物パネルと同一の足であり、足裏の指紋＝皮膚の隆線やしわ、土踏まずの起伏が分かる精細さで描く。常につま先が上・かかとが下の向きで表示し、資料用の即物的で非性的な拡大とする）。顔正面（歯が見える）パネルは、「イー」と口を横に広げて上下の歯列を見せる、歯科の資料撮影風の即物的な表情にする（このパネル以外では、歯は笑ったときに自然に見える範囲でのみ描写する）。靴下の詳細パネルは入れない。各ビューは同一人物として顔立ち、体型、身長感を一致させる。このカードは以後の派生画像すべての基準（参照画像）として使う。' : `${c.outputType}。`);
    const outputEn = refEn ? refEn : (c.outputType.includes('16:9') ? 'Create a 16:9 BASE reference card that organizes the full-body front and side views, face front and side views, a face-front-with-teeth-visible view (an "eee" expression with the mouth stretched wide sideways to show the upper and lower rows of teeth, in the matter-of-fact tone of dental reference photography — in every other panel, teeth appear only as naturally visible when smiling), foot front view, foot side view, and sole view into one clean layout, without any dedicated sock-detail panel. The soles must be shown by the person himself sitting and presenting his own feet toward the viewer — never as detached, disembodied soles. Also include an enlarged full-sole panel of the same feet: identical to the feet in the person panels, detailed enough that the skin ridges of the soles (footprint lines), creases, and arch contours are readable, always oriented toes-up and heels-down, as a matter-of-fact, non-sexual reference enlargement. Keep every view clearly the same person. This card will be used as the reference image for all derived outputs.' : `Create ${enOutputType(c.outputType)}.`);
    const allowsOutfitPanels = sheetKind==='compare' || sheetKind==='stages' || sheetKind==='blueprint';
    const fullOutfitSheet = ['outfitref','poster','machiWork','machiOff','feet','magazine'].includes(sheetKind);
    const sheetWearJa = sheetKind==='machiOff' ? '私服（休日）の提案コーデを靴まで含めて正確に着用させ、下着姿は描かない。'
      : sheetKind==='feet' ? '職業服装を着用したまま靴だけを脱いだ状態で、提案靴下を履いている。下着姿は描かない。'
      : sheetKind==='magazine' ? '誌面のメイン写真では私服（休日）コーデを靴まで含めて着用し、小さめのサブカットとして職業服装の姿も1枚載せる。下着姿は描かない。'
      : 'この画像では職業服装のフルコーデを靴まで含めて正確に着用させ、下着姿は描かない。';
    const sheetWearEn = sheetKind==='machiOff' ? 'He wears his full casual (day-off) outfit accurately, shoes included — do NOT depict him in underwear.'
      : sheetKind==='feet' ? 'He keeps his work outfit on but has removed only his shoes, wearing the suggested socks — do NOT depict him in underwear.'
      : sheetKind==='magazine' ? 'In the main photo he wears his full casual outfit with shoes, plus one smaller sub-cut in his work outfit — do NOT depict him in underwear.'
      : 'In this image he wears his full work outfit accurately, shoes included — do NOT depict him in underwear.';
    const capJa = buildCaptionInstruction(c, false);
    const capEn = buildCaptionInstruction(c, true);
    const targetJa = promptTargetGuide(c, false);
    const targetEn = promptTargetGuide(c, true);
    const bodyJa = buildBodyHairSummary(c,false);
    const bodyEn = buildBodyHairSummary(c,true);
    if(isEnglish(c)){
      return `Create a non-sexual full-body image of the adult male character "${c.name}".

[BASICS & ERA] Photo year: ${c.eraYear || '2026'} CE. Born: ${(Number(c.eraYear)||2026)-(Number(c.age)||25)} (currently ${c.age}). ${eraStyleNote(c, true)} He is ${c.age} years old, ${c.nationality}, ${c.ethnicity}. His occupation is ${c.role}. His overall vibe is ${c.vibe}. His personality and demeanor feel ${mbtiDescription(c.mbti,true)}. ${c.holidayPersona ? `On weekdays he works earnestly as a ${displayValue('role', c.role)}, but on days off his whole vibe transforms into a ${displayValue('vibe', c.vibe)} style — depict him here in his day-off persona.` : ''}${sportsHistoryLine(c, true)}
[FACE] ${facePresetPhrase(c, true)}And his age appearance is ${c.ageAppearance}. His face line is ${c.faceLine}. ${eyeAreaLine(c, true)} Tear bags: ${c.tearBags}. Nose: ${c.nose}. Base expression: ${c.mouth}. Lips: ${displayValue('lips', c.lips || '標準的な厚さの唇')}. Mouth placement: ${displayValue('mouthPos', c.mouthPos || '標準的な位置・大きさの口')}. Feature spacing: ${displayValue('faceSpacing', c.faceSpacing || '標準的な配置')}. Feature proportions: ${displayValue('faceRatio', c.faceRatio || '標準的なバランスの比率')}. Facial symmetry: ${displayValue('faceAsym', c.faceAsym || 'ほぼ対称（ごく自然な左右差）')}.${realismSpec(c, true)} ${teethLine(c, true)}${faceExtraLine(c, true)} Skin: ${valueTranslations[c.skin] || c.skin}.${skinDetailLine(c, true)} Facial hair: ${c.facialHair}${c.facialHair!=='なし' ? ` (${displayValue('facialHairGroom', c.facialHairGroom || '自然に整えている')})` : ''}${c.facialHair!=='なし' && ['白髪まじり','ロマンスグレー','ごま塩頭','ほぼ白髪'].includes(c.hairColor) ? ' (with graying facial hair)' : ''}. ${c.glasses && c.glasses!=='なし' ? `He wears ${displayValue('glasses', c.glasses)}. ` : ''}Hair: ${c.hairColor} ${c.hairStyle}, ${displayValue('hairTexture', c.hairTexture || '直毛')}.${hairDetailLine(c, true)}
[BODY HAIR] ${bodyEn}

[PHYSIQUE & FEET] Height ${c.height}, weight ${c.weight}, body type ${bodyTypeDesc(c.bodyType, true)}. ${physiqueSpec(c, true, true)} Hip shape: ${displayValue('hipShape', c.hipShape || '標準的な丸みの臀部')} (a neutral body-reference note; never emphasized or staged).${muscleLine(c, true)}${trainingLine(c, true)}${bodyRealismLine(c, true)} Foot size ${c.footSize}, foot shape ${c.footShape}; ${footWidthDesc(c, true)}.${footFeatureLine(c, true, true)}${soleDetailLine(c, true)} Use a natural standing pose that makes the balance of height, weight, and foot size easy to understand.

[OUTFIT IN CARD] ${fullOutfitSheet ? sheetWearEn : `The main clothing is only ${underwearDesc(c, true)}. ${underwearShapeGuide(c, true)} Underwear panels are neutral reference material for body proportions — depict them in the same matter-of-fact tone as clothing product photos, with zero sexualized staging, emphasis, or posing.`} ${fullOutfitSheet ? '' : allowsOutfitPanels ? 'In the underwear-only panels, do not depict outerwear, tops, bottoms, shoes, or socks. In the outfit panels, dress him accurately in the specified suggested outfit, but never add shoes outside the panels where they are explicitly allowed.' : `Do not depict outerwear, tops, bottoms, regular outfits, school uniforms, jackets, shirts, trousers, coats, shoes, socks, sandals, or slippers. Do not include footwear settings or sock settings in this main image.`} Keep the underwear depiction non-sexual and suitable for neutral body reference purposes.

[OUTPUT FORMAT] ${outputEn}
[INFO PANEL] Inside the card, in clean readable typography, list ONLY: Name "${nameKana(c)}" / Photo year: ${c.eraYear || '2026'} / Born: ${(Number(c.eraYear)||2026)-(Number(c.age)||25)} (age ${c.age}) / Height ${c.height}, Weight ${c.weight} / Foot size ${c.footSize} / Foot width "${c.footWidth || calcFootWidth(c)}". Keep all text crisp and unbroken.
${c.catchphraseMode==='画像内にも表示する' ? `Place the catchphrase "${catchphrase(c, true)}" in readable, title-logo-style text at the bottom or corner of the image, without breaking the characters.\n` : ''}Create ${enCount(c.count)}. Background: ${c.background}. Lighting: ${c.lighting}. Visual quality/style: ${enQuality(c.quality)}.

${capEn}
${targetEn}

[PROHIBITED] Avoid: making him look underage, sexual poses, excessive body emphasis, emphasis on the genitals or hips (excessive sole/toe close-ups are avoided everywhere except the dedicated reference enlargement panel),${underwearAvoid(c, true)} excessive close-ups of soles or toes, unnatural AI-looking skin, changing him into a different person, broken text, or ${fullOutfitSheet ? 'changing him into any outfit other than the specified one' : allowsOutfitPanels ? 'clothing or shoes appearing outside their designated panels' : 'mixing in outerwear, tops, bottoms, shoes, or socks'}.`;
    }
    return `成人男性キャラクター「${c.name}」の非性的な全身画像を作成する。

【人物基本・時代】撮影年代：${eraLabel(c.eraYear)}。生年：${eraLabel((Number(c.eraYear)||2026)-(Number(c.age)||25))}（現在${c.age}歳）。${countryLine(c, false)}${seasonLine(c, false)}${eraStyleNote(c, false)}${c.age}歳、${c.nationality}、${c.ethnicity}。職業は${roleWithSport(c, false)}。雰囲気は${c.vibe}。性格・立ち居振る舞いの雰囲気は${mbtiDescription(c.mbti,false)}。${c.holidayPersona ? `平日は${c.role}として堅実に働いているが、休日は${c.vibe}の雰囲気に一変するタイプであり、この画像は休日の姿として描く。` : ''}${sportsHistoryLine(c, false)}
【顔】${facePresetPhrase(c)}年齢感は${c.ageAppearance}。フェイスラインは${c.faceLine}。${eyeAreaLine(c, false)}涙袋は${c.tearBags}。鼻は${c.nose}。基本表情は${c.mouth}。唇は${c.lips || '標準的な厚さの唇'}で、口は${c.mouthPos || '標準的な位置・大きさの口'}。顔のパーツ配置は${c.faceSpacing || '標準的な配置'}で、目鼻口の比率は${c.faceRatio || '標準的なバランスの比率'}。左右差は${c.faceAsym || 'ほぼ対称（ごく自然な左右差）'}。${realismSpec(c, false)}${teethLine(c, false)}${faceExtraLine(c, false)}肌は${c.skin}。${skinDetailLine(c, false)}ひげは${c.facialHair}${c.facialHair!=='なし' ? `（${c.facialHairGroom || '自然に整えている'}）` : ''}${c.facialHair!=='なし' && ['白髪まじり','ロマンスグレー','ごま塩頭','ほぼ白髪'].includes(c.hairColor) ? '（白髪まじりのひげ）' : ''}。${c.glasses && c.glasses!=='なし' ? `眼鏡は${c.glasses}をかけている。` : ''}髪は${c.hairColor}の${c.hairStyle}で、毛質は${c.hairTexture || '直毛'}。${hairDetailLine(c, false)}
【体毛】${bodyJa}

【体格・足】身長${c.height}、体重${c.weight}、体型は${bodyTypeDesc(c.bodyType, false)}。${physiqueSpec(c, false, true)}臀部は${c.hipShape || '標準的な丸みの臀部'}（体型確認のための中立的な記載であり、強調や演出はしない）。${muscleLine(c, false)}${trainingLine(c, false)}${bodyRealismLine(c, false)}足のサイズは${c.footSize}、足の形は${c.footShape}。${footWidthDesc(c, false)}。${footFeatureLine(c, false, true)}${soleDetailLine(c, false)}身長、体重、足サイズのバランスが自然に分かる直立姿勢にする。

【服装（カード内）】${fullOutfitSheet ? sheetWearJa : `基準服装は${underwearDesc(c, false)}のみ。${underwearShapeGuide(c, false)}下着姿のパネルは体型確認のための中立的な資料表現であり、衣料品の商品写真・体型資料と同じ即物的なトーンで描く。性的な演出・強調・ポーズは一切しない。`}${fullOutfitSheet ? '' : allowsOutfitPanels ? '下着のみのパネルでは上着・トップス・ボトムス・靴・靴下を描かない。提案服装のパネルでは指定された提案服装を正確に着用させるが、靴は指示で許可されたパネル以外では履かせない。' : `上着、トップス、ボトムス、通常服装、学生服、制服、ジャケット、シャツ、ズボン、コート、靴、靴下、サンダル、スリッパは描写しない。足元設定や靴下設定はこの画像には入れない。`}下着表現は非性的で、体型確認用の自然な見せ方にする。

【出力形式】${outputJa}
【情報欄】カード内に読みやすい文字組で次のみ記載する：氏名「${nameKana(c)}」／撮影年代：${eraLabel(c.eraYear)}／生年：${eraLabel((Number(c.eraYear)||2026)-(Number(c.age)||25))}（${c.age}歳）／身長${c.height}・体重${c.weight}／足サイズ${c.footSize}／ワイズ「${c.footWidth || calcFootWidth(c)}」${c.bioCaptionMode==='情報欄に入れる' ? `／ひとこと：「${c.bioText || bioLine(c, false)}」` : ''}。文字は崩さない。
${c.catchphraseMode==='画像内にも表示する' ? `画像内の下部または隅に、キャッチフレーズ「${catchphrase(c, false)}」をタイトルロゴ風の読みやすい日本語文字で入れる。文字は崩さない。\n` : ''}【画質・出力】${c.count}を作成する。背景は${c.background}。光は${c.lighting}。画質・質感は${c.quality}。

${capJa}
${targetJa}

【禁止事項】未成年に見える表現、性的なポーズ、過度な身体強調、局部や臀部の強調、${underwearAvoid(c, false)}資料用拡大パネル以外での足裏・足指の過度な接写、AIっぽい肌、別人化、文字崩れ、${fullOutfitSheet ? '指定コーデ以外の服装への勝手な変更。' : allowsOutfitPanels ? '指定パネル以外への服装・靴の混入。' : '上着・トップス・ボトムス・靴・靴下の混入。'}`;
  }

  function migrateUniformFields(c){
    if(!c || !c.workUniform) return;
    const nm = UNIFORM_NAME_MIGRATION[c.workUniform];
    if(!nm || !UNIFORM_VARIANTS[c.role]) return;
    const v = UNIFORM_VARIANTS[c.role].find(x=>x[0]===nm);
    if(!v) return;
    c.workUniform = v[0]; c.workUniformEn = v[1];
    c.top = v[2]; c.bottom = v[3]; c.shoes = v[4];
    c.headwear = v[7] || '';
    if(c.headwearOn === undefined) c.headwearOn = true;
    c.jacket = (v[8] && c.season === '冬') ? v[8] : 'なし';
  }
  function buildUniformEditRows(c, L){
    if(!c.workUniform || !UNIFORM_VARIANTS[c.role]) return [];
    const variants = UNIFORM_VARIANTS[c.role];
    const rows = [];
    if(variants.length > 1){
      const opts = variants.map(v=>`<option value="${String(v[0]).replace(/"/g,'&quot;')}"${v[0]===c.workUniform?' selected':''}>${displayValue('workUniform', v[0]) || v[0]}</option>`).join('');
      rows.push([L.uniformKind, `<select data-uniform-edit style="max-width:100%;background:#0d1a2c;border:1px solid var(--gold);border-radius:8px;color:#eaf2ff;padding:4px 6px;font-size:12px">${opts}</select>`]);
    } else {
      rows.push([L.uniformKind, displayValue('workUniform', c.workUniform) || c.workUniform]);
    }
    if(c.headwear){
      const onLabel = uiLang==='en' ? 'Wear the cap' : '着帽する';
      const offLabel = uiLang==='en' ? 'No cap' : '着帽しない';
      rows.push([L.headwearRow, `<select data-headwear-edit style="background:#0d1a2c;border:1px solid var(--gold);border-radius:8px;color:#eaf2ff;padding:4px 6px;font-size:12px"><option value="on"${c.headwearOn!==false?' selected':''}>${onLabel}</option><option value="off"${c.headwearOn===false?' selected':''}>${offLabel}</option></select> <span class="notice" style="display:inline">${c.headwear}</span>`]);
    }
    return rows;
  }
  function applyUniformVariant(name){
    if(!current || !UNIFORM_VARIANTS[current.role]) return;
    const v = UNIFORM_VARIANTS[current.role].find(x=>x[0]===name);
    if(!v) return;
    current.workUniform = v[0]; current.workUniformEn = v[1];
    current.top = v[2]; current.bottom = v[3]; current.shoes = v[4];
    current.headwear = v[7] || '';
    current.jacket = (v[8] && current.season === '冬') ? v[8] : 'なし';
    current.outfitBrand = '支給品・制服';
    renderAll();
  }
  function friendRelationText(c, english=false){
    const fo = c.friendOf; if(!fo) return '';
    const relMapEn = {'同僚':'Colleague','同期':'Same-cohort colleague','同級生':'Classmate','幼なじみ':'Childhood friend','趣味仲間':'Hobby friend','学生時代からの友人':'Friend since school days'};
    const hierMapEn = {'上司':'his boss','先輩':'his senior','同い年':'same age','後輩':'his junior','同期':'same cohort'};
    if(english) return `${relMapEn[fo.relation] || fo.relation} (${hierMapEn[fo.hierarchy] || fo.hierarchy}) of ${fo.name} (${fo.age}, ${displayValue('role', fo.role)})`;
    return `${fo.name}（${fo.age}歳・${fo.role}）の${fo.relation}（${fo.hierarchy}）`;
  }
  function friendPairOutfitPhrase(m, wear, english=false){
    if(wear === '職業服装'){
      if(m.workUniform){
        const hat = uniformHatPhrase(m, english);
        const jk = uniformJacketPhrase(m, english);
        return english ? `${m.workUniformEn} — ${m.top}${jk} + ${m.bottom} + ${m.shoes}${hat}` : `${m.workUniform}（${m.top}${jk}＋${m.bottom}＋${m.shoes}${hat}）`;
      }
      const jkt = m.jacket && m.jacket !== 'なし' ? (english ? `${m.jacket} + ` : `${m.jacket}＋`) : '';
      return english ? `${m.outfitBrand} ${m.outfitType} (${jkt}${m.top} + ${m.bottom} + ${m.shoes})` : `${m.outfitBrand}の${m.outfitType}（${jkt}${m.top}＋${m.bottom}＋${m.shoes}）`;
    }
    const hj = m.holidayJacket && m.holidayJacket !== 'なし' ? (english ? `${m.holidayJacket} + ` : `${m.holidayJacket}＋`) : '';
    const brand = m.holidayOutfitBrand || m.outfitBrand, type = m.holidayOutfitType || m.outfitType;
    const top = m.holidayTop || m.top, bottom = m.holidayBottom || m.bottom, shoes = m.holidayShoes || m.shoes;
    return english ? `${brand} ${type} (${hj}${top} + ${bottom} + ${shoes})` : `${brand}の${type}（${hj}${top}＋${bottom}＋${shoes}）`;
  }
  function friendPairScene(relation, english=false){
    const map = {
      '同僚':['仕事帰りに職場近くの通りを並んで歩きながら談笑している場面','walking side by side and chatting on a street near their workplace after work'],
      '同期':['休憩時間に職場近くのベンチで並んで一息ついている場面','taking a short break together on a bench near their workplace'],
      '同級生':['学校帰りに並んで歩きながら話している場面','walking and talking side by side on the way home from school'],
      '幼なじみ':['地元の商店街で立ち話をしている場面','catching up on the street of their hometown shopping district'],
      '趣味仲間':['趣味の集まりの帰りに並んで歩いている場面','walking together after a hobby meetup'],
      '学生時代からの友人':['久しぶりに再会してカフェの前で談笑している場面','reuniting and chatting in front of a cafe']
    };
    const e = map[relation] || map['同僚'];
    return english ? e[1] : e[0];
  }
  const FRIEND_PAIR_COUNTS = ['1枚','2枚','3枚','4枚','5枚'];
  function friendPairCountEn(v){ const n = parseInt(v, 10) || 3; return n === 1 ? 'one two-shot photo-style image' : `${n} two-shot photo-style images`; }
  function heightGapLine(a, b, english=false){
    const ha = a.heightRaw || parseInt(a.height, 10) || 171;
    const hb = b.heightRaw || parseInt(b.height, 10) || 171;
    const d = Math.abs(ha - hb);
    if(d < 3) return english ? ' The two are almost the same height.' : '2人はほぼ同じ身長。';
    const taller = ha >= hb ? a.name : b.name;
    const shorter = ha >= hb ? b.name : a.name;
    let pos, posEn;
    if(d >= 15){ pos = '頭ひとつ分近く'; posEn = 'nearly a full head'; }
    else if(d >= 8){ pos = '頭半分ほど'; posEn = 'about half a head'; }
    else { pos = '額の高さの差ほど'; posEn = 'about a forehead'; }
    if(english) return ` Height gap: about ${d}cm — ${taller} stands ${posEn} taller, and ${shorter}'s eye line falls below ${taller}'s.`;
    return `2人の身長差は約${d}cm。${taller}のほうが${pos}高く、${shorter}の目線は${taller}の顔より下に来る。`;
  }
  function buildFriendPairPrompt(c, english=false){
    const a = c.friendBase, b = c;
    if(!a) return '';
    const fo = c.friendOf || {};
    const wear = c.friendPairWear || '私服';
    const count = c.friendPairCount || '3枚';
    const scene = friendPairScene(fo.relation, english);
    const uniformUsed = wear === '職業服装' && (a.workUniform || b.workUniform);
    if(english){
      const guard = uniformUsed ? `\nDo not reproduce real organizations' insignia or logos on any uniform.` : '';
      return `[TWO REFERENCE IMAGES PROVIDED — IMPORTANT] Generate ${friendPairCountEn(count)} of the two people in the reference images.
Depict them as a natural everyday snapshot of two close friends. Both are adults aged 18 or older; keep the image non-sexual.
Era setting: ${b.eraYear || '2026'} CE. Season: ${displayValue('season', b.season) || b.season || ''}. Scene: ${scene}. Background: ${b.background}.
Reference image 1: ${a.name} — height ${a.height}, weight ${a.weight}, foot size ${a.footSize}, outfit: ${friendPairOutfitPhrase(a, wear, true)}
Reference image 2: ${b.name} — height ${b.height}, weight ${b.weight}, foot size ${b.footSize}, outfit: ${friendPairOutfitPhrase(b, wear, true)}${guard}
Visual quality/style: ${enQuality(b.quality)}.
Keep each person's face and overall look exactly the same as in his reference image, drawing him as completely the same person; never blend or swap the two people's features.
Express their height and build differences accurately, with natural positions, distance, and expressions that convey their relationship.${heightGapLine(a, b, true)} Do not write these numbers as text inside the image.
Avoid: making anyone look underage, sexual expression, changing anyone into a different person, extreme body emphasis, or broken text.
${promptTargetGuide(b, true)}`;
    }
    const guardJa = uniformUsed ? `\n制服は実在組織の記章・ロゴを正確に再現しない。` : '';
    return `【参照画像2枚あり・重要】参照画像の二人の人物のツーショット写真風画像を${count}生成してください。
仲の良い友人同士の日常スナップとして描写する。2人とも18歳以上の成人で、非性的に描く。
時代設定は${eraLabel(b.eraYear)}頃。${countryLine(b, false)}季節は${b.season || '指定なし'}。場面：${scene}。背景は${b.background}。
参照画像１：${a.name}・身長${a.height}・体重${a.weight}・足のサイズ${a.footSize}・服装は${friendPairOutfitPhrase(a, wear, false)}
参照画像２：${b.name}・身長${b.height}・体重${b.weight}・足のサイズ${b.footSize}・服装は${friendPairOutfitPhrase(b, wear, false)}${guardJa}
画質・質感は${b.quality}。
参照画像の人物の顔立ちや雰囲気は変えず完全に同一人物として描き、2人の特徴を混ぜたり入れ替えたりしない。
2人の身長差・体格差を正確に表現し、関係性が伝わる自然な立ち位置・距離感・表情にする。${heightGapLine(a, b, false)}これらの数値を画像内に文字として描き込まない。
避けること：未成年に見える表現、性的表現、別人化、極端な身体強調、文字崩れ。
${promptTargetGuide(b, false)}`;
  }
  function renderFootCfgPanel(){
    const box = document.getElementById('footSceneCfg');
    if(!box) return;
    const isFeet = !!(current && refSheetKind(currentDerivedType()) === 'feet');
    box.classList.toggle('hidden', !isFeet);
    if(!isFeet) return;
    const cfg = footCfg(current);
    const form = document.getElementById('footCfgForm');
    const randomLabel = uiLang==='en' ? 'Random (auto)' : 'ランダム（おまかせ）';
    form.innerHTML = FOOT_CFG_AXES.map(([axis, ja, en])=>{
      const opts = ['ランダム'].concat(footAxisOptions(axis));
      return `<label class="field"><span>${uiLang==='en' ? en : ja}</span><select data-foot-axis="${axis}">${opts.map(v=>`<option value="${v}"${cfg[axis]===v?' selected':''}>${v==='ランダム' ? randomLabel : v}</option>`).join('')}</select></label>`;
    }).join('');
    form.querySelectorAll('[data-foot-axis]').forEach(sel=>{
      sel.onchange = () => { const cfg2 = footCfg(current); cfg2[sel.dataset.footAxis] = sel.value; current.footScene = cfg2; renderAll(); };
    });
  }
  function parseCharFromPrompt(text){
    const t = String(text || '');
    const out = {};
    const longest = (pool)=>{ const hits = (pool||[]).filter(v=>v && t.includes(String(v))); return hits.sort((a,b)=>String(b).length-String(a).length)[0]; };
    const mName = t.match(/成人男性キャラクター「([^」]+)」/); if(mName) out.name = mName[1];
    const mEra = t.match(/撮影年代：(\d{3,4})年/) || t.match(/時代設定は(\d{3,4})年/); if(mEra) out.eraYear = mEra[1];
    const mAge = t.match(/（現在(\d+)歳）/) || t.match(/(\d+)歳、/); if(mAge) out.age = Number(mAge[1]);
    const mH = t.match(/身長(\d{3})cm/); if(mH){ out.height = mH[1] + 'cm'; out.heightRaw = Number(mH[1]); }
    const mW = t.match(/体重(\d{2,3})kg/); if(mW) out.weight = mW[1] + 'kg';
    const mF = t.match(/足のサイズは(\d{2}(?:\.\d)?)cm/) || t.match(/足サイズ(\d{2}(?:\.\d)?)cm/);
    if(mF) out.footSize = mF[1] + 'cm';
    const mMbti = t.match(/\b([IE][NS][TF][JP])\b/); if(mMbti) out.mbti = mMbti[1];
    const mTb = t.match(/涙袋は([^。、]+)/); if(mTb && (pools.tearBags || []).includes(mTb[1])) out.tearBags = mTb[1];
    if(out.bangs === undefined) out.bangs = '指定なし';
    if(out.hairFinish === undefined) out.hairFinish = '指定なし';
    if(out.hairVolume === undefined) out.hairVolume = '標準的な毛量';
    if(out.bodyAsym === undefined) out.bodyAsym = 'なし';
    if(out.posture === undefined) out.posture = '自然な立ち姿';
    const mBio = t.match(/ひとこと：「([^」]+)」/); if(mBio){ out.bioText = mBio[1]; out.bioCaptionMode = '情報欄に入れる'; }
    const mTr = t.match(/筋トレ習慣「([^」]+)」/); if(mTr && TRAINING_LEVELS.some(x=>x[0]===mTr[1])) out.trainingLevel = mTr[1];
    if(out.trainingLevel === undefined && !/筋トレ習慣「/.test(t)) out.trainingLevel = 'なし';
    const mBw = t.match(/基準服装は(?:(.+?)の)?([^の。\n]+)の(ボクサーパンツ|ショートショーツ|スポーツスパッツ)のみ/);
    if(mBw){
      out.baseWearType = mBw[3];
      if(mBw[2] && pools.boxerColors.includes(mBw[2])) out.boxerColor = mBw[2];
      if(mBw[1] && pools.boxerBrands.includes(mBw[1])) out.boxerBrand = mBw[1];
      if(!mBw[1]) out.boxerBrand = '指定しない';
    }
    const mSport = t.match(/プロスポーツ選手（([^）]+)）/); if(mSport) out.sportName = mSport[1];
    const scan = [
      ['nationality', pools.nationalities], ['ethnicity', pools.ethnicities],
      ['role', (typeof OCCUPATIONS !== 'undefined') ? OCCUPATIONS.map(o=>o[0]) : []],
      ['vibe', pools.vibes], ['bodyType', pools.bodyTypes],
      ['facePreset', pools.facePresets], ['ageAppearance', pools.ageAppearances], ['faceLine', pools.faceLines],
      ['eyes', pools.eyes], ['eyebrow', pools.eyebrows], ['eyebrowDensity', pools.eyebrowDensities], ['eyelid', pools.eyelids], ['eyeShape', pools.eyeShapes], ['eyelash', pools.eyelashes],
      ['jawChin', pools.jawChins], ['jawAngle', pools.jawAngles], ['ear', pools.ears], ['forehead', pools.foreheads], ['hairline', pools.hairlines], ['cheek', pools.cheeks], ['dimple', pools.dimples], ['mole', pools.moles], ['hairTexture', pools.hairTextures], ['eyeBags', pools.eyeBagsPool], ['adamsApple', pools.adamsApples], ['lipTone', pools.lipTones], ['browRidge', pools.browRidges], ['facialHairGroom', pools.facialHairGrooms],
      ['nose', pools.nose], ['mouth', pools.mouth],
      ['lips', pools.lips], ['mouthPos', pools.mouthPos], ['faceSpacing', pools.faceSpacings], ['faceRatio', pools.faceRatios], ['faceAsym', pools.faceAsyms],
      ['teethAlign', pools.teethAligns], ['teethColor', pools.teethColors],
      ['skin', pools.skin], ['facialHair', pools.facialHairs || pools.facialHair], ['glasses', pools.glasses],
      ['hairColor', pools.hairColors], ['hairStyle', pools.hairStyles], ['bodyAsym', BODY_ASYMS.map(x=>x[0]).slice(1)], ['posture', POSTURES.map(x=>x[0]).slice(1)], ['bangs', pools.bangs.slice(1)], ['hairFinish', pools.hairFinishes.slice(1)], ['hairVolume', pools.hairVolumes], ['facePreset', pools.facePresets],
      ['footShape', pools.footShapes], ['footWidth', FOOT_WIDTHS.map(x=>x[0])], ['footFeature', FOOT_FEATURES.map(x=>x[0])],
      ['hipShape', pools.hipShapes],
      ['soleType', SOLE_TYPES.map(x=>x[0])], ['toeLine', TOE_LINES.map(x=>x[0])], ['soleWrinkle', SOLE_WRINKLES.map(x=>x[0])], ['toeCurl', TOE_CURLS.map(x=>x[0])],
      ['shoulderWidth', pools.shoulderWidths.map(v=>`肩幅は${v}`)], ['waistPos', pools.waistPositions.map(v=>`腰の位置は${v}`)],
      ['legLength', pools.legLengths.map(v=>`脚の長さは${v}`)], ['armLength', pools.armLengths.map(v=>`腕は${v}、`)],
      ['frame', pools.frames.map(v=>`骨格は${v}、`)], ['neckLength', pools.neckLengths.map(v=>`首は${v}、`)], ['limbSize', pools.limbSizes.map(v=>`手足のサイズ感は${v}`)],
      ['background', pools.backgrounds], ['lighting', pools.lighting], ['quality', pools.qualities],
      ['season', ['春','夏','秋','冬']]
    ];
    for(const [key, pool] of scan){
      const hit = longest(pool);
      if(hit !== undefined){
        out[key] = ['shoulderWidth','waistPos','legLength','armLength','frame','neckLength','limbSize'].includes(key)
          ? hit.replace(/^肩幅は|^腰の位置は|^脚の長さは|^腕は|^骨格は|^首は|^手足のサイズ感は/,'').replace(/、$/,'')
          : hit;
      }
    }
    for(const k in FACE_EXTRA_DEFAULTS){ if(out[k] === undefined) out[k] = FACE_EXTRA_DEFAULTS[k]; }
    const sdHits = (pools.skinDetails || []).filter(v=>v !== 'なし（クリアな肌）' && t.includes(v));
    out.skinDetail = sdHits[0] || 'なし（クリアな肌）';
    out.skinDetail2 = sdHits[1] || 'なし（クリアな肌）';
    if(typeof SPORT_EXP_POOL !== 'undefined'){
      const histLine = (t.match(/経験競技：([^\n]+?)。/) || [])[1] || t;
      if(/経験競技：なし/.test(t)){ out.sportsHistory = []; }
      else {
        const hist = [];
        const stIdx = (st)=>SPORT_STAGES.indexOf(st);
        for(const m of histLine.matchAll(/([^\s、。（／：]+)（(幼稚園|小学校|中学校|高校|大学|社会人)(?:〜(幼稚園|小学校|中学校|高校|大学|社会人))?(・体格影響なし|・影響しっかり|・影響ほどよく|・影響名残)?）/g)){
          if(SPORT_EXP_POOL.includes(m[1]) || m[1] === out.sportName){
            const from = stIdx(m[2]); const to = m[3] ? stIdx(m[3]) : from;
            const st = m[4]==='・体格影響なし' ? 0 : m[4]==='・影響しっかり' ? 2.2 : m[4]==='・影響ほどよく' ? 1.2 : m[4]==='・影響名残' ? 0.5 : Math.round((to - from + 1) * 0.7 * 100) / 100;
            hist.push({name: m[1], from, to, strength: st});
          }
        }
        if(hist.length) out.sportsHistory = hist.slice(0, 2);
      }
    }
    return out;
  }
  function loadFromPromptText(text){
    const parsed = parseCharFromPrompt(text);
    if(!parsed.name && !parsed.heightRaw && !parsed.role){ alert(T('restoreNotFound')); return; }
    const occSel = document.getElementById('initialOccupation');
    const eraSel = document.getElementById('initialEraYear');
    const oldOcc = occSel ? occSel.value : null;
    const oldEra = eraSel ? eraSel.value : null;
    try{
      if(occSel && parsed.role && Array.from(occSel.options).some(o=>o.value===parsed.role)) occSel.value = parsed.role;
      if(eraSel && parsed.eraYear && Array.from(eraSel.options).some(o=>o.value===String(parsed.eraYear))) eraSel.value = String(parsed.eraYear);
      const c = generateCharacter('full');
      Object.assign(c, parsed);
      c._limbFootAdj = true;
      c.id = uniqId();
      currentGroup = null; activeMember = 0;
      current = c;
      renderAll(); switchTab('result');
      els.status.textContent = T('restoreDone');
    }catch(e){ alert(T('restoreFailed')); }
    finally{
      if(occSel && oldOcc !== null) occSel.value = oldOcc;
      if(eraSel && oldEra !== null) eraSel.value = oldEra;
    }
  }
  function renderFriendPairControls(){
    const wearSel = document.getElementById('friendPairWearSel');
    const cntSel = document.getElementById('friendPairCountSel');
    if(!wearSel || !cntSel) return;
    const wearOpts = ['私服','職業服装'];
    const wearLabels = uiLang==='en' ? {'私服':'Casual outfit','職業服装':'Work outfit'} : {'私服':'私服','職業服装':'職業服装'};
    wearSel.innerHTML = wearOpts.map(v=>`<option value="${v}">${wearLabels[v]}</option>`).join('');
    cntSel.innerHTML = FRIEND_PAIR_COUNTS.map(v=>`<option value="${v}">${uiLang==='en' ? (parseInt(v,10)+' image'+(parseInt(v,10)>1?'s':'')) : v}</option>`).join('');
    if(current){ wearSel.value = current.friendPairWear || '私服'; cntSel.value = current.friendPairCount || '3枚'; }
  }
  /* ===== V3.1 線画プレビュー（密テンプレート方式・髪なし） ===== */
  function renderProfile(){
    if(!current){ const ib0=document.getElementById('innerAboveTabs'); if(ib0) ib0.innerHTML=''; els.profileView.innerHTML=`<p class="notice">${uiLang==='ja'?'まだ結果がありません。':'No result yet.'}</p>`; els.promptBox.value=''; document.getElementById('outfitPromptBox').value=''; document.getElementById('scenePromptBox').value=''; return; }
    if(!current.personality && current.mbti) current.personality = mbtiDescription(current.mbti, false);
    migrateUniformFields(current);
    if(current.cardWearMode === '提案服装') current.cardWearMode = '職業服装';
    if(!current.lips) current.lips = '標準的な厚さの唇';
    if(!current.mouthPos) current.mouthPos = '標準的な位置・大きさの口';
    if(!current.faceSpacing) current.faceSpacing = '標準的な配置';
    if(!current.faceRatio) current.faceRatio = '標準的なバランスの比率';
    if(!current.faceAsym) current.faceAsym = 'ほぼ対称（ごく自然な左右差）';
    if(!current.sportsHistory) current.sportsHistory = generateSportsHistory(Number(current.age), current.role, current.sportName);
    if(!current.ikemenIndexMode) current.ikemenIndexMode = '表示しない';
    if(!current.bodyHairMode) current.bodyHairMode = '詳細指定';
    if(!current.shoulderWidth){ const fx = chooseFrameAxes(current); Object.assign(current, fx); }
    if(!current.hipShape) current.hipShape = chooseHipShape(current);
    if(!current.teethAlign) current.teethAlign = chooseTeethAlign(current.age);
    if(!current.teethColor) current.teethColor = chooseTeethColor(current.age, current.teethAlign);
    if(!current.footWidth) current.footWidth = calcFootWidth(current);
    if(!current.footFeature) current.footFeature = chooseFootFeature(current);
    if(EYE_MIGRATION[current.eyes]){ const em = EYE_MIGRATION[current.eyes]; if(!current.eyelid) current.eyelid = em.eyelid; if(!current.eyeShape) current.eyeShape = em.eyeShape; current.eyes = em.eyes; }
    if(!current.eyebrow) current.eyebrow = chooseEyebrow(current.vibe);
    if(!current.eyelid) current.eyelid = chooseEyelid(current.nationality, current.ethnicity);
    if(!current.eyeShape) current.eyeShape = chooseEyeShape();
    if(!current.eyelash) current.eyelash = chooseEyelash();
    if(!current.jawChin){ const fx = chooseFaceExtras(current); for(const k in fx){ if(current[k] === undefined) current[k] = fx[k]; } }
    if(!current.baseWearType) current.baseWearType = 'ボクサーパンツ';
    if(!current.trainingLevel) current.trainingLevel = 'なし';
    if(!current.bioText) current.bioText = buildBioHook(current);
    ensureProfileMeasurements(current);
    if(!current.bloodType || !current.maritalText) generateInnerProfile(current);
    else if(!current.principleText) generateInnerProfile(current, ['principle','unforgivable','fuzoku','gamble']);
    else if(!current.drinkText) generateInnerProfile(current, ['firstexp','weekfreq','drink','smoke']);
    else if(!current.assetText) generateInnerProfile(current, ['lovecount','asset']);
    else if(!current.selfFreqText) generateInnerProfile(current, ['weekfreq','selffreq']);
    else if(!current.fashionSenseText) generateInnerProfile(current, ['fashionsense']);
    if(!current.bangs) current.bangs = '指定なし';
    if(!current.hairFinish) current.hairFinish = '指定なし';
    if(!current.hairVolume) current.hairVolume = '標準的な毛量';
    if(!current.soleType) current.soleType = chooseSoleType(current);
    if(!current.soleWrinkle) current.soleWrinkle = chooseSoleWrinkle(current);
    if(!current.toeLine) current.toeLine = chooseToeLine(current);
    if(!current.toeCurl) current.toeCurl = weighted(TOE_CURLS.map(x=>[x[0], x[1]]));
    if(current.limbSize === '大きめ' && !current._limbFootAdj){
      const fs0 = parseFloat(current.footSize);
      if(fs0){ current.footSize = Math.min(31.0, Math.round((fs0 + 0.5) * 2) / 2).toFixed(1) + 'cm'; }
      current._limbFootAdj = true;
    }
    const L=T('rows');
    const mainWear = uiLang==='en' ? `${underwearDesc(current, true)} only` : `${underwearDesc(current, false)}のみ`;
    const sections = [
      ['basic', L.basic, [[L.name,current.name,'name'],[L.age,displayValue('age',current.age),'age'],[L.era, uiLang==='en' ? `${current.eraYear || '2026'} (${eraProfile(current.eraYear || '2026').labelEn})${current.season ? ` / ${displayValue('season', current.season) || current.season}` : ''}` : `${eraLabel(current.eraYear)}（${eraProfile(current.eraYear || '2026').labelJa}）${current.season ? `・${current.season}` : ''}`,'eraYear'],[L.natEth,`${displayValue('nationality',current.nationality)} / ${displayValue('ethnicity',current.ethnicity)}`,'nationality,ethnicity'],[L.roleVibe,`${displayValue('role',current.role)} / ${displayValue('vibe',current.vibe)}${current.occupationMode ? `（${uiLang==='en' ? displayValue('occupationMode', current.occupationMode) || current.occupationMode : current.occupationMode}）` : ''}`,'role,vibe'],[uiLang==='en' ? 'Sports Background' : '経験競技スポーツ', sportsHistoryText(current, uiLang==='en'), 'sportsHistory']].concat(current.groupSetting ? [[L.group, `${displayValue('groupSetting',current.groupSetting) || current.groupSetting} / ${displayValue('groupPosition',current.groupPosition) || current.groupPosition}`]] : []).concat(current.friendOf ? [[L.friendRow, friendRelationText(current, uiLang==='en')]] : []).concat([[L.mbti,`<span class="mini-badge">${mbtiDisplay(current)}</span>`,'mbti']])],
      buildInnerSection(current, L),
      ['face', L.faceSection, [[L.face,`${displayValue('facePreset',current.facePreset)} / ${displayValue('ageAppearance',current.ageAppearance)}`,'facePreset,ageAppearance'],[L.faceLine,displayValue('faceLine',current.faceLine),'faceLine'],[slotLabel('eyebrow','眉'),`${displayValue('eyebrow',current.eyebrow||'標準的なゆるいアーチ眉')}／${displayValue('eyebrowDensity',current.eyebrowDensity||'標準的な濃さの眉')}`,'eyebrow,eyebrowDensity'],[uiLang==='en' ? 'Eyelid / Shape / Impression' : 'まぶた / 目の形 / 印象',`${displayValue('eyelid',current.eyelid||'末広二重')}／${displayValue('eyeShape',current.eyeShape||'標準的な目の形')}／${displayValue('eyes',current.eyes)}`,'eyelid,eyeShape,eyes'],[uiLang==='en' ? 'Eyelashes / Tear Bags' : 'まつ毛 / 涙袋',`${displayValue('eyelash',current.eyelash||'標準的な長さのまつ毛')}／${displayValue('tearBags',current.tearBags)}`,'eyelash,tearBags'],[L.nose,displayValue('nose',current.nose),'nose'],[slotLabel('mouth','基本表情'),displayValue('mouth',current.mouth),'mouth'],[uiLang==='en' ? 'Teeth Align / Color' : '歯並び / 歯の色', `${current.teethAlign||'ほぼ整った歯列'} / ${current.teethColor||'自然な白さの歯'}`, 'teethAlign,teethColor'],[slotLabel('lips','唇の形状'),displayValue('lips',current.lips || '標準的な厚さの唇'),'lips'],[slotLabel('mouthPos','口の位置'),displayValue('mouthPos',current.mouthPos || '標準的な位置・大きさの口'),'mouthPos'],[slotLabel('faceSpacing','パーツ配置'),displayValue('faceSpacing',current.faceSpacing || '標準的な配置'),'faceSpacing'],[slotLabel('faceRatio','目鼻口比率'),displayValue('faceRatio',current.faceRatio || '標準的なバランスの比率'),'faceRatio'],[slotLabel('faceAsym','顔の左右差'),displayValue('faceAsym',current.faceAsym || 'ほぼ対称（ごく自然な左右差）'),'faceAsym'],[uiLang==='en' ? 'Chin / Jaw' : '顎先 / エラ',`${displayValue('jawChin',current.jawChin||'標準的な顎先')}／${displayValue('jawAngle',current.jawAngle||'ほどよく張ったエラ')}`,'jawChin,jawAngle'],[uiLang==='en' ? 'Ears / Brow' : '耳 / 彫り',`${displayValue('ear',current.ear||'標準的な耳')}／${displayValue('browRidge',current.browRidge||'彫りは標準的')}`,'ear,browRidge'],[uiLang==='en' ? 'Forehead / Hairline' : '額 / 生え際',`${displayValue('forehead',current.forehead||'標準的な広さの額')}／${displayValue('hairline',current.hairline||'直線的な生え際')}`,'forehead,hairline'],[uiLang==='en' ? 'Cheeks / Dimples' : '頬 / えくぼ',`${displayValue('cheek',current.cheek||'標準的な頬')}／${displayValue('dimple',current.dimple||'えくぼなし')}`,'cheek,dimple'],[uiLang==='en' ? 'Mole / Under-eye' : 'ほくろ / クマ',`${displayValue('mole',current.mole||'ほくろなし')}／${displayValue('eyeBags',current.eyeBags||'クマなし')}`,'mole,eyeBags'],[uiLang==='en' ? 'Throat / Lip Tone' : 'のどぼとけ / 唇の血色',`${displayValue('adamsApple',current.adamsApple||'標準的なのどぼとけ')}／${displayValue('lipTone',current.lipTone||'標準的な血色の唇')}`,'adamsApple,lipTone'],[L.skin,displayValue('skin',current.skin),'skin'],[uiLang==='en' ? 'Skin Details' : '肌の特徴',`${displayValue('skinDetail',current.skinDetail || 'なし（クリアな肌）')}${current.skinDetail2 && current.skinDetail2 !== 'なし（クリアな肌）' ? `／${displayValue('skinDetail',current.skinDetail2)}` : ''}`,'skinDetail,skinDetail2'],[L.facialHair,`${displayValue('facialHair',current.facialHair)}${current.facialHair!=='なし' ? `（${displayValue('facialHairGroom',current.facialHairGroom||'自然に整えている')}）` : ''}`,'facialHair,facialHairGroom'],[L.glasses, displayValue('glasses', current.glasses || 'なし'),'glasses'],[L.hair,`${displayValue('hairColor',current.hairColor)}・${displayValue('hairStyle',current.hairStyle)}（${displayValue('hairTexture',current.hairTexture||'直毛')}）`,'hairColor,hairStyle,hairTexture'],[uiLang==='en' ? 'Bangs / Styling / Volume' : '前髪・整髪・毛量',`${displayValue('bangs',current.bangs||'指定なし')}／${displayValue('hairFinish',current.hairFinish||'指定なし')}／${displayValue('hairVolume',current.hairVolume||'標準的な毛量')}`,'bangs,hairFinish,hairVolume']]],
      ['body', L.bodySection, [[L.hw,`${current.height} / ${current.weight}`,'height,weight'],[L.body,displayValue('bodyType',current.bodyType),'bodyType'],[uiLang==='en' ? 'Physique Guide' : '体格の目安', `${uiLang==='en' ? `about ${headCount(current)} heads tall` : `約${headCount(current)}頭身`}`],[uiLang==='en' ? 'Shoulders' : '肩幅', current.shoulderWidth || '普通', 'shoulderWidth'],[uiLang==='en' ? 'Waist Pos / Legs / Arms' : '腰位置 / 脚長 / 腕長', `${current.waistPos||'標準'} / ${current.legLength||'標準'} / ${current.armLength||'標準'}`, 'waistPos,legLength,armLength'],[uiLang==='en' ? 'Frame / Neck / Limbs' : '骨格 / 首 / 手足サイズ感', `${current.frame||'標準'} / ${current.neckLength||'標準'} / ${current.limbSize||'標準'}`, 'frame,neckLength,limbSize'],[uiLang==='en' ? 'Hip Shape' : '臀部の形状', current.hipShape || '標準的な丸みの臀部', 'hipShape'],[uiLang==='en' ? 'Muscle Development' : '発達部位', muscleSummary(current, uiLang==='en')],[uiLang==='en' ? 'Training Habit' : '筋トレ習慣', current.trainingLevel || 'なし', 'trainingLevel'],[uiLang==='en' ? 'Muscle Development' : '発達部位', (muscleLine(current, false) || 'なし（競技経験の影響なし）').replace(/^発達部位：/,'').split('。')[0], 'muscleTone'],[L.foot,current.footSize,'footSize'],[uiLang==='en' ? 'Foot Width' : 'ワイズ（足幅）', current.footWidth || calcFootWidth(current), 'footWidth'],[L.footShape,displayValue('footShape',current.footShape),'footShape'],[uiLang==='en' ? 'Foot Traits' : '足の特徴', current.footFeature || '特徴なし・整った足', 'footFeature'],[uiLang==='en' ? 'Sole Type' : '足裏タイプ', current.soleType || '均整なめらか型', 'soleType'],[uiLang==='en' ? 'Toe Alignment' : '指の並び・向き', current.toeLine || 'まっすぐ前を向いたそろった並び', 'toeLine'],[uiLang==='en' ? 'Creases / Curl' : 'しわ・反り', `${current.soleWrinkle || '標準的なしわ'}／${current.toeCurl || '指がフラットに伸びた状態'}`, 'soleWrinkle,toeCurl']]],
      ['bodyhair', L.bodyHairSection, [[L.bodyHair, buildBodyHairSummary(current, uiLang==='en'),'bodyHairAll']]],
      ['main', L.mainSection, [[L.main, mainWear, (current.mainWearMode||'ボクサーパンツのみ')!=='時代に合った下着の種類' ? 'baseWearType,boxerColor,boxerBrand' : 'underwearType,underwearColor,boxerBrand']]],
      ['outfit', L.outfitSection, (()=>{
        const en2 = uiLang==='en';
        const B=(b)=>b?`${b}・`:'';
        const isSuit = ['紺スーツ','黒スーツ','グレースーツ','三つ揃いスーツ'].includes(current.outfitType);
        const rows=[[L.weekdayOutfit,`${displayValue('outfitBrand',current.outfitBrand)}・${displayValue('outfitType',current.outfitType)}`,'outfitType']];
        rows.push(...buildUniformEditRows(current, L));
        if(!current.workUniform){
          rows.push([en2?'Work Outer':'上着（平日）', `${current.coat?`${B(current.outerBrand)}${current.coat}／中は`:''}${current.jacket||'指定なし'}`, 'jacket']);
          rows.push([en2?'Work Top':'トップス（平日）', `${B(current.topBrand)}${current.top}`, 'top']);
          rows.push([en2?'Work Bottom':'ボトムス（平日）', `${B(current.bottomBrand)}${current.bottom}`, 'bottom']);
          rows.push([en2?'Work Shoes':'靴（平日）', `${B(current.shoesBrand)}${current.shoes}`, 'shoes']);
          if(isSuit){
            rows.push([en2?'Tie':'ネクタイ', current.tie||'ノータイ', 'tie']);
            rows.push([en2?'Suit Silhouette':'シルエット', current.suitSilhouette||'—', 'suitSilhouette']);
          }
        }
        rows.push([L.sock,`${displayValue('sockBrand',current.sockBrand)}・${displayValue('sockType',current.sockType)}・${displayValue('sockColor',current.sockColor)}`,'sockType']);
        rows.push([en2?'Accessories (Work)':'アクセサリー（平日）', ((current.accessories||[]).join('・')||'なし')+accWorkNote(current), 'accessoriesEdit']);
        if(current.holidayOutfitType){
          rows.push([L.holidayOutfit,`${displayValue('outfitBrand',current.holidayOutfitBrand)}・${displayValue('outfitType',current.holidayOutfitType)}${current.holidayGapSuit?'⚡':''}`,'holidayOutfitType']);
          rows.push([en2?'Casual Outer':'上着（休日）', `${current.holidayOuterBrand?`${current.holidayOuterBrand}・`:''}${current.holidayJacket||'指定なし'}`, 'holidayJacket']);
          rows.push([en2?'Casual Top':'トップス（休日）', `${current.holidayTopBrand?`${current.holidayTopBrand}・`:''}${current.holidayTop||''}`, 'holidayTop']);
          rows.push([en2?'Casual Bottom':'ボトムス（休日）', `${current.holidayBottomBrand?`${current.holidayBottomBrand}・`:''}${current.holidayBottom||''}`, 'holidayBottom']);
          rows.push([en2?'Casual Shoes':'靴（休日）', `${current.holidayShoesBrand?`${current.holidayShoesBrand}・`:''}${current.holidayShoes||''}`, 'holidayShoes']);
          rows.push([L.holidaySock,`${displayValue('sockBrand',current.holidaySockBrand)}・${displayValue('sockType',current.holidaySockType)}・${displayValue('sockColor',current.holidaySockColor)}`]);
          rows.push([en2?'Accessories (Casual)':'アクセサリー（休日）', ((current.holidayAccessories||[]).join('・')||'なし'), 'holidayAccessoriesEdit']);
          const memo=[current.holidayGapSuit?(en2?'Suit even on days off':'休日なのにスーツ（本人は私服のつもり）'):'',current.holidayStyleNote||current.styleNote,current.muscleFashionNote,current.senseFashionNote].filter(Boolean).join('。');
          rows.push([en2?'Styling Memo':'着こなしメモ', memo||'—', 'holidayStyleNote']);
        }
        return rows;
      })()],
      ['output', L.outputSection, [[L.background,displayValue('background',current.background),'background'],[L.output,`${displayValue('outputType',current.outputType)} / ${displayValue('count',current.count)}`],[L.promptTarget,`<span class="mini-badge">${current.promptTarget || 'ChatGPT'}</span>`],[L.imageText, current.captionMode==='表記しない' ? captionModeDisplay(current.captionMode) : `${captionModeDisplay(current.captionMode)} / ${getCaptionFieldLabelsArray(current, uiLang==='en').join(', ')}`],[uiLang==='en'?'Face Preset in Prompt':'顔立ちプリセット出力', current.facePresetOut||'含める', 'facePresetOut'],[L.cardSetting, `${displayValue('cardStyle',current.cardStyle)} / ${current.cardRarity} / ${displayValue('cardTheme',current.cardTheme)} / ${displayValue('cardLayout',current.cardLayout)} / ${displayValue('cardWearMode',current.cardWearMode || 'ボクサーパンツのみ')} / ${displayValue('cardEffect',cardEffectByRarity(current.cardRarity))}`]]],
      ['scene', L.sceneSection, [[L.scene,displayValue('sceneIdea',current.sceneIdea),'sceneIdea']]]
    ];
    const pcIcons = {basic:'👤', inner:'🎭', face:'🙂', body:'📐', bodyhair:'🧔', main:'🩳', outfit:'👕', output:'🖨️', scene:'🎬'};
    const pcSpan2 = {output:true, scene:true, inner:true};
    const cpMode = current.catchphraseMode || '結果画面のみ表示';
    const measurementHtml = `<div class="measurement-panel">
      <div class="measurement-title">${uiLang==='en' ? 'PROFILE-ONLY A / B / C' : '完成プロフィール限定 A / B / C'}</div>
      <div class="measurement-row"><b>A</b><span class="measurement-value">${Number(current.measurementA).toFixed(1)}cm</span><button class="measurement-reroll" data-p-dice="measurementA" title="${uiLang==='en'?'Reroll A only':'Aだけ再抽選'}">🎲 ${uiLang==='en'?'Reroll A':'Aを再抽選'}</button></div>
      <div class="measurement-row"><b>B</b><span class="measurement-value">${Number(current.measurementB).toFixed(1)}cm</span><button class="measurement-reroll" data-p-dice="measurementB" title="${uiLang==='en'?'Reroll B only':'Bだけ再抽選'}">🎲 ${uiLang==='en'?'Reroll B':'Bを再抽選'}</button></div>
      <div class="measurement-row"><b>C</b><span class="measurement-value">${profileMeasurementCLabel(current.measurementC, uiLang==='en')}</span><button class="measurement-reroll" data-p-dice="measurementC" title="${uiLang==='en'?'Reroll C only':'Cだけ再抽選'}">🎲 ${uiLang==='en'?'Reroll C':'Cを再抽選'}</button></div>
    </div>`;
    const cpHtml = (cpMode !== '表示しない' ? `<div class="catchphrase">――${catchphrase(current, uiLang==='en')}</div>` : '') + `<div class="bio-hook" style="margin:0 0 12px;font-size:14px;color:#cfe0f5;line-height:1.6;border-left:3px solid var(--blue);padding-left:10px">${uiLang==='en' ? bioLine(current, true) : (current.bioText || bioLine(current, false))}<br><span style="font-size:12px;color:#9fb0c7">${nameKana(current)}：${current.height}／${current.weight}／${String(current.footSize).endsWith('cm') ? current.footSize : current.footSize + 'cm'}</span> <button class="pf-btn" data-p-dice="bioText" title="🎲">🎲</button></div>` + measurementHtml;
    const badges = cpHtml + `<div class="badge-row">
      <span class="badge-mbti">★ ${mbtiDisplay(current)}</span>
      <span class="badge-target">⚡ Prompt Target: ${current.promptTarget || 'ChatGPT'}</span>
      <span class="badge-cardinfo">🃏 ${displayValue('cardStyle',current.cardStyle)} / ${current.cardRarity || 'R'}</span>
    </div>`;
    const bd = rarityBreakdown(current);
    const rr = scoreRarity(current);
    const ikm = current.ikemenIndexMode === '表示する' ? (()=>{ const sc = ikemenScore(current); return `<div class="subcard" style="margin:0 0 12px"><h3>${uiLang==='en' ? 'Handsome Index' : 'イケメン指数'} <span class="pill" style="margin-left:8px">${sc} / 100 — ${ikemenRank(sc, uiLang==='en')}</span></h3><div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:6px">${ikemenBreakdown(current).map(([l,d])=>`<span class="pill">${l} ${d>0?'+':''}${d}</span>`).join('') || `<span class="notice">${uiLang==='en' ? 'All standard features.' : 'すべて標準的な造形。'}</span>`}</div><p class="notice" style="margin:6px 0 0">${uiLang==='en' ? 'Standard features score exactly 50. Computed from 19 facial axes; never written into prompts.' : '標準的な造形がちょうど50ptになる設計です（顔の19軸から算出。プロンプトには含めません）。'}</p></div>` })() : '';
    const bdHtml = ikm + `<div class="subcard" style="margin:0 0 12px"><h3>${uiLang==='en' ? 'Rarity Breakdown' : 'レア内訳'} <span class="pill" style="margin-left:8px">${rr[0]} pt / ${rr[1]}</span></h3><div style="display:flex;flex-wrap:wrap;gap:4px">${bd.length ? bd.map(([l,p])=>`<span class="pill">${l} +${p}</span>`).join('') : `<span class="notice">${uiLang==='en' ? 'No rare points this time.' : '今回はレア該当なし。'}</span>`}</div></div>`;
    const pfBtns = (pk)=>{ const hasPool = pk === 'sportsHistory' || pk.split(',').some(k=>{ const p = slotEditPool(k); return p && p.length; }); return `<span class="pf-actions">${hasPool ? `<button class="pf-btn" data-p-edit="${pk}" title="${T('editTitle')}">✎</button>` : ''}<button class="pf-btn" data-p-dice="${pk}" title="🎲">🎲</button></span>`; };
    const renderPCard = ([key,title,rows])=>`<div class="profile-card pc-${key}"><h3><span class="pc-icon">${pcIcons[key]||''}</span>${title}${key==='scene' ? ` <button class="dice" style="position:static;margin-left:auto" data-scene-edit title="${T('editTitle')}">✎</button>` : ''}</h3><div class="pc-rows">${rows.map(r=>{const [k,v,pk,cc]=r; if(k==='__HEAD__') return v; const cls=cc?` ${cc}`:''; return pk ? `<div class="kv kv3${cls}"><b>${k}</b><span>${v}</span>${pfBtns(pk)}</div>` : `<div class="kv${cls}"><b>${k}</b><span>${v}</span></div>`;}).join('')}</div></div>`;
    const bySec = k => sections.find(s=>s[0]===k);
    const topPair = ['face','body'].map(k=>bySec(k)).filter(Boolean).map(renderPCard).join('');
    const leftCards = ['bodyhair','main','outfit'].map(k=>bySec(k)).filter(Boolean).map(renderPCard).join('');
    const rightCards = ['output','scene'].map(k=>bySec(k)).filter(Boolean).map(renderPCard).join('');
    els.profileView.innerHTML = badges + bdHtml + `<div class="profile-top2">` + topPair + `</div><div class="profile-cols"><div class="pcol">` + leftCards + `</div><div class="pcol">` + rightCards + `</div></div>`;
    const innerBox = document.getElementById('innerAboveTabs');
    if(innerBox){
      const basicSec = bySec('basic'), innerSec = bySec('inner');
      innerBox.innerHTML = (basicSec ? renderPCard(basicSec) : '') + (innerSec ? renderPCard(innerSec) : '');
    }
    const bindRoots = [els.profileView, document.getElementById('innerAboveTabs')].filter(Boolean);
    bindRoots.forEach(root=>{
      root.querySelectorAll('[data-p-dice]').forEach(b=>{ b.onclick = () => rerollProfile(b.dataset.pDice.split(',')[0]); });
      root.querySelectorAll('[data-p-edit]').forEach(b=>{ b.onclick = () => openProfileEdit(b); });
      const mfBtn = root.querySelector('[data-make-friend]');
      if(mfBtn) mfBtn.onclick = () => makeInnerFriend();
      root.querySelectorAll('[data-icat]').forEach(b=>{ b.onclick = () => { innerCatShow[b.dataset.icat] = !innerCatShow[b.dataset.icat]; renderAll(); }; });
      const allBtn = root.querySelector('[data-icat-all]');
      if(allBtn) allBtn.onclick = () => { const on = allBtn.dataset.icatAll === '1'; INNER_CATS.forEach(([k])=>{ innerCatShow[k] = on; }); renderAll(); };
    });
    const ue = els.profileView.querySelector('[data-uniform-edit]');
    if(ue) ue.onchange = () => applyUniformVariant(ue.value);
    const he = els.profileView.querySelector('[data-headwear-edit]');
    if(he) he.onchange = () => { current.headwearOn = he.value === 'on'; renderAll(); };
    const se = els.profileView.querySelector('[data-scene-edit]');
    if(se) se.onclick = () => {
      const card = se.closest('.profile-card');
      const kv = card.querySelector('.kv span'); if(!kv || card.querySelector('textarea')) return;
      const ta = document.createElement('textarea');
      ta.value = current.sceneIdea || '';
      ta.style.cssText = 'width:100%;min-height:70px;background:#0d1a2c;border:1px solid var(--gold);border-radius:8px;color:#eaf2ff;padding:8px;font-size:13px';
      const commit = () => { const v = ta.value.trim(); if(v) current.sceneIdea = v; renderAll(); };
      ta.onblur = commit;
      ta.onkeydown = e => { if(e.key==='Escape') renderAll(); };
      kv.replaceChildren(ta); ta.focus();
    };
    if(isCombinedGroup()){
      const en = isEnglish(currentGroup.members[0]);
      els.promptBox.value = buildGroupMainPrompt(currentGroup, en);
      const gd=document.getElementById('derivedPromptBox'); if(gd) gd.value = (isRefMode(currentGroup.members[0]) ? (en ? `[REFERENCE IMAGES PROVIDED] Attach each member's base reference card. Every member must remain exactly the same person as his own card (match by member number). Never blend or swap their features. Redraw every member from scratch to match the scene's lighting and color — never a cut-and-paste composite look.\n\n` : `【参照画像あり・重要】各メンバーの基準リファレンスカードの画像を添付する。各メンバーは自分の基準カード（メンバー番号で対応）と完全に同一人物として描き、特徴を混ぜたり入れ替えたりしない。各メンバーとも参照画像の切り抜き合成のようにせず、場面の光・影・色味に完全になじませて一から描き直す。\n\n`) : '') + (currentDerivedType()==='トレーディングカード' ? buildGroupCardPrompt(currentGroup, en) : buildGroupMainPrompt(currentGroup, en)) + (isRefMode(currentGroup.members[0]) ? usageNote(en) : '');
      document.getElementById('outfitPromptBox').value = buildGroupOutfitPrompt(currentGroup, en, 'weekday');
      const gh=document.getElementById('outfitHolidayPromptBox'); if(gh) gh.value = buildGroupOutfitPrompt(currentGroup, en, 'holiday');
      document.getElementById('scenePromptBox').value = buildGroupPrompt(currentGroup, en);
    } else {
      els.promptBox.value = buildPrompt(current, true);
      const pref = refPrefix(current, isEnglish(current));
      document.getElementById('outfitPromptBox').value = pref + buildOutfitPrompt(current, 'weekday') + (pref ? usageNote(isEnglish(current)) : '');
      const oh=document.getElementById('outfitHolidayPromptBox'); if(oh) oh.value = pref + buildOutfitPrompt(current, 'holiday') + (pref ? usageNote(isEnglish(current)) : '');
      document.getElementById('scenePromptBox').value = pref + buildScenePrompt(current) + (pref ? usageNote(isEnglish(current)) : '');
      const dv=document.getElementById('derivedPromptBox'); if(dv) dv.value = buildDerivedPrompt(current, isEnglish(current));
      const fpb=document.getElementById('friendPairPromptBox'); if(fpb) fpb.value = current.friendBase ? buildFriendPairPrompt(current, isEnglish(current)) : '';
      renderFriendPairControls();
      renderFootCfgPanel();
    }
    const mo=document.getElementById('manualOutputType'), mc=document.getElementById('manualCount'), mq=document.getElementById('manualQuality'), mb=document.getElementById('manualBackground'), ml=document.getElementById('manualLighting'), mpl=document.getElementById('manualPromptLanguage'), mpt=document.getElementById('manualPromptTarget'), mcm=document.getElementById('manualCaptionMode'), mcs=document.getElementById('manualCardStyle'), mcr=document.getElementById('manualCardRarity'), mct=document.getElementById('manualCardTheme'), mcl=document.getElementById('manualCardLayout'), mcw=document.getElementById('manualCardWearMode'), mce=document.getElementById('manualCardEffect');
    if(mo) mo.value=current.outputType; if(mc) mc.value=current.count; if(mq) mq.value=current.quality; if(mb) mb.value=current.background; if(ml) ml.value=current.lighting; if(mpl) mpl.value=current.promptLanguage || '日本語'; if(mpt) mpt.value=current.promptTarget || 'ChatGPT'; if(mcm) mcm.value=current.captionMode || '表記する';
    if(mcs) mcs.value=current.cardStyle || 'スタンダード'; if(mcr) mcr.value=current.cardRarity || 'R'; if(mct) mct.value=current.cardTheme || 'ネイビー'; if(mcl) mcl.value=current.cardLayout || '縦長カード'; if(mcw) mcw.value=current.cardWearMode || 'ボクサーパンツのみ'; if(mce){ mce.value=cardEffectByRarity(current.cardRarity || 'R'); mce.disabled=true; } syncCardSettingsVisibility();
    writeCaptionFields('manual', current.captionFields || {name:true,era:true,height:true,weight:true,footSize:true,mbti:true});
    writeCardFields('manual', current.cardFields || {name:true,age:true,era:true,height:true,weight:true,footSize:true,role:true,mbti:true,rarity:true});
  }
  function renderRarity(){
    const [s,r,note] = scoreRarity(current); els.rarity.textContent=r; els.rarity.className='rare rarity-'+(r==='SUPER RARE'?'SUPER':r); els.rareScore.textContent=s+' pt'; els.rarityNote.textContent = note==='idle' ? T('rarityNoteIdle') : T('rarityNotes')[note];
  }
  function renderAll(){ renderSlots(current,true); renderProfile(); renderRarity(); renderHistory(); renderGroupUI(); renderPromptTabs(); renderSettingChips(); updateCharCounts(); }
  function saveCurrent(){ if(!current) return alert(T('saveFirst')); const history=loadHistory(); history.unshift({...current, appVersion:'V3.2.0'}); localStorage.setItem(STORAGE_KEY,JSON.stringify(history.slice(0,50))); renderHistory(); alert(T('saved')); }
  function loadHistory(){ try{return JSON.parse(localStorage.getItem(STORAGE_KEY)||'[]')}catch{return[]} }
  function renderHistory(){
    const h = loadHistory();
    const order = h.map((c,i)=>i).sort((a,b)=>((h[b].fav?1:0)-(h[a].fav?1:0)) || a-b);
    els.historyList.innerHTML = h.length ? order.map(i=>{ const c=h[i]; return `<div class="history-item${c.fav?' faved':''}"><b>${c.fav?'★ ':''}${c.name} / ${uiLang==='en'? displayValue('age',c.age): c.age+'歳'} / ${c.height} / ${displayValue('bodyType',c.bodyType)}</b><p class="notice">${displayValue('facePreset',c.facePreset)}・${displayValue('outfitType',c.outfitType)}・${displayValue('sockType',c.sockType)}・${scoreRarity(c)[1]}${c.appVersion?` <span class="mini-badge" style="font-size:10px;padding:2px 6px">${c.appVersion}</span>`:''}</p><button class="fav-btn" data-fav="${i}" title="favorite">${c.fav?T('favOn'):T('favOff')}</button><button class="btn dark" data-load="${i}">${T('loadBtn')}</button></div>`; }).join('') : `<p class="notice">${T('noHistory')}</p>`;
    document.querySelectorAll('[data-load]').forEach(b=>b.onclick=()=>{current=h[Number(b.dataset.load)]; currentGroup=null; activeMember=0; renderAll(); switchTab('result');});
    document.querySelectorAll('[data-fav]').forEach(b=>b.onclick=()=>{ const i=Number(b.dataset.fav); h[i].fav=!h[i].fav; localStorage.setItem(STORAGE_KEY, JSON.stringify(h)); renderHistory(); });
  }
  function downloadJson(){
    const data = current || {};
    const nm = String(data.name||'').replace(/（.*?）/g,'').replace(/[\s\u3000]+/g,'').replace(/[\\/:*?"<>|]/g,'') || 'result';
    const d = new Date(); const pad=n=>String(n).padStart(2,'0');
    const stamp = `${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}`;
    const a=document.createElement('a');
    a.href=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));
    a.download=`guzen-ikemen_${nm}_${stamp}.json`;
    a.click(); URL.revokeObjectURL(a.href);
  }
  function switchTab(name){ document.querySelectorAll('.tab').forEach(t=>t.classList.toggle('active',t.dataset.tab===name)); ['slot','result','history','settings'].forEach(t=>document.getElementById('tab-'+t).classList.toggle('hidden',t!==name)); const ip=document.getElementById('initialPanel'); if(ip) ip.classList.toggle('hidden', !(name==='slot' || name==='settings')); const sa=document.getElementById('slotAside'); if(sa) sa.classList.toggle('hidden', name!=='slot'); }

  // ===== V1.9.1 A案 UI logic =====
  let promptTab = 'main';
  function renderPromptTabs(){
    const bar = document.getElementById('promptTabs'); if(!bar) return;
    const labels = uiLang==='en'
      ? {main:'🪪 Base Card', derived:'🎨 Derived Output', outfit:'👔 Work Outfit', outfitHoliday:'👕 Casual Outfit', scene:'🎬 Scene', friendPair:'🤝 Friend Two-shot', group:'👥 Group Photo'}
      : {main:'🪪 基準カード', derived:'🎨 派生出力', outfit:'👔 職業服装', outfitHoliday:'👕 私服服装', scene:'🎬 場面差分', friendPair:'🤝 友人ツーショット', group:'👥 集合写真'};
    const showGroup = !!(currentGroup && currentGroup.members.length>1 && currentGroup.promptMode !== '1つの指示文にまとめて生成');
    const showFriendPair = !!(current && current.friendBase);
    if(promptTab==='group' && !showGroup) promptTab='main';
    if(promptTab==='friendPair' && !showFriendPair) promptTab='main';
    bar.innerHTML = PROMPT_PANES.filter(([k])=>(k!=='group' || showGroup) && (k!=='friendPair' || showFriendPair)).map(([k])=>`<button class="ptab${promptTab===k?' active':''}" data-ptab="${k}">${labels[k]}</button>`).join('');
    bar.querySelectorAll('[data-ptab]').forEach(b=>b.onclick=()=>{ promptTab=b.dataset.ptab; renderPromptTabs(); });
    PROMPT_PANES.forEach(([k,id])=>{ const el=document.getElementById(id); if(el) el.classList.toggle('hidden', promptTab!==k); });
    const descs = T('promptDescs') || {};
    ['main','derived','outfit','outfitHoliday','scene','friendPair','group'].forEach(k=>{ const el=document.getElementById('desc-'+k); if(el) el.textContent = descs[k] || ''; });
    const f1=document.querySelector('[data-flow="1"]'), f2=document.querySelector('[data-flow="2"]');
    if(f1) f1.classList.toggle('active', promptTab==='main');
    if(f2) f2.classList.toggle('active', promptTab!=='main');
    const at = document.getElementById('promptAreaTitle'); if(at) at.textContent = T('promptAreaTitle');
    const DERIVED_META = {
      'トレーディングカード':['🃏','トレカ','オリジナルトレカ風の1枚','Trading card','One original trading-card style image'],
      '人物特集雑誌ページ':['📰','雑誌ページ','架空雑誌の特集誌面。時代でレイアウトが変化','Magazine page','A fictional magazine feature; layout follows the era'],
      'キャラクタープロフィールシート':['📇','プロフィールシート','全身1枚＋ひとこと背景＋基本＋内面・背景＋A/B/C','Profile sheet','Full-body shot with bio, basics, inner profile and A/B/C'],
      '街で見かけたイケメンシート：職業編':['📷','街角・職業編','働く姿のスナップ3〜4コマ','Street: at work','3-4 candid panels of him working'],
      '街で見かけたイケメンシート：オフ編':['🏖','街角・オフ編','私服で過ごすオフのスナップ集','Street: off duty','Candid panels of his day off in casual wear'],
      '人物ポスター（職業・人物像）':['🖼','ポスター','職業と人物像が伝わる1枚','Poster','A poster that shows who he is at a glance'],
      '服装リファレンスシート（職業背景）':['👔','服装リファレンス','職業コーデの資料シート（靴下詳細つき）','Outfit reference','Work-outfit reference sheet (with sock detail)'],
      '偶然足元強調場面シート':['🦶','足元強調場面','靴を脱いだ足元を強調した生活場面','Foot-focus scene','A daily scene emphasizing his socked feet'],
      '偶然人物ブループリントシート':['📐','ブループリント','設計図風の人物資料','Blueprint','A technical-drawing style character sheet'],
      '参考画像作成シート（引継ぎ用）':['📋','参考画像シート','引継ぎ用の情報つき資料（歯並び・裸足・足裏パネル入り）','Handoff sheet','A standalone reference sheet with info panel, teeth and barefoot views']
    };
    const en2 = uiLang === 'en';
    const grid = document.getElementById('derivedTypeGrid');
    const dts = document.getElementById('derivedTypeSel');
    if(grid && dts){
      const cur = currentDerivedType();
      const mainTypes = Object.keys(DERIVED_META);
      grid.innerHTML = mainTypes.map(v=>{
        const m = DERIVED_META[v];
        return `<button class="dtype-btn${v===cur?' on':''}" data-dtype="${v.replace(/"/g,'&quot;')}"><span class="ic">${m[0]}</span>${en2 ? m[3] : m[1]}</button>`;
      }).join('');
      grid.querySelectorAll('[data-dtype]').forEach(b=>b.onclick=()=>{ derivedType = b.dataset.dtype; renderAll(); });
      const others = ['トレーディングカード'].concat(pools.outputTypes.filter(v=>!v.includes('16:9')));
      dts.innerHTML = `<option value="">${en2 ? 'Other formats…' : 'その他の形式…'}</option>` + others.filter(v=>!mainTypes.includes(v)).map(v=>`<option value="${v.replace(/"/g,'&quot;')}"${v===cur?' selected':''}>${displayOptionLabel('outputType', v)}</option>`).join('');
      if(mainTypes.includes(cur)) dts.value='';
      dts.onchange = () => { if(dts.value){ derivedType = dts.value; renderAll(); } };
      const lbl = document.getElementById('derivedTypeLabel');
      if(lbl){
        const m = DERIVED_META[cur];
        lbl.textContent = m ? `${m[0]} ${en2 ? m[3] : cur} — ${en2 ? m[4] : m[2]}` : `📋 ${displayOptionLabel('outputType', cur)}`;
      }
      const slot = document.getElementById('derivedCardSettingsSlot');
      const cardCfg = document.querySelector('[data-ui-card="manualCard"]');
      if(slot && cardCfg){
        if(cardCfg.parentElement !== slot) slot.appendChild(cardCfg);
        cardCfg.classList.toggle('hidden', cur !== 'トレーディングカード');
      }
      const psCfg = document.getElementById('profileSheetCfg');
      if(psCfg){
        psCfg.classList.toggle('hidden', cur !== 'キャラクタープロフィールシート');
        const psSel = document.getElementById('profileSheetWearSel');
        if(psSel){ psSel.value = (current && current.profileSheetWear) || '職業服装'; psSel.onchange = ()=>{ if(current){ current.profileSheetWear = psSel.value; renderAll(); } }; }
        const psLbl = psCfg.querySelector('label span'); if(psLbl) psLbl.textContent = en2 ? 'Profile-sheet outfit' : 'プロフィールシートの服装';
      }
      const cb = document.getElementById('copyDerivedBtn');
      if(cb && !cb.classList.contains('copied')){
        const m = DERIVED_META[cur];
        cb.textContent = en2 ? `📋 Copy ${m ? m[3] : 'prompt'}` : `📋 ${m ? m[1] : 'この形式'}用をコピー`;
      }
    }
    const chip = document.getElementById('promptAreaTarget');
    if(chip){
      if(current){ chip.textContent = `⚡ ${current.promptTarget || 'ChatGPT'} ・ ${current.promptLanguage === 'English' || uiLang==='en' && !current.promptLanguage ? 'English' : (current.promptLanguage || '日本語')}`; chip.style.display=''; }
      else chip.style.display='none';
    }
  }
  function renderSettingChips(){
    const el = document.getElementById('settingChips'); if(!el) return;
    const gi = getInitial();
    const en = uiLang==='en';
    const short = (v,n=10) => { const t = en ? (displayValue('outputType', v) || v) : v; return t.length>n ? t.slice(0,n)+'…' : t; };
    const chips = [
      [en?'Era':'年代', `${gi.eraYear || '2026'}`],
      [en?'Mode':'モード', displayValue('groupSize', document.getElementById('initialGroupSize')?.value || '1人（通常）') || '1人'],
      [en?'Underwear':'下着', displayValue('mainWearMode', gi.mainWearMode) || gi.mainWearMode],
      [en?'Output':'出力', short(gi.outputType || '', 12)],
      [en?'Occupation':'職業影響', displayValue('occInfluence', gi.occInfluence) || gi.occInfluence]
    ];
    el.innerHTML = chips.map(([k,v])=>`<span class="chip" data-chip><b>${k}</b> ${v}</span>`).join('');
    el.querySelectorAll('[data-chip]').forEach(c=>c.onclick=()=>{ const sec=document.querySelector('section.panel'); if(sec) sec.scrollIntoView({behavior:'smooth'}); });
  }
  const accCollapsed = {};
  function initAccordions(){
    document.querySelectorAll('.subcard').forEach(card=>{
      const h3 = card.querySelector('h3'); if(!h3 || h3.dataset.accBound) return;
      h3.dataset.accBound = '1';
      if(!h3.querySelector('.acc-arrow')){ const ar=document.createElement('span'); ar.className='acc-arrow'; ar.textContent='▼'; h3.appendChild(ar); }
      h3.addEventListener('click', ()=>{ card.classList.toggle('collapsed'); const key=card.dataset.uiCard||''; accCollapsed[key]=card.classList.contains('collapsed'); });
      const key = card.dataset.uiCard || '';
      if(accCollapsed[key]) card.classList.add('collapsed');
    });
  }
  const catCollapsed = {};
  const PRESET_KEY = 'guzen-ikemen-maker-v1.presets';
  function loadPresets(){ try{return JSON.parse(localStorage.getItem(PRESET_KEY)||'{}')}catch{return {}} }
  function savePresets(p){ localStorage.setItem(PRESET_KEY, JSON.stringify(p)); }
  function snapshotInitial(){
    const o = {selects:{}, checks:{}};
    document.querySelectorAll('[id^="initial"]').forEach(el=>{
      if(el.tagName==='SELECT' || (el.tagName==='INPUT' && el.type!=='checkbox' && el.type!=='file')) o.selects[el.id] = el.value;
    });
    document.querySelectorAll('[data-caption-scope="initial"]').forEach(el=>{ o.checks['cap:'+el.dataset.captionField] = el.checked; });
    document.querySelectorAll('[data-card-scope="initial"]').forEach(el=>{ o.checks['card:'+el.dataset.cardField] = el.checked; });
    return o;
  }
  function applySnapshot(o){
    Object.entries(o.selects||{}).forEach(([id,v])=>{ const el=document.getElementById(id); if(el) el.value=v; });
    Object.entries(o.checks||{}).forEach(([k,v])=>{
      const [t,f]=k.split(':');
      const el=document.querySelector(t==='cap'?`[data-caption-scope="initial"][data-caption-field="${f}"]`:`[data-card-scope="initial"][data-card-field="${f}"]`);
      if(el) el.checked=v;
    });
    syncCardSettingsVisibility();
  }
  function refreshPresetSelect(){
    const sel = document.getElementById('presetSelect'); if(!sel) return;
    const p = loadPresets();
    sel.innerHTML = Object.keys(p).map(n=>`<option value="${n.replace(/"/g,'&quot;')}">${n}</option>`).join('');
  }
  function initPresets(){
    const nameEl = document.getElementById('presetName');
    const saveB = document.getElementById('savePresetBtn');
    const loadB = document.getElementById('loadPresetBtn');
    const delB = document.getElementById('deletePresetBtn');
    if(saveB) saveB.onclick = () => {
      const name = (nameEl?.value || '').trim();
      if(!name) return alert(T('presetNameNeeded'));
      const p = loadPresets(); p[name] = snapshotInitial(); savePresets(p); refreshPresetSelect();
      document.getElementById('presetSelect').value = name;
      alert(T('presetSavedMsg'));
    };
    if(loadB) loadB.onclick = () => {
      const sel = document.getElementById('presetSelect'); const p = loadPresets();
      if(sel?.value && p[sel.value]) applySnapshot(p[sel.value]);
    };
    if(delB) delB.onclick = () => {
      const sel = document.getElementById('presetSelect'); const p = loadPresets();
      if(sel?.value && p[sel.value]){ delete p[sel.value]; savePresets(p); refreshPresetSelect(); }
    };
    refreshPresetSelect();
  }
  function updateCharCounts(){
    [['promptBox','cc-promptBox'],['outfitPromptBox','cc-outfitPromptBox'],['outfitHolidayPromptBox','cc-outfitHolidayPromptBox'],['scenePromptBox','cc-scenePromptBox'],['derivedPromptBox','cc-derivedPromptBox'],['friendPairPromptBox','cc-friendPairPromptBox'],['groupPromptBox','cc-groupPromptBox']].forEach(([t,cid])=>{
      const cEl = document.getElementById(cid); const tEl = document.getElementById(t);
      if(cEl && tEl) cEl.textContent = tEl.value ? `${tEl.value.length}${T('charsSuffix')}` : '';
    });
  }
  function importJsonFile(file){
    const reader = new FileReader();
    reader.onload = () => {
      try{
        const data = JSON.parse(reader.result);
        if(Array.isArray(data)){
          const history = loadHistory();
          const merged = data.concat(history).slice(0,50);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
          renderHistory();
        } else if(data && typeof data === 'object' && (data.height || data.name)){
          current = data; renderAll(); switchTab('result');
        }
        alert(T('importedMsg'));
      }catch(e){ alert('JSON parse error'); }
    };
    reader.readAsText(file);
  }
  document.getElementById('importBtn').onclick = () => document.getElementById('importFile').click();
  document.getElementById('importFile').onchange = e => { const f = e.target.files[0]; if(f) importJsonFile(f); e.target.value=''; };
  initPresets();
  initAccordions();
  renderPromptTabs();
  renderSettingChips();
  document.querySelectorAll('section.panel select, section.panel input').forEach(el=>el.addEventListener('change', ()=>renderSettingChips()));
  document.getElementById('startBtn').onclick=spin;
  document.getElementById('rerollUnlockedBtn').onclick=()=>spin();
  document.getElementById('resetLocksBtn').onclick=()=>{locks={}; renderSlots(current,true);};
  const makerLangSel = document.getElementById('makerLanguage');
  if(makerLangSel){ uiLang = makerLangSel.value || 'ja'; makerLangSel.onchange=()=>{ uiLang = makerLangSel.value || 'ja'; applyUiLanguage(); }; }
  document.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>{mode=b.dataset.mode; document.querySelectorAll('[data-mode]').forEach(x=>x.className='btn dark'); b.className=mode==='full'?'btn blue':'btn primary'; updateModeNote();});
  document.querySelectorAll('.tab').forEach(t=>t.onclick=()=>switchTab(t.dataset.tab));
  document.getElementById('saveBtn').onclick=saveCurrent;
  document.getElementById('jsonBtn').onclick=downloadJson;
  function flashCopied(btn){ if(!btn) return; const orig = T('copyLabel'); btn.textContent = T('copiedLabel'); btn.classList.add('copied'); setTimeout(()=>{ btn.textContent = orig; btn.classList.remove('copied'); }, 1600); }
  document.getElementById('copyPromptBtn').onclick=async(e)=>{ await navigator.clipboard.writeText(els.promptBox.value); flashCopied(e.target); };
  document.getElementById('copyOutfitBtn').onclick=async(e)=>{ await navigator.clipboard.writeText(document.getElementById('outfitPromptBox').value); flashCopied(e.target); };
  document.getElementById('copyOutfitHolidayBtn').onclick=async(e)=>{ await navigator.clipboard.writeText(document.getElementById('outfitHolidayPromptBox').value); flashCopied(e.target); };
  document.getElementById('copyGroupBtn').onclick=async(e)=>{ await navigator.clipboard.writeText(document.getElementById('groupPromptBox').value); flashCopied(e.target); };
  document.getElementById('copyFriendPairBtn').onclick=async(e)=>{ await navigator.clipboard.writeText(document.getElementById('friendPairPromptBox').value); flashCopied(e.target); };
  document.getElementById('friendBtn').onclick=()=>{ if(!current){ alert(T('saveFirst')); return; } const fp=document.getElementById('friendPanel'); fp.classList.toggle('hidden'); if(!fp.classList.contains('hidden')) renderFriendPanel(); };
  document.getElementById('friendRelation').onchange=()=>renderFriendPanel();
  document.getElementById('friendGoBtn').onclick=()=>createFriend();
  document.getElementById('friendPairWearSel').onchange=(e)=>{ if(current){ current.friendPairWear=e.target.value; renderAll(); } };
  document.getElementById('friendPairCountSel').onchange=(e)=>{ if(current){ current.friendPairCount=e.target.value; renderAll(); } };
  document.getElementById('footCfgDiceBtn').onclick=()=>{ if(current){ current.footScene = resolveFootCfg(current); renderAll(); } };
  document.getElementById('restoreCodeBtn').onclick=()=>loadFromPromptText(document.getElementById('restoreCodeInput').value);
  document.getElementById('footCfgResetBtn').onclick=()=>{ if(current){ current.footScene = null; renderAll(); } };
  document.getElementById('copySceneBtn').onclick=async(e)=>{ await navigator.clipboard.writeText(document.getElementById('scenePromptBox').value); flashCopied(e.target); };
  const copyDerivedBtn=document.getElementById('copyDerivedBtn'); if(copyDerivedBtn) copyDerivedBtn.onclick=async(e)=>{ await navigator.clipboard.writeText(document.getElementById('derivedPromptBox').value); flashCopied(e.target); };
  document.getElementById('clearHistoryBtn').onclick=()=>{ if(confirm(T('confirmClear'))){localStorage.removeItem(STORAGE_KEY); renderHistory();} };

  initSlots(); initFixedForm(); initManualControls(); initInitialSettings(); applyUiLanguage();
