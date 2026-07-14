export type SpaceAddOn = { name: string; price: number; available: number };
export type SpaceAttendeeTier = { range: string; price: number };
export type SpaceReview = { id: string; name: string; date: string; rating: number; comment: string };

export type Space = {
  id: string;
  name: string;
  tag: string;
  saves: number;
  reviews: number;
  rating: number;
  location: string;
  capacity: number;
  price: number;
  openTime: string;
  closeTime: string;
  description: string;
  amenities: string[];
  hostRules: string[];
  parkingInstruction: string;
  addOns: SpaceAddOn[];
  images: any[];
  dates: string[];
  hasAttendeePricing: boolean;
  attendeeTiers: SpaceAttendeeTier[];
  reviewsList: SpaceReview[];
};

export const SPACES: Space[] = [
  {
    id: '1',
    name: 'Mini boutique Hall',
    tag: 'Hall',
    saves: 14,
    reviews: 12,
    rating: 4.5,
    location: 'Allen Avenue Ikeja',
    capacity: 50,
    price: 25000,
    openTime: '10:00AM',
    closeTime: '1:00PM',
    description: 'A cozy boutique hall perfect for intimate gatherings, brand launches, and birthdays.',
    amenities: ['Wi-Fi', 'Parking', 'Air Conditioning', 'Restrooms'],
    hostRules: ['No smoking indoors', 'Music until 11pm', 'No outside catering'],
    parkingInstruction: 'Please park only in the designated parking space assigned to the property. Do not block other vehicles, entrances, or walkways.',
    addOns: [
      { name: 'Tiffany Chairs', price: 800, available: 80 },
      { name: 'Rustic Wooden Tables', price: 1200, available: 25 },
      { name: 'Elegant Glass Vases', price: 450, available: 100 },
    ],
    images: [
      require('../assets/images/space1.jpg'),
      require('../assets/images/space2.jpg'),
      require('../assets/images/space3.jpg'),
    ],
    dates: ['JUN 22', 'JUN 27', 'JUN 28', 'JUN 29', 'JUN 30', 'JUL 02', 'AUG 11'],
    hasAttendeePricing: false,
    attendeeTiers: [],
    reviewsList: [],
  },
  {
    id: '2',
    name: 'Skyline Rooftop Lounge',
    tag: 'Rooftop',
    saves: 14,
    reviews: 12,
    rating: 4.8,
    location: 'Victoria Island',
    capacity: 60,
    price: 45000,
    openTime: '10:00AM',
    closeTime: '1:00PM',
    description: 'A panoramic rooftop space with golden-hour views over Victoria Island. Perfect for intimate weddings, brand launches, and birthdays under the Lagos sky.',
    amenities: ['Wi-Fi', 'Sound System', 'Security', 'Air Conditioning', 'Parking', 'Restrooms'],
    hostRules: ['No smoking indoors', 'Music until 11pm', 'No outside catering'],
    parkingInstruction: 'Please park only in the designated parking space assigned to the property. Do not block other vehicles, entrances, or walkways.',
    addOns: [
      { name: 'Tiffany Chairs', price: 800, available: 80 },
      { name: 'Rustic Wooden Tables', price: 1200, available: 25 },
      { name: 'Elegant Glass Vases', price: 450, available: 100 },
    ],
    images: [
      require('../assets/images/space2.jpg'),
      require('../assets/images/space1.jpg'),
      require('../assets/images/space3.jpg'),
    ],
    dates: ['JUN 22', 'JUN 27', 'JUN 28', 'JUN 29', 'JUN 30', 'JUL 02', 'AUG 11'],
    hasAttendeePricing: false,
    attendeeTiers: [],
    reviewsList: [
      {
        id: '1',
        name: 'Adeola K.',
        date: 'June 28, 2024',
        rating: 5.0,
        comment: 'Really good space to host your event. Has parking and good facilities.',
      },
    ],
  },
  {
    id: '3',
    name: 'Garden Event Hall',
    tag: 'Hall',
    saves: 14,
    reviews: 12,
    rating: 4.2,
    location: 'Lekki Phase 1',
    capacity: 60,
    price: 30000,
    openTime: '10:00AM',
    closeTime: '1:00PM',
    description: 'A lush garden hall with natural light and open-air seating, ideal for daytime events.',
    amenities: ['Parking', 'Air Conditioning', 'Restrooms'],
    hostRules: ['No smoking indoors', 'Music until 10pm'],
    parkingInstruction: 'Please park only in the designated parking space assigned to the property.',
    addOns: [
      { name: 'Tiffany Chairs', price: 800, available: 60 },
      { name: 'Rustic Wooden Tables', price: 1200, available: 20 },
    ],
    images: [
      require('../assets/images/space3.jpg'),
      require('../assets/images/space1.jpg'),
      require('../assets/images/space2.jpg'),
    ],
    dates: ['JUN 22', 'JUN 27', 'JUN 28', 'JUN 29', 'JUN 30', 'JUL 02', 'AUG 11'],
    hasAttendeePricing: false,
    attendeeTiers: [],
    reviewsList: [],
  },
];