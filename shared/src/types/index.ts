// Zdieľané typy
export enum UserRole {
  ADMIN = 'admin',
  EDITOR = 'editor',
  COACH = 'coach',
  VIEWER = 'viewer'
}

export enum LicenseStatus {
  ACTIVE = 'active',
  EXPIRED = 'expired',
  SUSPENDED = 'suspended'
}

export interface BaseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface User extends BaseEntity {
  username: string;
  email: string;
  fullName: string;
  role: UserRole;
  isActive: boolean;
}

export interface License extends BaseEntity {
  clientId: string;
  licenseKey: string;
  status: LicenseStatus;
  expiresAt: Date;
  maxUsers: number;
  maxTeams: number;
}
