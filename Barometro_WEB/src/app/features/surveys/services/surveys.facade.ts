import { inject, Injectable } from '@angular/core';
import { SURVEY_REPOSITORY } from '../../../core/tokens/repository.tokens';
import { SurveyRepository } from '../../../data-access/repositories/survey.repository';
import { Survey, SurveyStatus } from '../models/survey.model';

@Injectable({ providedIn: 'root' })
export class SurveysFacade {
  private readonly surveyRepository = inject(SURVEY_REPOSITORY) as SurveyRepository;

  list() {
    return this.surveyRepository.list();
  }

  findById(id: string) {
    return this.surveyRepository.findById(id);
  }

  create(survey: Omit<Survey, 'id' | 'createdAt' | 'updatedAt' | 'version'>) {
    return this.surveyRepository.create(survey);
  }

  update(id: string, changes: Partial<Survey>) {
    return this.surveyRepository.update(id, changes);
  }

  changeStatus(id: string, status: SurveyStatus) {
    return this.surveyRepository.changeStatus(id, status);
  }

  duplicate(id: string) {
    return this.surveyRepository.duplicate(id);
  }

  delete(id: string) {
    return this.surveyRepository.delete(id);
  }
}
