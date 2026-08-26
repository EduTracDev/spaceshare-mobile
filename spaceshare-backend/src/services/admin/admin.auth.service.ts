import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../../utils/prisma';
import { BadRequestError } from '../../errors';


export const loginUser = async (email: string, password: string) => {
    // Find user by email
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) throw new Error('Invalid email or password');

    // Check if email is verified before allowing login
    if (!user.isVerified) throw new Error('Please verify your email first');

    if (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') throw new Error('Only admins can login');
    if (user.status === 'SUSPENDED') throw new Error('Your account has been suspended. Contact an admin');

    // Compare submitted password against hashed password in DB
    if (!user.password) throw new BadRequestError('Incorrect credentials');
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) throw new BadRequestError('Invalid email or password');

    // Generate JWT — valid for 7 days
    const token = jwt.sign(
     { userId: user.id, role: user.role },
     process.env.JWT_SECRET as string,
     { expiresIn: '7d' }
    );
    await prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
    });

    return {
        token,
        user: {
        id: user.id,
        email: user.email,
        role: user.role,
        isFirstLogin: user.isFirstLogin,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        avatarUrl: user.avatarUrl,
        },
    };
};