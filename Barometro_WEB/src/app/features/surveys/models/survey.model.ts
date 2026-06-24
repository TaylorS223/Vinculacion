import { Question } from './question.model';

export type SurveyStatus = 'DRAFT' | 'IMPLEMENTED' | 'ARCHIVED';

export interface Survey {
  id: string;
  title: string;
  description?: string;
  status: SurveyStatus;
  version: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  questions: Question[];
}
