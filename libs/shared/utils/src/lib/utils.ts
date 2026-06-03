import { randomBytes } from 'crypto';
 
 // This will generate highly secure random string
export function generateRandomToken(){
  return randomBytes(32).toString('hex');
};