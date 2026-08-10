// UI language, labels, caption/card field helpers, applyUiLanguage
// Split from the verbatim V3.2.0 baseline (Phase 4 stage B) — bodies unchanged
// except top-level state rewritten to ST.* (see state.js).
import {
  captionFieldLabelMap, cardFieldLabelMap, fixedFieldLabelMap, sceneTranslations, slotLabelMap, uiCardTitles, uiText, valueTranslations,
  valueTranslationsZh, sceneTranslationsZh, SCENE_MOD_ZH,
} from '../data/index.js';
import {
  renderFriendPanel,
} from './flow.js';
import {
  eraLabel, initFixedForm, initInitialSettings, initManualControls, initSlots, nameKana, underwearDesc, underwearShapeGuide,
  uniformHatPhrase,
} from './generate.js';
import {
  renderFriendPairControls, scoreRarity,
} from './prompts.js';
import {
  ST,
} from './state.js';
import {
  renderAll, updateCharCounts, initVideoControls, IDB, renderHistory, refreshThumbs,
} from './ui.js';

  function T(key){
    const table = uiText[ST.uiLang] || uiText.ja;
    return table[key] !== undefined ? table[key] : uiText.ja[key];
  }

  function slotLabel(key, fallback){ return (slotLabelMap[key]||{})[ST.uiLang] || fallback; }

  function fixedLabel(key, fallback){ return (fixedFieldLabelMap[key]||{})[ST.uiLang] || fallback; }

  // per-language value tables; Japanese values ARE the internal representation
  const VALUE_I18N = { en: valueTranslations, zh: valueTranslationsZh };
  const SCENE_I18N = { en: sceneTranslations, zh: sceneTranslationsZh };

  // uiLang-INDEPENDENT English lookup for prompt text. Prompt content must
  // depend only on the prompt language, never on ST.uiLang — displayValue
  // reads ST.uiLang, so calling it inside an english prompt branch leaks the
  // UI language (zh fragments in English prompts). Use this there instead.
  function promptValue(v){ return valueTranslations[String(v)] ?? v; }

  // language pick helper for inline UI strings: LT(ja, en, zh); omit zh to fall
  // back to Japanese. Args evaluate eagerly - literals only, never calls that
  // consume randomness (would shift the seeded PRNG sequence).
  function LT(ja, en, zh){
    if(ST.uiLang==='en') return en;
    if(ST.uiLang==='zh') return zh===undefined ? ja : zh;
    return ja;
  }

  // Seven functions serve BOTH the ternary UI language and the binary prompt
  // language, so they take an explicit 'ja'|'en'|'zh' code rather than a boolean.
  // langOf() lifts a prompt-side boolean into that domain for the three callers
  // that forward their own `english` flag. Codes and booleans are never mixed on
  // the same parameter: passing the string 'zh' to a boolean-only prompt function
  // would silently read as truthy and render English.
  function langOf(v){ return v === 'zh' ? 'zh' : v ? 'en' : 'ja'; }

  // scenes may carry a weather/time prefix (buildEncounterScene, sceneMods), so
  // look the sentence up with the prefix split off and translated separately
  function sceneDisplay(value){
    const table = SCENE_I18N[ST.uiLang] || {};
    const raw = String(value);
    if(table[raw]) return table[raw];
    for(const [modJa, modZh] of Object.entries(SCENE_MOD_ZH)){
      if(raw.startsWith(modJa)){
        const rest = raw.slice(modJa.length);
        const restT = table[rest];
        if(!restT) return raw;
        return (ST.uiLang==='zh' ? modZh : '') + restT;
      }
    }
    return raw;
  }

  function displayValue(key, value){
    if(value===undefined || value===null) return value;
    if(key==='captionMode') return captionModeDisplay(value);
    if(ST.uiLang==='ja') return value;
    const vt = VALUE_I18N[ST.uiLang] || {};
    // composed values (inner profile joins parts with ／) are not in the table as
    // a whole; translate each part and rejoin so partial coverage still helps
    if(key==='innerText' && !vt[String(value)] && String(value).includes('／')){
      const parts = String(value).split('／');
      if(parts.some(x=>vt[x])) return parts.map(x=>vt[x] || x).join('／');
    }
    if(key==='age') return ST.uiLang==='zh' ? `${value}岁` : `${value} years old`;
    if(key==='eraYear') return ST.uiLang==='zh' ? `${value}年` : `${value} CE`;
    if(key==='sceneIdea') return sceneDisplay(value);
    return vt[String(value)] || value;
  }

  function displayOptionLabel(key, value){
    if(key==='captionMode') return captionModeDisplay(value);
    // the ランダム sentinel must never be run through per-key templates
    // (upstream showed 「ランダム歳」/「ランダム years old」 in the fixed-age select)
    if(String(value)==='ランダム') return ST.uiLang==='ja' ? value : ((VALUE_I18N[ST.uiLang] || {})['ランダム'] || value);
    if(ST.uiLang==='ja'){
      if(key==='age') return `${value}歳`;
      if(key==='eraYear') return eraLabel(value);
      return value;
    }
    const vt = VALUE_I18N[ST.uiLang] || {};
    if(key==='age') return ST.uiLang==='zh' ? `${value}岁` : `${value} years old`;
    if(key==='eraYear') return ST.uiLang==='zh' ? `${value}年` : `${value} CE`;
    if(key==='sceneIdea') return sceneDisplay(value);
    return vt[String(value)] || value;
  }

  // post-freeze fix: these static selects ship hardcoded <option> labels that
  // never pass through displayOptionLabel. Original Japanese labels are kept in
  // data-ja on first run, then rendered per current language via the table.
  // (V3.9.6 added initialMjMode / manualFacePresetOut / manualSnapMode /
  // manualMjMode — value-less options, so the value-pinning below matters.)
  function translateStaticSelectOptions(){
    const ids = ['initialSnapMode','initialFacePresetOut','initialIkemenIndex','initialBodyHairMode','initialSportsInfluence',
      'initialHeightBase','initialPromptDetail','initialBioCaption','profileSheetWearSel',
      'initialMjMode','manualFacePresetOut','manualSnapMode','manualMjMode','videoDur'];
    for(const id of ids){
      const sel = document.getElementById(id);
      if(!sel) continue;
      for(const o of sel.options){
        if(!o.dataset.ja) o.dataset.ja = o.textContent;
        // a value-less <option>'s effective value IS its text (HTML spec), so
        // relabeling would rewrite the value consumers compare against
        // Japanese literals (snapMode broke this way in EN/ZH) — pin it first
        if(!o.hasAttribute('value')) o.setAttribute('value', o.dataset.ja);
        const vt = VALUE_I18N[ST.uiLang];
        o.textContent = vt ? (vt[o.dataset.ja] || vt[o.value] || o.dataset.ja) : o.dataset.ja;
      }
    }
  }

  function renderSelectOptions(selectEl, key, values, selectedValue, includeRandom=false){
    if(!selectEl) return;
    const items = includeRandom ? ['ランダム', ...values] : values;
    selectEl.innerHTML = items.map(v=>`<option value="${String(v).replace(/"/g,'&quot;')}">${displayOptionLabel(key, v)}</option>`).join('');
    const match = items.find(v => String(v) === String(selectedValue));
    if(match!==undefined) selectEl.value = String(match);
    else if(items.length) selectEl.value = String(items[0]);
  }

  function mbtiDescription(code, lang='ja'){
    const zhMode = lang === 'zh', enMode = lang === 'en';
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
    const zh = {
      INTJ:'有战略眼光、独立心强', INTP:'逻辑性强、求知欲旺盛', ENTJ:'果断、天生领导气质', ENTP:'点子多、喜欢新刺激',
      INFJ:'理想主义、思虑周全', INFP:'感受力强、自有节奏', ENFJ:'会照顾人、善于社交', ENFP:'开朗自由的气氛担当',
      ISTJ:'诚实可靠、稳重', ISFJ:'温和、体贴入微', ESTJ:'务实、值得信赖', ESFJ:'协调性高、平易近人',
      ISTP:'寡言、动手能力强', ISFP:'自然随性、温柔', ESTP:'行动派、自带节奏', ESFP:'华丽、自来熟'
    };
    if(zhMode) return zh[code] || code;
    return (enMode?en:ja)[code] || code;
  }

  function mbtiDisplay(c){
    if(!c?.mbti) return '';
    return `${c.mbti} / ${mbtiDescription(c.mbti, ST.uiLang)}`;
  }

  function captionModeDisplay(mode){
    if(ST.uiLang==='zh'){
      const mapZh = {'表記する':'显示规格文字','画像下部に1行で表記':'图像底部单行标注','カード風ミニプロフィールを下部に表示':'底部显示卡片式迷你档案','スタイリッシュなタグ型で表示':'时尚标签式显示','表記しない':'不显示文字'};
      return mapZh[mode] || '不显示文字';
    }
    if(ST.uiLang!=='en') return mode || '表記しない';
    const map = {'表記する':'Show spec text','画像下部に1行で表記':'One-line footer text','カード風ミニプロフィールを下部に表示':'Mini profile card at the bottom','スタイリッシュなタグ型で表示':'Stylish tag-style display','表記しない':'No text overlay'};
    return map[mode] || 'No text overlay';
  }

  function getCaptionFieldLabelsArray(c, lang='ja'){
    const zhMode = lang === 'zh', enMode = lang === 'en';
    const labels = [];
    const fields = c?.captionFields || {name:true,era:true,height:true,weight:true,footSize:true,mbti:true};
    Object.entries(captionFieldLabelMap).forEach(([k,map])=>{ if(fields[k]) labels.push(zhMode ? (map.zh ?? map.ja) : enMode?map.en:map.ja); });
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
    if(fields.mbti) parts.push(english ? `MBTI: ${c.mbti} (${mbtiDescription(c.mbti, 'en')})` : `MBTI：${c.mbti}（${mbtiDescription(c.mbti, 'ja')}）`);
    if(fields.nationality) parts.push(english ? `Nationality: ${promptValue(c.nationality)}` : `国籍：${c.nationality}`);
    if(fields.role) parts.push(english ? `Occupation: ${promptValue(c.role)}` : `職業：${c.role}`);
    return parts.join(english ? ' / ' : '｜');
  }

  function buildCaptionInstruction(c, english=false){
    if(!c || c.captionMode==='表記しない'){
      return english ? 'Do not add any extra text inside the image.' : '画像内に追加の文字情報は入れない。';
    }
    const labelsArr = getCaptionFieldLabelsArray(c, langOf(english));
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
      if(map) el.textContent = LT(map.ja, map.en, map.zh);
    });
    const i=document.getElementById('initialCardFieldsLabel'); if(i) i.textContent = LT('カード内表示項目', 'Card information fields', '卡片内显示项目');
    const m=document.getElementById('manualCardFieldsLabel'); if(m) m.textContent = LT('カード内表示項目', 'Card information fields', '卡片内显示项目');
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
      if(english) return `Use his work outfit: ${c.workUniform ? c.workUniformEn : `${c.outfitBrand?`${c.outfitBrand} `:''}${c.outfitType}`}. Outerwear: ${c.jacket}. Top: ${c.top}. Bottom: ${c.bottom}. Shoes: ${c.shoes}${uniformHatPhrase(c, true)}. Socks: ${c.sockBrand} ${c.sockType}.${c.workUniform ? ` Do not reproduce real organizations' insignia or logos.` : ''}`;
      return `カード内の服装は職業服装にする。${c.workUniform ? `${c.workUniform}を着用し、` : `${c.outfitBrand?`${c.outfitBrand}の`:''}${c.outfitType}を基調に、`}上着は${c.jacket}、トップスは${c.top}、ボトムスは${c.bottom}、靴は${c.shoes}${uniformHatPhrase(c, false)}、靴下は${c.sockBrand}の${c.sockType}。${c.workUniform ? '実在組織の記章・ロゴは正確に再現しない。' : ''}`;
    }
    if(mode==='私服'){
      const hb = c.holidayOutfitBrand || c.outfitBrand, ht = c.holidayOutfitType || c.outfitType;
      const hj = c.holidayJacket || c.jacket, htp = c.holidayTop || c.top, hbm = c.holidayBottom || c.bottom, hsh = c.holidayShoes || c.shoes;
      if(english) return `Use his casual outfit: ${hb} ${ht}. Outerwear: ${hj}. Top: ${htp}. Bottom: ${hbm}. Shoes: ${hsh}. Socks: ${c.holidaySockBrand || c.sockBrand} ${c.holidaySockType || c.sockType}.`;
      return `カード内の服装は私服にする。${hb}の${ht}を基調に、上着は${hj}、トップスは${htp}、ボトムスは${hbm}、靴は${hsh}、靴下は${c.holidaySockBrand || c.sockBrand}の${c.holidaySockType || c.sockType}。`;
    }
    if(english) return `Use only ${underwearDesc(c, 'en')} as the card outfit. ${underwearShapeGuide(c, true)} Keep the depiction non-sexual and neutral, like a body-reference character card.`;
    return `カード内の服装は${underwearDesc(c, 'ja')}のみ。${underwearShapeGuide(c, false)}非性的で、体型確認用のキャラクターカードとして自然に見せる。`;
  }

  function buildCardInstruction(c, english=false){
    const fields = c.cardFields || {};
    const labels = Object.entries(cardFieldLabelMap).filter(([k])=>fields[k]).map(([k,map])=>english?map.en:map.ja).join(', ');
    const rarityText = c.cardRarity && c.cardRarity!=='おすすめ自動' ? c.cardRarity : suggestCardRarity(c);
    const effect = cardEffectByRarity(rarityText);
    const rarityReasonJa = `レアリティは、体型・顔立ち・雰囲気・MBTI・足サイズ・体毛・服装などの項目の組み合わせから「${rarityText}」を提案する。必要に応じてユーザーが変更できる。装飾効果はレアリティに準じて「${effect}」にする。`;
    const rarityReasonEn = `Suggest the rarity label "${rarityText}" based on the combination of body type, face type, vibe, MBTI, foot size, body hair, and outfit. The user can edit the rarity. The decorative effect should follow the rarity and be "${promptValue(effect)}".`;
    if(english){
      const rareExtra = ['SSR','UR','Secret','Legendary'].includes(rarityText) ? ' Add a premium finish appropriate to the rarity, while keeping the character and all text readable.' : '';
      return `Present the result as a high-quality original trading-card-style character design inspired by the visual polish of popular collectible trading cards, without copying any existing official card design. Put the logo text "GuzenIkemenMakerCARD" clearly on the card as an original brand logo. Card style: ${promptValue(c.cardStyle)}. Rarity label: ${rarityText}. Color theme: ${promptValue(c.cardTheme)}. Layout: ${promptValue(c.cardLayout)}. Decorative effect: ${promptValue(effect)}. ${rarityReasonEn} Include readable information panels or stat tags for: ${labels || 'name, profile, MBTI, and role'}. Use premium card framing, strong typography, clean icon-like accents, and a memorable collectible-card composition.${rareExtra}`;
    }
    const rareExtra = ['SSR','UR','Secret','Legendary'].includes(rarityText) ? '高レアリティにふさわしい高級感、光沢感、特別感を加える。ただし人物や文字の視認性は損なわない。' : '';
    return `人気トレーディングカードのようにデザイン性を高めた、オリジナルのトレーディングカード風キャラクターデザインとして構成する。ただし実在カードや公式カードの模倣ではなく、独自の架空キャラクターカードとして仕上げる。カード内に「GuzenIkemenMakerCARD」のロゴ文字を、オリジナルブランドロゴとしてはっきり入れる。カードスタイルは${c.cardStyle}、レアリティ表示は${rarityText}、配色テーマは${c.cardTheme}、レイアウトは${c.cardLayout}、装飾効果は${effect}。${rarityReasonJa}カード枠、情報パネル、ステータス欄、タグ欄を自然に配置し、表示項目は${labels || '氏名、プロフィール、MBTI、役割'}。人物を主役にしつつ、設定資料としての読みやすさとカードとしての見栄えを両立する。${rareExtra}`;
  }

  function buildBodyHairSummary(c, lang='ja'){
    const zhMode = lang === 'zh', enMode = lang === 'en';
    if(c && c.bodyHairMode === '自然な表現（簡潔）'){
      if(zhMode) return '体毛按年龄・体质相应的自然范围整体低调描绘（既不过度无毛化，也不过度刻画）。';
      return enMode
        ? 'Body hair: a natural, age-appropriate amount overall, kept subtle — neither artificially hairless nor excessive.'
        : '体毛は年齢・体質相応の自然な範囲で、全体に控えめに描く（過度な無毛化も過剰な描写もしない）。';
    }
    if(!c) return '';
    const partsJa = [`体毛は全体として${c.bodyHairOverall}`];
    const areasJa = [['胸毛',c.chestHair],['腹毛',c.abdominalHair],['へそ下',c.lowerAbdomenHair],['腕毛',c.armHair],['すね毛',c.shinHair],['もも毛',c.thighHair],['脇毛',c.armpitHair],['手の甲・指毛',c.handFingerHair],['足の甲・指毛',c.footToeHair],['背中',c.backHair]];
    if(zhMode){
      const partZh = {'胸毛':'胸毛','腹毛':'腹毛','へそ下':'脐下','腕毛':'手臂毛','すね毛':'小腿毛','もも毛':'大腿毛','脇毛':'腋毛','手の甲・指毛':'手背・手指毛','足の甲・指毛':'脚背・脚趾毛','背中':'背部'};
      return `体毛整体${displayValue('bodyHairOverall',c.bodyHairOverall)}。${areasJa.map(([k,v])=>`${partZh[k]||k}为${displayValue('bodyHairLevel',v)}`).join('、')}。体毛表现为非性向，作为成年男性的自然身体特征来描绘。`;
    }
    if(!enMode) return `${partsJa[0]}。${areasJa.map(([k,v])=>`${k}は${v}`).join('、')}。体毛表現は非性的で、成人男性の自然な身体特徴として描写する。`;
    const areasEn = [['chest hair',c.chestHair],['abdominal hair',c.abdominalHair],['lower abdomen hair',c.lowerAbdomenHair],['arm hair',c.armHair],['shin hair',c.shinHair],['thigh hair',c.thighHair],['armpit hair',c.armpitHair],['hand and finger hair',c.handFingerHair],['foot and toe hair',c.footToeHair],['back hair',c.backHair]];
    return `Body hair overall is ${promptValue(c.bodyHairOverall)}. ${areasEn.map(([k,v])=>`${k}: ${promptValue(v)}`).join('; ')}. Depict body hair non-sexually as a natural adult male body feature.`;
  }

  function setCaptionCheckboxLabels(){
    document.querySelectorAll('[data-caption-label]').forEach(el=>{
      const key = el.dataset.captionLabel;
      const map = captionFieldLabelMap[key];
      if(map) el.textContent = LT(map.ja, map.en, map.zh);
    });
    const i=document.getElementById('initialCaptionFieldsLabel'); if(i) i.textContent = LT('画像内に表示する項目', 'Image text fields', '图内显示项目');
    const m=document.getElementById('manualCaptionFieldsLabel'); if(m) m.textContent = LT('画像内に表示する項目', 'Image text fields', '图内显示项目');
  }

  function setUiCardTitles(){
    document.querySelectorAll('[data-ui-card]').forEach(card=>{
      const m=uiCardTitles[card.dataset.uiCard]; const h=card.querySelector('h3'); if(m&&h) h.textContent=LT(m.ja, m.en, m.zh);
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
    const note=document.getElementById('modeNote'); if(note) note.textContent=T('currentMode')+m[ST.mode];
  }

  function applyUiLanguage(){
    document.documentElement.lang = ST.uiLang==='ja' ? 'ja' : ST.uiLang==='zh' ? 'zh' : 'en';
    document.querySelector('.badge').textContent = 'GUZEN SLOT SYSTEM / V3.9.6';
    document.querySelector('.title').textContent = 'Guzen Ikemen Maker V3.9.6';
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
    // idle guard derived from the tables so every language (incl. future ones)
    // is covered — a hardcoded list stranded the zh pill on '待机中' after
    // switching away from Chinese
    const statusPill=document.getElementById('statusPill'); if(statusPill && (!statusPill.textContent || Object.values(uiText).some(t=>t.waiting===statusPill.textContent))) statusPill.textContent=T('waiting');
    const sideTitles=document.querySelectorAll('aside .section-title h2'); if(sideTitles[0]) sideTitles[0].textContent=T('rarityTitle'); if(sideTitles[1]) sideTitles[1].textContent=T('modesTitle');
    const rarityNote=document.getElementById('rarityNote'); if(rarityNote && (!ST.current)) rarityNote.textContent=T('rarityNoteIdle');
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
    const rci=document.getElementById('restoreCodeInput'); if(rci) rci.placeholder=T('restorePlaceholder');
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
    // post-freeze fix: these two copy buttons and the group prompt title were
    // missing from the upstream relabel pass (stayed Japanese in EN mode)
    const cp6=document.getElementById('copyOutfitHolidayBtn'); if(cp6) cp6.textContent=T('copyLabel');
    const cp7=document.getElementById('copyGroupBtn'); if(cp7) cp7.textContent=T('copyLabel');
    const gpt=document.getElementById('groupPromptTitle'); if(gpt) gpt.textContent=T('groupPromptTitle');
    const fs1=document.getElementById('flowStep1'); if(fs1) fs1.textContent=T('flowStep1');
    // V3.9.6 sections: the new h2s ship without ids, so anchor on the adjacent
    // copy-button ids (stable) instead of adding ids to the body-verbatim markup
    const fpb=document.getElementById('fullProfBox'); if(fpb){ fpb.placeholder=T('fullProfPlaceholder'); const n=fpb.previousElementSibling; if(n) n.textContent=T('fullProfNotice'); }
    for(const [btnId, key] of [['copyFullProfBtn','fullProfTitle'],['copyVrefBtn','vrefTitle'],['copyVideoBtn','videoTitle'],['copyTelopBtn','telopTitle']]){
      const b=document.getElementById(btnId); if(!b) continue;
      b.textContent=T('copyLabel');
      const h=b.closest('.section-title')?.querySelector('h2'); if(h) h.textContent=T(key);
    }
    const fs2=document.getElementById('flowStep2'); if(fs2) fs2.textContent=T('flowStep2');
    translateStaticSelectOptions();
    const histTitle=document.querySelector('#tab-history .section-title h2'); if(histTitle) histTitle.textContent=T('historyTitle');
    const chBtn=document.getElementById('clearHistoryBtn'); if(chBtn) chBtn.textContent=T('clearHistoryBtn');
    const setTitle=document.querySelector('#tab-settings .section-title h2'); if(setTitle) setTitle.textContent=T('settingsTitle');
    const setPill=document.querySelector('#tab-settings .section-title .pill'); if(setPill) setPill.textContent=T('settingsPill');
    const setNotice=document.querySelector('#tab-settings .notice'); if(setNotice) setNotice.textContent=T('settingsNotice');
    Object.entries(T('fieldLabels')).forEach(([id,label])=>setFieldLabel(id,label));
    const makerLabel=document.getElementById('makerLanguageLabel'); if(makerLabel) makerLabel.textContent = ST.uiLang==='ja' ? 'メーカー言語 / App Language' : ST.uiLang==='zh' ? 'App Language / 界面语言' : 'App Language / メーカー言語';
    setCaptionCheckboxLabels();
    setCardCheckboxLabels();
    setUiCardTitles();
    initSlots();
    initFixedForm();
    initManualControls(); initVideoControls(); IDB.open().then(()=>refreshThumbs().then(()=>renderHistory()));
    initInitialSettings();
    renderAll();
  }

export {
  T,
  LT,
  langOf,
  slotLabel,
  fixedLabel,
  displayValue,
  displayOptionLabel,
  promptValue,
  renderSelectOptions,
  mbtiDescription,
  mbtiDisplay,
  captionModeDisplay,
  getCaptionFieldLabelsArray,
  buildCaptionLine,
  buildCaptionInstruction,
  promptTargetGuide,
  outfitStyleGuide,
  isCardOutput,
  isTradingCardOutputValue,
  isTradingCardOutput,
  suggestCardRarity,
  cardEffectByRarity,
  syncCardSettingsVisibility,
  readCardFields,
  writeCardFields,
  setCardCheckboxLabels,
  cardPoseGuide,
  cardWearDescription,
  buildCardInstruction,
  buildBodyHairSummary,
  setCaptionCheckboxLabels,
  setUiCardTitles,
  readCaptionFields,
  writeCaptionFields,
  setFieldLabel,
  updateModeNote,
  applyUiLanguage,
};
