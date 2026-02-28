import { differenceInYears, format } from 'date-fns';

export const calcAge = (dob) => {
  if (!dob) return null;
  return differenceInYears(new Date(), new Date(dob));
};

export const formatDate = (date, fmt = 'dd-MM-yyyy') => {
  if (!date) return '—';
  try { return format(new Date(date), fmt); } catch { return '—'; }
};

export const suggestMemberType = (age, maritalStatus) => {
  if (age <= 12) return 'Child';
  if (age <= 30 && maritalStatus === 'Single') return 'Youth';
  return 'Member';
};

export const suggestOccupation = (age) => {
  if (age <= 5) return 'Child';
  return '';
};

export const getMemberTypeBadge = (type) => {
  const map = { Member: 'badge-blue', Youth: 'badge-purple', Child: 'badge-yellow' };
  return map[type] || 'badge-blue';
};

export const getStatusBadge = (status) => status === 'Active' ? 'badge-green' : 'badge-red';

export const RELATIONSHIP_OPTIONS = ['Wife', 'Husband', 'Son', 'Daughter', 'Father', 'Mother', 'Other'];
export const MARITAL_OPTIONS = ['Single', 'Married', 'Widowed'];
export const MEMBER_TYPE_OPTIONS = ['Member', 'Youth', 'Child'];
export const GENDER_OPTIONS = ['Male', 'Female', 'Other'];
export const BAPTIZED_OPTIONS = ['Yes', 'No'];
export const OCCUPATION_OPTIONS = ['Child', 'Student',  'Ministry','Employed', 'Self-Employed', 'Business', 'Agriculture ', 'Daily wages', 'House-Wife', 'Non-Worker', 'Retired'];
export const STATUS_OPTIONS = ['Active', 'Inactive'];