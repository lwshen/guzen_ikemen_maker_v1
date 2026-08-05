// rendering: profile, history, tabs, presets, chips, import/export
// Split from the verbatim V3.2.0 baseline (Phase 4 stage B) — bodies unchanged
// except top-level state rewritten to ST.* (see state.js).
import {
  EYE_MIGRATION, INNER_CATS, PROMPT_PANES, TOE_CURLS, pools,
} from '../data/index.js';
import {
  STORAGE_KEY, ensureProfileMeasurements, profileMeasurementCLabel, weighted,
} from './core.js';
import {
  buildDerivedPrompt, buildGroupCardPrompt, buildGroupMainPrompt, buildGroupOutfitPrompt, buildGroupPrompt, currentDerivedType, isCombinedGroup, isEnglish,
  isRefMode, refPrefix, renderGroupUI, renderSlots, slotEditPool, usageNote,
} from './flow.js';
import {
  accWorkNote, bioLine, buildBioHook, calcFootWidth, catchphrase, chooseEyeShape, chooseEyebrow, chooseEyelash,
  chooseEyelid, chooseFaceExtras, chooseFootFeature, chooseFrameAxes, chooseHipShape, chooseSoleType, chooseSoleWrinkle, chooseTeethAlign,
  chooseTeethColor, chooseToeLine, eraLabel, eraProfile, generateSportsHistory, getInitial, headCount, muscleLine,
  muscleSummary, nameKana, sportsHistoryText, underwearDesc,
} from './generate.js';
import {
  LT,
  T, buildBodyHairSummary, captionModeDisplay, cardEffectByRarity, displayOptionLabel, displayValue, getCaptionFieldLabelsArray, mbtiDescription,
  mbtiDisplay, slotLabel, syncCardSettingsVisibility, writeCaptionFields, writeCardFields,
} from './i18n.js';
import {
  buildInnerSection, generateInnerProfile, makeInnerFriend,
} from './inner.js';
import {
  applyUniformVariant, buildFriendPairPrompt, buildOutfitPrompt, buildPrompt, buildScenePrompt, buildUniformEditRows, friendRelationText, ikemenBreakdown,
  ikemenRank, ikemenScore, migrateUniformFields, openProfileEdit, rarityBreakdown, renderFootCfgPanel, renderFriendPairControls, rerollProfile,
  scoreRarity,
} from './prompts.js';
import {
  ST, els,
} from './state.js';

  /* ===== V3.1 線画プレビュー（密テンプレート方式・髪なし） ===== */
  function renderProfile(){
    if(!ST.current){ const ib0=document.getElementById('innerAboveTabs'); if(ib0) ib0.innerHTML=''; els.profileView.innerHTML=`<p class="notice">${LT('まだ結果がありません。', 'No result yet.', '还没有结果。')}</p>`; els.promptBox.value=''; document.getElementById('outfitPromptBox').value=''; document.getElementById('scenePromptBox').value=''; return; }
    if(!ST.current.personality && ST.current.mbti) ST.current.personality = mbtiDescription(ST.current.mbti, false);
    migrateUniformFields(ST.current);
    if(ST.current.cardWearMode === '提案服装') ST.current.cardWearMode = '職業服装';
    if(!ST.current.lips) ST.current.lips = '標準的な厚さの唇';
    if(!ST.current.mouthPos) ST.current.mouthPos = '標準的な位置・大きさの口';
    if(!ST.current.faceSpacing) ST.current.faceSpacing = '標準的な配置';
    if(!ST.current.faceRatio) ST.current.faceRatio = '標準的なバランスの比率';
    if(!ST.current.faceAsym) ST.current.faceAsym = 'ほぼ対称（ごく自然な左右差）';
    if(!ST.current.sportsHistory) ST.current.sportsHistory = generateSportsHistory(Number(ST.current.age), ST.current.role, ST.current.sportName);
    if(!ST.current.ikemenIndexMode) ST.current.ikemenIndexMode = '表示しない';
    if(!ST.current.bodyHairMode) ST.current.bodyHairMode = '詳細指定';
    if(!ST.current.shoulderWidth){ const fx = chooseFrameAxes(ST.current); Object.assign(ST.current, fx); }
    if(!ST.current.hipShape) ST.current.hipShape = chooseHipShape(ST.current);
    if(!ST.current.teethAlign) ST.current.teethAlign = chooseTeethAlign(ST.current.age);
    if(!ST.current.teethColor) ST.current.teethColor = chooseTeethColor(ST.current.age, ST.current.teethAlign);
    if(!ST.current.footWidth) ST.current.footWidth = calcFootWidth(ST.current);
    if(!ST.current.footFeature) ST.current.footFeature = chooseFootFeature(ST.current);
    if(EYE_MIGRATION[ST.current.eyes]){ const em = EYE_MIGRATION[ST.current.eyes]; if(!ST.current.eyelid) ST.current.eyelid = em.eyelid; if(!ST.current.eyeShape) ST.current.eyeShape = em.eyeShape; ST.current.eyes = em.eyes; }
    if(!ST.current.eyebrow) ST.current.eyebrow = chooseEyebrow(ST.current.vibe);
    if(!ST.current.eyelid) ST.current.eyelid = chooseEyelid(ST.current.nationality, ST.current.ethnicity);
    if(!ST.current.eyeShape) ST.current.eyeShape = chooseEyeShape();
    if(!ST.current.eyelash) ST.current.eyelash = chooseEyelash();
    if(!ST.current.jawChin){ const fx = chooseFaceExtras(ST.current); for(const k in fx){ if(ST.current[k] === undefined) ST.current[k] = fx[k]; } }
    if(!ST.current.baseWearType) ST.current.baseWearType = 'ボクサーパンツ';
    if(!ST.current.trainingLevel) ST.current.trainingLevel = 'なし';
    if(!ST.current.bioText) ST.current.bioText = buildBioHook(ST.current);
    ensureProfileMeasurements(ST.current);
    if(!ST.current.bloodType || !ST.current.maritalText) generateInnerProfile(ST.current);
    else if(!ST.current.principleText) generateInnerProfile(ST.current, ['principle','unforgivable','fuzoku','gamble']);
    else if(!ST.current.drinkText) generateInnerProfile(ST.current, ['firstexp','weekfreq','drink','smoke']);
    else if(!ST.current.assetText) generateInnerProfile(ST.current, ['lovecount','asset']);
    else if(!ST.current.selfFreqText) generateInnerProfile(ST.current, ['weekfreq','selffreq']);
    else if(!ST.current.fashionSenseText) generateInnerProfile(ST.current, ['fashionsense']);
    if(!ST.current.bangs) ST.current.bangs = '指定なし';
    if(!ST.current.hairFinish) ST.current.hairFinish = '指定なし';
    if(!ST.current.hairVolume) ST.current.hairVolume = '標準的な毛量';
    if(!ST.current.soleType) ST.current.soleType = chooseSoleType(ST.current);
    if(!ST.current.soleWrinkle) ST.current.soleWrinkle = chooseSoleWrinkle(ST.current);
    if(!ST.current.toeLine) ST.current.toeLine = chooseToeLine(ST.current);
    if(!ST.current.toeCurl) ST.current.toeCurl = weighted(TOE_CURLS.map(x=>[x[0], x[1]]));
    if(ST.current.limbSize === '大きめ' && !ST.current._limbFootAdj){
      const fs0 = parseFloat(ST.current.footSize);
      if(fs0){ ST.current.footSize = Math.min(31.0, Math.round((fs0 + 0.5) * 2) / 2).toFixed(1) + 'cm'; }
      ST.current._limbFootAdj = true;
    }
    const L=T('rows');
    const mainWear = ST.uiLang==='en' ? `${underwearDesc(ST.current, true)} only` : `${underwearDesc(ST.current, false)}のみ`;
    const sections = [
      ['basic', L.basic, [[L.name,ST.current.name,'name'],[L.age,displayValue('age',ST.current.age),'age'],[L.era, ST.uiLang==='en' ? `${ST.current.eraYear || '2026'} (${eraProfile(ST.current.eraYear || '2026').labelEn})${ST.current.season ? ` / ${displayValue('season', ST.current.season) || ST.current.season}` : ''}` : `${eraLabel(ST.current.eraYear)}（${eraProfile(ST.current.eraYear || '2026').labelJa}）${ST.current.season ? `・${ST.current.season}` : ''}`,'eraYear'],[L.natEth,`${displayValue('nationality',ST.current.nationality)} / ${displayValue('ethnicity',ST.current.ethnicity)}`,'nationality,ethnicity'],[L.roleVibe,`${displayValue('role',ST.current.role)} / ${displayValue('vibe',ST.current.vibe)}${ST.current.occupationMode ? `（${ST.uiLang==='en' ? displayValue('occupationMode', ST.current.occupationMode) || ST.current.occupationMode : ST.current.occupationMode}）` : ''}`,'role,vibe'],[LT('経験競技スポーツ', 'Sports Background', '运动经历'), sportsHistoryText(ST.current, ST.uiLang==='en'), 'sportsHistory']].concat(ST.current.groupSetting ? [[L.group, `${displayValue('groupSetting',ST.current.groupSetting) || ST.current.groupSetting} / ${displayValue('groupPosition',ST.current.groupPosition) || ST.current.groupPosition}`]] : []).concat(ST.current.friendOf ? [[L.friendRow, friendRelationText(ST.current, ST.uiLang==='en')]] : []).concat([[L.mbti,`<span class="mini-badge">${mbtiDisplay(ST.current)}</span>`,'mbti']])],
      buildInnerSection(ST.current, L),
      ['face', L.faceSection, [[L.face,`${displayValue('facePreset',ST.current.facePreset)} / ${displayValue('ageAppearance',ST.current.ageAppearance)}`,'facePreset,ageAppearance'],[L.faceLine,displayValue('faceLine',ST.current.faceLine),'faceLine'],[slotLabel('eyebrow','眉'),`${displayValue('eyebrow',ST.current.eyebrow||'標準的なゆるいアーチ眉')}／${displayValue('eyebrowDensity',ST.current.eyebrowDensity||'標準的な濃さの眉')}`,'eyebrow,eyebrowDensity'],[LT('まぶた / 目の形 / 印象', 'Eyelid / Shape / Impression', '眼睑 / 眼形 / 印象'),`${displayValue('eyelid',ST.current.eyelid||'末広二重')}／${displayValue('eyeShape',ST.current.eyeShape||'標準的な目の形')}／${displayValue('eyes',ST.current.eyes)}`,'eyelid,eyeShape,eyes'],[LT('まつ毛 / 涙袋', 'Eyelashes / Tear Bags', '睫毛 / 卧蚕'),`${displayValue('eyelash',ST.current.eyelash||'標準的な長さのまつ毛')}／${displayValue('tearBags',ST.current.tearBags)}`,'eyelash,tearBags'],[L.nose,displayValue('nose',ST.current.nose),'nose'],[slotLabel('mouth','基本表情'),displayValue('mouth',ST.current.mouth),'mouth'],[LT('歯並び / 歯の色', 'Teeth Align / Color', '牙齿排列 / 颜色'), `${displayValue('teethAlign',ST.current.teethAlign||'ほぼ整った歯列')} / ${displayValue('teethColor',ST.current.teethColor||'自然な白さの歯')}`, 'teethAlign,teethColor'],[slotLabel('lips','唇の形状'),displayValue('lips',ST.current.lips || '標準的な厚さの唇'),'lips'],[slotLabel('mouthPos','口の位置'),displayValue('mouthPos',ST.current.mouthPos || '標準的な位置・大きさの口'),'mouthPos'],[slotLabel('faceSpacing','パーツ配置'),displayValue('faceSpacing',ST.current.faceSpacing || '標準的な配置'),'faceSpacing'],[slotLabel('faceRatio','目鼻口比率'),displayValue('faceRatio',ST.current.faceRatio || '標準的なバランスの比率'),'faceRatio'],[slotLabel('faceAsym','顔の左右差'),displayValue('faceAsym',ST.current.faceAsym || 'ほぼ対称（ごく自然な左右差）'),'faceAsym'],[LT('顎先 / エラ', 'Chin / Jaw', '下巴 / 下颌角'),`${displayValue('jawChin',ST.current.jawChin||'標準的な顎先')}／${displayValue('jawAngle',ST.current.jawAngle||'ほどよく張ったエラ')}`,'jawChin,jawAngle'],[LT('耳 / 彫り', 'Ears / Brow', '耳朵 / 轮廓深度'),`${displayValue('ear',ST.current.ear||'標準的な耳')}／${displayValue('browRidge',ST.current.browRidge||'彫りは標準的')}`,'ear,browRidge'],[LT('額 / 生え際', 'Forehead / Hairline', '额头 / 发际线'),`${displayValue('forehead',ST.current.forehead||'標準的な広さの額')}／${displayValue('hairline',ST.current.hairline||'直線的な生え際')}`,'forehead,hairline'],[LT('頬 / えくぼ', 'Cheeks / Dimples', '脸颊 / 酒窝'),`${displayValue('cheek',ST.current.cheek||'標準的な頬')}／${displayValue('dimple',ST.current.dimple||'えくぼなし')}`,'cheek,dimple'],[LT('ほくろ / クマ', 'Mole / Under-eye', '痣 / 黑眼圈'),`${displayValue('mole',ST.current.mole||'ほくろなし')}／${displayValue('eyeBags',ST.current.eyeBags||'クマなし')}`,'mole,eyeBags'],[LT('のどぼとけ / 唇の血色', 'Throat / Lip Tone', '喉结 / 唇色'),`${displayValue('adamsApple',ST.current.adamsApple||'標準的なのどぼとけ')}／${displayValue('lipTone',ST.current.lipTone||'標準的な血色の唇')}`,'adamsApple,lipTone'],[L.skin,displayValue('skin',ST.current.skin),'skin'],[LT('肌の特徴', 'Skin Details', '皮肤特征'),`${displayValue('skinDetail',ST.current.skinDetail || 'なし（クリアな肌）')}${ST.current.skinDetail2 && ST.current.skinDetail2 !== 'なし（クリアな肌）' ? `／${displayValue('skinDetail',ST.current.skinDetail2)}` : ''}`,'skinDetail,skinDetail2'],[L.facialHair,`${displayValue('facialHair',ST.current.facialHair)}${ST.current.facialHair!=='なし' ? `（${displayValue('facialHairGroom',ST.current.facialHairGroom||'自然に整えている')}）` : ''}`,'facialHair,facialHairGroom'],[L.glasses, displayValue('glasses', ST.current.glasses || 'なし'),'glasses'],[L.hair,`${displayValue('hairColor',ST.current.hairColor)}・${displayValue('hairStyle',ST.current.hairStyle)}（${displayValue('hairTexture',ST.current.hairTexture||'直毛')}）`,'hairColor,hairStyle,hairTexture'],[LT('前髪・整髪・毛量', 'Bangs / Styling / Volume', '刘海・造型・发量'),`${displayValue('bangs',ST.current.bangs||'指定なし')}／${displayValue('hairFinish',ST.current.hairFinish||'指定なし')}／${displayValue('hairVolume',ST.current.hairVolume||'標準的な毛量')}`,'bangs,hairFinish,hairVolume']]],
      ['body', L.bodySection, [[L.hw,`${ST.current.height} / ${ST.current.weight}`,'height,weight'],[L.body,displayValue('bodyType',ST.current.bodyType),'bodyType'],[LT('体格の目安', 'Physique Guide', '体格参考'), `${LT(`約${headCount(ST.current)}頭身`, `about ${headCount(ST.current)} heads tall`, `约${headCount(ST.current)}头身`)}`],[LT('肩幅', 'Shoulders', '肩宽'), displayValue('shoulderWidth', ST.current.shoulderWidth || '普通'), 'shoulderWidth'],[LT('腰位置 / 脚長 / 腕長', 'Waist Pos / Legs / Arms', '腰线 / 腿长 / 臂长'), `${displayValue('waistPos',ST.current.waistPos||'標準')} / ${displayValue('legLength',ST.current.legLength||'標準')} / ${displayValue('armLength',ST.current.armLength||'標準')}`, 'waistPos,legLength,armLength'],[LT('骨格 / 首 / 手足サイズ感', 'Frame / Neck / Limbs', '骨架 / 脖颈 / 手脚大小'), `${displayValue('frame',ST.current.frame||'標準')} / ${displayValue('neckLength',ST.current.neckLength||'標準')} / ${displayValue('limbSize',ST.current.limbSize||'標準')}`, 'frame,neckLength,limbSize'],[LT('臀部の形状', 'Hip Shape', '臀形'), displayValue('hipShape', ST.current.hipShape || '標準的な丸みの臀部'), 'hipShape'],[LT('発達部位', 'Muscle Development', '肌肉发达部位'), muscleSummary(ST.current, ST.uiLang==='en')],[LT('筋トレ習慣', 'Training Habit', '健身习惯'), displayValue('trainingLevel', ST.current.trainingLevel || 'なし'), 'trainingLevel'],[LT('発達部位', 'Muscle Development', '肌肉发达部位'), (muscleLine(ST.current, false) || 'なし（競技経験の影響なし）').replace(/^発達部位：/,'').split('。')[0], 'muscleTone'],[L.foot,ST.current.footSize,'footSize'],[LT('ワイズ（足幅）', 'Foot Width', '足宽（楦宽）'), displayValue('footWidth', ST.current.footWidth || calcFootWidth(ST.current)), 'footWidth'],[L.footShape,displayValue('footShape',ST.current.footShape),'footShape'],[LT('足の特徴', 'Foot Traits', '足部特征'), displayValue('footFeature', ST.current.footFeature || '特徴なし・整った足'), 'footFeature'],[LT('足裏タイプ', 'Sole Type', '脚底类型'), displayValue('soleType', ST.current.soleType || '均整なめらか型'), 'soleType'],[LT('指の並び・向き', 'Toe Alignment', '脚趾排列・朝向'), displayValue('toeLine', ST.current.toeLine || 'まっすぐ前を向いたそろった並び'), 'toeLine'],[LT('しわ・反り', 'Creases / Curl', '纹路・弯曲'), `${displayValue('soleWrinkle',ST.current.soleWrinkle || '標準的なしわ')}／${displayValue('toeCurl',ST.current.toeCurl || '指がフラットに伸びた状態')}`, 'soleWrinkle,toeCurl']]],
      ['bodyhair', L.bodyHairSection, [[L.bodyHair, buildBodyHairSummary(ST.current, ST.uiLang==='en'),'bodyHairAll']]],
      ['main', L.mainSection, [[L.main, mainWear, (ST.current.mainWearMode||'ボクサーパンツのみ')!=='時代に合った下着の種類' ? 'baseWearType,boxerColor,boxerBrand' : 'underwearType,underwearColor,boxerBrand']]],
      ['outfit', L.outfitSection, (()=>{
        const en2 = ST.uiLang==='en';
        const B=(b)=>b?`${b}・`:'';
        const isSuit = ['紺スーツ','黒スーツ','グレースーツ','三つ揃いスーツ'].includes(ST.current.outfitType);
        const rows=[[L.weekdayOutfit,`${displayValue('outfitBrand',ST.current.outfitBrand)}・${displayValue('outfitType',ST.current.outfitType)}`,'outfitType']];
        rows.push(...buildUniformEditRows(ST.current, L));
        if(!ST.current.workUniform){
          rows.push([en2?'Work Outer':'上着（平日）', `${ST.current.coat?`${B(ST.current.outerBrand)}${ST.current.coat}／中は`:''}${ST.current.jacket||'指定なし'}`, 'jacket']);
          rows.push([en2?'Work Top':'トップス（平日）', `${B(ST.current.topBrand)}${ST.current.top}`, 'top']);
          rows.push([en2?'Work Bottom':'ボトムス（平日）', `${B(ST.current.bottomBrand)}${ST.current.bottom}`, 'bottom']);
          rows.push([en2?'Work Shoes':'靴（平日）', `${B(ST.current.shoesBrand)}${ST.current.shoes}`, 'shoes']);
          if(isSuit){
            rows.push([en2?'Tie':'ネクタイ', ST.current.tie||'ノータイ', 'tie']);
            rows.push([en2?'Suit Silhouette':'シルエット', ST.current.suitSilhouette||'—', 'suitSilhouette']);
          }
        }
        rows.push([L.sock,`${displayValue('sockBrand',ST.current.sockBrand)}・${displayValue('sockType',ST.current.sockType)}・${displayValue('sockColor',ST.current.sockColor)}`,'sockType']);
        rows.push([LT('アクセサリー（平日）','Accessories (Work)','配饰（工作日）'), ((ST.current.accessories||[]).map(a=>displayValue('accessory',a)).join('・')||displayValue('accessory','なし'))+accWorkNote(ST.current), 'accessoriesEdit']);
        if(ST.current.holidayOutfitType){
          rows.push([L.holidayOutfit,`${displayValue('outfitBrand',ST.current.holidayOutfitBrand)}・${displayValue('outfitType',ST.current.holidayOutfitType)}${ST.current.holidayGapSuit?'⚡':''}`,'holidayOutfitType']);
          rows.push([LT('上着（休日）','Casual Outer','外套（休息日）'), `${ST.current.holidayOuterBrand?`${ST.current.holidayOuterBrand}・`:''}${displayValue('holidayJacket',ST.current.holidayJacket||'指定なし')}`, 'holidayJacket']);
          rows.push([LT('トップス（休日）','Casual Top','上装（休息日）'), `${ST.current.holidayTopBrand?`${ST.current.holidayTopBrand}・`:''}${displayValue('holidayTop',ST.current.holidayTop||'')}`, 'holidayTop']);
          rows.push([LT('ボトムス（休日）','Casual Bottom','下装（休息日）'), `${ST.current.holidayBottomBrand?`${ST.current.holidayBottomBrand}・`:''}${displayValue('holidayBottom',ST.current.holidayBottom||'')}`, 'holidayBottom']);
          rows.push([LT('靴（休日）','Casual Shoes','鞋子（休息日）'), `${ST.current.holidayShoesBrand?`${ST.current.holidayShoesBrand}・`:''}${displayValue('holidayShoes',ST.current.holidayShoes||'')}`, 'holidayShoes']);
          rows.push([L.holidaySock,`${displayValue('sockBrand',ST.current.holidaySockBrand)}・${displayValue('sockType',ST.current.holidaySockType)}・${displayValue('sockColor',ST.current.holidaySockColor)}`]);
          rows.push([LT('アクセサリー（休日）','Accessories (Casual)','配饰（休息日）'), ((ST.current.holidayAccessories||[]).map(a=>displayValue('accessory',a)).join('・')||displayValue('accessory','なし')), 'holidayAccessoriesEdit']);
          const memo=[ST.current.holidayGapSuit?(en2?'Suit even on days off':'休日なのにスーツ（本人は私服のつもり）'):'',ST.current.holidayStyleNote||ST.current.styleNote,ST.current.muscleFashionNote,ST.current.senseFashionNote].filter(Boolean).join('。');
          rows.push([LT('着こなしメモ','Styling Memo','穿搭笔记'), memo||'—', 'holidayStyleNote']);
        }
        return rows;
      })()],
      ['output', L.outputSection, [[L.background,displayValue('background',ST.current.background),'background'],[L.output,`${displayValue('outputType',ST.current.outputType)} / ${displayValue('count',ST.current.count)}`],[L.promptTarget,`<span class="mini-badge">${ST.current.promptTarget || 'ChatGPT'}</span>`],[L.imageText, ST.current.captionMode==='表記しない' ? captionModeDisplay(ST.current.captionMode) : `${captionModeDisplay(ST.current.captionMode)} / ${getCaptionFieldLabelsArray(ST.current, ST.uiLang==='zh' ? 'zh' : ST.uiLang==='en').join(', ')}`],[LT('顔立ちプリセット出力', 'Face Preset in Prompt', '脸型预设输出'), displayValue('facePresetOut', ST.current.facePresetOut||'含める'), 'facePresetOut'],[L.cardSetting, `${displayValue('cardStyle',ST.current.cardStyle)} / ${ST.current.cardRarity} / ${displayValue('cardTheme',ST.current.cardTheme)} / ${displayValue('cardLayout',ST.current.cardLayout)} / ${displayValue('cardWearMode',ST.current.cardWearMode || 'ボクサーパンツのみ')} / ${displayValue('cardEffect',cardEffectByRarity(ST.current.cardRarity))}`]]],
      ['scene', L.sceneSection, [[L.scene,displayValue('sceneIdea',ST.current.sceneIdea),'sceneIdea']]]
    ];
    const pcIcons = {basic:'👤', inner:'🎭', face:'🙂', body:'📐', bodyhair:'🧔', main:'🩳', outfit:'👕', output:'🖨️', scene:'🎬'};
    const pcSpan2 = {output:true, scene:true, inner:true};
    const cpMode = ST.current.catchphraseMode || '結果画面のみ表示';
    const measurementHtml = `<div class="measurement-panel">
      <div class="measurement-title">${LT('完成プロフィール限定 A / B / C', 'PROFILE-ONLY A / B / C', '仅完成档案显示 A / B / C')}</div>
      <div class="measurement-row"><b>A</b><span class="measurement-value">${Number(ST.current.measurementA).toFixed(1)}cm</span><button class="measurement-reroll" data-p-dice="measurementA" title="${LT('Aだけ再抽選', 'Reroll A only', '仅重抽 A')}">🎲 ${LT('Aを再抽選', 'Reroll A', '重抽 A')}</button></div>
      <div class="measurement-row"><b>B</b><span class="measurement-value">${Number(ST.current.measurementB).toFixed(1)}cm</span><button class="measurement-reroll" data-p-dice="measurementB" title="${LT('Bだけ再抽選', 'Reroll B only', '仅重抽 B')}">🎲 ${LT('Bを再抽選', 'Reroll B', '重抽 B')}</button></div>
      <div class="measurement-row"><b>C</b><span class="measurement-value">${profileMeasurementCLabel(ST.current.measurementC, ST.uiLang==='en')}</span><button class="measurement-reroll" data-p-dice="measurementC" title="${LT('Cだけ再抽選', 'Reroll C only', '仅重抽 C')}">🎲 ${LT('Cを再抽選', 'Reroll C', '重抽 C')}</button></div>
    </div>`;
    const cpHtml = (cpMode !== '表示しない' ? `<div class="catchphrase">――${catchphrase(ST.current, ST.uiLang==='en')}</div>` : '') + `<div class="bio-hook" style="margin:0 0 12px;font-size:14px;color:#cfe0f5;line-height:1.6;border-left:3px solid var(--blue);padding-left:10px">${ST.uiLang==='en' ? bioLine(ST.current, true) : (ST.current.bioText || bioLine(ST.current, false))}<br><span style="font-size:12px;color:#9fb0c7">${nameKana(ST.current)}：${ST.current.height}／${ST.current.weight}／${String(ST.current.footSize).endsWith('cm') ? ST.current.footSize : ST.current.footSize + 'cm'}</span> <button class="pf-btn" data-p-dice="bioText" title="🎲">🎲</button></div>` + measurementHtml;
    const badges = cpHtml + `<div class="badge-row">
      <span class="badge-mbti">★ ${mbtiDisplay(ST.current)}</span>
      <span class="badge-target">⚡ Prompt Target: ${ST.current.promptTarget || 'ChatGPT'}</span>
      <span class="badge-cardinfo">🃏 ${displayValue('cardStyle',ST.current.cardStyle)} / ${ST.current.cardRarity || 'R'}</span>
    </div>`;
    const bd = rarityBreakdown(ST.current);
    const rr = scoreRarity(ST.current);
    const ikm = ST.current.ikemenIndexMode === '表示する' ? (()=>{ const sc = ikemenScore(ST.current); return `<div class="subcard" style="margin:0 0 12px"><h3>${LT('イケメン指数', 'Handsome Index', '帅哥指数')} <span class="pill" style="margin-left:8px">${sc} / 100 — ${ikemenRank(sc, ST.uiLang==='en')}</span></h3><div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:6px">${ikemenBreakdown(ST.current).map(([l,d])=>`<span class="pill">${displayValue('ikemenRule',l)} ${d>0?'+':''}${d}</span>`).join('') || `<span class="notice">${LT('すべて標準的な造形。', 'All standard features.', '五官全部为标准造型。')}</span>`}</div><p class="notice" style="margin:6px 0 0">${LT('標準的な造形がちょうど50ptになる設計です（顔の19軸から算出。プロンプトには含めません）。', 'Standard features score exactly 50. Computed from 19 facial axes; never written into prompts.', '标准造型恰好为 50 分（由 19 个面部维度计算，不会写入提示词）。')}</p></div>` })() : '';
    const bdHtml = ikm + `<div class="subcard" style="margin:0 0 12px"><h3>${LT('レア内訳', 'Rarity Breakdown', '稀有度明细')} <span class="pill" style="margin-left:8px">${rr[0]} pt / ${rr[1]}</span></h3><div style="display:flex;flex-wrap:wrap;gap:4px">${bd.length ? bd.map(([l,p])=>`<span class="pill">${displayValue('rareRule',l)} +${p}</span>`).join('') : `<span class="notice">${LT('今回はレア該当なし。', 'No rare points this time.', '本次没有命中稀有项。')}</span>`}</div></div>`;
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
      root.querySelectorAll('[data-icat]').forEach(b=>{ b.onclick = () => { ST.innerCatShow[b.dataset.icat] = !ST.innerCatShow[b.dataset.icat]; renderAll(); }; });
      const allBtn = root.querySelector('[data-icat-all]');
      if(allBtn) allBtn.onclick = () => { const on = allBtn.dataset.icatAll === '1'; INNER_CATS.forEach(([k])=>{ ST.innerCatShow[k] = on; }); renderAll(); };
    });
    const ue = els.profileView.querySelector('[data-uniform-edit]');
    if(ue) ue.onchange = () => applyUniformVariant(ue.value);
    const he = els.profileView.querySelector('[data-headwear-edit]');
    if(he) he.onchange = () => { ST.current.headwearOn = he.value === 'on'; renderAll(); };
    const se = els.profileView.querySelector('[data-scene-edit]');
    if(se) se.onclick = () => {
      const card = se.closest('.profile-card');
      const kv = card.querySelector('.kv span'); if(!kv || card.querySelector('textarea')) return;
      const ta = document.createElement('textarea');
      ta.value = ST.current.sceneIdea || '';
      ta.style.cssText = 'width:100%;min-height:70px;background:#0d1a2c;border:1px solid var(--gold);border-radius:8px;color:#eaf2ff;padding:8px;font-size:13px';
      const commit = () => { const v = ta.value.trim(); if(v) ST.current.sceneIdea = v; renderAll(); };
      ta.onblur = commit;
      ta.onkeydown = e => { if(e.key==='Escape') renderAll(); };
      kv.replaceChildren(ta); ta.focus();
    };
    if(isCombinedGroup()){
      const en = isEnglish(ST.currentGroup.members[0]);
      els.promptBox.value = buildGroupMainPrompt(ST.currentGroup, en);
      const gd=document.getElementById('derivedPromptBox'); if(gd) gd.value = (isRefMode(ST.currentGroup.members[0]) ? (en ? `[REFERENCE IMAGES PROVIDED] Attach each member's base reference card. Every member must remain exactly the same person as his own card (match by member number). Never blend or swap their features. Redraw every member from scratch to match the scene's lighting and color — never a cut-and-paste composite look.\n\n` : `【参照画像あり・重要】各メンバーの基準リファレンスカードの画像を添付する。各メンバーは自分の基準カード（メンバー番号で対応）と完全に同一人物として描き、特徴を混ぜたり入れ替えたりしない。各メンバーとも参照画像の切り抜き合成のようにせず、場面の光・影・色味に完全になじませて一から描き直す。\n\n`) : '') + (currentDerivedType()==='トレーディングカード' ? buildGroupCardPrompt(ST.currentGroup, en) : buildGroupMainPrompt(ST.currentGroup, en)) + (isRefMode(ST.currentGroup.members[0]) ? usageNote(en) : '');
      document.getElementById('outfitPromptBox').value = buildGroupOutfitPrompt(ST.currentGroup, en, 'weekday');
      const gh=document.getElementById('outfitHolidayPromptBox'); if(gh) gh.value = buildGroupOutfitPrompt(ST.currentGroup, en, 'holiday');
      document.getElementById('scenePromptBox').value = buildGroupPrompt(ST.currentGroup, en);
    } else {
      els.promptBox.value = buildPrompt(ST.current, true);
      const pref = refPrefix(ST.current, isEnglish(ST.current));
      document.getElementById('outfitPromptBox').value = pref + buildOutfitPrompt(ST.current, 'weekday') + (pref ? usageNote(isEnglish(ST.current)) : '');
      const oh=document.getElementById('outfitHolidayPromptBox'); if(oh) oh.value = pref + buildOutfitPrompt(ST.current, 'holiday') + (pref ? usageNote(isEnglish(ST.current)) : '');
      document.getElementById('scenePromptBox').value = pref + buildScenePrompt(ST.current) + (pref ? usageNote(isEnglish(ST.current)) : '');
      const dv=document.getElementById('derivedPromptBox'); if(dv) dv.value = buildDerivedPrompt(ST.current, isEnglish(ST.current));
      const fpb=document.getElementById('friendPairPromptBox'); if(fpb) fpb.value = ST.current.friendBase ? buildFriendPairPrompt(ST.current, isEnglish(ST.current)) : '';
      renderFriendPairControls();
      renderFootCfgPanel();
    }
    const mo=document.getElementById('manualOutputType'), mc=document.getElementById('manualCount'), mq=document.getElementById('manualQuality'), mb=document.getElementById('manualBackground'), ml=document.getElementById('manualLighting'), mpl=document.getElementById('manualPromptLanguage'), mpt=document.getElementById('manualPromptTarget'), mcm=document.getElementById('manualCaptionMode'), mcs=document.getElementById('manualCardStyle'), mcr=document.getElementById('manualCardRarity'), mct=document.getElementById('manualCardTheme'), mcl=document.getElementById('manualCardLayout'), mcw=document.getElementById('manualCardWearMode'), mce=document.getElementById('manualCardEffect');
    if(mo) mo.value=ST.current.outputType; if(mc) mc.value=ST.current.count; if(mq) mq.value=ST.current.quality; if(mb) mb.value=ST.current.background; if(ml) ml.value=ST.current.lighting; if(mpl) mpl.value=ST.current.promptLanguage || '日本語'; if(mpt) mpt.value=ST.current.promptTarget || 'ChatGPT'; if(mcm) mcm.value=ST.current.captionMode || '表記する';
    if(mcs) mcs.value=ST.current.cardStyle || 'スタンダード'; if(mcr) mcr.value=ST.current.cardRarity || 'R'; if(mct) mct.value=ST.current.cardTheme || 'ネイビー'; if(mcl) mcl.value=ST.current.cardLayout || '縦長カード'; if(mcw) mcw.value=ST.current.cardWearMode || 'ボクサーパンツのみ'; if(mce){ mce.value=cardEffectByRarity(ST.current.cardRarity || 'R'); mce.disabled=true; } syncCardSettingsVisibility();
    writeCaptionFields('manual', ST.current.captionFields || {name:true,era:true,height:true,weight:true,footSize:true,mbti:true});
    writeCardFields('manual', ST.current.cardFields || {name:true,age:true,era:true,height:true,weight:true,footSize:true,role:true,mbti:true,rarity:true});
  }

  function renderRarity(){
    const [s,r,note] = scoreRarity(ST.current); els.rarity.textContent=r; els.rarity.className='rare rarity-'+(r==='SUPER RARE'?'SUPER':r); els.rareScore.textContent=s+' pt'; els.rarityNote.textContent = note==='idle' ? T('rarityNoteIdle') : T('rarityNotes')[note];
  }

  function renderAll(){ renderSlots(ST.current,true); renderProfile(); renderRarity(); renderHistory(); renderGroupUI(); renderPromptTabs(); renderSettingChips(); updateCharCounts(); }

  function saveCurrent(){ if(!ST.current) return alert(T('saveFirst')); const history=loadHistory(); history.unshift({...ST.current, appVersion:'V3.2.0'}); localStorage.setItem(STORAGE_KEY,JSON.stringify(history.slice(0,50))); renderHistory(); alert(T('saved')); }

  function loadHistory(){ try{return JSON.parse(localStorage.getItem(STORAGE_KEY)||'[]')}catch{return[]} }

  function renderHistory(){
    const h = loadHistory();
    const order = h.map((c,i)=>i).sort((a,b)=>((h[b].fav?1:0)-(h[a].fav?1:0)) || a-b);
    els.historyList.innerHTML = h.length ? order.map(i=>{ const c=h[i]; return `<div class="history-item${c.fav?' faved':''}"><b>${c.fav?'★ ':''}${c.name} / ${LT(c.age+'歳', displayValue('age',c.age), c.age+'岁')} / ${c.height} / ${displayValue('bodyType',c.bodyType)}</b><p class="notice">${displayValue('facePreset',c.facePreset)}・${displayValue('outfitType',c.outfitType)}・${displayValue('sockType',c.sockType)}・${scoreRarity(c)[1]}${c.appVersion?` <span class="mini-badge" style="font-size:10px;padding:2px 6px">${c.appVersion}</span>`:''}</p><button class="fav-btn" data-fav="${i}" title="favorite">${c.fav?T('favOn'):T('favOff')}</button><button class="btn dark" data-load="${i}">${T('loadBtn')}</button></div>`; }).join('') : `<p class="notice">${T('noHistory')}</p>`;
    document.querySelectorAll('[data-load]').forEach(b=>b.onclick=()=>{ST.current=h[Number(b.dataset.load)]; ST.currentGroup=null; ST.activeMember=0; renderAll(); switchTab('result');});
    document.querySelectorAll('[data-fav]').forEach(b=>b.onclick=()=>{ const i=Number(b.dataset.fav); h[i].fav=!h[i].fav; localStorage.setItem(STORAGE_KEY, JSON.stringify(h)); renderHistory(); });
  }

  function downloadJson(){
    const data = ST.current || {};
    const nm = String(data.name||'').replace(/（.*?）/g,'').replace(/[\s\u3000]+/g,'').replace(/[\\/:*?"<>|]/g,'') || 'result';
    const d = new Date(); const pad=n=>String(n).padStart(2,'0');
    const stamp = `${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}`;
    const a=document.createElement('a');
    a.href=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));
    a.download=`guzen-ikemen_${nm}_${stamp}.json`;
    a.click(); URL.revokeObjectURL(a.href);
  }

  function switchTab(name){ document.querySelectorAll('.tab').forEach(t=>t.classList.toggle('active',t.dataset.tab===name)); ['slot','result','history','settings'].forEach(t=>document.getElementById('tab-'+t).classList.toggle('hidden',t!==name)); const ip=document.getElementById('initialPanel'); if(ip) ip.classList.toggle('hidden', !(name==='slot' || name==='settings')); const sa=document.getElementById('slotAside'); if(sa) sa.classList.toggle('hidden', name!=='slot'); }

  function renderPromptTabs(){
    const bar = document.getElementById('promptTabs'); if(!bar) return;
    const labels = LT({main:'🪪 基準カード', derived:'🎨 派生出力', outfit:'👔 職業服装', outfitHoliday:'👕 私服服装', scene:'🎬 場面差分', friendPair:'🤝 友人ツーショット', group:'👥 集合写真'}, {main:'🪪 Base Card', derived:'🎨 Derived Output', outfit:'👔 Work Outfit', outfitHoliday:'👕 Casual Outfit', scene:'🎬 Scene', friendPair:'🤝 Friend Two-shot', group:'👥 Group Photo'}, {main:'🪪 基准卡', derived:'🎨 派生输出', outfit:'👔 职业服装', outfitHoliday:'👕 便服', scene:'🎬 场景差分', friendPair:'🤝 好友双人照', group:'👥 集体照'});
    const showGroup = !!(ST.currentGroup && ST.currentGroup.members.length>1 && ST.currentGroup.promptMode !== '1つの指示文にまとめて生成');
    const showFriendPair = !!(ST.current && ST.current.friendBase);
    if(ST.promptTab==='group' && !showGroup) ST.promptTab='main';
    if(ST.promptTab==='friendPair' && !showFriendPair) ST.promptTab='main';
    bar.innerHTML = PROMPT_PANES.filter(([k])=>(k!=='group' || showGroup) && (k!=='friendPair' || showFriendPair)).map(([k])=>`<button class="ptab${ST.promptTab===k?' active':''}" data-ptab="${k}">${labels[k]}</button>`).join('');
    bar.querySelectorAll('[data-ptab]').forEach(b=>b.onclick=()=>{ ST.promptTab=b.dataset.ptab; renderPromptTabs(); });
    PROMPT_PANES.forEach(([k,id])=>{ const el=document.getElementById(id); if(el) el.classList.toggle('hidden', ST.promptTab!==k); });
    const descs = T('promptDescs') || {};
    ['main','derived','outfit','outfitHoliday','scene','friendPair','group'].forEach(k=>{ const el=document.getElementById('desc-'+k); if(el) el.textContent = descs[k] || ''; });
    const f1=document.querySelector('[data-flow="1"]'), f2=document.querySelector('[data-flow="2"]');
    if(f1) f1.classList.toggle('active', ST.promptTab==='main');
    if(f2) f2.classList.toggle('active', ST.promptTab!=='main');
    const at = document.getElementById('promptAreaTitle'); if(at) at.textContent = T('promptAreaTitle');
    // [icon, jaShort, jaDesc, enShort, enDesc, zhShort, zhDesc]
    const DERIVED_META = {
      'トレーディングカード':['🃏','トレカ','オリジナルトレカ風の1枚','Trading card','One original trading-card style image','集换卡','一张原创集换卡风图片'],
      '人物特集雑誌ページ':['📰','雑誌ページ','架空雑誌の特集誌面。時代でレイアウトが変化','Magazine page','A fictional magazine feature; layout follows the era','杂志页','架空杂志的特辑版面，版式随时代变化'],
      'キャラクタープロフィールシート':['📇','プロフィールシート','全身1枚＋ひとこと背景＋基本＋内面・背景＋A/B/C','Profile sheet','Full-body shot with bio, basics, inner profile and A/B/C','档案页','全身1张＋一句话背景＋基本＋内在・背景＋A/B/C'],
      '街で見かけたイケメンシート：職業編':['📷','街角・職業編','働く姿のスナップ3〜4コマ','Street: at work','3-4 candid panels of him working','街拍・职业篇','工作状态的3〜4格抓拍'],
      '街で見かけたイケメンシート：オフ編':['🏖','街角・オフ編','私服で過ごすオフのスナップ集','Street: off duty','Candid panels of his day off in casual wear','街拍・休息日篇','便服休息日的抓拍集'],
      '人物ポスター（職業・人物像）':['🖼','ポスター','職業と人物像が伝わる1枚','Poster','A poster that shows who he is at a glance','海报','一眼看懂职业与人物形象的一张'],
      '服装リファレンスシート（職業背景）':['👔','服装リファレンス','職業コーデの資料シート（靴下詳細つき）','Outfit reference','Work-outfit reference sheet (with sock detail)','服装参考','职业穿搭资料页（含袜子细节）'],
      '偶然足元強調場面シート':['🦶','足元強調場面','靴を脱いだ足元を強調した生活場面','Foot-focus scene','A daily scene emphasizing his socked feet','足部特写场景','强调脱鞋后足部的生活场景'],
      '偶然人物ブループリントシート':['📐','ブループリント','設計図風の人物資料','Blueprint','A technical-drawing style character sheet','蓝图','设计图风的人物资料'],
      '参考画像作成シート（引継ぎ用）':['📋','参考画像シート','引継ぎ用の情報つき資料（歯並び・裸足・足裏パネル入り）','Handoff sheet','A standalone reference sheet with info panel, teeth and barefoot views','参考图页','交接用的带信息资料（含牙齿・赤脚・脚底面板）']
    };
    const en2 = ST.uiLang === 'en';
    const grid = document.getElementById('derivedTypeGrid');
    const dts = document.getElementById('derivedTypeSel');
    if(grid && dts){
      const cur = currentDerivedType();
      const mainTypes = Object.keys(DERIVED_META);
      grid.innerHTML = mainTypes.map(v=>{
        const m = DERIVED_META[v];
        return `<button class="dtype-btn${v===cur?' on':''}" data-dtype="${v.replace(/"/g,'&quot;')}"><span class="ic">${m[0]}</span>${LT(m[1], m[3], m[5])}</button>`;
      }).join('');
      grid.querySelectorAll('[data-dtype]').forEach(b=>b.onclick=()=>{ ST.derivedType = b.dataset.dtype; renderAll(); });
      const others = ['トレーディングカード'].concat(pools.outputTypes.filter(v=>!v.includes('16:9')));
      dts.innerHTML = `<option value="">${LT('その他の形式…', 'Other formats…', '其他格式…')}</option>` + others.filter(v=>!mainTypes.includes(v)).map(v=>`<option value="${v.replace(/"/g,'&quot;')}"${v===cur?' selected':''}>${displayOptionLabel('outputType', v)}</option>`).join('');
      if(mainTypes.includes(cur)) dts.value='';
      dts.onchange = () => { if(dts.value){ ST.derivedType = dts.value; renderAll(); } };
      const lbl = document.getElementById('derivedTypeLabel');
      if(lbl){
        const m = DERIVED_META[cur];
        lbl.textContent = m ? `${m[0]} ${en2 ? m[3] : ST.uiLang==='zh' ? m[5] : cur} — ${LT(m[2], m[4], m[6])}` : `📋 ${displayOptionLabel('outputType', cur)}`;
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
        if(psSel){ psSel.value = (ST.current && ST.current.profileSheetWear) || '職業服装'; psSel.onchange = ()=>{ if(ST.current){ ST.current.profileSheetWear = psSel.value; renderAll(); } }; }
        const psLbl = psCfg.querySelector('label span'); if(psLbl) psLbl.textContent = LT('プロフィールシートの服装', 'Profile-sheet outfit', '档案页服装');
      }
      const cb = document.getElementById('copyDerivedBtn');
      if(cb && !cb.classList.contains('copied')){
        const m = DERIVED_META[cur];
        cb.textContent = en2 ? `📋 Copy ${m ? m[3] : 'prompt'}` : ST.uiLang==='zh' ? `📋 复制${m ? m[5] : '此格式'}` : `📋 ${m ? m[1] : 'この形式'}用をコピー`;
      }
    }
    const chip = document.getElementById('promptAreaTarget');
    if(chip){
      if(ST.current){ chip.textContent = `⚡ ${ST.current.promptTarget || 'ChatGPT'} ・ ${ST.current.promptLanguage === 'English' || ST.uiLang==='en' && !ST.current.promptLanguage ? 'English' : displayValue('promptLanguage', ST.current.promptLanguage || '日本語')}`; chip.style.display=''; }
      else chip.style.display='none';
    }
  }

  function renderSettingChips(){
    const el = document.getElementById('settingChips'); if(!el) return;
    const gi = getInitial();
    const short = (v,n=10) => { const t = ST.uiLang!=='ja' ? (displayValue('outputType', v) || v) : v; return t.length>n ? t.slice(0,n)+'…' : t; };
    const chips = [
      [LT('年代','Era','年代'), `${gi.eraYear || '2026'}`],
      [LT('モード','Mode','模式'), displayValue('groupSize', document.getElementById('initialGroupSize')?.value || '1人（通常）') || '1人'],
      [LT('下着','Underwear','内裤'), displayValue('mainWearMode', gi.mainWearMode) || gi.mainWearMode],
      [LT('出力','Output','输出'), short(gi.outputType || '', 12)],
      [LT('職業影響','Occupation','职业影响'), displayValue('occInfluence', gi.occInfluence) || gi.occInfluence]
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
          ST.current = data; renderAll(); switchTab('result');
        }
        alert(T('importedMsg'));
      }catch(e){ alert('JSON parse error'); }
    };
    reader.readAsText(file);
  }

export {
  renderProfile,
  renderRarity,
  renderAll,
  saveCurrent,
  loadHistory,
  renderHistory,
  downloadJson,
  switchTab,
  renderPromptTabs,
  renderSettingChips,
  accCollapsed,
  initAccordions,
  catCollapsed,
  PRESET_KEY,
  loadPresets,
  savePresets,
  snapshotInitial,
  applySnapshot,
  refreshPresetSelect,
  initPresets,
  updateCharCounts,
  importJsonFile,
};
