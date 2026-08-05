// Shared mutable app state. The classic-script version used top-level `let`s;
// ES modules cannot assign to imported bindings, so state lives on ST.
export const ST = {
  current: null,
  locks: {},
  mode: 'full',
  spinning: false,
  uiLang: 'ja',
  FRIEND_CTX: null,
  innerCatShow: {basic:false, life:false, daily:false, mind:false, past:false, adult:false},
  currentGroup: null,
  activeMember: 0,
  derivedType: null,
  promptTab: 'main',
};

// DOM element cache (module evaluation is deferred; the DOM is ready here)
export const els = {
    slotGrid: document.getElementById('slotGrid'), status: document.getElementById('statusPill'), rarity: document.getElementById('rarity'), rareScore: document.getElementById('rareScore'), rarityNote: document.getElementById('rarityNote'), profileView: document.getElementById('profileView'), promptBox: document.getElementById('promptBox'), historyList: document.getElementById('historyList'), fixedForm: document.getElementById('fixedForm')
  };
