import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { UnsavedChangesComponent } from '../../../../core/guards/unsaved-changes.guard';
import { Question, QuestionType } from '../../models/question.model';
import { SurveyStatus } from '../../models/survey.model';
import { QuestionFactoryService } from '../../services/question-factory.service';
import { SurveysFacade } from '../../services/surveys.facade';

@Component({
  selector: 'app-survey-builder-page',
  imports: [ReactiveFormsModule],
  templateUrl: './survey-builder-page.component.html',
  styleUrl: './survey-builder-page.component.css',
})
export class SurveyBuilderPageComponent implements UnsavedChangesComponent {
  private readonly formBuilder = inject(FormBuilder);
  private readonly surveysFacade = inject(SurveysFacade);
  private readonly questionFactory = inject(QuestionFactoryService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly questionTypes: QuestionType[] = [
    'MULTIPLE_CHOICE',
    'SINGLE_CHOICE',
    'LIKERT',
    'TEXT',
    'NUMBER',
  ];

  protected readonly statusOptions: SurveyStatus[] = ['DRAFT', 'IMPLEMENTED', 'ARCHIVED'];

  protected readonly form = this.formBuilder.nonNullable.group({
    title: ['', [Validators.required, Validators.minLength(5)]],
    description: [''],
    status: ['DRAFT' as SurveyStatus, [Validators.required]],
  });

  protected readonly questions = signal<Question[]>([]);
  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly dirty = signal(false);
  protected readonly selectedType = signal<QuestionType>('SINGLE_CHOICE');
  protected readonly pageTitle = computed(() => (this.surveyId ? 'Editar formulario' : 'Nuevo formulario'));
  protected readonly isFormInvalid = computed(
    () => this.form.invalid || this.questions().length === 0 || this.saving(),
  );

  private readonly surveyId = this.route.snapshot.paramMap.get('id');

  constructor() {
    if (!this.surveyId) {
      return;
    }

    this.loading.set(true);
    this.surveysFacade
      .findById(this.surveyId)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe((survey) => {
        if (!survey) {
          return;
        }

        this.form.patchValue({
          title: survey.title,
          description: survey.description ?? '',
          status: survey.status,
        });
        this.questions.set(structuredClone(survey.questions));
        this.dirty.set(false);
      });
  }

  protected selectType(event: Event): void {
    const value = (event.target as HTMLSelectElement).value as QuestionType;
    this.selectedType.set(value);
  }

  protected addQuestion(): void {
    const question = this.questionFactory.create(this.selectedType(), this.questions().length + 1);
    this.questions.update((prev) => [...prev, question]);
    this.markDirty();
  }

  protected removeQuestion(questionId: string): void {
    this.questions.update((prev) =>
      prev.filter((question) => question.id !== questionId).map((question, index) => ({ ...question, order: index + 1 })),
    );
    this.markDirty();
  }

  protected moveQuestion(questionId: string, direction: 'up' | 'down'): void {
    const list = [...this.questions()];
    const index = list.findIndex((question) => question.id === questionId);
    const target = direction === 'up' ? index - 1 : index + 1;

    if (index < 0 || target < 0 || target >= list.length) {
      return;
    }

    [list[index], list[target]] = [list[target], list[index]];
    this.questions.set(list.map((question, idx) => ({ ...question, order: idx + 1 })));
    this.markDirty();
  }

  protected updateQuestionLabel(questionId: string, label: string): void {
    this.questions.update((prev) =>
      prev.map((question) => (question.id === questionId ? { ...question, label } : question)),
    );
    this.markDirty();
  }

  protected toggleRequired(questionId: string, required: boolean): void {
    this.questions.update((prev) =>
      prev.map((question) => (question.id === questionId ? { ...question, required } : question)),
    );
    this.markDirty();
  }

  protected addOption(questionId: string): void {
    this.questions.update((prev) =>
      prev.map((question) => {
        if (question.id !== questionId || (question.type !== 'SINGLE_CHOICE' && question.type !== 'MULTIPLE_CHOICE')) {
          return question;
        }

        return {
          ...question,
          options: [
            ...question.options,
            {
              id: `opt-${crypto.randomUUID()}`,
              label: `Opción ${question.options.length + 1}`,
              value: `opcion_${question.options.length + 1}`,
            },
          ],
        };
      }),
    );
    this.markDirty();
  }

  protected updateOptionLabel(questionId: string, optionId: string, label: string): void {
    this.questions.update((prev) =>
      prev.map((question) => {
        if (question.id !== questionId || (question.type !== 'SINGLE_CHOICE' && question.type !== 'MULTIPLE_CHOICE')) {
          return question;
        }

        return {
          ...question,
          options: question.options.map((option) =>
            option.id === optionId
              ? {
                  ...option,
                  label,
                  value: label.trim().toLowerCase().replace(/\s+/g, '_') || option.value,
                }
              : option,
          ),
        };
      }),
    );
    this.markDirty();
  }

  protected save(): void {
    this.form.markAllAsTouched();
    if (this.isFormInvalid()) {
      return;
    }

    const payload = {
      ...this.form.getRawValue(),
      description: this.form.getRawValue().description || undefined,
      createdBy: 'u-admin',
      questions: this.questions(),
    };

    this.saving.set(true);

    const request$ = this.surveyId
      ? this.surveysFacade.update(this.surveyId, payload)
      : this.surveysFacade.create(payload);

    request$.pipe(finalize(() => this.saving.set(false))).subscribe(() => {
      this.dirty.set(false);
      this.router.navigateByUrl('/surveys');
    });
  }

  hasUnsavedChanges(): boolean {
    return this.dirty();
  }

  protected trackByQuestionId(_: number, question: Question): string {
    return question.id;
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

  protected statusLabel(status: SurveyStatus): string {
    if (status === 'DRAFT') {
      return 'Borrador';
    }

    if (status === 'IMPLEMENTED') {
      return 'Implementado';
    }

    return 'Archivado';
  }

  private markDirty(): void {
    this.dirty.set(true);
  }
}
