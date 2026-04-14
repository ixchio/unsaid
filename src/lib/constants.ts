export type LocationGroup = {
  groupName: string;
  locations: string[];
};

/**
 * Full authentic LPU campus micro-locations.
 * 600-acre campus, Phagwara, Punjab.
 * Data sourced from official LPU docs, UMS, and campus maps.
 */
export const LOCATIONS: LocationGroup[] = [
  {
    groupName: 'Boys Hostels',
    locations: [
      'BH-1', 'BH-2', 'BH-3', 'BH-4',
      'BH-5', 'BH-6', 'BH-7', 'BH-8',
      'BH-9', 'BH-10', 'BH-11', 'BH-12',
    ],
  },
  {
    groupName: 'Girls Hostels',
    locations: [
      'GH-1', 'GH-2', 'GH-3', 'GH-4',
      'GH-5', 'GH-6', 'GH-7', 'GH-8',
      'GH-9', 'GH-10', 'GH-11',
    ],
  },
  {
    groupName: 'Academic Blocks',
    locations: [
      'Block 14', 'Block 25', 'Block 27',
      'Block 32', 'Block 33', 'Block 34',
      'Block 36', 'Block 37', 'Block 38', 'Block 39',
    ],
  },
  {
    groupName: 'Departments',
    locations: [
      'CSE Department',
      'ECE Department',
      'EEE Department',
      'Mechanical Department',
      'Civil Department',
      'MBA School',
      'Pharmacy School',
      'Hotel Management',
      'Agriculture School',
      'Architecture School',
      'Fine Arts School',
      'Law School',
      'Design School',
      'Journalism School',
    ],
  },
  {
    groupName: 'Food & Cafes',
    locations: [
      'Uni Mall',
      'Uni Mall Food Court',
      'Dominos LPU',
      'Cafe Coffee Day',
      'La Pinoz Pizza',
      'Dosa Plaza',
      'Lovely Bake Studio',
      'Kitchen Ette',
      'Cafe Chokolade',
      'Oven Express',
      'Lovely Sweets',
      'Hostel Mess',
    ],
  },
  {
    groupName: 'Campus Life',
    locations: [
      'Baldev Raj Mittal Auditorium',
      'Shanti Devi Mittal Auditorium',
      'Indoor Stadium',
      'Swimming Pool',
      'Cricket Ground',
      'Football Ground',
      'Gym/Fitness Center',
      'Bowling Alley',
      'Shooting Range',
    ],
  },
  {
    groupName: 'Services & Gates',
    locations: [
      'Uni Hospital',
      'Main Gate 1-A',
      'Main Gate 1-B',
      'Eastern Gate',
      'Western Gate',
      'ATM Zone',
      'E-Rickshaw Stand',
      'Parking Lot',
    ],
  },
];

/** Flat list of all location names for validation */
export function getAllLocationNames(): string[] {
  const names: string[] = [];
  for (const group of LOCATIONS) {
    names.push(...group.locations);
  }
  return names;
}

/** Returns the location as-is (no nested city logic) */
export function getCityForLocation(location: string): string {
  return location;
}

// ── Survival Mechanics ──
export const POST_START_LIFE_MINUTES = 60;
export const POST_FELT_BONUS_MINUTES = 10;
export const LEGEND_THRESHOLD_HOURS = 24;

export const POST_MAX_LENGTH = 280;

// ── Anti-spam limits ──
export const DAILY_POST_LIMIT = 15;
export const CITY_SWITCH_COOLDOWN_HOURS = 12;
export const FELT_HOURLY_LIMIT = 100;

// ── Pagination ──
export const FEED_PAGE_SIZE = 20;
export const TRENDING_PAGE_SIZE = 10;

// ── Reaction types ──
export const REACTION_TYPES = [
  { key: 'felt', label: 'felt this', icon: '·' },
  { key: 'dead', label: 'dead', icon: '💀' },
  { key: 'rage', label: 'rage', icon: '😤' },
  { key: 'pain', label: 'pain', icon: '😢' },
  { key: 'fire', label: 'fire', icon: '🔥' },
  { key: 'real', label: 'real', icon: '🫂' },
] as const;

export type ReactionType = typeof REACTION_TYPES[number]['key'];
