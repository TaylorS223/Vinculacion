import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormQuestion, FormShare, FormService } from '@core/services/form.service';
import { AuthService } from '@core/services/auth.service';
import { UserService } from '@core/services/user.service';
import { User } from '@core/models/user/user.interface';
import { FormBuilderViewModel } from '@presentation/viewmodels/form-builder.viewmodel';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-builder',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, TranslateModule],
  templateUrl: './builder.component.html',
  styleUrl: './builder.component.scss',
  providers: [FormBuilderViewModel],
})
export class BuilderComponent implements OnInit {
  readonly vm = inject(FormBuilderViewModel);
  private readonly route = inject(ActivatedRoute);
  private readonly formService = inject(FormService);
  readonly authService = inject(AuthService);
  private readonly userService = inject(UserService);

  readonly questionTypes: Array<{
    value: FormQuestion['type'];
    labelKey: string;
    hintKey: string;
    icon: string;
  }> = [
    {
      value: 'SINGLE_CHOICE',
      labelKey: 'forms.builder.types.SINGLE_CHOICE',
      hintKey: 'forms.builder.hints.SINGLE_CHOICE',
      icon: 'radio_button_checked',
    },
    {
      value: 'MULTIPLE_CHOICE',
      labelKey: 'forms.builder.types.MULTIPLE_CHOICE',
      hintKey: 'forms.builder.hints.MULTIPLE_CHOICE',
      icon: 'checklist',
    },
    {
      value: 'LIKERT',
      labelKey: 'forms.builder.types.LIKERT',
      hintKey: 'forms.builder.hints.LIKERT',
      icon: 'linear_scale',
    },
    {
      value: 'TEXT',
      labelKey: 'forms.builder.types.TEXT',
      hintKey: 'forms.builder.hints.TEXT',
      icon: 'short_text',
    },
    {
      value: 'NUMBER',
      labelKey: 'forms.builder.types.NUMBER',
      hintKey: 'forms.builder.hints.NUMBER',
      icon: 'tag',
    },
  ];

  // --- Share modal state ---
  shareModalOpen = false;
  users = signal<User[]>([]);
  shares = signal<FormShare[]>([]);
  loadingShares = false;
  addingShare = false;
  shareError = '';
  shareEmail = '';
  shareRole: 'EDITOR' | 'RECOLECTOR' = 'RECOLECTOR';
  shareTarget: number | null = null;
  editingShareId: string | null = null;
  editTargetValue: number | null = null;
  savingTarget = false;
  matchedUser: User | null = null;
  lookingUpUser = false;
  private usersCache: User[] | null = null;
  private lookupTimer: ReturnType<typeof setTimeout> | null = null;

  ngOnInit(): void {
    void this.vm.loadProjects();

    const formId = this.route.snapshot.paramMap.get('id');
    if (formId) {
      void this.vm.loadForm(formId);
    } else {
      this.vm.updateProject(this.route.snapshot.queryParamMap.get('project_id'));
    }
  }

  openShareModal(): void {
    const formId = this.vm.formId();
    if (!formId) {
      this.shareError = 'Guarda el formulario primero para poder compartirlo.';
      return;
    }
    this.shareModalOpen = true;
    this.shareError = '';
    this.loadShares(formId);
  }

  closeShareModal(): void {
    this.shareModalOpen = false;
    this.shareError = '';
    this.matchedUser = null;
    this.clearLookupTimer();
  }

  setShareRole(role: 'EDITOR' | 'RECOLECTOR'): void {
    this.shareRole = role;
    if (role === 'EDITOR') {
      this.shareTarget = null;
    }
  }

  lookupUser(): void {
    const email = this.shareEmail.trim().toLowerCase();
    this.clearLookupTimer();

    if (!email || email.length < 3) {
      this.matchedUser = null;
      this.lookingUpUser = false;
      return;
    }

    this.lookingUpUser = true;
    this.lookupTimer = setTimeout(() => this.resolveUserLookup(email), 250);
  }

  private resolveUserLookup(email: string): void {
    this.getCachedUsers().then((users) => {
      this.matchedUser = users.find((user) => user.email.toLowerCase() === email) || null;
    }).catch(() => {
      this.matchedUser = null;
    }).finally(() => {
      this.lookingUpUser = false;
    });
  }

  submitShare(): void {
    const formId = this.vm.formId();
    if (!formId || !this.shareEmail.trim()) {
      this.shareError = 'Ingresa un correo válido.';
      return;
    }

    this.addingShare = true;
    this.shareError = '';

    this.formService.createShare(formId, {
      email: this.shareEmail.trim(),
      role: this.shareRole,
      target_responses: this.shareRole === 'RECOLECTOR' ? this.shareTarget : null,
    }).subscribe({
      next: () => {
        this.shareEmail = '';
        this.shareRole = 'RECOLECTOR';
        this.shareTarget = null;
        this.addingShare = false;
        this.loadShares(formId);
      },
      error: (err) => {
        this.shareError = err?.error?.message || 'No fue posible asignar el usuario.';
        this.addingShare = false;
      },
    });
  }

  removeShare(shareId: string): void {
    const formId = this.vm.formId();
    if (!formId) return;
    if (!confirm('¿Retirar la invitación de este usuario?')) return;

    this.formService.deleteShare(formId, shareId).subscribe({
      next: () => this.loadShares(formId),
      error: () => { this.shareError = 'No fue posible retirar la invitación.'; },
    });
  }

  startEditTarget(share: FormShare): void {
    if (share.role !== 'RECOLECTOR') return;
    this.editingShareId = share.id;
    this.editTargetValue = share.target_responses ?? null;
  }

  cancelEditTarget(): void {
    this.editingShareId = null;
    this.editTargetValue = null;
  }

  saveEditTarget(shareId: string): void {
    const formId = this.vm.formId();
    if (!formId) return;

    const value = this.editTargetValue;
    if (value !== null && (!Number.isInteger(value) || value < 1)) {
      this.shareError = 'Ingrese un número válido mayor a 0.';
      return;
    }

    this.savingTarget = true;
    this.formService.updateShareTarget(formId, shareId, value).subscribe({
      next: () => {
        this.savingTarget = false;
        this.editingShareId = null;
        this.loadShares(formId);
      },
      error: () => {
        this.shareError = 'No fue posible actualizar el objetivo.';
        this.savingTarget = false;
      },
    });
  }

  progressPercent(share: FormShare): number {
    if (!share.target_responses || share.target_responses <= 0) return 0;
    return Math.min(100, Math.round(((share.responses_count ?? 0) / share.target_responses) * 100));
  }

  private async getCachedUsers(): Promise<User[]> {
    if (this.usersCache) return this.usersCache;

    const response = await this.userService.getUsers(100, 1).toPromise();
    this.usersCache = response?.data ?? [];
    return this.usersCache;
  }

  private loadShares(formId: string): void {
    this.loadingShares = true;
    this.formService.getShares(formId).subscribe({
      next: (shares) => { this.shares.set(shares); this.loadingShares = false; },
      error: () => { this.shares.set([]); this.loadingShares = false; },
    });
  }

  private clearLookupTimer(): void {
    if (!this.lookupTimer) return;
    clearTimeout(this.lookupTimer);
    this.lookupTimer = null;
  }
}
