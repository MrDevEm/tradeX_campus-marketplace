import type { CarouselItem, CategoryItem, Conversation, Listing } from '../types/marketplace';

export const CAROUSEL_ITEMS: CarouselItem[] = [
  { src: '/images/products/backpack.webp', name: 'Backpack', bg: '#f4f4f4' },
  { src: '/images/products/eye-glasses.jpg', name: 'Eye Glasses', bg: '#b7c88a' },
  { src: '/images/products/headphones.jpg', name: 'Headphones', bg: '#9bd4c2' },
  { src: '/images/products/notebook.webp', name: 'Notebook', bg: '#ffffff' },
  { src: '/images/products/shoes.jpg', name: 'Shoes', bg: '#a7dc1f' },
  { src: '/images/products/skincare.jpg', name: 'Skincare', bg: '#172518' },
  { src: '/images/products/chocolate-bar.jpg', name: 'Chocolate Bar', bg: '#e8eef2' },
  { src: '/images/products/laptop.jpg', name: 'PC', bg: '#23292b' },
  { src: '/images/products/book.png', name: 'Book', bg: '#ffffff' },
  { src: '/images/products/smartphone.jpg', name: 'Smart Phone', bg: '#dad8cf' },
  { src: '/images/products/clothes.jpg', name: 'Clothes', bg: '#f3f3f3' },
  { src: '/images/products/wristwatch.jpg', name: 'Wrist Watch', bg: '#0f373f' },
];

export const CATEGORIES_DATA: CategoryItem[] = [
  {
    id: 'Electronics',
    name: 'Electronics',
    count: '48 items',
    icon: `
      <svg viewBox="0 0 28 28" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <rect class="cat-duotone" x="4.5" y="6.5" width="19" height="12.5" rx="2.4" />
        <path d="M2.5 21.5h23" />
        <path d="M10.5 21.5l1 1.2h5l1-1.2" />
        <g class="cat-anim-pulse">
          <path d="M10.8 11.4a4.6 4.6 0 0 1 6.4 0" />
          <path d="M12.6 13.5a2.1 2.1 0 0 1 2.8 0" />
          <circle cx="14" cy="15.4" r="0.8" fill="currentColor" stroke="none" />
        </g>
      </svg>
    `,
  },
  {
    id: 'Books',
    name: 'Books & Study',
    count: '86 items',
    icon: `
      <svg viewBox="0 0 28 28" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path class="cat-duotone" d="M3.5 7.2c3-.8 6.8-.3 10.5 1.8v13.2c-3.7-2-7.5-2.4-10.5-1.5V7.2z" />
        <path class="cat-duotone" d="M24.5 7.2c-3-.8-6.8-.3-10.5 1.8v13.2c3.7-2 7.5-2.4 10.5-1.5V7.2z" />
        <path d="M7 11.6h3.8M7 15.2h3.4" />
        <path class="cat-anim-bookmark" d="M18 4.4h3.2v6.4l-1.6-1.3-1.6 1.3V4.4z" fill="currentColor" fill-opacity="0.22" />
      </svg>
    `,
  },
  {
    id: 'Fashion',
    name: 'Clothing & Shoes',
    count: '32 items',
    icon: `
      <svg viewBox="0 0 28 28" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <g class="cat-anim-tilt">
          <path class="cat-duotone" d="M4.2 17.8l1.2-7.6c.2-1 .9-1.7 1.9-1.9l2.4-.5c1.1 1.7 3.3 2.1 4.8.7l4.6 5.2c1.1 1.2 2.7 1.8 4.4 2 .7.1 1.2.7 1.2 1.4v2.3c0 .9-.7 1.6-1.6 1.6H5.8c-.9 0-1.6-.7-1.6-1.6v-1.6z" />
          <path d="M4.4 18.2h20.2" />
          <path d="M13.8 11.8l1.8-1.4M15.8 13.9l1.8-1.3" />
        </g>
      </svg>
    `,
  },
  {
    id: 'Other',
    name: 'Other',
    count: '19 items',
    icon: `
      <svg viewBox="0 0 28 28" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <rect class="cat-duotone" x="4.5" y="4.5" width="8" height="8" rx="2.2" />
        <rect class="cat-duotone" x="15.5" y="4.5" width="8" height="8" rx="2.2" />
        <rect class="cat-duotone" x="4.5" y="15.5" width="8" height="8" rx="2.2" />
        <g class="cat-anim-pulse">
          <circle cx="19.5" cy="19.5" r="4" />
          <path d="M19.5 17.7v3.6M17.7 19.5h3.6" />
        </g>
      </svg>
    `,
  },
  {
    id: 'Accessories',
    name: 'Accessories',
    count: '27 items',
    icon: `
      <svg viewBox="0 0 28 28" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M10.4 6.6l.8-2.9h5.6l.8 2.9" />
        <path d="M10.4 21.4l.8 2.9h5.6l.8-2.9" />
        <circle class="cat-duotone" cx="14" cy="14" r="6.6" />
        <circle cx="14" cy="14" r="1.1" fill="currentColor" stroke="none" />
        <path d="M14 14l2.4 1.6" />
        <path class="cat-anim-hand" d="M14 14V9.8" />
        <path d="M20.8 12.6v2.8" />
      </svg>
    `,
  },
  {
    id: 'Free',
    name: 'Free Corner',
    count: '14 items',
    icon: `
      <svg viewBox="0 0 28 28" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <rect class="cat-duotone" x="5.2" y="12.5" width="17.6" height="10.8" rx="2" />
        <path d="M14 12.5v10.8" />
        <g class="cat-anim-lid">
          <rect x="3.8" y="8.6" width="20.4" height="3.9" rx="1.2" fill="currentColor" fill-opacity="0.14" />
          <path d="M14 8.6C14 6.2 11.4 4.8 9.8 6c-1.3 1-.3 2.6 1.5 2.6H14z" />
          <path d="M14 8.6C14 6.2 16.6 4.8 18.2 6c1.3 1 .3 2.6-1.5 2.6H14z" />
        </g>
        <g class="cat-anim-spark">
          <path d="M22.8 4.4v2.8M21.4 5.8h2.8" stroke-width="1.6" />
          <circle cx="5.2" cy="5.2" r="1" fill="currentColor" stroke="none" />
        </g>
      </svg>
    `,
  },
];

export const INITIAL_MARKETPLACE_LISTINGS: Listing[] = [
  {
    id: 'item-1',
    title: 'MacBook Pro 14" M2 (16GB RAM, 512GB SSD) — Space Gray',
    category: 'Electronics',
    type: 'Buy / Sell',
    typeClass: 'type-sell',
    price: 88000,
    priceLabel: '88,000 ETB',
    condition: 'Like New',
    spot: 'Engineering Quad (Hall 2)',
    seller: 'Dawit M.',
    dept: 'Software Eng, 4th Year',
    desc: 'Flawless condition with 98% battery health. Comes with original MagSafe charger and protective sleeve. Ideal for CS/Engineering students running Docker and heavy dev builds.',
    img: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=600&q=80',
    saved: false,
  },
  {
    id: 'item-2',
    title: 'Organic Chemistry & Molecular Biology Textbook (8th Edition)',
    category: 'Books',
    type: 'Buy / Sell',
    typeClass: 'type-sell',
    price: 950,
    priceLabel: '950 ETB',
    condition: 'Good Condition',
    spot: 'Main Library Plaza (Level 1)',
    seller: 'Helen T.',
    dept: 'Biology, 3rd Year',
    desc: 'Required textbook for Chem 201 & Bio 304. Clean pages with only light pencil margin notes. Includes the online supplementary problem solutions booklet.',
    img: '/images/listings/college-textbooks.jpg',
    saved: true,
  },
  {
    id: 'item-3',
    title: 'Sony WH-1000XM4 Noise-Cancelling Wireless Headphones',
    category: 'Electronics',
    type: 'Buy / Sell',
    typeClass: 'type-sell',
    price: 16500,
    priceLabel: '16,500 ETB',
    condition: 'Like New',
    spot: 'Student Union Hall (Coffee Lounge)',
    seller: 'Yonatan K.',
    dept: 'Computer Science, 2nd Year',
    desc: 'Industry-leading noise canceling. Perfect for studying in crowded dorms or the campus cafeteria. Pristine ear pads, original hardshell case, and aux cable included.',
    img: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=600&q=80',
    saved: false,
  },
  {
    id: 'item-4',
    title: 'Calculus: Early Transcendentals (James Stewart, 9th Edition)',
    category: 'Books',
    type: 'Swap',
    typeClass: 'type-swap',
    price: 650,
    priceLabel: 'Swap / 650 ETB',
    condition: 'Good Condition',
    spot: 'Mathematics Building (Room 104)',
    seller: 'Sara B.',
    dept: 'Electrical Eng, 1st Year',
    desc: 'Looking to swap for University Physics Volume 2 (Young & Freedman), or selling for 650 ETB. Hardcover edition in solid condition.',
    img: '/images/listings/college-textbooks.jpg',
    saved: false,
  },
  {
    id: 'item-5',
    title: 'TI-84 Plus CE Color Graphing Calculator — Mint condition',
    category: 'Electronics',
    type: 'Swap',
    typeClass: 'type-swap',
    price: 4200,
    priceLabel: 'Swap / 4,200 ETB',
    condition: 'Like New',
    spot: 'Science Complex Lobby',
    seller: 'Michael A.',
    dept: 'Physics, 3rd Year',
    desc: 'Available to swap for an engineering drawing kit or sell directly. Color backlit screen, USB charging cable included, ready for midterms and finals.',
    img: 'https://images.unsplash.com/photo-1594980596870-8aa52a78d8cd?auto=format&fit=crop&w=600&q=80',
    saved: false,
  },
  {
    id: 'item-6',
    title: 'Solid Oak Study Desk with Drawers & Adjustable LED Lamp',
    category: 'Other',
    type: 'Buy / Sell',
    typeClass: 'type-sell',
    price: 3800,
    priceLabel: '3,800 ETB',
    condition: 'Good Condition',
    spot: 'Dorm Block C Ground Lobby',
    seller: 'Abebe G.',
    dept: 'Economics, 4th Year',
    desc: 'Graduating this semester so letting go of my dorm study setup. Sturdy oak surface with two deep utility drawers. Can assist with carrying down the elevator.',
    img: 'https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?auto=format&fit=crop&w=600&q=80',
    saved: false,
  },
  {
    id: 'item-7',
    title: 'Pre-Med Clinical Anatomy & Pathology Flashcard Box Set',
    category: 'Free',
    type: 'Giveaway',
    typeClass: 'type-free',
    price: 0,
    priceLabel: 'FREE',
    condition: 'Like New',
    spot: 'Health Sciences Hall Entrance',
    seller: 'Selam W.',
    dept: 'Medicine, 5th Year',
    desc: 'Complete 500-card Netter Anatomy box set. Passed my board exams, giving it away for free to any junior pre-med student who will make good use of it!',
    img: '/images/listings/college-textbooks.jpg',
    saved: true,
  },
  {
    id: 'item-8',
    title: 'Citizen Quartz Watch with Silver Bezel & Leather Band',
    category: 'Accessories',
    type: 'Buy / Sell',
    typeClass: 'type-sell',
    price: 3400,
    priceLabel: '3,400 ETB',
    condition: 'Like New',
    spot: 'Campus Main Gate / Admin Building',
    seller: 'Natnael S.',
    dept: 'Architecture, 3rd Year',
    desc: 'Classic daily campus watch. Genuine leather strap, fresh battery installed last week. Scratch-free mineral glass.',
    img: '/images/listings/citizen-watch.jpg',
    saved: false,
  },
  {
    id: 'item-9',
    title: 'Nike Air Max Running Shoes (Unisex, Size 42 / US 9)',
    category: 'Fashion',
    type: 'Buy / Sell',
    typeClass: 'type-sell',
    price: 2800,
    priceLabel: '2,800 ETB',
    condition: 'Good Condition',
    spot: 'Sports Complex / Gymnasium',
    seller: 'Kidus T.',
    dept: 'Civil Engineering, 2nd Year',
    desc: 'Only worn for half a semester. Very clean outsole, excellent cushioning for walking across large campus campuses.',
    img: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=600&q=80',
    saved: false,
  },
  {
    id: 'item-10',
    title: "Hershey's & Snack Package (Assorted Bars, Pack of 6)",
    category: 'Free',
    type: 'Buy / Sell',
    typeClass: 'type-sell',
    price: 450,
    priceLabel: '450 ETB',
    condition: 'Brand New',
    spot: 'Dorm Block A Cafeteria',
    seller: 'Liya D.',
    dept: 'Management, 1st Year',
    desc: 'Unopened snack pack brought from overseas care package. Fresh until next year, great for late-night exam cramming sessions in the dorm.',
    img: '/images/listings/chocolate-pack.jpg',
    saved: false,
  },
  {
    id: 'item-12',
    title: 'Campus Winter Heavy Puffer Jacket (Dark Navy, Size L)',
    category: 'Fashion',
    type: 'Buy / Sell',
    typeClass: 'type-sell',
    price: 2400,
    priceLabel: '2,400 ETB',
    condition: 'Like New',
    spot: 'Student Center Café',
    seller: 'Eyoel M.',
    dept: 'Law, 3rd Year',
    desc: 'Warm insulated jacket with detachable hood and deep fleece-lined pockets. Clean and freshly laundered, ready for cold morning lectures.',
    img: 'https://images.unsplash.com/photo-1544441893-675973e31985?auto=format&fit=crop&w=600&q=80',
    saved: false,
  },
];

export const LOCAL_CHAT_MEDIA_POOL: string[] = [
  '/images/products/laptop.jpg',
  '/images/products/book.png',
  '/images/products/backpack.webp',
  '/images/products/smartphone.jpg',
  '/images/products/wristwatch.jpg',
  '/images/products/shoes.jpg',
  '/images/products/clothes.jpg',
  '/images/products/eye-glasses.jpg',
  '/images/products/notebook.webp',
];

export const INITIAL_CONVERSATIONS: Conversation[] = [
  {
    id: 'c1',
    listingId: 'item-1',
    seller: 'Dawit M.',
    item: 'MacBook Pro 14" M2 (16GB RAM, 512GB SSD)',
    priceLabel: '88,000 ETB',
    img: '/images/products/laptop.jpg',
    pinned: true,
    lastTime: '11:05',
    sharedMedia: [
      '/images/products/laptop.jpg',
      '/images/products/smartphone.jpg',
      '/images/products/notebook.webp',
      '/images/products/backpack.webp',
      '/images/products/wristwatch.jpg',
      '/images/products/eye-glasses.jpg',
    ],
    messages: [
      { id: 'm1', in: true, time: '11:05', text: 'Hey! Is the MacBook Pro still available for a quick campus inspection?' },
      { id: 'm2', in: false, time: '11:06', text: 'Yes, it is available! Battery health is 98% and no scratches at all.' },
      { id: 'm3', in: true, time: '11:07', text: 'Great! Can we meet near the Engineering Quad café around 2:00 PM?' },
      { id: 'm4', in: false, time: '11:08', text: '2:00 PM works perfectly. I will bring the MagSafe charger and sleeve.' },
    ],
  },
  {
    id: 'c2',
    listingId: 'item-2',
    seller: 'Helen T.',
    item: 'Organic Chemistry & Molecular Biology Textbook',
    priceLabel: '950 ETB',
    img: '/images/listings/college-textbooks.jpg',
    pinned: false,
    lastTime: '10:42',
    sharedMedia: [
      '/images/listings/college-textbooks.jpg',
      '/images/products/book.png',
      '/images/products/notebook.webp',
      '/images/products/backpack.webp',
      '/images/products/eye-glasses.jpg',
      '/images/products/skincare.jpg',
    ],
    messages: [
      { id: 'm5', in: true, time: '10:40', text: 'Hey! Does the Organic Chemistry book include the lab solutions booklet?' },
      { id: 'm6', in: false, time: '10:42', text: 'Yes, both the hardcover textbook and the problem solutions insert are included!' },
    ],
  },
];
