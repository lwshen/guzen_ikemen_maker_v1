// Pure data tables, extracted verbatim from the frozen index.html baseline
// (upstream 7438239 / V3.2.0). Layer 5 (npm run verify:data) compares every
// constant against that baseline - edits show up as diffs there, by design.

// index.html:3738
export const FOOT_CFG_AXES = [['scene','場面','Scene'],['posture','座り方','Posture'],['shoeState','靴の状態','Shoes'],['wear','服装','Outfit'],['fabric','靴下の生地状態','Sock Fabric'],['sockState','靴下の着脱','Sock State'],['angle','カメラアングル','Camera Angle'],['prop','足元まわりの小物','Props']];

// index.html:3739
export const FOOT_SCENES = [
    ['玄関で靴を脱ぐ場面','stand','玄関のたたき'],['座敷・和室でくつろぐ','floor','畳'],['自室でくつろぐ','floor','フローリング'],['リビングのソファー周り','chair','カーペット'],['オフィスの椅子まわり（休憩中）','chair','オフィスの床'],['更衣室・ロッカールーム','chair','更衣室の床'],['スリッパに履き替える場面','stand','フローリング'],['ベッドの上でくつろぐ','bed',''],['縁側で休む','floor','縁側の木板'],['小上がりの飲食店','floor','畳'],['畳の休憩室（職場の仮眠室）','floor','畳'],['こたつのある部屋','floor','カーペットとこたつ布団'],['足湯上がりに靴下を履き直した後','chair','ベンチのある床'],['新幹線の座席（靴を脱いでくつろぐ）','chair','車内の床']
  ];

// index.html:3742
export const FOOT_COZY = ['座敷・和室でくつろぐ','自室でくつろぐ','ベッドの上でくつろぐ','縁側で休む','こたつのある部屋','リビングのソファー周り','畳の休憩室（職場の仮眠室）'];

// index.html:3743
export const FOOT_POSTURES = [
    ['床・座敷にあぐらをかく',['floor']],['椅子の上であぐらをかく',['chair']],['足を伸ばして座る',['floor','bed','chair']],['椅子・ソファーで足を組む',['chair']],['普通に椅子・ソファーに座る',['chair']],['足首を交差させて座る',['chair']],['軽くストレッチをしている',['floor','bed']],['正座で座る',['floor']],['横座り（足を崩した正座）',['floor']],['体育座りをする',['floor','bed']],['片膝を立てて座る',['floor']],['立ったまま片足ずつ履き替え中',['stand']],['ソファーに浅く腰掛けて足を投げ出す',['chair']]
  ];

// index.html:3746
export const FOOT_SHOE_STATES = ['脱いだ靴をそばにそろえて置いてある','靴は画面に表示しない','靴を完全に履いている','靴を脱いでいるところ','かかとを踏んでサンダル履きのようにしている','つま先だけ靴に入れてかかとを出している','脱いだ靴の上に足をのせている'];

// index.html:3747
export const FOOT_FABRICS = [
    ['軽い使用感',[1,3],'数回の洗濯を経た柔らかな風合いで、ごくわずかな毛玉がある'],
    ['日常使いの使用感',[3,4],'生地が少しくたびれ、かかととつま先の色がうっすら薄れている'],
    ['しっかり履き込んだ状態',[2,2],'毛玉と生地の伸びがあり、かかと部分の生地が薄くなり始めている'],
    ['履き古した状態',[0.7,0.7],'かかとと親指部分の生地が薄く透け気味で、履き口のゴムがゆるみ、全体に色あせている'],
    ['長時間履いた後の状態',[4,1.5],'一日履いた後の自然なしわが寄り、足裏にうっすらした踏み跡とくすみがある']
  ];

// index.html:3754
export const FOOT_SOCK_STATES = [
    ['靴下を履いたまま',12],['片足だけ靴下を脱いでいる途中',0.8],['両足とも靴下を脱いでいる途中',0.4],['靴下を脱いだ直後（素足）',0.4]
  ];

// index.html:3757
export const FOOT_ANGLES = ['自然な目線の高さ','やや低めのアングル','床・座面レベルの低アングル'];

// index.html:3758
export const FOOT_OCC_SCENES = {
    '自衛官':[
      ['駐屯地の営内居室（白いパイプの2段ベッドが整然と並ぶ明るい大部屋）','chair','明るいリノリウムの床',['きっちり角を揃えて畳んだ布団と毛布','水色のプラスチック収納ボックス','窓際の共用机と椅子','ベッド下につま先を揃えて並べた半長靴','磨き途中の半長靴と靴磨きセット'],true],
      ['営内の2段ベッドの下段に腰掛けて休む','bed','',['ベッド下の貴重品引き出し','きっちり畳んだ毛布','ロッカーに掛けた迷彩服'],true],
      ['隊舎の乾燥室・靴磨きスペース','floor','リノリウムの床',['並んだ半長靴と靴墨','手入れ用の布'],false]
    ],
    '防衛大学校学生':[
      ['防衛大学校の学生舎居室（クリーム色の金属パイプ2段ベッドと縞柄マットレス、きっちり畳まれた寝具が並ぶ8人部屋）','bed','木目調のタイルカーペット',['角を揃えて畳んだ毛布と布団','ベッド下のプラスチック収納ボックス','ベッドに隣接したクリーム色のロッカー','2段ベッドの白いはしご','大きな窓から差し込む光'],true],
      ['学生舎の自習室（壁沿いに机と吊り棚が並び、白いパーティションで区切られた部屋）','chair','ベージュのタイルカーペット',['本棚に並んだ教科書と専門書','緑のデスクマットと卓上スタンド','青い事務椅子','壁掛け時計'],false],
      ['学生舎の長い廊下で短靴を磨く（白い壁に窓が続く、グレーの石目調の床の直線廊下）','floor','グレーの石目調の床',['靴磨きセット','新聞紙の上に並べた短靴','壁のフックと掲示物','廊下のデジタル時計'],false]
    ],
    '警察官':[
      ['警察の独身寮の自室','floor','フローリング',['ハンガーに掛けた制服','小さなテレビ','湯のみとお茶'],true],
      ['交番の休憩スペース','chair','事務室の床',['書類とボールペン','支給のお茶'],false]
    ],
    '消防士':[
      ['消防署の仮眠室（青いパーティションで仕切られた個別のベッド区画）','bed','',['天井レールから吊られた薄緑のカーテン','白いシーツのパイプベッド','壁掛け時計','壁に掛けた活動服'],true],
      ['消防署の食堂・休憩室','chair','リノリウムの床',['大きなやかんと湯のみ','当番表'],false]
    ],
    '救急隊員':[
      ['消防署の仮眠室（青いパーティションで仕切られた個別のベッド区画）','bed','',['天井レールから吊られた薄緑のカーテン','白いシーツのパイプベッド','壁掛け時計','壁に掛けた活動服'],true]
    ]
  };

// index.html:3781
export const FOOT_SCENE_MIGRATION = {
    '駐屯地の営内居室（ベッドとスチールロッカーが整然と並ぶ部屋）':'駐屯地の営内居室（白いパイプの2段ベッドが整然と並ぶ明るい大部屋）',
    '営内のベッドに腰掛けて休む':'営内の2段ベッドの下段に腰掛けて休む',
    '防衛大学校の学生舎居室（ベッドとロッカーが並ぶ8人部屋）':'防衛大学校の学生舎居室（クリーム色の金属パイプ2段ベッドと縞柄マットレス、きっちり畳まれた寝具が並ぶ8人部屋）',
    '学生舎の自習室（壁沿いに机と本棚が並ぶパーティション区切りの部屋）':'学生舎の自習室（壁沿いに机と吊り棚が並び、白いパーティションで区切られた部屋）',
    '学生舎の廊下で短靴を磨く':'学生舎の長い廊下で短靴を磨く（白い壁に窓が続く、グレーの石目調の床の直線廊下）',
    '消防署の仮眠室':'消防署の仮眠室（青いパーティションで仕切られた個別のベッド区画）'
  };

// index.html:3789
export const FOOT_OCC_CAT_SCENES = {
    office:[['オフィスのリフレッシュスペース','chair','カーペット',['コーヒーカップ','観葉植物'],false]],
    it:[['オフィスの仮眠スペース','bed','',['ノートPC','ワイヤレスイヤホン'],true]],
    student:[['大学のサークル部室','floor','古いカーペット',['マンガ雑誌','部室のポット'],true]]
  };

// index.html:3800
export const FOOT_PROPS = { generic:['湯のみとお茶','読みかけの本','スマートフォン','クッション','脱いだ上着','そばで丸まる猫'], '新幹線の座席（靴を脱いでくつろぐ）':['駅弁とお茶','車窓を流れる景色','膝の上のバッグ'], 'こたつのある部屋':['みかんと湯のみ','こたつ布団'] };

// index.html:3850
export const POSTER_FOOT = {
    '僧侶':['寺内や和室の場面なら素足や足袋・雪駄が自然。屋外なら雪駄や作業用の履物を選ぶ','in a temple or tatami setting, bare feet or tabi/setta sandals are natural; outdoors, setta or work footwear'],
    '書道家':['和室で揮毫する構図なら素足または足袋が自然','bare feet or tabi are natural if he is writing in a tatami room'],
    '寿司職人':['カウンター内の板前姿なら白衣に雪駄や厨房履きが自然','setta sandals or kitchen footwear suit his whites behind the counter'],
    '漁師':['船上や浜の場面では長靴のほか、素足やサンダルが自然な場合もある','on a boat or beach, bare feet or sandals can be as natural as rubber boots'],
    '農家':['田畑では長靴が基本だが、田植えの場面なら素足も自然','rubber boots are standard in the fields, but bare feet are natural in a rice-planting scene'],
    '体育教師':['体育館の場面では室内シューズ、道場なら素足が自然','indoor shoes in a gym, or bare feet in a dojo setting'],
    'ジムトレーナー':['トレーニングシューズが基本だが、ストレッチエリアなら素足も可','training shoes as standard, bare feet acceptable in a stretch area']
  };

// index.html:3961
export const FOOT_WIDTHS = [
    ['E（やや細め）','すっきりした細めの足幅。甲は薄めで、足の輪郭が直線的','a slim foot width with a low instep and straight outline'],
    ['2E（標準）','標準的な足幅。甲の厚みも平均的で自然なバランス','a standard foot width with average instep thickness'],
    ['3E（幅広）','幅広の足。母趾球・小趾球の張りがはっきりし、甲にしっかりした厚み','a wide foot with pronounced ball of the foot and a thick instep'],
    ['4E（幅広・甲高）','かなり幅広で甲高。足全体にどっしりした量感があり、指の付け根が横に広がる','a very wide, high-instep foot with a solid, weighty volume']
  ];

// index.html:3985
export const FOOT_FEATURES = [
    ['特徴なし・整った足', 10, 0, ''],
    ['軽度の外反母趾', 2, 35, '親指の付け根がわずかに内側へ張り出しているが、痛々しくならない自然な範囲'],
    ['軽度の内反小趾', 1.5, 30, '小指が内側へ軽く傾いている'],
    ['扁平足気味', 2, 0, '土踏まずが浅い'],
    ['ハイアーチ気味', 1.5, 0, '土踏まずが高く甲が立っている'],
    ['浮き指気味', 1, 0, '立ったとき指先が床から軽く浮きやすい'],
    ['足指の間が開きやすい', 1, 0, '指離れのよい健康的な足'],
    ['かかとが小さめ', 1, 0, 'かかとの丸みがコンパクト'],
    ['くるぶしがくっきりした足', 1.5, 0, 'くるぶしの骨格が立体的に浮き出ている'],
    ['指の関節がしっかりした節のある足', 1.5, 0, '指の関節の骨感がはっきりした男性的な足'],
    ['長時間の立ち仕事の跡', 1.5, 0, '母趾球にうっすらした硬さがある、立ち仕事らしい生活感のある足'],
    ['アキレス腱がくっきり浮き出た引き締まった足首', 1, 0, 'アキレス腱の輪郭がくっきり浮き出て、足首が引き締まっている'],
    ['足首が太くしっかりした跳躍系の足', 0.8, 0, '足首まわりが太く安定感があり、跳躍競技らしい力強さがある'],
    ['母趾球が発達して張り出した足', 0.8, 0, '母趾球が発達して内側にしっかり張り出している'],
    ['指が長くしなやかな足', 1, 0, '足指が長くしなやかに伸びている'],
    ['すねから続く腱の筋が浮いた競技者の足首', 0.8, 0, 'すねから足首にかけて腱の筋がうっすら浮いた競技者らしい足'],
    ['引き締まった細めの足首（ブーツ生活の足）', 0.5, 0, 'ブーツや半長靴での生活を思わせる、引き締まった細めの足首'],
    ['前足部が扇形にしっかり広がった足', 0.8, 0, '指の付け根から前足部が扇形にしっかり広がっている'],
    ['第2趾が特に長い足', 1.2, 0, '第2趾（人差し指）が親指より目立って長い'],
    ['指の長さがほぼ揃った端正な前足部', 1.2, 0, '足指の長さがほぼ揃った端正な前足部'],
    ['かかとが大きくしっかりした足', 1, 0, 'かかとが大きくどっしりと安定している'],
    ['甲が丸く盛り上がった肉厚の甲', 1, 0, '甲が丸く盛り上がり、肉厚で量感がある'],
    ['甲が薄く腱のラインがうっすら見える足', 1, 0, '甲が薄く、伸ばした指の腱のラインがうっすら見える'],
    ['小指が小さく丸い足', 1, 0, '小指が小さく丸みを帯びている'],
    ['親指がまっすぐで力強い足', 1.2, 0, '親指がまっすぐ伸びて力強い印象がある']
  ];

// index.html:4012
export const SOLE_TYPES = [
    ['すっきり細長型', 4, '輪郭が直線的で細長く、かかとは小さめ。足裏はなめらかでしわが少ない', 'a slim, elongated sole with a straight outline, small heel, and smooth skin'],
    ['幅広肉厚型', 3, '全体に幅広で肉厚。かかとが大きく丸く、足裏に柔らかな量感がある', 'a wide, thick sole with a large round heel and soft volume'],
    ['内側カーブ型', 2.5, '内側の土踏まず側のくびれが強く、母趾球の張り出しがはっきりした輪郭', 'a sole with a strong inner-arch curve and a pronounced ball of the foot'],
    ['親指主導型', 2.5, '親指が大きく存在感があり、土踏まずの陰影が深い', 'a sole led by a large, prominent big toe with a deeply shaded arch'],
    ['しわ深型', 2, '足裏全体に細かいしわが多く寄り、幅広でスクエアな輪郭', 'a wide, squarish sole covered in fine creases'],
    ['均整なめらか型', 4, '輪郭・パッド・かかとのバランスが取れた、なめらかで標準的な足裏', 'a smooth, well-balanced standard sole'],
    ['パッド発達型', 2.5, '母趾球・小趾球のパッドが発達して盛り上がり、土踏まずに筋張ったアーチ線が走る', 'developed pads at the ball and outer edge, with taut arch lines across the instep'],
    ['ハイアーチ型', 2, '土踏まずが深く、前足部パッドとかかとの接地面がはっきり分かれ、中央がくびれる', 'a high-arched sole where forefoot pad and heel are clearly separated by a deep waist'],
    ['細身指長型', 2.5, '細身で指が長く、かかとも細め。しわは浅く上品な印象', 'a slender sole with long toes, a narrow heel, and shallow refined creasing'],
    ['コンパクト丸型', 2.5, '全体に丸みがあり、ふっくらしたパッドと丸いかかとのコンパクトな足裏', 'a compact, rounded sole with plump pads and a round heel'],
    ['指間開き型', 2, '足指の間に隙間があり指離れがよく、甲側から続く腱の線がうっすら見える', 'a sole with naturally spread toes and faint tendon lines continuing from the instep'],
    ['武骨大判型', 2, '大きくどっしりした足裏で、後半部にしわが多く、働く足らしい武骨な質感', 'a large, sturdy sole with heavy creasing toward the heel — a hardworking foot']
  ];

// index.html:4026
export const SOLE_WRINKLES = [
    ['しわ少なめ', 'しわは少なく、なめらかな質感', 'few creases; smooth texture'],
    ['標準的なしわ', '土踏まずと指の付け根に自然な浅いしわ', 'natural shallow creases at the arch and toe bases'],
    ['しわ多め', '土踏まずと指の付け根に細かいしわがはっきり寄る', 'fine creases gather clearly at the arch and toe bases']
  ];

// index.html:4031
export const TOE_LINES = [
    ['まっすぐ前を向いたそろった並び', 5, '各指がまっすぐ前を向き、自然に整列している', 'toes point straight ahead in a natural, even row'],
    ['指先が密着した並び', 3, '指同士がぴったり寄り添い、すき間なく並ぶ', 'toes rest snugly together with no gaps'],
    ['親指側へゆるやかに流れる並び', 2.5, '第2〜5趾が親指方向へゆるやかに傾く', 'the lesser toes lean gently toward the big toe'],
    ['小指側へ開き気味の並び', 2, '指全体が外側へ広がるように傾く', 'the toes lean slightly outward toward the little-toe side'],
    ['扇状に均等に開いた並び', 2.5, '指が扇のように均等な角度で開く', 'the toes spread evenly like a fan'],
    ['親指と第2趾の間にすき間がある並び', 2, '親指だけ少し独立し、間にはっきりしたすき間がある', 'a clear gap sits between the big toe and second toe'],
    ['全指の間に軽いすき間のある離れのよい並び', 2, 'どの指の間にも空気の通るすき間がある', 'light, airy gaps between every toe'],
    ['小指が内側へ丸まり気味の並び', 2, '小指が軽く内へ丸まり、爪が外を向く', 'the little toe curls slightly inward with its nail facing outward'],
    ['第2趾が少し前へ出て目立つ並び', 2, '第2趾が一歩前に出て存在感がある', 'the second toe steps slightly forward and stands out'],
    ['指の付け根ラインが強くカーブした並び', 1.5, '指の付け根の並びが弧を描き、指先の高さに段差がつく', 'the toe-base line curves strongly, stepping the toe tips at different heights']
  ];

// index.html:4043
export const TOE_CURLS = [
    ['指先がわずかに上へ反った自然な状態', 4, 'toe tips lifted in a slight natural upward curl'],
    ['指がフラットに伸びた状態', 4, 'toes extended flat and relaxed'],
    ['指を軽く曲げたリラックスした状態', 3, 'toes loosely bent in a relaxed way']
  ];
