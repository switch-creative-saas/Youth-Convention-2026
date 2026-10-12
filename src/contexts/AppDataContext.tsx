import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import type {
  AccessItemType,
  AdminActivityLog,
  BiometricDevice,
  BiometricLog,
  Member,
  Executive,
  AttendanceRecord,
  FirstTimer,
  ConventionSettings,
  FellowshipBand,
  ConventionGroup,
  GeneratedLink,
  VerificationMethod,
  Band,
  DepartmentItem,
  ChurchGroup,
  ChurchLocation,
  Programme,
  ConventionRole,
  ConventionRoleName,
  Department,
} from '@/types';
import { localStorageRepository } from '@/lib/repository';
import { assignConventionGroup as assignLeastPopulatedGroup } from '@/lib/groups';

interface AppDataContextType {
  currentEventId: string;
  members: Member[];
  executives: Executive[];
  attendance: AttendanceRecord[];
  biometricLogs: BiometricLog[];
  biometricDevices: BiometricDevice[];
  adminActivities: AdminActivityLog[];
  firstTimers: FirstTimer[];
  conventionSettings: ConventionSettings;
  generatedLinks: GeneratedLink[];
  bands: Band[];
  departments: DepartmentItem[];
  churchGroups: ChurchGroup[];
  churchLocations: ChurchLocation[];
  programmes: Programme[];
  conventionRoles: ConventionRole[];
  findAttendeeByStatusToken: (token: string | undefined) => { type: 'member'; attendee: Member } | { type: 'executive'; attendee: Executive } | null;
  getStatusUrl: (attendee: Member | Executive) => string;
  addMember: (member: Omit<Member, 'id' | 'conventionGroup' | 'registeredAt' | 'qrCode'>) => Member;
  addExecutive: (executive: Omit<Executive, 'id' | 'registeredAt'>) => Executive;
  addAttendance: (record: Omit<AttendanceRecord, 'id'>) => AttendanceRecord;
  verifyMemberBiometric: (memberId: string, actorEmail: string, actorName: string) => { ok: boolean; duplicate: boolean; message: string };
  claimAccessItem: (memberId: string, item: AccessItemType, actorEmail: string, actorName: string) => { ok: boolean; message: string };
  promoteExecutiveToAdmin: (executiveId: string, actorEmail: string, actorName: string) => void;
  revokeExecutiveAdmin: (executiveId: string, actorEmail: string, actorName: string) => void;
  addFirstTimer: (firstTimer: Omit<FirstTimer, 'id'>) => FirstTimer;
  updateConventionSettings: (settings: Partial<ConventionSettings>) => void;
  assignExecutiveRole: (executiveId: string, leadershipRole: string, actorEmail: string, actorName: string) => void;
  addGeneratedLink: (link: Omit<GeneratedLink, 'id' | 'createdAt'>) => GeneratedLink;
  validateGeneratedLink: (type: GeneratedLink['type'], token: string | null) => GeneratedLink | null;
  recordGeneratedLinkUse: (id: string) => void;
  deleteMember: (id: string) => void;
  deleteExecutive: (id: string) => void;
  updateMember: (id: string, updates: Partial<Member>) => void;
  generateMemberId: () => string;
  assignConventionGroup: (band: FellowshipBand) => ConventionGroup;
  resetDemoData: () => void;
  saveListItem: (entity: 'bands' | 'departments' | 'churchGroups' | 'churchLocations', item: Partial<Band> & Pick<Band, 'name'>, actorEmail: string, actorName: string) => void;
  deleteListItem: (entity: 'bands' | 'departments' | 'churchGroups' | 'churchLocations', id: string, actorEmail: string, actorName: string) => { ok: boolean; message?: string };
  saveProgramme: (programme: Partial<Programme> & Pick<Programme, 'title' | 'date' | 'startTime' | 'endTime' | 'location'>, actorEmail: string, actorName: string) => void;
  deleteProgramme: (id: string, actorEmail: string, actorName: string) => void;
  assignConventionRole: (userEmail: string, role: ConventionRoleName, actorEmail: string, actorName: string) => void;
  revokeConventionRole: (id: string, actorEmail: string, actorName: string) => void;
}

const MOCK_MEMBERS: Member[] = [
  { id: "MOSYF-2026-0001", fullName: "John Okafor", phoneNumber: "+2348012345678", email: "john.o@email.com", gender: "Male", dateOfBirth: "2001-03-15", address: "12 Church Street, Lagos", occupation: "University Student", emergencyContact: "+2348098765432", churchBranch: "Main Branch", fellowshipBand: "Peniel", departments: ["Choir", "Media"], isFirstTimer: false, wantsPermanentMembership: null, conventionGroup: "Group A", registeredAt: "2025-12-01T10:00:00Z", qrCode: "MOSYF-2026-0001" },
  { id: "MOSYF-2026-0002", fullName: "Sarah Adebayo", phoneNumber: "+2348023456789", email: "sarah.a@email.com", gender: "Female", dateOfBirth: "2003-07-22", address: "45 Grace Avenue, Lagos", occupation: "NYSC Member", emergencyContact: "+2348076543210", churchBranch: "Main Branch", fellowshipBand: "Judah", departments: ["Dance", "Decoration"], isFirstTimer: true, wantsPermanentMembership: true, conventionGroup: "Group B", registeredAt: "2025-12-15T14:30:00Z", qrCode: "MOSYF-2026-0002" },
  { id: "MOSYF-2026-0003", fullName: "David Nwosu", phoneNumber: "+2348034567890", email: "david.n@email.com", gender: "Male", dateOfBirth: "2000-11-05", address: "78 Peace Estate, Ikeja", occupation: "Software Developer", emergencyContact: "+2348065432109", churchBranch: "Main Branch", fellowshipBand: "Zion", departments: ["Technical", "Media"], isFirstTimer: false, wantsPermanentMembership: null, conventionGroup: "Group C", registeredAt: "2025-11-20T09:15:00Z", qrCode: "MOSYF-2026-0003" },
  { id: "MOSYF-2026-0004", fullName: "Grace Eze", phoneNumber: "+2348045678901", email: "grace.e@email.com", gender: "Female", dateOfBirth: "2002-04-18", address: "23 Victory Close, Yaba", occupation: "Medical Student", emergencyContact: "+2348054321098", churchBranch: "Satellite Branch 1", fellowshipBand: "Ephraim", departments: ["Prayer", "Welfare"], isFirstTimer: true, wantsPermanentMembership: true, conventionGroup: "Group D", registeredAt: "2026-01-05T11:00:00Z", qrCode: "MOSYF-2026-0004" },
  { id: "MOSYF-2026-0005", fullName: "Emmanuel Okonkwo", phoneNumber: "+2348056789012", email: "emma.o@email.com", gender: "Male", dateOfBirth: "1999-09-30", address: "56 Faith Road, Surulere", occupation: "Banker", emergencyContact: "+2348043210987", churchBranch: "Main Branch", fellowshipBand: "Peniel", departments: ["Protocol", "Security"], isFirstTimer: false, wantsPermanentMembership: null, conventionGroup: "Group A", registeredAt: "2025-10-10T08:30:00Z", qrCode: "MOSYF-2026-0005" },
  { id: "MOSYF-2026-0006", fullName: "Blessing Adeyemi", phoneNumber: "+2348067890123", email: "blessing.a@email.com", gender: "Female", dateOfBirth: "2004-01-12", address: "89 Love Street, Lekki", occupation: "Fashion Designer", emergencyContact: "+2348032109876", churchBranch: "Satellite Branch 2", fellowshipBand: "Judah", departments: ["Choir", "Dance"], isFirstTimer: false, wantsPermanentMembership: null, conventionGroup: "Group B", registeredAt: "2025-09-15T16:00:00Z", qrCode: "MOSYF-2026-0006" },
  { id: "MOSYF-2026-0007", fullName: "Daniel Ibrahim", phoneNumber: "+2348078901234", email: "daniel.i@email.com", gender: "Male", dateOfBirth: "2001-06-25", address: "34 Hope Avenue, Victoria Island", occupation: "Architect", emergencyContact: "+2348021098765", churchBranch: "Main Branch", fellowshipBand: "Zion", departments: ["Technical", "Ushering"], isFirstTimer: true, wantsPermanentMembership: false, conventionGroup: "Group C", registeredAt: "2026-02-01T13:45:00Z", qrCode: "MOSYF-2026-0007" },
  { id: "MOSYF-2026-0008", fullName: "Precious Ogbonna", phoneNumber: "+2348089012345", email: "precious.o@email.com", gender: "Female", dateOfBirth: "2003-12-08", address: "67 Joy Crescent, Ikorodu", occupation: "Teacher", emergencyContact: "+2348010987654", churchBranch: "Online Fellowship", fellowshipBand: "None", departments: ["Evangelism"], isFirstTimer: true, wantsPermanentMembership: true, conventionGroup: "Group E", registeredAt: "2026-02-10T10:30:00Z", qrCode: "MOSYF-2026-0008" },
  { id: "MOSYF-2026-0009", fullName: "Samuel Adebisi", phoneNumber: "+2348090123456", email: "samuel.a@email.com", gender: "Male", dateOfBirth: "2000-02-14", address: "12 Power Street, Abuja", occupation: "Civil Engineer", emergencyContact: "+2348098765431", churchBranch: "Satellite Branch 1", fellowshipBand: "Ephraim", departments: ["Drama", "Media"], isFirstTimer: false, wantsPermanentMembership: null, conventionGroup: "Group D", registeredAt: "2025-08-20T09:00:00Z", qrCode: "MOSYF-2026-0009" },
  { id: "MOSYF-2026-0010", fullName: "Joy Chukwu", phoneNumber: "+2348101234567", email: "joy.c@email.com", gender: "Female", dateOfBirth: "2002-08-20", address: "45 Mercy Lane, Port Harcourt", occupation: "Pharmacist", emergencyContact: "+2348076543201", churchBranch: "Main Branch", fellowshipBand: "Peniel", departments: ["Prayer", "Choir"], isFirstTimer: false, wantsPermanentMembership: null, conventionGroup: "Group A", registeredAt: "2025-07-05T14:15:00Z", qrCode: "MOSYF-2026-0010" },
  { id: "MOSYF-2026-0011", fullName: "Peter Adeleke", phoneNumber: "+2348112345678", email: "peter.a@email.com", gender: "Male", dateOfBirth: "2001-05-03", address: "78 Glory Road, Ibadan", occupation: "Law Student", emergencyContact: "+2348065432108", churchBranch: "Satellite Branch 2", fellowshipBand: "Judah", departments: ["Protocol", "Ushering"], isFirstTimer: true, wantsPermanentMembership: true, conventionGroup: "Group B", registeredAt: "2026-01-20T11:30:00Z", qrCode: "MOSYF-2026-0011" },
  { id: "MOSYF-2026-0012", fullName: "Maryam Bello", phoneNumber: "+2348123456789", email: "maryam.b@email.com", gender: "Female", dateOfBirth: "2004-10-17", address: "23 Truth Avenue, Kano", occupation: "Nursing Student", emergencyContact: "+2348054321097", churchBranch: "Online Fellowship", fellowshipBand: "None", departments: ["Welfare", "Sanitation"], isFirstTimer: true, wantsPermanentMembership: true, conventionGroup: "Group E", registeredAt: "2026-02-15T08:45:00Z", qrCode: "MOSYF-2026-0012" },
  { id: "MOSYF-2026-0013", fullName: "Joseph Momoh", phoneNumber: "+2348134567890", email: "joseph.m@email.com", gender: "Male", dateOfBirth: "1999-12-28", address: "56 Wisdom Street, Enugu", occupation: "Business Owner", emergencyContact: "+2348043210986", churchBranch: "Main Branch", fellowshipBand: "Zion", departments: ["Evangelism", "Technical"], isFirstTimer: false, wantsPermanentMembership: null, conventionGroup: "Group C", registeredAt: "2025-06-10T10:00:00Z", qrCode: "MOSYF-2026-0013" },
  { id: "MOSYF-2026-0014", fullName: "Faith Johnson", phoneNumber: "+2348145678901", email: "faith.j@email.com", gender: "Female", dateOfBirth: "2003-03-09", address: "89 Honour Close, Lagos", occupation: "Graphic Designer", emergencyContact: "+2348032109875", churchBranch: "Satellite Branch 1", fellowshipBand: "Ephraim", departments: ["Media", "Decoration"], isFirstTimer: false, wantsPermanentMembership: null, conventionGroup: "Group D", registeredAt: "2025-11-01T15:30:00Z", qrCode: "MOSYF-2026-0014" },
  { id: "MOSYF-2026-0015", fullName: "Abraham Yusuf", phoneNumber: "+2348156789012", email: "abraham.y@email.com", gender: "Male", dateOfBirth: "2000-07-01", address: "34 Favour Road, Kaduna", occupation: "Pilot", emergencyContact: "+2348021098764", churchBranch: "Satellite Branch 2", fellowshipBand: "Peniel", departments: ["Security", "Protocol"], isFirstTimer: true, wantsPermanentMembership: false, conventionGroup: "Group A", registeredAt: "2026-01-25T09:15:00Z", qrCode: "MOSYF-2026-0015" },
  { id: "MOSYF-2026-0016", fullName: "Ruth Abdullahi", phoneNumber: "+2348167890123", email: "ruth.a@email.com", gender: "Female", dateOfBirth: "2002-11-22", address: "67 Blessing Lane, Jos", occupation: "Accountant", emergencyContact: "+2348010987653", churchBranch: "Main Branch", fellowshipBand: "Judah", departments: ["Choir", "Dance", "Drama"], isFirstTimer: false, wantsPermanentMembership: null, conventionGroup: "Group B", registeredAt: "2025-10-20T12:00:00Z", qrCode: "MOSYF-2026-0016" },
  { id: "MOSYF-2026-0017", fullName: "Timothy Eze", phoneNumber: "+2348178901234", email: "timothy.e@email.com", gender: "Male", dateOfBirth: "2001-01-30", address: "12 Success Avenue, Onitsha", occupation: "Data Analyst", emergencyContact: "+2348098765430", churchBranch: "Online Fellowship", fellowshipBand: "None", departments: ["Technical"], isFirstTimer: true, wantsPermanentMembership: true, conventionGroup: "Group E", registeredAt: "2026-02-20T14:30:00Z", qrCode: "MOSYF-2026-0017" },
  { id: "MOSYF-2026-0018", fullName: "Loveth George", phoneNumber: "+2348189012345", email: "loveth.g@email.com", gender: "Female", dateOfBirth: "2004-04-14", address: "45 Divine Street, Uyo", occupation: "Mass Communication Student", emergencyContact: "+2348076543200", churchBranch: "Satellite Branch 2", fellowshipBand: "Zion", departments: ["Media", "Ushering"], isFirstTimer: false, wantsPermanentMembership: null, conventionGroup: "Group C", registeredAt: "2025-09-01T08:45:00Z", qrCode: "MOSYF-2026-0018" },
  { id: "MOSYF-2026-0019", fullName: "Isaac Olamide", phoneNumber: "+2348190123456", email: "isaac.o@email.com", gender: "Male", dateOfBirth: "2000-09-07", address: "78 Champion Road, Abeokuta", occupation: "Mechanical Engineer", emergencyContact: "+2348065432107", churchBranch: "Main Branch", fellowshipBand: "Ephraim", departments: ["Technical", "Security"], isFirstTimer: true, wantsPermanentMembership: true, conventionGroup: "Group D", registeredAt: "2026-01-10T11:00:00Z", qrCode: "MOSYF-2026-0019" },
  { id: "MOSYF-2026-0020", fullName: "Esther Babatunde", phoneNumber: "+2348201234567", email: "esther.b@email.com", gender: "Female", dateOfBirth: "2003-06-19", address: "23 Miracle Crescent, Oshogbo", occupation: "Nutritionist", emergencyContact: "+2348054321096", churchBranch: "Satellite Branch 1", fellowshipBand: "Peniel", departments: ["Welfare", "Prayer"], isFirstTimer: false, wantsPermanentMembership: null, conventionGroup: "Group A", registeredAt: "2025-08-01T13:15:00Z", qrCode: "MOSYF-2026-0020" },
  { id: "MOSYF-2026-0021", fullName: "Gabriel Suleiman", phoneNumber: "+2348212345678", email: "gabriel.s@email.com", gender: "Male", dateOfBirth: "1999-03-11", address: "56 Grace Avenue, Minna", occupation: "Pastor in Training", emergencyContact: "+2348043210985", churchBranch: "Satellite Branch 2", fellowshipBand: "Judah", departments: ["Prayer", "Evangelism"], isFirstTimer: false, wantsPermanentMembership: null, conventionGroup: "Group B", registeredAt: "2025-07-15T09:30:00Z", qrCode: "MOSYF-2026-0021" },
  { id: "MOSYF-2026-0022", fullName: "Deborah Emeka", phoneNumber: "+2348223456789", email: "deborah.e@email.com", gender: "Female", dateOfBirth: "2002-02-25", address: "89 Praise Street, Calabar", occupation: "Biochemist", emergencyContact: "+2348032109874", churchBranch: "Main Branch", fellowshipBand: "Zion", departments: ["Choir", "Decoration"], isFirstTimer: true, wantsPermanentMembership: true, conventionGroup: "Group C", registeredAt: "2026-02-05T10:45:00Z", qrCode: "MOSYF-2026-0022" },
  { id: "MOSYF-2026-0023", fullName: "Moses Danjuma", phoneNumber: "+2348234567890", email: "moses.d@email.com", gender: "Male", dateOfBirth: "2001-08-13", address: "34 Worship Road, Makurdi", occupation: "Agricultural Economist", emergencyContact: "+2348021098763", churchBranch: "Online Fellowship", fellowshipBand: "None", departments: ["Ushering"], isFirstTimer: true, wantsPermanentMembership: false, conventionGroup: "Group E", registeredAt: "2026-02-25T08:00:00Z", qrCode: "MOSYF-2026-0023" },
  { id: "MOSYF-2026-0024", fullName: "Hannah Musa", phoneNumber: "+2348245678901", email: "hannah.m@email.com", gender: "Female", dateOfBirth: "2004-12-01", address: "67 Anointing Lane, Sokoto", occupation: "Law Student", emergencyContact: "+2348010987652", churchBranch: "Satellite Branch 1", fellowshipBand: "Ephraim", departments: ["Drama", "Media"], isFirstTimer: false, wantsPermanentMembership: null, conventionGroup: "Group D", registeredAt: "2025-12-20T14:00:00Z", qrCode: "MOSYF-2026-0024" },
  { id: "MOSYF-2026-0025", fullName: "Caleb Nnamdi", phoneNumber: "+2348256789012", email: "caleb.n@email.com", gender: "Male", dateOfBirth: "2000-05-26", address: "12 Dominion Street, Owerri", occupation: "Electrical Engineer", emergencyContact: "+2348098765429", churchBranch: "Main Branch", fellowshipBand: "Peniel", departments: ["Technical", "Media", "Choir"], isFirstTimer: false, wantsPermanentMembership: null, conventionGroup: "Group A", registeredAt: "2025-06-20T11:30:00Z", qrCode: "MOSYF-2026-0025" },
  { id: "MOSYF-2026-0026", fullName: "Rebecca Hassan", phoneNumber: "+2348267890123", email: "rebecca.h@email.com", gender: "Female", dateOfBirth: "2003-09-15", address: "45 Covenant Avenue, Akure", occupation: "Public Health Officer", emergencyContact: "+2348076543199", churchBranch: "Satellite Branch 2", fellowshipBand: "Judah", departments: ["Welfare", "Prayer"], isFirstTimer: true, wantsPermanentMembership: true, conventionGroup: "Group B", registeredAt: "2026-01-30T09:45:00Z", qrCode: "MOSYF-2026-0026" },
  { id: "MOSYF-2026-0027", fullName: "Nathaniel Kola", phoneNumber: "+2348278901234", email: "nathaniel.k@email.com", gender: "Male", dateOfBirth: "2001-11-08", address: "78 Breakthrough Road, Ado-Ekiti", occupation: "IT Consultant", emergencyContact: "+2348065432106", churchBranch: "Main Branch", fellowshipBand: "Zion", departments: ["Technical", "Protocol"], isFirstTimer: false, wantsPermanentMembership: null, conventionGroup: "Group C", registeredAt: "2025-10-05T08:15:00Z", qrCode: "MOSYF-2026-0027" },
  { id: "MOSYF-2026-0028", fullName: "Dorcas Osei", phoneNumber: "+2348289012345", email: "dorcas.o@email.com", gender: "Female", dateOfBirth: "2002-07-03", address: "23 Excellence Close, Benin", occupation: "Dentistry Student", emergencyContact: "+2348054321095", churchBranch: "Online Fellowship", fellowshipBand: "None", departments: ["Sanitation", "Decoration"], isFirstTimer: true, wantsPermanentMembership: true, conventionGroup: "Group E", registeredAt: "2026-03-01T12:00:00Z", qrCode: "MOSYF-2026-0028" },
  { id: "MOSYF-2026-0029", fullName: "Elijah Akinola", phoneNumber: "+2348290123456", email: "elijah.a@email.com", gender: "Male", dateOfBirth: "1999-01-17", address: "56 Prosperity Lane, Ilorin", occupation: "Chartered Accountant", emergencyContact: "+2348043210984", churchBranch: "Satellite Branch 1", fellowshipBand: "Ephraim", departments: ["Security", "Ushering"], isFirstTimer: false, wantsPermanentMembership: null, conventionGroup: "Group D", registeredAt: "2025-09-10T15:45:00Z", qrCode: "MOSYF-2026-0029" },
  { id: "MOSYF-2026-0030", fullName: "Abigail Tijani", phoneNumber: "+2348301234567", email: "abigail.t@email.com", gender: "Female", dateOfBirth: "2004-05-21", address: "89 Revelation Street, Warri", occupation: "Marine Biology Student", emergencyContact: "+2348032109873", churchBranch: "Satellite Branch 2", fellowshipBand: "Peniel", departments: ["Dance", "Choir"], isFirstTimer: true, wantsPermanentMembership: true, conventionGroup: "Group A", registeredAt: "2026-02-28T10:15:00Z", qrCode: "MOSYF-2026-0030" },
  { id: "MOSYF-2026-0031", fullName: "Silas Obi", phoneNumber: "+2348312345678", email: "silas.o@email.com", gender: "Male", dateOfBirth: "2000-10-04", address: "12 Overflow Avenue, Aba", occupation: "Chemical Engineer", emergencyContact: "+2348021098762", churchBranch: "Main Branch", fellowshipBand: "Judah", departments: ["Technical"], isFirstTimer: false, wantsPermanentMembership: null, conventionGroup: "Group B", registeredAt: "2025-08-15T11:00:00Z", qrCode: "MOSYF-2026-0031" },
  { id: "MOSYF-2026-0032", fullName: "Kehinde Balogun", phoneNumber: "+2348323456789", email: "kehinde.b@email.com", gender: "Female", dateOfBirth: "2003-02-28", address: "45 Harvest Road, Osogbo", occupation: "Agricultural Science Student", emergencyContact: "+2348010987651", churchBranch: "Main Branch", fellowshipBand: "Zion", departments: ["Evangelism", "Protocol"], isFirstTimer: false, wantsPermanentMembership: null, conventionGroup: "Group C", registeredAt: "2025-11-10T14:30:00Z", qrCode: "MOSYF-2026-0032" },
  { id: "MOSYF-2026-0033", fullName: "Philemon Yakubu", phoneNumber: "+2348334567890", email: "philemon.y@email.com", gender: "Male", dateOfBirth: "2001-04-09", address: "78 Light Lane, Bauchi", occupation: "Physiotherapist", emergencyContact: "+2348098765428", churchBranch: "Online Fellowship", fellowshipBand: "None", departments: ["Welfare"], isFirstTimer: true, wantsPermanentMembership: true, conventionGroup: "Group E", registeredAt: "2026-03-05T09:00:00Z", qrCode: "MOSYF-2026-0033" },
  { id: "MOSYF-2026-0034", fullName: "Priscilla Adegoke", phoneNumber: "+2348345678901", email: "priscilla.a@email.com", gender: "Female", dateOfBirth: "2002-06-16", address: "34 Word Avenue, Ogbomoso", occupation: "Veterinary Doctor", emergencyContact: "+2348076543198", churchBranch: "Satellite Branch 1", fellowshipBand: "Ephraim", departments: ["Drama", "Decoration"], isFirstTimer: false, wantsPermanentMembership: null, conventionGroup: "Group D", registeredAt: "2025-12-05T13:00:00Z", qrCode: "MOSYF-2026-0034" },
  { id: "MOSYF-2026-0035", fullName: "Stephen Makinde", phoneNumber: "+2348356789012", email: "stephen.m@email.com", gender: "Male", dateOfBirth: "1999-08-23", address: "67 Restoration Close, Iseyin", occupation: "Quantity Surveyor", emergencyContact: "+2348065432105", churchBranch: "Satellite Branch 2", fellowshipBand: "Peniel", departments: ["Protocol", "Security", "Ushering"], isFirstTimer: true, wantsPermanentMembership: false, conventionGroup: "Group A", registeredAt: "2026-01-15T10:30:00Z", qrCode: "MOSYF-2026-0035" },
  { id: "MOSYF-2026-0036", fullName: "Tabitha Lawal", phoneNumber: "+2348367890123", email: "tabitha.l@email.com", gender: "Female", dateOfBirth: "2004-11-11", address: "12 Glory Road, Ilesa", occupation: "Pharmacy Student", emergencyContact: "+2348054321094", churchBranch: "Main Branch", fellowshipBand: "Judah", departments: ["Choir", "Prayer"], isFirstTimer: true, wantsPermanentMembership: true, conventionGroup: "Group B", registeredAt: "2026-03-10T11:45:00Z", qrCode: "MOSYF-2026-0036" },
  { id: "MOSYF-2026-0037", fullName: "Andrew Fashola", phoneNumber: "+2348378901234", email: "andrew.f@email.com", gender: "Male", dateOfBirth: "2000-12-29", address: "45 Truth Lane, Ede", occupation: "Estate Surveyor", emergencyContact: "+2348043210983", churchBranch: "Main Branch", fellowshipBand: "Zion", departments: ["Technical", "Media"], isFirstTimer: false, wantsPermanentMembership: null, conventionGroup: "Group C", registeredAt: "2025-07-20T08:00:00Z", qrCode: "MOSYF-2026-0037" },
  { id: "MOSYF-2026-0038", fullName: "Lydia Odeyemi", phoneNumber: "+2348389012345", email: "lydia.o@email.com", gender: "Female", dateOfBirth: "2003-01-06", address: "89 Life Avenue, Ife", occupation: "Economics Student", emergencyContact: "+2348032109872", churchBranch: "Satellite Branch 1", fellowshipBand: "Ephraim", departments: ["Ushering", "Dance"], isFirstTimer: false, wantsPermanentMembership: null, conventionGroup: "Group D", registeredAt: "2025-09-25T15:15:00Z", qrCode: "MOSYF-2026-0038" },
  { id: "MOSYF-2026-0039", fullName: "Mark Bamidele", phoneNumber: "+2348390123456", email: "mark.b@email.com", gender: "Male", dateOfBirth: "2001-03-20", address: "23 Living Word Street, Ikirun", occupation: "Computer Scientist", emergencyContact: "+2348021098761", churchBranch: "Online Fellowship", fellowshipBand: "None", departments: ["Technical", "Media"], isFirstTimer: true, wantsPermanentMembership: true, conventionGroup: "Group E", registeredAt: "2026-03-15T14:00:00Z", qrCode: "MOSYF-2026-0039" },
  { id: "MOSYF-2026-0040", fullName: "Martha Salami", phoneNumber: "+2348401234567", email: "martha.s@email.com", gender: "Female", dateOfBirth: "2002-09-13", address: "56 Spirit Lane, Iwo", occupation: "Food Scientist", emergencyContact: "+2348010987650", churchBranch: "Satellite Branch 2", fellowshipBand: "Peniel", departments: ["Welfare", "Decoration", "Sanitation"], isFirstTimer: false, wantsPermanentMembership: null, conventionGroup: "Group A", registeredAt: "2025-10-25T09:30:00Z", qrCode: "MOSYF-2026-0040" },
  { id: "MOSYF-2026-0041", fullName: "Luke Onyekachi", phoneNumber: "+2348412345678", email: "luke.o@email.com", gender: "Male", dateOfBirth: "2000-06-02", address: "12 Fire Avenue, Ekiti", occupation: "Robotics Engineer", emergencyContact: "+2348098765427", churchBranch: "Main Branch", fellowshipBand: "Judah", departments: ["Technical", "Drama"], isFirstTimer: true, wantsPermanentMembership: true, conventionGroup: "Group B", registeredAt: "2026-02-12T10:00:00Z", qrCode: "MOSYF-2026-0041" },
  { id: "MOSYF-2026-0042", fullName: "Anna Ogundele", phoneNumber: "+2348423456789", email: "anna.o@email.com", gender: "Female", dateOfBirth: "2004-07-24", address: "45 Anointing Road, Ondo", occupation: "Political Science Student", emergencyContact: "+2348076543197", churchBranch: "Satellite Branch 1", fellowshipBand: "Zion", departments: ["Prayer", "Evangelism"], isFirstTimer: true, wantsPermanentMembership: true, conventionGroup: "Group C", registeredAt: "2026-03-18T08:30:00Z", qrCode: "MOSYF-2026-0042" },
  { id: "MOSYF-2026-0043", fullName: "Paul Akintola", phoneNumber: "+2348434567890", email: "paul.a@email.com", gender: "Male", dateOfBirth: "1999-02-18", address: "78 Grace Close, Igboho", occupation: "Financial Analyst", emergencyContact: "+2348065432104", churchBranch: "Main Branch", fellowshipBand: "Ephraim", departments: ["Protocol", "Security"], isFirstTimer: false, wantsPermanentMembership: null, conventionGroup: "Group D", registeredAt: "2025-08-05T12:45:00Z", qrCode: "MOSYF-2026-0043" },
  { id: "MOSYF-2026-0044", fullName: "Rachel Owolabi", phoneNumber: "+2348445678901", email: "rachel.o@email.com", gender: "Female", dateOfBirth: "2003-10-10", address: "34 Peace Lane, Oyo", occupation: "English Student", emergencyContact: "+2348054321093", churchBranch: "Satellite Branch 2", fellowshipBand: "Peniel", departments: ["Choir", "Drama"], isFirstTimer: false, wantsPermanentMembership: null, conventionGroup: "Group A", registeredAt: "2025-11-25T11:00:00Z", qrCode: "MOSYF-2026-0044" },
  { id: "MOSYF-2026-0045", fullName: "Thomas Bakare", phoneNumber: "+2348456789012", email: "thomas.b@email.com", gender: "Male", dateOfBirth: "2001-12-05", address: "12 Joy Avenue, Sagamu", occupation: "Marine Engineer", emergencyContact: "+2348043210982", churchBranch: "Online Fellowship", fellowshipBand: "None", departments: ["Technical"], isFirstTimer: true, wantsPermanentMembership: false, conventionGroup: "Group E", registeredAt: "2026-03-20T09:00:00Z", qrCode: "MOSYF-2026-0045" },
  { id: "MOSYF-2026-0046", fullName: "Miriam Okparaeke", phoneNumber: "+2348467890123", email: "miriam.o@email.com", gender: "Female", dateOfBirth: "2002-03-30", address: "45 Love Close, Sapele", occupation: "Microbiologist", emergencyContact: "+2348032109871", churchBranch: "Main Branch", fellowshipBand: "Judah", departments: ["Welfare", "Prayer", "Choir"], isFirstTimer: false, wantsPermanentMembership: null, conventionGroup: "Group B", registeredAt: "2025-07-01T14:00:00Z", qrCode: "MOSYF-2026-0046" },
  { id: "MOSYF-2026-0047", fullName: "James Odumosu", phoneNumber: "+2348478901234", email: "james.o@email.com", gender: "Male", dateOfBirth: "2000-04-22", address: "78 Faith Road, Ijebu-Ode", occupation: "Civil Servant", emergencyContact: "+2348021098760", churchBranch: "Satellite Branch 1", fellowshipBand: "Zion", departments: ["Ushering", "Protocol"], isFirstTimer: true, wantsPermanentMembership: true, conventionGroup: "Group C", registeredAt: "2026-01-08T10:15:00Z", qrCode: "MOSYF-2026-0047" },
  { id: "MOSYF-2026-0048", fullName: "Elizabeth Adesiyan", phoneNumber: "+2348489012345", email: "elizabeth.a@email.com", gender: "Female", dateOfBirth: "2004-08-14", address: "23 Victory Lane, Ile-Ife", occupation: "History Student", emergencyContact: "+2348010987649", churchBranch: "Satellite Branch 2", fellowshipBand: "Ephraim", departments: ["Dance", "Decoration"], isFirstTimer: true, wantsPermanentMembership: true, conventionGroup: "Group D", registeredAt: "2026-03-22T11:30:00Z", qrCode: "MOSYF-2026-0048" },
  { id: "MOSYF-2026-0049", fullName: "Simon Afolabi", phoneNumber: "+2348490123456", email: "simon.a@email.com", gender: "Male", dateOfBirth: "2001-01-01", address: "56 Dominion Avenue, Ikire", occupation: "Electrical Technician", emergencyContact: "+2348098765426", churchBranch: "Main Branch", fellowshipBand: "Peniel", departments: ["Technical", "Security"], isFirstTimer: false, wantsPermanentMembership: null, conventionGroup: "Group A", registeredAt: "2025-09-15T08:45:00Z", qrCode: "MOSYF-2026-0049" },
  { id: "MOSYF-2026-0050", fullName: "Victoria Esubiyi", phoneNumber: "+2348501234567", email: "victoria.e@email.com", gender: "Female", dateOfBirth: "2003-05-07", address: "89 Excellence Road, Ila", occupation: "Biochemistry Student", emergencyContact: "+2348076543196", churchBranch: "Online Fellowship", fellowshipBand: "None", departments: ["Choir"], isFirstTimer: true, wantsPermanentMembership: true, conventionGroup: "Group E", registeredAt: "2026-03-25T13:00:00Z", qrCode: "MOSYF-2026-0050" },
];

const MOCK_EXECUTIVES: Executive[] = [
  { id: "MOSYF-ESC-0001", fullName: "Michael Emenike", leadershipRole: "President", department: "Prayer", fellowshipBand: "Peniel", phoneNumber: "+2348034567890", email: "michael.e@mosyf.org", address: "1 Fellowship Road, Lagos", registeredAt: "2025-11-01T09:00:00Z" },
  { id: "MOSYF-ESC-0002", fullName: "Sarah Okafor", leadershipRole: "Vice President", department: "Choir", fellowshipBand: "Judah", phoneNumber: "+2348045678901", email: "sarah.o@mosyf.org", address: "12 Grace Avenue, Lagos", registeredAt: "2025-11-01T09:00:00Z" },
  { id: "MOSYF-ESC-0003", fullName: "David Adeyemi", leadershipRole: "Secretary", department: "Media", fellowshipBand: "Zion", phoneNumber: "+2348056789012", email: "david.a@mosyf.org", address: "23 Peace Street, Lagos", registeredAt: "2025-11-01T09:00:00Z" },
  { id: "MOSYF-ESC-0004", fullName: "Grace Ibrahim", leadershipRole: "Assistant Secretary", department: "Welfare", fellowshipBand: "Ephraim", phoneNumber: "+2348067890123", email: "grace.i@mosyf.org", address: "34 Love Close, Lagos", registeredAt: "2025-11-01T09:00:00Z" },
  { id: "MOSYF-ESC-0005", fullName: "John Nwachukwu", leadershipRole: "Financial Secretary", department: "Technical", fellowshipBand: "Peniel", phoneNumber: "+2348078901234", email: "john.n@mosyf.org", address: "45 Hope Road, Lagos", registeredAt: "2025-11-01T09:00:00Z" },
  { id: "MOSYF-ESC-0006", fullName: "Blessing Eze", leadershipRole: "Prayer Coordinator", department: "Prayer", fellowshipBand: "Judah", phoneNumber: "+2348089012345", email: "blessing.e@mosyf.org", address: "56 Faith Avenue, Lagos", registeredAt: "2025-11-01T09:00:00Z" },
  { id: "MOSYF-ESC-0007", fullName: "Emmanuel Okonkwo", leadershipRole: "Choir Director", department: "Choir", fellowshipBand: "Zion", phoneNumber: "+2348090123456", email: "emma.o@mosyf.org", address: "67 Victory Lane, Lagos", registeredAt: "2025-11-01T09:00:00Z" },
  { id: "MOSYF-ESC-0008", fullName: "Ruth Abiodun", leadershipRole: "Welfare Coordinator", department: "Welfare", fellowshipBand: "Ephraim", phoneNumber: "+2348101234567", email: "ruth.a@mosyf.org", address: "78 Dominion Street, Lagos", registeredAt: "2025-11-01T09:00:00Z" },
  { id: "MOSYF-ESC-0009", fullName: "Daniel Musa", leadershipRole: "Evangelism Coordinator", department: "Evangelism", fellowshipBand: "Peniel", phoneNumber: "+2348112345678", email: "daniel.m@mosyf.org", address: "89 Breakthrough Road, Lagos", registeredAt: "2025-11-01T09:00:00Z" },
  { id: "MOSYF-ESC-0010", fullName: "Loveth George", leadershipRole: "Technical Director", department: "Technical", fellowshipBand: "Judah", phoneNumber: "+2348123456789", email: "loveth.g@mosyf.org", address: "12 Excellence Close, Lagos", registeredAt: "2025-11-01T09:00:00Z" },
  { id: "MOSYF-ESC-0011", fullName: "Samuel Adeleke", leadershipRole: "Media Director", department: "Media", fellowshipBand: "Zion", phoneNumber: "+2348134567890", email: "samuel.a@mosyf.org", address: "23 Glory Avenue, Lagos", registeredAt: "2025-11-01T09:00:00Z" },
  { id: "MOSYF-ESC-0012", fullName: "Deborah Hassan", leadershipRole: "Youth Pastor", department: "Prayer", fellowshipBand: "Ephraim", phoneNumber: "+2348145678901", email: "deborah.h@mosyf.org", address: "34 Anointing Lane, Lagos", registeredAt: "2025-11-01T09:00:00Z" },
  { id: "MOSYF-ESC-0013", fullName: "Joseph Odeyemi", leadershipRole: "Protocol Head", department: "Protocol", fellowshipBand: "Peniel", phoneNumber: "+2348156789012", email: "joseph.o@mosyf.org", address: "45 Covenant Road, Lagos", registeredAt: "2025-11-01T09:00:00Z" },
  { id: "MOSYF-ESC-0014", fullName: "Mary Tijani", leadershipRole: "Dance Coordinator", department: "Dance", fellowshipBand: "Judah", phoneNumber: "+2348167890123", email: "mary.t@mosyf.org", address: "56 Restoration Close, Lagos", registeredAt: "2025-11-01T09:00:00Z" },
  { id: "MOSYF-ESC-0015", fullName: "Andrew Fashola", leadershipRole: "Drama Director", department: "Drama", fellowshipBand: "Zion", phoneNumber: "+2348178901234", email: "andrew.f@mosyf.org", address: "67 Living Word Street, Lagos", registeredAt: "2025-11-01T09:00:00Z" },
];

const MOCK_ATTENDANCE: AttendanceRecord[] = Array.from({ length: 50 }, (_, i) => {
  const member = MOCK_MEMBERS[i % MOCK_MEMBERS.length];
  return {
    id: `ATT-${String(i + 1).padStart(4, '0')}`,
    memberId: member.id,
    memberName: member.fullName,
    checkInTime: new Date(Date.now() - Math.random() * 86400000 * 3).toISOString(),
    verificationMethod: ['biometric', 'qr_code', 'manual'][Math.floor(Math.random() * 3)] as VerificationMethod,
    status: 'present',
    sessionName: ['Morning Session Day 1', 'Evening Session Day 1', 'Morning Session Day 2', 'Evening Session Day 2'][Math.floor(Math.random() * 4)],
  };
});

const MOCK_FIRST_TIMERS: FirstTimer[] = MOCK_MEMBERS.filter(m => m.isFirstTimer).map((m, i) => ({
  id: `FT-${String(i + 1).padStart(4, '0')}`,
  fullName: m.fullName,
  phoneNumber: m.phoneNumber,
  gender: m.gender,
  invitedBy: MOCK_MEMBERS[Math.floor(Math.random() * MOCK_MEMBERS.length)].fullName,
  wantsPermanentMembership: m.wantsPermanentMembership ?? false,
  dateVisited: m.registeredAt,
  followedUp: Math.random() > 0.3,
}));

const DEFAULT_SETTINGS: ConventionSettings = {
  name: "Mountain of Solution Youth Fellowship Convention 2026",
  startDate: "2026-10-22",
  endDate: "2026-10-25",
  location: "Mountain of Solution Headquarters, Lagos",
  theme: "Walk With Me",
  scripture: "Micah 6:8",
  isActive: true,
  maxAttendees: 500,
  sessions: [
    { id: "s1", name: "Opening Ceremony", date: "2026-08-15", startTime: "09:00", endTime: "12:00", venue: "Main Auditorium" },
    { id: "s2", name: "Youth Worship Night", date: "2026-08-15", startTime: "18:00", endTime: "21:00", venue: "Main Auditorium" },
    { id: "s3", name: "Leadership Workshop", date: "2026-08-16", startTime: "09:00", endTime: "12:00", venue: "Conference Hall A" },
    { id: "s4", name: "Sports & Games", date: "2026-08-16", startTime: "14:00", endTime: "17:00", venue: "Sports Complex" },
    { id: "s5", name: "Gala Night", date: "2026-08-16", startTime: "19:00", endTime: "22:00", venue: "Banquet Hall" },
    { id: "s6", name: "Closing Ceremony", date: "2026-08-17", startTime: "10:00", endTime: "13:00", venue: "Main Auditorium" },
  ],
};

const AppDataContext = createContext<AppDataContextType | undefined>(undefined);
const MEMBERS_STORAGE_KEY = 'mosyf-members';
const EXECUTIVES_STORAGE_KEY = 'mosyf-executives';
const FIRST_TIMERS_STORAGE_KEY = 'mosyf-first-timers';
const GENERATED_LINKS_STORAGE_KEY = 'mosyf-generated-links';
const ATTENDANCE_STORAGE_KEY = 'mosyf-attendance';
const BIOMETRIC_LOGS_STORAGE_KEY = 'mosyf-biometric-logs';
const ADMIN_ACTIVITIES_STORAGE_KEY = 'mosyf-admin-activities';
const CONVENTION_SETTINGS_STORAGE_KEY = 'mosyf-convention-settings';
const STORAGE_ENTITIES = {
  [MEMBERS_STORAGE_KEY]: 'members',
  [EXECUTIVES_STORAGE_KEY]: 'executives',
  [ATTENDANCE_STORAGE_KEY]: 'attendance',
  [BIOMETRIC_LOGS_STORAGE_KEY]: 'biometricLogs',
  [ADMIN_ACTIVITIES_STORAGE_KEY]: 'adminActivities',
  [FIRST_TIMERS_STORAGE_KEY]: 'firstTimers',
  [GENERATED_LINKS_STORAGE_KEY]: 'generatedLinks',
} as const;

const DEFAULT_BIOMETRIC_DEVICES: BiometricDevice[] = [
  {
    id: 'bio-bridge-01',
    name: 'Convention Biometric Bridge',
    vendor: 'SDK Bridge',
    connectionType: 'WebSocket Bridge',
    status: 'online',
    lastHeartbeat: new Date().toISOString(),
  },
  {
    id: 'usb-fallback-01',
    name: 'USB Scanner Adapter',
    vendor: 'Digital Persona',
    connectionType: 'USB',
    status: 'connecting',
    lastHeartbeat: new Date().toISOString(),
  },
];

function readStoredList<T>(key: string, fallback: T[]): T[] {
  const entity = STORAGE_ENTITIES[key as keyof typeof STORAGE_ENTITIES];
  if (!entity) return fallback;
  const records = localStorageRepository.list(entity) as T[];
  return records.length ? records : fallback;
}

function readStoredValue<T>(key: string, fallback: T): T {
  if (key !== CONVENTION_SETTINGS_STORAGE_KEY) return fallback;
  const stored = localStorageRepository.getSettings();
  return stored ? { ...fallback, ...stored } as T : fallback;
}

function createSecureToken(prefix: 'mem' | 'exec') {
  const bytes = new Uint8Array(18);
  window.crypto?.getRandomValues?.(bytes);
  const random = Array.from(bytes, byte => byte.toString(36).padStart(2, '0')).join('');
  return `${prefix}_${random}_${Date.now().toString(36)}`;
}

function ensureMemberTokens(members: Member[]) {
  return members.map(member => ({
    ...member,
    statusToken: member.statusToken ?? createSecureToken('mem'),
    qrCode: member.qrCode || member.id,
    biometricStatus: member.biometricStatus ?? 'pending_verification',
    accessClaims: member.accessClaims ?? {},
  }));
}

function ensureExecutiveTokens(executives: Executive[]) {
  return executives.map(exec => ({
    ...exec,
    statusToken: exec.statusToken ?? createSecureToken('exec'),
    registrationStatus: exec.registrationStatus ?? 'executive',
    accessClaims: exec.accessClaims ?? {},
  }));
}

export function AppDataProvider({ children }: { children: ReactNode }) {
  const currentEventId = localStorageRepository.currentEventId;
  const [members, setMembers] = useState<Member[]>(() => ensureMemberTokens(readStoredList<Member>(MEMBERS_STORAGE_KEY, MOCK_MEMBERS)));
  const [executives, setExecutives] = useState<Executive[]>(() => ensureExecutiveTokens(readStoredList<Executive>(EXECUTIVES_STORAGE_KEY, MOCK_EXECUTIVES)));
  const [attendance, setAttendance] = useState<AttendanceRecord[]>(() => readStoredList<AttendanceRecord>(ATTENDANCE_STORAGE_KEY, MOCK_ATTENDANCE));
  const [biometricLogs, setBiometricLogs] = useState<BiometricLog[]>(() => readStoredList<BiometricLog>(BIOMETRIC_LOGS_STORAGE_KEY, []));
  const [biometricDevices, setBiometricDevices] = useState<BiometricDevice[]>(DEFAULT_BIOMETRIC_DEVICES);
  const [adminActivities, setAdminActivities] = useState<AdminActivityLog[]>(() => readStoredList<AdminActivityLog>(ADMIN_ACTIVITIES_STORAGE_KEY, []));
  const [firstTimers, setFirstTimers] = useState<FirstTimer[]>(() => readStoredList<FirstTimer>(FIRST_TIMERS_STORAGE_KEY, MOCK_FIRST_TIMERS));
  const [conventionSettings, setConventionSettings] = useState<ConventionSettings>(() => readStoredValue<ConventionSettings>(CONVENTION_SETTINGS_STORAGE_KEY, DEFAULT_SETTINGS));
  const [generatedLinks, setGeneratedLinks] = useState<GeneratedLink[]>(() => readStoredList<GeneratedLink>(GENERATED_LINKS_STORAGE_KEY, []));
  const [bands, setBands] = useState<Band[]>(() => localStorageRepository.list('bands'));
  const [departments, setDepartments] = useState<DepartmentItem[]>(() => localStorageRepository.list('departments'));
  const [churchGroups, setChurchGroups] = useState<ChurchGroup[]>(() => localStorageRepository.list('churchGroups'));
  const [churchLocations, setChurchLocations] = useState<ChurchLocation[]>(() => localStorageRepository.list('churchLocations'));
  const [programmes, setProgrammes] = useState<Programme[]>(() => localStorageRepository.list('programmes'));
  const [conventionRoles, setConventionRoles] = useState<ConventionRole[]>(() => localStorageRepository.list('conventionRoles'));

  useEffect(() => {
    const unsubscribe = localStorageRepository.subscribe(() => {
    setBands(localStorageRepository.list('bands'));
    setDepartments(localStorageRepository.list('departments'));
    setChurchGroups(localStorageRepository.list('churchGroups'));
    setChurchLocations(localStorageRepository.list('churchLocations'));
    setProgrammes(localStorageRepository.list('programmes'));
      setConventionRoles(localStorageRepository.list('conventionRoles'));
    });
    return () => { unsubscribe(); };
  }, []);

  useEffect(() => {
    try {
      localStorageRepository.replace('members', members);
    } catch (error) {
      console.warn('Unable to persist members locally.', error);
    }
  }, [members]);

  useEffect(() => {
    try {
      localStorageRepository.replace('executives', executives);
    } catch (error) {
      console.warn('Unable to persist executives locally.', error);
    }
  }, [executives]);

  useEffect(() => {
    try {
      localStorageRepository.replace('attendance', attendance);
    } catch (error) {
      console.warn('Unable to persist attendance locally.', error);
    }
  }, [attendance]);

  useEffect(() => {
    try {
      localStorageRepository.replace('biometricLogs', biometricLogs);
    } catch (error) {
      console.warn('Unable to persist biometric logs locally.', error);
    }
  }, [biometricLogs]);

  useEffect(() => {
    try {
      localStorageRepository.replace('adminActivities', adminActivities);
    } catch (error) {
      console.warn('Unable to persist admin activities locally.', error);
    }
  }, [adminActivities]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setBiometricDevices(prev => prev.map(device => ({
        ...device,
        status: device.id === 'bio-bridge-01' ? 'online' : device.status,
        lastHeartbeat: new Date().toISOString(),
      })));
    }, 5000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    try {
      localStorageRepository.replace('firstTimers', firstTimers);
    } catch (error) {
      console.warn('Unable to persist first timers locally.', error);
    }
  }, [firstTimers]);

  useEffect(() => {
    try {
      localStorageRepository.replace('generatedLinks', generatedLinks);
    } catch (error) {
      console.warn('Unable to persist generated links locally.', error);
    }
  }, [generatedLinks]);

  useEffect(() => {
    try {
      localStorageRepository.setSettings(conventionSettings);
    } catch (error) {
      console.warn('Unable to persist convention settings locally.', error);
    }
  }, [conventionSettings]);

  const generateMemberId = useCallback(() => {
    const highest = members.reduce((max, member) => {
      const match = member.id.match(/^MOSYF-2026-(\d+)$/);
      return match ? Math.max(max, Number(match[1])) : max;
    }, 0);
    const nextNum = highest + 1;
    return `MOSYF-2026-${String(nextNum).padStart(4, '0')}`;
  }, [members]);

  const assignConventionGroup = useCallback((band: FellowshipBand): ConventionGroup => {
    return assignLeastPopulatedGroup(band, members);
  }, [members]);

  const addMember = useCallback((memberData: Omit<Member, 'id' | 'conventionGroup' | 'registeredAt' | 'qrCode'>): Member => {
    const normalizedEmail = memberData.email.trim().toLowerCase();
    if (members.some(member => member.email.trim().toLowerCase() === normalizedEmail)) {
      throw new Error('A member has already registered with this email address.');
    }
    const id = generateMemberId();
    const group = assignConventionGroup(memberData.fellowshipBand);
    const newMember: Member = {
      ...memberData,
      email: normalizedEmail,
      id,
      conventionGroup: group,
      registeredAt: new Date().toISOString(),
      statusToken: createSecureToken('mem'),
      qrCode: id,
      biometricStatus: 'pending_verification',
      accessClaims: {},
    };
    setMembers(prev => [...prev, newMember]);
    return newMember;
  }, [members, generateMemberId, assignConventionGroup]);

  const addExecutive = useCallback((execData: Omit<Executive, 'id' | 'registeredAt'>): Executive => {
    const normalizedEmail = execData.email.trim().toLowerCase();
    if (executives.some(exec => exec.email.trim().toLowerCase() === normalizedEmail)) {
      throw new Error('An executive has already registered with this email address.');
    }
    const highest = executives.reduce((max, exec) => {
      const match = exec.id.match(/^MOSYF-ESC-(\d+)$/);
      return match ? Math.max(max, Number(match[1])) : max;
    }, 0);
    const nextNum = highest + 1;
    const id = `MOSYF-ESC-${String(nextNum).padStart(4, '0')}`;
    const newExec: Executive = {
      ...execData,
      email: normalizedEmail,
      id,
      statusToken: createSecureToken('exec'),
      registeredAt: new Date().toISOString(),
      registrationStatus: 'executive',
      accessClaims: {},
    };
    setExecutives(prev => [...prev, newExec]);
    return newExec;
  }, [executives]);

  const addAttendance = useCallback((record: Omit<AttendanceRecord, 'id'>): AttendanceRecord => {
    const id = `ATT-${String(attendance.length + 1).padStart(4, '0')}`;
    const newRecord = { ...record, id };
    setAttendance(prev => [newRecord, ...prev]);
    return newRecord;
  }, [attendance.length]);

  const addAdminActivity = useCallback((actorEmail: string, actorName: string, action: AdminActivityLog['action'], target: string) => {
    setAdminActivities(prev => [{
      id: `ACT-${Date.now()}`,
      actorEmail,
      actorName,
      action,
      target,
      createdAt: new Date().toISOString(),
    }, ...prev].slice(0, 80));
  }, []);

  const verifyMemberBiometric = useCallback((memberId: string, actorEmail: string, actorName: string) => {
    const member = members.find(m => m.id === memberId);
    const scannerId = biometricDevices.find(device => device.status === 'online')?.id ?? 'offline';
    if (!member) {
      return { ok: false, duplicate: false, message: 'Member not found' };
    }

    const today = new Date().toDateString();
    const duplicate = attendance.some(record => record.memberId === memberId && new Date(record.checkInTime).toDateString() === today);
    const now = new Date().toISOString();

    if (duplicate) {
      setMembers(prev => prev.map(item => item.id === memberId ? { ...item, biometricStatus: 'duplicate_attempt' } : item));
      setBiometricLogs(prev => [{
        id: `BIO-${Date.now()}`,
        memberId,
        memberName: member.fullName,
        scannerId,
        status: 'duplicate' as const,
        message: 'Duplicate attendance attempt detected',
        createdAt: now,
      }, ...prev].slice(0, 100));
      addAdminActivity(actorEmail, actorName, 'verification', `${member.fullName} duplicate biometric attempt`);
      return { ok: false, duplicate: true, message: 'Duplicate attendance attempt detected' };
    }

    const templateId = member.fingerprintTemplateId ?? `TPL-${memberId.replace(/[^A-Z0-9]/gi, '')}`;
    const newRecord: AttendanceRecord = {
      id: `ATT-${String(attendance.length + 1).padStart(4, '0')}`,
      memberId,
      memberName: member.fullName,
      checkInTime: now,
      verificationMethod: 'biometric',
      status: 'present',
      sessionName: 'Biometric Convention Entry',
    };

    setMembers(prev => prev.map(item => item.id === memberId ? {
      ...item,
      biometricStatus: 'verified_checked_in',
      fingerprintTemplateId: templateId,
      lastVerifiedAt: now,
    } : item));
    setAttendance(prev => [newRecord, ...prev]);
    setBiometricLogs(prev => [{
      id: `BIO-${Date.now()}`,
      memberId,
      memberName: member.fullName,
      scannerId,
      status: 'success' as const,
      message: 'Fingerprint captured, enrolled, and checked in',
      createdAt: now,
    }, ...prev].slice(0, 100));
    addAdminActivity(actorEmail, actorName, 'verification', `${member.fullName} biometric verified`);
    return { ok: true, duplicate: false, message: 'Biometric verified and attendance recorded' };
  }, [members, biometricDevices, attendance, addAdminActivity]);

  const claimAccessItem = useCallback((memberId: string, item: AccessItemType, actorEmail: string, actorName: string) => {
    const member = members.find(m => m.id === memberId);
    if (!member) return { ok: false, message: 'Member not found' };
    if (member.biometricStatus !== 'verified_checked_in') {
      return { ok: false, message: 'Biometric verification required before access is granted' };
    }
    if (member.accessClaims?.[item]) {
      return { ok: false, message: `${item.charAt(0).toUpperCase() + item.slice(1)} Already Collected` };
    }
    const now = new Date().toISOString();
    setMembers(prev => prev.map(row => row.id === memberId ? {
      ...row,
      accessClaims: { ...(row.accessClaims ?? {}), [item]: now },
    } : row));
    addAdminActivity(actorEmail, actorName, 'access', `${member.fullName} ${item} access granted`);
    return { ok: true, message: `${item.charAt(0).toUpperCase() + item.slice(1)} access granted` };
  }, [members, addAdminActivity]);

  const promoteExecutiveToAdmin = useCallback((executiveId: string, actorEmail: string, actorName: string) => {
    const executive = executives.find(exec => exec.id === executiveId);
    if (!executive) return;
    const now = new Date().toISOString();
    setExecutives(prev => prev.map(exec => exec.id === executiveId ? {
      ...exec,
      registrationStatus: 'admin',
      adminGrantedAt: now,
      adminRevokedAt: undefined,
    } : exec));
    addAdminActivity(actorEmail, actorName, 'role', `${executive.fullName} granted admin access`);
  }, [executives, addAdminActivity]);

  const revokeExecutiveAdmin = useCallback((executiveId: string, actorEmail: string, actorName: string) => {
    const executive = executives.find(exec => exec.id === executiveId);
    if (!executive) return;
    const now = new Date().toISOString();
    setExecutives(prev => prev.map(exec => exec.id === executiveId ? {
      ...exec,
      registrationStatus: 'executive',
      adminRevokedAt: now,
    } : exec));
    addAdminActivity(actorEmail, actorName, 'role', `${executive.fullName} admin access revoked`);
  }, [executives, addAdminActivity]);

  const addFirstTimer = useCallback((ft: Omit<FirstTimer, 'id'>): FirstTimer => {
    const id = `FT-${String(firstTimers.length + 1).padStart(4, '0')}`;
    const newFt = { ...ft, id };
    setFirstTimers(prev => [...prev, newFt]);
    return newFt;
  }, [firstTimers.length]);

  const updateConventionSettings = useCallback((settings: Partial<ConventionSettings>) => {
    setConventionSettings(prev => ({ ...prev, ...settings }));
  }, []);

  const assignExecutiveRole = useCallback((executiveId: string, leadershipRole: string, actorEmail: string, actorName: string) => {
    const executive = executives.find(exec => exec.id === executiveId);
    if (!executive) return;

    setExecutives(prev => prev.map(exec => exec.id === executiveId ? {
      ...exec,
      leadershipRole,
    } : exec));
    addAdminActivity(actorEmail, actorName, 'role', `${executive.fullName} assigned role: ${leadershipRole}`);
  }, [executives, addAdminActivity]);

  const addGeneratedLink = useCallback((link: Omit<GeneratedLink, 'id' | 'createdAt'>): GeneratedLink => {
    const id = `LINK-${Date.now()}`;
    const newLink = { ...link, id, createdAt: new Date().toISOString() };
    setGeneratedLinks(prev => [...prev, newLink]);
    return newLink;
  }, []);

  const validateGeneratedLink = useCallback((type: GeneratedLink['type'], token: string | null): GeneratedLink | null => {
    if (!token) return null;
    return generatedLinks.find(link => link.type === type && link.token === token && link.status === 'active') ?? null;
  }, [generatedLinks]);

  const recordGeneratedLinkUse = useCallback((id: string) => {
    setGeneratedLinks(prev => prev.map(link => link.id === id ? { ...link, uses: link.uses + 1 } : link));
  }, []);

  const deleteMember = useCallback((id: string) => {
    setMembers(prev => prev.filter(m => m.id !== id));
  }, []);

  const deleteExecutive = useCallback((id: string) => {
    setExecutives(prev => prev.filter(e => e.id !== id));
  }, []);

  const updateMember = useCallback((id: string, updates: Partial<Member>) => {
    setMembers(prev => prev.map(m => m.id === id ? { ...m, ...updates } : m));
  }, []);

  const resetDemoData = useCallback(() => {
    localStorageRepository.reset();
    window.location.reload();
  }, []);

  const addListActivity = useCallback((actorEmail: string, actorName: string, target: string) => {
    setAdminActivities(prev => [{ id: crypto.randomUUID(), eventId: currentEventId, actorEmail, actorName, action: 'role' as const, target, createdAt: new Date().toISOString() }, ...prev].slice(0, 80));
  }, [currentEventId]);

  const saveListItem = useCallback((entity: 'bands' | 'departments' | 'churchGroups' | 'churchLocations', item: Partial<Band> & Pick<Band, 'name'>, actorEmail: string, actorName: string) => {
    const current = localStorageRepository.list(entity);
    if (current.some(row => row.name.toLowerCase() === item.name.trim().toLowerCase() && row.id !== item.id)) throw new Error('List names must be unique.');
    localStorageRepository.write(entity, { ...item, id: item.id ?? crypto.randomUUID(), name: item.name.trim(), active: item.active ?? true, sortOrder: item.sortOrder ?? current.length } as never, actorEmail);
    addListActivity(actorEmail, actorName, 'Updated ' + entity + ': ' + item.name.trim());
  }, [addListActivity]);

  const deleteListItem = useCallback((entity: 'bands' | 'departments' | 'churchGroups' | 'churchLocations', id: string, actorEmail: string, actorName: string) => {
    const records = localStorageRepository.list(entity);
    const item = records.find(row => row.id === id);
    if (!item) return { ok: false, message: 'List item not found.' };
    const referenced = entity === 'bands' ? members.some(row => row.fellowshipBand === item.name) || executives.some(row => row.fellowshipBand === item.name)
      : entity === 'departments' ? members.some(row => row.departments.includes(item.name as Department)) || executives.some(row => row.department === item.name)
      : entity === 'churchGroups' ? members.some(row => row.conventionGroup === item.name)
      : members.some(row => row.churchBranch === item.name);
    if (referenced) {
      localStorageRepository.write(entity, { ...item, active: false } as never, actorEmail);
      addListActivity(actorEmail, actorName, 'Deactivated ' + entity + ': ' + item.name);
      return { ok: false, message: 'This item is in use and was deactivated instead.' };
    }
    localStorageRepository.replace(entity, records.filter(row => row.id !== id));
    addListActivity(actorEmail, actorName, 'Deleted ' + entity + ': ' + item.name);
    return { ok: true };
  }, [addListActivity, executives, members]);

  const saveProgramme = useCallback((programme: Partial<Programme> & Pick<Programme, 'title' | 'date' | 'startTime' | 'endTime' | 'location'>, actorEmail: string, actorName: string) => {
    localStorageRepository.write('programmes', { ...programme, id: programme.id ?? crypto.randomUUID(), description: programme.description ?? '', active: programme.active ?? true, sortOrder: programme.sortOrder ?? programmes.length } as never, actorEmail);
    addListActivity(actorEmail, actorName, 'Updated programme: ' + programme.title);
  }, [addListActivity, programmes.length]);
  const deleteProgramme = useCallback((id: string, actorEmail: string, actorName: string) => {
    const programme = programmes.find(row => row.id === id);
    localStorageRepository.replace('programmes', programmes.filter(row => row.id !== id));
    if (programme) addListActivity(actorEmail, actorName, 'Deleted programme: ' + programme.title);
  }, [addListActivity, programmes]);
  const assignConventionRole = useCallback((userEmail: string, role: ConventionRoleName, actorEmail: string, actorName: string) => {
    localStorageRepository.write('conventionRoles', { id: crypto.randomUUID(), userEmail: userEmail.toLowerCase(), role, assignedBy: actorEmail, assignedAt: new Date().toISOString() } as never, actorEmail);
    addListActivity(actorEmail, actorName, 'Assigned ' + role + ' to ' + userEmail);
  }, [addListActivity]);
  const revokeConventionRole = useCallback((id: string, actorEmail: string, actorName: string) => {
    const role = conventionRoles.find(row => row.id === id);
    localStorageRepository.replace('conventionRoles', conventionRoles.filter(row => row.id !== id));
    if (role) addListActivity(actorEmail, actorName, 'Revoked ' + role.role + ' from ' + role.userEmail);
  }, [addListActivity, conventionRoles]);

  const findAttendeeByStatusToken = useCallback((token: string | undefined) => {
    if (!token) return null;
    const member = members.find(item => item.statusToken === token);
    if (member) return { type: 'member' as const, attendee: member };
    const executive = executives.find(item => item.statusToken === token);
    if (executive) return { type: 'executive' as const, attendee: executive };
    return null;
  }, [executives, members]);

  const getStatusUrl = useCallback((attendee: Member | Executive) => {
    const token = attendee.statusToken ?? ('conventionGroup' in attendee ? createSecureToken('mem') : createSecureToken('exec'));
    const basePath = `${window.location.origin}${window.location.pathname}`;
    return `${basePath}#/convention/status/${token}`;
  }, []);

  return (
    <AppDataContext.Provider value={{
      currentEventId, members, executives, attendance, biometricLogs, biometricDevices, adminActivities, firstTimers, conventionSettings, generatedLinks, bands, departments, churchGroups, churchLocations, programmes, conventionRoles,
      findAttendeeByStatusToken, getStatusUrl,
      addMember, addExecutive, addAttendance, verifyMemberBiometric, claimAccessItem, promoteExecutiveToAdmin, revokeExecutiveAdmin, addFirstTimer,
      updateConventionSettings, assignExecutiveRole, addGeneratedLink, validateGeneratedLink, recordGeneratedLinkUse,
      deleteMember, deleteExecutive, updateMember,
      generateMemberId, assignConventionGroup, resetDemoData, saveListItem, deleteListItem, saveProgramme, deleteProgramme, assignConventionRole, revokeConventionRole,
    }}>
      {children}
    </AppDataContext.Provider>
  );
}

export function useAppData() {
  const ctx = useContext(AppDataContext);
  if (!ctx) throw new Error('useAppData must be used within AppDataProvider');
  return ctx;
}
