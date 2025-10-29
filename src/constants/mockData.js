// Case Phase Constants
export const CASE_PHASES = {
  PRE_LITIGATION: {
    id: 'pre_litigation',
    name: 'Pre-Litigation',
    color: '#3498db', // Blue
    icon: '📋',
    description: 'Gathering documentation and preparing your case'
  },
  LITIGATION: {
    id: 'litigation',
    name: 'Litigation',
    color: '#f39c12', // Amber
    icon: '⚖️',
    description: 'Active lawsuit with court proceedings'
  },
  TRIAL: {
    id: 'trial',
    name: 'Trial',
    color: '#e74c3c', // Red
    icon: '🏛️',
    description: 'Case proceeding to or in trial'
  }
};

// Phase Transition Markers
export const PHASE_TRANSITION_TASKS = {
  LITIGATION_START: 'cf-2', // File with Court - starts litigation phase
  TRIAL_START: 'trial-1' // PreTrial motions - starts trial phase
};

export const LITIGATION_STAGES = [
  {
    id: 1,
    name: 'Pre-Litigation',
    coins: 100,
    completed: false,
    description: 'Gather all necessary documentation before filing your case',
    expanded: false,
    position: { top: '8%', left: '15%' },
    phase: CASE_PHASES.PRE_LITIGATION.id,
    subStages: [
      { id: 'pre-1', name: 'Police Report', coins: 10, completed: false, icon: '🚔', description: 'Upload the official police accident report', acceptedFormats: 'PDF, JPG, PNG', uploaded: false, uploadedFiles: [] },
      { id: 'pre-2', name: 'Body Cam Footage', coins: 10, completed: false, icon: '📹', description: 'Upload body camera footage if available', acceptedFormats: 'MP4, MOV, AVI', uploaded: false, uploadedFiles: [] },
      { id: 'pre-3', name: 'Dash Cam Footage', coins: 10, completed: false, icon: '🎥', description: 'Upload dash camera recordings', acceptedFormats: 'MP4, MOV, AVI', uploaded: false, uploadedFiles: [] },
      { id: 'pre-4', name: 'Pictures', coins: 5, completed: false, icon: '📸', description: 'Upload photos of accident scene, vehicle damage, and injuries', acceptedFormats: 'JPG, PNG, HEIC', uploaded: false, uploadedFiles: [] },
      { id: 'pre-5', name: 'Health Insurance Card', coins: 5, completed: false, icon: '💳', description: 'Upload copy of health insurance card (front and back)', acceptedFormats: 'PDF, JPG, PNG', uploaded: false, uploadedFiles: [] },
      { id: 'pre-6', name: 'Auto Insurance Company', coins: 5, completed: false, icon: '🏢', description: 'Enter your auto insurance provider name', isDataEntry: true, enteredData: '' },
      { id: 'pre-7', name: 'Auto Insurance Policy Number', coins: 5, completed: false, icon: '🔢', description: 'Enter your auto insurance policy number', isDataEntry: true, enteredData: '' },
      { id: 'pre-8', name: 'Medical Bills', coins: 15, completed: false, icon: '💵', description: 'Upload all medical treatment bills', acceptedFormats: 'PDF, JPG, PNG', uploaded: false, uploadedFiles: [], linkToMedicalHub: true },
      { id: 'pre-9', name: 'Medical Records', coins: 35, completed: false, icon: '📋', description: 'Upload complete medical records and reports', acceptedFormats: 'PDF, JPG, PNG', uploaded: false, uploadedFiles: [], linkToMedicalHub: true },
      { id: 'pre-10', name: 'Demand Sent', coins: 15, completed: false, icon: '📮', description: 'Upload the demand letter sent to the opposing party or insurance company', acceptedFormats: 'PDF, DOC, DOCX', uploaded: false, uploadedFiles: [] },
      { id: 'pre-11', name: 'Demand Rejected', coins: 10, completed: false, icon: '❌', description: 'Upload the rejection response to your demand letter', acceptedFormats: 'PDF, DOC, DOCX', uploaded: false, uploadedFiles: [] }
    ],
    videos: [
      { id: 'v1', title: 'Pre-Litigation Essentials', price: 2.99, duration: '15 min', tier: 'basic' },
      { id: 'v2', title: 'Document Collection Guide', price: 3.99, duration: '20 min', tier: 'basic' }
    ]
  },
  {
    id: 2,
    name: 'Complaint Filed',
    coins: 32,
    completed: false,
    description: 'Your lawsuit is officially filed with the court',
    expanded: false,
    position: { top: '8%', left: '60%' },
    phase: CASE_PHASES.LITIGATION.id,
    subStages: [
      { id: 'cf-1', name: 'Draft Complaint', coins: 8, completed: false, icon: '📝', description: 'Prepare the legal complaint document' },
      { id: 'cf-2', name: 'File with Court', coins: 10, completed: false, icon: '⚖️', description: 'Submit complaint to the court', triggersPhaseTransition: 'litigation' },
      { id: 'cf-3', name: 'Serve Defendant', coins: 7, completed: false, icon: '📬', description: 'Deliver complaint to the defendant' },
      { id: 'cf-4', name: 'Answer Filed (within 30 days)', coins: 7, completed: false, icon: '📄', description: 'Defendant files their answer to the complaint' }
    ],
    videos: [
      { id: 'v3', title: 'Filing Your Complaint', price: 4.99, duration: '18 min', tier: 'premium' }
    ]
  },
  {
    id: 3,
    name: 'Discovery Begins',
    coins: 50,
    completed: false,
    description: 'Exchange information with the opposing party',
    expanded: false,
    position: { top: '25%', left: '35%' },
    phase: CASE_PHASES.LITIGATION.id,
    subStages: [
      { id: 'disc-1', name: 'Interrogatories', coins: 10, completed: false, icon: '❓', description: 'Written questions for the other party' },
      { id: 'disc-2', name: 'Request for Production of Documents', coins: 10, completed: false, icon: '📄', description: 'Request relevant documents from the opposing party' },
      { id: 'disc-3', name: 'Request for Admissions', coins: 10, completed: false, icon: '✅', description: 'Facts to be admitted or denied by the opposing party' },
      { id: 'disc-4', name: 'Entry Upon Land for Inspection', coins: 10, completed: false, icon: '🏘️', description: 'Request to inspect property or land related to the case' },
      { id: 'disc-5', name: 'Experts', coins: 10, completed: false, icon: '👨‍⚕️', description: 'Identify and disclose expert witnesses' }
    ],
    videos: [
      { id: 'v4', title: 'Understanding Discovery', price: 3.99, duration: '22 min', tier: 'free' },
      { id: 'v5', title: 'Discovery Response Strategies', price: 4.99, duration: '25 min', tier: 'premium' }
    ]
  },
  {
    id: 4,
    name: 'Depositions',
    coins: 100,
    completed: false,
    description: 'Sworn testimony is recorded under oath',
    expanded: false,
    position: { top: '42%', left: '65%' },
    phase: CASE_PHASES.LITIGATION.id,
    subStages: [
      { id: 'dep-1', name: 'Deposition Preparation', coins: 25, completed: false, icon: '📖', description: 'Prepare for your testimony' },
      { id: 'dep-2', name: 'Your Deposition', coins: 25, completed: false, icon: '🎤', description: 'Give sworn testimony' },
      { id: 'dep-3', name: 'Opposing Party Deposition', coins: 25, completed: false, icon: '👥', description: 'Attend opponent depositions' },
      { id: 'dep-4', name: 'Expert Deposition', coins: 25, completed: false, icon: '👨‍⚕️', description: 'Expert witness sworn testimony' }
    ],
    videos: [
      { id: 'v6', title: 'Deposition Deep Dive', price: 4.99, duration: '30 min', tier: 'premium' },
      { id: 'v7', title: 'How to Testify Effectively', price: 5.99, duration: '28 min', tier: 'premium' }
    ]
  },
  {
    id: 5,
    name: 'Mediation',
    coins: 50,
    completed: false,
    description: 'Attempt to settle the case with a neutral mediator',
    expanded: false,
    position: { top: '58%', left: '20%' },
    phase: CASE_PHASES.LITIGATION.id,
    subStages: [
      { id: 'med-1', name: 'Mediation Prep', coins: 15, completed: false, icon: '📋', description: 'Prepare settlement strategy' },
      { id: 'med-2', name: 'Mediation Session', coins: 25, completed: false, icon: '🤝', description: 'Attend mediation meeting' },
      { id: 'med-3', name: 'Settlement Negotiation', coins: 10, completed: false, icon: '💼', description: 'Negotiate settlement terms' }
    ],
    videos: [
      { id: 'v8', title: 'Mediation Mastery', price: 4.99, duration: '24 min', tier: 'premium' }
    ]
  },
  {
    id: 6,
    name: 'Trial Prep',
    coins: 100,
    completed: false,
    description: 'Prepare your case for trial presentation',
    expanded: false,
    position: { top: '58%', left: '70%' },
    phase: CASE_PHASES.LITIGATION.id,
    subStages: [
      { id: 'tp-1', name: 'Prepare your Testimony', coins: 25, completed: false, icon: '📖', description: 'Prepare what you will say on the stand' },
      { id: 'tp-2', name: 'Confirm Exhibits and Evidence with your Attorney', coins: 20, completed: false, icon: '🗂️', description: 'Review all exhibits and evidence with your lawyer' },
      { id: 'tp-3', name: 'Arrange to miss work', coins: 15, completed: false, icon: '📅', description: 'Schedule time off for trial dates' },
      { id: 'tp-4', name: 'Arrange Transportation', coins: 15, completed: false, icon: '🚗', description: 'Plan how to get to the courthouse' },
      { id: 'tp-5', name: 'Discuss Trial Strategy', coins: 25, completed: false, icon: '🎯', description: 'Review courtroom strategy with your attorney' }
    ],
    videos: [
      { id: 'v9', title: 'Trial Preparation Guide', price: 5.99, duration: '35 min', tier: 'premium' },
      { id: 'v10', title: 'Courtroom Procedures', price: 4.99, duration: '28 min', tier: 'premium' }
    ]
  },
  {
    id: 7,
    name: 'Trial',
    coins: 100,
    completed: false,
    description: 'Present your case in court',
    expanded: false,
    position: { top: '74%', left: '35%' },
    phase: CASE_PHASES.TRIAL.id,
    subStages: [
      { id: 'trial-1', name: 'PreTrial motions', coins: 10, completed: false, icon: '📋', description: 'File pretrial motions with the court', triggersPhaseTransition: 'trial' },
      { id: 'trial-2', name: 'Jury selection / voir dire', coins: 10, completed: false, icon: '👥', description: 'Select jury through voir dire process' },
      { id: 'trial-3', name: 'Opening statements', coins: 15, completed: false, icon: '🗣️', description: 'Present opening arguments to the jury' },
      { id: 'trial-4', name: "Plaintiff's witness testimony (direct and cross examination)", coins: 15, completed: false, icon: '👨‍⚖️', description: 'Plaintiff presents witness testimony' },
      { id: 'trial-5', name: "Plaintiff's evidence (pictures, documents, records, affidavits)", coins: 15, completed: false, icon: '📊', description: 'Plaintiff introduces evidence' },
      { id: 'trial-6', name: 'Plaintiff rests', coins: 5, completed: false, icon: '✅', description: 'Plaintiff concludes their case' },
      { id: 'trial-7', name: 'Motions', coins: 5, completed: false, icon: '📄', description: 'Motions after plaintiff rests' },
      { id: 'trial-8', name: "Defense's witness testimony (direct and cross examination)", coins: 15, completed: false, icon: '👨‍💼', description: 'Defense presents witness testimony' },
      { id: 'trial-9', name: "Defense's evidence (pictures, documents, records, affidavits)", coins: 15, completed: false, icon: '📑', description: 'Defense introduces evidence' },
      { id: 'trial-10', name: 'Defense rests', coins: 5, completed: false, icon: '✅', description: 'Defense concludes their case' },
      { id: 'trial-11', name: 'Motions', coins: 5, completed: false, icon: '📄', description: 'Motions after defense rests' },
      { id: 'trial-12', name: 'Closing arguments', coins: 15, completed: false, icon: '⚡', description: 'Deliver closing statements to the jury' },
      { id: 'trial-13', name: 'Jury instructions (from judge)', coins: 10, completed: false, icon: '⚖️', description: 'Judge instructs the jury on the law' },
      { id: 'trial-14', name: 'Jury deliberations', coins: 10, completed: false, icon: '💭', description: 'Jury discusses the case privately' },
      { id: 'trial-15', name: 'Jury questions', coins: 5, completed: false, icon: '❓', description: 'Jury asks questions to the judge' },
      { id: 'trial-16', name: 'Verdict', coins: 20, completed: false, icon: '🏆', description: 'Jury delivers their verdict' }
    ],
    videos: [
      { id: 'v11', title: 'Trial Tactics', price: 6.99, duration: '40 min', tier: 'premium' }
    ]
  },
  {
    id: 8,
    name: 'Settlement',
    coins: 75,
    completed: false,
    description: 'Reach a settlement agreement with the opposing party',
    expanded: false,
    position: { top: '74%', left: '65%' },
    phase: CASE_PHASES.TRIAL.id,
    subStages: [
      { id: 'settle-1', name: 'Negotiations', coins: 10, completed: false, icon: '🤝', description: 'Negotiate settlement terms with opposing party' },
      { id: 'settle-2', name: 'Agreement to settle', coins: 10, completed: false, icon: '📋', description: 'Reach formal agreement to settle the case' },
      { id: 'settle-3', name: 'Settlement release', coins: 8, completed: false, icon: '📄', description: 'Sign settlement release documents' },
      { id: 'settle-4', name: 'Lien affidavit', coins: 7, completed: false, icon: '📑', description: 'Complete lien affidavit documentation' },
      { id: 'settle-5', name: 'Settlement statement', coins: 8, completed: false, icon: '📊', description: 'Review settlement statement breakdown' },
      { id: 'settle-6', name: 'Disbursement to attorney', coins: 7, completed: false, icon: '💼', description: 'Settlement funds disbursed to attorney' },
      { id: 'settle-7', name: 'Attorney fees/costs/case expenses disbursed', coins: 7, completed: false, icon: '💸', description: 'Attorney deducts fees, costs, and expenses' },
      { id: 'settle-8', name: 'Medical provider payments', coins: 7, completed: false, icon: '🏥', description: 'Payment to medical providers from settlement' },
      { id: 'settle-9', name: 'Funding payments', coins: 6, completed: false, icon: '💳', description: 'Process funding and financing payments' },
      { id: 'settle-10', name: 'Client disbursement', coins: 15, completed: false, icon: '💰', description: 'Final payment disbursed to you' }
    ],
    videos: [
      { id: 'v12', title: 'Settlement Strategies', price: 4.99, duration: '26 min', tier: 'premium' }
    ]
  },
  {
    id: 9,
    name: 'Case Resolved',
    coins: 200,
    completed: false,
    description: 'Your case reaches final resolution - congratulations!',
    expanded: false,
    position: { top: '88%', left: '45%' },
    phase: CASE_PHASES.TRIAL.id,
    subStages: [
      { id: 'cr-1', name: 'Judgment Entry', coins: 100, completed: false, icon: '⚖️', description: 'Court enters final judgment' },
      { id: 'cr-2', name: 'Case Closure', coins: 100, completed: false, icon: '🎊', description: 'Close out the case' }
    ],
    videos: [
      { id: 'v13', title: 'Post-Trial Procedures', price: 3.99, duration: '18 min', tier: 'basic' }
    ]
  }
];

export const VIDEOS = [
  // Pre-Litigation Videos
  { id: 'v1', title: 'Pre-Litigation Essentials', price: 2.99, tier: 'basic', duration: '15 min', category: 'Pre-Litigation' },
  { id: 'v2', title: 'Document Collection Guide', price: 3.99, tier: 'basic', duration: '20 min', category: 'Pre-Litigation' },
  
  // Complaint Filed Videos
  { id: 'v3', title: 'Filing Your Complaint', price: 4.99, tier: 'premium', duration: '18 min', category: 'Complaint Filed' },
  
  // Discovery Begins Videos
  { id: 'v4', title: 'Understanding Discovery', price: 3.99, tier: 'free', duration: '22 min', category: 'Discovery Begins' },
  { id: 'v5', title: 'Discovery Response Strategies', price: 4.99, tier: 'premium', duration: '25 min', category: 'Discovery Begins' },
  
  // Depositions Videos
  { id: 'v6', title: 'Deposition Deep Dive', price: 4.99, tier: 'premium', duration: '30 min', category: 'Depositions' },
  { id: 'v7', title: 'How to Testify Effectively', price: 5.99, tier: 'premium', duration: '28 min', category: 'Depositions' },
  
  // Mediation Videos
  { id: 'v8', title: 'Mediation Mastery', price: 4.99, tier: 'premium', duration: '24 min', category: 'Mediation' },
  
  // Trial Prep Videos
  { id: 'v9', title: 'Trial Preparation Guide', price: 5.99, tier: 'premium', duration: '35 min', category: 'Trial Prep' },
  { id: 'v10', title: 'Courtroom Procedures', price: 4.99, tier: 'premium', duration: '28 min', category: 'Trial Prep' },
  
  // Trial Videos
  { id: 'v11', title: 'Trial Tactics', price: 6.99, tier: 'premium', duration: '40 min', category: 'Trial' },
  
  // Settlement Videos
  { id: 'v12', title: 'Settlement Strategies', price: 4.99, tier: 'premium', duration: '26 min', category: 'Settlement' },
  
  // Case Resolved Videos
  { id: 'v13', title: 'Post-Trial Procedures', price: 3.99, tier: 'basic', duration: '18 min', category: 'Case Resolved' }
];

export const USER_TYPES = {
  INDIVIDUAL: 'individual',
  LAW_FIRM: 'lawfirm',
  MEDICAL_PROVIDER: 'medicalprovider',
  CLIENT: 'client'
};

export const DAILY_BONUSES = [5, 7, 10, 12, 15, 20, 30];

export const MAX_LIFETIME_CREDITS = 5; // $5 lifetime cap per user account
export const COINS_PER_CREDIT = 5000; // 5,000 coins = $1

export const AVATARS = [
  { 
    id: 1, 
    name: 'Captain', 
    emoji: '🏴‍☠️', 
    description: 'Fearless leader of the crew',
    color: '#e74c3c'
  },
  { 
    id: 2, 
    name: 'Navigator', 
    emoji: '🧭', 
    description: 'Expert chart reader',
    color: '#3498db'
  },
  { 
    id: 3, 
    name: 'Gunner', 
    emoji: '⚓', 
    description: 'Master of the cannons',
    color: '#16a085'
  },
  { 
    id: 4, 
    name: 'First Mate', 
    emoji: '🦜', 
    description: 'Trusted parrot companion',
    color: '#f39c12'
  }
];
