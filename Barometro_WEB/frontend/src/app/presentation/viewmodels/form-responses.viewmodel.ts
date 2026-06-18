import { Injectable, computed, inject, signal } from '@angular/core';
import { FormQuestion, FormService } from '@core/services/form.service';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface FormResponseRow {
  id: string;
  submitted_at: string;
  answers: Record<string, string>;
}

export interface QuestionChart {
  questionId: string;
  label: string;
  type: FormQuestion['type'];
  categories: string[];
  values: number[];
}

@Injectable()
export class FormResponsesViewModel {
  private formService = inject(FormService);

  formId = signal<string | null>(null);
  formTitle = signal('');
  questions = signal<FormQuestion[]>([]);
  responses = signal<FormResponseRow[]>([]);
  stats = signal<Record<string, Record<string, number>>>({});
  isLoading = signal(false);
  errorMessage = signal('');
  isExporting = signal(false);

  chartableQuestions = computed<QuestionChart[]>(() => {
    const statsData = this.stats();
    const questionList = this.questions();

    return questionList
      .filter((q) => ['SINGLE_CHOICE', 'MULTIPLE_CHOICE', 'LIKERT'].includes(q.type))
      .map((q) => {
        const counts = statsData[q.id] ?? {};
        const categories = Object.keys(counts);
        return {
          questionId: q.id,
          label: q.label,
          type: q.type,
          categories,
          values: categories.map((c) => counts[c]),
        };
      })
      .filter((c) => c.categories.length > 0);
  });

  tableColumns = computed(() => {
    const cols = this.questions().map((q) => ({
      key: q.id,
      label: q.label,
    }));
    return [{ key: '_submitted', label: 'Fecha envio' }, ...cols];
  });

  async load(formId: string): Promise<void> {
    this.formId.set(formId);
    this.isLoading.set(true);
    this.errorMessage.set('');

    try {
      const [form, responseData, statsData] = await Promise.all([
        firstValueFrom(this.formService.getForm(formId)),
        firstValueFrom(this.formService.getResponses(formId)),
        firstValueFrom(this.formService.getStats(formId)),
      ]);

      this.formTitle.set(form.title);
      this.questions.set(responseData.questions ?? form.questions ?? []);
      this.stats.set(statsData);

      const rows: FormResponseRow[] = (responseData.responses ?? []).map((r: any) => ({
        id: r.id,
        submitted_at: r.created_at,
        answers: this.flattenAnswers(r.data ?? {}, this.questions()),
      }));

      this.responses.set(rows);
    } catch (error: any) {
      this.errorMessage.set(error?.error?.message || 'Error al cargar respuestas');
    } finally {
      this.isLoading.set(false);
    }
  }

  async exportData(format: 'csv' | 'xlsx'): Promise<void> {
    const formId = this.formId();
    if (!formId) return;

    this.isExporting.set(true);
    try {
      const blob = await firstValueFrom(this.formService.exportResponses(formId, format));
      const ext = format === 'xlsx' ? 'xlsx' : 'csv';
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${this.formTitle() || 'formulario'}_respuestas.${ext}`;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (error: any) {
      this.errorMessage.set(error?.error?.message || 'Error al exportar datos');
    } finally {
      this.isExporting.set(false);
    }
  }

  getCollectUrl(linkUuid?: string): string {
    if (!linkUuid) return '';
    return `${environment.apiUrl}/forms/fetch/${linkUuid}`;
  }

  private flattenAnswers(
    data: Record<string, unknown>,
    questions: FormQuestion[],
  ): Record<string, string> {
    const result: Record<string, string> = {};

    for (const q of questions) {
      const value = data[q.id];
      if (value === undefined || value === null) {
        result[q.id] = '';
      } else if (Array.isArray(value)) {
        result[q.id] = value.join(', ');
      } else {
        result[q.id] = String(value);
      }
    }

    return result;
  }
}

