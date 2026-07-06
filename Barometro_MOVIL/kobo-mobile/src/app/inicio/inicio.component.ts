import { Component, OnInit, OnDestroy, inject, ChangeDetectorRef } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { DbService } from '../db.service';
import { AuthService } from '../auth.service';
import { SyncService } from '../sync.service';
import { ThemeService } from '../theme.service';
import { TranslatePipe } from '../translate.pipe';

@Component({
  selector: 'app-inicio',
  imports: [RouterLink, CommonModule, TranslatePipe],
  templateUrl: './inicio.component.html',
  styleUrls: ['./inicio.component.css']
})
export class InicioComponent implements OnInit, OnDestroy {
  private db = inject(DbService);
  private auth = inject(AuthService);
  private sync = inject(SyncService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);
  theme = inject(ThemeService);

  cargando = false;
  mensajeExito = false;
  textoExito = '';
  enviando = false;
  cantidadListos = 0;
  isOnline = true;
  urlServidor: string | null = null;
  nombreUsuario: string | null = null;
  mostrarMenuPerfil = false;

  // Selector de descarga
  mostrarSelectorDescarga = false;
  formulariosDisponibles: { id: string; title: string }[] = [];
  seleccionDescarga = new Set<string>();
  descargandoSeleccion = false;

  // Selector de borrar
  mostrarSelectorBorrar = false;
  formulariosLocales: { id: string; title: string; downloadedAt: number }[] = [];
  seleccionBorrar = new Set<string>();
  borrandoSeleccion = false;

  async ngOnInit() {
    this.cantidadListos = await this.sync.cantidadPendientes();
    this.urlServidor = this.auth.obtenerUrlServidor();
    this.nombreUsuario = this.auth.obtenerUsuario();
    this.isOnline = navigator.onLine;
    this.cdr.detectChanges();
    window.addEventListener('online', this.actualizarEstadoRed);
    window.addEventListener('offline', this.actualizarEstadoRed);
  }

  ngOnDestroy() {
    window.removeEventListener('online', this.actualizarEstadoRed);
    window.removeEventListener('offline', this.actualizarEstadoRed);
  }

  actualizarEstadoRed = () => {
    this.isOnline = navigator.onLine;
  };

  toggleMenuPerfil() {
    this.mostrarMenuPerfil = !this.mostrarMenuPerfil;
  }

  cerrarMenuPerfil() {
    this.mostrarMenuPerfil = false;
  }

  get inicialUsuario(): string {
    return this.nombreUsuario?.charAt(0).toUpperCase() ?? 'U';
  }

  mostrarAviso(mensaje: string) {
    alert(mensaje);
  }

  abrirSeccion(nombre: string) {
    if (nombre === 'Listo para enviar') {
      this.router.navigate(['/listo-para-enviar']);
    } else if (nombre === 'Borradores') {
      this.router.navigate(['/borradores']);
    } else if (nombre === 'Enviado') {
      this.router.navigate(['/enviados']);
    } else if (nombre === 'Borrar formulario') {
      this.iniciarBorrar();
    } else {
      this.mostrarAviso(`Sección "${nombre}" — próximamente disponible.`);
    }
  }

  async iniciarBorrar() {
    this.formulariosLocales = (await this.db.forms.toArray()).map(f => ({
      id: f.id,
      title: f.title,
      downloadedAt: f.downloadedAt
    }));

    if (this.formulariosLocales.length === 0) {
      alert('No hay formularios descargados para borrar.');
      return;
    }

    this.mostrarSelectorBorrar = true;
  }

  toggleSeleccionBorrar(id: string) {
    if (this.seleccionBorrar.has(id)) {
      this.seleccionBorrar.delete(id);
    } else {
      this.seleccionBorrar.add(id);
    }
  }

  seleccionarTodosBorrar() {
    if (this.seleccionBorrar.size === this.formulariosLocales.length) {
      this.seleccionBorrar.clear();
    } else {
      this.formulariosLocales.forEach(f => this.seleccionBorrar.add(f.id));
    }
  }

  async confirmarBorrar() {
    if (this.seleccionBorrar.size === 0) {
      alert('Selecciona al menos un formulario para borrar.');
      return;
    }

    this.mostrarSelectorBorrar = false;
    this.borrandoSeleccion = true;
    this.cdr.detectChanges();

    const ids = Array.from(this.seleccionBorrar);
    await Promise.all(ids.map(id => this.db.forms.delete(id)));
    this.seleccionBorrar.clear();
    this.borrandoSeleccion = false;

    this.textoExito = `Se eliminaron ${ids.length} formulario(s) del dispositivo.`;
    this.mensajeExito = true;
    this.cdr.detectChanges();
  }

  cancelarBorrar() {
    this.mostrarSelectorBorrar = false;
    this.seleccionBorrar.clear();
  }

  irAjustes() {
    this.router.navigate(['/ajustes']);
  }

  verAcercaDe() {
    alert('ULEAM ' + this.theme.t('version'));
  }

  async iniciarDescarga() {
    if (!this.isOnline) {
      alert('No puedes descargar formularios nuevos sin conexión a internet.');
      return;
    }

    try {
      this.cargando = true;
      this.formulariosDisponibles = await this.sync.obtenerFormulariosDisponibles();
      this.cargando = false;
      this.cdr.detectChanges();

      if (this.formulariosDisponibles.length === 0) {
        alert('No hay formularios disponibles para descargar en el servidor.');
        return;
      }

      this.mostrarSelectorDescarga = true;
    } catch {
      this.cargando = false;
      alert('Error al conectar con el servidor. Verifica tu conexión.');
    }
  }

  toggleSeleccionDescarga(id: string) {
    if (this.seleccionDescarga.has(id)) {
      this.seleccionDescarga.delete(id);
    } else {
      this.seleccionDescarga.add(id);
    }
  }

  seleccionarTodosLosFormularios() {
    if (this.seleccionDescarga.size === this.formulariosDisponibles.length) {
      this.seleccionDescarga.clear();
    } else {
      this.formulariosDisponibles.forEach(f => this.seleccionDescarga.add(f.id));
    }
  }

  async confirmarDescarga() {
    if (this.seleccionDescarga.size === 0) {
      alert('Selecciona al menos un formulario para descargar.');
      return;
    }

    this.mostrarSelectorDescarga = false;
    this.descargandoSeleccion = true;
    this.cdr.detectChanges();

    try {
      const ids = Array.from(this.seleccionDescarga);
      const { descargados, errores } = await this.sync.sincronizarFormularios(ids);
      this.descargandoSeleccion = false;
      this.seleccionDescarga.clear();

      const msgs: string[] = [];
      if (descargados > 0) msgs.push(`Se descargaron ${descargados} formulario(s).`);
      if (errores > 0) msgs.push(`${errores} formulario(s) tuvieron errores.`);
      this.textoExito = msgs.length > 0 ? msgs.join(' ') : 'No se descargó ningún formulario.';
      this.mensajeExito = true;
    } catch {
      this.descargandoSeleccion = false;
      alert('Error al descargar formularios.');
    }

    this.cdr.detectChanges();
  }

  cancelarDescarga() {
    this.mostrarSelectorDescarga = false;
    this.seleccionDescarga.clear();
  }

  async enviarFormulariosAlServidor() {
    this.cantidadListos = await this.sync.cantidadPendientes();
    if (this.cantidadListos === 0) return;

    if (!this.isOnline) {
      alert('Estás offline! Los datos se mantendrán seguros en tu dispositivo hasta que recuperes conexión.');
      return;
    }

    this.enviando = true;

    try {
      const { enviados, fallos } = await this.sync.enviarPendientes();
      this.enviando = false;
      this.cantidadListos = await this.sync.cantidadPendientes();

      const msgs: string[] = [];
      if (enviados > 0) msgs.push(`${enviados} formulario(s) subidos al servidor.`);
      if (fallos > 0) msgs.push(`${fallos} formulario(s) fallaron.`);
      this.textoExito = msgs.join(' ');
      this.mensajeExito = true;
    } catch {
      this.enviando = false;
      alert('Error al enviar formularios. Verifica tu conexión.');
    }
  }

  cerrarSesion() {
    this.auth.logout();
    this.router.navigate(['/login']);
  }
}
