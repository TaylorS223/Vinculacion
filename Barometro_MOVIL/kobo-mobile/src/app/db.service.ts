import { Injectable } from '@angular/core';
import Dexie from 'dexie';

export interface BranchRule {
  option_index: number;
  action?: 'CONTINUE' | 'GO_TO' | 'END_FORM';
  next_question_id?: string | null;
}

export interface FormDefinition {
  id: string;
  title: string;
  description?: string;
  link_uuid: string;
  questions: FormQuestion[];
  downloadedAt: number;
  target_responses?: number;
  responses_count?: number;
  step_by_step?: boolean;
}

export interface FormQuestion {
  id: string;
  type: 'TEXT' | 'NUMBER' | 'SINGLE_CHOICE' | 'MULTIPLE_CHOICE' | 'LIKERT';
  label: string;
  options?: string[];
  required: boolean;
  order: number;
  likert_rows?: string[];
  likert_columns?: string[];
  branch_rules?: BranchRule[];
}

export interface SavedResponse {
  id?: number;
  formId: string;
  link_uuid: string;
  formTitle: string;
  answers: Record<string, any>;
  estado: 'borrador' | 'listo-para-enviar' | 'enviado';
  createdAt: string;
  duration: string;
}

export interface FormInfo {
  id: string;
  title: string;
  description?: string;
  link_uuid?: string;
  questionCount: number;
  updatedAt?: string;
}

@Injectable({ providedIn: 'root' })
export class DbService extends Dexie {
  forms!: Dexie.Table<FormDefinition, string>;
  responses!: Dexie.Table<SavedResponse, number>;
  formList!: Dexie.Table<FormInfo, string>;

  constructor() {
    super('KoboMobileDB');
    this.version(2).stores({
      forms: 'id, title, link_uuid',
      responses: '++id, formId, estado, createdAt',
      formList: 'id, title'
    });
  }
}
