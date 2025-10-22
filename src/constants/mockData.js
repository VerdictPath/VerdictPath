export const LITIGATION_STAGES = [
  {
    id: 1,
    name: 'Pre-Litigation',
    coins: 100,
    completed: false,
    description: 'Gather all necessary documentation before filing',
    expanded: false,
    subStages: [
      { id: 'pre-1', name: 'Police Report', coins: 10, completed: false, icon: '🚔', description: 'Obtain official police accident report' },
      { id: 'pre-2', name: 'Body Cam Footage', coins: 10, completed: false, icon: '📹', description: 'Request body camera footage if available' },
      { id: 'pre-3', name: 'Dash Cam Footage', coins: 10, completed: false, icon: '🎥', description: 'Collect dash camera recordings' },
      { id: 'pre-4', name: 'Pictures', coins: 5, completed: false, icon: '📸', description: 'Document accident scene, vehicle damage, and injuries' },
      { id: 'pre-5', name: 'Health Insurance Card', coins: 5, completed: false, icon: '💳', description: 'Copy of health insurance information' },
      { id: 'pre-6', name: 'Auto Insurance Company', coins: 5, completed: false, icon: '🏢', description: 'Identify your auto insurance provider' },
      { id: 'pre-7', name: 'Auto Insurance Policy Number', coins: 5, completed: false, icon: '🔢', description: 'Record your policy number and details' },
      { id: 'pre-8', name: 'Medical Bills', coins: 15, completed: false, icon: '💵', description: 'Collect all medical treatment bills' },
      { id: 'pre-9', name: 'Medical Records', coins: 35, completed: false, icon: '📋', description: 'Obtain complete medical records and reports' }
    ]
  },
  { id: 2, name: 'Complaint Filed', coins: 25, completed: false, description: 'Lawsuit officially filed with the court', expanded: false, subStages: [] },
  { id: 3, name: 'Discovery Begins', coins: 50, completed: false, description: 'Information exchange phase starts', expanded: false, subStages: [] },
  { id: 4, name: 'Depositions', coins: 75, completed: false, description: 'Sworn testimony recorded', expanded: false, subStages: [] },
  { id: 5, name: 'Mediation', coins: 50, completed: false, description: 'Attempt to settle with mediator', expanded: false, subStages: [] },
  { id: 6, name: 'Trial Prep', coins: 100, completed: false, description: 'Preparing for court trial', expanded: false, subStages: [] },
  { id: 7, name: 'Trial/Settlement', coins: 100, completed: false, description: 'Case resolution', expanded: false, subStages: [] },
  { id: 8, name: 'Case Resolved', coins: 200, completed: false, description: 'Final resolution achieved', expanded: false, subStages: [] }
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
