import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { StorageService } from '../storage.service';
import { AuthService } from '../auth.service';

@Component({
  selector: 'app-inicio',
  imports: [RouterLink, CommonModule],
  templateUrl: './inicio.component.html',
  styleUrls: ['./inicio.component.css']
})
export class InicioComponent implements OnInit, OnDestroy {
  cargando: boolean = false;
  mensajeExito: boolean = false;
  textoExito: string = '';

  enviando: boolean = false;
  cantidadListos: number = 0;

  // NUEVA VARIABLE: Guarda si el usuario tiene internet o no
  isOnline: boolean = true;

  // URL del servidor web que el usuario proporcionó en login
  urlServidor: string | null = null;

  // Nombre del usuario y control del menú de perfil
  nombreUsuario: string | null = null;
  mostrarMenuPerfil: boolean = false;

  constructor(
    private storage: StorageService,
    private auth: AuthService,
    private router: Router
  ) {}

  ngOnInit() {
    this.cantidadListos = this.storage.obtenerCantidad();

    // Obtener la URL del servidor que el usuario proporcionó en login
    this.urlServidor = this.auth.obtenerUrlServidor();

    // Obtener el nombre del usuario
    this.nombreUsuario = this.auth.obtenerUsuario();

    // 1. Revisar el estado inicial del internet al cargar la app
    this.isOnline = navigator.onLine;

    // 2. Escuchar en tiempo real si el internet regresa o se corta
    window.addEventListener('online', this.actualizarEstadoRed);
    window.addEventListener('offline', this.actualizarEstadoRed);
  }

  ngOnDestroy() {
    // Buena práctica: limpiar los escuchadores cuando se salga de la pantalla
    window.removeEventListener('online', this.actualizarEstadoRed);
    window.removeEventListener('offline', this.actualizarEstadoRed);
  }

  // Función de flecha para que Angular no pierda el control de las variables
  actualizarEstadoRed = () => {
    this.isOnline = navigator.onLine;
  };

  // Alternar visibilidad del menú de perfil
  toggleMenuPerfil() {
    this.mostrarMenuPerfil = !this.mostrarMenuPerfil;
  }

  // Cerrar menú cuando se hace click en una opción
  cerrarMenuPerfil() {
    this.mostrarMenuPerfil = false;
  }

  get inicialUsuario(): string {
    return this.nombreUsuario?.charAt(0).toUpperCase() ?? 'U';
  }

  mostrarAviso(mensaje: string) {
    alert(mensaje);
  }

  // TODO: Por ahora cada opción solo muestra un aviso.
  // Cuando implementemos cada pantalla (Borradores, Listo para enviar, etc.)
  // esto se cambiará por this.router.navigate(['/borradores']) y similares.
  abrirSeccion(nombre: string) {
    if (nombre === 'Listo para enviar') {
      this.router.navigate(['/listo-para-enviar']);
      return;
    }

    this.mostrarAviso(`Sección "${nombre}" — próximamente disponible.`);
  }

  irAjustes() {
    this.router.navigate(['/ajustes']);
  }

  sincronizarFormularios() {
    // Si no hay internet, no permitimos sincronizar formularios nuevos
    if (!this.isOnline) {
      alert('No puedes descargar formularios nuevos sin conexión a internet.');
      return;
    }

    this.cargando = true;
    this.mensajeExito = false;

    setTimeout(() => {
      this.cargando = false;
      this.textoExito = 'Se descargaron 2 formularios nuevos en blanco.';
      this.mensajeExito = true;
    }, 2500);
  }

  enviarFormulariosAlServidor() {
    if (this.cantidadListos === 0) return;

    // Si no hay internet, avisamos que se quedan guardados localmente
    if (!this.isOnline) {
      alert('¡Estás offline! Los datos se mantendrán seguros en tu celular hasta que recuperes conexión.');
      return;
    }

    this.enviando = true;

    setTimeout(() => {
      this.enviando = false;
      this.storage.limpiarFormularios();
      this.cantidadListos = 0;

      this.textoExito = '¡Todos los formularios se subieron al servidor con éxito!';
      this.mensajeExito = true;
    }, 3000);
  }

  cerrarSesion() {
    this.auth.logout();
    this.router.navigate(['/login']);
  }
}
