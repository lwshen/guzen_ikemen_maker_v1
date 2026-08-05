// entry: data-table patches, event wiring and init (original order preserved)
// Split from the verbatim V3.2.0 baseline (Phase 4 stage B) — bodies unchanged
// except top-level state rewritten to ST.* (see state.js).
import {
  BRIDGE_HOOK, CULT_MEM, ERA_HOOK, INNER_COMPLEX_GENERIC, INNER_DEPS, INNER_DESIRES, INNER_LOVE_BASE, INNER_LOVE_NOTES,
  INNER_ORIGINS, INNER_TALENTS, INNER_TRAUMAS, INNER_UPBRINGINGS, INNER_WEAK_BODY, INNER_WEAK_MIND, MBTI_INTRO, NATION_NAMES,
  OCCUPATIONS, OCC_CAT_HOOK, OCC_HOOK, SPORT_BODY, SPORT_MEM, SPORT_MUSCLE, SPORT_SKELETON, TRAIN_HOOK,
} from '../data/index.js';
import {
  STORAGE_KEY,
} from './core.js';
import {
  createFriend, renderFriendPanel, renderSlots, spin,
} from './flow.js';
import {
  OCC_CAT, initFixedForm, initInitialSettings, initManualControls, initSlots, resolveFootCfg,
} from './generate.js';
import {
  T, applyUiLanguage, updateModeNote,
} from './i18n.js';
import {
  loadFromPromptText,
} from './prompts.js';
import {
  ST, els,
} from './state.js';
import {
  downloadJson, importJsonFile, initAccordions, initPresets, renderAll, renderHistory, renderPromptTabs, renderSettingChips,
  saveCurrent, switchTab,
} from './ui.js';

  NATION_NAMES['カナダ'] = NATION_NAMES['アメリカ'];

  NATION_NAMES['イギリス'] = NATION_NAMES['アメリカ'];

  NATION_NAMES['オーストラリア'] = NATION_NAMES['アメリカ'];

 OCCUPATIONS.forEach(([n,c])=>OCC_CAT[n]=c);

  SPORT_BODY['陸上（短距離）'] = SPORT_BODY['陸上短距離'];

  SPORT_BODY['陸上（長距離）'] = SPORT_BODY['陸上長距離'];

  SPORT_BODY['自転車ロード'] = SPORT_BODY['自転車競技'];

  (function(){
    const alias = (map, pairs)=>pairs.forEach(([a,b])=>{ if(map[b] && !map[a]) map[a] = map[b]; });
    alias(SPORT_MUSCLE, [['陸上短距離','陸上（短距離）'],['陸上長距離','陸上（長距離）'],['自転車ロード','自転車競技']]);
    alias(SPORT_SKELETON, [['陸上短距離','陸上（短距離）'],['自転車ロード','自転車競技']]);
    SPORT_MUSCLE['ゴルフ'] = ['体幹の回旋筋と前腕、スイングを支える下半身','rotational core, forearms, and a swing-anchoring lower body','体幹まわり'];
    SPORT_SKELETON['サッカー'] = ['骨盤まわりと大腿骨の安定した下半身骨格','a stable pelvis-and-femur lower structure'];
  })();

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

  // --- 恋愛対象：実際の割合＋対象別の多彩な傾向ノート ---
  INNER_LOVE_BASE.length = 0;

  INNER_LOVE_BASE.push(['女性',90.6],['男性',2.6,'r'],['男女どちらも',2.6,'r'],['まだ揺らいでいて分からない',1.1,'r'],['恋愛にあまり興味がない',1.6,'r'],['二次元にしか本気になれない',1,'r'],['恋愛よりも推しがすべて',0.5,'r']);

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

  document.getElementById('importBtn').onclick = () => document.getElementById('importFile').click();

  document.getElementById('importFile').onchange = e => { const f = e.target.files[0]; if(f) importJsonFile(f); e.target.value=''; };

  initPresets();

  initAccordions();

  renderPromptTabs();

  renderSettingChips();

  document.querySelectorAll('section.panel select, section.panel input').forEach(el=>el.addEventListener('change', ()=>renderSettingChips()));

  document.getElementById('startBtn').onclick=spin;

  document.getElementById('rerollUnlockedBtn').onclick=()=>spin();

  document.getElementById('resetLocksBtn').onclick=()=>{ST.locks={}; renderSlots(ST.current,true);};

  const makerLangSel = document.getElementById('makerLanguage');

  if(makerLangSel){ ST.uiLang = makerLangSel.value || 'ja'; makerLangSel.onchange=()=>{ ST.uiLang = makerLangSel.value || 'ja'; applyUiLanguage(); }; }

  document.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>{ST.mode=b.dataset.mode; document.querySelectorAll('[data-mode]').forEach(x=>x.className='btn dark'); b.className=ST.mode==='full'?'btn blue':'btn primary'; updateModeNote();});

  document.querySelectorAll('.tab').forEach(t=>t.onclick=()=>switchTab(t.dataset.tab));

  document.getElementById('saveBtn').onclick=saveCurrent;

  document.getElementById('jsonBtn').onclick=downloadJson;

  function flashCopied(btn){ if(!btn) return; const orig = T('copyLabel'); btn.textContent = T('copiedLabel'); btn.classList.add('copied'); setTimeout(()=>{ btn.textContent = orig; btn.classList.remove('copied'); }, 1600); }

  document.getElementById('copyPromptBtn').onclick=async(e)=>{ await navigator.clipboard.writeText(els.promptBox.value); flashCopied(e.target); };

  document.getElementById('copyOutfitBtn').onclick=async(e)=>{ await navigator.clipboard.writeText(document.getElementById('outfitPromptBox').value); flashCopied(e.target); };

  document.getElementById('copyOutfitHolidayBtn').onclick=async(e)=>{ await navigator.clipboard.writeText(document.getElementById('outfitHolidayPromptBox').value); flashCopied(e.target); };

  document.getElementById('copyGroupBtn').onclick=async(e)=>{ await navigator.clipboard.writeText(document.getElementById('groupPromptBox').value); flashCopied(e.target); };

  document.getElementById('copyFriendPairBtn').onclick=async(e)=>{ await navigator.clipboard.writeText(document.getElementById('friendPairPromptBox').value); flashCopied(e.target); };

  document.getElementById('friendBtn').onclick=()=>{ if(!ST.current){ alert(T('saveFirst')); return; } const fp=document.getElementById('friendPanel'); fp.classList.toggle('hidden'); if(!fp.classList.contains('hidden')) renderFriendPanel(); };

  document.getElementById('friendRelation').onchange=()=>renderFriendPanel();

  document.getElementById('friendGoBtn').onclick=()=>createFriend();

  document.getElementById('friendPairWearSel').onchange=(e)=>{ if(ST.current){ ST.current.friendPairWear=e.target.value; renderAll(); } };

  document.getElementById('friendPairCountSel').onchange=(e)=>{ if(ST.current){ ST.current.friendPairCount=e.target.value; renderAll(); } };

  document.getElementById('footCfgDiceBtn').onclick=()=>{ if(ST.current){ ST.current.footScene = resolveFootCfg(ST.current); renderAll(); } };

  document.getElementById('restoreCodeBtn').onclick=()=>loadFromPromptText(document.getElementById('restoreCodeInput').value);

  document.getElementById('footCfgResetBtn').onclick=()=>{ if(ST.current){ ST.current.footScene = null; renderAll(); } };

  document.getElementById('copySceneBtn').onclick=async(e)=>{ await navigator.clipboard.writeText(document.getElementById('scenePromptBox').value); flashCopied(e.target); };

  const copyDerivedBtn=document.getElementById('copyDerivedBtn');

 if(copyDerivedBtn) copyDerivedBtn.onclick=async(e)=>{ await navigator.clipboard.writeText(document.getElementById('derivedPromptBox').value); flashCopied(e.target); };

  document.getElementById('clearHistoryBtn').onclick=()=>{ if(confirm(T('confirmClear'))){localStorage.removeItem(STORAGE_KEY); renderHistory();} };

  initSlots();

 initFixedForm();

 initManualControls();

 initInitialSettings();

 applyUiLanguage();

export {
  makerLangSel,
  flashCopied,
  copyDerivedBtn,
};
