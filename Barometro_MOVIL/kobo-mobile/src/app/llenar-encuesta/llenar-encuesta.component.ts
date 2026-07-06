import { Component, OnInit, OnDestroy, inject, ChangeDetectorRef } from '@angular/core';
import { RouterLink, Router, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { DbService, FormDefinition, FormQuestion } from '../db.service';
import { StorageService } from '../storage.service';
import { ThemeService } from '../theme.service';
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
  theme = inject(ThemeService);

  formulario: FormDefinition | null = null;
  respuestas: Record<string, any> = {};
  cargando = true;
  errorCarga = '';

  tiempoInicio: Date = new Date();
  tiempoInicioFormato = '';
  duracionSegundos = 0;
  duracionTexto = '00:00';
  timerInterval: any = null;
  likertRespondidos: Record<string, boolean> = {};

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

      // Cargar borrador previo si existe
      const draft = await this.db.responses
        .where({ formId: formId, estado: 'borrador' })
        .first();
      if (draft && draft.answers) {
        this.respuestas = draft.answers;
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

    // Eliminar borrador previo si existe (para reemplazarlo)
    const previo = await this.db.responses
      .where({ formId: this.formulario.id, estado: 'borrador' })
      .first();
    if (previo?.id) {
      await this.db.responses.delete(previo.id);
    }

    const form = {
      formId: this.formulario.id,
      link_uuid: this.formulario.link_uuid,
      formTitle: this.formulario.title,
      answers: { ...this.respuestas },
      estado,
      createdAt: this.tiempoInicioFormato,
      duration: this.duracionTexto
    };

    await this.storage.agregarFormulario(form as any);
  }

  async guardarBorrador() {
    await this.guardarConEstado('borrador');
    alert('Borrador guardado. Puedes continuar después desde "Borradores".');
    this.router.navigate(['/']);
  }

  async guardarFormulario() {
    await this.guardarConEstado('listo-para-enviar');
    alert('Formulario guardado con éxito en la memoria local!');
    this.router.navigate(['/']);
  }

  private formatTime(segundos: number): string {
    const mins = Math.floor(segundos / 60);
    const secs = segundos % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
}
