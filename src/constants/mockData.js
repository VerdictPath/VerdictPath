export const LITIGATION_STAGES = [
  {
    id: 1,
    name: 'Pre-Litigation',
    coins: 100,
    completed: false,
    description: 'Gather all necessary documentation before filing your case',
    expanded: false,
    position: { top: '15%', left: '10%' },
    subStages: [
      { id: 'pre-1', name: 'Police Report', coins: 10, completed: false, icon: '🚔', description: 'Upload the official police accident report', acceptedFormats: 'PDF, JPG, PNG', uploaded: false, uploadedFiles: [] },
      { id: 'pre-2', name: 'Body Cam Footage', coins: 10, completed: false, icon: '📹', description: 'Upload body camera footage if available', acceptedFormats: 'MP4, MOV, AVI', uploaded: false, uploadedFiles: [] },
      { id: 'pre-3', name: 'Dash Cam Footage', coins: 10, completed: false, icon: '🎥', description: 'Upload dash camera recordings', acceptedFormats: 'MP4, MOV, AVI', uploaded: false, uploadedFiles: [] },
      { id: 'pre-4', name: 'Pictures', coins: 5, completed: false, icon: '📸', description: 'Upload photos of accident scene, vehicle damage, and injuries', acceptedFormats: 'JPG, PNG, HEIC', uploaded: false, uploadedFiles: [] },
      { id: 'pre-5', name: 'Health Insurance Card', coins: 5, completed: false, icon: '💳', description: 'Upload copy of health insurance card (front and back)', acceptedFormats: 'PDF, JPG, PNG', uploaded: false, uploadedFiles: [] },
      { id: 'pre-6', name: 'Auto Insurance Company', coins: 5, completed: false, icon: '🏢', description: 'Enter your auto insurance provider name', isDataEntry: true, enteredData: '' },
      { id: 'pre-7', name: 'Auto Insurance Policy Number', coins: 5, completed: false, icon: '🔢', description: 'Enter your auto insurance policy number', isDataEntry: true, enteredData: '' },
      { id: 'pre-8', name: 'Medical Bills', coins: 15, completed: false, icon: '💵', description: 'Upload all medical treatment bills', acceptedFormats: 'PDF, JPG, PNG', uploaded: false, uploadedFiles: [], linkToMedicalHub: true },
      { id: 'pre-9', name: 'Medical Records', coins: 35, completed: false, icon: '📋', description: 'Upload complete medical records and reports', acceptedFormats: 'PDF, JPG, PNG', uploaded: false, uploadedFiles: [], linkToMedicalHub: true }
    ],
    videos: [
      { id: 'v1', title: 'Pre-Litigation Essentials', price: 2.99, duration: '15 min', tier: 'basic' },
      { id: 'v2', title: 'Document Collection Guide', price: 3.99, duration: '20 min', tier: 'basic' }
    ]
  },
  {
    id: 2,
    name: 'Complaint Filed',
    coins: 25,
    completed: false,
    description: 'Your lawsuit is officially filed with the court',
    expanded: false,
    position: { top: '25%', left: '65%' },
    subStages: [
      { id: 'cf-1', name: 'Draft Complaint', coins: 8, completed: false, icon: '📝', description: 'Prepare the legal complaint document' },
      { id: 'cf-2', name: 'File with Court', coins: 10, completed: false, icon: '⚖️', description: 'Submit complaint to the court' },
      { id: 'cf-3', name: 'Serve Defendant', coins: 7, completed: false, icon: '📬', description: 'Deliver complaint to the defendant' }
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
    position: { top: '40%', left: '25%' },
    subStages: [
      { id: 'disc-1', name: 'Interrogatories', coins: 15, completed: false, icon: '❓', description: 'Written questions for the other party' },
      { id: 'disc-2', name: 'Document Requests', coins: 15, completed: false, icon: '📄', description: 'Request relevant documents' },
      { id: 'disc-3', name: 'Admissions', coins: 20, completed: false, icon: '✅', description: 'Facts to be admitted or denied' }
    ],
    videos: [
      { id: 'v4', title: 'Understanding Discovery', price: 3.99, duration: '22 min', tier: 'free' },
      { id: 'v5', title: 'Discovery Response Strategies', price: 4.99, duration: '25 min', tier: 'premium' }
    ]
  },
  {
    id: 4,
    name: 'Depositions',
    coins: 75,
    completed: false,
    description: 'Sworn testimony is recorded under oath',
    expanded: false,
    position: { top: '50%', left: '70%' },
    subStages: [
      { id: 'dep-1', name: 'Deposition Preparation', coins: 25, completed: false, icon: '📖', description: 'Prepare for your testimony' },
      { id: 'dep-2', name: 'Your Deposition', coins: 30, completed: false, icon: '🎤', description: 'Give sworn testimony' },
      { id: 'dep-3', name: 'Opposing Party Deposition', coins: 20, completed: false, icon: '👥', description: 'Attend opponent depositions' }
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
    position: { top: '65%', left: '15%' },
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
    position: { top: '75%', left: '60%' },
    subStages: [
      { id: 'tp-1', name: 'Witness Preparation', coins: 30, completed: false, icon: '👨‍⚖️', description: 'Prepare witnesses to testify' },
      { id: 'tp-2', name: 'Exhibit Organization', coins: 25, completed: false, icon: '🗂️', description: 'Organize trial exhibits' },
      { id: 'tp-3', name: 'Trial Strategy', coins: 45, completed: false, icon: '🎯', description: 'Develop courtroom strategy' }
    ],
    videos: [
      { id: 'v9', title: 'Trial Preparation Guide', price: 5.99, duration: '35 min', tier: 'premium' },
      { id: 'v10', title: 'Courtroom Procedures', price: 4.99, duration: '28 min', tier: 'premium' }
    ]
  },
  {
    id: 7,
    name: 'Trial/Settlement',
    coins: 100,
    completed: false,
    description: 'Present your case in court or reach final settlement',
    expanded: false,
    position: { top: '85%', left: '30%' },
    subStages: [
      { id: 'ts-1', name: 'Opening Statements', coins: 30, completed: false, icon: '🗣️', description: 'Present opening arguments' },
      { id: 'ts-2', name: 'Presentation of Evidence', coins: 40, completed: false, icon: '📊', description: 'Present evidence and witnesses' },
      { id: 'ts-3', name: 'Closing Arguments', coins: 30, completed: false, icon: '⚡', description: 'Deliver closing statements' }
    ],
    videos: [
      { id: 'v11', title: 'Trial Tactics', price: 6.99, duration: '40 min', tier: 'premium' }
    ]
  },
  {
    id: 8,
    name: 'Case Resolved',
    coins: 200,
    completed: false,
    description: 'Your case reaches final resolution - congratulations!',
    expanded: false,
    position: { top: '92%', left: '75%' },
    subStages: [
      { id: 'cr-1', name: 'Judgment Entry', coins: 100, completed: false, icon: '⚖️', description: 'Court enters final judgment' },
      { id: 'cr-2', name: 'Case Closure', coins: 100, completed: false, icon: '🎊', description: 'Close out the case' }
    ],
    videos: [
      { id: 'v12', title: 'Post-Trial Procedures', price: 3.99, duration: '18 min', tier: 'basic' }
    ]
  }
];

export const VIDEOS = [
  { id: 1, title: 'Understanding Discovery', price: 3.99, tier: 'free', duration: '12 min' },
  { id: 2, title: 'Deposition Deep Dive', price: 4.99, tier: 'premium', duration: '25 min' },
  { id: 3, title: 'Mediation Mastery', price: 4.99, tier: 'premium', duration: '30 min' },
  { id: 4, title: 'Trial Preparation Guide', price: 4.99, tier: 'premium', duration: '28 min' },
  { id: 5, title: 'Medical Bills 101', price: 1.99, tier: 'basic', duration: '8 min' }
];

export const USER_TYPES = {
  INDIVIDUAL: 'individual',
  LAW_FIRM: 'lawfirm',
  MEDICAL_PROVIDER: 'medicalprovider'
};

export const DAILY_BONUSES = [5, 7, 10, 12, 15, 20, 30];

export const MAX_MONTHLY_CREDITS = 7;
export const COINS_PER_CREDIT = 500;

export const AVATARS = [
  { 
    id: 1, 
    name: 'Warrior', 
    emoji: '⚔️', 
    description: 'Bold and fearless fighter',
    color: '#e74c3c'
  },
  { 
    id: 2, 
    name: 'Mage', 
    emoji: '🔮', 
    description: 'Wise spellcaster',
    color: '#9b59b6'
  },
  { 
    id: 3, 
    name: 'Archer', 
    emoji: '🏹', 
    description: 'Precise and focused ranger',
    color: '#16a085'
  },
  { 
    id: 4, 
    name: 'Knight', 
    emoji: '🛡️', 
    description: 'Honorable protector',
    color: '#f39c12'
  }
];
