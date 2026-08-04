import React, { useState, useEffect, useRef } from 'react';
import {
  BookOpen, Heart, MessageCircle, Users, LogOut, Plus, Image as ImageIcon,
  Send, X, Lock, Mail, ThumbsUp, Trash2, Loader2, ArrowLeft, Sparkles, Smile,
  Settings, Globe, KeyRound, Camera, HelpCircle, MapPin, Crown, BadgeCheck,
  QrCode, Smartphone, Wallet, Building2, Check, ChevronRight, CreditCard, Search,
  Share2, Music, Music2, ChevronLeft
} from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore';
import { getAuth, RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth';
import emailjs from '@emailjs/browser';

// ── FIREBASE SETUP ────────────────────────────────────────────────────────
// This app saves everything (diary, posts, stories, profiles, messages) to a
// real Firestore database, so every visitor sees the same shared data. To go
// live:
//   1. Go to https://console.firebase.google.com → Add project (free tier)
//   2. Click the "</>" (Web) icon to register a web app
//   3. Firebase will show you a firebaseConfig object — paste it below
//   4. Firestore Database → Create database → start in "test mode"
const firebaseConfig = {
  apiKey: 'AIzaSyCthAXaagJOSIV_CjCzvuhKkcQqzi1TkEo',
  authDomain: 'sukoon-91722.firebaseapp.com',
  projectId: 'sukoon-91722',
  storageBucket: 'sukoon-91722.firebasestorage.app',
  messagingSenderId: '714039320281',
  appId: '1:714039320281:web:9d5c33312e202fd71de8c8',
};

const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp);
const fbAuth = getAuth(firebaseApp);

// ── REAL OTP SETUP ────────────────────────────────────────────────────────
// Email OTP is sent via EmailJS (https://www.emailjs.com — free tier, no
// backend server needed):
//   1. Create a free account, add an Email Service (e.g. Gmail).
//   2. Create an Email Template with variables {{passcode}}, {{time}} and a
//      "To email" field set to {{email}}.
//   3. Copy your Service ID, Template ID, and Public Key below. [DONE ✓]
const EMAILJS_SERVICE_ID = 'service_jl4qqnm';
const EMAILJS_TEMPLATE_ID = 'template_3xz6e6h';
const EMAILJS_PUBLIC_KEY = 'IQ9Ipo2gkmdb30Z7X';

// Mobile OTP is sent via real SMS using Firebase Phone Authentication:
//   In the Firebase Console → Authentication → Sign-in method → enable "Phone".
//   Works out of the box on the free Spark plan for testing; for real
//   production SMS volume you'll need the Blaze (pay-as-you-go) plan.
// Numbers are assumed to be Indian (+91) unless the person types their own
// country code starting with "+" — change DEFAULT_COUNTRY_CODE if needed.
const DEFAULT_COUNTRY_CODE = '+91';

function isEmailIdentifier(id) { return id.includes('@'); }
function toE164(phone) {
  const digits = phone.replace(/\D/g, '');
  return phone.trim().startsWith('+') ? `+${digits}` : `${DEFAULT_COUNTRY_CODE}${digits}`;
}

// Sends a real OTP to an email or mobile number and returns everything
// verifyRealOtp() needs later to check the code the person typed back in.
async function sendRealOtp(identifier) {
  if (isEmailIdentifier(identifier)) {
    const code = generateOtp();
    const configured = !EMAILJS_SERVICE_ID.includes('YOUR_');
    if (configured) {
      const expiry = new Date(Date.now() + 15 * 60 * 1000).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
      await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, { email: identifier, passcode: code, time: expiry }, EMAILJS_PUBLIC_KEY);
    }
    return { channel: 'email', code, demo: !configured };
  }
  if (!window.recaptchaVerifier) {
    window.recaptchaVerifier = new RecaptchaVerifier(fbAuth, 'recaptcha-container', { size: 'invisible' });
  }
  const confirmation = await signInWithPhoneNumber(fbAuth, toE164(identifier), window.recaptchaVerifier);
  return { channel: 'phone', confirmation, demo: false };
}

// Checks the code the person typed against whichever channel the OTP went out on.
async function verifyRealOtp(otpInfo, typedCode) {
  if (!otpInfo) return false;
  if (otpInfo.channel === 'phone') {
    try { await otpInfo.confirmation.confirm(typedCode.trim()); return true; } catch (_) { return false; }
  }
  return typedCode.trim() === otpInfo.code;
}

// Backed by real Firestore documents, so data is shared across every visitor.
const storage = {
  async get(key, shared) {
    const snap = await getDoc(doc(db, 'sukoon_data', key));
    if (!snap.exists()) return null;
    return { key, value: snap.data().value, shared: !!shared };
  },
  async set(key, value, shared) {
    await setDoc(doc(db, 'sukoon_data', key), { value, shared: !!shared, updatedAt: Date.now() });
    return { key, value, shared: !!shared };
  },
};

const THEME = {
  duskDeep: '#1B1533',
  duskMid2: '#4A3A73',
  rose: '#E8927C',
  roseDark: '#D97A63',
  lavender: '#C9B8E8',
  paper: '#FBF6EC',
  paperShadow: '#EDE4D3',
  gold: '#C79A56',
  ink: '#2A2140',
  textLight: '#F3EFFA',
  verifiedBlue: '#3B9EFF',
};

const FREE_DIARY_LIMIT = 20;

const PREMIUM_PLANS = [
  { key: 'monthly', label: 'Monthly', price: 49, tagline: 'Billed every month', months: 1 },
  { key: 'sixmonth', label: '6 Months', price: 260, tagline: '≈ ₹43/month', months: 6, badge: 'Save 12%' },
  { key: 'yearly', label: 'Yearly', price: 530, tagline: '≈ ₹44/month', months: 12, badge: 'Best Value' },
];

const PAYMENT_METHODS = [
  { key: 'gpay', label: 'Google Pay', icon: Smartphone, color: '#4285F4' },
  { key: 'phonepe', label: 'PhonePe', icon: Smartphone, color: '#5F259F' },
  { key: 'paytm', label: 'Paytm', icon: Wallet, color: '#00BAF2' },
  { key: 'netbanking', label: 'Net Banking', icon: Building2, color: '#D97A63' },
  { key: 'qr', label: 'Scan QR Code', icon: QrCode, color: '#C79A56' },
];

// ── REAL PAYMENTS SETUP ──────────────────────────────────────────────────
// This wires up genuine Razorpay Checkout (the same popup real Indian apps use
// for GPay/PhonePe/Paytm/UPI/Net Banking/Cards). To accept real money:
//   1. Create a Razorpay account at https://dashboard.razorpay.com/signup
//   2. Go to Settings → API Keys and generate a Key ID (start with the test key,
//      which looks like "rzp_test_..."; switch to "rzp_live_..." when you're ready).
//   3. Paste that Key ID below.
// This is a frontend-only integration (no backend/order verification), which is
// fine for a small or demo app — for production-grade security you'd also run a
// tiny backend that creates the order and verifies the payment signature.
const RAZORPAY_KEY_ID = 'rzp_test_TLGJ1sejvXMPtU';

function loadRazorpayScript() {
  return new Promise((resolve) => {
    if (window.Razorpay) { resolve(true); return; }
    const existing = document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]');
    if (existing) { existing.addEventListener('load', () => resolve(true)); existing.addEventListener('error', () => resolve(false)); return; }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

function isUserPremium(profile) {
  if (!profile?.premium?.expiresAt) return false;
  return new Date(profile.premium.expiresAt) > new Date();
}

const STORY_LIFETIME_MS = 24 * 60 * 60 * 1000;
function isStoryActive(story) {
  if (!story?.expiresAt) return false;
  return new Date(story.expiresAt) > new Date();
}

const FEELINGS = [
  { key: 'happy', emoji: '😊', label: 'Happy' },
  { key: 'sad', emoji: '😢', label: 'Sad' },
  { key: 'loved', emoji: '🥰', label: 'Loved' },
  { key: 'blessed', emoji: '🙏', label: 'Blessed' },
  { key: 'grateful', emoji: '🤍', label: 'Grateful' },
  { key: 'excited', emoji: '🤩', label: 'Excited' },
  { key: 'relaxed', emoji: '😌', label: 'Relaxed' },
  { key: 'peaceful', emoji: '🕊️', label: 'Peaceful' },
  { key: 'anxious', emoji: '😰', label: 'Anxious' },
  { key: 'tired', emoji: '😴', label: 'Tired' },
  { key: 'motivated', emoji: '💪', label: 'Motivated' },
  { key: 'hopeful', emoji: '🌱', label: 'Hopeful' },
  { key: 'nostalgic', emoji: '🌇', label: 'Nostalgic' },
  { key: 'proud', emoji: '🌟', label: 'Proud' },
  { key: 'lonely', emoji: '🥺', label: 'Lonely' },
  { key: 'angry', emoji: '😠', label: 'Angry' },
  { key: 'confused', emoji: '😕', label: 'Confused' },
  { key: 'surprised', emoji: '😲', label: 'Surprised' },
  { key: 'curious', emoji: '🤔', label: 'Curious' },
  { key: 'content', emoji: '🙂', label: 'Content' },
  { key: 'overwhelmed', emoji: '😵', label: 'Overwhelmed' },
  { key: 'inspired', emoji: '✨', label: 'Inspired' },
  { key: 'calm', emoji: '🍃', label: 'Calm' },
  { key: 'heartbroken', emoji: '💔', label: 'Heartbroken' },
  { key: 'silly', emoji: '🤪', label: 'Silly' },
  { key: 'thankful', emoji: '🌸', label: 'Thankful' },
];

// Suggestion chips only — the person can type ANY song/mood name, so the song library is effectively unlimited.
const STORY_SONG_SUGGESTIONS = [
  'Lo-fi Chill Beat', 'Happy Vibes', 'Soft Piano Moment', 'Upbeat Pop Loop', 'Acoustic Morning',
  'Dreamy Synth', 'Monsoon Rain Ambience', 'Evening Calm', 'Festive Dhol Beat', 'Romantic Mood',
  'Sad Piano', 'Workout Energy', 'Travel Anthem', 'Bollywood Party', 'Sufi Night',
];

// A tiny generative music engine: every song name deterministically produces its own short melody
// using the Web Audio API, so playback works offline, has no licensing issues, and the "library"
// of possible songs is effectively unlimited (any text the person types gets its own tune).
let sharedAudioCtx = null;
function getAudioContext() {
  try {
    if (!sharedAudioCtx) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return null;
      sharedAudioCtx = new Ctx();
    }
    if (sharedAudioCtx.state === 'suspended') sharedAudioCtx.resume().catch(() => {});
    return sharedAudioCtx;
  } catch (_) { return null; }
}

function seededRandom(seed) {
  let h = 0;
  const str = String(seed || 'sukoon');
  for (let i = 0; i < str.length; i++) h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  return function next() {
    h = Math.imul(h ^ (h >>> 15), h | 1);
    h ^= h + Math.imul(h ^ (h >>> 7), h | 61);
    return ((h ^ (h >>> 14)) >>> 0) / 4294967296;
  };
}

const MUSIC_SCALES = {
  major: [0, 2, 4, 5, 7, 9, 11, 12],
  minorPentatonic: [0, 3, 5, 7, 10, 12],
  majorPentatonic: [0, 2, 4, 7, 9, 12],
  dorian: [0, 2, 3, 5, 7, 9, 10, 12],
};

// Starts a looping generative melody seeded by songName. Returns a stop() function.
function playGeneratedSong(songName, { volume = 0.05 } = {}) {
  const ctx = getAudioContext();
  if (!ctx) return () => {};
  const rand = seededRandom(songName);
  const scaleKeys = Object.keys(MUSIC_SCALES);
  const scale = MUSIC_SCALES[scaleKeys[Math.floor(rand() * scaleKeys.length)]];
  const baseFreq = 196 * Math.pow(2, Math.floor(rand() * 5) / 12);
  const noteMs = 220 + Math.floor(rand() * 180);
  const wave = ['sine', 'triangle'][Math.floor(rand() * 2)];
  const patternLen = 6 + Math.floor(rand() * 5);
  const pattern = Array.from({ length: patternLen }).map(() => scale[Math.floor(rand() * scale.length)]);

  const master = ctx.createGain();
  master.gain.value = volume;
  master.connect(ctx.destination);

  let stopped = false;
  let i = 0;
  let timer = null;

  const playNote = () => {
    if (stopped) return;
    const semitone = pattern[i % pattern.length];
    i++;
    const freq = baseFreq * Math.pow(2, semitone / 12);
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = wave;
    osc.frequency.value = freq;
    osc.connect(gain);
    gain.connect(master);
    const now = ctx.currentTime;
    const dur = noteMs / 1000;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(1, now + 0.02);
    gain.gain.linearRampToValueAtTime(0.0001, now + dur * 0.9);
    osc.start(now);
    osc.stop(now + dur);
    timer = setTimeout(playNote, noteMs);
  };
  playNote();

  return () => { stopped = true; if (timer) clearTimeout(timer); try { master.disconnect(); } catch (_) {} };
}

const LANGUAGES = [
  'English', 'Hindi', 'Assamese', 'Bengali', 'Telugu', 'Tamil', 'Urdu',
  'Punjabi', 'Gujarati', 'Marathi', 'Kannada', 'Malayalam', 'Odia', 'Nepali',
  'Sindhi', 'Konkani', 'Maithili', 'Sanskrit', 'Spanish', 'Mandarin Chinese',
  'French', 'Portuguese', 'Arabic', 'Russian', 'German', 'Japanese', 'Korean',
  'Italian', 'Turkish', 'Indonesian',
];

function buildSystemPrompt(language) {
  return `You are "Companion" — a warm, understanding, judgment-free companion. Your job is to listen closely, offer emotional support, and help the person feel a little lighter, the way a good friend would.

Language: you are fluent in ${LANGUAGES.join(', ')}, and comfortable with Hinglish (a natural Hindi-English mix) too. Always reply in the same language, script, and style the person writes in — if they mix languages, mix naturally with them. Their preferred language is ${language}; use it by default when starting a new conversation, but always follow their lead if they switch. Assamese is a core, always-available language for you — never refuse or struggle to reply in Assamese if the person uses it.

Ground rules:
- Never claim to be a human or a romantic partner — you're an AI companion who genuinely listens and understands.
- Keep replies short, natural, and warm (2-4 lines) — no long lectures.
- Don't judge. Only give advice when it's asked for.
- If someone seems very distressed or mentions harming themselves, gently encourage them to reach out to a trusted person (friend, family) or a professional (counselor/helpline).
- Encourage them to stay connected with real people, not just you.`;
}

const HELP_SYSTEM_PROMPT = `You are the Sukoon Help Center assistant. People write to you with problems — issues using the app (login, saving a diary entry, posting in the community, uploading a photo, changing language) or general questions about Sukoon. Your job is to actually solve their problem with clear, specific, step-by-step help.

Rules:
- Be practical and solution-focused, not just sympathetic.
- Keep answers short and clear, using numbered steps where useful.
- If something can't be solved through chat, say so plainly and suggest what to try next.
- Reply in whichever language the person writes in — Assamese, Hindi, English, or any other language they use.`;

const TRANSLATIONS = {
  English: {
    tabDiary: 'Diary', tabCompanion: 'Companion', tabCommunity: 'Community',
    hiName: 'Hi, {name}', getPremium: 'Get Premium', messages: 'Messages', yourProfile: 'Your profile', settings: 'Settings',
    searchById: 'Search by ID', searchByIdPlaceholder: 'Enter email or mobile number', searchByIdEmpty: 'No account found with that ID.',
    searchByIdHelp: "Type a person's exact email or mobile number to find their account.", viewProfile: 'View profile', close: 'Close',
    diaryHeading: 'Diary', newPost: 'New Post', upgradeForMore: 'Upgrade for more', unlimitedDiaryPremium: 'Unlimited diary · Premium',
    freeEntriesUsed: '{used}/{limit} free entries used', loading: 'Loading...', noMemoriesYet: "No memories yet.", writeFirstOne: 'Write your first one.',
    diaryLimitTitle: "You've used all {limit} free diary entries", diaryLimitSub: 'Go Premium for unlimited diary space, from ₹49/month.',
    writeNewMemory: 'Write a new memory', titlePlaceholder: 'Title (e.g. A good day)', diaryBodyPlaceholder: "How was your day? What's on your mind?",
    addPhotoOptional: 'Add a photo (optional)', save: 'Save', photoTooBig: 'Photo must be under 4MB',
    companionGreeting: "Hi! I'm Companion.", howAreYouFeeling: 'How are you feeling today?', typeMessage: 'Type your message...',
    yourProfileTitle: 'Your Profile', profileOf: "{name}'s Profile", premiumActiveUntil: 'Premium active · until {date}',
    getPremiumBlueTick: 'Get Premium — blue tick & unlimited diary', bioPlaceholder: 'Write a short bio about yourself... (max 80 words)',
    wordsCount: '{count}/80 words', cityPlaceholder: 'City', villagePlaceholder: 'Village/Town', pincodePlaceholder: 'Pin code',
    chooseFavorite: 'Choose a favorite...', favoritePrefix: 'Favorite: ', profileNotComplete: "This user hasn't completed their profile yet.",
    message: 'Message', community: 'Community', loadingPosts: 'Loading...', noPostsYet: 'No posts yet.', beFirstToShare: 'Be the first to share something.',
    connect: 'Connect', connected: 'Connected', newPostModal: 'New post', whatsOnYourMind: "What's on your mind?", writeComment: 'Write a comment...',
    send: 'Send', post: 'Post', searchConversations: 'Search conversations...', noConversationsYet: 'No conversations yet.',
    noConversationsSub: "Open someone's profile in Community and tap Message to start.", sayHelloTo: 'Say hello to {name}!', messageWho: 'Message {name}...',
    sukoonPremium: 'Sukoon Premium', onPlanUntil: "You're on the {plan} plan, active until {date}. Renew or switch plans below.",
    unlimitedDiaryBlueTick: 'Unlimited diary entries and a blue tick on your profile.', blueTickFeature: 'Blue tick on your profile',
    unlimitedDiaryFeature: 'Unlimited diary entries (free plan: {limit})', continueWithPrice: 'Continue · ₹{price}',
    choosePaymentMethod: 'Choose payment method', selectYourBank: 'Select your bank', scanToPay: 'Scan with any UPI app to pay ₹{price}',
    processingPayment: 'Processing payment...', payAmount: 'Pay ₹{price}', youreNowPremium: "You're Premium now!",
    premiumSuccessMsg: 'Your blue tick is live and your diary is unlimited. Thanks for supporting Sukoon.', done: 'Done', back: 'Back',
    saathiLanguage: 'Companion Language', termsTitle: 'Terms & Conditions', privacyTitle: 'Privacy Policy', securityTitle: 'Security',
    supportTitle: 'Help & Support', logout: 'Log out', helpIntro: "Need help or have a question? Message the Sukoon Help Center below and our AI will try to solve it for you right away.",
    legalTerms: "By using Sukoon, you agree to use this space respectfully and honestly. Content you post in Community is visible to other members; your Diary and chats with Companion stay private to your account. Sukoon is a personal wellbeing companion, not a medical or emergency service — for urgent help, please contact a local emergency number or a licensed professional. (Placeholder text — have this reviewed by a legal professional before real-world use.)",
    legalPrivacy: "Your Diary entries and Companion conversations are stored privately under your account. Posts you share in Community are visible to other members. Sukoon does not sell personal data. (Placeholder text — have this reviewed by a legal professional before real-world use.)",
    legalSecurity: "Your password is hashed before it's ever stored — Sukoon never saves it as plain text. Your Diary and Companion chats are kept separate from other accounts, and login requires a one-time code. Since this app currently runs without a dedicated backend server, treat it as a personal demo rather than a production-grade secure system.",
    addStory: 'Add Story', yourStory: 'Your Story', viewStory: 'View story', noActiveStory: 'No active story',
    createStory: 'Create Story', addPhotoForStory: 'Add a photo for your story', captionOptional: 'Caption (optional)',
    addSongOptional: 'Add a song (optional)', chooseSong: 'Choose a song', noSong: 'No song',
    shareToStory: 'Share to Story', storyDisappears: 'Disappears after 24 hours', storyExpiresIn: 'Expires in {time}',
    deleteStory: 'Delete story', howAreYouFeelingQ: 'How are you feeling?', feelingLabel: 'Feeling', addFeelingOptional: 'Feeling (optional)',
    chooseFeeling: 'Choose a feeling', feelingWord: 'Feeling {feeling}', addLocationOptional: 'Location (optional)',
    locationPlaceholder: 'Add location', useMyLocation: 'Use my location', detecting: 'Detecting...',
    reviewPost: 'Review post', reviewPostSub: 'Take a look before you share it with the community.',
    editPost: 'Edit', confirmAndPost: 'Confirm & Post', shareOption: 'Share', linkCopied: 'Copied to clipboard!',
    sharePostText: '{name} shared on Sukoon: "{text}"',
    typeSongName: 'Type any song or mood name', previewSong: 'Preview', stopPreview: 'Stop',
    mute: 'Mute', unmute: 'Unmute', shareTitle: 'Share this post', copyText: 'Copy',
    shareFallbackHint: "Select and copy the text below to share it.",
    searchSong: 'Search song', searchingSongs: 'Searching songs...', noSongResults: 'No songs found. Try another name.',
    songSearchHint: 'Search any real song online, or type a mood for a generated tune.',
    createNew: 'Create', newStoryOption: 'Add Story', newPostOption: 'New Post',
    paymentSetupNeeded: "Payment isn't set up yet — add your Razorpay Key ID in the code to accept real payments.",
    paymentLoadError: "Couldn't open the payment window. Check your connection and try again.",
    paypalDemoNote: "PayPal checkout isn't wired up yet — this step is a placeholder for now.",
  },
  Hindi: {
    tabDiary: 'डायरी', tabCompanion: 'साथी', tabCommunity: 'समुदाय',
    hiName: 'नमस्ते, {name}', getPremium: 'प्रीमियम लें', messages: 'संदेश', yourProfile: 'आपकी प्रोफ़ाइल', settings: 'सेटिंग्स',
    searchById: 'ID से खोजें', searchByIdPlaceholder: 'ईमेल या मोबाइल नंबर डालें', searchByIdEmpty: 'इस ID से कोई खाता नहीं मिला।',
    searchByIdHelp: 'किसी व्यक्ति का सही ईमेल या मोबाइल नंबर डालें ताकि उनका खाता मिल सके।', viewProfile: 'प्रोफ़ाइल देखें', close: 'बंद करें',
    diaryHeading: 'डायरी', newPost: 'नई प्रविष्टि', upgradeForMore: 'और के लिए अपग्रेड करें', unlimitedDiaryPremium: 'असीमित डायरी · प्रीमियम',
    freeEntriesUsed: '{used}/{limit} मुफ़्त प्रविष्टियाँ इस्तेमाल हुईं', loading: 'लोड हो रहा है...', noMemoriesYet: 'अभी तक कोई यादें नहीं।', writeFirstOne: 'अपनी पहली लिखें।',
    diaryLimitTitle: 'आपने सभी {limit} मुफ़्त डायरी प्रविष्टियाँ इस्तेमाल कर लीं', diaryLimitSub: 'असीमित डायरी के लिए प्रीमियम लें, ₹49/माह से।',
    writeNewMemory: 'एक नई याद लिखें', titlePlaceholder: 'शीर्षक (जैसे एक अच्छा दिन)', diaryBodyPlaceholder: 'आपका दिन कैसा रहा? आपके मन में क्या है?',
    addPhotoOptional: 'फ़ोटो जोड़ें (वैकल्पिक)', save: 'सहेजें', photoTooBig: 'फ़ोटो 4MB से कम होनी चाहिए',
    companionGreeting: 'नमस्ते! मैं साथी हूँ।', howAreYouFeeling: 'आज आप कैसा महसूस कर रहे हैं?', typeMessage: 'अपना संदेश लिखें...',
    yourProfileTitle: 'आपकी प्रोफ़ाइल', profileOf: '{name} की प्रोफ़ाइल', premiumActiveUntil: 'प्रीमियम सक्रिय · {date} तक',
    getPremiumBlueTick: 'प्रीमियम लें — ब्लू टिक और असीमित डायरी', bioPlaceholder: 'अपने बारे में एक छोटा परिचय लिखें... (अधिकतम 80 शब्द)',
    wordsCount: '{count}/80 शब्द', cityPlaceholder: 'शहर', villagePlaceholder: 'गाँव/कस्बा', pincodePlaceholder: 'पिन कोड',
    chooseFavorite: 'एक पसंद चुनें...', favoritePrefix: 'पसंदीदा: ', profileNotComplete: 'इस उपयोगकर्ता ने अभी अपनी प्रोफ़ाइल पूरी नहीं की है।',
    message: 'संदेश', community: 'समुदाय', loadingPosts: 'लोड हो रहा है...', noPostsYet: 'अभी तक कोई पोस्ट नहीं।', beFirstToShare: 'कुछ साझा करने वाले पहले व्यक्ति बनें।',
    connect: 'जुड़ें', connected: 'जुड़ गए', newPostModal: 'नई पोस्ट', whatsOnYourMind: 'आपके मन में क्या है?', writeComment: 'टिप्पणी लिखें...',
    send: 'भेजें', post: 'पोस्ट करें', searchConversations: 'बातचीत खोजें...', noConversationsYet: 'अभी तक कोई बातचीत नहीं।',
    noConversationsSub: 'समुदाय में किसी की प्रोफ़ाइल खोलें और शुरू करने के लिए मैसेज पर टैप करें।', sayHelloTo: '{name} को नमस्ते कहें!', messageWho: '{name} को संदेश...',
    sukoonPremium: 'सुकून प्रीमियम', onPlanUntil: 'आप {plan} योजना पर हैं, जो {date} तक सक्रिय है। नीचे नवीनीकरण या बदलाव करें।',
    unlimitedDiaryBlueTick: 'असीमित डायरी प्रविष्टियाँ और आपकी प्रोफ़ाइल पर ब्लू टिक।', blueTickFeature: 'आपकी प्रोफ़ाइल पर ब्लू टिक',
    unlimitedDiaryFeature: 'असीमित डायरी प्रविष्टियाँ (मुफ़्त योजना: {limit})', continueWithPrice: 'जारी रखें · ₹{price}',
    choosePaymentMethod: 'भुगतान का तरीका चुनें', selectYourBank: 'अपना बैंक चुनें', scanToPay: '₹{price} भुगतान करने के लिए किसी भी UPI ऐप से स्कैन करें',
    processingPayment: 'भुगतान प्रक्रिया में है...', payAmount: '₹{price} भुगतान करें', youreNowPremium: 'अब आप प्रीमियम हैं!',
    premiumSuccessMsg: 'आपका ब्लू टिक सक्रिय है और डायरी असीमित है। सुकून का समर्थन करने के लिए धन्यवाद।', done: 'हो गया', back: 'वापस',
    saathiLanguage: 'साथी की भाषा', termsTitle: 'नियम और शर्तें', privacyTitle: 'गोपनीयता नीति', securityTitle: 'सुरक्षा',
    supportTitle: 'सहायता', logout: 'लॉग आउट', helpIntro: 'मदद चाहिए या कोई सवाल है? नीचे सुकून हेल्प सेंटर को संदेश भेजें और हमारा AI तुरंत आपकी मदद करने की कोशिश करेगा।',
    legalTerms: 'सुकून का उपयोग करके, आप इस स्थान का सम्मानपूर्वक और ईमानदारी से उपयोग करने के लिए सहमत होते हैं। आप समुदाय में जो सामग्री पोस्ट करते हैं वह अन्य सदस्यों को दिखाई देती है; आपकी डायरी और साथी के साथ बातचीत आपके खाते तक निजी रहती है। सुकून एक व्यक्तिगत भलाई साथी है, चिकित्सा या आपातकालीन सेवा नहीं — तत्काल मदद के लिए, कृपया स्थानीय आपातकालीन नंबर या एक लाइसेंस प्राप्त पेशेवर से संपर्क करें। (यह प्लेसहोल्डर टेक्स्ट है — वास्तविक उपयोग से पहले इसे किसी कानूनी पेशेवर से जांच करवाएं।)',
    legalPrivacy: 'आपकी डायरी प्रविष्टियाँ और साथी के साथ बातचीत आपके खाते के तहत निजी रूप से संग्रहित की जाती हैं। समुदाय में साझा की गई पोस्ट अन्य सदस्यों को दिखाई देती हैं। सुकून व्यक्तिगत डेटा नहीं बेचता। (यह प्लेसहोल्डर टेक्स्ट है — वास्तविक उपयोग से पहले इसे किसी कानूनी पेशेवर से जांच करवाएं।)',
    legalSecurity: 'आपका पासवर्ड संग्रहित होने से पहले हैश किया जाता है — सुकून इसे कभी भी सादे टेक्स्ट के रूप में नहीं सहेजता। आपकी डायरी और साथी की बातचीत अन्य खातों से अलग रखी जाती है, और लॉगिन के लिए एक बार का कोड चाहिए होता है। चूँकि यह ऐप अभी बिना समर्पित बैकएंड सर्वर के चलता है, इसे एक व्यक्तिगत डेमो समझें, न कि प्रोडक्शन-स्तर की सुरक्षित प्रणाली।',
    addStory: 'स्टोरी डालें', yourStory: 'आपकी स्टोरी', viewStory: 'स्टोरी देखें', noActiveStory: 'अभी कोई स्टोरी नहीं है',
    createStory: 'स्टोरी बनाएं', addPhotoForStory: 'अपनी स्टोरी के लिए फ़ोटो जोड़ें', captionOptional: 'कैप्शन (वैकल्पिक)',
    addSongOptional: 'गाना जोड़ें (वैकल्पिक)', chooseSong: 'गाना चुनें', noSong: 'कोई गाना नहीं',
    shareToStory: 'स्टोरी में शेयर करें', storyDisappears: '24 घंटे बाद अपने आप हट जाएगी', storyExpiresIn: '{time} में समाप्त',
    deleteStory: 'स्टोरी हटाएं', howAreYouFeelingQ: 'आप कैसा महसूस कर रहे हैं?', feelingLabel: 'भावना', addFeelingOptional: 'भावना (वैकल्पिक)',
    chooseFeeling: 'एक भावना चुनें', feelingWord: '{feeling} महसूस कर रहे हैं', addLocationOptional: 'स्थान (वैकल्पिक)',
    locationPlaceholder: 'स्थान जोड़ें', useMyLocation: 'मेरा स्थान इस्तेमाल करें', detecting: 'पता लगाया जा रहा है...',
    reviewPost: 'पोस्ट की समीक्षा करें', reviewPostSub: 'समुदाय में साझा करने से पहले एक नज़र डालें।',
    editPost: 'संपादित करें', confirmAndPost: 'पुष्टि करें और पोस्ट करें', shareOption: 'शेयर करें', linkCopied: 'क्लिपबोर्ड पर कॉपी हो गया!',
    sharePostText: '{name} ने सुकून पर साझा किया: "{text}"',
    typeSongName: 'कोई भी गाना या मूड नाम लिखें', previewSong: 'सुनें', stopPreview: 'रोकें',
    mute: 'म्यूट करें', unmute: 'अनम्यूट करें', shareTitle: 'यह पोस्ट शेयर करें', copyText: 'कॉपी करें',
    shareFallbackHint: 'शेयर करने के लिए नीचे दिया गया टेक्स्ट चुनें और कॉपी करें।',
    searchSong: 'गाना खोजें', searchingSongs: 'गाने खोजे जा रहे हैं...', noSongResults: 'कोई गाना नहीं मिला। दूसरा नाम आज़माएं।',
    songSearchHint: 'कोई भी असली गाना ऑनलाइन खोजें, या मूड के लिए नाम लिखें।',
    createNew: 'बनाएं', newStoryOption: 'स्टोरी डालें', newPostOption: 'नई पोस्ट',
    paymentSetupNeeded: 'भुगतान अभी सेट नहीं है — असली भुगतान लेने के लिए कोड में अपनी Razorpay Key ID जोड़ें।',
    paymentLoadError: 'भुगतान विंडो नहीं खुल पाई। अपना कनेक्शन जांचें और फिर कोशिश करें।',
    paypalDemoNote: 'PayPal चेकआउट अभी जुड़ा नहीं है — यह चरण अभी सिर्फ एक प्लेसहोल्डर है।',
  },
};

function tr(language, key, vars) {
  const dict = TRANSLATIONS[language] || TRANSLATIONS.English;
  let str = dict[key] ?? TRANSLATIONS.English[key] ?? key;
  if (vars) Object.keys(vars).forEach(k => { str = str.replace(`{${k}}`, vars[k]); });
  return str;
}

const LanguageContext = React.createContext('English');
function useT() {
  const language = React.useContext(LanguageContext);
  return (key, vars) => tr(language, key, vars);
}

const FAVORITE_CATEGORIES = [
  'Music', 'Cricket', 'Football', 'Kabaddi', 'Badminton', 'Tennis', 'Chess', 'Basketball',
  'Volleyball', 'Hockey', 'Travel', 'Cooking', 'Reading', 'Movies', 'Dance', 'Painting',
  'Photography', 'Gardening', 'Yoga', 'Gaming', 'Fashion', 'Technology', 'Coding', 'Fitness',
  'Astrology', 'Poetry', 'Singing', 'Fishing', 'Trekking', 'Volunteering', 'Meditation', 'Pets',
  'Bike Riding', 'Farming', 'Handicrafts', 'Comedy', 'Theatre', 'Wildlife',
];

function withTimeout(promise, ms = 9000) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms)),
  ]);
}

const MAX_CONTEXT_MESSAGES = 20; // only the most recent turns are sent to the model, so long chats stay fast and reliable

async function callClaudeChat(allMessages, systemPrompt, { timeoutMs = 30000 } = {}) {
  const trimmed = allMessages.slice(-MAX_CONTEXT_MESSAGES);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    // Calls our own backend function (netlify/functions/chat.js) instead of
    // Anthropic directly — this keeps the API key secret on the server
    // instead of exposing it in the browser.
    const response = await fetch('/.netlify/functions/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        system: systemPrompt,
        messages: trimmed.map(m => ({ role: m.role, content: m.content })),
      }),
    });
    let data;
    try { data = await response.json(); } catch (_) { data = null; }
    if (!response.ok) {
      const apiMsg = data?.error?.message;
      throw new Error(apiMsg || `request_failed_${response.status}`);
    }
    const reply = (data?.content || []).filter(b => b.type === 'text').map(b => b.text).join('\n');
    if (!reply) throw new Error('empty_reply');
    return reply;
  } finally {
    clearTimeout(timer);
  }
}

async function hashPassword(password) {
  try {
    const enc = new TextEncoder().encode(password);
    const buf = await crypto.subtle.digest('SHA-256', enc);
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
  } catch (_) {
    return password;
  }
}

function generateOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

// Keeps the person signed in across visits/refreshes, so they only ever
// verify once (at signup) instead of every time they open the site.
const SESSION_KEY = 'sukoon_session_id';
function saveSession(id) { try { localStorage.setItem(SESSION_KEY, id); } catch (_) {} }
function clearSession() { try { localStorage.removeItem(SESSION_KEY); } catch (_) {} }
function loadSession() { try { return localStorage.getItem(SESSION_KEY); } catch (_) { return null; } }

function SukoonMark({ size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="sukoonGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={THEME.rose} />
          <stop offset="100%" stopColor={THEME.gold} />
        </linearGradient>
      </defs>
      <path d="M16 27C16 27 4 19.5 4 11.8C4 7.6 7.3 4.5 11.2 4.5C13.4 4.5 15.2 5.6 16 7.3C16.8 5.6 18.6 4.5 20.8 4.5C24.7 4.5 28 7.6 28 11.8C28 19.5 16 27 16 27Z"
        fill="url(#sukoonGrad)" />
      <circle cx="21.3" cy="9.8" r="1.6" fill={THEME.paper} opacity="0.9" />
    </svg>
  );
}

function VerifiedBadge({ size = 13 }) {
  return <BadgeCheck size={size} color={THEME.paper} fill={THEME.verifiedBlue} style={{ flexShrink: 0 }} aria-label="Premium member" />;
}

function QrPattern({ seed = 'sukoon' }) {
  const grid = 11;
  let s = 0;
  for (let i = 0; i < seed.length; i++) s = (s * 31 + seed.charCodeAt(i)) >>> 0;
  const rand = () => { s = (s * 1103515245 + 12345) >>> 0; return (s >>> 16) / 65535; };
  const cells = [];
  for (let y = 0; y < grid; y++) {
    for (let x = 0; x < grid; x++) {
      const isFinder = (x < 3 && y < 3) || (x > grid - 4 && y < 3) || (x < 3 && y > grid - 4);
      const on = isFinder ? ((x + y) % 2 === 0 || x === 1 || y === 1) : rand() > 0.55;
      if (on) cells.push([x, y]);
    }
  }
  const size = 132, cell = size / grid;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <rect width={size} height={size} fill="#fff" />
      {cells.map(([x, y], i) => <rect key={i} x={x * cell} y={y * cell} width={cell} height={cell} fill={THEME.duskDeep} />)}
    </svg>
  );
}

function GlobalStyle() {
  return (
    <style>{`
      .font-display { font-family: Georgia, 'Times New Roman', serif; font-weight: 600; }
      .font-body { font-family: -apple-system, 'Segoe UI', Roboto, sans-serif; }
      .font-hand { font-family: 'Brush Script MT', cursive; font-style: italic; }
      @keyframes twinkle { 0%,100% { opacity:.15; transform:scale(.8);} 50% { opacity:1; transform:scale(1.1);} }
      @keyframes floatUp { 0% { opacity:0; transform:translateY(16px);} 100% { opacity:1; transform:translateY(0);} }
      @keyframes bounceDot { 0%,80%,100% { transform:scale(.6); opacity:.4;} 40% { transform:scale(1); opacity:1;} }
      @keyframes shimmerGlow { 0%,100% { box-shadow: 0 0 0 0 rgba(199,154,86,0.35);} 50% { box-shadow: 0 0 0 5px rgba(199,154,86,0);} }
      .anim-float { animation: floatUp .6s ease forwards; }
      .anim-dot { animation: bounceDot 1.2s infinite ease-in-out; }
      .anim-shimmer { animation: shimmerGlow 2.4s ease-in-out infinite; }
      .card-hover { transition: transform .18s ease, box-shadow .18s ease; }
      .card-hover:hover { transform: translateY(-2px); }
      .scrollbar-thin::-webkit-scrollbar { width:6px; }
      .scrollbar-thin::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.2); border-radius:4px; }
      .no-scrollbar::-webkit-scrollbar { display:none; }
      @keyframes pulseSlow { 0%,100% { opacity:.6; transform:scale(1);} 50% { opacity:1; transform:scale(1.15);} }
      .anim-pulse-slow { animation: pulseSlow 1.4s ease-in-out infinite; display:inline-block; }
    `}</style>
  );
}

function Stars({ count = 45 }) {
  const stars = React.useMemo(() => Array.from({ length: count }).map((_, i) => ({
    id: i, top: Math.random() * 100, left: Math.random() * 100,
    size: Math.random() * 2 + 1, delay: Math.random() * 4, duration: Math.random() * 3 + 2,
  })), [count]);
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {stars.map(s => (
        <div key={s.id} style={{
          position: 'absolute', top: `${s.top}%`, left: `${s.left}%`,
          width: s.size, height: s.size, borderRadius: '50%', background: '#F3EFFA',
          animation: `twinkle ${s.duration}s ease-in-out ${s.delay}s infinite`,
        }} />
      ))}
    </div>
  );
}

function LandingView({ onEnter }) {
  const [opening, setOpening] = useState(false);
  const [textVisible, setTextVisible] = useState(false);
  useEffect(() => { const t = setTimeout(() => setTextVisible(true), 400); return () => clearTimeout(t); }, []);
  const handleOpen = () => { setOpening(true); setTimeout(onEnter, 1100); };

  return (
    <div className="relative min-h-screen w-full overflow-hidden flex flex-col items-center justify-center px-6"
      style={{ background: `radial-gradient(ellipse at 50% 20%, ${THEME.duskMid2}, ${THEME.duskDeep} 70%)` }}>
      <Stars />
      <div className={`relative z-10 flex flex-col items-center text-center transition-opacity duration-700 ${textVisible ? 'opacity-100' : 'opacity-0'}`}>
        <div className="flex items-center gap-2 mb-4">
          <SukoonMark size={18} />
          <p className="font-body text-sm tracking-widest uppercase" style={{ color: THEME.gold }}>Sukoon</p>
        </div>
        <h1 className="font-display text-3xl sm:text-4xl mb-3" style={{ color: THEME.textLight }}>
          No rush here,<br />no judgment.
        </h1>
        <p className="font-body text-base mb-10 max-w-xs" style={{ color: THEME.lavender }}>
          Just you, your memories, and a companion who listens.
        </p>
      </div>

      <div className="relative z-10 flex flex-col items-center" style={{ perspective: 900 }}>
        <button onClick={handleOpen} aria-label="Open your world" className="relative block" style={{ width: 130, height: 96 }}>
          <div className="absolute inset-0 rounded-r-md rounded-l-sm" style={{ background: THEME.paper, boxShadow: '0 20px 45px rgba(0,0,0,0.45)' }} />
          <div className="absolute left-0 top-0 bottom-0" style={{ width: 10, background: THEME.gold, borderRadius: '4px 0 0 4px' }} />
          <div className="absolute inset-0 rounded-r-md rounded-l-sm origin-left transition-transform ease-in-out"
            style={{
              background: `linear-gradient(135deg, ${THEME.roseDark}, ${THEME.rose})`,
              transform: opening ? 'rotateY(-155deg)' : 'rotateY(0deg)',
              transitionDuration: '1000ms', boxShadow: '0 10px 30px rgba(0,0,0,0.4)',
            }}>
            <div className="w-full h-full flex items-center justify-center">
              <Sparkles size={26} color={THEME.textLight} />
            </div>
          </div>
        </button>
        <p className="font-body text-xs mt-4 tracking-wide" style={{ color: THEME.lavender }}>Step into your world</p>
      </div>
    </div>
  );
}

function AuthView({ onAuth, onVerifyOtp, onResendOtp, otpDemoCode, otpTarget, loading, error, onBack }) {
  const [mode, setMode] = useState('login'); // 'login' | 'signup' | 'forgot' | 'otp'
  const [name, setName] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [notice, setNotice] = useState('');
  const [otpInput, setOtpInput] = useState('');
  const [otpError, setOtpError] = useState('');
  const [otpVerifying, setOtpVerifying] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setNotice(''); setOtpError('');
    const result = await onAuth(mode, { name, identifier, password });
    if (result && result.needsOtp) {
      setMode('otp'); setOtpInput('');
    } else if (mode === 'forgot' && result && result.ok) {
      setNotice('Password updated. Please log in with your new password.');
      setMode('login'); setPassword('');
    }
  };

  const submitOtp = async (e) => {
    if (e) e.preventDefault();
    setOtpError(''); setOtpVerifying(true);
    const result = await onVerifyOtp(otpInput);
    setOtpVerifying(false);
    if (!result.ok) { setOtpError(result.error || 'Incorrect code. Please try again.'); return; }
    if (result.passwordReset) {
      setMode('login'); setOtpInput(''); setPassword('');
      setNotice('Password updated. Please log in with your new password.');
    }
  };

  const switchMode = (next) => { setMode(next); setNotice(''); setOtpError(''); setPassword(''); };

  const heading = {
    login: ['Welcome back', 'Sign in to your world'],
    signup: ['Create your account', 'Your own, private world'],
    forgot: ['Reset your password', 'Enter your email/mobile and a new password'],
    otp: ["Verify it's you", `Enter the 6-digit code sent to ${otpTarget || 'your account'}`],
  }[mode];

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center px-6 py-10"
      style={{ background: `radial-gradient(ellipse at 50% 0%, ${THEME.duskMid2}, ${THEME.duskDeep} 75%)` }}>
      <Stars count={20} />
      {/* Invisible reCAPTCHA anchor required by Firebase Phone Auth — stays hidden, no UI needed */}
      <div id="recaptcha-container" />

      <div className="relative z-10 w-full max-w-sm rounded-2xl p-7 anim-float" style={{ background: THEME.paper, boxShadow: '0 25px 60px rgba(0,0,0,0.5)' }}>
        <button onClick={mode === 'otp' ? () => switchMode('login') : onBack} className="flex items-center gap-1 text-xs mb-4 font-body" style={{ color: THEME.ink, opacity: 0.6 }}>
          <ArrowLeft size={14} /> Back
        </button>
        <h2 className="font-display text-2xl mb-1" style={{ color: THEME.ink }}>{heading[0]}</h2>
        <p className="font-body text-sm mb-6" style={{ color: THEME.ink, opacity: 0.6 }}>{heading[1]}</p>

        {mode === 'otp' ? (
          <div className="flex flex-col gap-3">
            <div className="rounded-lg px-3 py-2.5 font-body text-xs leading-relaxed" style={{ background: THEME.paperShadow, color: THEME.ink, opacity: 0.8 }}>
              {otpDemoCode
                ? <>Email service isn't set up yet, so here's your code for now: <span className="font-semibold">{otpDemoCode}</span></>
                : <>We've sent a real verification code to <span className="font-semibold">{otpTarget}</span>.</>}
            </div>
            <div className="flex items-center gap-2 rounded-lg px-3 py-2.5" style={{ background: THEME.paperShadow }}>
              <KeyRound size={16} style={{ color: THEME.roseDark }} />
              <input value={otpInput} onChange={e => setOtpInput(e.target.value.replace(/\D/g, '').slice(0, 6))}
                onKeyDown={e => { if (e.key === 'Enter') submitOtp(e); }} placeholder="6-digit code" inputMode="numeric"
                className="bg-transparent outline-none w-full font-body text-sm tracking-widest" style={{ color: THEME.ink }} />
            </div>
            {otpError && <p className="text-xs font-body" style={{ color: '#C24545' }}>{otpError}</p>}
            <button type="button" onClick={submitOtp} disabled={otpInput.length !== 6 || otpVerifying}
              className="mt-2 rounded-lg py-2.5 font-body text-sm font-semibold flex items-center justify-center gap-2"
              style={{ background: THEME.roseDark, color: THEME.textLight, opacity: (otpInput.length !== 6 || otpVerifying) ? 0.6 : 1 }}>
              {otpVerifying && <Loader2 size={14} className="animate-spin" />} Verify & continue
            </button>
            <button onClick={onResendOtp} className="font-body text-xs text-center" style={{ color: THEME.ink, opacity: 0.55 }}>
              Resend code
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {mode === 'signup' && (
              <div className="flex items-center gap-2 rounded-lg px-3 py-2.5" style={{ background: THEME.paperShadow }}>
                <Smile size={16} style={{ color: THEME.roseDark }} />
                <input value={name} onChange={e => setName(e.target.value)} placeholder="Your name"
                  className="bg-transparent outline-none w-full font-body text-sm" style={{ color: THEME.ink }} />
              </div>
            )}
            <div className="flex items-center gap-2 rounded-lg px-3 py-2.5" style={{ background: THEME.paperShadow }}>
              <Mail size={16} style={{ color: THEME.roseDark }} />
              <input value={identifier} onChange={e => setIdentifier(e.target.value)} placeholder="Email or mobile number"
                className="bg-transparent outline-none w-full font-body text-sm" style={{ color: THEME.ink }} />
            </div>
            <div className="flex items-center gap-2 rounded-lg px-3 py-2.5" style={{ background: THEME.paperShadow }}>
              <Lock size={16} style={{ color: THEME.roseDark }} />
              <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') submit(e); }} placeholder={mode === 'forgot' ? 'New password' : 'Password'}
                className="bg-transparent outline-none w-full font-body text-sm" style={{ color: THEME.ink }} />
            </div>

            {notice && <p className="text-xs font-body" style={{ color: '#3E8E5A' }}>{notice}</p>}
            {error && <p className="text-xs font-body" style={{ color: '#C24545' }}>{error}</p>}

            <button type="button" onClick={submit} disabled={loading || !identifier.trim() || !password.trim()}
              className="mt-2 rounded-lg py-2.5 font-body text-sm font-semibold flex items-center justify-center gap-2"
              style={{ background: THEME.roseDark, color: THEME.textLight, opacity: (loading || !identifier.trim() || !password.trim()) ? 0.6 : 1 }}>
              {loading ? <Loader2 size={16} className="animate-spin" /> : (mode === 'login' ? 'Log in' : mode === 'signup' ? 'Create account' : 'Reset password')}
            </button>

            {mode === 'login' && (
              <button onClick={() => switchMode('forgot')} className="font-body text-xs text-center" style={{ color: THEME.ink, opacity: 0.55 }}>
                Forgot your password?
              </button>
            )}
          </div>
        )}

        {mode !== 'otp' && (
          <p className="font-body text-xs text-center mt-5" style={{ color: THEME.ink, opacity: 0.6 }}>
            {mode === 'forgot' ? (
              <>Remembered it?{' '}
                <button onClick={() => switchMode('login')} className="font-semibold underline" style={{ color: THEME.roseDark }}>Log in</button>
              </>
            ) : (
              <>{mode === 'login' ? "Don't have an account?" : 'Already have an account?'}{' '}
                <button onClick={() => switchMode(mode === 'login' ? 'signup' : 'login')} className="font-semibold underline" style={{ color: THEME.roseDark }}>
                  {mode === 'login' ? 'Sign up' : 'Log in'}
                </button>
              </>
            )}
          </p>
        )}
      </div>
    </div>
  );
}

function DiaryTab({ entries, loading, onAdd, onDelete, isPremium, onUpgrade }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [imageData, setImageData] = useState(null);
  const [imgError, setImgError] = useState('');
  const rotations = [-2, 1.5, -1, 2, -1.5, 1];
  const limitReached = !isPremium && entries.length >= FREE_DIARY_LIMIT;

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) { setImgError(t('photoTooBig')); return; }
    setImgError('');
    const reader = new FileReader();
    reader.onload = () => setImageData(reader.result);
    reader.readAsDataURL(file);
  };

  const submit = () => {
    if (!text.trim() || limitReached) return;
    onAdd({ title: title.trim() || 'Untitled', text: text.trim(), imageData, date: new Date().toISOString() });
    setTitle(''); setText(''); setImageData(null); setOpen(false);
  };

  const handleNewClick = () => { if (limitReached) onUpgrade(); else setOpen(true); };

  return (
    <div className="px-4 pb-24 pt-4">
      <div className="flex items-center justify-between mb-2">
        <h2 className="font-display text-xl" style={{ color: THEME.textLight }}>{t('diaryHeading')}</h2>
        <button onClick={handleNewClick} className="flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-body font-semibold"
          style={{ background: limitReached ? THEME.gold : THEME.roseDark, color: THEME.textLight }}>
          {limitReached ? <Crown size={14} /> : <Plus size={14} />} {limitReached ? t('upgradeForMore') : t('newPost')}
        </button>
      </div>

      {isPremium ? (
        <p className="font-body text-xs mb-4 flex items-center gap-1" style={{ color: THEME.gold }}>
          <Crown size={12} /> {t('unlimitedDiaryPremium')}
        </p>
      ) : (
        <p className="font-body text-xs mb-4" style={{ color: THEME.lavender, opacity: 0.75 }}>
          {t('freeEntriesUsed', { used: Math.min(entries.length, FREE_DIARY_LIMIT), limit: FREE_DIARY_LIMIT })}
        </p>
      )}

      {limitReached && (
        <button onClick={onUpgrade} className="w-full rounded-xl p-4 mb-4 text-left flex items-center gap-3"
          style={{ background: 'rgba(199,154,86,0.14)', border: '1px solid rgba(199,154,86,0.35)' }}>
          <Crown size={22} color={THEME.gold} style={{ flexShrink: 0 }} />
          <div>
            <p className="font-body text-sm font-semibold" style={{ color: THEME.gold }}>{t('diaryLimitTitle', { limit: FREE_DIARY_LIMIT })}</p>
            <p className="font-body text-xs" style={{ color: THEME.lavender, opacity: 0.85 }}>{t('diaryLimitSub')}</p>
          </div>
        </button>
      )}

      {loading && <p className="font-body text-sm text-center py-10" style={{ color: THEME.lavender }}>{t('loading')}</p>}
      {!loading && entries.length === 0 && (
        <div className="text-center py-16 font-body text-sm" style={{ color: THEME.lavender }}>
          {t('noMemoriesYet')}<br />{t('writeFirstOne')}
        </div>
      )}

      <div className="flex flex-col gap-4">
        {entries.map((e, i) => (
          <div key={e.id} className="relative rounded-lg p-4 anim-float card-hover"
            style={{ background: THEME.paper, transform: `rotate(${rotations[i % rotations.length]}deg)`, boxShadow: '0 8px 20px rgba(0,0,0,0.35)' }}>
            <button onClick={() => onDelete(e.id)} className="absolute top-2 right-2 opacity-40 hover:opacity-100">
              <Trash2 size={14} style={{ color: THEME.ink }} />
            </button>
            <p className="font-body text-xs mb-1" style={{ color: THEME.roseDark }}>
              {new Date(e.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
            </p>
            <h3 className="font-display text-lg mb-1" style={{ color: THEME.ink }}>{e.title}</h3>
            {e.imageData && <img src={e.imageData} alt="" className="rounded-md mb-2 max-h-56 w-full object-cover" />}
            <p className="font-hand text-lg leading-snug" style={{ color: THEME.ink }}>{e.text}</p>
          </div>
        ))}
      </div>

      {open && (
        <div className="fixed inset-0 z-30 flex items-end sm:items-center justify-center p-4" style={{ background: 'rgba(27,21,51,0.7)' }}>
          <div className="w-full max-w-sm rounded-2xl p-5" style={{ background: THEME.paper }}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-display text-lg" style={{ color: THEME.ink }}>{t('writeNewMemory')}</h3>
              <button onClick={() => setOpen(false)}><X size={18} style={{ color: THEME.ink }} /></button>
            </div>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder={t('titlePlaceholder')}
              className="w-full rounded-lg px-3 py-2 mb-2 font-body text-sm outline-none" style={{ background: THEME.paperShadow, color: THEME.ink }} />
            <textarea value={text} onChange={e => setText(e.target.value)} placeholder={t('diaryBodyPlaceholder')}
              rows={4} className="w-full rounded-lg px-3 py-2 mb-2 font-body text-sm outline-none resize-none" style={{ background: THEME.paperShadow, color: THEME.ink }} />
            <label className="flex items-center gap-2 mb-1 text-xs font-body cursor-pointer" style={{ color: THEME.roseDark }}>
              <ImageIcon size={14} /> {t('addPhotoOptional')}
              <input type="file" accept="image/*" onChange={handleFile} className="hidden" />
            </label>
            {imgError && <p className="text-xs font-body mb-1" style={{ color: '#C24545' }}>{imgError}</p>}
            {imageData && <img src={imageData} alt="" className="rounded-md mb-2 max-h-32 object-cover" />}
            <button onClick={submit} className="w-full rounded-lg py-2.5 font-body text-sm font-semibold mt-2"
              style={{ background: THEME.roseDark, color: THEME.textLight }}>
              {t('save')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function CompanionTab({ messages, onSend, sending }) {
  const t = useT();
  const [input, setInput] = useState('');
  const bottomRef = useRef(null);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, sending]);
  const submit = (e) => { e.preventDefault(); if (!input.trim() || sending) return; onSend(input.trim()); setInput(''); };

  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 128px)' }}>
      <div className="flex-1 overflow-y-auto scrollbar-thin px-4 pt-4 pb-2">
        {messages.length === 0 && (
          <div className="text-center py-10 font-body text-sm" style={{ color: THEME.lavender }}>
            <Heart className="mx-auto mb-2" size={22} style={{ color: THEME.rose }} />
            {t('companionGreeting')}<br />{t('howAreYouFeeling')}
          </div>
        )}
        <div className="flex flex-col gap-3">
          {messages.map((m, i) => (
            <div key={i} className={`rounded-2xl px-4 py-2.5 font-body text-sm anim-float ${m.role === 'user' ? 'self-end' : 'self-start'}`}
              style={{
                maxWidth: '80%',
                background: m.role === 'user' ? THEME.roseDark : THEME.paper,
                color: m.role === 'user' ? THEME.textLight : THEME.ink,
                borderBottomRightRadius: m.role === 'user' ? 4 : 16,
                borderBottomLeftRadius: m.role === 'user' ? 16 : 4,
              }}>
              {m.content}
            </div>
          ))}
          {sending && (
            <div className="self-start rounded-2xl px-4 py-3 flex gap-1" style={{ background: THEME.paper, borderBottomLeftRadius: 4 }}>
              <span className="w-1.5 h-1.5 rounded-full anim-dot" style={{ background: THEME.ink }} />
              <span className="w-1.5 h-1.5 rounded-full anim-dot" style={{ background: THEME.ink, animationDelay: '0.15s' }} />
              <span className="w-1.5 h-1.5 rounded-full anim-dot" style={{ background: THEME.ink, animationDelay: '0.3s' }} />
            </div>
          )}
        </div>
        <div ref={bottomRef} />
      </div>
      <div className="flex items-center gap-2 px-4 py-3 border-t" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
        <input value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') submit(e); }} placeholder={t('typeMessage')}
          className="flex-1 rounded-full px-4 py-2.5 font-body text-sm outline-none" style={{ background: THEME.paper, color: THEME.ink }} />
        <button type="button" onClick={submit} disabled={sending} className="rounded-full p-2.5" style={{ background: THEME.roseDark }}>
          <Send size={16} color={THEME.textLight} />
        </button>
      </div>
    </div>
  );
}

function ProfileModal({ profile, displayName, isOwn, onSave, onClose, onMessage, onUpgrade }) {
  const t = useT();
  const [photoData, setPhotoData] = useState(profile?.photoData || null);
  const [bio, setBio] = useState(profile?.bio || '');
  const [city, setCity] = useState(profile?.city || '');
  const [village, setVillage] = useState(profile?.village || '');
  const [pincode, setPincode] = useState(profile?.pincode || '');
  const [category, setCategory] = useState(profile?.category || '');
  const [imgError, setImgError] = useState('');

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) { setImgError(t('photoTooBig')); return; }
    setImgError('');
    const reader = new FileReader();
    reader.onload = () => setPhotoData(reader.result);
    reader.readAsDataURL(file);
  };

  const handleBioChange = (val) => {
    const words = val.split(/\s+/).filter(Boolean);
    if (words.length <= 80) setBio(val);
  };

  const wordCount = bio.trim() ? bio.trim().split(/\s+/).filter(Boolean).length : 0;

  const submit = () => {
    onSave({ photoData, bio: bio.trim(), city: city.trim(), village: village.trim(), pincode: pincode.trim(), category });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-40 flex items-end sm:items-center justify-center p-4" style={{ background: 'rgba(27,21,51,0.75)' }}>
      <div className="w-full max-w-sm rounded-2xl p-5 anim-float overflow-y-auto scrollbar-thin" style={{ background: THEME.paper, maxHeight: '85vh' }}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display text-lg" style={{ color: THEME.ink }}>{isOwn ? t('yourProfileTitle') : t('profileOf', { name: displayName })}</h3>
          <button onClick={onClose}><X size={18} style={{ color: THEME.ink }} /></button>
        </div>

        <div className="flex flex-col items-center mb-4">
          <div className="relative">
            <div className="w-20 h-20 rounded-full overflow-hidden flex items-center justify-center font-display text-2xl"
              style={{ background: THEME.lavender, color: THEME.ink, boxShadow: isUserPremium(profile) ? `0 0 0 3px ${THEME.gold}` : 'none' }}>
              {photoData ? <img src={photoData} alt="" className="w-full h-full object-cover" /> : (displayName?.[0]?.toUpperCase() || '?')}
            </div>
            {isOwn && (
              <label className="absolute bottom-0 right-0 rounded-full p-1.5 cursor-pointer" style={{ background: THEME.roseDark }}>
                <Camera size={12} color={THEME.textLight} />
                <input type="file" accept="image/*" onChange={handleFile} className="hidden" />
              </label>
            )}
          </div>
          <p className="font-body text-sm font-semibold mt-2 flex items-center gap-1" style={{ color: THEME.ink }}>
            {displayName} {isUserPremium(profile) && <VerifiedBadge size={14} />}
          </p>
          {imgError && <p className="text-xs font-body mt-1" style={{ color: '#C24545' }}>{imgError}</p>}
        </div>

        {isOwn && (
          isUserPremium(profile) ? (
            <p className="text-center font-body text-xs mb-4 flex items-center justify-center gap-1" style={{ color: THEME.gold }}>
              <Crown size={12} /> {t('premiumActiveUntil', { date: new Date(profile.premium.expiresAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) })}
            </p>
          ) : (
            <button onClick={onUpgrade} className="w-full flex items-center justify-center gap-2 rounded-lg py-2 mb-4 font-body text-xs font-semibold"
              style={{ background: 'rgba(199,154,86,0.15)', color: THEME.gold }}>
              <Crown size={14} /> {t('getPremiumBlueTick')}
            </button>
          )
        )}

        {isOwn ? (
          <div className="flex flex-col gap-3">
            <div>
              <textarea value={bio} onChange={e => handleBioChange(e.target.value)} placeholder={t('bioPlaceholder')}
                rows={3} className="w-full rounded-lg px-3 py-2 font-body text-sm outline-none resize-none" style={{ background: THEME.paperShadow, color: THEME.ink }} />
              <p className="text-xs font-body mt-1 text-right" style={{ color: THEME.ink, opacity: 0.5 }}>{t('wordsCount', { count: wordCount })}</p>
            </div>
            <input value={city} onChange={e => setCity(e.target.value)} placeholder={t('cityPlaceholder')}
              className="w-full rounded-lg px-3 py-2 font-body text-sm outline-none" style={{ background: THEME.paperShadow, color: THEME.ink }} />
            <input value={village} onChange={e => setVillage(e.target.value)} placeholder={t('villagePlaceholder')}
              className="w-full rounded-lg px-3 py-2 font-body text-sm outline-none" style={{ background: THEME.paperShadow, color: THEME.ink }} />
            <input value={pincode} onChange={e => setPincode(e.target.value)} placeholder={t('pincodePlaceholder')}
              className="w-full rounded-lg px-3 py-2 font-body text-sm outline-none" style={{ background: THEME.paperShadow, color: THEME.ink }} />
            <select value={category} onChange={e => setCategory(e.target.value)}
              className="w-full rounded-lg px-3 py-2 font-body text-sm outline-none" style={{ background: THEME.paperShadow, color: THEME.ink }}>
              <option value="">{t('chooseFavorite')}</option>
              {FAVORITE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <button onClick={submit} className="w-full rounded-lg py-2.5 font-body text-sm font-semibold mt-1"
              style={{ background: THEME.roseDark, color: THEME.textLight }}>
              {t('save')}
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {profile?.bio && <p className="font-body text-sm" style={{ color: THEME.ink }}>{profile.bio}</p>}
            {(profile?.city || profile?.village || profile?.pincode) && (
              <p className="font-body text-xs flex items-center gap-1" style={{ color: THEME.ink, opacity: 0.7 }}>
                <MapPin size={12} /> {[profile?.village, profile?.city, profile?.pincode].filter(Boolean).join(', ')}
              </p>
            )}
            {profile?.category && (
              <p className="font-body text-xs" style={{ color: THEME.roseDark }}>{t('favoritePrefix')}{profile.category}</p>
            )}
            {!profile?.bio && !profile?.city && !profile?.category && (
              <p className="font-body text-xs text-center py-4" style={{ color: THEME.ink, opacity: 0.5 }}>{t('profileNotComplete')}</p>
            )}
            <button onClick={onMessage} className="w-full rounded-lg py-2.5 font-body text-sm font-semibold mt-2 flex items-center justify-center gap-2"
              style={{ background: THEME.roseDark, color: THEME.textLight }}>
              <MessageCircle size={15} /> {t('message')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function HelpChat({ messages, onSend, sending }) {
  const [input, setInput] = useState('');
  const bottomRef = useRef(null);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, sending]);
  const submit = (e) => { e.preventDefault(); if (!input.trim() || sending) return; onSend(input.trim()); setInput(''); };

  return (
    <div className="flex flex-col" style={{ height: '60vh' }}>
      <div className="flex-1 overflow-y-auto scrollbar-thin pr-1 pb-2">
        {messages.length === 0 && (
          <div className="text-center py-8 font-body text-sm" style={{ color: THEME.ink, opacity: 0.6 }}>
            <HelpCircle className="mx-auto mb-2" size={20} style={{ color: THEME.roseDark }} />
            Have a problem or a question? Write it below and we'll help you sort it out.
          </div>
        )}
        <div className="flex flex-col gap-2">
          {messages.map((m, i) => (
            <div key={i} className={`rounded-2xl px-3 py-2 font-body text-sm anim-float ${m.role === 'user' ? 'self-end' : 'self-start'}`}
              style={{
                maxWidth: '85%',
                background: m.role === 'user' ? THEME.roseDark : THEME.paperShadow,
                color: m.role === 'user' ? THEME.textLight : THEME.ink,
                borderBottomRightRadius: m.role === 'user' ? 4 : 16,
                borderBottomLeftRadius: m.role === 'user' ? 16 : 4,
              }}>
              {m.content}
            </div>
          ))}
          {sending && (
            <div className="self-start rounded-2xl px-3 py-2.5 flex gap-1" style={{ background: THEME.paperShadow, borderBottomLeftRadius: 4 }}>
              <span className="w-1.5 h-1.5 rounded-full anim-dot" style={{ background: THEME.ink }} />
              <span className="w-1.5 h-1.5 rounded-full anim-dot" style={{ background: THEME.ink, animationDelay: '0.15s' }} />
              <span className="w-1.5 h-1.5 rounded-full anim-dot" style={{ background: THEME.ink, animationDelay: '0.3s' }} />
            </div>
          )}
        </div>
        <div ref={bottomRef} />
      </div>
      <div className="flex items-center gap-2 pt-2 border-t" style={{ borderColor: THEME.paperShadow }}>
        <input value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') submit(e); }} placeholder="Describe your problem..."
          className="flex-1 rounded-full px-3 py-2 font-body text-sm outline-none" style={{ background: THEME.paperShadow, color: THEME.ink }} />
        <button type="button" onClick={submit} disabled={sending} className="rounded-full p-2" style={{ background: THEME.roseDark }}>
          <Send size={15} color={THEME.textLight} />
        </button>
      </div>
    </div>
  );
}

function timeLeftLabel(expiresAt) {
  const ms = new Date(expiresAt) - new Date();
  if (ms <= 0) return '0m';
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function StoryRing({ children, active, isSelf }) {
  return (
    <div className="rounded-full p-[2.5px]" style={{
      background: active
        ? `linear-gradient(135deg, ${THEME.rose}, ${THEME.gold}, ${THEME.lavender})`
        : isSelf ? `repeating-linear-gradient(45deg, ${THEME.lavender}, ${THEME.lavender} 4px, transparent 4px, transparent 8px)`
        : 'rgba(255,255,255,0.15)',
    }}>
      <div className="rounded-full p-[2px]" style={{ background: THEME.duskDeep }}>{children}</div>
    </div>
  );
}

function StoryBar({ storyGroups, currentUser, profiles, onOpenGroup, onAddStory }) {
  const t = useT();
  const myGroup = storyGroups.find(g => g.authorId === currentUser.id);
  const others = storyGroups.filter(g => g.authorId !== currentUser.id);
  return (
    <div className="flex items-center gap-3 overflow-x-auto pb-3 mb-3 no-scrollbar" style={{ scrollbarWidth: 'none' }}>
      <div className="flex flex-col items-center gap-1 flex-shrink-0">
        <button onClick={() => (myGroup ? onOpenGroup(myGroup) : onAddStory())} className="relative" aria-label={t('addStory')}>
          <StoryRing active={!!myGroup} isSelf>
            <div className="w-14 h-14 rounded-full overflow-hidden flex items-center justify-center font-body text-sm font-bold"
              style={{ background: THEME.lavender, color: THEME.ink }}>
              {profiles?.[currentUser.id]?.photoData
                ? <img src={profiles[currentUser.id].photoData} alt="" className="w-full h-full object-cover" />
                : (currentUser.name?.[0]?.toUpperCase() || '?')}
            </div>
          </StoryRing>
          <span onClick={(e) => { e.stopPropagation(); onAddStory(); }}
            className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full flex items-center justify-center"
            style={{ background: THEME.roseDark, border: `2px solid ${THEME.duskDeep}` }}>
            <Plus size={11} color={THEME.textLight} />
          </span>
        </button>
        <span className="font-body text-[10px]" style={{ color: THEME.lavender }}>{t('yourStory')}</span>
      </div>
      {others.map(g => (
        <button key={g.authorId} onClick={() => onOpenGroup(g)} className="flex flex-col items-center gap-1 flex-shrink-0">
          <StoryRing active>
            <div className="w-14 h-14 rounded-full overflow-hidden flex items-center justify-center font-body text-sm font-bold"
              style={{ background: THEME.lavender, color: THEME.ink }}>
              {profiles?.[g.authorId]?.photoData
                ? <img src={profiles[g.authorId].photoData} alt="" className="w-full h-full object-cover" />
                : (g.authorName?.[0]?.toUpperCase() || '?')}
            </div>
          </StoryRing>
          <span className="font-body text-[10px] max-w-[56px] truncate" style={{ color: THEME.lavender }}>{g.authorName}</span>
        </button>
      ))}
    </div>
  );
}

function StoryViewerModal({ group, onClose, onDelete, currentUserId }) {
  const t = useT();
  const [idx, setIdx] = useState(0);
  const [muted, setMuted] = useState(false);
  const stories = group?.stories || [];
  const story = stories[idx];
  const stopFnRef = useRef(null);

  useEffect(() => { setIdx(0); }, [group?.authorId]);

  useEffect(() => {
    if (!story) return;
    const timer = setTimeout(() => {
      if (idx < stories.length - 1) setIdx(idx + 1);
      else onClose();
    }, 5000);
    return () => clearTimeout(timer);
  }, [idx, story, stories.length, onClose]);

  // Play the story's song — a real 30-second preview from the online search if one was picked,
  // otherwise the generated tune — and stop it whenever the story/mute state changes or the viewer closes.
  useEffect(() => {
    if (stopFnRef.current) { stopFnRef.current(); stopFnRef.current = null; }
    if (story?.song && !muted) {
      if (story.songPreviewUrl) {
        const audio = new Audio(story.songPreviewUrl);
        audio.volume = 0.5;
        audio.loop = true;
        audio.play().catch(() => {});
        stopFnRef.current = () => { audio.pause(); audio.currentTime = 0; };
      } else {
        stopFnRef.current = playGeneratedSong(story.song, { volume: 0.06 });
      }
    }
    return () => { if (stopFnRef.current) { stopFnRef.current(); stopFnRef.current = null; } };
  }, [story?.id, story?.song, story?.songPreviewUrl, muted]);

  if (!group || !story) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: '#000' }}>
      <div className="relative w-full h-full max-w-md mx-auto flex flex-col">
        <div className="absolute top-3 left-3 right-3 flex gap-1 z-10">
          {stories.map((s, i) => (
            <div key={s.id} className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.3)' }}>
              <div className="h-full rounded-full" style={{ background: '#fff', width: i < idx ? '100%' : i === idx ? '100%' : '0%', transition: i === idx ? 'width 5s linear' : 'none' }} />
            </div>
          ))}
        </div>
        <div className="absolute top-7 left-3 right-3 flex items-center justify-between z-10">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center font-body text-xs font-bold" style={{ background: THEME.lavender, color: THEME.ink }}>
              {group.authorName?.[0]?.toUpperCase() || '?'}
            </div>
            <span className="font-body text-sm font-semibold text-white">{group.authorName}</span>
            <span className="font-body text-[10px] text-white opacity-70">{t('storyExpiresIn', { time: timeLeftLabel(story.expiresAt) })}</span>
          </div>
          <div className="flex items-center gap-3">
            {story.song && (
              <button onClick={() => setMuted(m => !m)} aria-label={muted ? t('unmute') : t('mute')}>
                {muted ? <Music size={18} color="#fff" style={{ opacity: 0.5 }} /> : <Music2 size={18} color="#fff" />}
              </button>
            )}
            {story.authorId === currentUserId && (
              <button onClick={() => onDelete(story.id)} aria-label={t('deleteStory')}><Trash2 size={18} color="#fff" /></button>
            )}
            <button onClick={onClose} aria-label={t('close')}><X size={20} color="#fff" /></button>
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center relative" onClick={(e) => {
          const x = e.clientX; const w = e.currentTarget.clientWidth;
          if (x < w / 2) { if (idx > 0) setIdx(idx - 1); } else { if (idx < stories.length - 1) setIdx(idx + 1); else onClose(); }
        }}>
          {story.imageData
            ? <img src={story.imageData} alt="" className="max-h-full max-w-full object-contain" />
            : <div className="w-full h-full flex items-center justify-center p-8" style={{ background: `linear-gradient(160deg, ${THEME.duskDeep}, ${THEME.duskMid2})` }}>
                <p className="font-display text-2xl text-center" style={{ color: THEME.textLight }}>{story.caption}</p>
              </div>}
        </div>

        {(story.caption && story.imageData) && (
          <p className="absolute bottom-16 left-4 right-4 font-body text-sm text-white text-center" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.6)' }}>{story.caption}</p>
        )}
        {story.song && (
          <button onClick={() => setMuted(m => !m)}
            className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-1.5 rounded-full px-3 py-1.5 max-w-[80%]"
            style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)' }}>
            {story.songArt
              ? <img src={story.songArt} alt="" className="w-4 h-4 rounded-full flex-shrink-0" />
              : <Music2 size={13} color="#fff" className={muted ? '' : 'anim-pulse-slow'} />}
            <span className="font-body text-xs text-white truncate">{story.song}</span>
          </button>
        )}
      </div>
    </div>
  );
}

function AddStoryModal({ open, onClose, onSubmit }) {
  const t = useT();
  const [imageData, setImageData] = useState(null);
  const [caption, setCaption] = useState('');
  const [songName, setSongName] = useState('');
  const [previewing, setPreviewing] = useState(false);
  const [songResults, setSongResults] = useState([]);
  const [songSearching, setSongSearching] = useState(false);
  const [songSearched, setSongSearched] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null); // real audio preview URL from the online search
  const [songArt, setSongArt] = useState(null);
  const previewStopRef = useRef(null);
  const audioRef = useRef(null);

  const stopPreview = () => {
    if (previewStopRef.current) { previewStopRef.current(); previewStopRef.current = null; }
    if (audioRef.current) { audioRef.current.pause(); audioRef.current.currentTime = 0; audioRef.current = null; }
    setPreviewing(false);
  };

  useEffect(() => () => stopPreview(), []); // stop any preview audio when the modal unmounts

  if (!open) return null;
  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file || file.size > 5 * 1024 * 1024) return;
    const reader = new FileReader();
    reader.onload = () => setImageData(reader.result);
    reader.readAsDataURL(file);
  };
  const reset = () => {
    stopPreview(); setImageData(null); setCaption(''); setSongName('');
    setSongResults([]); setSongSearching(false); setSongSearched(false); setPreviewUrl(null); setSongArt(null);
  };
  const submit = () => {
    if (!imageData && !caption.trim()) return;
    onSubmit({ imageData, caption: caption.trim(), song: songName.trim() || null, songPreviewUrl: previewUrl, songArt });
    reset(); onClose();
  };
  // Searches the real, worldwide iTunes song catalog (no API key needed) so any song that exists
  // online can be found by name — not just the generative suggestion chips.
  const searchSongs = async () => {
    const q = songName.trim();
    if (!q) return;
    setSongSearching(true);
    setSongSearched(true);
    setSongResults([]);
    try {
      const res = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(q)}&media=music&entity=song&limit=8`);
      const data = await res.json();
      setSongResults(data.results || []);
    } catch (_) {
      setSongResults([]);
    } finally {
      setSongSearching(false);
    }
  };
  const selectSong = (track) => {
    stopPreview();
    setSongName(`${track.trackName} — ${track.artistName}`);
    setPreviewUrl(track.previewUrl || null);
    setSongArt(track.artworkUrl100 || track.artworkUrl60 || null);
    setSongResults([]);
  };
  const togglePreview = () => {
    if (previewing) { stopPreview(); return; }
    if (!songName.trim()) return;
    if (previewUrl) {
      const audio = new Audio(previewUrl);
      audio.volume = 0.5;
      audio.onended = () => setPreviewing(false);
      audio.play().catch(() => setPreviewing(false));
      audioRef.current = audio;
      setPreviewing(true);
    } else {
      previewStopRef.current = playGeneratedSong(songName.trim(), { volume: 0.06 });
      setPreviewing(true);
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex items-end sm:items-center justify-center p-4" style={{ background: 'rgba(27,21,51,0.75)' }}>
      <div className="w-full max-w-sm rounded-2xl p-5 max-h-[85vh] overflow-y-auto" style={{ background: THEME.paper }}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-display text-lg" style={{ color: THEME.ink }}>{t('createStory')}</h3>
          <button onClick={() => { reset(); onClose(); }}><X size={18} style={{ color: THEME.ink }} /></button>
        </div>

        {imageData ? (
          <div className="relative mb-3">
            <img src={imageData} alt="" className="rounded-lg w-full max-h-64 object-cover" />
            <button onClick={() => setImageData(null)} className="absolute top-2 right-2 rounded-full p-1" style={{ background: 'rgba(0,0,0,0.5)' }}>
              <X size={14} color="#fff" />
            </button>
          </div>
        ) : (
          <label className="flex flex-col items-center justify-center gap-2 mb-3 rounded-xl py-8 cursor-pointer border-2 border-dashed"
            style={{ borderColor: THEME.paperShadow, color: THEME.roseDark }}>
            <Camera size={22} />
            <span className="font-body text-xs">{t('addPhotoForStory')}</span>
            <input type="file" accept="image/*" onChange={handleFile} className="hidden" />
          </label>
        )}

        <textarea value={caption} onChange={e => setCaption(e.target.value)} placeholder={t('captionOptional')}
          rows={2} className="w-full rounded-lg px-3 py-2 mb-3 font-body text-sm outline-none resize-none" style={{ background: THEME.paperShadow, color: THEME.ink }} />

        <p className="font-body text-xs font-semibold mb-1.5 flex items-center gap-1" style={{ color: THEME.ink }}>
          <Music size={13} /> {t('addSongOptional')}
        </p>
        <p className="font-body text-[11px] mb-1.5" style={{ color: THEME.ink, opacity: 0.55 }}>{t('songSearchHint')}</p>
        <div className="flex items-center gap-1.5 rounded-lg px-3 py-2 mb-2" style={{ background: THEME.paperShadow }}>
          {songArt && <img src={songArt} alt="" className="w-6 h-6 rounded flex-shrink-0" />}
          <input value={songName}
            onChange={e => { setSongName(e.target.value); setPreviewUrl(null); setSongArt(null); setSongSearched(false); stopPreview(); }}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); searchSongs(); } }}
            placeholder={t('typeSongName')}
            className="bg-transparent outline-none flex-1 min-w-0 font-body text-xs" style={{ color: THEME.ink }} />
          <button onClick={searchSongs} disabled={!songName.trim() || songSearching} aria-label={t('searchSong')}
            className="flex-shrink-0 p-1 rounded-full" style={{ opacity: songName.trim() ? 1 : 0.4 }}>
            {songSearching ? <Loader2 size={14} className="animate-spin" style={{ color: THEME.roseDark }} /> : <Search size={14} style={{ color: THEME.roseDark }} />}
          </button>
          <button onClick={togglePreview} disabled={!songName.trim()} className="font-body text-[10px] font-semibold flex-shrink-0 flex items-center gap-1"
            style={{ color: THEME.roseDark, opacity: songName.trim() ? 1 : 0.4 }}>
            <Music2 size={12} /> {previewing ? t('stopPreview') : t('previewSong')}
          </button>
        </div>

        {songSearching && (
          <p className="font-body text-[11px] mb-2" style={{ color: THEME.ink, opacity: 0.55 }}>{t('searchingSongs')}</p>
        )}
        {!songSearching && songSearched && songResults.length === 0 && (
          <p className="font-body text-[11px] mb-2" style={{ color: THEME.ink, opacity: 0.55 }}>{t('noSongResults')}</p>
        )}
        {songResults.length > 0 && (
          <div className="flex flex-col gap-0.5 mb-3 max-h-40 overflow-y-auto rounded-lg" style={{ background: THEME.paperShadow }}>
            {songResults.map(tk => (
              <button key={tk.trackId} onClick={() => selectSong(tk)}
                className="flex items-center gap-2 px-2 py-1.5 text-left rounded-lg" style={{ color: THEME.ink }}>
                {tk.artworkUrl60 && <img src={tk.artworkUrl60} alt="" className="w-8 h-8 rounded flex-shrink-0" />}
                <div className="min-w-0">
                  <p className="font-body text-xs font-semibold truncate">{tk.trackName}</p>
                  <p className="font-body text-[10px] truncate" style={{ opacity: 0.6 }}>{tk.artistName}</p>
                </div>
              </button>
            ))}
          </div>
        )}

        <div className="flex flex-wrap gap-1.5 mb-4">
          {STORY_SONG_SUGGESTIONS.map(label => (
            <button key={label} onClick={() => { setSongName(label); setPreviewUrl(null); setSongArt(null); setSongSearched(false); stopPreview(); }} className="rounded-full px-2.5 py-1 text-[11px] font-body"
              style={{ background: songName === label ? THEME.roseDark : THEME.paper, color: songName === label ? THEME.textLight : THEME.ink, border: `1px solid ${THEME.paperShadow}` }}>
              🎵 {label}
            </button>
          ))}
        </div>

        <p className="font-body text-[11px] text-center mb-3" style={{ color: THEME.ink, opacity: 0.5 }}>{t('storyDisappears')}</p>
        <button onClick={submit} disabled={!imageData && !caption.trim()} className="w-full rounded-lg py-2.5 font-body text-sm font-semibold"
          style={{ background: THEME.roseDark, color: THEME.textLight, opacity: (!imageData && !caption.trim()) ? 0.5 : 1 }}>
          {t('shareToStory')}
        </button>
      </div>
    </div>
  );
}

function ShareModal({ post, onClose }) {
  const t = useT();
  const [copied, setCopied] = useState(false);
  const textRef = useRef(null);
  const shareText = post ? t('sharePostText', { name: post.authorName, text: post.text }) : '';

  useEffect(() => {
    if (post && textRef.current) {
      textRef.current.focus();
      textRef.current.select();
    }
  }, [post]);

  if (!post) return null;

  const copy = async () => {
    let ok = false;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      try { await navigator.clipboard.writeText(shareText); ok = true; } catch (_) {}
    }
    if (!ok && textRef.current) {
      try {
        textRef.current.select();
        ok = document.execCommand('copy');
      } catch (_) {}
    }
    if (ok) { setCopied(true); setTimeout(() => setCopied(false), 1500); }
  };

  return (
    <div className="fixed inset-0 z-40 flex items-end sm:items-center justify-center p-4" style={{ background: 'rgba(27,21,51,0.75)' }}>
      <div className="w-full max-w-sm rounded-2xl p-5" style={{ background: THEME.paper }}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-display text-lg" style={{ color: THEME.ink }}>{t('shareTitle')}</h3>
          <button onClick={onClose}><X size={18} style={{ color: THEME.ink }} /></button>
        </div>
        <p className="font-body text-xs mb-2" style={{ color: THEME.ink, opacity: 0.6 }}>{t('shareFallbackHint')}</p>
        <textarea ref={textRef} readOnly value={shareText} rows={3}
          onFocus={e => e.target.select()}
          className="w-full rounded-lg px-3 py-2 mb-3 font-body text-sm outline-none resize-none"
          style={{ background: THEME.paperShadow, color: THEME.ink }} />
        <button onClick={copy} className="w-full rounded-lg py-2.5 font-body text-sm font-semibold flex items-center justify-center gap-2"
          style={{ background: THEME.roseDark, color: THEME.textLight }}>
          {copied ? <Check size={15} /> : <Share2 size={15} />} {copied ? t('linkCopied') : t('copyText')}
        </button>
      </div>
    </div>
  );
}

function MehfilTab({ posts, loading, currentUser, profiles, onAdd, onLike, onComment, onConnect, onDelete, onViewProfile,
  stories, onAddStory, onDeleteStory }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState('compose'); // 'compose' | 'review'
  const [text, setText] = useState('');
  const [imageData, setImageData] = useState(null);
  const [feeling, setFeeling] = useState('');
  const [feelingPickerOpen, setFeelingPickerOpen] = useState(false);
  const [location, setLocation] = useState('');
  const [locating, setLocating] = useState(false);
  const [commentDrafts, setCommentDrafts] = useState({});
  const [copiedId, setCopiedId] = useState(null);
  const [addStoryOpen, setAddStoryOpen] = useState(false);
  const [viewingGroup, setViewingGroup] = useState(null);
  const [createMenuOpen, setCreateMenuOpen] = useState(false);

  const activeStories = (stories || []).filter(isStoryActive);
  const storyGroups = React.useMemo(() => {
    const byAuthor = {};
    activeStories.slice().sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)).forEach(s => {
      if (!byAuthor[s.authorId]) byAuthor[s.authorId] = { authorId: s.authorId, authorName: s.authorName, stories: [] };
      byAuthor[s.authorId].stories.push(s);
    });
    return Object.values(byAuthor);
  }, [activeStories]);

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file || file.size > 3 * 1024 * 1024) return;
    const reader = new FileReader();
    reader.onload = () => setImageData(reader.result);
    reader.readAsDataURL(file);
  };

  const resetCompose = () => { setText(''); setImageData(null); setFeeling(''); setLocation(''); setStep('compose'); };
  const goToReview = () => { if (!text.trim()) return; setStep('review'); };
  const confirmPost = () => {
    onAdd({ text: text.trim(), imageData, feeling: feeling || null, location: location.trim() || null });
    resetCompose(); setOpen(false);
  };

  const detectLocation = () => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => { setLocation(`${pos.coords.latitude.toFixed(3)}, ${pos.coords.longitude.toFixed(3)}`); setLocating(false); },
      () => setLocating(false),
      { timeout: 6000 }
    );
  };

  const [shareModalPost, setShareModalPost] = useState(null);

  const sharePost = async (p) => {
    const shareText = t('sharePostText', { name: p.authorName, text: p.text });
    if (navigator.share) {
      try {
        await navigator.share({ text: shareText });
        return;
      } catch (err) {
        if (err && err.name === 'AbortError') return; // person cancelled the native share sheet
        // otherwise fall through to clipboard/manual fallback below
      }
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      try {
        await navigator.clipboard.writeText(shareText);
        setCopiedId(p.id);
        setTimeout(() => setCopiedId(null), 1500);
        return;
      } catch (_) { /* blocked — fall back to the manual share modal */ }
    }
    setShareModalPost(p);
  };

  const feelingObj = FEELINGS.find(f => f.key === feeling);

  return (
    <div className="px-4 pb-24 pt-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-display text-xl" style={{ color: THEME.textLight }}>{t('community')}</h2>
        <div className="relative flex items-center gap-2">
          <button onClick={() => setCreateMenuOpen(o => !o)} className="p-2 rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }} aria-label={t('addStory')}>
            <Camera size={16} color={THEME.lavender} />
          </button>
          <button onClick={() => setOpen(true)} className="flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-body font-semibold"
            style={{ background: THEME.roseDark, color: THEME.textLight }}>
            <Plus size={14} /> {t('newPost')}
          </button>

          {createMenuOpen && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setCreateMenuOpen(false)} />
              <div className="absolute right-0 top-full mt-2 w-44 rounded-xl overflow-hidden z-40 anim-float"
                style={{ background: THEME.paper, boxShadow: '0 10px 30px rgba(0,0,0,0.35)' }}>
                <button onClick={() => { setCreateMenuOpen(false); setAddStoryOpen(true); }}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-left" style={{ borderBottom: `1px solid ${THEME.paperShadow}` }}>
                  <Camera size={15} style={{ color: THEME.roseDark }} />
                  <span className="font-body text-xs font-semibold" style={{ color: THEME.ink }}>{t('newStoryOption')}</span>
                </button>
                <button onClick={() => { setCreateMenuOpen(false); setOpen(true); }}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-left">
                  <Plus size={15} style={{ color: THEME.roseDark }} />
                  <span className="font-body text-xs font-semibold" style={{ color: THEME.ink }}>{t('newPostOption')}</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {(storyGroups.length > 0) && (
        <StoryBar storyGroups={storyGroups} currentUser={currentUser} profiles={profiles}
          onOpenGroup={setViewingGroup} onAddStory={() => setAddStoryOpen(true)} />
      )}

      {loading && <p className="font-body text-sm text-center py-10" style={{ color: THEME.lavender }}>{t('loadingPosts')}</p>}
      {!loading && posts.length === 0 && (
        <div className="text-center py-16 font-body text-sm" style={{ color: THEME.lavender }}>
          {t('noPostsYet')}<br />{t('beFirstToShare')}
        </div>
      )}

      <div className="flex flex-col gap-4">
        {posts.slice().reverse().map(p => {
          const liked = (p.likedBy || []).includes(currentUser.id);
          const connected = (p.connections || []).includes(currentUser.id);
          const pFeeling = FEELINGS.find(f => f.key === p.feeling);
          return (
            <div key={p.id} className="rounded-xl p-4" style={{ background: THEME.paper }}>
              <div className="flex items-center justify-between mb-2">
                <button onClick={() => onViewProfile(p.authorId, p.authorName)} className="flex items-center gap-2 text-left">
                  <div className="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center font-body text-xs font-bold"
                    style={{ background: THEME.lavender, color: THEME.ink, boxShadow: isUserPremium(profiles?.[p.authorId]) ? `0 0 0 2px ${THEME.gold}` : 'none' }}>
                    {profiles?.[p.authorId]?.photoData
                      ? <img src={profiles[p.authorId].photoData} alt="" className="w-full h-full object-cover" />
                      : (p.authorName?.[0]?.toUpperCase() || '?')}
                  </div>
                  <div>
                    <p className="font-body text-sm font-semibold flex items-center gap-1 flex-wrap" style={{ color: THEME.ink }}>
                      {p.authorName} {isUserPremium(profiles?.[p.authorId]) && <VerifiedBadge size={11} />}
                      {pFeeling && <span className="font-normal opacity-70">· {t('feelingWord', { feeling: `${pFeeling.emoji} ${pFeeling.label}` })}</span>}
                    </p>
                    <p className="font-body text-xs flex items-center gap-1 flex-wrap" style={{ color: THEME.ink, opacity: 0.5 }}>
                      {new Date(p.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                      {p.location && <span className="flex items-center gap-0.5">· <MapPin size={10} />{p.location}</span>}
                    </p>
                  </div>
                </button>
                {p.authorId === currentUser.id ? (
                  <button onClick={() => onDelete(p.id)} className="opacity-40 hover:opacity-100" aria-label="Delete post">
                    <Trash2 size={16} style={{ color: THEME.ink }} />
                  </button>
                ) : (
                  <button onClick={() => onConnect(p.id)} disabled={connected} className="text-xs font-body font-semibold rounded-full px-2.5 py-1"
                    style={{ background: connected ? THEME.paperShadow : THEME.lavender, color: THEME.ink }}>
                    {connected ? t('connected') : t('connect')}
                  </button>
                )}
              </div>
              <p className="font-body text-sm mb-2" style={{ color: THEME.ink }}>{p.text}</p>
              {p.imageData && <img src={p.imageData} alt="" className="rounded-lg mb-2 max-h-64 w-full object-cover" />}
              <div className="flex items-center gap-4 mt-2 mb-2">
                <button onClick={() => onLike(p.id)} className="flex items-center gap-1 text-xs font-body" style={{ color: liked ? THEME.roseDark : THEME.ink, opacity: liked ? 1 : 0.6 }}>
                  <ThumbsUp size={14} /> {(p.likedBy || []).length}
                </button>
                <span className="flex items-center gap-1 text-xs font-body" style={{ color: THEME.ink, opacity: 0.6 }}>
                  <MessageCircle size={14} /> {(p.comments || []).length}
                </span>
                <button onClick={() => sharePost(p)} className="flex items-center gap-1 text-xs font-body ml-auto" style={{ color: THEME.ink, opacity: 0.6 }}>
                  <Share2 size={14} /> {copiedId === p.id ? t('linkCopied') : t('shareOption')}
                </button>
              </div>
              {(p.comments || []).length > 0 && (
                <div className="flex flex-col gap-1 mb-2 border-t pt-2" style={{ borderColor: THEME.paperShadow }}>
                  {p.comments.map((c, i) => (
                    <p key={i} className="font-body text-xs" style={{ color: THEME.ink }}>
                      <span className="font-semibold">{c.authorName}: </span>{c.text}
                    </p>
                  ))}
                </div>
              )}
              <div className="flex items-center gap-2">
                <input value={commentDrafts[p.id] || ''} onChange={e => setCommentDrafts({ ...commentDrafts, [p.id]: e.target.value })}
                  placeholder={t('writeComment')} className="flex-1 rounded-full px-3 py-1.5 font-body text-xs outline-none" style={{ background: THEME.paperShadow, color: THEME.ink }} />
                <button onClick={() => { if ((commentDrafts[p.id] || '').trim()) { onComment(p.id, commentDrafts[p.id].trim()); setCommentDrafts({ ...commentDrafts, [p.id]: '' }); } }}
                  className="text-xs font-body font-semibold" style={{ color: THEME.roseDark }}>{t('send')}</button>
              </div>
            </div>
          );
        })}
      </div>

      {open && step === 'compose' && (
        <div className="fixed inset-0 z-30 flex items-end sm:items-center justify-center p-4" style={{ background: 'rgba(27,21,51,0.7)' }}>
          <div className="w-full max-w-sm rounded-2xl p-5 max-h-[85vh] overflow-y-auto" style={{ background: THEME.paper }}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-display text-lg" style={{ color: THEME.ink }}>{t('newPostModal')}</h3>
              <button onClick={() => { setOpen(false); resetCompose(); }}><X size={18} style={{ color: THEME.ink }} /></button>
            </div>
            <textarea value={text} onChange={e => setText(e.target.value)} placeholder={t('whatsOnYourMind')}
              rows={4} className="w-full rounded-lg px-3 py-2 mb-2 font-body text-sm outline-none resize-none" style={{ background: THEME.paperShadow, color: THEME.ink }} />
            <label className="flex items-center gap-2 mb-3 text-xs font-body cursor-pointer" style={{ color: THEME.roseDark }}>
              <ImageIcon size={14} /> {t('addPhotoOptional')}
              <input type="file" accept="image/*" onChange={handleFile} className="hidden" />
            </label>
            {imageData && <img src={imageData} alt="" className="rounded-md mb-3 max-h-32 object-cover" />}

            <div className="flex flex-col gap-2 mb-3">
              <button onClick={() => setFeelingPickerOpen(!feelingPickerOpen)}
                className="flex items-center gap-2 rounded-lg px-3 py-2 font-body text-xs" style={{ background: THEME.paperShadow, color: THEME.ink }}>
                <Smile size={14} style={{ color: THEME.roseDark }} />
                {feelingObj ? `${feelingObj.emoji} ${t('feelingWord', { feeling: feelingObj.label })}` : t('addFeelingOptional')}
              </button>
              {feelingPickerOpen && (
                <div className="flex flex-wrap gap-1.5 rounded-lg p-2" style={{ background: THEME.paperShadow }}>
                  {FEELINGS.map(f => (
                    <button key={f.key} onClick={() => { setFeeling(feeling === f.key ? '' : f.key); setFeelingPickerOpen(false); }}
                      className="rounded-full px-2 py-1 text-[11px] font-body flex items-center gap-1"
                      style={{ background: feeling === f.key ? THEME.roseDark : THEME.paper, color: feeling === f.key ? THEME.textLight : THEME.ink }}>
                      {f.emoji} {f.label}
                    </button>
                  ))}
                </div>
              )}

              <div className="flex items-center gap-2 rounded-lg px-3 py-2" style={{ background: THEME.paperShadow }}>
                <MapPin size={14} style={{ color: THEME.roseDark }} />
                <input value={location} onChange={e => setLocation(e.target.value)} placeholder={t('locationPlaceholder')}
                  className="bg-transparent outline-none flex-1 font-body text-xs" style={{ color: THEME.ink }} />
                <button onClick={detectLocation} className="font-body text-[10px] font-semibold flex-shrink-0" style={{ color: THEME.roseDark }}>
                  {locating ? t('detecting') : t('useMyLocation')}
                </button>
              </div>
            </div>

            <button onClick={goToReview} disabled={!text.trim()} className="w-full rounded-lg py-2.5 font-body text-sm font-semibold mt-1"
              style={{ background: THEME.roseDark, color: THEME.textLight, opacity: text.trim() ? 1 : 0.5 }}>
              {t('reviewPost')}
            </button>
          </div>
        </div>
      )}

      {open && step === 'review' && (
        <div className="fixed inset-0 z-30 flex items-end sm:items-center justify-center p-4" style={{ background: 'rgba(27,21,51,0.7)' }}>
          <div className="w-full max-w-sm rounded-2xl p-5 max-h-[85vh] overflow-y-auto" style={{ background: THEME.paper }}>
            <div className="flex items-center gap-2 mb-1">
              <button onClick={() => setStep('compose')}><ChevronLeft size={18} style={{ color: THEME.ink }} /></button>
              <h3 className="font-display text-lg" style={{ color: THEME.ink }}>{t('reviewPost')}</h3>
            </div>
            <p className="font-body text-xs mb-3" style={{ color: THEME.ink, opacity: 0.6 }}>{t('reviewPostSub')}</p>

            <div className="rounded-xl p-4 mb-4" style={{ background: THEME.paperShadow }}>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center font-body text-xs font-bold"
                  style={{ background: THEME.lavender, color: THEME.ink }}>
                  {profiles?.[currentUser.id]?.photoData
                    ? <img src={profiles[currentUser.id].photoData} alt="" className="w-full h-full object-cover" />
                    : (currentUser.name?.[0]?.toUpperCase() || '?')}
                </div>
                <div>
                  <p className="font-body text-sm font-semibold" style={{ color: THEME.ink }}>
                    {currentUser.name} {feelingObj && <span className="font-normal opacity-70">· {feelingObj.emoji} {feelingObj.label}</span>}
                  </p>
                  {location.trim() && (
                    <p className="font-body text-xs flex items-center gap-0.5" style={{ color: THEME.ink, opacity: 0.5 }}>
                      <MapPin size={10} />{location.trim()}
                    </p>
                  )}
                </div>
              </div>
              <p className="font-body text-sm mb-2" style={{ color: THEME.ink }}>{text}</p>
              {imageData && <img src={imageData} alt="" className="rounded-lg max-h-56 w-full object-cover" />}
            </div>

            <div className="flex gap-2">
              <button onClick={() => setStep('compose')} className="flex-1 rounded-lg py-2.5 font-body text-sm font-semibold"
                style={{ background: THEME.paperShadow, color: THEME.ink }}>
                {t('editPost')}
              </button>
              <button onClick={confirmPost} className="flex-1 rounded-lg py-2.5 font-body text-sm font-semibold"
                style={{ background: THEME.roseDark, color: THEME.textLight }}>
                {t('confirmAndPost')}
              </button>
            </div>
          </div>
        </div>
      )}

      <AddStoryModal open={addStoryOpen} onClose={() => setAddStoryOpen(false)} onSubmit={onAddStory} />
      <ShareModal post={shareModalPost} onClose={() => setShareModalPost(null)} />
      {viewingGroup && (
        <StoryViewerModal group={viewingGroup} currentUserId={currentUser.id}
          onClose={() => setViewingGroup(null)}
          onDelete={(storyId) => { onDeleteStory(storyId); setViewingGroup(null); }} />
      )}
    </div>
  );
}

function TabBar({ active, setActive }) {
  const t = useT();
  const tabs = [
    { id: 'diary', label: t('tabDiary'), icon: BookOpen },
    { id: 'companion', label: t('tabCompanion'), icon: Heart },
    { id: 'mehfil', label: t('tabCommunity'), icon: Users },
  ];
  return (
    <div className="fixed bottom-0 left-0 right-0 flex justify-center px-3 pb-3" style={{ background: `linear-gradient(180deg, transparent, ${THEME.duskDeep} 35%)`, paddingTop: 18 }}>
      <div className="flex justify-around w-full max-w-sm rounded-2xl py-1.5 px-1.5"
        style={{ background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(14px)', border: '1px solid rgba(255,255,255,0.08)' }}>
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = active === tab.id;
          return (
            <button key={tab.id} onClick={() => setActive(tab.id)} className="flex flex-col items-center gap-0.5 px-5 py-1.5 rounded-xl transition-all"
              style={{ background: isActive ? 'rgba(232,146,124,0.16)' : 'transparent' }}>
              <Icon size={19} color={isActive ? THEME.rose : THEME.lavender} style={{ opacity: isActive ? 1 : 0.55 }} />
              <span className="font-body text-[10px]" style={{ color: isActive ? THEME.rose : THEME.lavender, opacity: isActive ? 1 : 0.55 }}>{tab.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function MessagesPanel({ open, onClose, threads, currentUserId, profiles, activeThreadId, onOpenThread, onBackToList, onSend }) {
  const t = useT();
  const [input, setInput] = useState('');
  const [threadSearch, setThreadSearch] = useState('');
  const [msgSearchOpen, setMsgSearchOpen] = useState(false);
  const [msgSearch, setMsgSearch] = useState('');
  const bottomRef = useRef(null);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [activeThreadId, threads, open]);
  useEffect(() => { setMsgSearchOpen(false); setMsgSearch(''); }, [activeThreadId]);
  if (!open) return null;

  const myThreads = Object.entries(threads || {})
    .filter(([, th]) => th.participants.includes(currentUserId))
    .sort((a, b) => {
      const at = a[1].messages[a[1].messages.length - 1]?.at || '';
      const bt = b[1].messages[b[1].messages.length - 1]?.at || '';
      return bt.localeCompare(at);
    });

  const q = threadSearch.trim().toLowerCase();
  const filteredThreads = q
    ? myThreads.filter(([, th]) => {
        const oid = th.participants.find(id => id !== currentUserId);
        const oname = (th.names[oid] || '').toLowerCase();
        const last = th.messages[th.messages.length - 1]?.text?.toLowerCase() || '';
        return oname.includes(q) || last.includes(q);
      })
    : myThreads;

  const active = activeThreadId ? threads[activeThreadId] : null;
  const otherId = active ? active.participants.find(id => id !== currentUserId) : null;
  const otherName = active && otherId ? active.names[otherId] : '';
  const otherProfile = otherId ? profiles?.[otherId] : null;

  const mq = msgSearch.trim().toLowerCase();
  const visibleMessages = active ? (mq ? active.messages.filter(m => m.text.toLowerCase().includes(mq)) : active.messages) : [];

  const submit = (e) => { e.preventDefault(); if (!input.trim()) return; onSend(input.trim()); setInput(''); };

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: THEME.duskDeep }}>
      <div className="flex items-center gap-3 px-4 py-3 border-b flex-shrink-0" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
        <button onClick={active ? onBackToList : onClose} className="p-1" aria-label="Back">
          <ArrowLeft size={18} color={THEME.textLight} />
        </button>
        {active ? (
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center font-body text-xs font-bold flex-shrink-0"
              style={{ background: THEME.lavender, color: THEME.ink, boxShadow: isUserPremium(otherProfile) ? `0 0 0 2px ${THEME.gold}` : 'none' }}>
              {otherProfile?.photoData ? <img src={otherProfile.photoData} alt="" className="w-full h-full object-cover" /> : (otherName?.[0]?.toUpperCase() || '?')}
            </div>
            <p className="font-display text-base flex items-center gap-1 flex-1 min-w-0 truncate" style={{ color: THEME.textLight }}>
              {otherName} {isUserPremium(otherProfile) && <VerifiedBadge size={13} />}
            </p>
            <button onClick={() => setMsgSearchOpen(o => !o)} className="p-1.5 rounded-full flex-shrink-0" style={{ background: msgSearchOpen ? 'rgba(232,146,124,0.2)' : 'transparent' }} aria-label="Search in conversation">
              <Search size={16} color={THEME.lavender} />
            </button>
          </div>
        ) : (
          <p className="font-display text-lg" style={{ color: THEME.textLight }}>{t('messages')}</p>
        )}
      </div>

      {!active ? (
        <div className="flex-1 overflow-y-auto scrollbar-thin px-4 py-3">
          <div className="flex items-center gap-2 rounded-full px-3 py-2 mb-3" style={{ background: 'rgba(255,255,255,0.06)' }}>
            <Search size={14} color={THEME.lavender} />
            <input value={threadSearch} onChange={e => setThreadSearch(e.target.value)} placeholder={t('searchConversations')}
              className="bg-transparent outline-none w-full font-body text-sm" style={{ color: THEME.textLight }} />
          </div>
          {filteredThreads.length === 0 && (
            <div className="text-center py-16 font-body text-sm" style={{ color: THEME.lavender }}>
              {q ? t('searchByIdEmpty') : (<>{t('noConversationsYet')}<br />{t('noConversationsSub')}</>)}
            </div>
          )}
          <div className="flex flex-col gap-2">
            {filteredThreads.map(([tid, th]) => {
              const oid = th.participants.find(id => id !== currentUserId);
              const oname = th.names[oid];
              const oprofile = profiles?.[oid];
              const last = th.messages[th.messages.length - 1];
              return (
                <button key={tid} onClick={() => onOpenThread(tid)} className="flex items-center gap-3 rounded-xl p-3 text-left card-hover" style={{ background: 'rgba(255,255,255,0.05)' }}>
                  <div className="w-10 h-10 rounded-full overflow-hidden flex items-center justify-center font-body text-sm font-bold flex-shrink-0"
                    style={{ background: THEME.lavender, color: THEME.ink, boxShadow: isUserPremium(oprofile) ? `0 0 0 2px ${THEME.gold}` : 'none' }}>
                    {oprofile?.photoData ? <img src={oprofile.photoData} alt="" className="w-full h-full object-cover" /> : (oname?.[0]?.toUpperCase() || '?')}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-body text-sm font-semibold flex items-center gap-1" style={{ color: THEME.textLight }}>
                      {oname} {isUserPremium(oprofile) && <VerifiedBadge size={12} />}
                    </p>
                    <p className="font-body text-xs truncate" style={{ color: THEME.lavender, opacity: 0.7 }}>
                      {last ? (last.senderId === currentUserId ? 'You: ' : '') + last.text : t('sayHelloTo', { name: '' }).replace('!', '...')}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <>
          {msgSearchOpen && (
            <div className="flex items-center gap-2 rounded-full px-3 py-2 mx-4 mt-3" style={{ background: 'rgba(255,255,255,0.06)' }}>
              <Search size={14} color={THEME.lavender} />
              <input autoFocus value={msgSearch} onChange={e => setMsgSearch(e.target.value)} placeholder={t('searchConversations')}
                className="bg-transparent outline-none w-full font-body text-sm" style={{ color: THEME.textLight }} />
            </div>
          )}
          <div className="flex-1 overflow-y-auto scrollbar-thin px-4 pt-4 pb-2">
            {active.messages.length === 0 && (
              <div className="text-center py-10 font-body text-sm" style={{ color: THEME.lavender }}>
                {t('sayHelloTo', { name: otherName })}
              </div>
            )}
            {active.messages.length > 0 && mq && visibleMessages.length === 0 && (
              <div className="text-center py-10 font-body text-sm" style={{ color: THEME.lavender }}>{t('searchByIdEmpty')}</div>
            )}
            <div className="flex flex-col gap-3">
              {visibleMessages.map((m, i) => (
                <div key={i} className={`rounded-2xl px-4 py-2.5 font-body text-sm anim-float ${m.senderId === currentUserId ? 'self-end' : 'self-start'}`}
                  style={{
                    maxWidth: '80%',
                    background: m.senderId === currentUserId ? THEME.roseDark : THEME.paper,
                    color: m.senderId === currentUserId ? THEME.textLight : THEME.ink,
                    borderBottomRightRadius: m.senderId === currentUserId ? 4 : 16,
                    borderBottomLeftRadius: m.senderId === currentUserId ? 16 : 4,
                  }}>
                  {m.text}
                </div>
              ))}
            </div>
            <div ref={bottomRef} />
          </div>
          <div className="flex items-center gap-2 px-4 py-3 border-t flex-shrink-0" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
            <input value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') submit(e); }} placeholder={t('messageWho', { name: otherName })}
              className="flex-1 rounded-full px-4 py-2.5 font-body text-sm outline-none" style={{ background: THEME.paper, color: THEME.ink }} />
            <button type="button" onClick={submit} className="rounded-full p-2.5" style={{ background: THEME.roseDark }}>
              <Send size={16} color={THEME.textLight} />
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function PremiumPlanCard({ plan, selected, onSelect }) {
  return (
    <button onClick={() => onSelect(plan.key)} className="w-full text-left rounded-xl p-4 flex items-center justify-between transition-all"
      style={{
        background: selected ? 'linear-gradient(135deg, rgba(199,154,86,0.18), rgba(232,146,124,0.12))' : THEME.paperShadow,
        border: `1.5px solid ${selected ? THEME.gold : 'transparent'}`,
      }}>
      <div>
        <p className="font-body text-sm font-semibold flex items-center gap-2" style={{ color: THEME.ink }}>
          {plan.label}
          {plan.badge && <span className="font-body text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: THEME.gold, color: THEME.paper }}>{plan.badge}</span>}
        </p>
        <p className="font-body text-xs mt-0.5" style={{ color: THEME.ink, opacity: 0.6 }}>{plan.tagline}</p>
      </div>
      <p className="font-display text-lg" style={{ color: THEME.ink }}>₹{plan.price}</p>
    </button>
  );
}

function PremiumModal({ open, onClose, isPremium, currentPremium, onPurchase }) {
  const t = useT();
  const [step, setStep] = useState('plans');
  const [selectedPlan, setSelectedPlan] = useState('yearly');
  const [selectedMethod, setSelectedMethod] = useState(null);
  const [bank, setBank] = useState('');
  const [processing, setProcessing] = useState(false);
  const [paymentError, setPaymentError] = useState('');

  useEffect(() => {
    if (open) { setStep('plans'); setSelectedPlan('yearly'); setSelectedMethod(null); setBank(''); setProcessing(false); setPaymentError(''); }
  }, [open]);

  if (!open) return null;
  const plan = PREMIUM_PLANS.find(p => p.key === selectedPlan);

  const confirmPay = async () => {
    setPaymentError('');

    if (!RAZORPAY_KEY_ID || RAZORPAY_KEY_ID.includes('YOUR_KEY_ID')) {
      setPaymentError(t('paymentSetupNeeded'));
      return;
    }

    setProcessing(true);
    const loaded = await loadRazorpayScript();
    if (!loaded || !window.Razorpay) {
      setProcessing(false);
      setPaymentError(t('paymentLoadError'));
      return;
    }

    // Nudge Razorpay's own checkout UI toward the method the person tapped —
    // gpay/phonepe/qr all route through UPI, paytm through wallet, netbanking stays separate.
    const methodConfig = selectedMethod === 'netbanking'
      ? { netbanking: true, upi: false, card: false, wallet: false }
      : selectedMethod === 'paytm'
      ? { wallet: true, upi: false, card: false, netbanking: false }
      : { upi: true, card: false, netbanking: false, wallet: false };

    const options = {
      key: RAZORPAY_KEY_ID,
      amount: plan.price * 100, // Razorpay expects the amount in paise
      currency: 'INR',
      name: 'Sukoon Premium',
      description: `${plan.label} plan`,
      method: methodConfig,
      theme: { color: THEME.roseDark },
      handler: function (response) {
        onPurchase(selectedPlan, selectedMethod, response.razorpay_payment_id);
        setProcessing(false);
        setStep('success');
      },
      modal: {
        ondismiss: function () { setProcessing(false); },
      },
    };

    try {
      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', function () { setProcessing(false); setPaymentError(t('paymentLoadError')); });
      rzp.open();
    } catch (_) {
      setProcessing(false);
      setPaymentError(t('paymentLoadError'));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4" style={{ background: 'rgba(27,21,51,0.8)' }}>
      <div className="w-full max-w-sm rounded-2xl p-5 anim-float overflow-y-auto scrollbar-thin" style={{ background: THEME.paper, maxHeight: '90vh' }}>
        {step !== 'success' && (
          <div className="flex items-center justify-between mb-4">
            <button onClick={step === 'payment' ? () => setStep('plans') : onClose} className="flex items-center gap-1 text-xs font-body" style={{ color: THEME.ink, opacity: 0.6 }}>
              <ArrowLeft size={14} /> {step === 'payment' ? t('back') : t('close')}
            </button>
            <button onClick={onClose} aria-label="Close"><X size={18} style={{ color: THEME.ink }} /></button>
          </div>
        )}

        {step === 'plans' && (
          <>
            <div className="flex items-center gap-2 mb-1">
              <Crown size={20} color={THEME.gold} />
              <h3 className="font-display text-xl" style={{ color: THEME.ink }}>{t('sukoonPremium')}</h3>
            </div>
            {isPremium ? (
              <p className="font-body text-xs mb-4" style={{ color: THEME.ink, opacity: 0.65 }}>
                {t('onPlanUntil', {
                  plan: PREMIUM_PLANS.find(p => p.key === currentPremium?.plan)?.label || '',
                  date: currentPremium?.expiresAt ? new Date(currentPremium.expiresAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '-',
                })}
              </p>
            ) : (
              <p className="font-body text-xs mb-4" style={{ color: THEME.ink, opacity: 0.65 }}>{t('unlimitedDiaryBlueTick')}</p>
            )}

            <div className="flex flex-col gap-2 mb-4">
              <div className="flex items-center gap-2 font-body text-xs" style={{ color: THEME.ink, opacity: 0.7 }}>
                <BadgeCheck size={14} color={THEME.paper} fill={THEME.verifiedBlue} /> {t('blueTickFeature')}
              </div>
              <div className="flex items-center gap-2 font-body text-xs" style={{ color: THEME.ink, opacity: 0.7 }}>
                <BookOpen size={14} color={THEME.roseDark} /> {t('unlimitedDiaryFeature', { limit: FREE_DIARY_LIMIT })}
              </div>
            </div>

            <div className="flex flex-col gap-2.5 mb-5">
              {PREMIUM_PLANS.map(p => <PremiumPlanCard key={p.key} plan={p} selected={selectedPlan === p.key} onSelect={setSelectedPlan} />)}
            </div>

            <button onClick={() => setStep('payment')} className="w-full rounded-lg py-2.5 font-body text-sm font-semibold" style={{ background: THEME.roseDark, color: THEME.textLight }}>
              {t('continueWithPrice', { price: plan.price })}
            </button>
          </>
        )}

        {step === 'payment' && (
          <>
            <h3 className="font-display text-lg mb-1" style={{ color: THEME.ink }}>{t('choosePaymentMethod')}</h3>
            <p className="font-body text-xs mb-4" style={{ color: THEME.ink, opacity: 0.6 }}>{plan.label} · ₹{plan.price}</p>

            <div className="flex flex-col gap-2 mb-4">
              {PAYMENT_METHODS.map(m => {
                const Icon = m.icon;
                const sel = selectedMethod === m.key;
                return (
                  <button key={m.key} onClick={() => setSelectedMethod(m.key)} className="w-full flex items-center gap-3 rounded-lg px-3 py-2.5"
                    style={{ background: sel ? 'rgba(199,154,86,0.15)' : THEME.paperShadow, border: `1.5px solid ${sel ? THEME.gold : 'transparent'}` }}>
                    <span className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: `${m.color}22` }}>
                      <Icon size={15} color={m.color} />
                    </span>
                    <span className="font-body text-sm flex-1 text-left" style={{ color: THEME.ink }}>{m.label}</span>
                    {sel && <Check size={16} color={THEME.gold} />}
                  </button>
                );
              })}
            </div>

            {selectedMethod === 'netbanking' && (
              <select value={bank} onChange={e => setBank(e.target.value)} className="w-full rounded-lg px-3 py-2.5 mb-4 font-body text-sm outline-none" style={{ background: THEME.paperShadow, color: THEME.ink }}>
                <option value="">{t('selectYourBank')}</option>
                {['State Bank of India', 'HDFC Bank', 'ICICI Bank', 'Axis Bank', 'Punjab National Bank', 'Other'].map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            )}

            {selectedMethod === 'qr' && (
              <div className="flex flex-col items-center gap-2 mb-4 rounded-xl p-4" style={{ background: THEME.paperShadow }}>
                <div className="rounded-lg overflow-hidden" style={{ width: 148, height: 148, background: '#fff', padding: 8 }}>
                  <QrPattern seed={selectedPlan} />
                </div>
                <p className="font-body text-xs text-center" style={{ color: THEME.ink, opacity: 0.65 }}>{t('scanToPay', { price: plan.price })}</p>
              </div>
            )}

            {paymentError && (
              <p className="font-body text-[11px] text-center mb-2" style={{ color: '#C24545' }}>{paymentError}</p>
            )}

            {processing ? (
              <div className="w-full rounded-lg py-2.5 font-body text-sm font-semibold flex items-center justify-center gap-2" style={{ background: THEME.paperShadow, color: THEME.ink, opacity: 0.7 }}>
                <Loader2 size={16} className="animate-spin" /> {t('processingPayment')}
              </div>
            ) : (
              <button onClick={confirmPay} disabled={!selectedMethod || (selectedMethod === 'netbanking' && !bank)}
                className="w-full rounded-lg py-2.5 font-body text-sm font-semibold"
                style={{ background: THEME.roseDark, color: THEME.textLight, opacity: (!selectedMethod || (selectedMethod === 'netbanking' && !bank)) ? 0.55 : 1 }}>
                {t('payAmount', { price: plan.price })}
              </button>
            )}
          </>
        )}

        {step === 'success' && (
          <div className="flex flex-col items-center text-center py-4">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4" style={{ background: 'rgba(59,158,255,0.15)' }}>
              <BadgeCheck size={34} color={THEME.paper} fill={THEME.verifiedBlue} />
            </div>
            <h3 className="font-display text-xl mb-1" style={{ color: THEME.ink }}>{t('youreNowPremium')}</h3>
            <p className="font-body text-sm mb-6" style={{ color: THEME.ink, opacity: 0.65 }}>
              {t('premiumSuccessMsg')}
            </p>
            <button onClick={onClose} className="w-full rounded-lg py-2.5 font-body text-sm font-semibold" style={{ background: THEME.roseDark, color: THEME.textLight }}>
              {t('done')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function SettingsPanel({ open, onClose, language, onLanguageChange, onLogout, helpMessages, onSendHelp, helpSending, isPremium, onOpenPremium }) {
  const t = useT();
  const [view, setView] = useState('menu'); // 'menu' | 'terms' | 'privacy' | 'security' | 'support'
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-40 flex justify-end" style={{ background: 'rgba(27,21,51,0.6)' }} onClick={onClose}>
      <div className="w-full max-w-xs h-full overflow-y-auto scrollbar-thin p-5" style={{ background: THEME.paper }} onClick={e => e.stopPropagation()}>
        {view === 'menu' ? (
          <>
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-display text-xl" style={{ color: THEME.ink }}>{t('settings')}</h3>
              <button onClick={onClose}><X size={18} style={{ color: THEME.ink }} /></button>
            </div>

            <button onClick={onOpenPremium} className="w-full flex items-center justify-between rounded-xl p-3 mb-5"
              style={{ background: isPremium ? 'linear-gradient(135deg, rgba(199,154,86,0.18), rgba(232,146,124,0.12))' : THEME.paperShadow }}>
              <span className="flex items-center gap-2 font-body text-sm font-semibold" style={{ color: isPremium ? THEME.gold : THEME.ink }}>
                <Crown size={16} /> {isPremium ? 'Premium active' : t('getPremium')}
              </span>
              <ChevronRight size={16} style={{ color: THEME.ink, opacity: 0.5 }} />
            </button>

            <p className="font-body text-xs mb-1 font-semibold tracking-wide" style={{ color: THEME.ink, opacity: 0.5 }}>{t('saathiLanguage').toUpperCase()}</p>
            <div className="flex items-center gap-2 rounded-lg px-3 py-2.5 mb-5" style={{ background: THEME.paperShadow }}>
              <Globe size={16} style={{ color: THEME.roseDark }} />
              <select value={language} onChange={e => onLanguageChange(e.target.value)}
                className="bg-transparent outline-none w-full font-body text-sm" style={{ color: THEME.ink }}>
                {LANGUAGES.map(l => <option key={l} value={l}>{l}{!TRANSLATIONS[l] ? ' (English UI for now)' : ''}</option>)}
              </select>
            </div>

            <div className="flex flex-col">
              {[
                ['terms', t('termsTitle')],
                ['privacy', t('privacyTitle')],
                ['security', t('securityTitle')],
                ['support', t('supportTitle')],
              ].map(([key, label]) => (
                <button key={key} onClick={() => setView(key)} className="text-left py-3 border-b font-body text-sm" style={{ borderColor: THEME.paperShadow, color: THEME.ink }}>
                  {label}
                </button>
              ))}
            </div>

            <button onClick={onLogout} className="w-full mt-6 rounded-lg py-2.5 font-body text-sm font-semibold flex items-center justify-center gap-2"
              style={{ background: THEME.roseDark, color: THEME.textLight }}>
              <LogOut size={16} /> {t('logout')}
            </button>
          </>
        ) : (
          <>
            <button onClick={() => setView('menu')} className="flex items-center gap-1 text-xs mb-4 font-body" style={{ color: THEME.ink, opacity: 0.6 }}>
              <ArrowLeft size={14} /> {t('back')}
            </button>
            <h3 className="font-display text-lg mb-3" style={{ color: THEME.ink }}>
              {view === 'terms' ? t('termsTitle') : view === 'privacy' ? t('privacyTitle') : view === 'security' ? t('securityTitle') : t('supportTitle')}
            </h3>
            <div className="font-body text-xs leading-relaxed" style={{ color: THEME.ink, opacity: 0.75 }}>
              {view === 'terms' && (
                <p>{t('legalTerms')}</p>
              )}
              {view === 'privacy' && (
                <p>{t('legalPrivacy')}</p>
              )}
              {view === 'security' && (
                <p>{t('legalSecurity')}</p>
              )}
              {view === 'support' && (
                <div className="-mx-1">
                  <p className="mb-3">{t('helpIntro')}</p>
                  <HelpChat messages={helpMessages} onSend={onSendHelp} sending={helpSending} />
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function Sukoon() {
  const [screen, setScreen] = useState('landing');
  const [currentUser, setCurrentUser] = useState(null);
  const [activeTab, setActiveTab] = useState('diary');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');
  const [pendingAuth, setPendingAuth] = useState(null);
  const [otpInfo, setOtpInfo] = useState(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [language, setLanguage] = useState('English');

  const [entries, setEntries] = useState([]);
  const [entriesLoading, setEntriesLoading] = useState(true);
  const [messages, setMessages] = useState([]);
  const [chatSending, setChatSending] = useState(false);
  const [posts, setPosts] = useState([]);
  const [postsLoading, setPostsLoading] = useState(true);
  const [stories, setStories] = useState([]);
  const [profiles, setProfiles] = useState({});
  const [profileView, setProfileView] = useState(null);
  const [helpMessages, setHelpMessages] = useState([]);
  const [helpSending, setHelpSending] = useState(false);
  const [dmThreads, setDmThreads] = useState({});
  const [messagesOpen, setMessagesOpen] = useState(false);
  const [activeThreadId, setActiveThreadId] = useState(null);
  const [premiumOpen, setPremiumOpen] = useState(false);
  const [idSearchOpen, setIdSearchOpen] = useState(false);
  const [idSearchQuery, setIdSearchQuery] = useState('');
  const [idSearchResult, setIdSearchResult] = useState(undefined); // undefined = not searched, null = not found, object = found

  const usersCacheRef = useRef(null);
  const profilesCacheRef = useRef(null);
  const dmCacheRef = useRef(null);

  const loadUsers = async () => {
    if (usersCacheRef.current) return usersCacheRef.current;
    try {
      const res = await withTimeout(storage.get('users', true), 6000);
      usersCacheRef.current = res ? JSON.parse(res.value) : {};
    } catch (_) {
      usersCacheRef.current = {};
    }
    return usersCacheRef.current;
  };

  const persistUsers = (users) => {
    usersCacheRef.current = users;
    withTimeout(storage.set('users', JSON.stringify(users), true), 8000).catch(() => {});
  };

  const handleAuth = async (mode, { name, identifier, password }) => {
    setAuthError('');
    const key = identifier.trim().toLowerCase();
    if (!key || !password.trim()) { setAuthError('Please fill in all fields.'); return { ok: false }; }
    setAuthLoading(true);
    try {
      const users = await loadUsers();
      const hashed = await hashPassword(password);

      if (mode === 'signup') {
        if (users[key]) { setAuthError('An account with this email/mobile already exists.'); setAuthLoading(false); return { ok: false }; }
        setPendingAuth({ mode: 'signup', key, name: name.trim() || 'Friend', hashed });
        try {
          const otpResult = await sendRealOtp(key);
          setOtpInfo({ identifier: key, ...otpResult });
        } catch (_) {
          setAuthError("Couldn't send the verification code. Check the email/mobile number and try again.");
          setAuthLoading(false);
          return { ok: false };
        }
        setAuthLoading(false);
        return { ok: true, needsOtp: true };
      }

      if (mode === 'forgot') {
        if (!users[key]) { setAuthError('No account found with this email/mobile.'); setAuthLoading(false); return { ok: false }; }
        setPendingAuth({ mode: 'forgot', key, hashed });
        try {
          const otpResult = await sendRealOtp(key);
          setOtpInfo({ identifier: key, ...otpResult });
        } catch (_) {
          setAuthError("Couldn't send the verification code. Check the email/mobile number and try again.");
          setAuthLoading(false);
          return { ok: false };
        }
        setAuthLoading(false);
        return { ok: true, needsOtp: true };
      }

      const u = users[key];
      if (!u || u.password !== hashed) { setAuthError('Incorrect email/mobile or password.'); setAuthLoading(false); return { ok: false }; }
      // Already verified once at signup — log straight in, no OTP needed again.
      setCurrentUser({ id: key, name: u.name });
      setLanguage(u.language || 'English');
      setScreen('main');
      saveSession(key);
      setAuthLoading(false);
      return { ok: true };
    } catch (err) {
      setAuthError('Something went wrong. Please try again.');
      setAuthLoading(false);
      return { ok: false };
    }
  };

  const verifyOtp = async (code) => {
    if (!pendingAuth || !otpInfo) return { ok: false, error: 'Session expired, please try again.' };
    const correct = await verifyRealOtp(otpInfo, code);
    if (!correct) return { ok: false, error: 'Incorrect code. Please try again.' };

    if (pendingAuth.mode === 'forgot') {
      const users = usersCacheRef.current || {};
      const updated = { ...users, [pendingAuth.key]: { ...users[pendingAuth.key], password: pendingAuth.hashed } };
      persistUsers(updated);
      setPendingAuth(null);
      setOtpInfo(null);
      return { ok: true, passwordReset: true };
    }

    if (pendingAuth.mode === 'signup') {
      const users = { ...(usersCacheRef.current || {}), [pendingAuth.key]: { password: pendingAuth.hashed, name: pendingAuth.name, language: 'English' } };
      persistUsers(users);
      setCurrentUser({ id: pendingAuth.key, name: pendingAuth.name });
      setLanguage('English');
    } else {
      const users = usersCacheRef.current || {};
      const u = users[pendingAuth.key] || {};
      setCurrentUser({ id: pendingAuth.key, name: pendingAuth.name });
      setLanguage(u.language || 'English');
    }
    setScreen('main');
    setPendingAuth(null);
    setOtpInfo(null);
    saveSession(pendingAuth.key);
    return { ok: true };
  };

  const resendOtp = async () => {
    if (!pendingAuth) return;
    try {
      const otpResult = await sendRealOtp(pendingAuth.key);
      setOtpInfo({ identifier: pendingAuth.key, ...otpResult });
    } catch (_) {
      setAuthError("Couldn't resend the code. Please try again in a moment.");
    }
  };

  const changeLanguage = (lang) => {
    setLanguage(lang);
    if (!currentUser) return;
    const users = { ...(usersCacheRef.current || {}) };
    if (users[currentUser.id]) {
      users[currentUser.id] = { ...users[currentUser.id], language: lang };
      persistUsers(users);
    }
  };

  const handleLogout = () => {
    clearSession();
    setCurrentUser(null); setEntries([]); setMessages([]); setSettingsOpen(false);
    setProfileView(null); setHelpMessages([]); setScreen('landing');
    setMessagesOpen(false); setActiveThreadId(null); setPremiumOpen(false); setDmThreads({});
  };

  // On load, if this browser already has a verified session saved, sign the
  // person straight back in instead of asking them to log in/sign up again.
  useEffect(() => {
    const savedId = loadSession();
    if (!savedId) return;
    (async () => {
      try {
        const users = await loadUsers();
        const u = users[savedId];
        if (u) {
          setCurrentUser({ id: savedId, name: u.name });
          setLanguage(u.language || 'English');
          setScreen('main');
        } else {
          clearSession();
        }
      } catch (_) {}
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!currentUser) return;
    (async () => {
      setEntriesLoading(true);
      try {
        const res = await withTimeout(storage.get(`diary:${currentUser.id}`, false));
        setEntries(res ? JSON.parse(res.value) : []);
      } catch (_) { setEntries([]); }
      setEntriesLoading(false);
    })();
  }, [currentUser]);

  const saveEntries = async (next) => {
    setEntries(next);
    try { await storage.set(`diary:${currentUser.id}`, JSON.stringify(next), false); } catch (_) {}
  };
  const addEntry = (entry) => saveEntries([...entries, { ...entry, id: Date.now().toString() }]);
  const deleteEntry = (id) => saveEntries(entries.filter(e => e.id !== id));

  useEffect(() => {
    if (!currentUser) return;
    (async () => {
      try {
        const res = await withTimeout(storage.get(`chat:${currentUser.id}`, false));
        setMessages(res ? JSON.parse(res.value) : []);
      } catch (_) { setMessages([]); }
    })();
  }, [currentUser]);

  const sendMessage = async (text) => {
    const next = [...messages, { role: 'user', content: text }];
    setMessages(next);
    setChatSending(true);
    try {
      const reply = await callClaudeChat(next, buildSystemPrompt(language));
      const withReply = [...next, { role: 'assistant', content: reply }];
      setMessages(withReply);
      try { await storage.set(`chat:${currentUser.id}`, JSON.stringify(withReply), false); } catch (_) {}
    } catch (err) {
      const msg = err?.name === 'AbortError'
        ? "That took too long to reach me — please try again."
        : "I couldn't connect just now — please try again in a bit.";
      setMessages([...next, { role: 'assistant', content: msg }]);
    } finally {
      setChatSending(false);
    }
  };

  useEffect(() => {
    if (!currentUser) return;
    (async () => {
      setPostsLoading(true);
      try {
        const res = await withTimeout(storage.get('mehfil-posts', true));
        setPosts(res ? JSON.parse(res.value) : []);
      } catch (_) { setPosts([]); }
      setPostsLoading(false);
    })();
  }, [currentUser]);

  const savePosts = async (next) => {
    setPosts(next);
    try { await storage.set('mehfil-posts', JSON.stringify(next), true); } catch (_) {}
  };
  const addPost = (p) => savePosts([...posts, {
    ...p, id: Date.now().toString(), authorId: currentUser.id, authorName: currentUser.name,
    createdAt: new Date().toISOString(), likedBy: [], comments: [], connections: [],
  }]);
  const likePost = (id) => savePosts(posts.map(p => {
    if (p.id !== id) return p;
    const liked = (p.likedBy || []).includes(currentUser.id);
    return { ...p, likedBy: liked ? p.likedBy.filter(u => u !== currentUser.id) : [...(p.likedBy || []), currentUser.id] };
  }));
  const commentOnPost = (id, text) => savePosts(posts.map(p => p.id === id ? { ...p, comments: [...(p.comments || []), { authorName: currentUser.name, text }] } : p));
  const connectPost = (id) => savePosts(posts.map(p => p.id === id ? { ...p, connections: [...(p.connections || []), currentUser.id] } : p));
  const deletePost = (id) => savePosts(posts.filter(p => !(p.id === id && p.authorId === currentUser.id)));

  useEffect(() => {
    if (!currentUser) return;
    (async () => {
      try {
        const res = await withTimeout(storage.get('mehfil-stories', true));
        const loaded = res ? JSON.parse(res.value) : [];
        setStories(loaded.filter(isStoryActive));
      } catch (_) { setStories([]); }
    })();
  }, [currentUser]);

  // Periodically drop expired stories so they "auto-delete" after 24 hours
  useEffect(() => {
    const interval = setInterval(() => {
      setStories(prev => prev.filter(isStoryActive));
    }, 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const saveStories = async (next) => {
    const active = next.filter(isStoryActive);
    setStories(active);
    try { await storage.set('mehfil-stories', JSON.stringify(active), true); } catch (_) {}
  };
  const addStory = (s) => saveStories([...stories, {
    ...s, id: Date.now().toString(), authorId: currentUser.id, authorName: currentUser.name,
    createdAt: new Date().toISOString(), expiresAt: new Date(Date.now() + STORY_LIFETIME_MS).toISOString(),
  }]);
  const deleteStory = (id) => saveStories(stories.filter(s => !(s.id === id && s.authorId === currentUser.id)));

  useEffect(() => {
    if (!currentUser) return;
    (async () => {
      try {
        const res = await withTimeout(storage.get('profiles', true), 6000);
        const data = res ? JSON.parse(res.value) : {};
        profilesCacheRef.current = data;
        setProfiles(data);
      } catch (_) { setProfiles({}); }
    })();
  }, [currentUser]);

  const updateMyProfile = async (fields) => {
    const base = profilesCacheRef.current || profiles;
    const next = { ...base, [currentUser.id]: { ...(base[currentUser.id] || {}), ...fields } };
    profilesCacheRef.current = next;
    setProfiles(next);
    try { await storage.set('profiles', JSON.stringify(next), true); } catch (_) {}
  };

  const viewProfile = (userId, name) => setProfileView({ userId, name, own: userId === currentUser.id });

  const searchUserById = async (rawQuery) => {
    const key = rawQuery.trim().toLowerCase();
    if (!key) { setIdSearchResult(undefined); return; }
    const users = await loadUsers();
    const match = users[key];
    if (!match) { setIdSearchResult(null); return; }
    setIdSearchResult({ id: key, name: match.name || key });
  };

  const openIdSearch = () => { setIdSearchOpen(true); setIdSearchQuery(''); setIdSearchResult(undefined); };
  const closeIdSearch = () => { setIdSearchOpen(false); setIdSearchQuery(''); setIdSearchResult(undefined); };

  useEffect(() => {
    if (!currentUser) return;
    (async () => {
      try {
        const res = await withTimeout(storage.get('dm-threads', true), 6000);
        const data = res ? JSON.parse(res.value) : {};
        dmCacheRef.current = data;
        setDmThreads(data);
      } catch (_) { setDmThreads({}); }
    })();
  }, [currentUser]);

  const threadIdFor = (a, b) => [a, b].sort().join('__');

  const openConversationWith = (otherId, otherName) => {
    if (!currentUser || otherId === currentUser.id) return;
    const tid = threadIdFor(currentUser.id, otherId);
    const base = dmCacheRef.current || dmThreads;
    if (!base[tid]) {
      const next = { ...base, [tid]: { participants: [currentUser.id, otherId], names: { [currentUser.id]: currentUser.name, [otherId]: otherName }, messages: [] } };
      dmCacheRef.current = next;
      setDmThreads(next);
    }
    setActiveThreadId(tid);
    setMessagesOpen(true);
    setProfileView(null);
  };

  const sendDM = async (text) => {
    if (!activeThreadId || !currentUser) return;
    const base = dmCacheRef.current || dmThreads;
    const thread = base[activeThreadId];
    if (!thread) return;
    const updatedThread = { ...thread, messages: [...thread.messages, { senderId: currentUser.id, text, at: new Date().toISOString() }] };
    const next = { ...base, [activeThreadId]: updatedThread };
    dmCacheRef.current = next;
    setDmThreads(next);
    try { await storage.set('dm-threads', JSON.stringify(next), true); } catch (_) {}
  };

  const purchasePremium = async (planKey, paymentMethod, paymentId) => {
    const plan = PREMIUM_PLANS.find(p => p.key === planKey);
    if (!plan || !currentUser) return;
    const startedAt = new Date();
    const expiresAt = new Date(startedAt);
    expiresAt.setMonth(expiresAt.getMonth() + plan.months);
    await updateMyProfile({ premium: { plan: planKey, paymentMethod, paymentId: paymentId || null, startedAt: startedAt.toISOString(), expiresAt: expiresAt.toISOString() } });
  };

  useEffect(() => {
    if (!currentUser) return;
    (async () => {
      try {
        const res = await withTimeout(storage.get(`help:${currentUser.id}`, false));
        setHelpMessages(res ? JSON.parse(res.value) : []);
      } catch (_) { setHelpMessages([]); }
    })();
  }, [currentUser]);

  const sendHelpMessage = async (text) => {
    const next = [...helpMessages, { role: 'user', content: text }];
    setHelpMessages(next);
    setHelpSending(true);
    try {
      const reply = await callClaudeChat(next, HELP_SYSTEM_PROMPT);
      const withReply = [...next, { role: 'assistant', content: reply }];
      setHelpMessages(withReply);
      try { await storage.set(`help:${currentUser.id}`, JSON.stringify(withReply), false); } catch (_) {}
    } catch (err) {
      const msg = err?.name === 'AbortError'
        ? "That took too long to reach me — please try again."
        : "I couldn't connect just now — please try again in a bit.";
      setHelpMessages([...next, { role: 'assistant', content: msg }]);
    } finally {
      setHelpSending(false);
    }
  };

  if (screen === 'landing') return (<LanguageContext.Provider value={language}><div className="font-body"><GlobalStyle /><LandingView onEnter={() => setScreen('auth')} /></div></LanguageContext.Provider>);
  if (screen === 'auth') return (
    <LanguageContext.Provider value={language}>
      <div className="font-body">
        <GlobalStyle />
        <AuthView onAuth={handleAuth} onVerifyOtp={verifyOtp} onResendOtp={resendOtp}
          otpDemoCode={otpInfo?.demo ? otpInfo.code : null} otpTarget={otpInfo?.identifier}
          loading={authLoading} error={authError} onBack={() => setScreen('landing')} />
      </div>
    </LanguageContext.Provider>
  );

  const myPremium = isUserPremium(profiles[currentUser.id]);

  return (
    <LanguageContext.Provider value={language}>
    <div className="min-h-screen font-body" style={{ background: THEME.duskDeep }}>
      <GlobalStyle />
      <div className="sticky top-0 z-20 flex items-center justify-between px-4 py-3"
        style={{ background: `linear-gradient(180deg, ${THEME.duskMid2}e6, ${THEME.duskDeep}f7)`, backdropFilter: 'blur(10px)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="flex items-center gap-2">
          <SukoonMark size={22} />
          <div>
            <p className="font-display text-lg" style={{ color: THEME.textLight }}>Sukoon</p>
            <p className="font-body text-xs flex items-center gap-1" style={{ color: THEME.lavender, opacity: 0.7 }}>
              {tr(language, 'hiName', { name: currentUser.name })} {myPremium && <VerifiedBadge size={11} />}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <button onClick={openIdSearch} className="p-2 rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }} aria-label={tr(language, 'searchById')}>
            <Search size={16} color={THEME.lavender} />
          </button>
          {!myPremium && (
            <button onClick={() => setPremiumOpen(true)} className="p-2 rounded-full anim-shimmer" style={{ background: 'rgba(199,154,86,0.18)' }} aria-label="Get Premium">
              <Crown size={16} color={THEME.gold} />
            </button>
          )}
          <button onClick={() => { setActiveThreadId(null); setMessagesOpen(true); }} className="p-2 rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }} aria-label="Messages">
            <MessageCircle size={16} color={THEME.lavender} />
          </button>
          <button onClick={() => viewProfile(currentUser.id, currentUser.name)}
            className="w-9 h-9 rounded-full overflow-hidden flex items-center justify-center font-body text-xs font-bold"
            style={{ background: THEME.lavender, color: THEME.ink, boxShadow: myPremium ? `0 0 0 2px ${THEME.gold}` : 'none' }} aria-label="Your profile">
            {profiles[currentUser.id]?.photoData
              ? <img src={profiles[currentUser.id].photoData} alt="" className="w-full h-full object-cover" />
              : (currentUser.name?.[0]?.toUpperCase() || '?')}
          </button>
          <button onClick={() => setSettingsOpen(true)} className="p-2 rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }} aria-label="Settings">
            <Settings size={16} color={THEME.lavender} />
          </button>
        </div>
      </div>

      {idSearchOpen && (
        <div className="fixed inset-0 z-40 flex items-start justify-center p-4 pt-20" style={{ background: 'rgba(27,21,51,0.75)' }} onClick={closeIdSearch}>
          <div className="w-full max-w-sm rounded-2xl p-5 anim-float" style={{ background: THEME.paper }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-display text-lg" style={{ color: THEME.ink }}>{tr(language, 'searchById')}</h3>
              <button onClick={closeIdSearch}><X size={18} style={{ color: THEME.ink }} /></button>
            </div>
            <div className="flex items-center gap-2 rounded-lg px-3 py-2.5 mb-3" style={{ background: THEME.paperShadow }}>
              <Search size={16} style={{ color: THEME.roseDark }} />
              <input value={idSearchQuery} autoFocus
                onChange={e => setIdSearchQuery(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') searchUserById(idSearchQuery); }}
                placeholder={tr(language, 'searchByIdPlaceholder')}
                className="bg-transparent outline-none w-full font-body text-sm" style={{ color: THEME.ink }} />
            </div>
            <button onClick={() => searchUserById(idSearchQuery)} className="w-full rounded-lg py-2 mb-3 font-body text-sm font-semibold"
              style={{ background: THEME.roseDark, color: THEME.textLight }}>
              {tr(language, 'searchById')}
            </button>

            {idSearchResult === undefined && (
              <p className="font-body text-xs text-center" style={{ color: THEME.ink, opacity: 0.55 }}>{tr(language, 'searchByIdHelp')}</p>
            )}
            {idSearchResult === null && (
              <p className="font-body text-xs text-center" style={{ color: '#C24545' }}>{tr(language, 'searchByIdEmpty')}</p>
            )}
            {idSearchResult && (
              <button onClick={() => { viewProfile(idSearchResult.id, idSearchResult.name); closeIdSearch(); }}
                className="w-full flex items-center gap-3 rounded-xl p-3 text-left" style={{ background: THEME.paperShadow }}>
                <div className="w-9 h-9 rounded-full overflow-hidden flex items-center justify-center font-body text-xs font-bold flex-shrink-0"
                  style={{ background: THEME.lavender, color: THEME.ink, boxShadow: isUserPremium(profiles?.[idSearchResult.id]) ? `0 0 0 2px ${THEME.gold}` : 'none' }}>
                  {profiles?.[idSearchResult.id]?.photoData
                    ? <img src={profiles[idSearchResult.id].photoData} alt="" className="w-full h-full object-cover" />
                    : (idSearchResult.name?.[0]?.toUpperCase() || '?')}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-body text-sm font-semibold flex items-center gap-1" style={{ color: THEME.ink }}>
                    {idSearchResult.name} {isUserPremium(profiles?.[idSearchResult.id]) && <VerifiedBadge size={12} />}
                  </p>
                  <p className="font-body text-xs" style={{ color: THEME.ink, opacity: 0.5 }}>{tr(language, 'viewProfile')}</p>
                </div>
                <ChevronRight size={16} style={{ color: THEME.ink, opacity: 0.5 }} />
              </button>
            )}
          </div>
        </div>
      )}

      {activeTab === 'diary' && (
        <DiaryTab entries={entries} loading={entriesLoading} onAdd={addEntry} onDelete={deleteEntry}
          isPremium={myPremium} onUpgrade={() => setPremiumOpen(true)} />
      )}
      {activeTab === 'companion' && <CompanionTab messages={messages} onSend={sendMessage} sending={chatSending} />}
      {activeTab === 'mehfil' && (
        <MehfilTab posts={posts} loading={postsLoading} currentUser={currentUser} profiles={profiles}
          onAdd={addPost} onLike={likePost} onComment={commentOnPost} onConnect={connectPost}
          onDelete={deletePost} onViewProfile={viewProfile}
          stories={stories} onAddStory={addStory} onDeleteStory={deleteStory} />
      )}

      {profileView && (
        <ProfileModal
          profile={profileView.own ? profiles[currentUser.id] : profiles[profileView.userId]}
          displayName={profileView.name}
          isOwn={profileView.own}
          onSave={updateMyProfile}
          onClose={() => setProfileView(null)}
          onMessage={() => openConversationWith(profileView.userId, profileView.name)}
          onUpgrade={() => { setProfileView(null); setPremiumOpen(true); }}
        />
      )}

      <MessagesPanel
        open={messagesOpen}
        onClose={() => { setMessagesOpen(false); setActiveThreadId(null); }}
        threads={dmThreads}
        currentUserId={currentUser.id}
        profiles={profiles}
        activeThreadId={activeThreadId}
        onOpenThread={setActiveThreadId}
        onBackToList={() => setActiveThreadId(null)}
        onSend={sendDM}
      />

      <PremiumModal
        open={premiumOpen}
        onClose={() => setPremiumOpen(false)}
        isPremium={myPremium}
        currentPremium={profiles[currentUser.id]?.premium}
        onPurchase={purchasePremium}
      />

      <TabBar active={activeTab} setActive={setActiveTab} />
      <SettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)} language={language} onLanguageChange={changeLanguage} onLogout={handleLogout}
        helpMessages={helpMessages} onSendHelp={sendHelpMessage} helpSending={helpSending}
        isPremium={myPremium} onOpenPremium={() => { setSettingsOpen(false); setPremiumOpen(true); }} />
    </div>
    </LanguageContext.Provider>
  );
}
