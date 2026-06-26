import { Injectable, computed, inject, signal } from '@angular/core';
import { Form, FormService, FormShare } from '@core/services/form.service';
import { firstValueFrom } from 'rxjs';

export type FormTab = 'DRAFT' | 'DEPLOYED' | 'ARCHIVED';

@Injectable()
export class FormDashboardViewModel {
  private formService = inject(FormService);

  activeTab = signal<FormTab>('DRAFT');
  searchQuery = signal('');
  myForms = signal<Form[]>([]);
  sharedForms = signal<Form[]>([]);
  isLoading = signal(false);
  errorMessage = signal('');
  actionLoading = signal<string | null>(null);

  shareModalOpen = signal(false);
  shareFormId = signal<string | null>(null);
  shareEmail = signal('');
  shareRole = signal<'EDITOR' | 'RECOLECTOR'>('RECOLECTOR');
  shareError = signal('');
  shares = signal<FormShare[]>([]);

  linkModalOpen = signal(false);
  linkUrl = signal('');

  filteredForms = computed(() => {
    const query = this.searchQuery().trim().toLowerCase();
    const tab = this.activeTab();
    const all = [...this.myForms(), ...this.sharedForms()];

    const byState = all.filter((f) => f.state === tab);

    if (!query) return byState;

    return byState.filter(
      (f) =>
        f.title.toLowerCase().includes(query) ||
        (f.description ?? '').toLowerCase().includes(query),
    );
  });

  tabCounts = computed(() => {
    const all = [...this.myForms(), ...this.sharedForms()];
    return {
      DRAFT: all.filter((f) => f.state === 'DRAFT').length,
      DEPLOYED: all.filter((f) => f.state === 'DEPLOYED').length,
      ARCHIVED: all.filter((f) => f.state === 'ARCHIVED').length,
    };
  });

  async loadForms(): Promise<void> {
    this.isLoading.set(true);
    this.errorMessage.set('');

    try {
      const data = await firstValueFrom(this.formService.getForms());
      this.myForms.set(data.my_forms);
      this.sharedForms.set(data.shared_forms);
    } catch (error: any) {
      this.errorMessage.set(error?.error?.message || 'Error al cargar formularios');
    } finally {
      this.isLoading.set(false);
    }
  }

  setTab(tab: FormTab): void {
    this.activeTab.set(tab);
  }

  async deployForm(id: string): Promise<void> {
    this.actionLoading.set(id);
    try {
      await firstValueFrom(this.formService.deployForm(id));
      await this.loadForms();
    } catch (error: any) {
      this.errorMessage.set(error?.error?.message || 'Error al implementar formulario');
    } finally {
      this.actionLoading.set(null);
    }
  }

  async archiveForm(id: string): Promise<void> {
    this.actionLoading.set(id);
    try {
      await firstValueFrom(this.formService.archiveForm(id));
      await this.loadForms();
    } catch (error: any) {
      this.errorMessage.set(error?.error?.message || 'Error al archivar formulario');
    } finally {
      this.actionLoading.set(null);
    }
  }

  async deleteForm(id: string): Promise<void> {
    this.actionLoading.set(id);
    try {
      await firstValueFrom(this.formService.deleteForm(id));
      await this.loadForms();
    } catch (error: any) {
      this.errorMessage.set(error?.error?.message || 'Error al eliminar formulario');
    } finally {
      this.actionLoading.set(null);
    }
  }

  openShareModal(formId: string): void {
    this.shareFormId.set(formId);
    this.shareEmail.set('');
    this.shareRole.set('RECOLECTOR');
    this.shareError.set('');
    this.shareModalOpen.set(true);
    this.loadShares(formId);
  }

  closeShareModal(): void {
    this.shareModalOpen.set(false);
    this.shareFormId.set(null);
    this.shares.set([]);
  }

  async loadShares(formId: string): Promise<void> {
    try {
      const data = await firstValueFrom(this.formService.getShares(formId));
      this.shares.set(data);
    } catch {
      this.shares.set([]);
    }
  }

  async submitShare(): Promise<void> {
    const formId = this.shareFormId();
    if (!formId || !this.shareEmail().trim()) {
      this.shareError.set('Ingresa un correo valido');
      return;
    }

    this.shareError.set('');
    try {
      await firstValueFrom(
        this.formService.createShare(formId, {
          email: this.shareEmail().trim(),
          role: this.shareRole(),
        }),
      );
      this.shareEmail.set('');
      await this.loadShares(formId);
    } catch (error: any) {
      this.shareError.set(error?.error?.message || 'Error al compartir formulario');
    }
  }

  async removeShare(shareId: string): Promise<void> {
    const formId = this.shareFormId();
    if (!formId) return;

    try {
      await firstValueFrom(this.formService.deleteShare(formId, shareId));
      await this.loadShares(formId);
    } catch (error: any) {
      this.shareError.set(error?.error?.message || 'Error al eliminar acceso');
    }
  }

  showPublicLink(form: Form): void {
    if (!form.link_uuid) return;
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    this.linkUrl.set(`${origin}/collect/${form.link_uuid}`);
    this.linkModalOpen.set(true);
  }

  closeLinkModal(): void {
    this.linkModalOpen.set(false);
    this.linkUrl.set('');
  }

  getStateLabel(state: Form['state']): string {
    const labels: Record<Form['state'], string> = {
      DRAFT: 'Borrador',
      DEPLOYED: 'Implementado',
      ARCHIVED: 'Archivado',
    };
    return labels[state];
  }
}

