import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Form, FormQuestion, FormService } from '@core/services/form.service';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-form-collect',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    TranslateModule,
  ],
  template: `
    <div class="collect-page">
      @if (loading()) {
        <div class="state-box">
          <mat-spinner diameter="40"></mat-spinner>
          <p>{{ 'forms.collect.loading' | translate }}</p>
        </div>
      } @else if (error()) {
        <div class="state-box error">
          <mat-icon>error_outline</mat-icon>
          <p>{{ error() }}</p>
        </div>
      } @else if (submitted()) {
        <div class="state-box success">
          <mat-icon>check_circle</mat-icon>
          <h2>{{ 'forms.collect.submittedTitle' | translate }}</h2>
          <p>{{ 'forms.collect.submittedText' | translate }}</p>
          <button mat-raised-button color="primary" (click)="resetForm()" type="button">
            {{ 'forms.collect.sendAnother' | translate }}
          </button>
        </div>
      } @else if (form()) {
        <div class="collect-card">
          <header class="collect-header">
            <h1>{{ form()!.title }}</h1>
            @if (form()!.description) {
              <p>{{ form()!.description }}</p>
            }
          </header>

          <form (ngSubmit)="onSubmit()" class="collect-form">
            @for (question of form()!.questions ?? []; track question.id; let i = $index) {
              <div class="question-block">
                <label class="question-label">
                  {{ i + 1 }}. {{ question.label }}
                  @if (question.required) {
                    <span class="required">*</span>
                  }
                </label>

                @switch (question.type) {
                  @case ('SINGLE_CHOICE') {
                    <div class="options-list">
                      @for (opt of question.options ?? []; track $index) {
                        <label class="option">
                          <input
                            type="radio"
                            [name]="question.id"
                            [value]="opt"
                            [ngModel]="answers()[question.id]"
                            (ngModelChange)="setAnswer(question.id, $event)"
                            [required]="question.required"
                          />
                          {{ opt }}
                        </label>
                      }
                    </div>
                  }
                  @case ('MULTIPLE_CHOICE') {
                    <div class="options-list">
                      @for (opt of question.options ?? []; track $index) {
                        <label class="option">
                          <input
                            type="checkbox"
                            [checked]="isSelected(question.id, opt)"
                            (change)="toggleMulti(question.id, opt, $any($event.target).checked)"
                          />
                          {{ opt }}
                        </label>
                      }
                    </div>
                  }
                  @case ('LIKERT') {
                    <div class="likert-row">
                      @for (opt of question.options ?? []; track $index) {
                        <label class="likert-option">
                          <input
                            type="radio"
                            [name]="question.id"
                            [value]="opt"
                            [ngModel]="answers()[question.id]"
                            (ngModelChange)="setAnswer(question.id, $event)"
                            [required]="question.required"
                          />
                          <span>{{ opt }}</span>
                        </label>
                      }
                    </div>
                  }
                  @case ('TEXT') {
                    <textarea
                      class="text-input"
                      [name]="question.id"
                      rows="3"
                      [ngModel]="answers()[question.id]"
                      (ngModelChange)="setAnswer(question.id, $event)"
                      [required]="question.required"
                      [placeholder]="'forms.collect.textPlaceholder' | translate"
                    ></textarea>
                  }
                  @case ('NUMBER') {
                    <input
                      type="number"
                      class="number-input"
                      [name]="question.id"
                      [ngModel]="answers()[question.id]"
                      (ngModelChange)="setAnswer(question.id, $event)"
                      [required]="question.required"
                      placeholder="0"
                    />
                  }
                }
              </div>
            }

            <button
              mat-raised-button
              color="primary"
              type="submit"
              class="submit-btn"
              [disabled]="submitting()"
            >
              @if (submitting()) {
                {{ 'forms.collect.submitting' | translate }}
              } @else {
                {{ 'forms.collect.submit' | translate }}
              }
            </button>
          </form>
        </div>
      }
    </div>
  `,
  styles: [
    `
      .collect-page {
        min-height: 100vh;
        background: var(--bg-primary);
        padding: 1.5rem 1rem;
        display: flex;
        justify-content: center;
      }

      .collect-card {
        width: 100%;
        max-width: 640px;
        background: var(--card-bg);
        border: 1px solid var(--card-border);
        border-radius: var(--radius-xl);
        overflow: hidden;
      }

      .collect-header {
        padding: 1.5rem;
        background: linear-gradient(135deg, var(--primary-600), #8b5cf6);
        color: white;

        h1 {
          margin: 0 0 0.5rem;
          font-size: 1.5rem;
        }

        p {
          margin: 0;
          opacity: 0.9;
          font-size: 0.875rem;
        }
      }

      .collect-form {
        padding: 1.5rem;
        display: flex;
        flex-direction: column;
        gap: 1.25rem;
      }

      .question-block {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
      }

      .question-label {
        font-weight: 600;
        font-size: 0.9375rem;
        color: var(--text-primary);
      }

      .required {
        color: #c8102e;
      }

      .options-list {
        display: flex;
        flex-direction: column;
        gap: 0.375rem;
      }

      .option {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-size: 0.875rem;
        color: var(--text-secondary);
        cursor: pointer;
      }

      .likert-row {
        display: flex;
        flex-wrap: wrap;
        gap: 0.75rem;
      }

      .likert-option {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.25rem;
        font-size: 0.75rem;
        text-align: center;
        max-width: 100px;
        cursor: pointer;
      }

      .text-input,
      .number-input {
        width: 100%;
        padding: 0.625rem 0.75rem;
        border: 1px solid var(--border-color);
        border-radius: var(--radius-md);
        background: var(--bg-primary);
        color: var(--text-primary);
        font-size: 0.875rem;
      }

      .submit-btn {
        width: 100%;
        margin-top: 0.5rem;
      }

      .state-box {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 0.75rem;
        padding: 3rem 2rem;
        text-align: center;
        color: var(--text-secondary);

        mat-icon {
          font-size: 48px;
          width: 48px;
          height: 48px;
        }

        &.error mat-icon {
          color: var(--error-color);
        }

        &.success mat-icon {
          color: #10b981;
        }

        h2 {
          margin: 0;
          color: var(--text-primary);
        }
      }
    `,
  ],
})
export class FormCollectComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private formService = inject(FormService);
  private translate = inject(TranslateService);

  form = signal<Form | null>(null);
  answers = signal<Record<string, unknown>>({});
  loading = signal(true);
  submitting = signal(false);
  submitted = signal(false);
  error = signal('');

  private linkUuid = '';

  ngOnInit(): void {
    this.linkUuid = this.route.snapshot.paramMap.get('uuid') ?? '';
    if (!this.linkUuid) {
      this.error.set(this.translate.instant('forms.collect.errors.invalidLink'));
      this.loading.set(false);
      return;
    }
    this.loadForm();
  }

  loadForm(): void {
    this.formService.fetchPublicForm(this.linkUuid).subscribe({
      next: (form) => {
        this.form.set({ ...form, questions: form.questions ?? [] });
        this.loading.set(false);
      },
      error: () => {
        this.error.set(this.translate.instant('forms.collect.errors.load'));
        this.loading.set(false);
      },
    });
  }

  setAnswer(questionId: string, value: unknown): void {
    this.answers.update((a) => ({ ...a, [questionId]: value }));
  }

  isSelected(questionId: string, option: string): boolean {
    const val = this.answers()[questionId];
    return Array.isArray(val) && val.includes(option);
  }

  toggleMulti(questionId: string, option: string, checked: boolean): void {
    const current = this.answers()[questionId];
    const selected = Array.isArray(current) ? [...current] : [];

    if (checked && !selected.includes(option)) {
      selected.push(option);
    } else if (!checked) {
      const idx = selected.indexOf(option);
      if (idx >= 0) selected.splice(idx, 1);
    }

    this.setAnswer(questionId, selected);
  }

  onSubmit(): void {
    if (this.submitting()) return;
    this.submitting.set(true);

    this.formService.submitResponse(this.linkUuid, this.answers()).subscribe({
      next: () => {
        this.submitted.set(true);
        this.submitting.set(false);
      },
      error: () => {
        this.error.set(this.translate.instant('forms.collect.errors.submit'));
        this.submitting.set(false);
      },
    });
  }

  resetForm(): void {
    this.answers.set({});
    this.submitted.set(false);
    this.error.set('');
  }
}

