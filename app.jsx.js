
// --- Icon shims: emoji-based stand-ins for lucide-react icons (no bundler needed) ---
function makeIcon(char) {
  return function Icon({ size = 16, color, className, onClick, style }) {
    return React.createElement(
      'span',
      { onClick, className, style: { fontSize: size, color, lineHeight: 1, display: 'inline-block', ...style } },
      char
    );
  };
}
const Flame = makeIcon('\u{1F525}');
const Sword = makeIcon('\u2694\uFE0F');
const Shield = makeIcon('\u{1F6E1}\uFE0F');
const Sparkles = makeIcon('\u2728');
const Home = makeIcon('\u{1F3E0}');
const Car = makeIcon('\u{1F697}');
const Wallet = makeIcon('\u{1F4B0}');
const Compass = makeIcon('\u{1F9ED}');
const CheckCircle2 = makeIcon('\u2705');
const Circle = makeIcon('\u2B55');
const Plus = makeIcon('\u2795');
const Trophy = makeIcon('\u{1F3C6}');
const Skull = makeIcon('\u{1F480}');
const X = makeIcon('\u2715');
const Tv = makeIcon('\u{1F4FA}');
const Bed = makeIcon('\u{1F6CF}\uFE0F');
const Brush = makeIcon('\u{1F58C}\uFE0F');
const Wrench = makeIcon('\u{1F527}');
const PackageOpen = makeIcon('\u{1F4E6}');
const TrendingUp = makeIcon('\u{1F4C8}');

// --- localStorage-backed polyfill matching the window.storage API used by the app ---
window.storage = {
  async get(key, shared) {
    const raw = localStorage.getItem(key);
    if (raw === null) throw new Error('key not found');
    return { key, value: raw, shared: !!shared };
  },
  async set(key, value, shared) {
    localStorage.setItem(key, value);
    return { key, value, shared: !!shared };
  },
  async delete(key, shared) {
    localStorage.removeItem(key);
    return { key, deleted: true, shared: !!shared };
  },
  async list(prefix, shared) {
    const keys = Object.keys(localStorage).filter((k) => !prefix || k.startsWith(prefix));
    return { keys, prefix, shared: !!shared };
  },
};

const { useState, useEffect, useCallback } = React;

const STORAGE_KEY = "rigueur-rpg-state-v1";

const ICONS = {
  home: Home, car: Car, wallet: Wallet, compass: Compass,
  tv: Tv, bed: Bed, brush: Brush, wrench: Wrench, package: PackageOpen,
};

const EPIC_COLORS = ["#D9A544", "#5B8C7B", "#B34A3C", "#8C6E5B", "#6E8CAE", "#A566A0"];

const defaultState = () => ({
  xp: 0,
  level: 1,
  streak: 0,
  lastDailyDate: null,
  dailyAllDoneYesterday: false,
  lastWeekReset: null,
  routine: [
    { id: "r1", label: "Nettoyer le frigo", xp: 12, done: false, icon: "brush" },
    { id: "r2", label: "Changer les draps", xp: 10, done: false, icon: "bed" },
    { id: "r3", label: "Planifier la semaine suivante", xp: 15, done: false, icon: "compass" },
    { id: "r4", label: "Appeler mes parents", xp: 10, done: false, icon: "package" },
    { id: "r5", label: "Faire une lessive", xp: 8, done: false, icon: "package" },
    { id: "r6", label: "Sortir le tri sélectif / poubelles", xp: 6, done: false, icon: "package" },
  ],
  weeklyGoal: 2,
  epics: [
    {
      id: "chantier",
      title: "Le Chantier Intérieur",
      subtitle: "Travaux, rangement, décoration",
      icon: "home",
      color: "#D9A544",
      subtasks: [
        { id: "c1", label: "Trier et évacuer les restes de travaux", xp: 40, done: false },
        { id: "c2", label: "Terminer les travaux en cours", xp: 60, done: false },
        { id: "c3", label: "Ranger complètement l'appartement", xp: 50, done: false },
        { id: "c4", label: "Choisir une direction déco", xp: 20, done: false },
        { id: "c5", label: "Installer la première touche déco", xp: 30, done: false },
      ],
    },
    {
      id: "stcyr",
      title: "Cap sur Saint-Cyr",
      subtitle: "Déménagement + mise en Airbnb",
      icon: "compass",
      color: "#5B8C7B",
      subtasks: [
        { id: "s1", label: "Étudier le budget travaux Airbnb", xp: 30, done: false },
        { id: "s2", label: "Chercher / visiter à Saint-Cyr", xp: 40, done: false },
        { id: "s3", label: "Préparer l'appart actuel pour la location", xp: 50, done: false },
        { id: "s4", label: "Créer l'annonce Airbnb", xp: 40, done: false },
        { id: "s5", label: "Déménager", xp: 60, done: false },
      ],
    },
    {
      id: "voiture",
      title: "Révision Mécanique",
      subtitle: "Réparer la voiture",
      icon: "car",
      color: "#B34A3C",
      subtasks: [
        { id: "v1", label: "Diagnostiquer le problème", xp: 20, done: false },
        { id: "v2", label: "Devis / rendez-vous garage", xp: 20, done: false },
        { id: "v3", label: "Réparation effectuée", xp: 40, done: false },
      ],
    },
  ],
  monthlyBoss: {
    title: "Le Coffre de Guerre",
    subtitle: "Économies du mois — se relance chaque mois",
    icon: "wallet",
    color: "#8C6E5B",
    lastMonth: null,
    subtasks: [
      { id: "m1", label: "Faire le virement d'épargne du mois", xp: 25, done: false },
      { id: "m2", label: "Repérer une dépense à réduire", xp: 10, done: false },
      { id: "m3", label: "Vérifier le solde en fin de mois", xp: 10, done: false },
    ],
  },
  weeklies: [],
  sideQuests: [
    { id: "sq1", label: "Nettoyer la chambre", xp: 15, done: false, icon: "brush" },
    { id: "sq2", label: "Changer les draps", xp: 10, done: false, icon: "bed" },
    { id: "sq3", label: "Acheter une télé", xp: 15, done: false, icon: "tv" },
    { id: "sq4", label: "Trouver un meilleur étendoir", xp: 10, done: false, icon: "package" },
    { id: "sq5", label: "Compléter les ustensiles de cuisine", xp: 10, done: false, icon: "package" },
  ],
  dailies: [
    { id: "d1", label: "10 min de rangement après le sport", xp: 8, done: false },
    { id: "d2", label: "Zéro vaisselle qui traîne ce soir", xp: 8, done: false },
    { id: "d3", label: "Un carton / une pile de travaux en moins", xp: 10, done: false },
  ],
  customCounter: 0,
});

function xpForLevel(level) {
  return level * 100;
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function monthStr() {
  return new Date().toISOString().slice(0, 7);
}

function normalizeAndRoll(loaded) {
  const fresh = defaultState();
  if (!Array.isArray(loaded.dailies)) loaded.dailies = fresh.dailies;
  if (!Array.isArray(loaded.routine)) loaded.routine = fresh.routine;
  if (!Array.isArray(loaded.weeklies)) loaded.weeklies = [];
  if (!Array.isArray(loaded.sideQuests)) loaded.sideQuests = fresh.sideQuests;
  if (!Array.isArray(loaded.epics)) {
    loaded.epics = fresh.epics;
  } else {
    loaded.epics = loaded.epics.map((e) => ({
      ...e,
      subtasks: Array.isArray(e.subtasks) ? e.subtasks : [],
    }));
  }
  if (!loaded.monthlyBoss || !Array.isArray(loaded.monthlyBoss.subtasks)) {
    loaded.monthlyBoss = fresh.monthlyBoss;
  }
  if (typeof loaded.xp !== "number") loaded.xp = 0;
  if (typeof loaded.level !== "number") loaded.level = 1;
  if (typeof loaded.streak !== "number") loaded.streak = 0;

  // daily rollover: compares the date being loaded/restored against "today"
  const today = todayStr();
  if (loaded.lastDailyDate !== today) {
    const allDoneBefore = loaded.dailies.length > 0 && loaded.dailies.every((d) => d.done);
    if (loaded.lastDailyDate === null) {
      // first ever run, no streak change
    } else if (allDoneBefore) {
      loaded.streak = (loaded.streak || 0) + 1;
    } else {
      loaded.streak = 0;
    }
    loaded.dailies = loaded.dailies.map((d) => ({ ...d, done: false }));
    loaded.lastDailyDate = today;
  }
  // monthly rollover
  const month = monthStr();
  if (loaded.monthlyBoss.lastMonth !== month) {
    loaded.monthlyBoss = {
      ...loaded.monthlyBoss,
      lastMonth: month,
      subtasks: loaded.monthlyBoss.subtasks.map((s) => ({ ...s, done: false })),
    };
  }
  return loaded;
}

function RigueurRPG() {
  const [state, setState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [storageOk, setStorageOk] = useState(true);
  const [saveInfo, setSaveInfo] = useState("");
  const [newQuest, setNewQuest] = useState("");
  const [newEngagement, setNewEngagement] = useState("");
  const [newEngagementStake, setNewEngagementStake] = useState(20);
  const [subDrafts, setSubDrafts] = useState({});
  const [monthlyDraft, setMonthlyDraft] = useState("");
  const [toast, setToast] = useState(null);

  const save = useCallback(async (next) => {
    if (typeof window === "undefined" || !window.storage) {
      setStorageOk(false);
      setSaveInfo("window.storage indisponible sur cette plateforme");
      return;
    }
    try {
      const result = await window.storage.set(STORAGE_KEY, JSON.stringify(next), false);
      if (!result) {
        setStorageOk(false);
        setSaveInfo("set() a retourné vide");
      } else {
        setStorageOk(true);
        setSaveInfo(`Sauvegardé ${new Date().toLocaleTimeString("fr-FR")}`);
      }
    } catch (e) {
      setStorageOk(false);
      setSaveInfo(`Erreur: ${e && e.message ? e.message : String(e)}`);
      console.error("save failed", e);
    }
  }, []);

  useEffect(() => {
    (async () => {
      let loaded = defaultState();
      if (typeof window === "undefined" || !window.storage) {
        setStorageOk(false);
        setSaveInfo("window.storage indisponible sur cette plateforme");
      } else {
        try {
          const res = await window.storage.get(STORAGE_KEY, false);
          if (res && res.value) {
            loaded = { ...defaultState(), ...JSON.parse(res.value) };
            setSaveInfo(`Chargé depuis la sauvegarde (${new Date().toLocaleTimeString("fr-FR")})`);
          } else {
            setSaveInfo("Aucune sauvegarde trouvée — premier lancement");
          }
        } catch (e) {
          setSaveInfo(`Pas de sauvegarde existante ou erreur lecture: ${e && e.message ? e.message : String(e)}`);
        }
      }
      // apply the same date-rollover logic every time state is loaded
      loaded = normalizeAndRoll(loaded);
      setState(loaded);
      setLoading(false);
      save(loaded);
    })();
  }, [save]);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 1800);
  };

  const gainXP = (amount, next) => {
    let xp = next.xp + amount;
    let level = next.level;
    while (xp >= xpForLevel(level)) {
      xp -= xpForLevel(level);
      level += 1;
      showToast(`Niveau ${level} atteint !`);
    }
    next.xp = xp;
    next.level = level;
  };

  const loseXP = (amount, next) => {
    let xp = next.xp - amount;
    let level = next.level;
    while (xp < 0 && level > 1) {
      level -= 1;
      xp += xpForLevel(level);
    }
    next.xp = Math.max(0, xp);
    next.level = level;
  };

  const update = (mutator) => {
    setState((prev) => {
      const next = JSON.parse(JSON.stringify(prev));
      mutator(next);
      save(next);
      return next;
    });
  };

  const toggleSubtask = (epicId, subId) => {
    update((next) => {
      const epic = next.epics.find((e) => e.id === epicId);
      const sub = epic.subtasks.find((s) => s.id === subId);
      sub.done = !sub.done;
      if (sub.done) {
        gainXP(sub.xp, next);
        showToast(`+${sub.xp} XP`);
      } else {
        next.xp = Math.max(0, next.xp - sub.xp);
      }
    });
  };

  const toggleWeekly = (id) => {
    update((next) => {
      const w = next.weeklies.find((x) => x.id === id);
      w.done = !w.done;
      if (w.done) {
        gainXP(w.xp, next);
        showToast(`+${w.xp} XP`);
      } else {
        next.xp = Math.max(0, next.xp - w.xp);
      }
    });
  };

  const toggleSide = (id) => {
    update((next) => {
      const q = next.sideQuests.find((s) => s.id === id);
      q.done = !q.done;
      if (q.done) {
        gainXP(q.xp, next);
        showToast(`+${q.xp} XP`);
      } else {
        next.xp = Math.max(0, next.xp - q.xp);
      }
    });
  };

  const toggleDaily = (id) => {
    update((next) => {
      const d = next.dailies.find((x) => x.id === id);
      d.done = !d.done;
      if (d.done) {
        gainXP(d.xp, next);
        showToast(`+${d.xp} XP`);
      } else {
        next.xp = Math.max(0, next.xp - d.xp);
      }
    });
  };

  const toggleMonthlySub = (subId) => {
    update((next) => {
      const sub = next.monthlyBoss.subtasks.find((s) => s.id === subId);
      sub.done = !sub.done;
      if (sub.done) {
        gainXP(sub.xp, next);
        showToast(`+${sub.xp} XP`);
      } else {
        next.xp = Math.max(0, next.xp - sub.xp);
      }
    });
  };

  const addMonthlySub = (epicLikeId, label, xp) => {
    update((next) => {
      next.monthlyBoss.subtasks.push({ id: `m-${Date.now()}`, label, xp, done: false });
    });
  };

  const removeMonthlySub = (subId) => {
    update((next) => {
      next.monthlyBoss.subtasks = next.monthlyBoss.subtasks.filter((s) => s.id !== subId);
    });
  };

  const addEpicSubtask = (epicId, label, xp) => {
    update((next) => {
      const epic = next.epics.find((e) => e.id === epicId);
      epic.subtasks.push({ id: `sub-${Date.now()}`, label, xp, done: false });
    });
  };

  const removeEpicSubtask = (epicId, subId) => {
    update((next) => {
      const epic = next.epics.find((e) => e.id === epicId);
      epic.subtasks = epic.subtasks.filter((s) => s.id !== subId);
    });
  };

  const [newEpicTitle, setNewEpicTitle] = useState("");

  const addNewEpic = () => {
    if (!newEpicTitle.trim()) return;
    update((next) => {
      const color = EPIC_COLORS[next.epics.length % EPIC_COLORS.length];
      next.epics.push({
        id: `epic-${Date.now()}`,
        title: newEpicTitle.trim(),
        subtitle: "Nouveau combat",
        icon: "home",
        color,
        subtasks: [],
      });
    });
    setNewEpicTitle("");
  };

  const toggleRoutine = (id) => {
    update((next) => {
      const r = next.routine.find((x) => x.id === id);
      r.done = !r.done;
      if (r.done) {
        gainXP(r.xp, next);
        showToast(`+${r.xp} XP`);
      } else {
        next.xp = Math.max(0, next.xp - r.xp);
      }
    });
  };

  const [newRoutine, setNewRoutine] = useState("");

  const addRoutineItem = () => {
    if (!newRoutine.trim()) return;
    update((next) => {
      next.routine.push({ id: `rt-${Date.now()}`, label: newRoutine.trim(), xp: 10, done: false, icon: "package" });
    });
    setNewRoutine("");
  };

  const removeRoutineItem = (id) => {
    update((next) => {
      next.routine = next.routine.filter((r) => r.id !== id);
    });
  };

  const addCustomQuest = () => {
    if (!newQuest.trim()) return;
    update((next) => {
      next.customCounter += 1;
      next.sideQuests.push({
        id: `custom-${Date.now()}`,
        label: newQuest.trim(),
        xp: 15,
        done: false,
        icon: "package",
      });
    });
    setNewQuest("");
  };

  const removeSide = (id) => {
    update((next) => {
      next.sideQuests = next.sideQuests.filter((s) => s.id !== id);
    });
  };

  const resetWeek = () => {
    let msg = "Nouvelle semaine — définis tes engagements";
    update((next) => {
      next.lastWeekReset = todayStr();
      const missed = next.weeklies.filter((w) => !w.done);
      const kept = next.weeklies.filter((w) => w.done);
      if (next.weeklies.length === 0) {
        msg = "Nouvelle semaine — définis tes engagements";
      } else if (missed.length === 0) {
        gainXP(20, next);
        msg = `Engagement 100% tenu (${kept.length}/${next.weeklies.length}) : +20 XP bonus`;
      } else {
        const penalty = missed.reduce((a, w) => a + w.xp, 0);
        loseXP(penalty, next);
        msg = `${missed.length} engagement(s) non tenu(s) : -${penalty} XP`;
      }
      next.weeklies = [];
      const routineAllDone = next.routine.length > 0 && next.routine.every((r) => r.done);
      if (routineAllDone) {
        gainXP(10, next);
      }
      next.routine = next.routine.map((r) => ({ ...r, done: false }));
    });
    showToast(msg);
  };

  const addEngagement = () => {
    if (!newEngagement.trim()) return;
    update((next) => {
      next.weeklies.push({
        id: `eng-${Date.now()}`,
        label: newEngagement.trim(),
        xp: newEngagementStake,
        done: false,
        icon: "compass",
      });
    });
    setNewEngagement("");
  };

  const removeEngagement = (id) => {
    update((next) => {
      next.weeklies = next.weeklies.filter((w) => w.id !== id);
    });
  };

  const [showBackup, setShowBackup] = useState(false);
  const [importText, setImportText] = useState("");
  const [importMsg, setImportMsg] = useState("");

  const copyBackup = async () => {
    const text = JSON.stringify(state);
    try {
      await navigator.clipboard.writeText(text);
      setImportMsg("Copié ! Colle-le dans une note pour le garder.");
    } catch (e) {
      setImportMsg("Impossible de copier automatiquement — sélectionne le texte ci-dessous à la main.");
    }
  };

  const restoreBackup = () => {
    try {
      const parsed = JSON.parse(importText.trim());
      const fresh = defaultState();
      let repaired = { ...fresh, ...parsed };
      repaired = normalizeAndRoll(repaired);
      setState(repaired);
      save(repaired);
      setImportMsg("Restauré avec succès (streak recalculé selon la date du jour).");
    } catch (e) {
      setImportMsg("Texte invalide — vérifie que tu as bien copié l'intégralité du bloc.");
    }
  };

  if (loading || !state) {
    return (
      <div style={{ padding: 40, textAlign: "center", color: "#8C9A94" }}>
        Chargement de la carte...
      </div>
    );
  }

  const xpNeeded = xpForLevel(state.level);
  const xpPct = Math.min(100, Math.round((state.xp / xpNeeded) * 100));
  const totalDailies = state.dailies.length;
  const doneDailies = state.dailies.filter((d) => d.done).length;

  return (
    <div className="rpg-root">
      <style>{`
        .rpg-root {
          --bg: #0F1A1F;
          --bg-panel: #16242A;
          --bg-panel-2: #1C2B32;
          --ink: #E8E2D0;
          --ink-dim: #93A29C;
          --amber: #D9A544;
          --moss: #5B8C7B;
          --rust: #B34A3C;
          font-family: 'Georgia', 'Iowan Old Style', serif;
          background: var(--bg);
          color: var(--ink);
          min-height: 100%;
          padding: 20px 16px 40px;
          background-image:
            repeating-linear-gradient(0deg, rgba(217,165,68,0.03) 0px, rgba(217,165,68,0.03) 1px, transparent 1px, transparent 28px),
            repeating-linear-gradient(90deg, rgba(217,165,68,0.03) 0px, rgba(217,165,68,0.03) 1px, transparent 1px, transparent 28px);
        }
        .mono { font-family: 'JetBrains Mono', 'Courier New', monospace; }
        .rpg-header {
          display: flex; align-items: center; justify-content: space-between;
          margin-bottom: 18px; flex-wrap: wrap; gap: 12px;
        }
        .rpg-title { font-size: 22px; letter-spacing: 0.3px; margin: 0; }
        .rpg-sub { color: var(--ink-dim); font-size: 13px; margin-top: 2px; }
        .level-badge {
          display: flex; align-items: center; gap: 10px;
          background: var(--bg-panel); border: 1px solid rgba(217,165,68,0.25);
          border-radius: 8px; padding: 8px 14px;
        }
        .level-num { font-size: 20px; font-weight: bold; color: var(--amber); }
        .xp-bar-wrap { width: 140px; }
        .xp-bar-bg { background: #0A1216; height: 8px; border-radius: 4px; overflow: hidden; border: 1px solid rgba(217,165,68,0.2); }
        .xp-bar-fill { background: linear-gradient(90deg, var(--moss), var(--amber)); height: 100%; transition: width 0.4s ease; }
        .xp-label { font-size: 10px; color: var(--ink-dim); margin-top: 3px; }
        .streak-badge {
          display: flex; align-items: center; gap: 6px;
          background: rgba(179,74,60,0.12); border: 1px solid rgba(179,74,60,0.3);
          border-radius: 8px; padding: 8px 12px; color: #E8A695; font-size: 13px;
        }
        .section-title {
          font-size: 13px; text-transform: uppercase; letter-spacing: 1.5px;
          color: var(--ink-dim); margin: 26px 0 10px; display: flex; align-items: center; gap: 8px;
        }
        .card {
          background: var(--bg-panel); border: 1px solid rgba(217,165,68,0.12);
          border-radius: 10px; padding: 14px 16px; margin-bottom: 10px;
        }
        .epic-head { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
        .epic-title { font-size: 16px; margin: 0; }
        .epic-sub { font-size: 12px; color: var(--ink-dim); }
        .hp-bar-bg { background: #0A1216; height: 10px; border-radius: 5px; overflow: hidden; margin: 8px 0 12px; }
        .hp-bar-fill { height: 100%; transition: width 0.4s ease; }
        .subtask-row {
          display: flex; align-items: center; gap: 10px; padding: 6px 0;
          cursor: pointer; font-size: 14px;
        }
        .subtask-row.done { color: var(--ink-dim); text-decoration: line-through; }
        .quest-row {
          display: flex; align-items: center; gap: 10px; padding: 9px 0;
          border-bottom: 1px solid rgba(255,255,255,0.05); cursor: pointer;
        }
        .quest-row:last-child { border-bottom: none; }
        .quest-label { flex: 1; font-size: 14px; }
        .quest-row.done .quest-label { color: var(--ink-dim); text-decoration: line-through; }
        .xp-chip {
          font-size: 11px; color: var(--amber); border: 1px solid rgba(217,165,68,0.3);
          border-radius: 20px; padding: 2px 8px;
        }
        .remove-btn { color: var(--ink-dim); opacity: 0.5; cursor: pointer; }
        .remove-btn:hover { opacity: 1; color: var(--rust); }
        .add-row { display: flex; gap: 8px; margin-top: 10px; }
        .add-input {
          flex: 1; background: var(--bg-panel-2); border: 1px solid rgba(217,165,68,0.2);
          border-radius: 6px; padding: 8px 10px; color: var(--ink); font-size: 13px; font-family: inherit;
        }
        .add-btn {
          background: var(--amber); color: #16242A; border: none; border-radius: 6px;
          padding: 0 14px; font-weight: bold; cursor: pointer;
        }
        .week-reset-btn {
          background: transparent; border: 1px solid rgba(217,165,68,0.3); color: var(--ink-dim);
          border-radius: 6px; padding: 6px 12px; font-size: 12px; cursor: pointer; font-family: inherit;
        }
        .week-reset-btn:hover { color: var(--amber); border-color: var(--amber); }
        .commit-help {
          font-size: 12px; color: var(--ink-dim); margin-bottom: 10px; line-height: 1.5;
        }
        .commit-empty {
          font-size: 13px; color: var(--ink-dim); font-style: italic; padding: 6px 0 10px;
        }
        .stake-select {
          background: var(--bg-panel-2); border: 1px solid rgba(217,165,68,0.2);
          border-radius: 6px; color: var(--ink); font-size: 12px; padding: 0 8px;
        }
        .toast {
          position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%);
          background: var(--amber); color: #16242A; padding: 8px 18px; border-radius: 20px;
          font-size: 13px; font-weight: bold; box-shadow: 0 4px 20px rgba(0,0,0,0.4);
          z-index: 50;
        }
      `}</style>

      <div className="rpg-header">
        <div>
          <h1 className="rpg-title">📜 Carnet de Quêtes — Gauthier</h1>
          <div className="rpg-sub">Discipline domestique &amp; projets · édition expédition</div>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <div className="level-badge">
            <div>
              <div className="level-num mono">Niv. {state.level}</div>
              <div className="xp-bar-wrap">
                <div className="xp-bar-bg">
                  <div className="xp-bar-fill" style={{ width: `${xpPct}%` }} />
                </div>
                <div className="xp-label mono">{state.xp} / {xpNeeded} XP</div>
              </div>
            </div>
          </div>
          <div className="streak-badge">
            <Flame size={16} />
            <span className="mono">{state.streak} j de suite</span>
          </div>
        </div>
      </div>

      <div className="section-title"><Sword size={14} /> Quêtes quotidiennes ({doneDailies}/{totalDailies})</div>
      <div className="card">
        {state.dailies.map((d) => (
          <div key={d.id} className={`quest-row ${d.done ? "done" : ""}`} onClick={() => toggleDaily(d.id)}>
            {d.done ? <CheckCircle2 size={18} color="#5B8C7B" /> : <Circle size={18} color="#93A29C" />}
            <span className="quest-label">{d.label}</span>
            <span className="xp-chip mono">+{d.xp}</span>
          </div>
        ))}
      </div>

      <div className="section-title"><Skull size={14} /> Combats de boss</div>
      {state.epics.map((epic) => {
        const Icon = ICONS[epic.icon] || Home;
        const total = epic.subtasks.reduce((a, s) => a + s.xp, 0);
        const done = epic.subtasks.filter((s) => s.done).reduce((a, s) => a + s.xp, 0);
        const pct = total ? Math.round((done / total) * 100) : 0;
        const defeated = total > 0 && pct === 100;
        const draft = subDrafts[epic.id] || { label: "", xp: 20 };
        return (
          <div className="card" key={epic.id}>
            <div className="epic-head">
              <Icon size={20} color={epic.color} />
              <div>
                <p className="epic-title" style={{ color: defeated ? "var(--ink-dim)" : "var(--ink)" }}>
                  {epic.title} {defeated && "· vaincu 🏆"}
                </p>
                <div className="epic-sub">{epic.subtitle}</div>
              </div>
            </div>
            {total > 0 && (
              <div className="hp-bar-bg">
                <div className="hp-bar-fill" style={{ width: `${100 - pct}%`, background: epic.color }} />
              </div>
            )}
            {epic.subtasks.length === 0 && (
              <div className="commit-empty">Pas encore d'objectif — ajoute le premier ci-dessous.</div>
            )}
            {epic.subtasks.map((s) => (
              <div key={s.id} className={`subtask-row ${s.done ? "done" : ""}`}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1 }} onClick={() => toggleSubtask(epic.id, s.id)}>
                  {s.done ? <CheckCircle2 size={16} color="#5B8C7B" /> : <Circle size={16} color="#93A29C" />}
                  <span style={{ flex: 1 }}>{s.label}</span>
                </div>
                <span className="xp-chip mono">+{s.xp}</span>
                <X size={13} className="remove-btn" onClick={() => removeEpicSubtask(epic.id, s.id)} />
              </div>
            ))}
            <div className="add-row">
              <input
                className="add-input"
                placeholder="Ajouter un objectif à ce boss..."
                value={draft.label}
                onChange={(e) => setSubDrafts({ ...subDrafts, [epic.id]: { ...draft, label: e.target.value } })}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && draft.label.trim()) {
                    addEpicSubtask(epic.id, draft.label.trim(), draft.xp);
                    setSubDrafts({ ...subDrafts, [epic.id]: { label: "", xp: 20 } });
                  }
                }}
              />
              <select
                className="stake-select mono"
                value={draft.xp}
                onChange={(e) => setSubDrafts({ ...subDrafts, [epic.id]: { ...draft, xp: Number(e.target.value) } })}
              >
                <option value={10}>10 xp</option>
                <option value={20}>20 xp</option>
                <option value={35}>35 xp</option>
                <option value={50}>50 xp</option>
              </select>
              <button
                className="add-btn"
                onClick={() => {
                  if (draft.label.trim()) {
                    addEpicSubtask(epic.id, draft.label.trim(), draft.xp);
                    setSubDrafts({ ...subDrafts, [epic.id]: { label: "", xp: 20 } });
                  }
                }}
              >
                <Plus size={16} />
              </button>
            </div>
          </div>
        );
      })}
      <div className="add-row" style={{ marginBottom: 18 }}>
        <input
          className="add-input"
          placeholder="Nom d'un nouveau combat de boss..."
          value={newEpicTitle}
          onChange={(e) => setNewEpicTitle(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addNewEpic()}
        />
        <button className="add-btn" onClick={addNewEpic}><Plus size={16} /></button>
      </div>

      <div className="card">
        <div className="epic-head">
          <Wallet size={20} color={state.monthlyBoss.color} />
          <div>
            <p className="epic-title">{state.monthlyBoss.title}</p>
            <div className="epic-sub">{state.monthlyBoss.subtitle}</div>
          </div>
        </div>
        {state.monthlyBoss.subtasks.map((s) => (
          <div key={s.id} className={`subtask-row ${s.done ? "done" : ""}`}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1 }} onClick={() => toggleMonthlySub(s.id)}>
              {s.done ? <CheckCircle2 size={16} color="#5B8C7B" /> : <Circle size={16} color="#93A29C" />}
              <span style={{ flex: 1 }}>{s.label}</span>
            </div>
            <span className="xp-chip mono">+{s.xp}</span>
            <X size={13} className="remove-btn" onClick={() => removeMonthlySub(s.id)} />
          </div>
        ))}
        <div className="add-row">
          <input
            className="add-input"
            placeholder="Ajouter un petit objectif d'économie..."
            value={monthlyDraft}
            onChange={(e) => setMonthlyDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && monthlyDraft.trim()) {
                addMonthlySub(null, monthlyDraft.trim(), 15);
                setMonthlyDraft("");
              }
            }}
          />
          <button
            className="add-btn"
            onClick={() => {
              if (monthlyDraft.trim()) {
                addMonthlySub(null, monthlyDraft.trim(), 15);
                setMonthlyDraft("");
              }
            }}
          >
            <Plus size={16} />
          </button>
        </div>
      </div>

      <div className="section-title">
        <Brush size={14} /> Quêtes hebdomadaires
      </div>
      <div className="card">
        <div className="commit-help">
          Routine récurrente sans mise — se réinitialise avec "Clore la semaine" ci-dessous.
        </div>
        {state.routine.map((r) => {
          const Icon = ICONS[r.icon] || PackageOpen;
          return (
            <div key={r.id} className={`quest-row ${r.done ? "done" : ""}`}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, cursor: "pointer" }} onClick={() => toggleRoutine(r.id)}>
                {r.done ? <CheckCircle2 size={18} color="#5B8C7B" /> : <Circle size={18} color="#93A29C" />}
                <Icon size={14} color="#93A29C" />
                <span className="quest-label">{r.label}</span>
              </div>
              <span className="xp-chip mono">+{r.xp}</span>
              <X size={14} className="remove-btn" onClick={() => removeRoutineItem(r.id)} />
            </div>
          );
        })}
        <div className="add-row">
          <input
            className="add-input"
            placeholder="Ajouter une routine hebdo..."
            value={newRoutine}
            onChange={(e) => setNewRoutine(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addRoutineItem()}
          />
          <button className="add-btn" onClick={addRoutineItem}><Plus size={16} /></button>
        </div>
      </div>

      <div className="section-title">
        <Compass size={14} /> Engagement de la semaine
        <button className="week-reset-btn" style={{ marginLeft: "auto" }} onClick={resetWeek}>
          Clore la semaine
        </button>
      </div>
      <div className="card">
        <div className="commit-help">
          Défini au moment de ta planification (dimanche) : des objectifs plus gros que les dailies.
          Chaque engagement non tenu à la clôture te coûte sa mise en XP.
        </div>
        {state.weeklies.length === 0 && (
          <div className="commit-empty">Aucun engagement pour l'instant — ajoute ceux de cette semaine ci-dessous.</div>
        )}
        {state.weeklies.map((w) => (
          <div key={w.id} className={`quest-row ${w.done ? "done" : ""}`}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, cursor: "pointer" }} onClick={() => toggleWeekly(w.id)}>
              {w.done ? <CheckCircle2 size={18} color="#5B8C7B" /> : <Circle size={18} color="#93A29C" />}
              <span className="quest-label">{w.label}</span>
            </div>
            <span className="xp-chip mono">±{w.xp}</span>
            <X size={14} className="remove-btn" onClick={() => removeEngagement(w.id)} />
          </div>
        ))}
        <div className="add-row">
          <input
            className="add-input"
            placeholder="Ex: avancer 2 sous-tâches du chantier..."
            value={newEngagement}
            onChange={(e) => setNewEngagement(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addEngagement()}
          />
          <select
            className="stake-select mono"
            value={newEngagementStake}
            onChange={(e) => setNewEngagementStake(Number(e.target.value))}
          >
            <option value={10}>mise 10</option>
            <option value={20}>mise 20</option>
            <option value={35}>mise 35</option>
          </select>
          <button className="add-btn" onClick={addEngagement}><Plus size={16} /></button>
        </div>
      </div>

      <div className="section-title">
        <Trophy size={14} /> Quêtes secondaires
      </div>
      <div className="card">
        {state.sideQuests.map((q) => {
          const Icon = ICONS[q.icon] || PackageOpen;
          return (
            <div key={q.id} className={`quest-row ${q.done ? "done" : ""}`}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, cursor: "pointer" }} onClick={() => toggleSide(q.id)}>
                {q.done ? <CheckCircle2 size={18} color="#5B8C7B" /> : <Circle size={18} color="#93A29C" />}
                <Icon size={14} color="#93A29C" />
                <span className="quest-label">{q.label}</span>
              </div>
              <span className="xp-chip mono">+{q.xp}</span>
              <X size={14} className="remove-btn" onClick={() => removeSide(q.id)} />
            </div>
          );
        })}
        <div className="add-row">
          <input
            className="add-input"
            placeholder="Ajouter une quête..."
            value={newQuest}
            onChange={(e) => setNewQuest(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addCustomQuest()}
          />
          <button className="add-btn" onClick={addCustomQuest}><Plus size={16} /></button>
        </div>
      </div>

      <div className="section-title" onClick={() => setShowBackup(!showBackup)} style={{ cursor: "pointer" }}>
        <Shield size={14} /> Sauvegarde manuelle (secours) {showBackup ? "▲" : "▼"}
      </div>
      {showBackup && (
        <div className="card">
          <div className="commit-help">
            La sauvegarde automatique échoue actuellement sur cet appareil. Copie ton état avant de fermer,
            recolle-le au prochain lancement pour retrouver ta progression.
          </div>
          <button className="add-btn" style={{ marginBottom: 10 }} onClick={copyBackup}>Copier mon état actuel</button>
          <textarea
            readOnly
            className="add-input mono"
            style={{ width: "100%", height: 60, marginBottom: 10, resize: "vertical" }}
            value={JSON.stringify(state)}
            onFocus={(e) => e.target.select()}
          />
          <div className="commit-help">Pour restaurer, colle ton état sauvegardé ici :</div>
          <textarea
            className="add-input mono"
            style={{ width: "100%", height: 60, marginBottom: 10, resize: "vertical" }}
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
            placeholder="Colle ici le texte copié précédemment..."
          />
          <button className="add-btn" onClick={restoreBackup}>Restaurer</button>
          {importMsg && <div className="commit-help" style={{ marginTop: 8 }}>{importMsg}</div>}
        </div>
      )}

      {toast && <div className="toast">{toast}</div>}
      <div style={{ marginTop: 20, fontSize: 11, color: storageOk ? "var(--ink-dim)" : "#E8A695", textAlign: "center" }}>
        {saveInfo}
      </div>
    </div>
  );
}


ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(RigueurRPG));
