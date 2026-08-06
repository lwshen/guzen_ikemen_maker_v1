// rarity rules and prompt builders, restore-from-prompt parser
// Split from the verbatim V3.2.0 baseline (Phase 4 stage B) — bodies unchanged
// except top-level state rewritten to ST.* (see state.js).
import {
  FRIEND_REL_ZH, FRIEND_HIER_ZH,
  BODYHAIR_KEYS, BODY_ASYMS, FACE_EXTRA_DEFAULTS, FOOT_CFG_AXES, FOOT_FEATURES, FOOT_WIDTHS, IKEMEN_AXIS_LABELS, IKEMEN_DELTAS,
  OCCUPATIONS, POSTURES, SOLE_TYPES, SOLE_WRINKLES, SPORT_EXP_POOL, TOE_CURLS, TOE_LINES, TRAINING_LEVELS,
  UNIFORM_NAME_MIGRATION, UNIFORM_VARIANTS, pools, valueTranslations,
} from '../data/index.js';
import {
  deriveMeasurementB, drawProfileMeasurement, pick, uniqId, weighted,
} from './core.js';
import {
  applySlotEdit, buildSportsHistoryEditor, currentDerivedType, enCount, enOutputType, enQuality, generateCharacter, isEnglish,
  rerollOne, slotEditPool,
} from './flow.js';
import {
  SPORT_STAGES, accText, bioLine, bodyRealismLine, bodyTypeDesc, buildBioHook, buildEncounterScene, calcFootWidth,
  catchphrase, chooseFaceExtras, chooseFaceSpacing, chooseFootFeature, chooseFrameAxes, chooseHipShape, chooseSkinDetail, chooseSoleType,
  chooseSoleWrinkle, chooseTeethAlign, chooseTeethColor, chooseToeLine, chooseTrainingLevel, countryLine, eraLabel, eraStyleNote,
  eyeAreaLine, faceExtraLine, facePresetPhrase, footAxisOptions, footCfg, footFeatureLine, footWidthDesc, generateAccessories,
  generateSportsHistory, getInitial, hairDetailLine, headCount, heightContrastCue, innerCasualNotes, maxStageForAge, mbtiStyleNote,
  muscleLine, nameKana, occupationOptionsHTML, physiqueSpec, realismSpec, refSheetInstruction, refSheetKind, rerollCoordPart,
  roleWithSport, seasonLine, skinDetailLine, soleDetailLine, sportsHistoryLine, teethLine, trainingLine, underwearAvoid,
  underwearDesc, underwearShapeGuide, uniformHatPhrase, uniformJacketPhrase,
} from './generate.js';
import {
  LT,
  T, buildBodyHairSummary, buildCaptionInstruction, buildCardInstruction, cardEffectByRarity, cardPoseGuide, cardWearDescription, displayOptionLabel,
  displayValue, mbtiDescription, outfitStyleGuide, promptTargetGuide, slotLabel, suggestCardRarity,
} from './i18n.js';
import {
  applyFashionSenseFx, applyMuscleFashion, generateInnerProfile,
} from './inner.js';
import {
  ST, els,
} from './state.js';
import {
  renderAll, switchTab,
} from './ui.js';

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
    if(english==='zh'){
      if(sc >= 85) return '奇迹级五官';
      if(sc >= 75) return '回头率级帅哥';
      if(sc >= 65) return '吸睛帅哥';
      if(sc >= 55) return '较端正的五官';
      if(sc >= 45) return '平均水平的五官';
      return '朴实亲切的五官';
    }
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
    if(!ST.current || ST.spinning) return;
    if(key==='skinDetail' || key==='skinDetail2'){
      ST.current.skinDetail = chooseSkinDetail(ST.current.age, ST.current.vibe, ST.current.role, ST.current.gapMode);
      ST.current.skinDetail2 = (ST.current.skinDetail && ST.current.skinDetail !== 'なし（クリアな肌）') ? chooseSkinDetail(ST.current.age, ST.current.vibe, ST.current.role, ST.current.gapMode, ST.current.skinDetail, true) : 'なし（クリアな肌）';
      renderAll(); return;
    }
    if(key==='sceneIdea'){ ST.current.sceneIdea = buildEncounterScene(ST.current); renderAll(); return; }
    if(key==='faceSpacing'){ ST.current.faceSpacing = chooseFaceSpacing(ST.current.vibe); renderAll(); return; }
    if(['lips','mouthPos','faceRatio','faceAsym','footWidth'].includes(key)){ const pool = slotEditPool(key); if(pool) ST.current[key] = pick(pool); renderAll(); return; }
    if(key==='footFeature'){ ST.current.footFeature = chooseFootFeature(ST.current); renderAll(); return; }
    if(['eyebrowDensity','jawChin','jawAngle','ear','forehead','hairline','cheek','dimple','mole','hairTexture','eyeBags','adamsApple','lipTone','browRidge','facialHairGroom'].includes(key)){ const fx = chooseFaceExtras(ST.current); ST.current[key] = fx[key]; renderAll(); return; }
    if(['jacket','top','bottom','shoes'].includes(key)){ rerollCoordPart(ST.current, key, false); renderAll(); return; }
    if(['holidayJacket','holidayTop','holidayBottom','holidayShoes'].includes(key)){ rerollCoordPart(ST.current, key.replace('holiday','').toLowerCase(), true); renderAll(); return; }
    if(key==='tie'){ rerollCoordPart(ST.current, 'tie', false); renderAll(); return; }
    if(key==='suitSilhouette'){ rerollCoordPart(ST.current, 'sil', false); renderAll(); return; }
    if(key==='accessoriesEdit'){ const ring=(ST.current.accessories||[]).some(x=>/結婚指輪/.test(x)); ST.current.accessories=generateAccessories(ST.current,false); if(ring) ST.current.accessories.push('左薬指に結婚指輪'); renderAll(); return; }
    if(key==='holidayAccessoriesEdit'){ const ring=(ST.current.holidayAccessories||[]).some(x=>/結婚指輪/.test(x)); ST.current.holidayAccessories=generateAccessories(ST.current,true); if(ring) ST.current.holidayAccessories.push('左薬指に結婚指輪'); renderAll(); return; }
    if(key==='holidayStyleNote'){ ST.current.holidayStyleNote = mbtiStyleNote(ST.current.mbti); applyMuscleFashion(ST.current); if(typeof applyFashionSenseFx==='function') applyFashionSenseFx(ST.current); renderAll(); return; }
    if(key==='trainingLevel'){ ST.current.trainingLevel = chooseTrainingLevel(ST.current); applyMuscleFashion(ST.current); ST.current.bioText = buildBioHook(ST.current); renderAll(); return; }
    if(key==='sportsHistory'){ ST.current.sportsHistory = generateSportsHistory(ST.current.age, ST.current.role, ST.current.sportName, getInitial().sportsBodyInfluence); ST.current.bioText = buildBioHook(ST.current); renderAll(); return; }
    if(key==='bioText'){ ST.current.bioText = buildBioHook(ST.current); renderAll(); return; }
    if(key==='measurementA'){ ST.current.measurementA=drawProfileMeasurement('A'); ST.current.measurementB=deriveMeasurementB(ST.current.measurementA); renderAll(); return; }
    if(key==='measurementB'){ ST.current.measurementB=deriveMeasurementB(ST.current.measurementA); renderAll(); return; }
    if(key==='measurementC'){ ST.current.measurementC=drawProfileMeasurement('C'); renderAll(); return; }
    if(key==='baseWearType'){ ST.current.baseWearType = weighted([['ボクサーパンツ',6],['ショートショーツ',2],['スポーツスパッツ',2]]); renderAll(); return; }
    if(key==='boxerColor'){ ST.current.boxerColor = pick(pools.boxerColors); renderAll(); return; }
    if(key==='soleType'){ ST.current.soleType = chooseSoleType(ST.current); ST.current.soleWrinkle = chooseSoleWrinkle(ST.current); renderAll(); return; }
    if(key==='toeLine'){ ST.current.toeLine = chooseToeLine(ST.current); renderAll(); return; }
    if(key==='soleWrinkle'){ ST.current.soleWrinkle = chooseSoleWrinkle(ST.current); renderAll(); return; }
    if(key==='toeCurl'){ ST.current.toeCurl = weighted(TOE_CURLS.map(x=>[x[0], x[1]])); renderAll(); return; }
    if(key==='sportsHistory'){ ST.current.sportsHistory = generateSportsHistory(Number(ST.current.age), ST.current.role, ST.current.sportName); renderAll(); return; }
    if(key==='muscleTone'){
      const maxSt = maxStageForAge(Number(ST.current.age)||25);
      (ST.current.sportsHistory || []).forEach((x, i)=>{
        const stages = x.to - x.from + 1;
        const gap = maxSt - x.to;
        const decay = gap<=0?1: gap===1?0.7: gap===2?0.5:0.35;
        const isProMain = ST.current.role === 'プロスポーツ選手' && x.name === ST.current.sportName;
        let st = Math.random() < 0.15 && !isProMain ? 0 : Math.round(stages * decay * (0.5 + Math.random()*0.7) * 100)/100;
        if(isProMain) st = Math.max(1.5, st);
        x.strength = i === 1 ? Math.round(st * 0.5 * 100)/100 : st;
      });
      renderAll(); return;
    }
    if(['shoulderWidth','waistPos','legLength','armLength','frame','neckLength','limbSize'].includes(key)){ const fx = chooseFrameAxes(ST.current); ST.current[key] = fx[key]; renderAll(); return; }
    if(key==='hipShape'){ ST.current.hipShape = chooseHipShape(ST.current); renderAll(); return; }
    if(key==='teethAlign'){ ST.current.teethAlign = chooseTeethAlign(ST.current.age); ST.current.teethColor = chooseTeethColor(ST.current.age, ST.current.teethAlign); renderAll(); return; }
    if(key==='teethColor'){ ST.current.teethColor = chooseTeethColor(ST.current.age, ST.current.teethAlign); renderAll(); return; }
    if(key==='bodyHairAll'){
      const fresh = generateCharacter('full');
      BODYHAIR_KEYS.forEach(k=>{ if(fresh[k]!==undefined) ST.current[k]=fresh[k]; });
      renderAll(); return;
    }
    const INNER_REROLL = {innerDream:['dream'], innerDesire:['desire'], weaknessMind:['weakness'], weaknessBody:['weakness'], innerTalent:['talent'], pastUpbringing:['past'], pastTrauma:['past'], pronoun:['pronoun'], incomeText:['income'], originText:['origin'], educationText:['education'], complexText:['complex'], bloodType:['blood'], loveTarget:['love'], maritalText:['marital'], livingText:['living'], familyText:['family'], birthplaceText:['birthplace'], birthdateText:['birthdate'], nicknameText:['nickname'], speechText:['speech'], memoryText:['memory'], friendText:['friend'], loverText:['lover'], residenceText:['residence'], healthText:['health'], hobbyText:['hobby'], myBoomText:['myboom'], foodLikeText:['foods'], foodHateText:['foods'], principleText:['principle'], unforgivableText:['unforgivable'], fuzokuText:['fuzoku'], gambleText:['gamble'], firstExpText:['firstexp'], weekFreqText:['weekfreq'], drinkText:['drink'], smokeText:['smoke'], loveCountText:['lovecount'], assetText:['asset'], selfFreqText:['selffreq'], fashionSenseText:['fashionsense']};
    if(INNER_REROLL[key]){ generateInnerProfile(ST.current, INNER_REROLL[key]); renderAll(); return; }
    if(key==='role'){
      const fresh = generateCharacter('full');
      ['role','sportName','occupationMode','holidayPersona','workUniform','workUniformEn','headwear','headwearOn','outfitType','outfitBrand','jacket','top','bottom','shoes','sockBrand','sockType','sockShape','sockMaterial','sockColor','sockUse'].forEach(k=>{ if(fresh[k]!==undefined) ST.current[k]=fresh[k]; });
      if(ST.current.bloodType) generateInnerProfile(ST.current, ['income','education','dream']);
      renderAll(); return;
    }
    rerollOne(key);
  }

  function openProfileEdit(btn){
    if(!ST.current) return;
    const kv = btn.closest('.kv');
    if(!kv || kv.querySelector('.pf-editor')) return;
    if(btn.dataset.pEdit === 'sportsHistory'){
      const ed = document.createElement('div'); ed.className='pf-editor';
      const save = buildSportsHistoryEditor(ed, ()=>{ ed.remove(); renderAll(); });
      const ok = document.createElement('button'); ok.className='pf-btn'; ok.textContent = LT('決定', 'Save', '确定'); ok.onclick=save;
      const ng = document.createElement('button'); ng.className='pf-btn'; ng.textContent = LT('キャンセル', 'Cancel', '取消'); ng.onclick=()=>ed.remove();
      ed.append(ok, ng); kv.append(ed); return;
    }
    const keys = btn.dataset.pEdit.split(',');
    const ed = document.createElement('div');
    ed.className = 'pf-editor';
    const sels = [];
    keys.forEach(k=>{
      const pool = slotEditPool(k);
      if(!pool || !pool.length) return;
      const cur = ST.current[k] !== undefined && ST.current[k] !== null ? String(ST.current[k]) : '';
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
    okB.onclick = () => { const vals = sels.map(([k,sel])=>[k, sel.value]); vals.forEach(([k,v])=>{ if(String(ST.current[k]) !== v) applySlotEdit(k, v); }); renderAll(); };
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
      const onLabel = LT('着帽する', 'Wear the cap', '戴帽');
      const offLabel = LT('着帽しない', 'No cap', '不戴帽');
      rows.push([L.headwearRow, `<select data-headwear-edit style="background:#0d1a2c;border:1px solid var(--gold);border-radius:8px;color:#eaf2ff;padding:4px 6px;font-size:12px"><option value="on"${c.headwearOn!==false?' selected':''}>${onLabel}</option><option value="off"${c.headwearOn===false?' selected':''}>${offLabel}</option></select> <span class="notice" style="display:inline">${displayValue('headwear', c.headwear)}</span>`]);
    }
    return rows;
  }

  function applyUniformVariant(name){
    if(!ST.current || !UNIFORM_VARIANTS[ST.current.role]) return;
    const v = UNIFORM_VARIANTS[ST.current.role].find(x=>x[0]===name);
    if(!v) return;
    ST.current.workUniform = v[0]; ST.current.workUniformEn = v[1];
    ST.current.top = v[2]; ST.current.bottom = v[3]; ST.current.shoes = v[4];
    ST.current.headwear = v[7] || '';
    ST.current.jacket = (v[8] && ST.current.season === '冬') ? v[8] : 'なし';
    ST.current.outfitBrand = '支給品・制服';
    renderAll();
  }

  function friendRelationText(c, english=false){
    const fo = c.friendOf; if(!fo) return '';
    const relMapEn = {'同僚':'Colleague','同期':'Same-cohort colleague','同級生':'Classmate','幼なじみ':'Childhood friend','趣味仲間':'Hobby friend','学生時代からの友人':'Friend since school days'};
    const hierMapEn = {'上司':'his boss','先輩':'his senior','同い年':'same age','後輩':'his junior','同期':'same cohort'};
    if(english==='zh') return `${fo.name}（${fo.age}岁・${displayValue('role', fo.role)}）的${FRIEND_REL_ZH[fo.relation] || fo.relation}（${FRIEND_HIER_ZH[fo.hierarchy] || fo.hierarchy}）`;
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
    const isFeet = !!(ST.current && refSheetKind(currentDerivedType()) === 'feet');
    box.classList.toggle('hidden', !isFeet);
    if(!isFeet) return;
    const cfg = footCfg(ST.current);
    const form = document.getElementById('footCfgForm');
    const randomLabel = LT('ランダム（おまかせ）', 'Random (auto)', '随机（自动）');
    form.innerHTML = FOOT_CFG_AXES.map(([axis, ja, en])=>{
      const opts = ['ランダム'].concat(footAxisOptions(axis));
      return `<label class="field"><span>${ST.uiLang==='en' ? en : ja}</span><select data-foot-axis="${axis}">${opts.map(v=>`<option value="${v}"${cfg[axis]===v?' selected':''}>${v==='ランダム' ? randomLabel : v}</option>`).join('')}</select></label>`;
    }).join('');
    form.querySelectorAll('[data-foot-axis]').forEach(sel=>{
      sel.onchange = () => { const cfg2 = footCfg(ST.current); cfg2[sel.dataset.footAxis] = sel.value; ST.current.footScene = cfg2; renderAll(); };
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
      ST.currentGroup = null; ST.activeMember = 0;
      ST.current = c;
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
    const wearLabels = LT({'私服':'私服','職業服装':'職業服装'}, {'私服':'Casual outfit','職業服装':'Work outfit'}, {'私服':'便服','職業服装':'职业服装'});
    wearSel.innerHTML = wearOpts.map(v=>`<option value="${v}">${wearLabels[v]}</option>`).join('');
    cntSel.innerHTML = FRIEND_PAIR_COUNTS.map(v=>`<option value="${v}">${LT(v, parseInt(v,10)+' image'+(parseInt(v,10)>1?'s':''), parseInt(v,10)+' 张')}</option>`).join('');
    if(ST.current){ wearSel.value = ST.current.friendPairWear || '私服'; cntSel.value = ST.current.friendPairCount || '3枚'; }
  }

export {
  RARE_RULES,
  rarityBreakdown,
  ikemenBreakdown,
  ikemenScore,
  ikemenRank,
  scoreRarity,
  rerollProfile,
  openProfileEdit,
  buildOutfitPrompt,
  buildScenePrompt,
  buildTradingCardPrompt,
  buildPrompt,
  migrateUniformFields,
  buildUniformEditRows,
  applyUniformVariant,
  friendRelationText,
  friendPairOutfitPhrase,
  friendPairScene,
  FRIEND_PAIR_COUNTS,
  friendPairCountEn,
  heightGapLine,
  buildFriendPairPrompt,
  renderFootCfgPanel,
  parseCharFromPrompt,
  loadFromPromptText,
  renderFriendPairControls,
};
