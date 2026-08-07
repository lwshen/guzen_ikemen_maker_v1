// inner (hidden) profile subsystem
// Split from the verbatim V3.2.0 baseline (Phase 4 stage B) — bodies unchanged
// except top-level state rewritten to ST.* (see state.js).
import {
  displayValue,
  LT,
} from './i18n.js';
import {
  FRIEND_RELATIONS, HIGH_TRAIN, INNER_BLOOD_DIST, INNER_CATS, INNER_CATS_ZH, INNER_COMPLEX_GENERIC, INNER_DEPS, INNER_DESIRES, INNER_DIALECTS,
  INNER_DREAMS, INNER_DREAM_CAT, INNER_FASHION_SENSE, INNER_FOOD_HATE, INNER_FOOD_LIKE, INNER_FRIEND_FREQ, INNER_FRIEND_MEET, INNER_HEALTH_BASE,
  INNER_HEALTH_MID, INNER_HOBBY_BY_VIBE, INNER_HOBBY_GENERIC, INNER_INCOME_TABLE, INNER_JP_PREFS, INNER_LIVING_MARRIED, INNER_LIVING_SINGLE, INNER_LOVER_NONE,
  INNER_LOVER_YES, INNER_LOVE_BASE, INNER_LOVE_NOTES, INNER_LOVE_NOTE_ANY, INNER_LOVE_NOTE_BI, INNER_LOVE_NOTE_F, INNER_LOVE_NOTE_M, INNER_MEMORY_BASE,
  INNER_MYBOOM_COMMON, INNER_MYBOOM_MODERN, INNER_MYBOOM_RETRO, INNER_NATION_CITIES, INNER_ORIGINS, INNER_PRINCIPLES, INNER_PRONOUNS_BASE, INNER_SPEECH_HABITS,
  INNER_SPEECH_REGISTER, INNER_SPEECH_VOICE, INNER_TALENTS, INNER_TRAUMAS, INNER_UNFORGIVABLES, INNER_UPBRINGINGS, INNER_WEAK_BODY, INNER_WEAK_MIND,
} from '../data/index.js';
import {
  pick, rnd, weighted,
} from './core.js';
import {
  createFriend, renderFriendPanel,
} from './flow.js';
import {
  buildBioHook, eraBrandList, nameByNationality, nameKana, syncMarriageRing,
} from './generate.js';
import {
  ST,
} from './state.js';
import {
  renderAll,
} from './ui.js';

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
    if(b==='rare') return ` <span class="inner-badge ib-rare">${LT('★レア', '★Rare', '★稀有')}</span>`;
    if(b==='gap') return ` <span class="inner-badge ib-gap">${LT('⚡ギャップ', '⚡Gap', '⚡反差')}</span>`;
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
    if(has('expcount')){ const r = chooseInnerExpCount(c); c.expCountText = r[0]; M.expcount = r[1]; }
    if(has('drink')){ const r = chooseInnerDrink(c); c.drinkText = r[0]; M.drink = r[1]; }
    if(has('smoke')){ const r = chooseInnerSmoke(c); c.smokeText = r[0]; M.smoke = r[1]; }
    if(has('friend')){ const r = chooseInnerFriend(c); c.friendText = r[0]; M.friend = r[1]; }
    if(all && typeof buildBioHook === 'function'){ c.bioText = buildBioHook(c); }
    return c;
  }

  function innerAnyShown(){ return Object.values(ST.innerCatShow).some(Boolean); }

  // --- 表示セクション（カテゴリ選択式・32項目） ---
  function buildInnerSection(c, L){
    const en = ST.uiLang==='en';
    // values are free-form Japanese phrases; run them through the value table
    // so en/zh entries take effect (missing entries fall back to Japanese)
    const V = (val, key)=>`${(val ? displayValue('innerText', val) : '') || '—'}${innerBadgeHtml(c, key)}`;
    const friendVal = V(c.friendText,'friend') + (c.friendOf ? '' : ` <button class="pf-btn" data-make-friend title="${LT('この友人を実際に作成（表示された関係・名前を反映）', 'Create this friend for real', '实际创建这位好友（沿用显示的关系与姓名）')}">👥 ${LT('この友人を作成', 'Create this friend', '创建这位好友')}</button>`);
    const CAT_ROWS = {
      basic: [
        [LT('生年月日', 'Birth Date', '出生年月日'), V(c.birthdateText,'birthdate'), 'birthdateText','icv-basic'],
        [LT('出身地', 'Hometown', '出生地'), V(c.birthplaceText,'birthplace'), 'birthplaceText','icv-basic'],
        [LT('血液型', 'Blood Type', '血型'), V(c.bloodType,'blood'), 'bloodType','icv-basic'],
        [LT('一人称', 'Pronoun', '第一人称'), V(c.pronoun,'pronoun'), 'pronoun','icv-basic'],
        [LT('口調・話し方', 'Speech Style', '语气・说话方式'), V(c.speechText,'speech'), 'speechText','icv-basic'],
        [LT('ニックネーム', 'Nickname', '昵称'), V(c.nicknameText,'nickname'), 'nicknameText','icv-basic']
      ],
      life: [
        [LT('結婚', 'Marital Status', '婚姻'), V(c.maritalText,'marital'), 'maritalText','icv-life'],
        [LT('恋人の有無', 'Partner', '恋人'), V(c.loverText,'lover'), 'loverText','icv-life'],
        [LT('家族構成', 'Family', '家庭构成'), V(c.familyText,'family'), 'familyText','icv-life'],
        [LT('生活状況', 'Living Situation', '生活状况'), V(c.livingText,'living'), 'livingText','icv-life'],
        [LT('住居', 'Residence', '居所'), V(c.residenceText,'residence'), 'residenceText','icv-life'],
        [LT('出自', 'Family Roots', '出身背景'), V(c.originText,'origin'), 'originText','icv-life'],
        [LT('学歴', 'Education', '学历'), V(c.educationText,'education'), 'educationText','icv-life'],
        [LT('収入', 'Income', '收入'), V(c.incomeText,'income'), 'incomeText','icv-life'],
        [LT('資産', 'Assets', '资产'), V(c.assetText,'asset'), 'assetText','icv-life']
      ],
      daily: [
        [LT('健康状態', 'Health', '健康状况'), V(c.healthText,'health'), 'healthText','icv-daily'],
        [LT('趣味', 'Hobby', '兴趣'), V(c.hobbyText,'hobby'), 'hobbyText','icv-daily'],
        [LT('マイブーム', 'Current Obsession', '近期热衷'), V(c.myBoomText,'myboom'), 'myBoomText','icv-daily'],
        [LT('好きな食べ物', 'Favorite Food', '爱吃的食物'), V(c.foodLikeText,'foods'), 'foodLikeText','icv-daily'],
        [LT('嫌いな食べ物', 'Disliked Food', '讨厌的食物'), V(c.foodHateText,'foods'), 'foodHateText','icv-daily']
      ],
      mind: [
        [LT('行動原理', 'Guiding Principle', '行事准则'), V(c.principleText,'principle'), 'principleText','icv-mind'],
        [LT('コーデ基準', 'Fashion Policy', '穿搭准则'), V(c.fashionSenseText,'fashionsense'), 'fashionSenseText','icv-mind'],
        [LT('表向きの夢', 'Public Dream', '对外的梦想'), V(c.innerDream,'dream'), 'innerDream','icv-mind'],
        [LT('欲望（本音）', 'Hidden Desire', '欲望（真心话）'), V(c.innerDesire,'desire'), 'innerDesire','icv-mind'],
        [LT('弱点（性格 / 身体）', 'Weakness (Mind / Body)', '弱点（性格 / 身体）'), V(`${c.weaknessMind||'—'}／${c.weaknessBody||'—'}`,'weakness'), 'weaknessMind,weaknessBody','icv-mind'],
        [LT('秀でた才能', 'Talent', '过人的才能'), V(c.innerTalent,'talent'), 'innerTalent','icv-mind'],
        [LT('コンプレックス', 'Complex', '情结・自卑处'), V(c.complexText,'complex'), 'complexText','icv-mind'],
        [LT('許せないこと', 'Unforgivable', '不可原谅之事'), V(c.unforgivableText,'unforgivable'), 'unforgivableText','icv-mind']
      ],
      past: [
        [LT('過去（生い立ち / トラウマ）', 'Past / Trauma', '过去（成长经历 / 心理创伤）'), V(`${c.pastUpbringing||'—'}<br>${c.pastTrauma||'トラウマ：なし'}`,'past'), 'pastUpbringing,pastTrauma','icv-past'],
        [LT('思い出の出来事', 'Treasured Memory', '难忘的往事'), V(c.memoryText,'memory'), 'memoryText','icv-past'],
        [LT('仲の良い友人', 'Close Friend', '要好的朋友'), friendVal, 'friendText','icv-past'],
        [LT('恋愛対象', 'Romantic Interest', '恋爱对象'), V(c.loveTarget,'love'), 'loveTarget','icv-past'],
        [LT('恋愛経験人数', 'Past Relationships', '恋爱经历人数'), V(c.loveCountText,'lovecount'), 'loveCountText','icv-past']
      ],
      adult: [
        [LT('飲酒', 'Drinking', '饮酒'), V(c.drinkText,'drink'), 'drinkText','icv-adult'],
        [LT('喫煙', 'Smoking', '吸烟'), V(c.smokeText,'smoke'), 'smokeText','icv-adult'],
        [LT('ギャンブル歴', 'Gambling History', '赌博经历'), V(c.gambleText,'gamble'), 'gambleText','icv-adult'],
        [LT('風俗経験', 'Adult-Venue Experience', '风俗店经历'), V(c.fuzokuText,'fuzoku'), 'fuzokuText','icv-adult'],
        [LT('初めての体験', 'First Experience', '初次体验'), V(c.firstExpText,'firstexp'), 'firstExpText','icv-adult'],
        [LT('経験人数', 'Partner Count', '经验人数'), V(c.expCountText,'expcount'), 'expCountText','icv-adult'],
        [LT('週頻度（相手あり）', 'Weekly Pace (Partner)', '每周频率（与伴侣）'), V(c.weekFreqText,'weekfreq'), 'weekFreqText','icv-adult'],
        [LT('週頻度（セルフ）', 'Weekly Pace (Solo)', '每周频率（自己）'), V(c.selfFreqText,'selffreq'), 'selfFreqText','icv-adult']
      ]
    };
    const allOn = INNER_CATS.every(([k])=>ST.innerCatShow[k]);
    const ctrl = `<div class="inner-ctrl">`
      + `<button class="pf-btn inner-allbtn" data-icat-all="${allOn?'0':'1'}">${allOn ? LT('すべて隠す','Hide all','全部隐藏') : LT('すべて表示','Show all','全部显示')}</button>`
      + INNER_CATS.map(([k,ja,enT,cls])=>`<button class="icat-chip ${cls}${ST.innerCatShow[k]?' on':''}" data-icat="${k}">${LT(ja, enT, INNER_CATS_ZH[k])}</button>`).join('')
      + `</div>`;
    const rows = [['__HEAD__', ctrl]];
    let shown = 0;
    for(const [k,ja,enT,cls] of INNER_CATS){
      if(!ST.innerCatShow[k]) continue;
      shown++;
      rows.push(['__HEAD__', `<div class="inner-cat ${cls}">${en?enT:ja}</div>`]);
      rows.push(...CAT_ROWS[k]);
    }
    if(!shown) rows.push(['__HEAD__', `<p class="notice" style="margin:8px 0 2px">${LT('まだ何も表示されていません。上のカテゴリボタンを押すと項目が表示されます。表示したカテゴリだけが雑誌ページ／プロフィールシートの指示文に反映されます。', 'Nothing is shown yet. Tap the category chips above to reveal items — only the shown categories are reflected in the magazine-page / profile-sheet prompts.', '目前尚未显示任何内容。点击上方的分类按钮即可展开项目。只有已显示的分类会写入杂志页／档案页的提示词。')}</p>`]);
    return ['inner', LT('内面・背景（表示中のカテゴリのみ雑誌ページ／プロフィールシートに反映）', 'Inner / Background (only shown categories go into magazine & profile-sheet prompts)', '内在・背景（仅显示中的类别会写入杂志页／档案页提示词）'), rows];
  }

  // --- ✎編集用プール（新項目） ---
  function INNER_EDIT_POOLS2(){
    const c = (typeof ST.current!=='undefined' && ST.current) ? ST.current : {};
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
      expCountText: ['0人（まだ経験がない）','1人（妻だけ）','1人（最初で最後になるかもしれない一人）','2人（手堅い人数）','3人（全員ちゃんと交際した相手）','5人（片手では収まらなくなった）','8人（ワンナイト含む・本人調べ）','12人（途中から数え方が雑）','25人（もう思い出せない顔もある）','60人（プロ含む。もはや概算）','150人（三桁。本人は真顔）'],
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
    const S = ST.innerCatShow;
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
      if(S.adult) sub.push(`夜の顔（飲酒：${c.drinkText||''}／喫煙：${c.smokeText||''}／ギャンブル歴：${c.gambleText||'なし'}／風俗経験：${c.fuzokuText||'なし'}／初めての体験：${c.firstExpText||''}／経験人数：${c.expCountText||''}／週頻度：相手あり ${c.weekFreqText||''}・セルフ ${c.selfFreqText||''}）`);
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
    if(/童貞/.test(String(c.complexText||''))) return [pick(['なし（機会がない）','なし（勇気が出ない）','誘われて断った']), null];
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
    if(/童貞/.test(String(c.complexText||''))) return ['まだない（タイミングを逃し続けたと本人談）', 'rare'];
    if(age<20) return [/興味がない/.test(String(c.loveTarget||'')) ? 'まだない（興味もない）' : pick(['まだない','秘密（大人になってから話すやつ）']), null];
    let list = [['二十歳前後',7],['大学時代',6],['社会人1年目',4],['20代半ば',4],['20代後半',2.5],['成人してすぐ',3],['ノーコメント（言わぬが花）',3,'d'],['忘れたことにしている',1.5,'d']];
    if(age>=27) list.push(['30代（遅咲き）',age>=32?2:0.8]);
    if(/女性経験の少なさ/.test(String(c.complexText||''))) list = list.map(x=>/20代後半|30代|成人してすぐ/.test(x[0])?[x[0],x[1]*3,x[2]]:(/二十歳前後|大学時代/.test(x[0])?[x[0],x[1]*0.3,x[2]]:x));
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
    if(/童貞/.test(String(c.complexText||''))) return [pick(['0人','1人（手をつないで終わった清い交際）']), null];
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
    if(/女性経験の少なさ/.test(String(c.complexText||''))) list = list.filter(x=>!/片手|5〜6|10人|二桁/.test(x[0]));
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
  // --- 経験人数（実数＋コメント・二桁三桁あり） ---
  function chooseInnerExpCount(c){
    const age = Number(c.age)||25;
    const lt = String(c.loveTarget||''), fe = String(c.firstExpText||''), fz = String(c.fuzokuText||'');
    const married = /既婚|再婚/.test(String(c.maritalText||''));
    const vibe = String(c.vibe||'');
    if(/童貞/.test(String(c.complexText||''))) return ['0人（まだ経験がない）', null];
    if(/まだない/.test(fe)) return [/興味がない/.test(lt) ? '0人（求めてもいない）' : '0人（まだ経験がない）', null];
    if(/興味がない/.test(lt) && !married) return ['0人（求めていない）', null];
    const lcText = String(c.loveCountText||'');
    let loveN;
    const dm = lcText.match(/^(\d+)人/);
    if(dm) loveN = Number(dm[1]);
    else if(/片手で足りる/.test(lcText)) loveN = rnd(4,5);
    else if(/5〜6人/.test(lcText)) loveN = rnd(5,6);
    else if(/10人前後/.test(lcText)) loveN = rnd(8,12);
    else if(/二桁/.test(lcText)) loveN = rnd(10,25);
    else loveN = rnd(1,3);
    const faithful = /一途/.test(lt) || /石橋を叩いて/.test(String(c.principleText||''));
    const playful = ['ホスト系','ギャル男系','やりらふぃー系'].includes(vibe) || /惚れっぽい/.test(lt);
    let n, comment = '', badge = null;
    if(loveN>=3 && !married && Math.random()<0.03){
      n = rnd(0,1); comment = '交際は多いが最後までは慎重派'; badge='gap';
    } else if(married && (faithful || /妻ひと筋/.test(lcText) || Math.random()<0.35)){
      n = Math.max(1, loveN); comment = n===1 ? '妻だけ' : '独身時代を含めて。結婚してからは妻ひと筋';
    } else if(faithful){
      n = loveN; comment = '付き合った人としか経験がない';
    } else if(playful){
      n = Math.round(loveN * (1.5 + Math.random()*1.8)) + rnd(0,3); comment = 'ワンナイト含む・本人調べ';
    } else {
      n = loveN + (Math.random()<0.35 ? rnd(1,2) : 0);
      comment = n===loveN ? '全員ちゃんと交際した相手' : '数え方には諸説ある';
    }
    if(/付き合いで1回だけ/.test(fz)){ n += 1; comment = 'うち1人はお店の人'; }
    else if(/若い頃に数回|卒業した/.test(fz)){ n += rnd(2,4); comment = 'プロを含めた概算'; }
    else if(/たまに行く|行きつけ/.test(fz)){ n += rnd(6,25); comment = 'プロ含む。もはや概算'; badge = badge||'rare'; }
    const cap = Math.max(1, (age-17)) * 7;
    n = Math.min(n, cap);
    if((vibe==='ホスト系' || /ホスト/.test(String(c.role||''))) && age>=23){
      if(Math.random()<0.10){ n = Math.min(rnd(30,90), cap); comment = '接客業時代の武勇伝込み'; badge='rare'; }
      if(Math.random()<0.03){ n = rnd(100,300); comment = 'ホスト界隈の伝説（本人談・盛りあり）'; badge='rare'; }
    } else if(playful && age>=25 && Math.random()<0.04){ n = Math.min(rnd(20,45), cap); comment = '20代を全力で遊んだ結果'; badge='rare'; }
    if(loveN===0 && n>0){ comment = '交際経験はなし。その場限りで済ませてきた'; badge='gap'; }
    if(married && n>=15 && !badge) badge='gap';
    if(!comment){
      comment = n===0?'まだ経験がない': n===1?'最初で最後になるかもしれない一人': n<=4?'手堅い人数': n<=9?'片手では収まらなくなった': n<=29?'途中から数え方が雑': n<=99?'もう思い出せない顔もある':'三桁。本人は真顔';
    }
    return [`${n}人（${comment}）`, badge];
  }

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
    if(!ST.current || ST.spinning) return;
    const seed = ST.current._friendSeed || null;
    const ft = String(ST.current.friendText||'');
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
    if(ST.current && seed && (!ST.current.nationality || ST.current.nationality==='日本')){
      const km = String(seed.name).match(/（(.+)）/);
      if(km){
        const toks = km[1].split(/[・\s]+/).filter(Boolean);
        const givKana = toks.length>=2 ? toks[toks.length-1] : toks[0];
        if(givKana && /^[ァ-ヴー]+$/.test(givKana)){
          if(!ST.current.innerMeta) ST.current.innerMeta = {};
          ST.current.nicknameText = `「${givKana}」（呼び捨て）`;
          ST.current.innerMeta.nickname = null;
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

export {
  innerRoleCat,
  innerAgeBand,
  INNER_RHNEG,
  innerWeighted,
  innerBadgeOf,
  chooseInnerDream,
  chooseInnerDesire,
  chooseInnerWeakness,
  chooseInnerTalent,
  chooseInnerPronoun,
  chooseInnerIncome,
  chooseInnerEducation,
  chooseInnerOrigin,
  chooseInnerComplexBase,
  chooseInnerBlood,
  innerBadgeHtml,
  INNER_EDIT_POOLS,
  innerParseKanaName,
  chooseInnerHobby,
  chooseInnerMyBoom,
  chooseInnerFoods,
  chooseInnerHealth,
  chooseInnerMarital,
  innerIsMarried,
  chooseInnerLiving,
  chooseInnerFamily,
  innerWareki,
  innerZodiac,
  chooseInnerBirthdate,
  chooseInnerNickname,
  innerDialectOf,
  chooseInnerSpeech,
  chooseInnerMemory,
  chooseInnerLover,
  innerExpandKeys,
  generateInnerProfile,
  innerAnyShown,
  buildInnerSection,
  INNER_EDIT_POOLS2,
  innerMagazineBlock,
  chooseInnerFuzoku,
  chooseInnerGamble,
  chooseInnerFirstExp,
  chooseInnerWeekFreq,
  chooseInnerSelfFreq,
  chooseInnerLoveCount,
  chooseInnerAsset,
  chooseInnerDrink,
  chooseInnerSmoke,
  chooseInnerFashionSense,
  applyFashionSenseFx,
  chooseInnerLove,
  chooseInnerBirthplace,
  innerPastAllowed,
  chooseInnerPast,
  chooseInnerComplex,
  chooseInnerResidence,
  chooseInnerFriend,
  innerFriendRelOf,
  makeInnerFriend,
  chooseInnerPrinciple,
  chooseInnerUnforgivable,
  applyMuscleFashion,
};
