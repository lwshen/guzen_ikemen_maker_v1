// Pure data tables, extracted verbatim from the frozen index.html baseline
// (upstream 7438239 / V3.2.0). Layer 5 (npm run verify:data) compares every
// constant against that baseline - edits show up as diffs there, by design.

// index.html:512
export const C_MEASUREMENT_EN = {
    '頭を出せずすっぽり':'Fully covered; the head cannot be exposed',
    '頭を出せるけどすっぽり':'The head can be exposed, but is currently fully covered',
    '頭の先が少し出ている':'Only the tip of the head is slightly exposed',
    '頭の半分が出ている':'Half of the head is exposed',
    '頭の根元らへんまで出ている':'Exposed to around the base of the head',
    '頭が完全に出ている':'The head is fully exposed'
  };

// index.html:684
export const slotLabelMap = {
    sportsHistory:{ja:'経験競技',en:'Sports History'}, trainingLevel:{ja:'筋トレ習慣',en:'Training Habit'},
    name:{ja:'名前',en:'Name'}, age:{ja:'年齢',en:'Age'}, eraYear:{ja:'時代設定',en:'Era Year'}, nationality:{ja:'国籍',en:'Nationality'}, ethnicity:{ja:'人種',en:'Ethnicity'}, role:{ja:'職業',en:'Occupation'},sportName:{ja:'競技',en:'Sport'}, vibe:{ja:'雰囲気系統',en:'Vibe'}, mbti:{ja:'MBTI',en:'MBTI'},
    height:{ja:'身長',en:'Height'}, weight:{ja:'体重',en:'Weight'}, bodyType:{ja:'体型',en:'Body Type'}, footSize:{ja:'足サイズ',en:'Foot Size'}, footShape:{ja:'足の形',en:'Foot Shape'}, bodyHairOverall:{ja:'体毛全体傾向',en:'Body Hair Overall'}, chestHair:{ja:'胸毛',en:'Chest Hair'}, abdominalHair:{ja:'腹毛',en:'Abdominal Hair'}, lowerAbdomenHair:{ja:'へそ下',en:'Lower Abdomen Hair'}, armHair:{ja:'腕毛',en:'Arm Hair'}, shinHair:{ja:'すね毛',en:'Shin Hair'}, thighHair:{ja:'もも毛',en:'Thigh Hair'}, armpitHair:{ja:'脇毛',en:'Armpit Hair'}, handFingerHair:{ja:'手の甲・指毛',en:'Hand / Finger Hair'}, footToeHair:{ja:'足の甲・指毛',en:'Foot / Toe Hair'}, backHair:{ja:'背中',en:'Back Hair'},
    facePreset:{ja:'顔立ち',en:'Face Type'}, ageAppearance:{ja:'年齢感',en:'Age Appearance'}, faceLine:{ja:'フェイスライン',en:'Face Line'}, eyebrow:{ja:'眉',en:'Eyebrows'}, eyelid:{ja:'まぶた',en:'Eyelid'}, eyeShape:{ja:'目の形',en:'Eye Shape'}, eyes:{ja:'目の印象',en:'Eye Impression'}, eyelash:{ja:'まつ毛',en:'Eyelashes'}, tearBags:{ja:'涙袋',en:'Tear Bags'}, nose:{ja:'鼻',en:'Nose'}, mouth:{ja:'基本表情',en:'Expression'}, lips:{ja:'唇の形状',en:'Lip Shape'}, mouthPos:{ja:'口の位置',en:'Mouth Placement'}, faceSpacing:{ja:'パーツ配置',en:'Feature Spacing'}, faceRatio:{ja:'目鼻口比率',en:'Feature Ratio'}, faceAsym:{ja:'顔の左右差',en:'Facial Asymmetry'}, skin:{ja:'肌',en:'Skin'}, facialHair:{ja:'ひげ',en:'Facial Hair'}, glasses:{ja:'眼鏡',en:'Glasses'}, holidayOutfitType:{ja:'私服服装',en:'Casual Outfit'},
    hairStyle:{ja:'髪型',en:'Hairstyle'}, hairColor:{ja:'髪色',en:'Hair Color'}, outfitType:{ja:'職業服装',en:'Work Outfit'}, outfitBrand:{ja:'提案服装ブランド',en:'Outfit Brand'}, jacket:{ja:'上着',en:'Outerwear'}, top:{ja:'トップス',en:'Top'}, bottom:{ja:'ボトムス',en:'Bottom'}, boxerBrand:{ja:'下着ブランド',en:'Underwear Brand'}, shoes:{ja:'靴',en:'Shoes'}, sockBrand:{ja:'靴下ブランド',en:'Sock Brand'}, sockType:{ja:'靴下種類',en:'Sock Type'}, sockShape:{ja:'靴下形状',en:'Sock Shape'}, sockMaterial:{ja:'靴下素材',en:'Sock Material'}, sockColor:{ja:'靴下色・柄',en:'Sock Color / Pattern'}, sockUse:{ja:'靴下使用感',en:'Sock Condition'}
  };

// index.html:691
export const fixedFieldLabelMap = {
    age:{ja:'年齢固定',en:'Fixed Age'}, nationality:{ja:'国籍固定',en:'Fixed Nationality'}, ethnicity:{ja:'人種固定',en:'Fixed Ethnicity'}, bodyType:{ja:'体型固定',en:'Fixed Body Type'}, facePreset:{ja:'顔立ち固定',en:'Fixed Face Type'}, vibe:{ja:'雰囲気系統固定',en:'Fixed Vibe'}, mbti:{ja:'MBTI固定',en:'Fixed MBTI'}, outfitType:{ja:'服装固定',en:'Fixed Outfit'}
  };

// index.html:694
export const uiText = {
    ja:{
      subtitle:'偶然がつくる、まだ見ぬイケメン。年齢・身長・体型・顔立ち・雰囲気系統・MBTI・体毛・提案服装まで、スロットのようにランダムで決定します。メイン生成はボクサーパンツのみ着用とし、服装案や偶然見かけた場面は別枠で出力します。',
      heroNotice:'成人男性キャラクターの非性的な画像生成用指示文を作成するアプリです。結果はブラウザ内に保存され、外部サーバーへ送信されません。',
      startBtn:'SLOT START', rerollUnlockedBtn:'ロック以外を回す', resetLocksBtn:'ロック解除',
      groupPromptTitle:'集合写真 指示文', copyGroupBtn:'📋 コピー', copyGroupDone:'集合写真の指示文をコピーしました', memberLabel:'メンバー',
      promptAreaTitle:'画像生成用 指示文', copiedLabel:'✓ コピーしました', copyLabel:'📋 コピー',
      promptDescs:{main:'STEP1：キャラの基準になるリファレンスカード（ボクサーパンツ・16:9）を作る指示文です。まずこれで基準画像を生成してください。', derived:'STEP2：下で選んだ形式の派生画像を作る指示文です。基準カードで生成した画像を添付してから貼り付けてください。', outfit:'職業に合わせた仕事着・仕事帰りコーデの差分を作る指示文です。', outfitHoliday:'性格・雰囲気重視の私服コーデの差分を作る指示文です。仕事とは違う一面が出ます。', scene:'日常の一場面を切り取ったスナップ風差分を作る指示文です。', card:'トレーディングカード風の1枚に仕上げる指示文です。カード設定はこの上の「カード差分プロンプト設定」で変更できます。', group:'グループ全員を1枚の集合写真として描く指示文です。', friendPair:'参照画像2枚（本人と友人それぞれの基準カード）を添付して使う、2人のツーショット写真の指示文です。服装（職業服装/私服）と出力枚数はこの下で変更できます。'},
      editTitle:'この項目を直接変更', instantSkip:'演出スキップ', presetPlaceholder:'プリセット名', presetSave:'設定を保存', presetLoad:'読み込み', presetDelete:'削除', importJson:'JSONを読み込む', charsSuffix:'文字', diceTitle:'この項目だけ再抽選', favOn:'★', favOff:'☆', importedMsg:'読み込みました', presetSavedMsg:'プリセットを保存しました', presetNameNeeded:'プリセット名を入力してください',
      tab_slot:'スロット', tab_result:'結果・画像指示文', tab_history:'保存結果', tab_settings:'条件固定',
      initialTitle:'初期設定', initialPill:'スロットを回す前に指定', initialNotice:'ここで国籍・人種・年齢範囲・雰囲気系統・背景・光・画質・出力タイプ・出力枚数・生成先・画像内表記・カード差分プロンプト設定を指定します。これらは抽選せず、ここで選んだ内容が画像指示文へ反映されます。雰囲気系統を選ぶと、髪型・顔立ち・提案服装の抽選傾向が連動します。',
      resultTitle:'完成プロフィール', saveBtn:'結果を保存', jsonBtn:'JSONを書き出す', promptTitle:'基準リファレンスカード 指示文', derivedTitle:'派生出力 指示文', derivedWarn:'⚠ 基準カードの画像を添付してから使用', copyPromptBtn:'📋 コピー', outfitTitle:'職業服装 指示文', outfitHolidayTitle:'私服服装 指示文', copyOutfitBtn:'📋 コピー', sceneTitle:'偶然見かけた場面 指示文', copySceneBtn:'📋 コピー', cardTitle:'トレーディングカード差分 指示文', copyCardBtn:'📋 コピー', footCfgTitlePrefix:'足元強調シート 詳細設定', footCfgNote:'「ランダム」の項目は生成AI側の自由発想に任せます。🎲で全項目を状況連動の重みで一括抽選できます（素足・脱ぎかけは低確率）。', footDiceBtn:'🎲 おまかせ抽選', footResetBtn:'↺ すべてランダムに戻す', friendPairTitle:'友人ツーショット 指示文', friendPairWarn:'⚠ 2人分の基準カード画像を添付してから使用', friendPairWearLabel:'服装', friendPairCountLabel:'出力枚数',
      historyTitle:'保存結果', clearHistoryBtn:'履歴クリア', noHistory:'保存結果はまだありません。', loadBtn:'読み込む',
      settingsTitle:'条件固定ランダム', settingsPill:'空欄はランダム', settingsNotice:'固定条件を選んだ状態で「SLOT START」を押すと、指定した人物・服装項目を優先してランダム生成します。MBTIも固定可能です。背景・光・画質・出力タイプ・出力枚数・生成先・画像内表記は上部の初期設定または結果画面の選択欄で指定します。',
      restoreTitle:'プロンプトから読み込む', restoreCodeBtn:'読み込む', restoreNote:'基準カードの日本語指示文を貼ると、本文から人物設定を読み取って復元します（英語・派生形式は対象外）', restoreNotFound:'プロンプトから人物設定を読み取れませんでした（日本語の基準カード指示文を貼ってください）', restoreFailed:'プロンプトの読み取りに失敗しました', restoreDone:'プロンプトから人物を読み取りました',
      friendBtn:'👥 友人を作成', friendPanelTitle:'友人を作成', friendRelationLabel:'関係', friendHierLabel:'上下関係', friendGoBtn:'この関係で友人を作成', friendNote:'元の人物は履歴に自動保存されます', friendDone:'友人が完成しました',
      slotResult:'Slot Result', waiting:'待機中', spinning:'回転中', done:'完成', lock:'LOCK', locked:'LOCKED', clickLock:'クリックで固定', rarityNoteIdle:'スロットを回すと判定されます。', rarityTitle:'Rarity', modesTitle:'Modes',
      mode_full:'完全ランダム', mode_face:'顔だけ', mode_outfit:'服装だけ', mode_rare:'レア設定', currentMode:'現在：', mode_full_note:'完全ランダム', mode_face_note:'顔だけランダム', mode_outfit_note:'服装だけランダム', mode_rare_note:'レア設定モード',
      saveFirst:'先にスロットを回してください。', saved:'保存しました。', copyMainDone:'メイン指示文をコピーしました。', copyOutfitDone:'服装差分指示文をコピーしました。', copySceneDone:'場面指示文をコピーしました。', copyCardDone:'カード差分指示文をコピーしました。', confirmClear:'保存結果を削除しますか？',
      rows:{weekdayOutfit:'職業コーデ',holidayOutfit:'私服コーデ',holidaySock:'私服の靴下',glasses:'眼鏡',group:'グループ',basic:'基本プロフィール',faceSection:'顔立ち',bodySection:'体型・身体',bodyHairSection:'ひげ・体毛',mainSection:'基準服装',outfitSection:'提案服装',outputSection:'出力設定',sceneSection:'偶然見かけた場面',name:'名前',age:'年齢',natEth:'国籍 / 人種',roleVibe:'職業 / 系統',mbti:'MBTI / 性格',era:'時代設定',hw:'身長 / 体重',body:'体型',foot:'足サイズ',footShape:'足の形',face:'顔立ち',faceLine:'フェイスライン',eyes:'目',nose:'鼻',mouth:'口元',skin:'肌',facialHair:'ひげ',hair:'髪型',bodyHair:'体毛',main:'基準服装',outfit:'提案服装',sock:'提案靴下',background:'背景',output:'出力',promptTarget:'生成先',imageText:'画像内表記',cardSetting:'カード出力設定',scene:'偶然見かけた場面',uniformKind:'制服の種類',headwearRow:'着帽',friendRow:'友人関係'},
      fieldLabels:{initialNationality:'初期国籍',initialEthnicity:'初期人種',initialAgeMin:'年齢下限',initialAgeMax:'年齢上限',initialVibe:'雰囲気系統',initialEraYear:'時代設定',initialBackground:'背景',initialLighting:'光',initialQuality:'画質・質感',initialOutputType:'出力タイプ',initialMainWearMode:'基準服装（下着）',initialGroupSize:'生成モード',initialOccupation:'職業',initialOccInfluence:'職業の影響',initialCatchphrase:'キャッチフレーズ',initialDerivedMode:'派生プロンプト形式',initialSeason:'季節',initialGroupPromptMode:'グループ出力形式',initialCount:'出力枚数',initialPromptLanguage:'指示文言語',initialPromptTarget:'生成先',initialCaptionMode:'画像内スペック表示',manualOutputType:'出力タイプ',manualCount:'出力枚数',manualQuality:'画風・質感',manualBackground:'背景',manualLighting:'光',manualPromptLanguage:'指示文言語',manualPromptTarget:'生成先',manualCaptionMode:'画像内スペック表示',initialCardStyle:'カードスタイル',initialCardRarity:'カードレアリティ表示',initialCardTheme:'カード配色テーマ',initialCardLayout:'カードレイアウト',initialCardWearMode:'カード衣装',initialCardEffect:'装飾効果（レアリティ連動）',manualCardStyle:'カードスタイル',manualCardRarity:'カードレアリティ表示',manualCardTheme:'カード配色テーマ',manualCardLayout:'カードレイアウト',manualCardWearMode:'カード衣装',manualCardEffect:'装飾効果（レアリティ連動）'},
      rarityNotes:{normal:'自然で使いやすい標準寄りの組み合わせです。',rare:'少し特徴的な組み合わせです。',super:'目立つ特徴が複数あります。',legend:'かなり個性的な偶然の組み合わせです。'}
    },
    en:{
      subtitle:'A chance-based handsome character generator. Age, height, build, facial impression, vibe, MBTI, body hair, and suggested outfit are decided like a slot machine. The main generation uses boxer briefs only, while outfit and candid-scene prompts are output separately.',
      heroNotice:'This app creates non-sexual image prompts for adult male characters. Results are stored in your browser and are not sent to an external server.',
      startBtn:'SLOT START', rerollUnlockedBtn:'Spin unlocked only', resetLocksBtn:'Reset locks',
      groupPromptTitle:'Group Photo Prompt', copyGroupBtn:'📋 Copy', copyGroupDone:'Group photo prompt copied.', memberLabel:'Member',
      promptAreaTitle:'Image Generation Prompts', copiedLabel:'✓ Copied!', copyLabel:'📋 Copy',
      promptDescs:{main:'STEP 1: builds the base reference card (boxer briefs, 16:9). Generate the base image with this first.', derived:'STEP 2: builds the selected derived output. Attach the base card image before using this prompt.', outfit:'His work outfit variation, shaped by his occupation.', outfitHoliday:'His casual outfit variation, shaped by his personality and vibe.', scene:'A candid everyday-scene variation prompt.', card:'A trading-card-style variation prompt. Card settings can be changed above.', group:'Renders the whole group as one photo.', friendPair:'A two-shot prompt used with TWO attached reference images (each person\u2019s base card). Outfit (work/casual) and output count can be changed below.'},
      editTitle:'Edit this value directly', instantSkip:'Skip animation', presetPlaceholder:'Preset name', presetSave:'Save preset', presetLoad:'Load', presetDelete:'Delete', importJson:'Import JSON', charsSuffix:' chars', diceTitle:'Re-roll this item only', favOn:'★', favOff:'☆', importedMsg:'Imported.', presetSavedMsg:'Preset saved.', presetNameNeeded:'Enter a preset name.',
      tab_slot:'Slots', tab_result:'Results & Prompts', tab_history:'Saved Results', tab_settings:'Fixed Conditions',
      initialTitle:'Initial Settings', initialPill:'Set before spinning', initialNotice:'Set nationality, ethnicity, age range, vibe, background, lighting, quality, output type, output count, prompt target, image text, and card output settings here. These settings are not randomized and will be reflected directly in the image prompts. Choosing a vibe also influences hairstyle, face type, and suggested outfit generation.',
      resultTitle:'Final Profile', saveBtn:'Save Result', jsonBtn:'Export JSON', promptTitle:'Base Reference Card Prompt', derivedTitle:'Derived Output Prompt', derivedWarn:'⚠ Attach the base card image before use', copyPromptBtn:'📋 Copy', outfitTitle:'Work Outfit Prompt', outfitHolidayTitle:'Casual Outfit Prompt', copyOutfitBtn:'📋 Copy', sceneTitle:'Candid Encounter Prompt', copySceneBtn:'📋 Copy', cardTitle:'Trading Card Variation Prompt', copyCardBtn:'📋 Copy', footCfgTitlePrefix:'Foot-focus Sheet Details', footCfgNote:'Items left on Random are decided freely by the image AI. 🎲 rolls every item with situation-aware weights (barefoot / mid-removal states stay low-probability).', footDiceBtn:'🎲 Auto-roll all', footResetBtn:'↺ Reset all to Random', friendPairTitle:'Friend Two-shot Prompt', friendPairWarn:'⚠ Attach both base card images before use', friendPairWearLabel:'Outfit', friendPairCountLabel:'Output count',
      historyTitle:'Saved Results', clearHistoryBtn:'Clear History', noHistory:'No saved results yet.', loadBtn:'Load',
      settingsTitle:'Random with Fixed Conditions', settingsPill:'Blank = random', settingsNotice:'If you press “SLOT START” after setting fixed conditions, the selected character and outfit items will be prioritized during random generation. MBTI can also be fixed. Background, lighting, quality, output type, output count, prompt target, and image text are set in the initial settings or in the result panel.',
      restoreTitle:'Load from Prompt', restoreCodeBtn:'Load', restoreNote:'Paste the Japanese base-card prompt; the character is parsed from the text itself (English and derived formats are not supported)', restoreNotFound:'Could not parse a character from this text (paste the Japanese base-card prompt)', restoreFailed:'Failed to parse the prompt', restoreDone:'Character parsed from the prompt',
      friendBtn:'👥 Create a Friend', friendPanelTitle:'Create a Friend', friendRelationLabel:'Relation', friendHierLabel:'Hierarchy', friendGoBtn:'Create friend with this relation', friendNote:'The original person is auto-saved to history', friendDone:'Friend created',
      slotResult:'Slot Result', waiting:'Waiting', spinning:'Spinning', done:'Done', lock:'LOCK', locked:'LOCKED', clickLock:'click to lock', rarityNoteIdle:'Spin the slots to evaluate.', rarityTitle:'Rarity', modesTitle:'Modes',
      mode_full:'Full Random', mode_face:'Face Only', mode_outfit:'Outfit Only', mode_rare:'Rare Mode', currentMode:'Current: ', mode_full_note:'Full random', mode_face_note:'Face-only random', mode_outfit_note:'Outfit-only random', mode_rare_note:'Rare-mode random',
      saveFirst:'Please spin the slots first.', saved:'Saved.', copyMainDone:'Copied the main prompt.', copyOutfitDone:'Copied the outfit prompt.', copySceneDone:'Copied the scene prompt.', copyCardDone:'Copied the card variation prompt.', confirmClear:'Clear saved results?',
      rows:{weekdayOutfit:'Work Outfit',holidayOutfit:'Casual Outfit',holidaySock:'Casual Socks',glasses:'Glasses',group:'Group',basic:'Basic Profile',faceSection:'Face',bodySection:'Body',bodyHairSection:'Facial / Body Hair',mainSection:'Main Clothing',outfitSection:'Suggested Outfit',outputSection:'Output Settings',sceneSection:'Candid Scene',name:'Name',age:'Age',natEth:'Nationality / Ethnicity',roleVibe:'Role / Vibe',mbti:'MBTI / Personality',era:'Era',hw:'Height / Weight',body:'Body Type',foot:'Foot Size',footShape:'Foot Shape',face:'Face Type',faceLine:'Face Line',eyes:'Eyes',nose:'Nose',mouth:'Mouth',skin:'Skin',facialHair:'Facial Hair',hair:'Hair',bodyHair:'Body Hair',main:'Main Clothing',outfit:'Suggested Outfit',sock:'Suggested Socks',background:'Background',output:'Output',promptTarget:'Prompt Target',imageText:'Image Text',cardSetting:'Card Settings',scene:'Candid Scene',uniformKind:'Uniform Type',headwearRow:'Headwear',friendRow:'Friendship'},
      fieldLabels:{initialNationality:'Initial Nationality',initialEthnicity:'Initial Ethnicity',initialAgeMin:'Age Min',initialAgeMax:'Age Max',initialVibe:'Vibe',initialEraYear:'Era Year',initialBackground:'Background',initialLighting:'Lighting',initialQuality:'Quality / Texture',initialOutputType:'Output Type',initialMainWearMode:'Main Underwear Style',initialGroupSize:'Generation Mode',initialOccupation:'Occupation',initialOccInfluence:'Occupation Influence',initialCatchphrase:'Catchphrase',initialDerivedMode:'Derived Prompt Format',initialSeason:'Season',initialGroupPromptMode:'Group Output Format',initialCount:'Output Count',initialPromptLanguage:'Prompt Language',initialPromptTarget:'Prompt Target',initialCaptionMode:'Image Text',manualOutputType:'Output Type',manualCount:'Output Count',manualQuality:'Art / Texture',manualBackground:'Background',manualLighting:'Lighting',manualPromptLanguage:'Prompt Language',manualPromptTarget:'Prompt Target',manualCaptionMode:'Image Text',initialCardStyle:'Card Style',initialCardRarity:'Card Rarity Label',initialCardTheme:'Card Color Theme',initialCardLayout:'Card Layout',initialCardWearMode:'Card Outfit',initialCardEffect:'Effect Linked to Rarity',manualCardStyle:'Card Style',manualCardRarity:'Card Rarity Label',manualCardTheme:'Card Color Theme',manualCardLayout:'Card Layout',manualCardWearMode:'Card Outfit',manualCardEffect:'Effect Linked to Rarity'},
      rarityNotes:{normal:'A natural and versatile combination.',rare:'A slightly distinctive combination.',super:'Several standout features are present.',legend:'A highly distinctive chance-based combination.'}
    }
  };

// index.html:744
export const valueTranslations = {
    '力強い目元':'Strong, intense eyes','優しい目元':'Gentle eyes','涼しげな目元':'Cool, refreshing eyes','知的な目元':'Intelligent eyes','眠たげな目元':'Sleepy-looking eyes','鋭い目元':'Sharp eyes','親しみやすい目元':'Approachable eyes','落ち着いた目元':'Calm eyes',
    '一重':'monolid','奥二重':'hooded double eyelid','末広二重':'tapered double eyelid','平行二重':'parallel double eyelid','左右で異なるまぶた（片方だけ二重）':'differing eyelids (double on one side only)',
    '標準的な目の形':'standard eye shape','切れ長の目':'long, narrow eyes','アーモンド形の目':'almond-shaped eyes','丸みのある目':'round eyes','たれ目気味の目':'slightly downturned eyes','つり目気味の目':'slightly upturned eyes','細めの目':'narrow eyes',
    '太めの直線眉':'thick straight eyebrows','太めのアーチ眉':'thick arched eyebrows','標準的な直線眉':'average straight eyebrows','標準的なゆるいアーチ眉':'average softly arched eyebrows','やや細めの直線眉':'slightly thin straight eyebrows','やや細めのアーチ眉':'slightly thin arched eyebrows','眉尻の下がった優しい眉':'gentle eyebrows sloping down at the ends','への字型の眉':'downward-angled eyebrows','眉山のはっきりした眉':'eyebrows with a distinct peak','短めで力強い眉':'short, strong eyebrows',
    '濃い眉':'dense','標準的な濃さの眉':'average density','薄めの眉':'sparse',
    '短めで控えめなまつ毛':'short, understated eyelashes','標準的な長さのまつ毛':'average-length eyelashes','やや長めのまつ毛':'slightly long eyelashes','長めで濃いまつ毛':'long, dense eyelashes','細くまばらなまつ毛':'fine, sparse eyelashes',
    '標準的な顎先':'an average chin','尖り気味の顎先':'a slightly pointed chin','丸みのある顎先':'a rounded chin','しっかりした顎先':'a strong chin','軽く割れた顎先':'a lightly cleft chin',
    'エラは目立たない':'an unpronounced jaw angle','ほどよく張ったエラ':'a moderately squared jaw','はっきり張ったエラ':'a strongly squared jaw',
    '標準的な耳':'average ears','立ち耳':'protruding ears','寝た耳':'flat-set ears','福耳':'large-lobed ears','小ぶりな耳':'small ears','柔道耳（軽度の耳介の厚み）':'slightly thickened ears from grappling sports',
    '標準的な広さの額':'an average forehead','狭めの額':'a narrow forehead','広めの額':'a broad forehead',
    '直線的な生え際':'a straight hairline','ゆるいM字の生え際':'a softly M-shaped hairline','富士額の生え際':'a widow-peak hairline','やや後退気味の生え際':'a slightly receding hairline',
    '標準的な頬':'average cheeks','頬骨が高めの頬':'high cheekbones','ややこけた頬':'slightly hollow cheeks','ふっくらした頬':'full cheeks',
    'えくぼなし':'no dimples','片側にえくぼ':'a dimple on one side','両側にえくぼ':'dimples on both sides',
    'ほくろなし':'no moles','目尻の下の泣きぼくろ':'a mole below the outer eye','口元のほくろ':'a mole near the mouth','顎のほくろ':'a mole on the chin','頬のほくろ':'a mole on the cheek','首すじのほくろ':'a mole on the neck',
    '直毛':'straight hair','やわらかい猫っ毛':'soft, fine hair','硬めの剛毛':'coarse, stiff hair','ゆるいくせ毛':'loosely wavy hair','強いくせ毛':'strongly wavy hair',
    'クマなし':'no under-eye shadows','うっすらとした目の下のクマ':'faint under-eye shadows',
    'のどぼとけは控えめ':'a subtle throat prominence','標準的なのどぼとけ':'an average throat prominence','のどぼとけがはっきり出ている':'a prominent throat prominence',
    '血色のよい唇':'well-colored lips','標準的な血色の唇':'normally colored lips','やや乾燥気味の唇':'slightly dry lips',
    '彫りは標準的':'average brow definition','彫りが深い眉まわり':'a deep-set brow','ややフラットな眉まわり':'a flatter brow',
    'きれいに整えている':'neatly groomed','自然に整えている':'naturally kept','伸ばしっぱなし気味':'left to grow out',
    '薄い唇':'Thin lips','やや薄い唇':'Slightly thin lips','標準的な厚さの唇':'Average-thickness lips','厚めの唇':'Fuller lips','上唇が薄く下唇が厚い唇':'Thin upper lip with a fuller lower lip','口角のきゅっと上がった唇':'Lips with neatly upturned corners','引き締まった一文字の唇':'A firm, straight-set mouth','ふっくらした唇':'Plump lips',
    '標準的な位置・大きさの口':'Average mouth size and placement','やや大きめの口':'A slightly larger mouth','小さめの口':'A smaller mouth','鼻と口の距離が近い口':'A short nose-to-mouth distance','鼻と口の距離がやや長い口':'A slightly long nose-to-mouth distance','口角の横幅が広い口':'A wide-set mouth',
    '求心顔（目鼻口が中心に寄った配置）':'Centripetal features (set close toward the center)','やや求心寄りの配置':'Slightly centripetal feature spacing','標準的な配置':'Evenly spaced features','やや遠心寄りの配置':'Slightly centrifugal feature spacing','遠心顔（パーツが外側に離れた配置）':'Centrifugal features (set wide toward the outside)',
    '標準的なバランスの比率':'Balanced feature proportions','目が大きめで存在感のある比率':'Proportions with prominent, larger eyes','目が小さめ・切れ長寄りの比率':'Proportions with smaller, narrow eyes','鼻の存在感が強い比率':'Proportions with a prominent nose','口が大きめではっきりした比率':'Proportions with a larger, defined mouth','口が小さめの比率':'Proportions with a smaller mouth','全体に小づくりな比率':'Overall delicate, compact features','全体に大ぶりでくっきりした比率':'Overall bold, well-defined features',
    '左右対称に近い整った顔':'A near-symmetrical, even face','ほぼ対称（ごく自然な左右差）':'Almost symmetrical with natural minor asymmetry','わずかな左右差がある自然な顔':'A natural face with slight asymmetry','眉の高さに少し左右差がある顔':'Slightly uneven eyebrow heights','口角の上がり方に少し左右差がある顔':'Slightly uneven mouth-corner lift','目の大きさにわずかな左右差がある顔':'Slightly uneven eye sizes',
    '防衛大学校の常装冬服風（花紺色の詰襟型短ジャケット）':'NDA winter dress (very dark navy stand-collar jacket)',
    '防衛大学校の第1種夏服風（白の詰襟上下）':'NDA Type-1 summer uniform (white stand-collar, white trousers)',
    '防衛大学校の第3種夏服風（白の半袖開襟シャツ）':'NDA Type-3 summer uniform (white short-sleeve shirt)',
    '防衛大学校の校内服装（水色シャツ＋ネクタイ）':'NDA on-campus uniform (light-blue shirt + navy tie)',
    '防衛大学校の作業服装（65式作業服と同型・OD色）':'NDA work uniform (Type-65 pattern, olive drab)',
    '消防署の活動服（紺の作業服スタイル）':'Firefighter station duty uniform (navy)',
    '救助服（オレンジのレスキュー隊服）':'Rescue-squad uniform (orange)',
    '防火衣（訓練場面向けの耐火装備スタイル）':'Protective fire gear (training style)',
    '警察官の冬制服風（濃紺の長袖＋ネクタイ）':'Police winter uniform (dark navy + tie)',
    '警察官の夏制服風（薄青の半袖シャツ）':'Police summer uniform (light-blue shirt)',
    '警察官の活動服風（出動服スタイル）':'Police field-duty uniform',
    '交通機動隊風の乗車服（白ヘルメット着用）':'Traffic-unit rider uniform (white helmet worn)',
    '機動隊の出動服風（ヘルメット携行）':'Riot-unit duty uniform (helmet carried)',
    '陸上自衛隊風の迷彩作業服':'JGSDF camouflage work uniform',
    '陸自の常装制服風（紫紺）':'JGSDF dress uniform (dark purplish navy)',
    '海自の夏制服風（白）':'JMSDF white summer uniform',
    '空自の制服風（青）':'JASDF blue uniform',
    '救急隊の活動服（白シャツ＋紺パンツ）':'Ambulance-crew duty uniform',
    'ランダム':'Random','日本':'Japan','韓国':'South Korea','中国':'China','台湾':'Taiwan','アメリカ':'United States','カナダ':'Canada','イギリス':'United Kingdom','フランス':'France','ドイツ':'Germany','イタリア':'Italy','スペイン':'Spain','ブラジル':'Brazil','メキシコ':'Mexico','タイ':'Thailand','ベトナム':'Vietnam','フィリピン':'Philippines','インドネシア':'Indonesia','マレーシア':'Malaysia','インド':'India','オーストラリア':'Australia',
    '日本人':'Japanese','韓国系':'Korean','東アジア系':'East Asian','中国系':'Chinese','東南アジア系':'Southeast Asian','南アジア系':'South Asian','白人系':'White','黒人系':'Black','中東系':'Middle Eastern','ラテン系':'Latino','中央アジア系':'Central Asian','ミックス':'Mixed',
    '成人男性キャラクター':'Adult male character','若手社会人':'Young working adult','大学生風の成人男性':'Adult man with a university-student vibe','スポーツ経験者':'Athletic / sports-experienced','モデル風':'Model-like','俳優風':'Actor-like','営業職風':'Sales professional','事務職風':'Office worker','クリエイター風':'Creative professional','研究職風':'Research professional','販売員風':'Retail staff','インストラクター風':'Instructor-like','IT系会社員風':'IT office worker','フリーランス風':'Freelancer-like',
    '爽やか系':'Fresh / clean-cut','真面目系':'Serious','ワイルド系':'Wild','スポーツ系':'Sporty','きれいめ系':'Clean / polished','カジュアル系':'Casual','韓国風':'Korean-inspired','中性系':'Androgynous','大人っぽい系':'Mature','やりらふぃー系':'Trendy party-boy','ストリート系':'Streetwear','塩顔系':'Salt-faced / understated','犬系男子':'Puppy-like boyish','クール系':'Cool','ミステリアス系':'Mysterious','サブカル系':'Subculture','古着系':'Vintage / thrift','清楚系':'Neat / gentle','陽キャ大学生系':'Outgoing college-guy',
    '実年齢相応':'Looks his age','やや若く見える':'Looks slightly younger','少し大人びて見える':'Looks slightly older',
    '普通顔':'Average-looking','爽やか知的アナウンサー系':'Fresh, intelligent announcer type','大学サッカー部系':'University soccer-player type','スーツ映え社会人系':'Suit-friendly working professional type','高身長モデル系':'Tall model type','親しみやすい大学生系':'Friendly college-student type','体育会系スポーツ男子':'Athletic sports guy','清潔感のある若手俳優風':'Clean young-actor type','落ち着いた大人系':'Calm mature type','韓国アイドル風':'K-pop idol type','日本の若手俳優風':'Young Japanese actor type','中性系':'Androgynous','塩顔系':'Understated face type','犬系男子風':'Puppy-like boyish type','クール系':'Cool type','ミステリアス系':'Mysterious type','サブカル系':'Subculture type',
    '標準体型':'Average build','やせ型':'Slim','細身':'Lean','痩せマッチョ':'Lean muscular','引き締まったスポーツ体型':'Toned athletic build','サッカー選手体型':'Soccer-player build','スーツ映え体型':'Suit-friendly build','高身長モデル体型':'Tall model build','筋肉質':'Muscular','がっしり体型':'Solid build','腹だけぽっちゃり':'Only slightly chubby around the belly','ぽっちゃり':'Chubby','脚が長い':'Long-legged',
    '自然なフェイスライン':'Natural face line','シャープなフェイスライン':'Sharp face line','しっかりしたフェイスライン':'Defined face line','柔らかいフェイスライン':'Soft face line','逆三角形に近いフェイスライン':'Near-inverted-triangle face line','やや角ばったフェイスライン':'Slightly angular face line',
    '二重風・親しみやすい目元':'Friendly double-eyelid eyes','奥二重風・クールな目元':'Cool inner-double-eyelid eyes','切れ長で知的':'Narrow and intelligent','丸みのある優しい目元':'Soft rounded eyes','力強い目元':'Strong eyes','伏し目がちで落ち着いた目元':'Relaxed downcast eyes',
    'おすすめ自動':'Auto suggestion','なし':'None','控えめ':'Subtle','自然':'Natural','ややはっきり':'Slightly defined','ふっくら':'Full','笑うと少し出る':'Slightly visible when smiling',
    '自然な鼻筋':'Natural nose bridge','通った鼻筋':'Defined nose bridge','高めの鼻筋':'High nose bridge','すっきりした鼻筋':'Clean nose bridge','しっかりした鼻':'Well-defined nose','控えめで自然な鼻':'Subtle natural nose',
    '自然な笑顔':'Natural smile','控えめな微笑み':'Subtle smile','落ち着いた表情':'Calm expression','爽やかな笑顔':'Fresh smile','誠実な表情':'Sincere expression','余裕のある表情':'Composed expression',
    '自然な肌質':'Natural skin texture','健康的な肌質':'Healthy skin texture','透明感のある肌':'Clear-looking skin','褐色の肌':'Brown skin','深い褐色の肌':'Deep brown skin','日差しでいっそう深まった褐色の肌':'Sun-deepened brown skin','日差しでいっそう深まった深い褐色の肌':'Sun-deepened deep brown skin','非常に色白の肌':'Very fair skin','浅黒い肌':'Dusky skin','強いカールのアフロテクスチャ':'tightly coiled afro-textured hair','細かいカールヘア':'fine curly hair','ショートフェード':'short fade cut','タイトなアフロショート':'tight afro short cut','ツイストショート':'short twists','額に一束落ちる長め前髪':'long bangs with a single strand falling over the forehead','自然に下ろした前髪':'naturally-down bangs','軽く上げた前髪':'lightly swept-up bangs','かき上げ風前髪':'swept-back bangs','眉にかかる重め前髪':'heavy brow-length bangs','短く切り揃えた前髪':'short trimmed bangs','ツヤを抑えたナチュラルセット':'matte natural styling with soft flow','ワックスの束感セット':'waxed, textured styling','きっちり撫でつけたセット':'neatly slicked styling','無造作セット':'effortless tousled styling','パーマ風の動きを出したセット':'perm-like wavy styling','毛量多め':'Thick hair volume','毛量少なめ':'Thin hair volume','標準的な毛量':'Average hair volume','七三分け':'7:3 side part','ナチュラルテーパー短髪':'natural tapered short cut','清潔感のある社会人系':'Clean-cut professional','卵型寄りのベース型（顎まわりに厚み）':'Oval-leaning square face with a full jawline','眉尻の上がった太めの直線眉':'Thick straight eyebrows with upturned tails','整えたシャープな直線眉':'Groomed sharp straight eyebrows','眉尻の上がったアーチ眉':'Arched eyebrows with upturned tails','丸みのあるしっかりした顎先':'Rounded yet firm chin','とても濃い眉':'Very thick eyebrows','やや濃い眉':'Somewhat thick eyebrows','やや薄めの眉':'Somewhat thin eyebrows','薄い眉':'Thin eyebrows','ほんのり日焼けした肌':'Lightly sun-kissed skin','少し日焼けした肌':'Slightly tanned skin','小麦色に日焼けした肌':'Golden tanned skin','しっかり日焼けした肌':'Deeply tanned skin','屋外仕事のこんがり日焼け肌':'Weathered outdoor working tan','マットで自然な肌':'Matte natural skin','スポーツ経験者らしい肌':'Sporty skin texture',
    'ごく薄い青ひげ':'Very light beard shadow','自然な無精ひげ':'Natural stubble','整えた短いひげ':'Neatly trimmed short beard','口ひげあり':'Mustache','あごひげあり':'Goatee',
    '短髪':'Short hair','アップバング':'Up-bangs','センターパート':'Center part','サイドパート':'Side part','マッシュ':'Mushroom cut','ソフトツーブロック':'Soft two-block','ビジネス短髪':'Business short hair','韓国風センターパート':'Korean-style center part','ニュアンスパーマ':'Loose perm','ツイストパーマ':'Twist perm','スパイラルパーマ':'Spiral perm','波巻きパーマ':'Wave perm','ウルフミディアム':'Medium wolf cut','ロング寄りミディアム':'Long medium hair','マンバン':'Man bun',
    '黒':'Black','ブルーブラック':'Blue-black','黒に近いダークブラウン':'Very dark brown','自然な茶髪':'Natural brown','アッシュブラウン':'Ash brown','グレージュ':'Greige','明るめブラウン':'Light brown',
    '紺スーツ':'Navy suit','黒スーツ':'Black suit','グレースーツ':'Gray suit','大学生カジュアル':'College casual','社会人カジュアル':'Working-adult casual','スポーツ練習着':'Sports practice wear','学生服（学ラン）':'School uniform (gakuran)','学生服（ブレザー）':'School uniform (blazer)','制服風コーデ':'Uniform-inspired outfit','私服通学風':'Casual commuting outfit','ジャケットスタイル':'Jacket style','ストリート系':'Streetwear',
    '指定なし':'Not specified','無地ノーブランド':'Plain unbranded','学生服メーカー指定なし':'School uniform brand not specified',
    'テーラードジャケット':'Tailored jacket','学生ブレザー':'School blazer','学ラン上着':'Gakuran jacket','ステンカラーコート':'Bal-collar coat','チェスターコート':'Chester coat','MA-1':'MA-1 jacket','スタジャン':'Varsity jacket','カーディガン':'Cardigan','パーカー':'Hoodie','デニムジャケット':'Denim jacket','ナイロンジャケット':'Nylon jacket','スポーツジャケット':'Sports jacket',
    '白シャツ':'White shirt','サックスブルーシャツ':'Sax blue shirt','制服用ワイシャツ':'Uniform shirt','ブレザー用シャツ':'Blazer shirt','ネクタイ付きシャツ':'Shirt with tie','無地Tシャツ':'Plain T-shirt','オーバーサイズTシャツ':'Oversized T-shirt','ロングスリーブTシャツ':'Long-sleeve T-shirt','ポロシャツ':'Polo shirt','ニット':'Knit top','カーディガンインナー':'Cardigan innerwear','スウェット':'Sweatshirt','スポーツシャツ':'Sports shirt','ゲームシャツ':'Game shirt',
    '黒スラックス':'Black slacks','紺スラックス':'Navy slacks','グレースラックス':'Gray slacks','学生スラックス':'Student slacks','ブレザー用スラックス':'Blazer slacks','学ラン用ズボン':'Gakuran trousers','チノパン':'Chinos','ワイドパンツ':'Wide pants','カーゴパンツ':'Cargo pants','デニム':'Denim jeans','ストレートデニム':'Straight jeans','ジャージパンツ':'Track pants','ナイロンパンツ':'Nylon pants','黒ショートパンツ':'Black shorts','ハーフパンツ':'Half pants',
    'ライトグレー':'Light gray','ネイビー':'Navy','白':'White','チャコール':'Charcoal','ダークグレー':'Dark gray',
    '黒革靴':'Black leather shoes','茶革靴':'Brown leather shoes','ローファー':'Loafers','白スニーカー':'White sneakers','黒スニーカー':'Black sneakers','キャンバススニーカー':'Canvas sneakers','ランニングシューズ':'Running shoes','サッカースパイク':'Soccer cleats','バスケットシューズ':'Basketball shoes','サンダル':'Sandals','ブーツ':'Boots',
    'ビジネスソックス':'Business socks','柄ありビジネスソックス':'Patterned business socks','スポーツソックス':'Sports socks','クルー丈ソックス':'Crew socks','くるぶしソックス':'Ankle socks','インビジブルソックス':'Invisible socks','ライン入りソックス':'Striped socks','ワンポイントソックス':'Socks with one-point accent','ロゴ入りソックス':'Logo socks',
    'クルー丈':'Crew length','ミドル丈':'Mid length','くるぶし丈':'Ankle length','インビジブル丈':'Invisible length','リブ編み':'Ribbed','薄手ビジネス形状':'Thin business shape','厚手スポーツ形状':'Thick sports shape',
    '綿混':'Cotton blend','綿＋ナイロン':'Cotton + nylon','ウール混':'Wool blend','薄手ナイロン混':'Light nylon blend','パイル編み':'Pile knit','リブ編みコットン':'Ribbed cotton','吸汗速乾素材':'Moisture-wicking quick-dry material',
    'グレー':'Gray','ブラウン':'Brown','ネイビー地ストライプ':'Navy striped','黒地ドット':'Black with dots','アーガイル柄':'Argyle pattern','ライン入り白':'White with lines',
    '新品に近い':'Like new','自然な使用感':'Naturally worn','少し履き込まれている':'Slightly well-worn','毛羽立ちが少しある':'Slightly fuzzy','スポーツ後の自然な使用感':'Naturally worn after sports','清潔だが生活感あり':'Clean but lived-in',
    'ギリシャ型':'Greek foot','エジプト型':'Egyptian foot','スクエア型':'Square foot','幅広':'Wide','細め':'Narrow','甲高':'High instep','土踏まず高め':'High arch','土踏まず低め':'Low arch','足指が長め':'Long toes','親指が長め':'Long big toe',
    'シンプルなグレーバック':'Simple gray backdrop','白背景のスタジオ':'White studio background','ライトグレーのスタジオ':'Light gray studio','黒背景のスタジオ':'Black studio background','大学キャンパス背景':'University campus background','学校の廊下背景':'School hallway background','街中スナップ背景':'Street-snap background','オフィス背景':'Office background','スポーツ施設背景':'Sports facility background','ジム背景':'Gym background','テーマパーク風背景':'Theme-park-like background','海辺・港町背景':'Seaside / harbor-town background','夜景背景':'Nightscape background','公園背景':'Park background','室内の自然光背景':'Indoor natural-light background',
    '自然光。明るく清潔感がある。':'Natural light, bright and clean.','柔らかいスタジオ照明。':'Soft studio lighting.','曇天の拡散光。':'Overcast diffused light.','写真館風の正面ライト。':'Photo-studio frontal lighting.','斜め45度のスタジオライト。':'45-degree studio lighting.','屋外スポーツ撮影風の明るい光。':'Bright outdoor sports-style lighting.','夜景に馴染む控えめなライティング。':'Subtle lighting suited to night scenes.',
    '実写風':'Photorealistic','高精細':'High detail','スマホスナップ風':'Smartphone snapshot style','写真館風':'Studio portrait style','ファッションカタログ風':'Fashion catalog style','AI感を抑えた自然写真':'Natural photo with reduced AI look','商業写真風':'Commercial photography style','雑誌グラビアではなく設定資料風':'Reference-sheet style rather than gravure','イラスト風':'Illustration style','アニメ風イラスト':'Anime-style illustration','漫画風線画':'Manga-style line art','キャラクター設定画風':'Character reference sheet style',
    '前面・側面を1枚にまとめた設定画像':'Combined front-and-side reference image','前面・側面・背面を1枚にまとめた設定画像':'Combined front-side-back reference image','16:9リファレンスカード（全身前面・側面／顔正面・側面／足詳細）':'16:9 reference card (full body front/side, face front/side, foot details)','16:9のリファレンスカードとして、全身の前面・側面、顔の正面・側面、顔正面（歯が見える）、足の正面と側面と足裏（人物が座って自分の足裏をこちらへ見せる構図とし、足裏だけが切り離されて描写された状態にしない）を1枚に整理して表示する。':'16:9 reference card with full body front/side, face front/side, face front with teeth visible, and foot front/side/sole shown by the seated person himself','SNSプロフィール風画像':'SNS profile-style image','就活写真風画像':'Job-hunting photo style image','スポーツ選手紹介風画像':'Athlete introduction-style image',
    '1枚':'1 image','3パターン別々の画像':'3 separate variations','5パターン別々の画像':'5 separate variations','10パターン別々の画像':'10 separate variations','10パターン別々の画像':'10 separate variations','日本語':'Japanese','English':'English',
    '自然な青ひげ':'Natural beard shadow','短い無精ひげ':'Short stubble','口ひげ':'Mustache','あごひげ':'Goatee','口ひげ＋あごひげ':'Mustache + goatee','ワイルドめのひげ':'Wild beard style',
    'トレーディングカード風画像':'Trading-card-style image','トレーディングカード風リファレンスカード':'Trading-card-style reference card','レアカード風トレーディングカード画像':'Rare trading-card-style image','シンプルな設定カード風画像':'Simple character card-style image',
    'カード風ミニプロフィールを下部に表示':'Mini profile card at the bottom','スタイリッシュなタグ型で表示':'Stylish tag-style display',
    'スタンダード':'Standard','シンプル':'Simple','スタイリッシュ':'Stylish','スポーツカード風':'Sports-card style','アイドルカード風':'Idol-card style','高級感のあるカード風':'Premium card style','レアカード風':'Rare card style','ホログラム風':'Holographic style','コレクターズカード風':'Collectors-card style',
    'モノトーン':'Monotone','ブラックゴールド':'Black gold','シルバー':'Silver','ブルー':'Blue','レッド':'Red','グリーン':'Green','パープル':'Purple','ランダムカラー':'Random colors',
    '縦長カード':'Vertical card','横長カード':'Horizontal card','情報重視型':'Information-focused','ビジュアル重視型':'Visual-focused','ステータス重視型':'Stats-focused','リファレンス資料型':'Reference-sheet layout',
    '偶然人物ブループリントシート':'Chance-encounter character blueprint sheet',
    '街で見かけたイケメンシート：職業編':'Spotted-in-town sheet: at work','街で見かけたイケメンシート：オフ編':'Spotted-in-town sheet: off duty','偶然足元強調場面シート':'Chance foot-focus scene sheet','人物特集雑誌ページ':'Character feature magazine page',
    '服装リファレンスシート（職業背景）':'Outfit reference sheet (occupation backdrop)','人物ポスター（職業・人物像）':'Character poster (occupation & persona)',
    '比較リファレンスシート（下着×私服・靴なし）':'Comparison reference sheet (underwear × outfit, no shoes)','表情差分リファレンスシート':'Expression variation reference sheet','フル設定資料シート':'Full character reference sheet','段階着装リファレンスシート':'Step-by-step dressing reference sheet',
    '大学生':'University student','大学院生':'Graduate student','専門学校生':'Vocational school student','就活中の大学生':'Job-hunting university student',
    '営業職':'Sales representative','経理・事務職':'Accounting / office clerk','企画職':'Planning staff','公務員':'Civil servant','銀行員':'Bank employee','商社勤務':'Trading company employee','コンサルタント':'Consultant','不動産営業':'Real estate agent',
    'ITエンジニア':'IT engineer','Webデザイナー':'Web designer','ゲーム開発者':'Game developer','動画クリエイター':'Video creator','アプリ開発者':'App developer',
    '看護師':'Nurse','理学療法士':'Physical therapist','薬剤師':'Pharmacist','研修医':'Medical resident','介護士':'Care worker',
    '高校教師':'High school teacher','塾講師':'Cram school teacher','保育士':'Childcare worker','大学研究員':'University researcher','体育教師':'PE teacher',
    'アパレル店員':'Apparel shop staff','カフェ店員':'Cafe staff','美容師':'Hair stylist','バーテンダー':'Bartender','ホテルスタッフ':'Hotel staff','飲食店店長':'Restaurant manager','書店員':'Bookstore clerk','コンビニ店長':'Convenience store manager',
    '自動車整備士':'Car mechanic','電気工事士':'Electrician','大工':'Carpenter','建築士':'Architect','工場勤務':'Factory worker','配送ドライバー':'Delivery driver','農家':'Farmer','漁師':'Fisherman',
    'グラフィックデザイナー':'Graphic designer','カメラマン':'Photographer','ミュージシャン':'Musician','編集者':'Editor','イラストレーター':'Illustrator','映像ディレクター':'Film director',
    '消防士':'Firefighter','警察官':'Police officer','自衛官':'JSDF member','ジムトレーナー':'Gym trainer','スポーツインストラクター':'Sports instructor','モデル':'Model','俳優':'Actor','プロスポーツ選手':'Professional athlete',
    '喫茶店マスター':'Coffee shop master','新聞記者':'Newspaper reporter','国鉄職員':'National railway worker',
    'お笑い芸人':'Comedian','声優':'Voice actor','YouTuber':'YouTuber','プロゲーマー':'Pro gamer','書道家':'Calligrapher','パティシエ':'Pastry chef','寿司職人':'Sushi chef','ラーメン店店主':'Ramen shop owner','僧侶':'Buddhist monk (in casual clothes)','古着屋店主':'Vintage clothing shop owner','悠々自適（定年後）':'Comfortably retired','救急隊員':'Paramedic','防衛大学校学生':'National Defense Academy cadet',
    '野球':'Baseball','サッカー':'Soccer','バスケットボール':'Basketball','バレーボール':'Volleyball','ラグビー':'Rugby','柔道':'Judo','剣道':'Kendo','陸上短距離':'Sprinting','陸上長距離':'Long-distance running','水泳':'Swimming','テニス':'Tennis','卓球':'Table tennis','ボクシング':'Boxing','ゴルフ':'Golf','自転車ロード':'Road cycling','体操':'Gymnastics',
    'ネイビーブラック':'Navy black','ダークアッシュ':'Dark ash','ダークチェリーブラウン':'Dark cherry brown','チョコレートブラウン':'Chocolate brown','赤みブラウン':'Reddish brown','マロンブラウン':'Marron brown','カーキブラウン':'Khaki brown','オリーブアッシュ':'Olive ash','ブルージュ':'Blue-beige (bluege)','ラベンダーグレージュ':'Lavender greige','ミルクティーベージュ':'Milk tea beige','ナチュラルブロンド':'Natural blond','ダークブロンド':'Dark blond','既製の実用衣料':'Plain practical clothing','ロシア':'Russia','スウェーデン':'Sweden','ポーランド':'Poland','トルコ':'Turkey','アルゼンチン':'Argentina','モンゴル':'Mongolia','ナイジェリア':'Nigeria','スラブ系':'Slavic','北欧系':'Nordic','南欧系':'Southern European','オレンジブラウン':'Orange brown','ハイトーンアッシュ':'High-tone ash','シルバーアッシュ':'Silver ash','ブリーチベージュ':'Bleached beige','金髪（ブリーチ）':'Bleached blond','メッシュ入りブラック':'Black with highlights','インナーカラー（アッシュ）':'Ash inner color','プリン気味の伸びた茶髪':'Grown-out brown with dark roots','白髪まじり':'Salt-and-pepper (slight gray)','ロマンスグレー':'Distinguished gray','ごま塩頭':'Salt-and-pepper hair','ほぼ白髪':'Mostly white hair',
    '黒縁メガネ':'Black-rimmed glasses','細フレームメガネ':'Thin-frame glasses','メタルフレームメガネ':'Metal-frame glasses','丸メガネ':'Round glasses','ハーフリムメガネ':'Half-rim glasses','縁なしメガネ':'Rimless glasses','金縁メガネ':'Gold-rimmed glasses',
    '職業制服':'Work uniform','書生風スタイル（着物＋袴＋学帽）':'Meiji-student style (kimono, hakama, cap)','着物と羽織':'Kimono with haori coat','国民服風':'Wartime national uniform style','開襟シャツスタイル':'Open-collar shirt style','三つ揃いスーツ':'Three-piece suit','仕立て・既製品':'Tailored / ready-made','支給品・制服':'Issued uniform',
    '参照画像前提（簡潔版）':'Reference-image based (concise)','単体で完結（フル記述）':'Standalone (full description)','トレーディングカード':'Trading card',
    'スキンフェード':'Skin fade','ローフェード':'Low fade','フェード×ツイストスパイラル':'Fade with twist-spiral perm','バーバースタイル（七三フェード）':'Barber style (side-part fade)','クロップスタイル':'Crop cut','マッシュウルフ':'Mash-wolf cut','ソフトモヒカン':'Soft mohawk','アシメショート':'Asymmetric short cut',
    '春':'Spring','夏':'Summer','秋':'Autumn','冬':'Winter',
    '結果画面のみ表示':'Show on result screen only','画像内にも表示する':'Also render inside the image','表示しない':'Hide',
    '服装・場面・体型に反映':'Affects outfit, scene, and body','場面のみに反映':'Affects scene only','影響なし':'No influence',
    'ビール腹':'Beer belly','中肉中背':'Average build','細マッチョ':'Lean muscular','隠れ筋肉質':'Secretly muscular','逆三角形体型':'V-shaped torso','華奢な体型':'Delicate slender build','水泳選手体型':'Swimmer build (broad shoulders, V-shape)','バスケットボール選手体型':'Basketball player build (tall, lean-muscular)','ラグビー選手体型':'Rugby player build (thick and powerful)','柔道家体型':'Judoka build (heavy-set, strong)','陸上短距離選手体型':'Sprinter build (explosive muscles)','陸上長距離選手体型':'Distance runner build (lean and wiry)','クライマー体型':'Climber build (defined upper body)','骨太体型':'Big-boned build','肩幅広め体型':'Broad-shouldered build',
    '普通系':'Ordinary','地味系':'Plain / modest','オタク系':'Otaku','ヤンキー系':'Yankee (delinquent style)','ホスト系':'Host club style','おじさん系':'Middle-aged guy','メガネ知的系':'Intellectual with glasses','ブサイク系':'Homely-looking',
    '昭和顔（濃い顔立ち）':'Showa-era bold features','しょうゆ顔':'Light refined features (shoyu-gao)','ソース顔':'Deep bold features (sauce-gao)','彫りの深い縄文系':'Deep-set Jomon-type features','あっさり弥生系':'Soft Yayoi-type features','たれ目系':'Droopy-eyed type','つり目系':'Upturned-eyed type','平成アイドル風':'Heisei idol style',
    'なし（クリアな肌）':'None (clear skin)','頬にそばかす':'Freckles on the cheeks','鼻まわりに薄いそばかす':'Light freckles around the nose','額に小さなニキビ':'A few small pimples on the forehead','頬にニキビ跡（薄い凹凸）':'Faint acne scars on the cheeks','口元のほくろ':'A mole near the mouth','目元の泣きぼくろ':'A teardrop mole under the eye','首筋のほくろ':'A mole on the neck','頬の小さなほくろ':'A small mole on the cheek','うっすら青ひげ（剃り跡）':'A faint shaved-beard shadow','日焼けによる肌ムラ':'Slight tan unevenness','えくぼ':'Dimples','左頬の薄い傷跡':'A faint scar on the left cheek','眉尻の剃り込み跡':'A shaved slit at the eyebrow tail','目の下のうっすらしたクマ':'Faint under-eye circles','頬の自然な赤み':'A natural flush on the cheeks','額の皮脂感（自然なテカリ）':'A natural sheen on the forehead','頬の毛穴感（自然な質感）':'Natural visible pores on the cheeks','腕まくり日焼けの跡':'A rolled-sleeve tan line','ゴーグル跡の日焼けムラ':'A goggle-shaped tan line','眉間のしわ':'A crease between the brows','目尻の笑いじわ':'Smile lines at the eye corners','ほうれい線':'Nasolabial folds','頬の薄いシミ':'Faint sun spots on the cheeks','首のしわ':'Neck lines',
    '年相応の渋さがある':'Age-appropriate seasoned look','穏やかな年配の風格':'Calm elderly dignity',
    'やんちゃ系':'Mischievous type','勤務帰り':'After work','休日':'Day off',
    '1人（通常）':'Solo (normal)','2人グループ':'Group of 2','3人グループ':'Group of 3',
    'メンバーごとに別々の指示文':'Separate prompts per member','1つの指示文にまとめて生成':'One combined prompt for all members',
    '同じ大学のサークル仲間':'University club friends','高校からの友人':'Friends since high school','バイト仲間':'Part-time job coworkers','地元の幼なじみ':'Childhood friends from hometown','職場の同期':'Coworkers who joined the same year','大学時代からの友人':'Friends since university','バンド仲間':'Bandmates','スポーツ仲間':'Sports buddies','ジム仲間':'Gym buddies','職場の仲間':'Workplace friends','学生時代からの友人':'Friends since school days','趣味仲間':'Hobby friends',
    'リーダー格':'Leader type','ムードメーカー':'Mood maker','クール担当':'The cool one','しっかり者':'The reliable one','いじられ役':'The teased one','マイペース担当':'The easygoing one',
    'ボクサーパンツのみ':'Boxer briefs only','職業服装':'Work outfit','私服':'Casual outfit',
    'レトロ系':'Retro','モード系':'Mode / high fashion','アウトドア系':'Outdoor','バンドマン系':'Band musician','紳士系':'Gentleman','ギャル男系':'Gyaru-o (flashy)',
    '商社マン風':'Trading-company businessman style','工場勤務風':'Factory worker style','新聞記者風':'Newspaper reporter style','時代に合った下着の種類':'Era-appropriate underwear','提案服装':'Suggested outfit','白ブリーフ':'Classic white briefs','カラーブリーフ':'Colored classic briefs','トランクス':'Trunks-style boxer shorts','ボクサーパンツ':'Boxer briefs',
    '光沢風':'Glossy effect','箔押し風':'Foil-stamped effect','キラ加工風':'Sparkle effect','フレーム強調':'Emphasized frame','角丸カード風':'Rounded-card style','エンブレム付き':'With emblem',
    'ほぼなし':'Almost none','薄め':'Light','自然':'Natural','やや濃い':'Slightly thick','濃い':'Thick','部位差あり':'Varies by area','手入れされている':'Groomed','ワイルド寄り':'Wild-leaning','スポーツ系で自然':'Natural sporty','一部のみ目立つ':'Only some areas stand out','ごく薄い':'Very light','手入れ済み':'Groomed','部分的に残している':'Partially kept'

  };

// index.html:869
export const sceneTranslations = {
    '駅の伝言板や喫茶店の窓際の近くで、当時らしい落ち着いた私服姿を偶然見かけた場面':'A candid moment near a station message board or a coffee shop window, in a calm outfit that suits the era',
    '商店街のレコード店の前で立ち止まっている姿を偶然見かけた場面':'A candid moment of him pausing in front of a record shop in a shopping street',
    '喫茶店や貸レコード店の近くで、時代の空気をまとった私服姿を偶然見かけた場面':'A candid moment near a coffee shop or record rental store, wearing clothes that carry the mood of the era',
    'レンタルビデオ店やゲームセンターの前で、友人を待つ姿を偶然見かけた場面':'A candid moment of him waiting for friends in front of a video rental shop or an arcade',
    '公衆電話の近くで連絡を待つような姿を偶然見かけた場面':'A candid moment of him seemingly waiting for a call near a public phone booth',
    'CDショップや携帯ショップの前で、ふと立ち止まる姿を偶然見かけた場面':'A candid moment of him pausing in front of a CD shop or a mobile phone store',
    'カフェの前でスマートフォンを見ながら待ち合わせている姿を偶然見かけた場面':'A candid moment of him checking his smartphone while waiting in front of a cafe',
    'カフェや商業施設の前で、スマートフォンを片手に自然体でたたずむ姿を偶然見かけた場面':'A candid moment of him standing naturally with a smartphone in hand in front of a cafe or shopping complex',
    '喫茶店やレコードショップの近くで、レトロな雰囲気の私服姿を偶然見かけた場面':'A candid moment near a coffee shop or record store, in a retro-flavored outfit',
    'ライブハウスの入り口近くで、機材を持って立っている姿を偶然見かけた場面':'A candid moment of him standing near a live-house entrance with some equipment',
    '落ち着いたホテルのロビーや上質な街並みで、品のある立ち姿を偶然見かけた場面':'A candid moment of a refined standing figure in a calm hotel lobby or an elegant street',
    '公園の入り口やアウトドアショップの前で、身軽な服装でたたずむ姿を偶然見かけた場面':'A candid moment near a park entrance or an outdoor gear shop, in light comfortable clothes',
    '繁華街の通りで、華やかな雰囲気で友人と話している姿を偶然見かけた場面':'A candid moment of him chatting with friends in a flashy downtown street',
    'セレクトショップやギャラリー前で、モードな私服姿を偶然見かけた場面':'A candid moment in a high-fashion outfit in front of a select shop or gallery',
    'オフィス街の交差点で、書類鞄を持って颯爽と歩く姿を偶然見かけた場面':'A candid moment of him striding through an office-district crossing with a briefcase',
    '工場や作業場の近くで、仕事帰りに私服へ着替えた姿を偶然見かけた場面':'A candid moment near a factory or workshop, changed into casual clothes on his way home',
    '駅から学校へ向かう途中、朝の通学路でふと見かけた場面':'A casually spotted moment on the morning route from the station to school.',
    '出勤前の駅前やオフィス街で偶然すれ違った場面':'A chance encounter near a station or office district before work.',
    '大学施設や作業スペースの近くで、資料やPCを持って移動しているところを偶然見かけた場面':'A chance sighting near a university facility or workspace while he is moving with documents or a laptop.',
    'スポーツ施設の外や練習帰りの通路で、汗が引いた自然な状態を偶然見かけた場面':'A chance sighting outside a sports facility or on the way back from practice, after he has cooled down.',
    '街中で撮影や移動の合間に、ふと立ち止まった瞬間を偶然見かけた場面':'A chance sighting in the city when he briefly pauses between shoots or while moving around.',
    '夕方の街角で、少しラフな雰囲気で歩いているところを偶然見かけた場面':'A chance sighting at a street corner in the evening, walking with a slightly rough vibe.',
    '駅前や繁華街の通りで、友人と合流する前の自然な姿を偶然見かけた場面':'A chance sighting near a station or downtown street before meeting friends.',
    'カフェ前や落ち着いた街角で、柔らかい雰囲気の立ち姿を偶然見かけた場面':'A chance sighting near a café or a calm street corner, standing with a soft vibe.',
    '古着屋や小さなギャラリーの近くで、個性的な私服姿を偶然見かけた場面':'A chance sighting near a thrift shop or a small gallery, wearing distinctive casual clothes.',
    '夜の駅前や静かな通りで、落ち着いた雰囲気で歩く姿を偶然見かけた場面':'A chance sighting near a station at night or on a quiet street, walking with a calm vibe.',
    'カフェや商業施設の近くで、洗練された私服姿を偶然見かけた場面':'A chance sighting near a café or shopping complex, wearing polished casual clothes.',
    '駅前や商店街、学校やオフィスの近くで、日常の流れの中に自然に溶け込んでいるところを偶然見かけた場面':'A chance sighting near a station, shopping street, school, or office, naturally blending into everyday life.',
    '都会的なカフェ通りや商業施設の近くで、洗練された雰囲気の立ち姿を偶然見かけた場面':'A chance sighting near an urban café street or shopping complex, standing with a refined vibe.',
    '大型商業施設や夜の街並みの近くで、都会的な私服姿を偶然見かけた場面':'A chance sighting near a large shopping complex or a night cityscape, wearing urban casual clothes.',
    '大学キャンパス周辺やダウンタウンの歩道で、自然に歩いている姿を偶然見かけた場面':'A chance sighting around a university campus or downtown sidewalk, walking naturally.',
    '街路樹のある通りやカフェテラスの近くで、さりげなく立っている姿を偶然見かけた場面':'A chance sighting on a tree-lined street or near a café terrace, standing casually.',
    '広場やスポーツコートの近くで、活動的で親しみやすい雰囲気の姿を偶然見かけた場面':'A chance sighting near a plaza or sports court, with an active and friendly vibe.',
    'にぎやかな通りや屋外カフェの近くで、軽やかな私服姿を偶然見かけた場面':'A chance sighting near a lively street or outdoor café, wearing light casual clothes.',
    '東南アジアの都市部の街角や屋外カフェの近くで、軽やかな私服姿を偶然見かけた場面':'A chance sighting near an urban street corner or outdoor café in Southeast Asia, wearing light casual clothes.',
    '日常の街中で、自然体の姿を偶然見かけた場面':'A chance sighting in an everyday urban setting, looking natural and at ease.',
    '出勤前の静かな駅前やオフィス街で、落ち着いた雰囲気で歩いているところを偶然見かけた場面':'A chance sighting near a quiet station or office district before work, walking with a calm presence.',
    '夕方の街角やスポーツ施設帰りに、活動的な雰囲気で友人と合流する前の姿を偶然見かけた場面':'A chance sighting at an evening street corner or after leaving a sports facility, before meeting friends with an active vibe.',
    'カフェ前や古着屋、小さなギャラリーの近くで、自然体の私服姿を偶然見かけた場面':'A chance sighting near a café, thrift shop, or small gallery, wearing natural casual clothes.',
    'にぎやかな通りや商業施設周辺で、明るい雰囲気で友人を待つ姿を偶然見かけた場面':'A chance sighting on a lively street or near a shopping complex, waiting for friends with a bright vibe.',
    '大学施設や静かな作業スペースの近くで、考え込むように歩く姿を偶然見かけた場面':'A chance sighting near a university facility or quiet workspace, walking as if deep in thought.'
  };

// index.html:943
export const captionFieldLabelMap = {
    name:{ja:'氏名',en:'Name'}, age:{ja:'年齢',en:'Age'}, era:{ja:'年代',en:'Era'}, height:{ja:'身長',en:'Height'}, weight:{ja:'体重',en:'Weight'}, footSize:{ja:'足のサイズ',en:'Foot Size'}, mbti:{ja:'MBTI・性格',en:'MBTI / Personality'}, nationality:{ja:'国籍',en:'Nationality'}, role:{ja:'職業',en:'Occupation'}
  };

// index.html:946
export const cardFieldLabelMap = {
    name:{ja:'氏名',en:'Name'}, age:{ja:'年齢',en:'Age'}, era:{ja:'年代',en:'Era'}, height:{ja:'身長',en:'Height'}, weight:{ja:'体重',en:'Weight'}, footSize:{ja:'足サイズ',en:'Foot Size'}, nationality:{ja:'国籍',en:'Nationality'}, ethnicity:{ja:'人種',en:'Ethnicity'}, role:{ja:'職業',en:'Occupation'}, vibe:{ja:'雰囲気',en:'Vibe'}, mbti:{ja:'MBTI',en:'MBTI'}, facePreset:{ja:'顔立ち',en:'Face Type'}, bodyType:{ja:'体型',en:'Body Type'}, footShape:{ja:'足の形',en:'Foot Shape'}, bodyHairOverall:{ja:'体毛',en:'Body Hair'}, outfitType:{ja:'提案服装',en:'Outfit'}, scene:{ja:'場面',en:'Scene'}, rarity:{ja:'レアリティ',en:'Rarity'}
  };

// index.html:949
export const uiCardTitles = {
    initialBasic:{ja:'基本設定',en:'Basic Settings'}, initialOutput:{ja:'出力設定',en:'Output Settings'}, initialProfileText:{ja:'画像内プロフィール表記',en:'Profile Text in Image'}, initialCard:{ja:'カード差分プロンプト設定',en:'Trading Card Variation Settings'}, manualOutput:{ja:'出力設定',en:'Output Settings'}, manualProfileText:{ja:'画像内プロフィール表記',en:'Profile Text in Image'}, manualCard:{ja:'カード差分プロンプト設定',en:'Trading Card Variation Settings'}
  };

// index.html:3708
export const UNDERWEAR_COLOR_EN = {'白':'white','ライトブルー':'light blue','グレー':'gray','ネイビー':'navy','チェック柄':'plaid','ストライプ柄':'striped','無地ネイビー':'plain navy','無地グレー':'plain gray','小紋柄':'subtly patterned','ライトグレー':'light gray','黒':'black','チャコール':'charcoal','ダークグレー':'dark gray'};
