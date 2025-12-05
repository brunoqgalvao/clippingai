import { prisma } from '@clippingai/database';
import { hash, compare } from 'bcrypt';
import jwt from 'jsonwebtoken';
import type { User } from '@clippingai/database';

// ============================================================================
// CONFIGURATION
// ============================================================================

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
const BCRYPT_ROUNDS = 10;

// ============================================================================
// TYPES
// ============================================================================

export interface SignupInput {
  email: string;
  password: string;
  name?: string;
  companyName?: string;
  companyDomain?: string;
  timezone?: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: {
    id: string;
    email: string;
    name: string | null;
    companyName: string | null;
    companyDomain: string | null;
    timezone: string;
    emailVerified: boolean;
    subscriptionTier: string;
    subscriptionStatus: string;
    createdAt: Date;
    updatedAt: Date;
  };
  token: string;
}

export interface JWTPayload {
  userId: string;
  email: string;
}

// ============================================================================
// SIGNUP
// ============================================================================

/**
 * Create a new user account or convert anonymous user
 */
export async function signup(input: SignupInput): Promise<AuthResponse> {
  console.log(`📝 Creating account for ${input.email}...`);

  // Check if user already exists
  const existingUser = await prisma.user.findUnique({
    where: { email: input.email.toLowerCase() },
  });

  // Hash password
  const passwordHash = await hash(input.password, BCRYPT_ROUNDS);

  // Sanitize company name
  let cleanCompanyName = input.companyName;
  if (cleanCompanyName && cleanCompanyName.length > 30) {
    if (cleanCompanyName.includes(' — ')) cleanCompanyName = cleanCompanyName.split(' — ')[0];
    else if (cleanCompanyName.includes(' - ')) cleanCompanyName = cleanCompanyName.split(' - ')[0];
    else if (cleanCompanyName.includes(' | ')) cleanCompanyName = cleanCompanyName.split(' | ')[0];
  }

  let user: User;

  if (existingUser && existingUser.passwordHash === 'anonymous' && existingUser.status === 'ANONYMOUS') {
    // Convert anonymous user to real user
    console.log(`🔄 Converting anonymous user to active user: ${input.email}`);

    user = await prisma.user.update({
      where: { id: existingUser.id },
      data: {
        passwordHash,
        name: input.name || existingUser.name,
        companyName: cleanCompanyName || existingUser.companyName,
        companyDomain: input.companyDomain || existingUser.companyDomain,
        timezone: input.timezone || existingUser.timezone,
        status: 'ACTIVE', // Mark as converted
        convertedAt: new Date(), // Track conversion time
        emailVerified: false,
      },
    });

    console.log(`✅ Anonymous user converted to active account: ${user.email}`);
  } else if (existingUser) {
    // User already exists with real password
    throw new Error('User with this email already exists');
  } else {
    // Create new user (normal signup flow)
    user = await prisma.user.create({
      data: {
        email: input.email.toLowerCase(),
        passwordHash,
        name: input.name || null,
        companyName: cleanCompanyName || null,
        companyDomain: input.companyDomain || null,
        timezone: input.timezone || 'America/Los_Angeles',
        emailVerified: false,
        status: 'ACTIVE', // New users are immediately active
        convertedAt: new Date(),
        subscriptionTier: 'free',
        subscriptionStatus: 'active',
      },
    });

    console.log(`✅ New account created: ${user.email}`);
  }

  // Generate JWT token
  const token = generateToken({
    userId: user.id,
    email: user.email,
  });

  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      companyName: user.companyName,
      companyDomain: user.companyDomain,
      timezone: user.timezone,
      emailVerified: user.emailVerified,
      subscriptionTier: user.subscriptionTier,
      subscriptionStatus: user.subscriptionStatus,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    },
    token,
  };
}

// ============================================================================
// LOGIN
// ============================================================================

/**
 * Authenticate a user
 */
export async function login(input: LoginInput): Promise<AuthResponse> {
  console.log(`🔐 Login attempt for ${input.email}...`);

  // Find user
  const user = await prisma.user.findUnique({
    where: { email: input.email.toLowerCase() },
  });

  if (!user) {
    throw new Error('Invalid email or password');
  }

  // Check if user is still anonymous (hasn't completed signup)
  if (user.status === 'ANONYMOUS' || user.passwordHash === 'anonymous') {
    throw new Error('Please complete your signup first');
  }

  // Verify password
  const isValidPassword = await compare(input.password, user.passwordHash);

  if (!isValidPassword) {
    throw new Error('Invalid email or password');
  }

  // Generate JWT token
  const token = generateToken({
    userId: user.id,
    email: user.email,
  });

  console.log(`✅ Login successful for ${user.email}`);

  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      companyName: user.companyName,
      companyDomain: user.companyDomain,
      timezone: user.timezone,
      emailVerified: user.emailVerified,
      subscriptionTier: user.subscriptionTier,
      subscriptionStatus: user.subscriptionStatus,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    },
    token,
  };
}

// ============================================================================
// TOKEN MANAGEMENT
// ============================================================================

/**
 * Generate a JWT token
 */
export function generateToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });
}

/**
 * Verify a JWT token
 */
export function verifyToken(token: string): JWTPayload {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
    return decoded;
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
}

// ============================================================================
// USER MANAGEMENT
// ============================================================================

/**
 * Get user by ID
 */
export async function getUserById(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      companyName: true,
      companyDomain: true,
      timezone: true,
      emailVerified: true,
      subscriptionTier: true,
      subscriptionStatus: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!user) {
    throw new Error('User not found');
  }

  return user;
}

/**
 * Get user by email
 */
export async function getUserByEmail(email: string) {
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
    select: {
      id: true,
      email: true,
      name: true,
      companyName: true,
      companyDomain: true,
      timezone: true,
      emailVerified: true,
      subscriptionTier: true,
      subscriptionStatus: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return user;
}

/**
 * Update user profile
 */
export async function updateUserProfile(
  userId: string,
  updates: {
    name?: string;
    companyName?: string;
    companyDomain?: string;
    timezone?: string;
  }
) {
  const user = await prisma.user.update({
    where: { id: userId },
    data: updates,
    select: {
      id: true,
      email: true,
      name: true,
      companyName: true,
      companyDomain: true,
      timezone: true,
      emailVerified: true,
      subscriptionTier: true,
      subscriptionStatus: true,
    },
  });

  console.log(`✅ Profile updated for user ${userId}`);
  return user;
}

/**
 * Change user password
 */
export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string
) {
  // Get user with password hash
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new Error('User not found');
  }

  // Verify current password
  const isValidPassword = await compare(currentPassword, user.passwordHash);

  if (!isValidPassword) {
    throw new Error('Current password is incorrect');
  }

  // Hash new password
  const newPasswordHash = await hash(newPassword, BCRYPT_ROUNDS);

  // Update password
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: newPasswordHash },
  });

  console.log(`✅ Password changed for user ${userId}`);
}

/**
 * Mark email as verified
 */
export async function verifyEmail(userId: string) {
  await prisma.user.update({
    where: { id: userId },
    data: { emailVerified: true },
  });

  console.log(`✅ Email verified for user ${userId}`);
}

/**
 * Delete user account
 */
export async function deleteUser(userId: string) {
  await prisma.user.delete({
    where: { id: userId },
  });

  console.log(`✅ User ${userId} deleted`);
}
