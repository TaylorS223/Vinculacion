import { Injectable, computed, inject, signal } from '@angular/core';
import { Form, FormQuestion, FormService } from '@core/services/form.service';
import { Project, ProjectService } from '@core/services/project.service';
import { TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';

export interface FormQuestionDraft {
  id?: string;
  tempId: string;
  type: FormQuestion['type'];
  label: string;
  options: string[];
  likertRows: string[];
  likertColumns: string[];
  required: boolean;
  order: number;
}

const SELECT_TYPES: FormQuestion['type'][] = ['SINGLE_CHOICE', 'MULTIPLE_CHOICE'];
const DEFAULT_LIKERT_OPTIONS = [
  'Totalmente en desacuerdo',
  'En desacuerdo',
  'Neutral',
  'De acuerdo',
  'Totalmente de acuerdo',
];
const DEFAULT_LIKERT_ROWS = ['Nueva afirmacion'];

@Injectable()
export class FormBuilderViewModel {
  private formService = inject(FormService);
  private projectService = inject(ProjectService);
  private translate = inject(TranslateService);

  formId = signal<string | null>(null);
  projectId = signal<string | null>(null);
  projects = signal<Project[]>([]);
  title = signal('');
  description = signal('');
  state = signal<Form['state']>('DRAFT');
  questions = signal<FormQuestionDraft[]>([]);
  deletedQuestionIds = signal<string[]>([]);
  isLoading = signal(false);
  isSaving = signal(false);
  errorMessage = signal('');
  successMessage = signal('');

  isEditMode = computed(() => Boolean(this.formId()));
  questionsCount = computed(() => this.questions().length);
  canEditQuestions = computed(() => this.state() !== 'DEPLOYED');
  isFormValid = computed(() => {
    const hasTitle = this.title().trim().length > 0;
    const hasProject = Boolean(this.projectId());
    const hasQuestions = this.questions().length > 0;
    const allQuestionsValid = this.questions().every((question) => {
      const hasLabel = question.label.trim().length > 0;
      if (question.type === 'LIKERT') {
        const filledRows = question.likertRows.filter((row) => row.trim().length > 0);
        const filledColumns = question.likertColumns.filter((column) => column.trim().length > 0);
        return filledRows.length > 0 && filledColumns.length > 0;
      }

      const needsOptions = SELECT_TYPES.includes(question.type);
      const filledOptions = question.options.filter((option) => option.trim().length > 0);
      return hasLabel && (!needsOptions || filledOptions.length > 0);
    });

    return hasTitle && hasProject && hasQuestions && allQuestionsValid && this.canEditQuestions();
  });

  async loadForm(id: string): Promise<void> {
    this.isLoading.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');

    try {
      const form = await firstValueFrom(this.formService.getForm(id));
      this.formId.set(form.id);
      this.projectId.set(form.project_id ?? null);
      this.title.set(form.title);
      this.description.set(form.description ?? '');
      this.state.set(form.state);
      this.deletedQuestionIds.set([]);
      this.questions.set(
        (form.questions ?? [])
          .slice()
          .sort((a, b) => a.order - b.order)
          .map((question, index) => this.toDraft(question, index)),
      );
    } catch (error: any) {
      this.errorMessage.set(error?.error?.message || this.translate.instant('forms.builder.errors.load'));
    } finally {
      this.isLoading.set(false);
    }
  }

  async loadProjects(): Promise<void> {
    try {
      const projects = await firstValueFrom(this.projectService.getProjects());
      this.projects.set(projects);
    } catch {
      this.projects.set([]);
    }
  }

  addQuestion(type: FormQuestion['type']): void {
    if (!this.canEditQuestions()) return;

    const newQuestion: FormQuestionDraft = {
      tempId: this.createTempId(),
      type,
      label: '',
      options: this.getInitialOptions(type),
      likertRows: type === 'LIKERT' ? [...DEFAULT_LIKERT_ROWS] : [],
      likertColumns: type === 'LIKERT' ? [...DEFAULT_LIKERT_OPTIONS] : [],
      required: true,
      order: this.questions().length,
    };

    this.questions.update((questions) => [...questions, newQuestion]);
  }

  removeQuestion(tempId: string): void {
    if (!this.canEditQuestions()) return;

    const current = this.questions().find((question) => question.tempId === tempId);
    if (current?.id) {
      this.deletedQuestionIds.update((ids) => [...ids, current.id as string]);
    }

    this.questions.update((questions) =>
      questions
        .filter((question) => question.tempId !== tempId)
        .map((question, index) => ({ ...question, order: index })),
    );
  }

  moveQuestion(tempId: string, direction: -1 | 1): void {
    if (!this.canEditQuestions()) return;

    const questions = [...this.questions()];
    const index = questions.findIndex((question) => question.tempId === tempId);
    const target = index + direction;

    if (index < 0 || target < 0 || target >= questions.length) return;

    [questions[index], questions[target]] = [questions[target], questions[index]];
    this.questions.set(questions.map((question, order) => ({ ...question, order })));
  }

  updateTitle(value: string): void {
    this.title.set(value);
    this.clearMessages();
  }

  updateDescription(value: string): void {
    this.description.set(value);
    this.clearMessages();
  }

  updateProject(projectId: string | null): void {
    this.projectId.set(projectId || null);
    this.clearMessages();
  }

  updateQuestionLabel(tempId: string, label: string): void {
    this.patchQuestion(tempId, { label });
  }

  updateQuestionRequired(tempId: string, required: boolean): void {
    this.patchQuestion(tempId, { required });
  }

  addOption(tempId: string): void {
    this.questions.update((questions) =>
      questions.map((question) =>
        question.tempId === tempId ? { ...question, options: [...question.options, ''] } : question,
      ),
    );
  }

  updateOption(tempId: string, optionIndex: number, value: string): void {
    this.questions.update((questions) =>
      questions.map((question) => {
        if (question.tempId !== tempId) return question;

        const options = [...question.options];
        options[optionIndex] = value;
        return { ...question, options };
      }),
    );
  }

  removeOption(tempId: string, optionIndex: number): void {
    this.questions.update((questions) =>
      questions.map((question) => {
        if (question.tempId !== tempId || question.options.length <= 1) return question;

        return {
          ...question,
          options: question.options.filter((_, index) => index !== optionIndex),
        };
      }),
    );
  }

  addLikertRow(tempId: string): void {
    this.questions.update((questions) =>
      questions.map((question) =>
        question.tempId === tempId ? { ...question, likertRows: [...question.likertRows, ''] } : question,
      ),
    );
  }

  updateLikertRow(tempId: string, rowIndex: number, value: string): void {
    this.questions.update((questions) =>
      questions.map((question) => {
        if (question.tempId !== tempId) return question;

        const likertRows = [...question.likertRows];
        likertRows[rowIndex] = value;
        return { ...question, likertRows };
      }),
    );
  }

  removeLikertRow(tempId: string, rowIndex: number): void {
    this.questions.update((questions) =>
      questions.map((question) => {
        if (question.tempId !== tempId || question.likertRows.length <= 1) return question;

        return {
          ...question,
          likertRows: question.likertRows.filter((_, index) => index !== rowIndex),
        };
      }),
    );
  }

  addLikertColumn(tempId: string): void {
    this.questions.update((questions) =>
      questions.map((question) =>
        question.tempId === tempId ? { ...question, likertColumns: [...question.likertColumns, ''] } : question,
      ),
    );
  }

  updateLikertColumn(tempId: string, columnIndex: number, value: string): void {
    this.questions.update((questions) =>
      questions.map((question) => {
        if (question.tempId !== tempId) return question;

        const likertColumns = [...question.likertColumns];
        likertColumns[columnIndex] = value;
        return { ...question, likertColumns };
      }),
    );
  }

  removeLikertColumn(tempId: string, columnIndex: number): void {
    this.questions.update((questions) =>
      questions.map((question) => {
        if (question.tempId !== tempId || question.likertColumns.length <= 1) return question;

        return {
          ...question,
          likertColumns: question.likertColumns.filter((_, index) => index !== columnIndex),
        };
      }),
    );
  }

  async saveForm(): Promise<void> {
    if (!this.isFormValid()) {
      this.errorMessage.set(this.translate.instant('forms.builder.messages.invalid'));
      this.successMessage.set('');
      return;
    }

    this.isSaving.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');

    try {
      const formId = this.formId();
      const savedForm = formId
        ? await firstValueFrom(
            this.formService.updateForm(formId, {
              title: this.title().trim(),
              description: this.description().trim(),
            }),
          )
        : await firstValueFrom(
            this.formService.createForm({
              title: this.title().trim(),
              description: this.description().trim(),
              project_id: this.projectId(),
            }),
          );

      this.formId.set(savedForm.id);
      this.state.set(savedForm.state);

      for (const questionId of this.deletedQuestionIds()) {
        await firstValueFrom(this.formService.deleteQuestion(questionId));
      }

      for (const question of this.questions()) {
        const payload = this.toQuestionPayload(question);

        if (question.id) {
          await firstValueFrom(this.formService.updateQuestion(question.id, payload));
        } else {
          const created = await firstValueFrom(this.formService.createQuestion(savedForm.id, payload));
          this.patchQuestion(question.tempId, { id: created.id, tempId: created.id });
        }
      }

      this.deletedQuestionIds.set([]);
      this.successMessage.set(this.translate.instant('forms.builder.messages.saved'));
    } catch (error: any) {
      this.errorMessage.set(error?.error?.message || this.translate.instant('forms.builder.errors.save'));
    } finally {
      this.isSaving.set(false);
    }
  }

  resetForm(): void {
    this.formId.set(null);
    this.projectId.set(null);
    this.title.set('');
    this.description.set('');
    this.state.set('DRAFT');
    this.questions.set([]);
    this.deletedQuestionIds.set([]);
    this.clearMessages();
  }

  getTypeLabel(type: FormQuestion['type']): string {
    const labels: Record<FormQuestion['type'], string> = {
      SINGLE_CHOICE: 'forms.builder.types.SINGLE_CHOICE',
      MULTIPLE_CHOICE: 'forms.builder.types.MULTIPLE_CHOICE',
      LIKERT: 'forms.builder.types.LIKERT',
      TEXT: 'forms.builder.types.TEXT',
      NUMBER: 'forms.builder.types.NUMBER',
    };

    return labels[type];
  }

  getQuestionDisplayLabel(question: FormQuestionDraft): string {
    const label = question.label.trim();
    if (label.length > 0) return label;

    return question.type === 'LIKERT'
      ? this.translate.instant('forms.builder.types.LIKERT')
      : this.translate.instant('forms.builder.untitledQuestion');
  }

  private toDraft(question: FormQuestion, order: number): FormQuestionDraft {
    return {
      id: question.id,
      tempId: question.id,
      type: question.type,
      label: question.label,
      options: this.normalizeOptions(question),
      likertRows: this.normalizeLikertRows(question),
      likertColumns: this.normalizeLikertColumns(question),
      required: question.required,
      order,
    };
  }

  private normalizeOptions(question: FormQuestion): string[] {
    if (Array.isArray(question.options) && question.options.length > 0) {
      return question.options.map((option) => String(option));
    }

    return SELECT_TYPES.includes(question.type) ? [''] : [];
  }

  private normalizeLikertRows(question: FormQuestion): string[] {
    if (question.type !== 'LIKERT') return [];

    if (question.options && !Array.isArray(question.options) && Array.isArray(question.options.rows)) {
      return question.options.rows.length > 0 ? question.options.rows.map((row) => String(row)) : [...DEFAULT_LIKERT_ROWS];
    }

    return [question.label || DEFAULT_LIKERT_ROWS[0]];
  }

  private normalizeLikertColumns(question: FormQuestion): string[] {
    if (question.type !== 'LIKERT') return [];

    if (question.options && !Array.isArray(question.options) && Array.isArray(question.options.columns)) {
      return question.options.columns.length > 0
        ? question.options.columns.map((column) => String(column))
        : [...DEFAULT_LIKERT_OPTIONS];
    }

    if (Array.isArray(question.options) && question.options.length > 0) {
      return question.options.map((option) => String(option));
    }

    return [...DEFAULT_LIKERT_OPTIONS];
  }

  private getInitialOptions(type: FormQuestion['type']): string[] {
    if (SELECT_TYPES.includes(type)) return [''];
    return [];
  }

  private toQuestionPayload(question: FormQuestionDraft): Partial<FormQuestion> {
    const options = question.type === 'LIKERT'
      ? {
          rows: question.likertRows.map((row) => row.trim()).filter(Boolean),
          columns: question.likertColumns.map((column) => column.trim()).filter(Boolean),
        }
      : SELECT_TYPES.includes(question.type)
        ? question.options.map((option) => option.trim()).filter(Boolean)
        : null;

    return {
      type: question.type,
      label: question.label.trim() || this.translate.instant('forms.builder.types.LIKERT'),
      required: question.required,
      order: question.order,
      options,
    };
  }

  private patchQuestion(tempId: string, patch: Partial<FormQuestionDraft>): void {
    this.questions.update((questions) =>
      questions.map((question) =>
        question.tempId === tempId ? { ...question, ...patch } : question,
      ),
    );
    this.clearMessages();
  }

  private createTempId(): string {
    return `tmp-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }

  private clearMessages(): void {
    this.errorMessage.set('');
    this.successMessage.set('');
  }
}
