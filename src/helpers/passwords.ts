import * as bcrypt from 'bcrypt';

export function hashPassword(clean: string): string {
  return bcrypt.hashSync(clean, 12);
}

export function comparePasswords(clean: string, stored: string): boolean {
  return bcrypt.compareSync(clean, stored);
}
