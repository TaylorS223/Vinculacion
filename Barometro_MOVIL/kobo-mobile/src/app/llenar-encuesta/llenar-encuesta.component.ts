import { Component, OnInit, OnDestroy, inject, ChangeDetectorRef } from '@angular/core';
import { RouterLink, Router, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { DbService, FormDefinition, FormQuestion } from '../db.service';
import { StorageService } from '../storage.service';
import { ThemeService } from '../theme.service';
import { ToastService } from '../toast.service';
import { TranslatePipe } from '../translate.pipe';

@Component({
  selector: 'app-llenar-encuesta',
  imports: [RouterLink, FormsModule, CommonModule, TranslatePipe],
  templateUrl: './llenar-encuesta.component.html',
  styleUrls: ['./llenar-encuesta.component.css']
})
export class LlenarEncuestaComponent implements OnInit, OnDestroy {
  private db = inject(DbService);
  private storage = inject(StorageService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private cdr = inject(ChangeDetectorRef);
  private toast = inject(ToastService);
  theme = inject(ThemeService);

  formulario: FormDefinition | null = null;
  respuestas: Record<string, any> = {};
  cargando = true;
  errorCarga = '';
  draftId: number | null = null;
  targetAlcanzado = false;

  tiempoInicio: Date = new Date();
  tiempoInicioFormato = '';
  duracionSegundos = 0;
  duracionTexto = '00:00';
  timerInterval: any = null;
  likertRespondidos: Record<string, boolean> = {};
  guardando = false;

  async ngOnInit() {
    try {
      const formId = this.route.snapshot.paramMap.get('id');
      if (!formId) {
        this.errorCarga = 'ID de formulario no válido.';
        this.cargando = false;
        return;
      }

      const form = await this.db.forms.get(formId);
      if (!form) {
        this.errorCarga = 'Formulario no encontrado. Descárgalo primero desde el inicio.';
        this.cargando = false;
        return;
      }
      this.formulario = form;

      if (form.target_responses != null && form.target_responses > 0) {
        const serverCount = form.responses_count ?? 0;
        const pendingLocal = await this.db.responses
          .where({ formId: formId, estado: 'listo-para-enviar' })
          .count();
        if (serverCount + pendingLocal >= form.target_responses) {
          this.targetAlcanzado = true;
          this.cargando = false;
          this.cdr.detectChanges();
          return;
        }
      }

      // Solo cargar borrador si viene de "Continuar" (?continue=true)
      const continuar = this.route.snapshot.queryParamMap.get('continue');
      if (continuar === 'true') {
        const draft = await this.db.responses
          .where({ formId: formId, estado: 'borrador' })
          .first();
        if (draft && draft.answers) {
          this.respuestas = draft.answers;
          this.draftId = draft.id ?? null;
        } else {
          this.inicializarRespuestas();
        }
      } else {
        this.inicializarRespuestas();
      }
    } catch {
      this.errorCarga = 'Error al cargar el formulario.';
    }

    this.cargando = false;
    this.cdr.detectChanges();

    const ahora = new Date();
    const horas = String(ahora.getHours()).padStart(2, '0');
    const minutos = String(ahora.getMinutes()).padStart(2, '0');
    const dia = String(ahora.getDate()).padStart(2, '0');
    const mes = String(ahora.getMonth() + 1).padStart(2, '0');
    const anio = ahora.getFullYear();
    this.tiempoInicioFormato = `${horas}:${minutos} - ${dia}/${mes}/${anio}`;

    this.timerInterval = setInterval(() => {
      this.duracionSegundos += 1;
      this.duracionTexto = this.formatTime(this.duracionSegundos);
    }, 1000);
  }

  ngOnDestroy() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }
    this.autoGuardarBorrador();
  }

  private autoGuardarBorrador() {
    if (!this.formulario || this.guardando) return;
    const tieneRespuestas = Object.values(this.respuestas).some(v => {
      if (Array.isArray(v)) return v.length > 0;
      if (typeof v === 'object' && v !== null) return Object.values(v).some(sub => !!sub);
      return !!v && v !== '';
    });
    if (!tieneRespuestas) return;

    const form = {
      formId: this.formulario.id,
      link_uuid: this.formulario.link_uuid,
      formTitle: this.formulario.title,
      answers: { ...this.respuestas },
      estado: 'borrador' as const,
      createdAt: this.tiempoInicioFormato,
      duration: this.duracionTexto
    };

    if (this.draftId) {
      this.db.responses.update(this.draftId, form);
    } else {
      this.storage.agregarFormulario(form as any).then(id => {
        this.draftId = id;
      });
    }
  }

  private inicializarRespuestas() {
    if (!this.formulario) return;
    for (const q of this.formulario.questions) {
      if (q.type === 'MULTIPLE_CHOICE') {
        this.respuestas[q.id] = [];
      } else if (q.type === 'LIKERT') {
        this.respuestas[q.id] = {};
        if (q.likert_rows) {
          for (const row of q.likert_rows) {
            this.respuestas[q.id][row] = '';
          }
        }
      } else {
        this.respuestas[q.id] = '';
      }
    }
  }

  onCheckboxChange(qId: string, option: string, event: any) {
    const checked = event.target.checked;
    if (!Array.isArray(this.respuestas[qId])) {
      this.respuestas[qId] = [];
    }
    if (checked) {
      this.respuestas[qId].push(option);
    } else {
      this.respuestas[qId] = this.respuestas[qId].filter((o: string) => o !== option);
    }
  }

  trackByQuestionId(_index: number, q: FormQuestion) {
    return q.id;
  }

  trackByRow(_index: number, row: string) {
    return row;
  }

  formValido(): boolean {
    if (!this.formulario) return false;
    for (const q of this.formulario.questions) {
      if (!q.required) continue;
      const val = this.respuestas[q.id];
      if (q.type === 'MULTIPLE_CHOICE') {
        if (!Array.isArray(val) || val.length === 0) return false;
      } else if (q.type === 'LIKERT') {
        if (q.likert_rows) {
          for (const row of q.likert_rows) {
            if (!val || !val[row]) return false;
          }
        }
      } else {
        if (!val || (typeof val === 'string' && val.trim() === '')) return false;
      }
    }
    return true;
  }

  private async guardarConEstado(estado: 'borrador' | 'listo-para-enviar') {
    if (!this.formulario) return;
    this.guardando = true;

    const form = {
      formId: this.formulario.id,
      link_uuid: this.formulario.link_uuid,
      formTitle: this.formulario.title,
      answers: { ...this.respuestas },
      estado,
      createdAt: this.tiempoInicioFormato,
      duration: this.duracionTexto
    };

    if (estado === 'borrador' && this.draftId) {
      await this.db.responses.update(this.draftId, form);
    } else {
      if (this.draftId) {
        await this.db.responses.delete(this.draftId);
        this.draftId = null;
      }
      const newId = await this.storage.agregarFormulario(form as any);
      if (estado === 'borrador') {
        this.draftId = newId;
      }
    }
  }

  async guardarBorrador() {
    await this.guardarConEstado('borrador');
    this.toast.show('Borrador guardado.');
    this.router.navigate(['/']);
  }

  async guardarFormulario() {
    await this.guardarConEstado('listo-para-enviar');
    this.toast.show('Formulario guardado.');
    this.router.navigate(['/']);
  }

  private formatTime(segundos: number): string {
    const mins = Math.floor(segundos / 60);
    const secs = segundos % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
}
