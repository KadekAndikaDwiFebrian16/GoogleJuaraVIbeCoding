import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: any) {
  if (!date) return 'Sedang memuat...';
  
  let d: Date;
  
  // Handle Firestore Timestamp
  if (date && typeof date.toDate === 'function') {
    d = date.toDate();
  } 
  // Handle object with seconds (common in some JSON serializations of Timestamps)
  else if (date && typeof date === 'object' && 'seconds' in date) {
    d = new Date(date.seconds * 1000);
  }
  // Handle Date object
  else if (date instanceof Date) {
    d = date;
  } 
  // Handle string or number
  else {
    d = new Date(date);
  }

  if (isNaN(d.getTime())) return 'Tanggal tidak valid';

  return d.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}
