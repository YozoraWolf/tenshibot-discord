// Type definitions for TenshiBot Discord Bot

export interface FlairData {
  name: string;
  color: string;
  ico: string;
}

export interface StringsData {
  rules: string;
  flairs: string;
  nsfw: string;
}

export interface StatusData {
  type: number;
  msg: string;
}

export interface MemberData {
  id: string;
}

export interface BirthdayData {
  [userId: string]: {
    name: string;
    day: number;
    month: number;
    years?: {
      [year: string]: {
        celebrated: boolean;
        messageId: string;
      };
    };
  };
}

export interface TimeZoneData {
  value: string;
  name: string;
}

export interface PhraseData {
  randomphrases: {
    english: string[];
  };
}