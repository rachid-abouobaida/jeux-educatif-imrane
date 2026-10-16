import { AppLanguage } from '../types';

export interface TranslationStrings {
  appName: string;
  appSubtitle: string;
  playButton: string;
  challengeButton: string;
  parentSettings: string;
  backHome: string;
  nextWord: string;
  repeatWord: string;
  listenWord: string;
  iAmListening: string;
  trySpeaking: string;
  validateManually: string;
  categories: {
    animals: string;
    food: string;
    objects: string;
    body: string;
    vehicles: string;
    actions: string;
  };
  welcomeMessage: string;
  presentationText: (word: string) => string;
  repeatInvitation: (word: string) => string;
  successMessages: string[];
  encouragementMessages: string[];
  challengePrompt: (word: string) => string;
  challengeSuccess: (word: string) => string;
  challengeRetry: (word: string) => string;
  starsCount: (count: number) => string;
  wordsDiscovered: (count: number) => string;
  sessionCompletedTitle: string;
  sessionCompletedDesc: (count: number) => string;
  replaySession: string;
  difficultyLevels: {
    easy: string;
    medium: string;
    hard: string;
  };
  micPermissionNotice: string;
  micUnavailableNotice: string;
  languageNames: Record<AppLanguage, string>;
}

export const translations: Record<AppLanguage, TranslationStrings> = {
  fr: {
    appName: "Les aventures du Petit Lion",
    appSubtitle: "Apprends en jouant avec ton ami Imrane !",
    playButton: "Jouer avec le lion 🦁",
    challengeButton: "Trouve le bon dessin 🎨",
    parentSettings: "Espace Parents ⚙️",
    backHome: "Accueil",
    nextWord: "Mot suivant ➡️",
    repeatWord: "Réécouter 🔊",
    listenWord: "Écouter",
    iAmListening: "J'écoute, Imrane… 👂",
    trySpeaking: "Appuie et répète le mot 🎤",
    validateManually: "J'ai bien répété ! ⭐",
    categories: {
      animals: "Animaux",
      food: "Fruits et aliments",
      objects: "Objets du quotidien",
      body: "Corps humain",
      vehicles: "Moyens de transport",
      actions: "Actions simples"
    },
    welcomeMessage:
      "Coucou Imrane ! 🦁 Je suis ton ami le Petit Lion. Aujourd'hui, nous allons apprendre de nouveaux mots, écouter, parler et nous amuser ensemble !",
    presentationText: (word: string) =>
      `Regarde Imrane ! Voici : ${word}. Écoute bien : ${word}.`,
    repeatInvitation: (word: string) =>
      `À toi, Imrane ! Essaie de dire : ${word} !`,
    successMessages: [
      "Bravo Imrane ! Tu as très bien essayé ! 🌟",
      "Super عمران ! Tu apprends de nouveaux mots ! 🎉",
      "Génial Imrane ! On continue l'aventure ? ✨",
      "Magnifique Imrane ! Tu es un champion ! 🏆"
    ],
    encouragementMessages: [
      "Ce n'est pas grave Imrane, écoute encore une fois avec moi ! 💛",
      "Essaie doucement, عمران. Tu vas y arriver ! 🦁",
      "Très bel effort Imrane ! On réécoute ensemble ? 💫"
    ],
    challengePrompt: (word: string) =>
      `Imrane, peux-tu trouver : ${word} ?`,
    challengeSuccess: (word: string) =>
      `Bravo عمران ! Tu as trouvé : ${word} ! 🎉`,
    challengeRetry: (word: string) =>
      `Regarde encore, Imrane ! Où se cache : ${word} ? 👀`,
    starsCount: (count: number) => `${count} étoiles`,
    wordsDiscovered: (count: number) => `${count} mots découverts`,
    sessionCompletedTitle: "Bravo champion Imrane ! 🌟",
    sessionCompletedDesc: (count: number) =>
      `Tu as découvert et répété ${count} mots avec le Petit Lion !`,
    replaySession: "Rejouer une séance 🚀",
    difficultyLevels: {
      easy: "Facile (découverte & tolérance haute)",
      medium: "Moyen (équilibré & encourageant)",
      hard: "Difficile (précision accrue)"
    },
    micPermissionNotice:
      "Pour répéter à voix haute, autorise le micro ou utilise le bouton de validation manuelle.",
    micUnavailableNotice:
      "Microphone non disponible. Imrane peut valider directement chaque mot !",
    languageNames: {
      fr: "Français",
      ar: "العربية",
      ary: "الدارجة المغربية"
    }
  },

  ar: {
    appName: "مغامرات الأسد الصغير",
    appSubtitle: "تعلم باللعب مع صديقك عمران!",
    playButton: "العب مع الأسد 🦁",
    challengeButton: "ابحث عن الرسم الصحيح 🎨",
    parentSettings: "إعدادات الوالدين ⚙️",
    backHome: "الرئيسية",
    nextWord: "الكلمة التالية ➡️",
    repeatWord: "استمع مجدداً 🔊",
    listenWord: "استمع",
    iAmListening: "أسمعك يا عمران... 👂",
    trySpeaking: "اضغط وتكلم يا عمران 🎤",
    validateManually: "لقد قلتها بنجاح! ⭐",
    categories: {
      animals: "الحيوانات",
      food: "الفواكه والأطعمة",
      objects: "أشياء يومية",
      body: "جسم الإنسان",
      vehicles: "وسائل النقل",
      actions: "أفعال بسيطة"
    },
    welcomeMessage:
      "مرحباً عمران! 🦁 أنا صديقك الأسد الصغير. هيا نتعلم كلمات جديدة ونلعب معاً!",
    presentationText: (word: string) =>
      `انظر يا عمران! هذه : ${word}. استمع جيداً: ${word}.`,
    repeatInvitation: (word: string) =>
      `يلا عمران، حاول أن تقول: ${word}!`,
    successMessages: [
      "أحسنت يا عمران! أنا فخور بك! 🌟",
      "رائع يا عمران! هيا نتعلم كلمة جديدة! 🎉",
      "ممتاز يا عمران! أنت بطل حقيقي! ✨",
      "أنت ذكي ومبدع يا عمران! 🏆"
    ],
    encouragementMessages: [
      "لا بأس يا عمران، استمع مرة أخرى معي! 💛",
      "حاول بهدوء يا عمران، أنت تستطيع! 🦁",
      "محاولة جميلة يا عمران، هيا نعيدها معاً! 💫"
    ],
    challengePrompt: (word: string) =>
      `يا عمران، أين تجد : ${word}؟`,
    challengeSuccess: (word: string) =>
      `أحسنت يا عمران! لقد وجدت : ${word}! 🎉`,
    challengeRetry: (word: string) =>
      `انظر مجدداً يا عمران! أين تختبئ : ${word}؟ 👀`,
    starsCount: (count: number) => `${count} نجمة`,
    wordsDiscovered: (count: number) => `${count} كلمة مكتشفة`,
    sessionCompletedTitle: "أحسنت يا بطلنا عمران! 🌟",
    sessionCompletedDesc: (count: number) =>
      `لقد اكتشفت وكررت ${count} كلمات مع صديقك الأسد الصغير!`,
    replaySession: "جلسة جديدة 🚀",
    difficultyLevels: {
      easy: "سهل (اكتشاف ومطابقة مرنة)",
      medium: "متوسط (متوازن ومشجع)",
      hard: "صعب (دقة أعلى)"
    },
    micPermissionNotice:
      "لتكرار الكلمة بالصوت، امنح الإذن للميكروفون أو اضغط على زر الإنجاز اليدوي.",
    micUnavailableNotice:
      "الميكروفون غير متوفر. يمكن لعمران الضغط على زر الإنجاز مباشرة!",
    languageNames: {
      fr: "Français",
      ar: "العربية",
      ary: "الدارجة المغربية"
    }
  },

  ary: {
    appName: "مغامرات السبيع الصغير مع عمران",
    appSubtitle: "تعلم ولعب مع صاحبك عمران!",
    playButton: "لعب مع السبيع 🦁",
    challengeButton: "لقى التصويرة الصحيحة 🎨",
    parentSettings: "بلاصة الوالدين ⚙️",
    backHome: "الدار الكبيرة",
    nextWord: "الكلمة الماجية ➡️",
    repeatWord: "عاود سمع 🔊",
    listenWord: "سمع",
    iAmListening: "كنسمعك أ عمران... 👂",
    trySpeaking: "ورك وهضر أ عمران 🎤",
    validateManually: "عاودتها مزيان! ⭐",
    categories: {
      animals: "الحيوانات",
      food: "الدلاح والفواكه والماكلة",
      objects: "حوايج الدار",
      body: "صحة وجسم الإنسان",
      vehicles: "التران والطوموبيل والطيارة",
      actions: "أفعال ولعب"
    },
    welcomeMessage:
      "سلام عمران! 🦁 أنا صاحبك الأسد الصغير. يلا نتعلمو كلمات جداد ونلعبو مع بعضياتنا!",
    presentationText: (word: string) =>
      `شوف عمران! هادا : ${word}. سمع مزيان: ${word}.`,
    repeatInvitation: (word: string) =>
      `دابا نوبتك عمران! حاول تقول: ${word}!`,
    successMessages: [
      "برافو عمران! وليتي كتتعلم مزيان! 🌟",
      "زوين بزاف عمران! يلا للكلمة الجاية! 🎉",
      "تبارك الله عليك عمران، نتا بطل ديما! ✨",
      "واعر بزاف عمران! راك منور! 🏆"
    ],
    encouragementMessages: [
      "ماشي مشكل عمران، نعاودو الكلمة مع بعضياتنا! 💛",
      "يلا عمران، سمع مزيان وعاود معايا! 🦁",
      "راك قريب بزاف عمران، نزيدو محاولة خفيفة! 💫"
    ],
    challengePrompt: (word: string) =>
      `عمران، فين مخبية : ${word}؟`,
    challengeSuccess: (word: string) =>
      `برافو عمران! لقيتي : ${word} دغيا! 🎉`,
    challengeRetry: (word: string) =>
      `شوف مزيان عمران! فين مخبية : ${word}؟ 👀`,
    starsCount: (count: number) => `${count} نجمات`,
    wordsDiscovered: (count: number) => `${count} كلمات تعلمناهم`,
    sessionCompletedTitle: "برافو عمران البطل! 🌟",
    sessionCompletedDesc: (count: number) =>
      `تعلمتي وفهمتي ${count} كلمات مع السبيع الصغير!`,
    replaySession: "لعب جولة خرى 🚀",
    difficultyLevels: {
      easy: "ساهل (مرن بزاف ومناسب للبداية)",
      medium: "متوسط (مشجع وموزون)",
      hard: "قاصح شوية (دقيق ومضبوط)"
    },
    micPermissionNotice:
      "باش تعاود بصوتك، طلق الميكرو أولا ورك على زر النجمة فالشاشة.",
    micUnavailableNotice:
      "الميكرو ماخدامش. عمران يقدر يورك على الزر ويكمل فرحان!",
    languageNames: {
      fr: "Français",
      ar: "العربية",
      ary: "الدارجة المغربية"
    }
  }
};
