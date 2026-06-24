import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { Survey } from '../../models/survey.model';
import { SurveysFacade } from '../../services/surveys.facade';
import { QuestionType } from '../../models/question.model';

@Component({
  selector: 'app-survey-detail-page',
  imports: [RouterLink],
  templateUrl: './survey-detail-page.component.html',
  styleUrl: './survey-detail-page.component.css',
})
export class SurveyDetailPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly surveysFacade = inject(SurveysFacade);

  protected readonly surveyId = this.route.snapshot.paramMap.get('id') ?? '';
  protected readonly loading = signal(false);
  protected readonly survey = signal<Survey | null>(null);

  constructor() {
    if (!this.surveyId) {
      return;
    }

    this.loading.set(true);
    this.surveysFacade
      .findById(this.surveyId)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe((survey) => this.survey.set(survey));
  }

  protected statusLabel(status: Survey['status']): string {
    if (status === 'DRAFT') {
      return 'Borrador';
    }

    if (status === 'IMPLEMENTED') {
      return 'Implementado';
    }

    return 'Archivado';
  }

  protected questionTypeLabel(type: QuestionType): string {
    if (type === 'MULTIPLE_CHOICE') {
      return 'Selección múltiple';
    }

    if (type === 'SINGLE_CHOICE') {
      return 'Selección única';
    }

    if (type === 'LIKERT') {
      return 'Escala de Likert';
    }

    if (type === 'TEXT') {
      return 'Texto';
    }

    return 'Número';
  }
}
