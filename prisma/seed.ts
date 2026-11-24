import {
  PrismaClient,
  UserRole,
  UserStatus,
  ListingType,
  ListingCondition,
  ListingStatus,
  ReportTargetType,
  ReportStatus,
  NotificationType,
} from '@prisma/client';
import { hashPassword } from '../server/services/password.service.ts';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // 1. Seed Safe Campus Meetup Spots
  const meetupSpots = [
    {
      id: 'spot-lib',
      name: 'Main Library Plaza (North Entrance)',
      description: 'Well-lit central campus area with security presence and CCTV coverage.',
      safetyRating: 'Verified Safe Zone • High Foot Traffic',
      landmark: 'Opposite Academic Quadrangle',
    },
    {
      id: 'spot-union',
      name: 'Student Union Lounge (Ground Floor)',
      description: 'Open indoor student area with daylight hours and campus Wi-Fi.',
      safetyRating: 'Verified Safe Zone • Daytime Access',
      landmark: 'Ground Floor Atrium',
    },
    {
      id: 'spot-gate1',
      name: 'Campus Gate 1 Security Checkpoint',
      description: 'University security staff present 24/7; safest exchange spot for high-value items.',
      safetyRating: 'Highest Security • 24/7 Monitored',
      landmark: 'Main Campus Guard Pavilion',
    },
    {
      id: 'spot-cafe',
      name: 'Central Campus Cafeteria Entrance',
      description: 'Active student gathering point during lunchtime and late afternoon.',
      safetyRating: 'Verified Safe Zone • Peak Hours',
      landmark: 'Near Student Services Building',
    },
  ];

  for (const spot of meetupSpots) {
    await prisma.campusMeetupSpot.upsert({
      where: { id: spot.id },
      update: spot,
      create: spot,
    });
  }
  console.log(`✅ Seeded ${meetupSpots.length} campus meetup spots.`);

  // 2. Seed Marketplace Categories (Section 7)
  const categories = [
    { id: 'cat-electronics', name: 'Electronics', slug: 'electronics' },
    { id: 'cat-books', name: 'Books & Study', slug: 'books-study' },
    { id: 'cat-fashion', name: 'Clothing & Shoes', slug: 'clothing-shoes' },
    { id: 'cat-accessories', name: 'Accessories', slug: 'accessories' },
    { id: 'cat-free', name: 'Free Corner', slug: 'free-corner' },
    { id: 'cat-other', name: 'Other', slug: 'other' },
  ];

  for (const cat of categories) {
    await prisma.category.upsert({
      where: { name: cat.name },
      update: cat,
      create: cat,
    });
  }
  console.log(`✅ Seeded ${categories.length} marketplace categories.`);

  // 3. Hash default password with Argon2id
  const defaultPassword = 'Password123!';
  const passwordHash = await hashPassword(defaultPassword);

  // 4. Seed Admin Account (admin@mu.edu.et)
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@mu.edu.et' },
    update: {
      passwordHash,
      role: UserRole.ADMIN,
      status: UserStatus.APPROVED,
      emailVerified: true,
      studentIdVerified: true,
    },
    create: {
      email: 'admin@mu.edu.et',
      passwordHash,
      fullName: 'Campus Admin',
      role: UserRole.ADMIN,
      status: UserStatus.APPROVED,
      emailVerified: true,
      studentIdVerified: true,
    },
  });
  console.log(`✅ Seeded Admin account: ${adminUser.email}`);

  // 5. Seed Primary Pre-approved Student (dawit.m@university.edu)
  const dawitUser = await prisma.user.upsert({
    where: { email: 'dawit.m@university.edu' },
    update: {
      passwordHash,
      fullName: 'Dawit M.',
      role: UserRole.STUDENT,
      status: UserStatus.APPROVED,
      emailVerified: true,
      studentIdVerified: true,
    },
    create: {
      email: 'dawit.m@university.edu',
      passwordHash,
      fullName: 'Dawit M.',
      role: UserRole.STUDENT,
      status: UserStatus.APPROVED,
      emailVerified: true,
      studentIdVerified: true,
    },
  });

  await prisma.studentProfile.upsert({
    where: { userId: dawitUser.id },
    update: {
      studentId: 'UGR/1402/14',
      university: 'Mekelle University',
      department: 'Software Engineering',
      academicYear: '4th Year',
      trustScore: 100,
    },
    create: {
      userId: dawitUser.id,
      studentId: 'UGR/1402/14',
      university: 'Mekelle University',
      department: 'Software Engineering',
      academicYear: '4th Year',
      trustScore: 100,
    },
  });
  console.log(`✅ Seeded Verified Student: ${dawitUser.email}`);

  // 6. Seed Secondary Pre-approved Student (student@mu.edu.et)
  const studentUser = await prisma.user.upsert({
    where: { email: 'student@mu.edu.et' },
    update: {
      passwordHash,
      fullName: 'Student Test',
      role: UserRole.STUDENT,
      status: UserStatus.APPROVED,
      emailVerified: true,
      studentIdVerified: true,
    },
    create: {
      email: 'student@mu.edu.et',
      passwordHash,
      fullName: 'Student Test',
      role: UserRole.STUDENT,
      status: UserStatus.APPROVED,
      emailVerified: true,
      studentIdVerified: true,
    },
  });

  await prisma.studentProfile.upsert({
    where: { userId: studentUser.id },
    update: {
      studentId: 'UGR/9999/14',
      university: 'Mekelle University',
      department: 'Computer Science',
      academicYear: '3rd Year',
      trustScore: 100,
    },
    create: {
      userId: studentUser.id,
      studentId: 'UGR/9999/14',
      university: 'Mekelle University',
      department: 'Computer Science',
      academicYear: '3rd Year',
      trustScore: 100,
    },
  });
  console.log(`✅ Seeded Verified Student: ${studentUser.email}`);

  // 7. Seed Pending Student with Verification Request (sara.b@campus.edu)
  const saraUser = await prisma.user.upsert({
    where: { email: 'sara.b@campus.edu' },
    update: {
      passwordHash,
      fullName: 'Sara Bekele',
      role: UserRole.STUDENT,
      status: UserStatus.PENDING_APPROVAL,
      emailVerified: true,
      studentIdVerified: false,
    },
    create: {
      email: 'sara.b@campus.edu',
      passwordHash,
      fullName: 'Sara Bekele',
      role: UserRole.STUDENT,
      status: UserStatus.PENDING_APPROVAL,
      emailVerified: true,
      studentIdVerified: false,
    },
  });

  await prisma.studentProfile.upsert({
    where: { userId: saraUser.id },
    update: {
      studentId: 'UGR/1402/15',
      university: 'Mekelle University',
      department: 'Software Engineering',
      academicYear: '3rd Year',
      trustScore: 95,
    },
    create: {
      userId: saraUser.id,
      studentId: 'UGR/1402/15',
      university: 'Mekelle University',
      department: 'Software Engineering',
      academicYear: '3rd Year',
      trustScore: 95,
    },
  });

  const existingVerif = await prisma.verificationRequest.findFirst({
    where: { userId: saraUser.id },
  });
  if (!existingVerif) {
    await prisma.verificationRequest.create({
      data: {
        userId: saraUser.id,
        idDocumentUrl: '/images/products/laptop.jpg',
        status: UserStatus.PENDING_APPROVAL,
      },
    });
  }
  console.log(`✅ Seeded Pending Student: ${saraUser.email}`);

  // 8. Seed Additional Students (Kalkidan & Yared)
  const kalUser = await prisma.user.upsert({
    where: { email: 'kal.a@campus.edu' },
    update: {
      passwordHash,
      fullName: 'Kalkidan Assefa',
      role: UserRole.STUDENT,
      status: UserStatus.APPROVED,
      emailVerified: true,
      studentIdVerified: true,
    },
    create: {
      email: 'kal.a@campus.edu',
      passwordHash,
      fullName: 'Kalkidan Assefa',
      role: UserRole.STUDENT,
      status: UserStatus.APPROVED,
      emailVerified: true,
      studentIdVerified: true,
    },
  });

  await prisma.studentProfile.upsert({
    where: { userId: kalUser.id },
    update: {
      studentId: 'UGR/8821/14',
      university: 'Mekelle University',
      department: 'Architecture & Urban Planning',
      academicYear: '3rd Year',
      trustScore: 98,
    },
    create: {
      userId: kalUser.id,
      studentId: 'UGR/8821/14',
      university: 'Mekelle University',
      department: 'Architecture & Urban Planning',
      academicYear: '3rd Year',
      trustScore: 98,
    },
  });

  const yaredUser = await prisma.user.upsert({
    where: { email: 'yared.b@campus.edu' },
    update: {
      passwordHash,
      fullName: 'Yared Berhe',
      role: UserRole.STUDENT,
      status: UserStatus.SUSPENDED,
      emailVerified: true,
      studentIdVerified: true,
    },
    create: {
      email: 'yared.b@campus.edu',
      passwordHash,
      fullName: 'Yared Berhe',
      role: UserRole.STUDENT,
      status: UserStatus.SUSPENDED,
      emailVerified: true,
      studentIdVerified: true,
    },
  });

  await prisma.studentProfile.upsert({
    where: { userId: yaredUser.id },
    update: {
      studentId: 'UGR/3309/12',
      university: 'Mekelle University',
      department: 'Mechanical Engineering',
      academicYear: '5th Year',
      trustScore: 45,
    },
    create: {
      userId: yaredUser.id,
      studentId: 'UGR/3309/12',
      university: 'Mekelle University',
      department: 'Mechanical Engineering',
      academicYear: '5th Year',
      trustScore: 45,
    },
  });
  console.log(`✅ Seeded directory students: ${kalUser.email}, ${yaredUser.email}`);

  // 9. Seed Marketplace Listings (Idempotent)
  const listingsData = [
    {
      sellerId: dawitUser.id,
      title: 'MacBook Pro 14" M2 (16GB RAM, 512GB SSD) — Space Gray',
      category: 'Electronics',
      type: ListingType.SELL,
      price: 88000.0,
      condition: ListingCondition.LIKE_NEW,
      campusSpot: 'Engineering Quad (Hall 2)',
      description:
        'Flawless condition with 98% battery health. Comes with original MagSafe charger and protective sleeve. Ideal for CS/Engineering students running Docker and heavy dev builds.',
      images: ['https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=600&q=80'],
      status: ListingStatus.ACTIVE,
      viewsCount: 142,
    },
    {
      sellerId: kalUser.id,
      title: 'Organic Chemistry & Molecular Biology Textbook (8th Edition)',
      category: 'Books',
      type: ListingType.SELL,
      price: 950.0,
      condition: ListingCondition.GOOD,
      campusSpot: 'Main Library Plaza (Level 1)',
      description:
        'Required textbook for Chem 201 & Bio 304. Clean pages with only light pencil margin notes. Includes the online supplementary problem solutions booklet.',
      images: ['/images/listings/college-textbooks.jpg'],
      status: ListingStatus.ACTIVE,
      viewsCount: 88,
    },
    {
      sellerId: dawitUser.id,
      title: 'Sony WH-1000XM4 Noise-Cancelling Wireless Headphones',
      category: 'Electronics',
      type: ListingType.SELL,
      price: 16500.0,
      condition: ListingCondition.LIKE_NEW,
      campusSpot: 'Student Union Hall (Coffee Lounge)',
      description:
        'Industry-leading noise canceling. Perfect for studying in crowded dorms or the campus cafeteria. Pristine ear pads, original hardshell case, and aux cable included.',
      images: ['https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=600&q=80'],
      status: ListingStatus.ACTIVE,
      viewsCount: 65,
    },
    {
      sellerId: kalUser.id,
      title: 'Calculus: Early Transcendentals (James Stewart, 9th Edition)',
      category: 'Books',
      type: ListingType.SWAP,
      price: 650.0,
      condition: ListingCondition.GOOD,
      campusSpot: 'Mathematics Building (Room 104)',
      description:
        'Looking to swap for University Physics Volume 2 (Young & Freedman), or selling for 650 ETB. Hardcover edition in solid condition.',
      images: ['/images/listings/college-textbooks.jpg'],
      status: ListingStatus.ACTIVE,
      viewsCount: 39,
    },
  ];

  const seededListings = [];
  for (const item of listingsData) {
    let listing = await prisma.listing.findFirst({
      where: { title: item.title, sellerId: item.sellerId },
    });
    if (!listing) {
      listing = await prisma.listing.create({ data: item });
    }
    seededListings.push(listing);
  }
  console.log(`✅ Seeded ${seededListings.length} active marketplace listings.`);

  // 10. Seed Saved Listing (Dawit saves Chemistry textbook)
  const chemistryListing = seededListings[1];
  if (chemistryListing) {
    await prisma.savedListing.upsert({
      where: {
        userId_listingId: {
          userId: dawitUser.id,
          listingId: chemistryListing.id,
        },
      },
      update: {},
      create: {
        userId: dawitUser.id,
        listingId: chemistryListing.id,
      },
    });
    console.log(`✅ Seeded saved listing for Dawit M.`);
  }

  // 11. Seed Audit Log Entry (Idempotent)
  const existingAudit = await prisma.auditLog.findFirst({
    where: { actorId: adminUser.id, action: 'VERIFICATION_APPROVED' },
  });
  if (!existingAudit) {
    await prisma.auditLog.create({
      data: {
        actorId: adminUser.id,
        actorName: 'Campus Admin (You)',
        action: 'VERIFICATION_APPROVED',
        targetType: 'STUDENT',
        targetName: 'Dawit M. (UGR/1402/14)',
        notes: 'Official student ID verified by campus reviewer.',
      },
    });
  }

  // 12. Seed Campus Notification (Idempotent)
  const existingNotif = await prisma.campusNotification.findFirst({
    where: { userId: dawitUser.id, title: 'ID Verification Approved' },
  });
  if (!existingNotif) {
    await prisma.campusNotification.create({
      data: {
        userId: dawitUser.id,
        type: NotificationType.VERIFICATION,
        title: 'ID Verification Approved',
        message: 'Your Mekelle University student ID card has been verified by the campus registrar.',
        read: false,
      },
    });
  }

  // 13. Seed Moderation Report (Idempotent)
  if (chemistryListing) {
    const existingReport = await prisma.moderationReport.findFirst({
      where: { reporterId: dawitUser.id, listingId: chemistryListing.id },
    });
    if (!existingReport) {
      await prisma.moderationReport.create({
        data: {
          reporterId: dawitUser.id,
          targetType: ReportTargetType.LISTING,
          listingId: chemistryListing.id,
          reason: 'Suspicious duplicate listing with inflated price',
          details: 'Seller listed this textbook multiple times without campus meeting details.',
          status: ReportStatus.OPEN,
        },
      });
    }
  }

  console.log('🎉 Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
