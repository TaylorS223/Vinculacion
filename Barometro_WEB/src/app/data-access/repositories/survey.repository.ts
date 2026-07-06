import { Observable } from 'rxjs';
import { Survey, SurveyStatus } from '../../features/surveys/models/survey.model';

export interface SurveyRepository {
  list(): Observable<Survey[]>;
  findById(id: string): Observable<Survey | null>;
  create(survey: Omit<Survey, 'id' | 'createdAt' | 'updatedAt' | 'version'>): Observable<Survey>;
  update(id: string, changes: Partial<Survey>): Observable<Survey>;
  delete(id: string): Observable<void>;
  duplicate(id: string): Observable<Survey>;
  changeStatus(id: string, status: SurveyStatus): Observable<Survey>;
}
