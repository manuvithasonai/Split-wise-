import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 80 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 254 },
    passwordHash: { type: String, required: true, select: false },
    refreshTokenHash: { type: String, select: false },
    role: { type: String, enum: ['user', 'group_admin', 'platform_admin'], default: 'user' },
    status: { type: String, enum: ['active', 'suspended', 'banned'], default: 'active' },
    defaultCurrency: { type: String, default: 'INR', uppercase: true, minlength: 3, maxlength: 3 },
  },
  { timestamps: true }
);

const User = mongoose.model('User', userSchema);
export default User;
